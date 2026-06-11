/**
 * 从导出的 JSON 恢复 public/config.snapshot.json（保留文件内数值，仅做结构迁移）
 * 例：npx tsx scripts/import-snapshot.ts ~/Downloads/pet-economy-sim-2026-06-11.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildPayload, normalizeLoadedConfig, type PersistedState } from '../src/persist';
import { DEFAULT_SETTINGS } from '../src/sim/config';

const source = process.argv[2];
if (!source) {
  console.error('用法: npx tsx scripts/import-snapshot.ts <导出的.json>');
  process.exit(1);
}

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const target = path.join(root, 'public/config.snapshot.json');
const raw = fs.readFileSync(path.resolve(source), 'utf8');
const data = JSON.parse(raw) as PersistedState;

if (!data.config) {
  console.error('无效文件：缺少 config');
  process.exit(1);
}

const config = normalizeLoadedConfig(data.config);
const settings = { ...DEFAULT_SETTINGS, ...data.settings };
const payload = buildPayload(config, settings);
payload.savedAt = data.savedAt ?? payload.savedAt;

fs.writeFileSync(target, JSON.stringify(payload, null, 2));
console.log(`已导入 ${source} → ${target}`);
console.log(`  保存时间: ${payload.savedAt}`);
console.log(
  `  校验: foodCost=${config.base.foodCost} gacha=${config.gacha.price} days=${settings.days} training=${config.training.cost}`,
);
