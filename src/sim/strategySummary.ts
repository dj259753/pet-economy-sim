import type { OrderKey, SimConfig, StrategyConfig } from './config';

const ORDER_LABELS: Record<OrderKey | 'auto', string> = {
  kuai: '快单(1h)',
  wen: '稳单(2h)',
  guaji: '挂机单(4h)',
  du: '赌单(4h)',
  auto: '自动最优',
};

export function jobName(config: SimConfig, jobId: string): string {
  return config.jobsCfg.jobs.find((j) => j.id === jobId)?.name ?? jobId;
}

/** 右侧说明区：单条策略的可读摘要行 */
export function strategySummaryLines(strat: StrategyConfig, config: SimConfig): string[] {
  const lines: string[] = [];
  const actions =
    strat.dailyActions % 1 < 1e-9
      ? `${strat.dailyActions} 次/天`
      : `约 ${strat.dailyActions} 次/天（部分天 +1 次）`;

  lines.push(`日均行动 ${actions}：未毕业上课，毕业后进修或打工`);
  lines.push(`打工偏好 ${ORDER_LABELS[strat.orderPref]} · 目标职业 ${jobName(config, strat.targetJobId)}`);
  lines.push(
    `冒险 ${strat.adventuresPerDay} 次/天 · PK ${strat.pksPerDay} 次/天 · 主动雇佣 ${strat.useHire ? '开' : '关'}`,
  );
  lines.push(
    `被雇佣 ${strat.beHiredPerDay} 次/天（打断 ${(strat.selfOnlineProb * 100).toFixed(0)}%）· 金币安全线 ${strat.goldReserve}`,
  );
  lines.push(
    `装扮意愿 B/A ${strat.outfitProbs.map((p) => `${(p * 100).toFixed(0)}%`).join(' / ')}`,
  );
  if (strat.gachaPerDay > 0) {
    lines.push(`抽奖 ≤${strat.gachaPerDay} 次/天，存量 ≥${strat.gachaFloor.toLocaleString()} 起抽`);
    if (strat.rechargeForGacha) {
      const caps: string[] = [];
      if (strat.maxPayYuanPerDay > 0) caps.push(`日限 ¥${strat.maxPayYuanPerDay}`);
      if (strat.maxPayYuanTotal > 0) caps.push(`总限 ¥${strat.maxPayYuanTotal}`);
      lines.push(`金币不足时付费补币抽奖${caps.length ? `（${caps.join('，')}）` : ''}`);
    }
  } else {
    lines.push('不参与抽奖');
  }
  if (strat.sickLostWork > 0) {
    lines.push(`治病中档平均损失 ${strat.sickLostWork} 次打工`);
  }
  return lines;
}
