import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import './App.css';
import { ConfigPanel } from './components/ConfigPanel';
import { ResultsPanel } from './components/ResultsPanel';
import { NumField } from './components/ui';
import {
  clearPersisted,
  exportState,
  fetchProjectSnapshot,
  importState,
  resolveInitialState,
  savePersisted,
  saveToProject,
  type ConfigSource,
} from './persist';
import type { SimConfig } from './sim/config';
import { DEFAULT_CONFIG, DEFAULT_SETTINGS } from './sim/config';
import { computeAll } from './sim/engine';

const SOURCE_LABEL: Record<ConfigSource, string> = {
  snapshot: '项目配置',
  local: '本机缓存',
  default: '内置默认',
};

export default function App() {
  const [ready, setReady] = useState(false);
  const [config, setConfig] = useState<SimConfig>(() => structuredClone(DEFAULT_CONFIG));
  const [settings, setSettings] = useState(() => ({ ...DEFAULT_SETTINGS }));
  const [configSource, setConfigSource] = useState<ConfigSource>('default');
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [savingProject, setSavingProject] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void resolveInitialState().then((state) => {
      if (cancelled) return;
      setConfig(state.config);
      setSettings(state.settings);
      setConfigSource(state.source);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const update = (fn: (draft: SimConfig) => void) => {
    setConfig((prev) => {
      const draft = structuredClone(prev);
      fn(draft);
      return draft;
    });
  };

  useEffect(() => {
    if (!ready) return;
    savePersisted(config, settings);
    setSavedAt(new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }));
  }, [config, settings, ready]);

  const deferredConfig = useDeferredValue(config);
  const deferredSettings = useDeferredValue(settings);

  const outputs = useMemo(
    () =>
      computeAll(
        deferredConfig,
        Math.max(1, deferredSettings.days),
        deferredSettings.mcEnabled,
        Math.max(1, deferredSettings.mcRuns),
      ),
    [deferredConfig, deferredSettings.days, deferredSettings.mcEnabled, deferredSettings.mcRuns],
  );

  const handleSaveToProject = async () => {
    setSavingProject(true);
    try {
      const mode = await saveToProject(config, settings);
      if (mode === 'saved') {
        setConfigSource('snapshot');
        alert('已写入 public/config.snapshot.json\n请 git commit 后分享项目，对方即可拿到这套配置。');
      } else {
        alert(
          '已下载 config.snapshot.json\n请将其放到项目的 public/ 目录并提交 git，对方克隆后即可使用。',
        );
      }
    } finally {
      setSavingProject(false);
    }
  };

  const handleReloadProject = async () => {
    const snap = await fetchProjectSnapshot();
    if (!snap) {
      alert('未找到 public/config.snapshot.json');
      return;
    }
    const state = await importState(
      new File([JSON.stringify(snap)], 'config.snapshot.json', { type: 'application/json' }),
    );
    setConfig(state.config);
    setSettings(state.settings);
    setConfigSource('snapshot');
  };

  const handleReset = () => {
    if (!confirm('确定恢复为代码内置默认值？不会修改项目配置文件。')) return;
    clearPersisted();
    setConfig(structuredClone(DEFAULT_CONFIG));
    setSettings({ ...DEFAULT_SETTINGS });
    setConfigSource('default');
  };

  const handleImport = async (file: File) => {
    try {
      const data = await importState(file);
      setConfig(data.config);
      setSettings(data.settings);
      setConfigSource('local');
      alert('配置已导入');
    } catch {
      alert('导入失败：请检查 JSON 文件格式');
    }
  };

  if (!ready) {
    return (
      <div className="app-loading">
        <p>正在加载项目配置…</p>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar-title">
          <h1>QQ宠物 · 数值平衡模拟器</h1>
          <span className="subtitle">
            当前：{SOURCE_LABEL[configSource]}
            {savedAt ? ` · 本机已保存 ${savedAt}` : ''}
          </span>
        </div>
        <div className="topbar-controls">
          <NumField
            label="模拟天数"
            value={settings.days}
            onChange={(v) => setSettings({ ...settings, days: Math.round(v) })}
          />
          <label className="checkbox-field">
            <input
              type="checkbox"
              checked={settings.mcEnabled}
              onChange={(e) => setSettings({ ...settings, mcEnabled: e.target.checked })}
            />
            蒙特卡洛
          </label>
          {settings.mcEnabled && (
            <NumField
              label="模拟次数"
              value={settings.mcRuns}
              onChange={(v) => setSettings({ ...settings, mcRuns: Math.round(v) })}
            />
          )}
          <button
            className="primary-btn"
            disabled={savingProject}
            onClick={() => void handleSaveToProject()}
          >
            {savingProject ? '保存中…' : '保存到项目'}
          </button>
          <button className="reset-btn" onClick={() => void handleReloadProject()}>
            重载项目配置
          </button>
          <button className="reset-btn" onClick={() => exportState(config, settings)}>
            导出 JSON
          </button>
          <button
            className="reset-btn"
            onClick={() => document.getElementById('import-file')?.click()}
          >
            导入 JSON
          </button>
          <input
            id="import-file"
            type="file"
            accept=".json,application/json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleImport(file);
              e.target.value = '';
            }}
          />
          <button className="reset-btn" onClick={handleReset}>
            恢复默认
          </button>
        </div>
      </header>
      <div className="layout">
        <aside className="sidebar">
          <ConfigPanel config={config} update={update} />
        </aside>
        <main className="main">
          <ResultsPanel
            outputs={outputs}
            config={deferredConfig}
            settings={settings}
            setSettings={setSettings}
          />
        </main>
      </div>
    </div>
  );
}
