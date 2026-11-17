import type React from 'react';
import { createPortal } from 'react-dom';
import { tapLight } from './haptics';

export interface Tab<K extends string> {
  key: K;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}

/**
 * The root screens' tabs: a pill that floats above the home indicator, as the
 * system's own tab bars do since iOS 26 — opaque, with a shadow, never a blur
 * (backdrop-filter is too expensive in Android's WebView). The current tab
 * sits on a soft teal capsule. Tapping it again brings its screen to the top.
 * Pair it with `<Screen tabbed>` so the last card scrolls clear of it.
 * Portalled to <body>, like the Dock: the screen's fade would otherwise carry it.
 */
export function TabBar<K extends string>({ tabs, current, label, onChange }: {
  tabs: Tab<K>[];
  current: K;
  /** What the bar is, read out first ("Bereiche"). */
  label: string;
  onChange: (key: K) => void;
}) {
  return createPortal(
    <div className="fixed inset-x-0 bottom-0 z-20 pointer-events-none pb-tabbar flex justify-center">
      <nav aria-label={label} className="pointer-events-auto rounded-full bg-surface shadow-e2 p-[5px] flex gap-[4px]">
        {tabs.map(({ key, label: name, icon: Icon }) => {
          const on = key === current;
          return (
            <button
              key={key} type="button"
              aria-current={on ? 'page' : undefined}
              onClick={() => { tapLight(); onChange(key); }}
              className={`min-w-[104px] min-h-[52px] px-4 rounded-full inline-flex flex-col items-center justify-center gap-0.5 press focus-visible:ring-focus transition-colors duration-200 ${on ? 'bg-accent-dim text-accent' : 'text-fg-mute'}`}
            >
              <Icon className="w-[22px] h-[22px]" strokeWidth={on ? 2.3 : 2} />
              <span className="text-micro font-extrabold leading-none">{name}</span>
            </button>
          );
        })}
      </nav>
    </div>,
    document.body,
  );
}
