import type React from 'react';
import { CheckCircle2, ChevronRight } from 'lucide-react';
import type { Photo } from '../types';
import { Strings, bytes, fmt, num, percent, plural } from '../translations';
import { Progress } from '../ui/Controls';
import { progress, type Month } from '../logic/months';
import { Screen } from '../ui/Screen';
import { Thumb } from '../ui/Photo';
import { tapLight } from '../ui/haptics';

/** How many months are drawn at once; more come with "show more". */
const PAGE = 24;

/** Month by month: every month of the library, newest first, the ones gone through marked as done. */
export function MonthsView({ t, months, done, byId, shown, onMore, onBack, onOpen }: {
  t: Strings;
  months: Month[];
  done: Set<string>;
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
  const name = (m: Month) => new Date(m.year, m.month, 1).toLocaleDateString(t.locale, { month: 'long', year: 'numeric' });
  return (
    <Screen
      title={t.monthsTitle} onBack={onBack} backLabel={t.back}
      subtitle={<>
        <span className="num">{`${pctText} · ${fmt(t.monthsDone, { done: num(t, doneCount), total: num(t, months.length) })}`}</span>
        <span className="block mt-2 max-w-[220px]"><Progress thin value={pct / 100} label={pctText} /></span>
      </>}
    >
      <p className="text-label text-fg-mute px-1 -mt-2 wrap-prose">{t.monthsIntro}</p>
      <div className="rounded-md card overflow-hidden divide-hairline-inset">
        {visible.map(m => {
          const isDone = done.has(m.key);
          const cover = m.ids.find(id => !byId.get(id)?.shot) ?? m.ids[0];
          return (
            <button
              key={m.key} type="button" onClick={() => { tapLight(); onOpen(m.key); }}
              aria-label={`${name(m)}, ${plural(t, 'photos', m.ids.length)}${isDone ? `, ${t.monthDone}` : ''}`}
              style={{ '--sep': '76px' } as React.CSSProperties}
              className="relative w-full min-h-[64px] px-[16px] py-2.5 flex items-center gap-[12px] text-start transition-colors active:bg-surface-2 focus-visible:ring-focus"
            >
              <span className="w-12 h-12 shrink-0 rounded-[10px] overflow-hidden"><Thumb id={cover} className="!rounded-none" /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-body font-bold text-fg wrap-compound">{name(m)}</span>
                <span className="block text-caption text-fg-mute num">{fmt(t.monthMeta, { photos: plural(t, 'photos', m.ids.length), size: bytes(t, m.bytes) })}</span>
              </span>
              {isDone && (
                <span className="shrink-0 inline-flex items-center gap-1 text-caption font-bold text-keep">
                  <CheckCircle2 className="w-4 h-4" aria-hidden="true" />{t.monthDone}
                </span>
              )}
              <ChevronRight className="w-5 h-5 text-fg-faint shrink-0 rtl:rotate-180" aria-hidden="true" />
            </button>
          );
        })}
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
