// npx tsx scripts/check-curves.ts
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { normalizeLoadedConfig } from '../src/persist';
import type { SimConfig } from '../src/sim/config';
import { runSim } from '../src/sim/engine';

const raw = JSON.parse(readFileSync(join(process.cwd(), 'public/config.snapshot.json'), 'utf8'));
const cfg = normalizeLoadedConfig(raw.config as SimConfig);
const days = (raw.settings?.days as number) ?? 180;

for (const strat of cfg.strategies.filter((s) => s.enabled)) {
  const r = runSim(cfg, strat, days, null);
  const negDays = r.days.filter((d) => d.net < 0);
  const dips = r.days.filter((d, i) => i > 0 && d.gold < r.days[i - 1].gold);
  const samples = [1, 30, 60, 90, 120, 150, days]
    .filter((d, i, a) => a.indexOf(d) === i && d <= days)
    .map((d) => ({
      day: d,
      gold: Math.round(r.days[d - 1].gold),
      net: Math.round(r.days[d - 1].net),
    }));

  console.log(`\n===== ${strat.name} (${strat.id}) =====`);
  console.log(`职业 ${strat.targetJobId} · 行动 ${strat.dailyActions} · 打工 ${strat.orderPref}`);
  console.log(`期末 ${Math.round(r.finalGold)} · 稳态日净 ${r.steadyNetPerDay.toFixed(1)}`);
  console.log(`日净<0: ${negDays.length}/${days} · 金币回落天: ${dips.length}`);
  if (negDays.length) {
    console.log(
      '  示例负净日',
      negDays.slice(0, 3).map((d) => `D${d.day}(${Math.round(d.net)})`).join(', '),
    );
  }
  console.log('采样', samples);
  const inc = r.totalIncome;
  const exp = r.totalExpense;
  console.log(
    `收入 打工${Math.round(inc.work)} 雇佣${Math.round(inc.hire)} 被雇${Math.round(inc.hiredBy)} 抽奖${Math.round(inc.gacha)}`,
  );
  console.log(
    `支出 进修${Math.round(exp.training)} 装扮${Math.round(exp.outfit)} 抽奖${Math.round(exp.gacha)} 雇佣费${Math.round(exp.hireCost)}`,
  );
}
