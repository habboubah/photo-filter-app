import React, { useEffect, useRef, useState } from 'react';
import { animate, useReducedMotion } from 'motion/react';

/*
 * The small pieces the first run is built from (docs/DESIGN.md, "The first
 * run"): a page indicator, a number that counts up, a progress ring and the
 * frame a photo sits in inside an illustration. Loaded with the screens that
 * use them (the welcome, the first scan, the reveal, the review's summary) —
 * none of them is on home, so none of this is in the main bundle.
 */

/** Where the springs of an explaining illustration come from: no bounce, about 0.6 s (docs/DESIGN.md, Motion). */
export const SETTLE = { type: 'spring', bounce: 0, duration: 0.6 } as const;

/** The page indicator of a short flow: one dot per page, the current one a longer pill. Read as one image ("Seite 2 von 4"). */
export function Dots({ count, index, label }: { count: number; index: number; label: string }) {
  return (
    <div role="img" aria-label={label} className="flex items-center justify-center gap-3 h-2">
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className={`block h-2 w-2 rounded-full origin-center transition-[transform,background-color] duration-200 ease-[var(--ease-out-soft)] ${
            i === index ? 'bg-accent-fill scale-x-[2.25]' : 'bg-fg-faint/60'}`}
        />
      ))}
    </div>
  );
}

/**
 * A number on its way up to `value` (and on from its last one when the value
 * changes): the figure to draw right now. Under reduced motion it is the
 * value at once.
 */
export function useCountUp(value: number, seconds = 0.8): number {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce ? value : 0);
  const from = useRef(reduce ? value : 0);
  useEffect(() => {
    if (reduce || from.current === value) { from.current = value; setShown(value); return; }
    const run = animate(from.current, value, {
      duration: seconds, ease: [0.23, 1, 0.32, 1],
      onUpdate: v => setShown(Math.round(v)),
      onComplete: () => setShown(value),
    });
    from.current = value;
    return () => run.stop();
  }, [value, reduce, seconds]);
  return shown;
}

/**
 * A number that counts up: what the scan found so far, what a review set
 * aside. Screen readers get the final figure at once. `format` turns the
 * number into words ("12", "357 MB").
 */
export function CountUp({ value, format, className = '', seconds }: {
  value: number;
  format: (n: number) => React.ReactNode;
  className?: string;
  seconds?: number;
}) {
  const shown = useCountUp(value, seconds);
  return (
    <span className={className}>
      <span aria-hidden="true">{format(shown)}</span>
      <span className="sr-only">{format(value)}</span>
    </span>
  );
}

/**
 * A progress ring: a quiet track and the accent's arc from the top, with
 * something in its middle (a percentage, a check). Without a value (still
 * counting) a short arc turns slowly. The arc's length is the one painted
 * property that animates in the app — a small SVG, never over a list.
 */
export function Ring({ value, size = 132, stroke = 10, label, children }: {
  /** 0–1, or null while the total is unknown. */
  value: number | null;
  size?: number;
  stroke?: number;
  label: string;
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = value === null ? 0.22 : Math.max(0, Math.min(1, value));
  return (
    <div
      role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100}
      aria-valuenow={value === null ? undefined : Math.round(v * 100)}
      className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true" className={value === null ? 'motion-safe:animate-[spin_2.4s_linear_infinite]' : ''}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-surface-2" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} strokeLinecap="round"
          className="stroke-accent-fill transition-[stroke-dashoffset] duration-700 ease-[var(--ease-out-soft)]"
          strokeDasharray={c} strokeDashoffset={c * (1 - v)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}

/** A photo inside an illustration: soft corners, a hairline of light around it and a small shadow, as a print lying on the page. */
export function PhotoFrame({ src, className = '', children }: { src: string; className?: string; children?: React.ReactNode }) {
  return (
    <span className={`relative block overflow-hidden rounded-sm bg-surface-2 shadow-e2 ring-1 ring-fg/10 ${className}`}>
      <img src={src} alt="" draggable={false} decoding="async" className="absolute inset-0 w-full h-full object-cover" />
      {children}
    </span>
  );
}

/**
 * The foot of a first-run screen: its one action (and a quieter second one)
 * in thumb reach. It sticks to the bottom of a screen that is taller than
 * the phone; what scrolls under it fades into the page. `inset`: the
 * screen's side margin (`px-step` or `px-page`, which narrow under 360 px),
 * so the foot runs edge to edge.
 */
export function Foot({ inset = 'step', children }: { inset?: 'step' | 'page'; children: React.ReactNode }) {
  const pad = `var(--spacing-${inset})`;
  return (
    <div className="sticky bottom-0 z-10 mt-auto" style={{ marginInline: `calc(-1 * ${pad})` }}>
      <div className="h-8 bg-linear-to-b from-transparent to-bg pointer-events-none" aria-hidden="true" />
      <div className="bg-bg pb-safe-8" style={{ paddingInline: pad }}>{children}</div>
    </div>
  );
}
