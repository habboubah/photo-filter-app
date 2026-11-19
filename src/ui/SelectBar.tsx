import type { ReactNode } from 'react';
import { tapLight } from './haptics';

/**
 * The line above a grid you can pick from: how many are picked (or a hint
 * while none is), then *Alle auswählen* [Select all] while not all are and
 * *Alle abwählen* [Deselect all] while any is — both at once in between.
 * The count is read out as it changes.
 */
export function SelectBar({ text, all, none, onAll, onNone, labels, tip }: {
  /** "6 ausgewählt", or the screen's hint while nothing is picked. */
  text: ReactNode;
  /** Every one is picked. */
  all: boolean;
  /** Nothing is picked. */
  none: boolean;
  onAll: () => void;
  onNone: () => void;
  labels: { all: string; none: string };
  /** A first-run tip anchored here (`data-tip`). */
  tip?: string;
}) {
  const link = 'shrink-0 min-h-[44px] px-1 text-label font-bold text-accent focus-visible:ring-focus rounded-full press';
  return (
    <div data-tip={tip} className="flex items-center gap-x-4 gap-y-0 flex-wrap px-1 pb-1">
      <p className="min-w-0 flex-1 basis-[6rem] text-label text-fg-mute wrap-prose" aria-live="polite">{text}</p>
      <div className="flex items-center gap-4 ms-auto">
        {!none && <button type="button" onClick={() => { tapLight(); onNone(); }} className={link}>{labels.none}</button>}
        {!all && <button type="button" onClick={() => { tapLight(); onAll(); }} className={link}>{labels.all}</button>}
      </div>
    </div>
  );
}

/**
 * *Auswählen* / *Fertig* [Select / Done], as in Photos: off, a tap on a photo
 * opens it; on, a tap picks it. A pill in the row above the grid (src/ui/pick.tsx),
 * not in the bar (Ahmad, 19 November 2026).
 */
export function SelectToggle({ on, onChange, labels, tip }: {
  on: boolean;
  onChange: (on: boolean) => void;
  labels: { select: string; done: string };
  /** A first-run tip anchored here (`data-tip`). */
  tip?: string;
}) {
  return (
    <button
      type="button" data-tip={tip} aria-pressed={on}
      onClick={() => { tapLight(); onChange(!on); }}
      className={`h-tap px-4 shrink-0 inline-flex items-center rounded-full text-label font-bold press focus-visible:ring-focus ${on ? 'bg-accent-dim text-accent' : 'bg-surface text-fg'}`}
    >
      {on ? labels.done : labels.select}
    </button>
  );
}
