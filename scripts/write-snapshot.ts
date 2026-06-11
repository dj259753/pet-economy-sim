/**
 * 用代码内置默认值生成 public/config.snapshot.json
 * 默认拒绝覆盖已有团队配置，避免误删调参结果：
 *   npx tsx scripts/write-snapshot.ts --force
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_CONFIG, DEFAULT_SETTINGS } from '../src/sim/config';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const target = path.join(root, 'public/config.snapshot.json');
const force = process.argv.includes('--force');

if (fs.existsSync(target) && !force) {
  console.error(
    '已存在 public/config.snapshot.json，拒绝用代码默认值覆盖。\n' +
      '团队配置请用界面「保存到项目」，或确认要重置时加 --force。',
  );
  process.exit(1);
}

const payload = {
  version: 1,
  savedAt: new Date().toISOString(),
  config: DEFAULT_CONFIG,
  settings: DEFAULT_SETTINGS,
};

fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, JSON.stringify(payload, null, 2));
console.log(force ? '已强制写入' : '已写入', target);
