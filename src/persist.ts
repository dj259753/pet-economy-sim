import type { SimConfig, SimSettings } from './sim/config';
import { DEFAULT_CONFIG, DEFAULT_SETTINGS, OUTFIT_CATEGORIES } from './sim/config';

const STORAGE_KEY = 'pet-economy-sim-v1';
const EXPORT_VERSION = 1;
export const SNAPSHOT_URL = `${import.meta.env.BASE_URL}config.snapshot.json`;

export interface PersistedState {
  version: number;
  savedAt: string;
  config: SimConfig;
  settings: SimSettings;
}

export type ConfigSource = 'snapshot' | 'local' | 'default';

function deepMerge<T extends object>(base: T, patch: Partial<T>): T {
  const out = structuredClone(base);
  for (const key of Object.keys(patch) as (keyof T)[]) {
    const pv = patch[key];
    const bv = out[key];
    if (pv === undefined) continue;
    if (
      pv !== null &&
      typeof pv === 'object' &&
      !Array.isArray(pv) &&
      bv !== null &&
      typeof bv === 'object' &&
      !Array.isArray(bv)
    ) {
      out[key] = deepMerge(bv as object, pv as object) as T[keyof T];
    } else {
      out[key] = structuredClone(pv) as T[keyof T];
    }
  }
  return out;
}

/** 旧版含 C 档装扮配置 → 迁移为 B/A/S 三档 */
const LEGACY_FOCUS_MAP: Record<string, string> = {
  optimal: 'hardcore',
};

function migrateStrategies(cfg: SimConfig): void {
  if (!cfg.strategies.some((s) => s.id === 'foxi') || cfg.strategies.some((s) => s.id === 'optimal')) {
    cfg.strategies = structuredClone(DEFAULT_CONFIG.strategies);
  }
}

function migrateStageConfig(cfg: SimConfig): void {
  cfg.stages.forEach((stage, i) => {
    if (stage.graduationBonus === undefined) {
      stage.graduationBonus = DEFAULT_CONFIG.stages[i]?.graduationBonus ?? 0;
    }
  });
}

function migrateOutfitConfig(cfg: SimConfig): void {
  for (const cat of OUTFIT_CATEGORIES) {
    const p = cfg.outfit.prices[cat.key] as number[];
    if (p.length > 3) {
      cfg.outfit.prices[cat.key] = [p[1], p[2], p[3]] as [number, number, number];
    }
  }
  if (cfg.outfit.initialCounts.length > 3) {
    cfg.outfit.initialCounts = cfg.outfit.initialCounts.slice(1) as [number, number, number];
  }
  if (cfg.outfit.releaseIntervalDays.length > 3) {
    cfg.outfit.releaseIntervalDays = cfg.outfit.releaseIntervalDays.slice(1) as [
      number,
      number,
      number,
    ];
  }
  for (const s of cfg.strategies) {
    if (s.outfitProbs.length > 3) {
      s.outfitProbs = s.outfitProbs.slice(1) as [number, number, number];
    }
  }
}

function parseState(data: Partial<PersistedState>): { config: SimConfig; settings: SimSettings } {
  if (!data.config) throw new Error('无效的配置');
  const config = deepMerge(structuredClone(DEFAULT_CONFIG), data.config);
  migrateStrategies(config);
  migrateStageConfig(config);
  migrateOutfitConfig(config);
  const settings = deepMerge(DEFAULT_SETTINGS, data.settings ?? {});
  if (LEGACY_FOCUS_MAP[settings.focusStrategyId]) {
    settings.focusStrategyId = LEGACY_FOCUS_MAP[settings.focusStrategyId];
  }
  return { config, settings };
}

export function buildPayload(config: SimConfig, settings: SimSettings): PersistedState {
  return {
    version: EXPORT_VERSION,
    savedAt: new Date().toISOString(),
    config,
    settings,
  };
}

/** 读取项目内团队配置 public/config.snapshot.json */
export async function fetchProjectSnapshot(): Promise<PersistedState | null> {
  try {
    const res = await fetch(SNAPSHOT_URL, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = (await res.json()) as Partial<PersistedState>;
    if (!data.config) return null;
    return data as PersistedState;
  } catch {
    return null;
  }
}

/** 从 localStorage 读取 */
export function loadPersisted(): (PersistedState & { config: SimConfig; settings: SimSettings }) | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<PersistedState>;
    const parsed = parseState(data);
    return {
      version: data.version ?? EXPORT_VERSION,
      savedAt: data.savedAt ?? '',
      ...parsed,
    };
  } catch {
    return null;
  }
}

/**
 * 启动时加载优先级：
 * 1. 项目配置 snapshot（发仓库给别人用的那份）
 * 2. 本机 localStorage（仅当比 snapshot 更新 —— 说明你本地还在改、还没写回项目）
 * 3. 代码内置默认值
 */
export async function resolveInitialState(): Promise<{
  config: SimConfig;
  settings: SimSettings;
  source: ConfigSource;
}> {
  const snapshot = await fetchProjectSnapshot();
  const local = loadPersisted();

  if (snapshot) {
    const snapState = parseState(snapshot);
    if (!local || !local.savedAt || snapshot.savedAt >= local.savedAt) {
      return { ...snapState, source: 'snapshot' };
    }
    return { config: local.config, settings: local.settings, source: 'local' };
  }

  if (local) {
    return { config: local.config, settings: local.settings, source: 'local' };
  }

  return {
    config: structuredClone(DEFAULT_CONFIG),
    settings: { ...DEFAULT_SETTINGS },
    source: 'default',
  };
}

export function savePersisted(config: SimConfig, settings: SimSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(buildPayload(config, settings)));
}

function downloadJson(filename: string, payload: PersistedState): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** 开发环境一键写入 public/config.snapshot.json；否则下载该文件供手动放入 public/ */
export async function saveToProject(
  config: SimConfig,
  settings: SimSettings,
): Promise<'saved' | 'downloaded'> {
  const payload = buildPayload(config, settings);
  const body = JSON.stringify(payload, null, 2);
  try {
    const res = await fetch('/api/save-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });
    if (res.ok) return 'saved';
  } catch {
    // 非 dev 环境无写入接口
  }
  downloadJson('config.snapshot.json', payload);
  return 'downloaded';
}

export function exportState(config: SimConfig, settings: SimSettings): void {
  const stamp = new Date().toISOString().slice(0, 10);
  downloadJson(`pet-economy-sim-${stamp}.json`, buildPayload(config, settings));
}

export function importState(file: File): Promise<{ config: SimConfig; settings: SimSettings }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(parseState(JSON.parse(String(reader.result)) as Partial<PersistedState>));
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

export function clearPersisted(): void {
  localStorage.removeItem(STORAGE_KEY);
}
