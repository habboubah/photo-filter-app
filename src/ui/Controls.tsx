import React from 'react';
import { ArrowDownUp } from 'lucide-react';
import { tapLight } from './haptics';

/** A progress track; without a total it shows a soft sweep instead. */
/** `thin`: a hairline track for a figure beside other text (the months' progress). */
export function Progress({ value, label, thin }: { value: number | null; label: string; thin?: boolean }) {
  return (
    <div
      role="progressbar" aria-label={label}
      aria-valuemin={0} aria-valuemax={100} aria-valuenow={value === null ? undefined : Math.round(value * 100)}
      className={`${thin ? 'h-1' : 'h-2'} rounded-full bg-surface-2 overflow-hidden`}
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
      {/* iOS 26's switch: a wider track and a pill-shaped knob. */}
      <span aria-hidden="true" className={`shrink-0 w-[60px] h-[30px] rounded-full p-[2px] transition-colors peer-focus-visible:ring-focus ${checked ? 'bg-keep' : 'bg-surface-2'}`}>
        <span className={`block w-[38px] h-[26px] rounded-full bg-on-color shadow-e2 transition-transform duration-300 ease-[var(--ease-spring)] ${checked ? 'translate-x-[18px] rtl:-translate-x-[18px]' : ''}`} />
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
          className={`flex-1 min-h-[36px] px-3 rounded-full text-label font-semibold transition-colors focus-visible:ring-focus ${
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

/**
 * The sort menu at the top right of a list: a round bar button whose tap
 * opens the system's own picker (a native select lies invisibly over it), so
 * VoiceOver reads one pop-up button with the current order.
 */
export function SortMenu<V extends string>({ label, value, options, onChange }: {
  label: string;
  value: V;
  options: { value: V; label: string }[];
  onChange: (value: V) => void;
}) {
  const current = options.find(o => o.value === value)?.label ?? '';
  return (
    <label className="relative h-tap w-tap shrink-0 inline-flex items-center justify-center rounded-full glass text-fg press focus-within:ring-focus">
      <ArrowDownUp className="w-[20px] h-[20px]" strokeWidth={2.1} aria-hidden="true" />
      {/* 17px: WebKit zooms the page into a focused control under 16px. */}
      <select
        aria-label={`${label}: ${current}`}
        value={value}
        onChange={e => { tapLight(); onChange(e.target.value as V); }}
        className="absolute inset-0 w-full h-full opacity-0 appearance-none cursor-pointer text-body"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

/**
 * A size read at a glance ("388 MB"): the number large and heavy, the unit
 * beside it smaller and quieter, as the system's storage figures. Splits at
 * the last space, so it works for every locale `bytes()` writes.
 */
export function BigNumber({ text, className = '' }: { text: string; className?: string }) {
  const at = text.lastIndexOf(' ');
  const [n, unit] = at > 0 ? [text.slice(0, at), text.slice(at + 1)] : [text, ''];
  return (
    <span className={`display num ${className}`}>
      {n}{unit && <span className="text-[0.42em] font-bold tracking-normal text-fg-mute ms-[0.18em]">{unit}</span>}
    </span>
  );
}
