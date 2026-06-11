/** 用代码内置默认值生成 public/config.snapshot.json：npx tsx scripts/write-snapshot.ts */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DEFAULT_CONFIG, DEFAULT_SETTINGS } from '../src/sim/config';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const target = path.join(root, 'public/config.snapshot.json');

const payload = {
  version: 1,
  savedAt: new Date().toISOString(),
  config: DEFAULT_CONFIG,
  settings: DEFAULT_SETTINGS,
};

fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, JSON.stringify(payload, null, 2));
console.log('已写入', target);
