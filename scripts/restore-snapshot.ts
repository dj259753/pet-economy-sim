/**
 * 从 git 历史恢复 config.snapshot.json，并仅做结构迁移（保留当时数值）
 * 例：npx tsx scripts/restore-snapshot.ts 73ff6e0
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_SETTINGS } from '../src/sim/config';
import { buildPayload, normalizeLoadedConfig, type PersistedState } from '../src/persist';

const commit = process.argv[2] ?? '73ff6e0';
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const target = path.join(root, 'public/config.snapshot.json');

const raw = execSync(`git show ${commit}:public/config.snapshot.json`, {
  cwd: root,
  encoding: 'utf8',
});
const data = JSON.parse(raw) as PersistedState;
const config = normalizeLoadedConfig(data.config);
const settings = { ...DEFAULT_SETTINGS, ...data.settings };

const payload = buildPayload(config, settings);
payload.savedAt = data.savedAt ?? payload.savedAt;

fs.writeFileSync(target, JSON.stringify(payload, null, 2));
console.log(`已从 ${commit} 恢复并迁移写入 ${target}`);
console.log(`  原保存时间: ${data.savedAt}`);
console.log(`  gacha.price=${config.gacha.price}  training.cost=${config.training.cost}`);
