import React from 'react';
import { tapLight } from './haptics';

/** A progress track; without a total it shows a soft sweep instead. */
export function Progress({ value, label }: { value: number | null; label: string }) {
  return (
    <div
      role="progressbar" aria-label={label}
      aria-valuemin={0} aria-valuemax={100} aria-valuenow={value === null ? undefined : Math.round(value * 100)}
      className="h-2 rounded-full bg-surface-2 overflow-hidden"
    >
      {value === null
        ? <div className="h-full w-1/3 rounded-full bg-accent-fill sweep" />
        : <div className="h-full rounded-full bg-accent-fill origin-left rtl:origin-right transition-transform duration-300" style={{ transform: `scaleX(${Math.max(0.02, Math.min(1, value))})` }} />}
    </div>
  );
}

/** A row with an on/off switch, in a Group (iOS Settings). */
export function SwitchRow({ label, sub, checked, onChange }: { label: string; sub?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="relative w-full min-h-[56px] px-[16px] py-3 flex items-center gap-[12px] cursor-pointer">
      <span className="min-w-0 flex-1">
        <span className="block text-body text-fg wrap-compound">{label}</span>
        {sub && <span className="block text-caption text-fg-mute mt-0.5 wrap-prose">{sub}</span>}
      </span>
      <input
        type="checkbox" role="switch" checked={checked}
        onChange={e => { tapLight(); onChange(e.target.checked); }}
        className="peer sr-only"
      />
      <span aria-hidden="true" className={`shrink-0 w-[51px] h-[31px] rounded-full p-[2px] transition-colors peer-focus-visible:ring-focus ${checked ? 'bg-keep' : 'bg-surface-2'}`}>
        <span className={`block w-[27px] h-[27px] rounded-full bg-on-color shadow-e2 transition-transform ${checked ? 'translate-x-[20px] rtl:-translate-x-[20px]' : ''}`} />
      </span>
    </label>
  );
}

/** Two or three choices side by side (a filter). */
export function Segmented<V extends string>({ value, options, onChange, label }: {
  value: V;
  options: { value: V; label: string }[];
  onChange: (v: V) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex p-1 rounded-full bg-surface-2">
      {options.map(o => (
        <button
          key={o.value} type="button" role="radio" aria-checked={o.value === value}
          onClick={() => { tapLight(); onChange(o.value); }}
          className={`flex-1 min-h-[36px] px-3 rounded-full text-label font-bold transition-colors focus-visible:ring-focus ${
            o.value === value ? 'bg-surface text-fg shadow-e2' : 'text-fg-mute'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** A small label on a photo or a card. */
export function Badge({ tone = 'accent', children, className = '' }: { tone?: 'accent' | 'keep' | 'neg' | 'warn' | 'veil'; children: React.ReactNode; className?: string }) {
  const tones = {
    accent: 'bg-accent-fill text-accent-fill-ink',
    keep: 'bg-keep text-keep-ink',
    neg: 'bg-neg text-neg-ink',
    warn: 'bg-warn-dim text-warn',
    veil: 'bg-veil text-on-color',
  };
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-micro font-extrabold ${tones[tone]} ${className}`}>{children}</span>;
}
