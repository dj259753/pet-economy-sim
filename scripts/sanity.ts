// 引擎数值合理性快速校验脚本：npx tsx scripts/sanity.ts
import { DEFAULT_CONFIG } from '../src/sim/config';
import { computeAll, runSim } from '../src/sim/engine';

const cfg = structuredClone(DEFAULT_CONFIG);
const outputs = computeAll(cfg, 365, true, 100);

for (const o of outputs) {
  console.log(`\n===== ${o.strategy.name} =====`);
  console.log(`期末金币(期望): ${Math.round(o.ev.finalGold)}`);
  console.log(`稳态日净收益: ${o.ev.steadyNetPerDay.toFixed(1)}`);
  console.log(`生病次数: ${o.ev.sicknessCount}`);
  console.log(
    `装扮可负担天: ${o.ev.affordDays.map((d, i) => `${'BAS'[i]}=${d ?? '未'}`).join(' ')}`,
  );
  console.log('里程碑:');
  for (const m of o.ev.milestones) {
    console.log(`  第${String(m.day).padStart(3)}天  ${m.label}`);
  }
  if (o.mc) {
    const fg = o.mc.finalGolds;
    console.log(
      `MC期末金币 P10/P50/P90: ${Math.round(fg[Math.floor(fg.length * 0.1)])} / ${Math.round(
        fg[Math.floor(fg.length * 0.5)],
      )} / ${Math.round(fg[Math.floor(fg.length * 0.9)])}`,
    );
  }
  const inc = o.ev.totalIncome;
  const exp = o.ev.totalExpense;
  const inSum = Object.values(inc).reduce((a, b) => a + b, 0);
  const exSum = Object.values(exp).reduce((a, b) => a + b, 0);
  console.log(
    `总收入 ${Math.round(inSum)} (打工${Math.round(inc.work)} 雇佣${Math.round(inc.hire)} 被雇佣${Math.round(inc.hiredBy)} 课程${Math.round(inc.course)} 奖学金${Math.round(inc.scholarship)} 毕业奖${Math.round(inc.graduation)} 冒险${Math.round(inc.adventure)} PK${Math.round(inc.pk)})`,
  );
  console.log(`治病选档 低/中/高/赊: ${o.ev.sickTierCounts.join('/')}`);
  console.log(
    `抽奖: ${Math.round(o.ev.gachaDraws)}次 花费${Math.round(exp.gacha)} 返还${Math.round(inc.gacha)} 净沉没${Math.round(exp.gacha - inc.gacha)} 大奖${o.ev.gachaGrandWins.toFixed(1)}个`,
  );
  console.log(
    `总支出 ${Math.round(exSum)} (进修${Math.round(exp.training)} 食物${Math.round(exp.food)} 治病${Math.round(exp.sickness)} 冒险${Math.round(exp.adventure)} PK${Math.round(exp.pk)} 装扮${Math.round(exp.outfit)})`,
  );
  console.log(`金币守恒检查: 期初0 + 收入−支出 = ${Math.round(inSum - exSum)} vs 期末 ${Math.round(o.ev.finalGold)}`);
}

// 守恒性断言（蒙特卡洛单次也验证）
const seedRun = runSim(cfg, cfg.strategies[1], 365, (() => {
  let a = 42 >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
})());
const sIn = Object.values(seedRun.totalIncome).reduce((a, b) => a + b, 0);
const sEx = Object.values(seedRun.totalExpense).reduce((a, b) => a + b, 0);
const diff = Math.abs(sIn - sEx - seedRun.finalGold);
console.log(`\n[随机单次守恒检查] |收入−支出−期末金币| = ${diff.toFixed(6)} ${diff < 1e-6 ? 'OK' : '!!! 不守恒'}`);
