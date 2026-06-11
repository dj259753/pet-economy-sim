import type { SimConfig, StrategyConfig } from './config';
import { medianDrawsToGrand } from './config';
import type { RunResult } from './engine';

export interface GachaTargetAnalysis {
  medianDraws: number;
  payYuanToMeetTarget: number;
  grandLabel: string;
  payHint: string;
}

/** 终极大奖达成天数文案（超期也明确标出） */
export function formatGrandPrizeDay(
  grandDay: number | null,
  targetDays: number,
  simDays: number,
): string {
  if (grandDay === null) {
    return `周期内未中（已模拟 ${simDays} 天）`;
  }
  if (grandDay > targetDays) {
    return `第 ${grandDay} 天（超 ${grandDay - targetDays} 天）`;
  }
  return `第 ${grandDay} 天`;
}

/**
 * 估算：在 targetGrandDays 前按中位抽数抽到大奖，需额外充值的人民币。
 * 用期望模式净沉没/日净收入回放，不含模拟里已发生的充值。
 */
export function estimatePayYuanToGrandByDay(
  cfg: SimConfig,
  strat: StrategyConfig,
  run: RunResult,
): number {
  const target = cfg.gacha.targetGrandDays;
  const start = cfg.gacha.startDay;
  const { price } = cfg.gacha;
  const goldPerYuan = cfg.pay.goldPerYuan;

  if (!cfg.modules.gacha || strat.gachaPerDay <= 0 || price <= 0 || goldPerYuan <= 0) {
    return 0;
  }

  const medianDraws = medianDrawsToGrand(cfg.gacha);
  if (!isFinite(medianDraws)) return 0;

  const totalWeight = cfg.gacha.prizes.reduce((s, p) => s + p.prob, 0) || 1;
  const evReturn = cfg.gacha.prizes.reduce((s, p) => s + (p.prob / totalWeight) * p.gold, 0);

  let budget = run.days[Math.max(0, start - 2)]?.gold ?? cfg.base.initialGold;
  let payYuan = 0;
  let drawsDone = 0;

  for (let day = start; day <= target && drawsDone < medianDraws; day++) {
    const rec = run.days[day - 1];
    if (rec) {
      const gachaNet = rec.income.gacha - rec.expense.gacha;
      const recharge = rec.income.recharge ?? 0;
      budget += rec.net - gachaNet - recharge;
    }
    for (let i = 0; i < strat.gachaPerDay && drawsDone < medianDraws; i++) {
      const shortfall = strat.gachaFloor + price - budget;
      if (shortfall > 0) {
        const yuan = Math.ceil(shortfall / goldPerYuan);
        payYuan += yuan;
        budget += yuan * goldPerYuan;
      }
      if (budget < strat.gachaFloor + price) break;
      budget -= price;
      budget += evReturn;
      drawsDone++;
    }
  }

  while (drawsDone < medianDraws) {
    const shortfall = strat.gachaFloor + price - budget;
    const yuan = Math.ceil(Math.max(shortfall, price) / goldPerYuan);
    payYuan += yuan;
    budget += yuan * goldPerYuan;
    budget -= price;
    budget += evReturn;
    drawsDone++;
  }

  return payYuan;
}

export function analyzeGachaTarget(
  cfg: SimConfig,
  strat: StrategyConfig,
  run: RunResult,
): GachaTargetAnalysis {
  const target = cfg.gacha.targetGrandDays;
  const simDays = run.days.length;
  const grandDay = run.grandPrizeDay;
  const medianDraws = medianDrawsToGrand(cfg.gacha);
  const grandLabel = formatGrandPrizeDay(grandDay, target, simDays);

  const metInTime = grandDay !== null && grandDay <= target;
  const payYuanToMeetTarget = metInTime ? 0 : estimatePayYuanToGrandByDay(cfg, strat, run);

  let payHint: string;
  if (strat.gachaPerDay <= 0) {
    payHint = '该策略不参与抽奖';
  } else if (metInTime) {
    payHint =
      run.totalPayYuan > 0
        ? `已在 ${target} 天内达成；模拟中实际充值 ¥${Math.round(run.totalPayYuan)}`
        : `已在 ${target} 天内达成，无需充值`;
  } else if (!isFinite(medianDraws)) {
    payHint = '大奖概率为 0，无法估算';
  } else {
    payHint = `要在 ${target} 天内按中位约 ${medianDraws} 抽中大奖，约需补 ¥${payYuanToMeetTarget}（1元=${cfg.pay.goldPerYuan}币）`;
    if (run.totalPayYuan > 0) {
      payHint += `；当前策略模拟已充 ¥${Math.round(run.totalPayYuan)}`;
    }
  }

  return { medianDraws, payYuanToMeetTarget, grandLabel, payHint };
}
