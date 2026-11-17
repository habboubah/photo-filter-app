import { useEffect } from 'react';
import { Star } from 'lucide-react';
import type { Group, Photo } from '../types';
import type { Detail, Verdict } from '../logic/confidence';
import { Strings, bytes, fmt, plural } from '../translations';
import { Dock, Screen } from '../ui/Screen';
import { Button } from '../ui/Button';
import { Thumb } from '../ui/Photo';
import { LARGE } from '../thumbs';
import { tapLight } from '../ui/haptics';

/**
 * One similar group: the photo that will be kept, large, and the series
 * under it. A tap on another photo keeps that one instead. "Delete the
 * others" goes straight to the system's dialog; "Go through" reviews them
 * one by one; "Keep all" keeps every photo and settles the group, so it is
 * not suggested again (with undo).
 */
export function GroupView({ t, group, byId, kept, verdicts, debug, onBack, onPick, onReview, onDeleteOthers, onKeepAll, onScoreFaces }: {
  t: Strings;
  group: Group;
  byId: Map<string, Photo>;
  kept: Set<string>;
  /** Each other photo's verdict against the best one (src/logic/confidence.ts): a short reason on its tile. */
  verdicts: Map<string, Verdict>;
  debug: boolean;
  onBack: () => void;
  onPick: (id: string) => void;
  onReview: () => void;
  onDeleteOthers: (ids: string[]) => void;
  /** "Alle behalten": every photo of the group is kept, and the group is not suggested again. */
  onKeepAll: () => void;
  onScoreFaces: (ids: string[]) => void;
}) {
  // Faces (and on the iPhone open eyes) refine the pick; asked for once per group.
  useEffect(() => { onScoreFaces(group.ids); }, [group.key]); // eslint-disable-line react-hooks/exhaustive-deps

  const best = byId.get(group.best);
  const others = group.ids.filter(id => id !== group.best && !kept.has(id) && !byId.get(id)?.fav);
  const othersBytes = others.reduce((s, id) => s + (byId.get(id)?.bytes ?? 0), 0);
  const when = (id: string) => new Date(byId.get(id)?.t ?? 0).toLocaleString(t.locale, { dateStyle: 'medium', timeStyle: 'medium' });
  const short: Partial<Record<Detail, string>> = {
    blurrier: t.chipBlurrier, eyesClosed: t.detailEyesClosed, worseLight: t.detailWorseLight,
    exactCopy: t.chipCopy, smallerCopy: t.chipCopy, alteredCopy: t.chipCopy, burstExtra: t.chipBurst,
  };

  return (
    <Screen title={group.kind === 'duplicate' ? t.duplicatesTitle : group.kind === 'lookalike' ? t.lookalikeTitle : t.similarTitle} subtitle={plural(t, 'photos', group.ids.length)} onBack={onBack} backLabel={t.back} docked>
      <figure className="relative rounded-lg overflow-hidden card">
        <div className="aspect-[4/3]"><Thumb id={group.best} size={LARGE} alt={when(group.best)} className="!rounded-none" /></div>
        <figcaption className="absolute top-3 start-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-keep text-keep-ink text-caption font-extrabold">
          <Star className="w-3.5 h-3.5" fill="currentColor" strokeWidth={0} aria-hidden="true" />
          {group.best !== group.suggested ? t.bestPicked : group.kind === 'duplicate' ? t.originalBadge : group.kind === 'lookalike' ? t.bestTakeBadge : t.bestBadge}
        </figcaption>
        {debug && best && (
          <span className="absolute bottom-3 end-3 px-2 py-1 rounded-full bg-veil text-on-color text-micro font-bold num">
            {fmt(t.sharpnessDebug, { s: best.sharp ?? '–', c: best.contrast ?? '–' })}
          </span>
        )}
      </figure>

      <p className="text-label text-fg-mute px-1 wrap-prose">{t.pickHint}</p>

      <div className="grid grid-cols-3 gap-[6px]">
        {group.ids.map(id => {
          const isBest = id === group.best;
          const v = isBest ? undefined : verdicts.get(id);
          const tag = v?.detail ? short[v.detail] : undefined;
          return (
            <button
              key={id} type="button" aria-pressed={isBest}
              aria-label={[fmt(t.makeBest, { date: when(id) }), tag, v?.trust === 'check' ? t.trustCheck : undefined].filter(Boolean).join('. ')}
              onClick={() => { tapLight(); onPick(id); }}
              className={`relative aspect-square rounded-[10px] overflow-hidden press focus-visible:ring-focus ${isBest ? 'ring-[3px] ring-keep ring-offset-2 ring-offset-bg' : ''}`}
            >
              <Thumb id={id} className="!rounded-none" />
              {isBest && (
                <span className="absolute top-1.5 start-1.5 w-6 h-6 rounded-full bg-keep text-keep-ink inline-flex items-center justify-center" aria-hidden="true">
                  <Star className="w-3.5 h-3.5" fill="currentColor" strokeWidth={0} />
                </span>
              )}
              {(tag || v?.trust === 'check') && (
                <span className="absolute bottom-1.5 start-1.5 end-1.5 flex" aria-hidden="true">
                  <span className="max-w-full inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-veil text-on-color text-micro font-bold">
                    {v?.trust === 'check' && <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-warn" />}
                    <span className="truncate">{tag ?? t.trustCheck}</span>
                  </span>
                </span>
              )}
            </button>
          );
        })}
      </div>

      <Dock>
        <div className="grid gap-1">
          <Button full size="lg" variant="danger" disabled={!others.length} onClick={() => onDeleteOthers(others)}>
            {others.length ? `${t.deleteOthers} · ${bytes(t, othersBytes)}` : t.deleteOthers}
          </Button>
          <div className="grid grid-cols-2 gap-1">
            <Button full variant="ghost" onClick={onReview}>{t.reviewGroup}</Button>
            <Button full variant="ghost" onClick={onKeepAll}>{t.keepAll}</Button>
          </div>
        </div>
      </Dock>
    </Screen>
  );
}
