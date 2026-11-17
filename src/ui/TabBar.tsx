import type React from 'react';
import { createPortal } from 'react-dom';
import { tapLight } from './haptics';

export interface Tab<K extends string> {
  key: K;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}

/**
 * The root screens' tabs: a glass capsule that floats above the home
 * indicator, as the system's own tab bars do since iOS 26 — drawn glass, never
 * a blur (backdrop-filter is too expensive in Android's WebView). The current
 * tab sits in a lens of the same glass, in the accent. Tapping it again brings
 * its screen to the top.
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
    <div className="fixed inset-x-0 bottom-0 z-20 pointer-events-none">
      {/* The scroll edge under the bar: the content fades into the page instead of showing through. */}
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-[118px] dock-fade" />
      <div className="relative pb-tabbar flex justify-center">
      <nav aria-label={label} className="pointer-events-auto rounded-full glass p-[4px] flex gap-[2px]">
        {tabs.map(({ key, label: name, icon: Icon }) => {
          const on = key === current;
          return (
            <button
              key={key} type="button"
              aria-current={on ? 'page' : undefined}
              onClick={() => { tapLight(); onChange(key); }}
              className={`min-w-[108px] min-h-[54px] px-5 rounded-full inline-flex flex-col items-center justify-center gap-[3px] press focus-visible:ring-focus transition-colors duration-200 ${on ? 'glass-flat text-accent' : 'text-fg'}`}
            >
              <Icon className="w-[23px] h-[23px]" strokeWidth={on ? 2.3 : 1.9} />
              <span className="text-micro font-semibold leading-none">{name}</span>
            </button>
          );
        })}
      </nav>
      </div>
    </div>,
    document.body,
  );
}
