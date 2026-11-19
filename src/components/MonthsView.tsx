import { CheckCircle2, ChevronRight, RotateCw } from 'lucide-react';
import type { Photo } from '../types';
import { Strings, bytes, fmt, num, percent, plural } from '../translations';
import { Progress } from '../ui/Controls';
import { Ring } from '../ui/FirstRun';
import { monthShare, progress, type Month } from '../logic/months';
import { Screen } from '../ui/Screen';
import { Thumb } from '../ui/Photo';
import { tapLight } from '../ui/haptics';

/** How many months are drawn at once; more come with "show more". */
const PAGE = 24;

/**
 * Month by month: every month of the library, newest first, one card per
 * row like *Chats & soziale Medien* (19 November 2026) — two rows of its
 * photos, its name, and how far into it the user is (docs/ux-research.md,
 * idea B). A tap opens the month's photos to pick from (App.tsx, an
 * AlbumView), where *Durchgehen* starts its review. A month left part-way shows its real share and *Weitermachen*, and
 * opens where it was left (AppState.monthAt); a month gone through shows its
 * check. Never a score, never a red number: the bar is how much of a month
 * was looked at, nothing more.
 */
export function MonthsView({ t, months, done, at, byId, shown, onMore, onBack, onOpen }: {
  t: Strings;
  months: Month[];
  done: Set<string>;
  /** Months left part-way: month → the time of the last photo decided (AppState.monthAt). */
  at: Record<string, number>;
  byId: Map<string, Photo>;
  shown: number;
  onMore: () => void;
  onBack: () => void;
  onOpen: (key: string) => void;
}) {
  const visible = months.slice(0, Math.max(PAGE, shown));
  const doneCount = months.filter(m => done.has(m.key)).length;
  const pct = progress(months, done);
  const pctText = fmt(t.progressDone, { pct: percent(t, pct) });
  const time = (id: string) => byId.get(id)?.t;
  return (
    <Screen
      title={t.monthsTitle} onBack={onBack} backLabel={t.back} info={{ label: t.aboutScreen, close: t.close, how: t.infoHow, body: t.monthsIntro }}
      subtitle={<span className="num">{`${pctText} · ${fmt(t.monthsDone, { done: num(t, doneCount), total: num(t, months.length) })}`}</span>}
      trailing={
        <Ring value={pct / 100} size={60} stroke={6} label={pctText}>
          <span className="text-caption font-bold text-fg num" aria-hidden="true">{percent(t, pct)}</span>
        </Ring>
      }
    >
      <div data-tip="tip.months" className="space-y-[10px]">
        {visible.map(m => (
          <MonthTile key={m.key} t={t} month={m} done={done.has(m.key)} share={monthShare(m, done.has(m.key), at[m.key], time)} byId={byId} onOpen={() => onOpen(m.key)} />
        ))}
      </div>
      {visible.length < months.length && (
        <div className="flex justify-center">
          <button type="button" onClick={() => { tapLight(); onMore(); }} className="text-label font-bold text-accent hit-44 focus-visible:ring-focus rounded-full">
            {t.showMore}
          </button>
        </div>
      )}
    </Screen>
  );
}

/**
 * One month as a card: two rows of its photos (screenshots last, spread over
 * the month), its name, what it holds, and how far into it the user is — a
 * check when done, the share and *Weitermachen* when left part-way, *Noch
 * offen* before. State is said in words too, never by colour alone.
 */
export function MonthTile({ t, month: m, done, share, byId, onOpen }: {
  t: Strings; month: Month; done: boolean; share: number; byId: Map<string, Photo>; onOpen: () => void;
}) {
  const name = new Date(m.year, m.month, 1).toLocaleDateString(t.locale, { month: 'long', year: 'numeric' });
  const camera = m.ids.filter(id => !byId.get(id)?.shot);
  const pool = [...camera, ...m.ids.filter(id => byId.get(id)?.shot)];
  const step = Math.max(1, Math.floor(camera.length / 8));
  const covers = camera.length > 8 ? Array.from({ length: 8 }, (_, i) => camera[i * step]) : pool.slice(0, 8);
  const started = !done && share > 0;
  const pctText = fmt(t.progressDone, { pct: percent(t, Math.floor(share * 100)) });
  const state = done ? t.monthDone : started ? pctText : t.monthNotStarted;
  const meta = fmt(t.monthMeta, { photos: plural(t, 'photos', m.ids.length), size: bytes(t, m.bytes) });
  return (
    <button
      type="button" onClick={() => { tapLight(); onOpen(); }}
      aria-label={`${name}, ${meta}, ${state}`}
      className="w-full rounded-md card p-[10px] text-start press focus-visible:ring-focus"
    >
      {/* Two rows of four (one when there are four or fewer). */}
      <span className="grid grid-cols-4 gap-[4px] overflow-hidden rounded-[12px]" aria-hidden="true">
        {covers.map(id => (
          <span key={id} className="block aspect-square min-w-0"><Thumb id={id} className="!rounded-[6px]" /></span>
        ))}
      </span>
      <span className="flex items-center gap-2 px-1 pt-2.5" aria-hidden="true">
        <span className="flex-1 min-w-0">
          <span className="flex items-center gap-2 flex-wrap">
            <span className="text-body font-bold text-fg">{name}</span>
            {done && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-keep text-keep-ink text-micro font-extrabold">
                <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={2.6} />{t.monthDone}
              </span>
            )}
            {started && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full glass-flat text-fg text-micro font-bold">
                <RotateCw className="w-3 h-3" strokeWidth={2.6} />{t.monthContinue}
              </span>
            )}
          </span>
          <span className="block text-caption text-fg-mute num">{done || started ? `${meta} · ${state}` : `${meta} · ${t.monthNotStarted}`}</span>
        </span>
        <ChevronRight className="w-5 h-5 text-fg-faint rtl:rotate-180" />
      </span>
      {(done || started) && <span className="block px-1 pt-2" aria-hidden="true"><Progress value={done ? 1 : share} label={state} thin /></span>}
    </button>
  );
}
