import { CheckCircle2, RotateCw } from 'lucide-react';
import type { Photo } from '../types';
import { Strings, bytes, fmt, num, percent, plural } from '../translations';
import { Progress } from '../ui/Controls';
import { Ring } from '../ui/FirstRun';
import { monthShare, progress, type Month } from '../logic/months';
import { Screen } from '../ui/Screen';
import { Thumb } from '../ui/Photo';
import { LARGE } from '../thumbs';
import { tapLight } from '../ui/haptics';

/** How many months are drawn at once; more come with "show more". */
const PAGE = 24;

/**
 * Month by month: every month of the library, newest first, as a tile — its
 * cover, its name, and how far into it the user is (docs/ux-research.md,
 * idea B). A month left part-way shows its real share and *Weitermachen*, and
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
      <div data-tip="tip.months" className="grid grid-cols-2 gap-x-3 gap-y-5">
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
 * One month at a glance: its cover (the first photo that is no screenshot),
 * its name on the photo's shade, what it holds, and how far into it the user
 * is — a check when done, the share and *Weitermachen* when left part-way,
 * *Noch offen* before. State is said in words too, never by colour alone.
 */
export function MonthTile({ t, month: m, done, share, byId, onOpen }: {
  t: Strings; month: Month; done: boolean; share: number; byId: Map<string, Photo>; onOpen: () => void;
}) {
  const name = new Date(m.year, m.month, 1).toLocaleDateString(t.locale, { month: 'long', year: 'numeric' });
  const cover = m.ids.find(id => !byId.get(id)?.shot && !byId.get(id)?.video) ?? m.ids[0];
  const started = !done && share > 0;
  const pctText = fmt(t.progressDone, { pct: percent(t, Math.floor(share * 100)) });
  const state = done ? t.monthDone : started ? pctText : t.monthNotStarted;
  return (
    <button
      type="button" onClick={() => { tapLight(); onOpen(); }}
      aria-label={`${name}, ${plural(t, 'photos', m.ids.length)}, ${state}`}
      className="block text-start rounded-md press focus-visible:ring-focus"
    >
      <span className="relative block aspect-[4/3] rounded-md overflow-hidden bg-surface-2" aria-hidden="true">
        {cover && <Thumb id={cover} size={LARGE} className="!rounded-none" />}
        <span className="absolute inset-0 photo-shade" />
        <span className="absolute inset-x-0 bottom-0 px-3 pb-2.5 title-face text-label font-bold text-on-color wrap-compound">{name}</span>
        {done && (
          <span className="absolute top-2 end-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-keep text-keep-ink text-micro font-extrabold">
            <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={2.6} />{t.monthDone}
          </span>
        )}
        {started && (
          <span className="absolute top-2 end-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full glass text-fg text-micro font-bold">
            <RotateCw className="w-3 h-3" strokeWidth={2.6} />{t.monthContinue}
          </span>
        )}
      </span>
      <span className="block px-1 pt-2 text-caption text-fg-mute num" aria-hidden="true">{fmt(t.monthMeta, { photos: plural(t, 'photos', m.ids.length), size: bytes(t, m.bytes) })}</span>
      <span className="block px-1 pt-1.5" aria-hidden="true">
        {done || started
          ? <Progress value={done ? 1 : share} label={state} thin />
          : <span className="block text-caption text-fg-mute">{t.monthNotStarted}</span>}
      </span>
      {started && <span className="block px-1 pt-1 text-caption font-semibold text-fg num" aria-hidden="true">{pctText}</span>}
    </button>
  );
}
