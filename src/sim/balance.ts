import type { SimConfig, StrategyConfig } from './config';
import type { RunResult } from './engine';
import { analyzeGachaTarget } from './gachaAnalysis';

export type BalanceStatus = 'good' | 'warn' | 'bad';

export interface BalanceMetric {
  id: string;
  label: string;
  value: string;
  target: string;
  status: BalanceStatus;
  hint?: string;
}

function status3(v: number, goodMax: number, warnMax: number, lowerBetter = true): BalanceStatus {
  if (lowerBetter) {
    if (v <= goodMax) return 'good';
    if (v <= warnMax) return 'warn';
    return 'bad';
  }
  if (v >= goodMax) return 'good';
  if (v >= warnMax) return 'warn';
  return 'bad';
}

/** 从单次模拟结果提取平衡指标（聚焦普通玩家或任意策略） */
export function computeBalanceMetrics(
  run: RunResult,
  cfg: SimConfig,
  strat: StrategyConfig,
): BalanceMetric[] {
  const days = run.days;
  const totalIn = Object.values(run.totalIncome).reduce((a, b) => a + b, 0);
  const totalEx = Object.values(run.totalExpense).reduce((a, b) => a + b, 0);
  const ratio = totalEx > 0 ? totalIn / totalEx : Infinity;

  const early = days.slice(0, 30);
  const earlyNet = early.length ? early.reduce((s, d) => s + d.net, 0) / early.length : 0;

  const d10 = days[9]?.gold ?? 0;
  const lateWindow = Math.min(90, Math.max(1, Math.floor(days.length / 3)));
  const lateStart = days[days.length - 1 - lateWindow]?.gold ?? 0;
  const lateEnd = days[days.length - 1]?.gold ?? 0;
  const lateDailyGrowth = lateStart > 0 ? (lateEnd - lateStart) / lateWindow : 0;
  const lateGrowthPct = lateStart > 0 ? ((lateEnd / lateStart - 1) * 100) / lateWindow : 0;

  const gachaSink = run.totalExpense.gacha - run.totalIncome.gacha;
  const gachaSinkRatio = totalIn > 0 ? gachaSink / totalIn : 0;
  const gachaTarget = analyzeGachaTarget(cfg, strat, run);
  const targetGrand = cfg.gacha.targetGrandDays;
  const grandDay = run.grandPrizeDay;

  return [
    {
      id: 'early',
      label: '前期日净（前30天均值）',
      value: `${Math.round(earlyNet)}/天`,
      target: '≥ 0，不宜长期为负',
      status: status3(-earlyNet, -10, -30, true),
      hint: earlyNet < -20 ? '前期过紧：加课程金币/降进修费' : undefined,
    },
    {
      id: 'grad',
      label: '开局第10天金币',
      value: `${Math.round(d10)}`,
      target: '≥ 150（够一次进修+缓冲）',
      status: d10 >= 150 ? 'good' : d10 >= 50 ? 'warn' : 'bad',
    },
    {
      id: 'steady',
      label: '稳态日净（后30天均值）',
      value: `${Math.round(run.steadyNetPerDay)}/天`,
      target: '0 ~ 80',
      status: status3(run.steadyNetPerDay, 80, 150, true),
      hint: run.steadyNetPerDay > 100 ? '后期仍通胀：加强抽奖/装扮消耗或压打工' : undefined,
    },
    {
      id: 'ratio',
      label: '全周期收支比（收入÷支出）',
      value: ratio === Infinity ? '∞' : ratio.toFixed(2),
      target: '1.0 ~ 1.3',
      status:
        ratio <= 1.3 ? 'good' : ratio <= 1.8 ? 'warn' : ratio === Infinity ? 'bad' : 'bad',
    },
    {
      id: 'late',
      label: `后期金币增速（最后${lateWindow}天）`,
      value: `${lateDailyGrowth >= 0 ? '+' : ''}${Math.round(lateDailyGrowth)}/天（${lateGrowthPct.toFixed(2)}%/天）`,
      target: '趋近 0（盈余被抽奖回收）',
      status: status3(lateDailyGrowth, 80, 200, true),
    },
    {
      id: 'gacha',
      label: '抽奖净沉没占收入比',
      value: `${(gachaSinkRatio * 100).toFixed(1)}%`,
      target: '≥ 15%（有抽奖时）',
      status:
        run.totalExpense.gacha <= 0
          ? 'warn'
          : gachaSinkRatio >= 0.15
            ? 'good'
            : gachaSinkRatio >= 0.08
              ? 'warn'
              : 'bad',
    },
    {
      id: 'grand',
      label: '终极大奖达成天数',
      value: gachaTarget.grandLabel,
      target: `≤ ${targetGrand} 天（设计目标）`,
      status:
        grandDay === null
          ? 'bad'
          : grandDay <= targetGrand
            ? 'good'
            : grandDay <= targetGrand * 1.3
              ? 'warn'
              : 'bad',
      hint: gachaTarget.payHint,
    },
    {
      id: 'pay',
      label: '付费充值（抽奖补币）',
      value:
        run.totalPayYuan > 0
          ? `¥${run.totalPayYuan.toFixed(0)}（换 ${Math.round(run.totalIncome.recharge)} 币）`
          : '¥0',
      target: '按策略画像评估是否合理',
      status:
        run.totalPayYuan <= 0
          ? 'good'
          : run.totalPayYuan <= 300
            ? 'good'
            : run.totalPayYuan <= 800
              ? 'warn'
              : 'bad',
      hint:
        run.totalPayYuan > 500
          ? '付费压力偏高：检查充值上限或提升免费金币产出'
          : undefined,
    },
  ];
}
