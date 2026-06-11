import { useMemo } from 'react';
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { SimConfig, SimSettings } from '../sim/config';
import { OUTFIT_CATEGORIES, OUTFIT_GRADES } from '../sim/config';
import type { BalanceMetric } from '../sim/balance';
import { computeBalanceMetrics } from '../sim/balance';
import { analyzeGachaTarget } from '../sim/gachaAnalysis';
import type { StrategyOutput } from '../sim/engine';
import { EXPENSE_KEYS, INCOME_KEYS } from '../sim/engine';
import { strategySummaryLines } from '../sim/strategySummary';

const fmt = (v: number): string =>
  Math.abs(v) >= 10000 ? `${(v / 10000).toFixed(1)}w` : Math.round(v).toLocaleString();

export function ResultsPanel({
  outputs,
  config,
  settings,
  setSettings,
}: {
  outputs: StrategyOutput[];
  config: SimConfig;
  settings: SimSettings;
  setSettings: (s: SimSettings) => void;
}) {
  const focus =
    outputs.find((o) => o.strategy.id === settings.focusStrategyId) ?? outputs[0];

  if (!outputs.length) {
    return <div className="results-panel empty">请至少启用一个策略</div>;
  }

  return (
    <div className="results-panel">
      <StrategyGuide outputs={outputs} config={config} />
      <BalancePanel outputs={outputs} config={config} focusId={settings.focusStrategyId} />
      <SummaryCards outputs={outputs} config={config} />
      <GoldChart outputs={outputs} settings={settings} setSettings={setSettings} focus={focus} />
      <div className="chart-grid">
        <MilestonePanel outputs={outputs} />
        <OutfitPanel outputs={outputs} config={config} />
      </div>
      <BreakdownChart focus={focus} />
      <NetChart outputs={outputs} />
      <TotalsTable outputs={outputs} />
    </div>
  );
}

// ---- 玩家策略说明 ----

function StrategyGuide({
  outputs,
  config,
}: {
  outputs: StrategyOutput[];
  config: SimConfig;
}) {
  return (
    <div className="chart-block strategy-guide">
      <h3>玩家策略说明</h3>
      <p className="strategy-guide-intro">
        五档画像按<strong>日均行动点</strong>区分（学习/打工占用行动点，冒险·PK·装扮·抽奖不占行动点）。
        毕业后：有属性缺口且金币够 → 进修，否则打工。
      </p>
      <div className="strategy-guide-grid">
        {outputs.map((o) => (
          <div
            key={o.strategy.id}
            className="strategy-guide-card"
            style={{ borderLeftColor: o.strategy.color }}
          >
            <div className="strategy-guide-name" style={{ color: o.strategy.color }}>
              {o.strategy.name}
            </div>
            <ul className="strategy-guide-list">
              {strategySummaryLines(o.strategy, config).map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- 平衡仪表盘 ----

const STATUS_STYLE: Record<BalanceMetric['status'], string> = {
  good: '#34d399',
  warn: '#fbbf24',
  bad: '#f87171',
};

function BalancePanel({
  outputs,
  config,
  focusId,
}: {
  outputs: StrategyOutput[];
  config: SimConfig;
  focusId: string;
}) {
  const focus = outputs.find((o) => o.strategy.id === focusId) ?? outputs[0];
  if (!focus) return null;
  const metrics = computeBalanceMetrics(focus.ev, config, focus.strategy);

  return (
    <div className="chart-block balance-panel">
      <h3>
        平衡仪表盘 — {focus.strategy.name}
        <span className="balance-legend">
          <span style={{ color: STATUS_STYLE.good }}>●</span> 健康
          <span style={{ color: STATUS_STYLE.warn }}>●</span> 偏离
          <span style={{ color: STATUS_STYLE.bad }}>●</span> 需调整
        </span>
      </h3>
      <div className="balance-grid">
        {metrics.map((m) => (
          <div key={m.id} className="balance-item" style={{ borderLeftColor: STATUS_STYLE[m.status] }}>
            <div className="balance-label">{m.label}</div>
            <div className="balance-value" style={{ color: STATUS_STYLE[m.status] }}>
              {m.value}
            </div>
            <div className="balance-target">目标：{m.target}</div>
            {m.hint && <div className="balance-hint">{m.hint}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- 概览卡片 ----

function SummaryCards({
  outputs,
  config,
}: {
  outputs: StrategyOutput[];
  config: SimConfig;
}) {
  return (
    <div className="cards">
      {outputs.map((o) => {
        const masterMilestone = o.ev.milestones.find((m) => m.label.startsWith('晋升 大师'));
        const lastPromo = [...o.ev.milestones].reverse().find((m) => m.label.startsWith('晋升'));
        const gachaTarget = analyzeGachaTarget(config, o.strategy, o.ev);
        return (
          <div key={o.strategy.id} className="card" style={{ borderTopColor: o.strategy.color }}>
            <div className="card-title" style={{ color: o.strategy.color }}>
              {o.strategy.name}
            </div>
            <div className="card-stat">
              <span className="stat-value">{fmt(o.ev.finalGold)}</span>
              <span className="stat-label">期末金币(期望)</span>
            </div>
            <div className="card-rows">
              <div>
                稳态净收益 <b>{fmt(o.ev.steadyNetPerDay)}</b> /天
              </div>
              <div>
                最高晋升{' '}
                <b>
                  {lastPromo
                    ? `${lastPromo.label.replace('晋升 ', '')} (第${lastPromo.day}天)`
                    : '未晋升'}
                </b>
              </div>
              <div>
                大师达成 <b>{masterMilestone ? `第${masterMilestone.day}天` : '—'}</b>
              </div>
              <div>
                治病选档 低/中/高/赊{' '}
                <b>{o.ev.sickTierCounts.join('/')}</b>
              </div>
              <div>
                课程保底(全周期) <b>{fmt(o.ev.totalIncome.course)}</b>
              </div>
              <div>
                装扮总支出 <b>{fmt(o.ev.outfitOwnedSpend)}</b>
              </div>
              <div>
                抽奖 <b>{fmt(o.ev.gachaDraws)}</b> 次 / 净沉没{' '}
                <b>{fmt(o.ev.totalExpense.gacha - o.ev.totalIncome.gacha)}</b> / 大奖{' '}
                <b>{o.ev.gachaGrandWins.toFixed(1)}</b> 个
              </div>
              <div>
                终极大奖 <b>{gachaTarget.grandLabel}</b> / 目标 ≤{config.gacha.targetGrandDays}天
              </div>
              <div>
                周期内补币{' '}
                <b>
                  {gachaTarget.payYuanToMeetTarget > 0
                    ? `约 ¥${gachaTarget.payYuanToMeetTarget}`
                    : o.ev.totalPayYuan > 0
                      ? `已达标（模拟 ¥${Math.round(o.ev.totalPayYuan)}）`
                      : '¥0'}
                </b>
              </div>
              <div>
                付费充值（全周期）{' '}
                <b>
                  ¥{o.ev.totalPayYuan.toFixed(0)}
                  {o.ev.totalPayYuan > 0
                    ? ` → ${fmt(o.ev.totalIncome.recharge)} 币`
                    : ''}
                </b>
              </div>
              {o.mc && (
                <div>
                  期末金币 P10~P90{' '}
                  <b>
                    {fmt(o.mc.finalGolds[Math.floor(o.mc.finalGolds.length * 0.1)])} ~{' '}
                    {fmt(o.mc.finalGolds[Math.floor(o.mc.finalGolds.length * 0.9)])}
                  </b>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---- 金币曲线 ----

function GoldChart({
  outputs,
  settings,
  setSettings,
  focus,
}: {
  outputs: StrategyOutput[];
  settings: SimSettings;
  setSettings: (s: SimSettings) => void;
  focus: StrategyOutput;
}) {
  const data = useMemo(() => {
    const days = outputs[0].ev.days.length;
    const rows: Record<string, number>[] = [];
    for (let d = 0; d < days; d++) {
      const row: Record<string, number> = { day: d + 1 };
      for (const o of outputs) {
        row[o.strategy.id] = Math.round(o.ev.days[d].gold);
      }
      if (focus.mc) {
        row.p10 = Math.round(focus.mc.p10[d]);
        row.band = Math.round(focus.mc.p90[d] - focus.mc.p10[d]);
      }
      rows.push(row);
    }
    return rows;
  }, [outputs, focus]);

  return (
    <div className="chart-block">
      <div className="chart-head">
        <h3>金币存量曲线</h3>
        <label className="inline-select">
          蒙特卡洛区间(P10~P90)聚焦：
          <select
            value={settings.focusStrategyId}
            onChange={(e) => setSettings({ ...settings, focusStrategyId: e.target.value })}
          >
            {outputs.map((o) => (
              <option key={o.strategy.id} value={o.strategy.id}>
                {o.strategy.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2f3a" />
          <XAxis dataKey="day" stroke="#8b93a3" tick={{ fontSize: 11 }} unit="天" />
          <YAxis stroke="#8b93a3" tick={{ fontSize: 11 }} tickFormatter={fmt} />
          <Tooltip
            contentStyle={{ background: '#1b1f29', border: '1px solid #333a48', fontSize: 12 }}
            formatter={(v, name) => [
              fmt(Number(v ?? 0)),
              name === 'band' ? 'P10~P90 区间宽' : name === 'p10' ? 'P10' : String(name),
            ]}
            labelFormatter={(d) => `第 ${d} 天`}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {focus.mc && (
            <>
              <Area
                dataKey="p10"
                stackId="band"
                stroke="none"
                fill="transparent"
                legendType="none"
                tooltipType="none"
                isAnimationActive={false}
              />
              <Area
                dataKey="band"
                name={`${focus.strategy.name} P10~P90`}
                stackId="band"
                stroke="none"
                fill={focus.strategy.color}
                fillOpacity={0.15}
                isAnimationActive={false}
              />
            </>
          )}
          {outputs.map((o) => (
            <Line
              key={o.strategy.id}
              dataKey={o.strategy.id}
              name={o.strategy.name}
              stroke={o.strategy.color}
              dot={false}
              strokeWidth={2}
              isAnimationActive={false}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---- 成长时间线 ----

function MilestonePanel({ outputs }: { outputs: StrategyOutput[] }) {
  return (
    <div className="chart-block">
      <h3>成长节奏时间线（期望模式 / 蒙特卡洛中位数）</h3>
      <div className="milestone-grid">
        {outputs.map((o) => (
          <div key={o.strategy.id} className="milestone-col">
            <div className="milestone-strategy" style={{ color: o.strategy.color }}>
              {o.strategy.name}
            </div>
            {o.ev.milestones.map((m, i) => {
              const mcM = o.mc?.milestoneMedianDays.find((x) => x.label === m.label);
              return (
                <div key={i} className="milestone-item">
                  <span className="milestone-day">第{m.day}天</span>
                  <span className="milestone-label">{m.label}</span>
                  {mcM && <span className="milestone-mc">MC中位 第{mcM.day}天</span>}
                </div>
              );
            })}
            {o.mc?.milestoneMedianDays
              .filter((mcm) => !o.ev.milestones.some((m) => m.label === mcm.label))
              .map((mcm, i) => (
                <div key={`mc-${i}`} className="milestone-item mc-only">
                  <span className="milestone-day">~第{mcm.day}天</span>
                  <span className="milestone-label">
                    {mcm.label}（{Math.round(mcm.reachedRatio * 100)}%模拟达成）
                  </span>
                </div>
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- 装扮可负担 ----

function OutfitPanel({ outputs, config }: { outputs: StrategyOutput[]; config: SimConfig }) {
  const setPrices = OUTFIT_GRADES.map((_, gi) =>
    OUTFIT_CATEGORIES.reduce((s, c) => s + config.outfit.prices[c.key][gi], 0),
  );
  return (
    <div className="chart-block">
      <h3>装扮全套可负担天数（按当前金币存量）</h3>
      <table className="result-table">
        <thead>
          <tr>
            <th>策略</th>
            {OUTFIT_GRADES.map((g, gi) => (
              <th key={g}>
                {g} 级全套
                <br />
                <span className="th-sub">{setPrices[gi]} 金币</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {outputs.map((o) => (
            <tr key={o.strategy.id}>
              <td style={{ color: o.strategy.color, fontWeight: 600 }}>{o.strategy.name}</td>
              {o.ev.affordDays.map((d, i) => (
                <td key={i}>{d === null ? '周期内未达成' : `第 ${d} 天`}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---- 收支拆解（周聚合，聚焦策略）----

function BreakdownChart({ focus }: { focus: StrategyOutput }) {
  const data = useMemo(() => {
    const rows: Record<string, number | string>[] = [];
    const days = focus.ev.days;
    for (let w = 0; w * 7 < days.length; w++) {
      const slice = days.slice(w * 7, w * 7 + 7);
      const row: Record<string, number | string> = { week: `W${w + 1}` };
      for (const k of INCOME_KEYS) {
        row[`in_${k.key}`] = Math.round(slice.reduce((s, d) => s + d.income[k.key], 0));
      }
      for (const k of EXPENSE_KEYS) {
        row[`ex_${k.key}`] = -Math.round(slice.reduce((s, d) => s + d.expense[k.key], 0));
      }
      rows.push(row);
    }
    return rows;
  }, [focus]);

  return (
    <div className="chart-block">
      <h3>每周收支拆解 — {focus.strategy.name}（期望模式）</h3>
      <ResponsiveContainer width="100%" height={600}>
        <ComposedChart data={data} margin={{ top: 12, right: 16, bottom: 8, left: 8 }} stackOffset="sign">
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2f3a" />
          <XAxis dataKey="week" stroke="#8b93a3" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
          <YAxis stroke="#8b93a3" tick={{ fontSize: 11 }} tickFormatter={fmt} />
          <Tooltip
            contentStyle={{ background: '#1b1f29', border: '1px solid #333a48', fontSize: 12 }}
            formatter={(v) => fmt(Math.abs(Number(v ?? 0)))}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={2} />
          {INCOME_KEYS.map((k) => (
            <Bar
              key={k.key}
              dataKey={`in_${k.key}`}
              name={k.name}
              stackId="flow"
              fill={k.color}
              stroke="#0f1419"
              strokeWidth={1}
              isAnimationActive={false}
            />
          ))}
          {EXPENSE_KEYS.map((k) => (
            <Bar
              key={k.key}
              dataKey={`ex_${k.key}`}
              name={k.name}
              stackId="flow"
              fill={k.color}
              stroke="#0f1419"
              strokeWidth={1}
              isAnimationActive={false}
            />
          ))}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---- 日净收益（7日均线）----

function NetChart({ outputs }: { outputs: StrategyOutput[] }) {
  const data = useMemo(() => {
    const days = outputs[0].ev.days.length;
    const rows: Record<string, number>[] = [];
    for (let d = 0; d < days; d++) {
      const row: Record<string, number> = { day: d + 1 };
      for (const o of outputs) {
        const from = Math.max(0, d - 6);
        const slice = o.ev.days.slice(from, d + 1);
        row[o.strategy.id] = slice.reduce((s, x) => s + x.net, 0) / slice.length;
      }
      rows.push(row);
    }
    return rows;
  }, [outputs]);

  return (
    <div className="chart-block">
      <h3>日净收益（7日滑动平均）— 通胀监测</h3>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2f3a" />
          <XAxis dataKey="day" stroke="#8b93a3" tick={{ fontSize: 11 }} unit="天" />
          <YAxis stroke="#8b93a3" tick={{ fontSize: 11 }} tickFormatter={fmt} />
          <Tooltip
            contentStyle={{ background: '#1b1f29', border: '1px solid #333a48', fontSize: 12 }}
            formatter={(v) => fmt(Number(v ?? 0))}
            labelFormatter={(d) => `第 ${d} 天`}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <ReferenceLine y={0} stroke="#555e70" />
          {outputs.map((o) => (
            <Line
              key={o.strategy.id}
              dataKey={o.strategy.id}
              name={o.strategy.name}
              stroke={o.strategy.color}
              dot={false}
              strokeWidth={2}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---- 收支总账 ----

function TotalsTable({ outputs }: { outputs: StrategyOutput[] }) {
  return (
    <div className="chart-block">
      <h3>全周期收支总账（期望模式）</h3>
      <table className="result-table">
        <thead>
          <tr>
            <th>策略</th>
            {INCOME_KEYS.map((k) => (
              <th key={k.key} style={{ color: k.color }}>
                {k.name}
              </th>
            ))}
            {EXPENSE_KEYS.map((k) => (
              <th key={k.key} style={{ color: k.color }}>
                −{k.name}
              </th>
            ))}
            <th>总收入</th>
            <th>总支出</th>
            <th>产出/消耗比</th>
          </tr>
        </thead>
        <tbody>
          {outputs.map((o) => {
            const inSum = Object.values(o.ev.totalIncome).reduce((a, b) => a + b, 0);
            const exSum = Object.values(o.ev.totalExpense).reduce((a, b) => a + b, 0);
            return (
              <tr key={o.strategy.id}>
                <td style={{ color: o.strategy.color, fontWeight: 600 }}>{o.strategy.name}</td>
                {INCOME_KEYS.map((k) => (
                  <td key={k.key}>{fmt(o.ev.totalIncome[k.key])}</td>
                ))}
                {EXPENSE_KEYS.map((k) => (
                  <td key={k.key}>{fmt(o.ev.totalExpense[k.key])}</td>
                ))}
                <td>
                  <b>{fmt(inSum)}</b>
                </td>
                <td>
                  <b>{fmt(exSum)}</b>
                </td>
                <td>
                  <b>{exSum > 0 ? (inSum / exSum).toFixed(2) : '∞'}</b>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
