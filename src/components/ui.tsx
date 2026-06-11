import { useState, type ReactNode } from 'react';

export function Section({
  title,
  badge,
  defaultOpen = false,
  children,
}: {
  title: string;
  badge?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="section">
      <button className="section-header" onClick={() => setOpen(!open)}>
        <span className={`chevron ${open ? 'open' : ''}`}>▸</span>
        <span className="section-title">{title}</span>
        {badge && <span className="section-badge">{badge}</span>}
      </button>
      {open && <div className="section-body">{children}</div>}
    </div>
  );
}

export function NumField({
  label,
  value,
  onChange,
  step = 1,
  suffix,
  width,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  suffix?: string;
  width?: number;
}) {
  return (
    <label className="num-field">
      <span className="num-label">{label}</span>
      <span className="num-input-wrap">
        <input
          type="number"
          value={Number.isInteger(value) ? value : Number(value.toFixed(3))}
          step={step}
          style={width ? { width } : undefined}
          onChange={(e) => {
            const v = parseFloat(e.target.value);
            if (!Number.isNaN(v)) onChange(v);
          }}
        />
        {suffix && <span className="num-suffix">{suffix}</span>}
      </span>
    </label>
  );
}

/** 表格内的紧凑数字输入 */
export function CellInput({
  value,
  onChange,
  step = 1,
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <input
      className="cell-input"
      type="number"
      step={step}
      value={Number.isInteger(value) ? value : Number(value.toFixed(3))}
      onChange={(e) => {
        const v = parseFloat(e.target.value);
        if (!Number.isNaN(v)) onChange(v);
      }}
    />
  );
}

export function Row({ children }: { children: ReactNode }) {
  return <div className="field-row">{children}</div>;
}

export function Hint({ children }: { children: ReactNode }) {
  return <div className="hint">{children}</div>;
}
