import { motion } from 'motion/react';
import { Archive, Check, ChevronRight } from 'lucide-react';
import { Strings, bytes, plural } from '../translations';
import { Sheet } from '../ui/Sheet';
import { Button } from '../ui/Button';
import { Thumb } from '../ui/Photo';
import { SETTLE } from '../ui/FirstRun';
import { tapLight } from '../ui/haptics';

/** What the first task did: the group's others put aside, or all of it kept. */
export interface TaskDone {
  kind: 'aside' | 'kept';
  /** The photo that stays (the user's choice or the app's suggestion). */
  keep: string;
  /** Put aside ("aside") or newly kept ("kept"): what undo takes back. */
  ids: string[];
  bytes: number;
}

/** The one next step the sheet offers: the next group, or home's own next step. */
export interface TaskNext { title: string; meta?: string; button: string; go: () => void }

/**
 * After the first group (docs/ux-research.md, idea A): one sheet that says
 * what just happened in words — what stays, what waits in *Zum Löschen
 * vorgemerkt*, that nothing is deleted until the user confirms it there —
 * shows it (the photos that were put aside move into the tray, the one that
 * stays keeps its green check), offers undo, and ONE next step. Shown once;
 * from the second group on, a toast with undo says the same.
 */
export function FirstTaskSheet({ t, done, next, onUndo, onOpenBin, onClose }: {
  t: Strings;
  done: TaskDone | null;
  next: TaskNext | null;
  onUndo: () => void;
  onOpenBin: () => void;
  onClose: () => void;
}) {
  if (!done) return null;
  const aside = done.kind === 'aside';
  const shown = done.ids.slice(0, 3);
  return (
    <Sheet open title={aside ? t.taskAsideTitle : t.taskKeptTitle} closeLabel={t.close} onClose={onClose}>
      {/* Where everything went: the photo that stays on the start side, what was put aside in the tray. */}
      <div className="flex items-stretch gap-3">
        <div className="w-[34%] shrink-0" aria-hidden="true">
          <span className="relative block aspect-[3/4] rounded-[14px] overflow-hidden bg-surface-2">
            <Thumb id={done.keep} className="!rounded-none" />
            <span className="absolute top-1.5 start-1.5 w-7 h-7 rounded-full bg-keep text-keep-ink ring-2 ring-on-color inline-flex items-center justify-center">
              <Check className="w-4 h-4" strokeWidth={3.2} />
            </span>
          </span>
          <span className="mt-1.5 flex items-center gap-1 text-caption font-bold text-keep"><Check className="w-3.5 h-3.5" strokeWidth={3} />{t.groupKeeps}</span>
        </div>
        {aside ? (
          <button
            type="button" onClick={() => { tapLight(); onOpenBin(); }}
            className="min-w-0 flex-1 rounded-[14px] glass-flat p-3 flex flex-col text-start press focus-visible:ring-focus"
            aria-label={`${t.binTitle}, ${plural(t, 'photos', done.ids.length)}. ${t.taskOpenBin}`}
          >
            <span className="relative block w-full aspect-[5/3]" aria-hidden="true">
              {shown.map((id, i) => (
                <motion.span
                  key={id}
                  className="absolute top-0 w-[58%] aspect-square rounded-[10px] overflow-hidden shadow-e2 ring-2 ring-surface"
                  style={{ insetInlineStart: `${i * 18}%` }}
                  initial={{ x: -80, opacity: 0, rotate: 0 }}
                  animate={{ x: 0, opacity: 1, rotate: (i - 1) * 5 }}
                  transition={{ ...SETTLE, duration: 0.55, delay: 0.15 + i * 0.08 }}
                >
                  <Thumb id={id} className="!rounded-none" />
                </motion.span>
              ))}
            </span>
            <span className="mt-2 flex items-center gap-1.5 text-label font-bold text-fg" aria-hidden="true">
              <Archive className="w-4 h-4 shrink-0" strokeWidth={2.4} />
              <span className="min-w-0 flex-1 wrap-prose">{t.binTitle}</span>
              <ChevronRight className="w-4 h-4 shrink-0 text-fg-faint rtl:rotate-180" />
            </span>
            <span className="text-caption text-fg-mute num" aria-hidden="true">{`${plural(t, 'photos', done.ids.length)} · ${bytes(t, done.bytes)}`}</span>
          </button>
        ) : (
          <div className="min-w-0 flex-1 rounded-[14px] glass-flat p-3 grid grid-cols-2 gap-1.5 content-start" aria-hidden="true">
            {shown.map(id => (
              <span key={id} className="relative block aspect-square rounded-[10px] overflow-hidden">
                <Thumb id={id} className="!rounded-none" />
                <span className="absolute top-1 start-1 w-5 h-5 rounded-full glass text-fg inline-flex items-center justify-center"><Check className="w-3 h-3" strokeWidth={3.2} /></span>
              </span>
            ))}
          </div>
        )}
      </div>

      <p className="mt-4 text-body text-fg wrap-prose">
        {aside ? t.taskAsideBody : t.taskKeptBody}
      </p>

      {next && (
        <div className="mt-5 rounded-md bg-surface-2 p-4">
          <p className="eyebrow text-fg-mute">{t.taskNext}</p>
          <p className="text-body font-bold text-fg mt-0.5 wrap-compound">{next.title}</p>
          {next.meta && <p className="text-caption text-fg-mute num wrap-prose">{next.meta}</p>}
        </div>
      )}
      <div className="mt-4 grid gap-1">
        {next
          ? <Button full size="lg" onClick={() => { onClose(); next.go(); }}>{next.button}</Button>
          : <Button full size="lg" onClick={onClose}>{t.done}</Button>}
        <Button full variant="ghost" onClick={() => { onUndo(); onClose(); }}>{t.undo}</Button>
      </div>
    </Sheet>
  );
}
