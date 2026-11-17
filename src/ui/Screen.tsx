import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUpRight, ChevronLeft, ChevronRight, ChevronsUpDown, Info } from 'lucide-react';
import { tapLight } from './haptics';
import { IconButton } from './Button';
import { Sheet } from './Sheet';

interface Props {
  title: string;
  /** A small line above the large title (today's date on home). */
  eyebrow?: React.ReactNode;
  subtitle?: React.ReactNode;
  onBack?: () => void;
  backLabel?: string;
  /** Header-right controls. Keep to two (with `info`). */
  actions?: React.ReactNode;
  /** What the screen is for, in a few sentences: behind an (i) in the bar, in a sheet — never a paragraph above the content. */
  info?: { label: string; close: string; body: React.ReactNode };
  /** Something shown left of the large title (a list's picture). */
  leading?: React.ReactNode;
  /** Something shown right of it (a list's progress ring). */
  trailing?: React.ReactNode;
  /** Extra bottom padding for a docked bar. */
  docked?: boolean;
  /** Extra bottom padding for the tab bar (the root screens). */
  tabbed?: boolean;
  /** The screen brings its cards in itself: no rise of the shell's own. */
  still?: boolean;
  /** Shown first, above the large title (home's app card). */
  top?: React.ReactNode;
  /** No large title on the page (home): the title is only read out and shown small in the bar once scrolled. */
  hideTitle?: boolean;
  children: React.ReactNode;
}

/**
 * Every screen's shell, the iOS 27 way: a large title that scrolls with the
 * content, and a bar that floats — back on the left, round glass buttons on
 * the right, the title appearing small in the middle once the large one has
 * scrolled away. The content passes under the bar; once it does, the scroll
 * edge effect fades it into the page (a gradient, never a blur —
 * backdrop-filter over a scrolling list is too expensive in a WebView).
 */
export function Screen({ title, eyebrow, subtitle, onBack, backLabel, actions, info, leading, trailing, docked, tabbed, still, top, hideTitle, children }: Props) {
  const [scrolled, setScrolled] = useState(false);
  const [about, setAbout] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 44);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  return (
    <div className={`relative isolate mx-auto w-full max-w-xl min-h-screen ${docked ? 'pb-safe-dock' : tabbed ? 'pb-safe-tabs' : 'pb-16'}`}>
      <header className="sticky top-0 z-30 safe-top">
        {/* Scroll edge: once content passes under the bar, it fades into the page behind the buttons and the title. */}
        <div
          aria-hidden="true"
          className={`absolute inset-x-0 top-0 -bottom-8 pointer-events-none edge-fade-top transition-opacity duration-200 ${scrolled ? 'opacity-100' : 'opacity-0'}`}
        />
        {/* Sides size to their content and the title takes what is left, so a
            wide action can never sit on top of it. */}
        <div className="relative px-[16px] min-h-[54px] grid grid-cols-[minmax(44px,auto)_minmax(0,1fr)_minmax(44px,auto)] gap-2 items-center">
          <div className="justify-self-start">
            {onBack && (
              <button
                type="button" onClick={() => { tapLight(); onBack(); }}
                title={backLabel} aria-label={backLabel}
                className="h-tap w-tap inline-flex items-center justify-center rounded-full glass text-fg press focus-visible:ring-focus"
              >
                <ChevronLeft className="w-6 h-6 -ms-0.5 rtl:rotate-180" strokeWidth={2.4} />
              </button>
            )}
          </div>
          <span
            aria-hidden="true"
            className={`min-w-0 title-face text-chrome-title font-semibold text-fg text-center truncate transition-opacity duration-200 ${scrolled ? 'opacity-100' : 'opacity-0'}`}
          >
            {title}
          </span>
          <div className="justify-self-end flex items-center gap-2">
            {info && <IconButton label={info.label} icon={Info} tone="bar" onClick={() => setAbout(true)} />}
            {actions}
          </div>
        </div>
      </header>

      {top && <div className="px-[16px] pt-1 pb-5">{top}</div>}

      {/* Margins in px, as iOS keeps its layout margins when text grows (1rem = 16px at the default size). */}
      {hideTitle ? <h1 className="sr-only">{title}</h1> : (
      <div className="px-[20px] pt-0.5 pb-4 flex items-center gap-4">
        {leading}
        <div className="min-w-0 flex-1">
          {eyebrow && <p className="eyebrow text-fg-mute mb-0.5">{eyebrow}</p>}
          <h1 className="title-face text-title font-bold text-fg wrap-compound">{title}</h1>
          {subtitle && <div className="text-label font-semibold text-fg-mute wrap-prose mt-0.5 num">{subtitle}</div>}
        </div>
        {trailing}
      </div>
      )}

      {/* Its cards rise into place one after another as the screen appears (index.css: rise-children). */}
      <main className={`px-[16px] space-y-6 ${still ? '' : 'rise-children'}`}>{children}</main>

      {info && (
        <Sheet open={about} title={title} closeLabel={info.close} onClose={() => setAbout(false)}>
          <p className="text-body text-fg wrap-prose pb-2">{info.body}</p>
        </Sheet>
      )}
    </div>
  );
}

/** A section's heading on a page: Figtree, bold; an optional link at the end ("Alle Reisen"). */
export function SectionHead({ id, title, action }: { id?: string; title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 px-1 pb-2.5">
      <h2 id={id} className="title-face text-title2 font-bold text-fg wrap-compound">{title}</h2>
      {action}
    </div>
  );
}

/** A grouped card of rows (an iOS inset grouped section). */
export function Group({ title, footer, children }: { title?: string; footer?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      {title && <h2 className="px-[20px] pb-2 title-face text-label font-semibold text-fg-mute wrap-compound">{title}</h2>}
      <div className="rounded-md card overflow-hidden divide-hairline-inset">{children}</div>
      {footer && <p className="px-[16px] pt-2 text-caption text-fg-mute wrap-prose">{footer}</p>}
    </section>
  );
}

/** Where the hairline under a row starts: past its leading picture (an icon tile by default; `lead` for a larger one). */
const sepOf = (leading: unknown, lead = 30) => ({ '--sep': leading ? `${16 + lead + 14}px` : '1rem' } as React.CSSProperties);

/** One row in a Group. A button when `onClick` is set. */
export function Row({ label, sub, leading, trailing, onClick, ariaLabel, danger, lead }: {
  label: React.ReactNode;
  sub?: React.ReactNode;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  onClick?: () => void;
  ariaLabel?: string;
  danger?: boolean;
  /** The leading picture's width in px, when it is not a 30 px icon tile. */
  lead?: number;
}) {
  const sep = sepOf(leading, lead);
  const body = (
    <>
      {leading}
      <span className="min-w-0 flex-1 text-start">
        <span className={`block text-body wrap-compound ${danger ? 'text-neg font-semibold' : 'text-fg'}`}>{label}</span>
        {sub && <span className="block text-caption text-fg-mute mt-0.5 wrap-compound">{sub}</span>}
      </span>
      {trailing}
    </>
  );
  const shell = 'relative w-full min-h-[54px] px-[16px] py-2.5 flex items-center gap-[14px]';
  if (!onClick) return <div className={shell} style={sep}>{body}</div>;
  return (
    <button
      type="button" onClick={() => { tapLight(); onClick(); }} aria-label={ariaLabel} style={sep}
      className={`${shell} transition-colors active:bg-surface-2 focus-visible:ring-focus`}
    >
      {body}
    </button>
  );
}

/**
 * A row in a Group that picks one of a few values, as iOS Settings' pop-up
 * rows: the label, then the choice and ⌃⌄ at the end. The system's own
 * picker opens on a tap anywhere on the row — a native select lies invisibly
 * over it, so VoiceOver reads one pop-up button with its value.
 */
export function MenuRow<V extends string>({ label, leading, value, options, onChange }: {
  label: string;
  leading?: React.ReactNode;
  value: V;
  options: { value: V; label: string }[];
  onChange: (value: V) => void;
}) {
  return (
    <label className="relative w-full min-h-[54px] px-[16px] py-2.5 flex items-center gap-[14px] transition-colors active:bg-surface-2 focus-within:ring-focus" style={sepOf(leading)}>
      {leading}
      {/* Side by side while both fit; with large text the choice moves under the label. */}
      <span className="min-w-0 flex-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
        <span className="min-w-0 max-w-full text-body text-fg wrap-compound">{label}</span>
        <span className="ms-auto min-w-0 max-w-full inline-flex items-center gap-1 text-body text-fg-mute" aria-hidden="true">
          <span className="min-w-0 wrap-compound">{options.find(o => o.value === value)?.label}</span>
          <ChevronsUpDown className="w-4 h-4 shrink-0" strokeWidth={2.4} />
        </span>
      </span>
      {/* 17px: WebKit zooms the page into a focused control under 16px. */}
      <select
        aria-label={label}
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
 * The coloured squircle in front of a settings row, as in iOS Settings: a
 * white symbol on one of the list hues, so a row is found by its colour.
 */
export function IconTile({ icon: Icon, hue }: { icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; hue: string }) {
  return (
    <span data-hue={hue} aria-hidden="true" className="w-[30px] h-[30px] rounded-[9px] bg-hue-solid text-on-color inline-flex items-center justify-center shrink-0 sheen !shadow-none">
      <Icon className="w-[18px] h-[18px]" strokeWidth={2.3} />
    </span>
  );
}

/** A row's end when it pushes a screen: a value (a count) in a soft pill, then ›. */
export function Next({ value }: { value?: React.ReactNode }) {
  return (
    <span className="shrink-0 flex items-center gap-1.5 text-fg-mute">
      {value !== undefined && (
        <span className="min-w-[1.75rem] min-h-[1.5rem] px-2 rounded-full bg-surface-2 text-fg-mute inline-flex items-center justify-center text-caption font-bold tabular-nums">{value}</span>
      )}
      <ChevronRight className="w-5 h-5 text-fg-faint rtl:rotate-180" aria-hidden="true" />
    </span>
  );
}

/** A row's end when it opens something outside the app (the store, Mail, the browser): ↗. */
export function Away() {
  return <ArrowUpRight className="shrink-0 w-5 h-5 text-fg-faint rtl:-scale-x-100" aria-hidden="true" />;
}

/**
 * Empty state: what is missing, and the action that fixes it. Without an
 * emoji of its own it shows the app's bag — the one face of the app.
 */
export function Empty({ emoji, title, body, action }: { emoji?: string; title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="px-6 py-12 text-center">
      {emoji
        ? <div className="emoji text-[64px] mb-4" aria-hidden="true">{emoji}</div>
        : <img src="/icon.png" alt="" className="w-[104px] h-[104px] rounded-lg mx-auto mb-5" draggable={false} />}
      <p className="title-face text-heading font-bold text-fg wrap-compound">{title}</p>
      {body && <p className="text-label text-fg-mute mt-2 wrap-prose max-w-xs mx-auto">{body}</p>}
      {action && <div className="mt-6 flex justify-center">{action}</div>}
    </div>
  );
}

/**
 * A row whose body opens something and which also carries its own buttons
 * (edit, delete). The body and the buttons are siblings, never nested — a
 * button inside a button is invalid and unreachable for VoiceOver.
 */
export function ActionRow({ label, sub, leading, onClick, ariaLabel, actions, lead }: {
  label: React.ReactNode;
  sub?: React.ReactNode;
  leading?: React.ReactNode;
  onClick: () => void;
  ariaLabel?: string;
  actions: React.ReactNode;
  /** The leading picture's width in px, when it is not a 32 px icon tile. */
  lead?: number;
}) {
  return (
    <div className="relative w-full min-h-[54px] flex items-center pe-1" style={sepOf(leading, lead)}>
      <button
        type="button" onClick={() => { tapLight(); onClick(); }} aria-label={ariaLabel}
        className="flex-1 min-w-0 self-stretch px-[16px] py-2.5 flex items-center gap-[14px] text-start transition-colors active:bg-surface-2 focus-visible:ring-focus"
      >
        {leading}
        <span className="min-w-0 flex-1">
          <span className="block text-body text-fg wrap-compound">{label}</span>
          {sub && <span className="block text-caption text-fg-mute mt-0.5 wrap-compound">{sub}</span>}
        </span>
      </button>
      <span className="shrink-0 flex items-center">{actions}</span>
    </div>
  );
}

/**
 * The one primary action of a screen, pinned above the home indicator in
 * thumb reach. Pair it with `<Screen docked>` so the last row can scroll
 * clear of it. Portalled to <body>: the screen's slide-in transform would
 * otherwise capture `position: fixed` and carry the bar along with it.
 */
export function Dock({ children }: { children: React.ReactNode }) {
  return createPortal(
    <div className="fixed inset-x-0 bottom-0 z-20 pointer-events-none">
      <div className="mx-auto w-full max-w-xl px-[16px] pt-10 pb-dock dock-fade">
        <div className="pointer-events-auto">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
