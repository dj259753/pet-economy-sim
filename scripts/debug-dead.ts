// 找出蒙特卡洛中"破产卡死"的模拟，分析死因：npx tsx scripts/debug-dead.ts
import { DEFAULT_CONFIG } from '../src/sim/config';
import { mulberry32, runSim } from '../src/sim/engine';

const cfg = structuredClone(DEFAULT_CONFIG);
const strat = cfg.strategies.find((s) => s.id === 'optimal')!;

let deadCount = 0;
for (let i = 0; i < 100; i++) {
  const res = runSim(cfg, strat, 365, mulberry32(12345 + i * 7919));
  if (res.finalGold < 1000) {
    deadCount++;
    if (deadCount === 1) {
      console.log(`种子 ${i} 死亡，期末金币 ${res.finalGold.toFixed(1)}`);
      console.log('里程碑:', res.milestones.map((m) => `D${m.day}:${m.label}`).join(' | '));
      console.log('\n前80天轨迹: 天 | 金币 | 武/智/魅 | 档位 | 当日净');
      for (const d of res.days.slice(0, 80)) {
        console.log(
          `D${String(d.day).padStart(3)} | ${d.gold.toFixed(0).padStart(7)} | ${d.wu.toFixed(0)}/${d.zhi.toFixed(0)}/${d.mei.toFixed(0)} | ${d.tier} | ${d.net.toFixed(0)}`,
        );
      }
      const last = res.days[res.days.length - 1];
      console.log(`\n第365天: 金币${last.gold.toFixed(0)} 属性${last.wu.toFixed(0)}/${last.zhi.toFixed(0)}/${last.mei.toFixed(0)} 档位${last.tier}`);
    }
  }
}
console.log(`\n100次模拟中破产卡死(期末<1000金币): ${deadCount} 次`);
