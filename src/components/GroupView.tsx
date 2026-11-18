import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Archive, Check, ChevronLeft, ChevronRight, Play, Shield, Sparkles } from 'lucide-react';
import type { Group, Photo } from '../types';
import type { Detail, Verdict } from '../logic/confidence';
import { type KeeperWhy, keeperWhy } from '../logic/explain';
import { Strings, bytes, fmt, num, plural } from '../translations';
import { Dock, Screen } from '../ui/Screen';
import { Button } from '../ui/Button';
import { Thumb } from '../ui/Photo';
import { LARGE } from '../thumbs';
import { tapLight } from '../ui/haptics';
import { PlayOver, usePlayer } from '../ui/play';

/**
 * One group of near-identical shots (or copies), built for comparing: the
 * photo you look at, large and uncropped, and the whole series under it. A
 * tap on a tile only looks at that photo; "Keep this one" makes it the one
 * to keep. What the app suggests ("App suggests") and what you chose ("Your
 * choice" / "Stays") are marked apart, so a different favourite is never a
 * guess. Why the app suggests its photo, and what is worse about another,
 * is said in plain words — only where the facts carry it (src/logic/explain.ts,
 * src/logic/confidence.ts). "Set the others aside" puts them into
 * "Zum Löschen vorgemerkt" (nothing is deleted); "Go through" reviews them one by one;
 * "Keep all" settles the group (with undo).
 */
export function GroupView({ t, group, byId, kept, verdicts, debug, onBack, onPick, onReview, onDeleteOthers, onKeepAll, onScoreFaces }: {
  t: Strings;
  group: Group;
  byId: Map<string, Photo>;
  kept: Set<string>;
  /** Each other photo's verdict against the one kept (src/logic/confidence.ts): what is worse about it. */
  verdicts: Map<string, Verdict>;
  debug: boolean;
  onBack: () => void;
  onPick: (id: string) => void;
  onReview: () => void;
  /** The others into "Zum Löschen vorgemerkt" (src/logic/bin.ts): nothing is deleted here. */
  onDeleteOthers: (ids: string[]) => void;
  /** "Alle behalten": every photo of the group is kept, and the group is not suggested again. */
  onKeepAll: () => void;
  onScoreFaces: (ids: string[]) => void;
}) {
  // Faces (and on the iPhone open eyes) refine the pick; asked for once per group.
  useEffect(() => { onScoreFaces(group.ids); }, [group.key]); // eslint-disable-line react-hooks/exhaustive-deps

  const player = usePlayer();
  const [looking, setLooking] = useState(group.best);
  const focus = group.ids.includes(looking) ? looking : group.best;
  const at = group.ids.indexOf(focus);
  const move = (by: number) => {
    const next = group.ids[(at + by + group.ids.length) % group.ids.length];
    tapLight();
    setLooking(next);
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (e.key === 'ArrowRight') move(1);
      else if (e.key === 'ArrowLeft') move(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const videos = group.kind === 'lookalike';
  const unit = videos ? 'videos' : 'photos';
  const fate = (id: string): 'keeps' | 'safe' | 'goes' => (id === group.best ? 'keeps' : kept.has(id) || byId.get(id)?.fav ? 'safe' : 'goes');
  const others = group.ids.filter(id => fate(id) === 'goes');
  const othersBytes = others.reduce((s, id) => s + (byId.get(id)?.bytes ?? 0), 0);
  const changed = group.best !== group.suggested;
  const photo = byId.get(focus);
  // The viewer takes the photo's own shape (between 3:4 and 3:2), so no space goes to bars around it.
  const ratio = photo && photo.w > 0 && photo.h > 0 ? Math.max(0.75, Math.min(1.5, photo.w / photo.h)) : 1;
  const tiles = useRef<Record<string, HTMLButtonElement | null>>({});
  useEffect(() => { tiles.current[focus]?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' }); }, [focus]);
  const when = (id: string) => new Date(byId.get(id)?.t ?? 0).toLocaleString(t.locale, { dateStyle: 'medium', timeStyle: 'medium' });

  // Why the app suggests its photo — named only where one fact clearly decided.
  const members = group.ids.map(id => byId.get(id)).filter((p): p is Photo => !!p);
  const suggested = byId.get(group.suggested);
  const why: Record<KeeperWhy, string> = {
    favourite: t.whyFavourite, protected: t.whyProtected, burstPick: t.whyBurstPick, edited: t.whyEdited, place: t.whyPlace,
    largest: t.whyLargest, sharpest: t.whySharpest, original: t.whyOriginal, balance: t.whyBalance, bestTake: t.whyBestTake,
  };
  const keeperLine = suggested ? why[keeperWhy(group.kind, suggested, members, kept.has(suggested.id))] : '';
  const details: Record<Detail, string> = {
    exactCopy: t.detailExactCopy, smallerCopy: t.detailSmallerCopy, alteredCopy: t.detailAlteredCopy, burstExtra: t.detailBurstExtra,
    blurrier: t.detailBlurrier, eyesClosed: t.detailEyesClosed, worseLight: t.detailWorseLight, nearlySame: t.detailNearlySame,
  };
  const short: Partial<Record<Detail, string>> = {
    blurrier: t.chipBlurrier, eyesClosed: t.detailEyesClosed, worseLight: t.detailWorseLight,
    exactCopy: t.chipCopy, smallerCopy: t.chipCopy, alteredCopy: t.chipCopy, burstExtra: t.chipBurst,
  };
  const verdict = focus !== group.best ? verdicts.get(focus) : undefined;
  const reason = focus === group.suggested
    ? fmt(t.groupWhy, { why: keeperLine })
    : [verdict?.detail ? details[verdict.detail] : null, verdict?.trust === 'check' ? t.trustCheck : null].filter(Boolean).join(' · ');
  const state = (id: string) => [
    fate(id) === 'keeps' ? (changed ? t.groupYourChoice : t.groupKeeps) : fate(id) === 'safe' ? t.groupAlsoKept : t.groupGoes,
    id === group.suggested && changed ? t.groupSuggested : null,
  ].filter(Boolean).join(', ');

  return (
    <Screen
      title={group.kind === 'duplicate' ? t.duplicatesTitle : videos ? t.lookalikeTitle : t.similarTitle}
      subtitle={plural(t, unit, group.ids.length)} onBack={onBack} backLabel={t.back} docked
    >
      {/* The photo looked at: large and uncropped, so the differences show. Swipe or the arrows for the next. */}
      <figure className="space-y-3">
        <div className="relative rounded-lg overflow-hidden bg-surface-2">
          <motion.div
            key={focus}
            drag={group.ids.length > 1 ? 'x' : false} dragSnapToOrigin dragElastic={0.25}
            onDragEnd={(_, info) => { if (info.offset.x < -60) move(1); else if (info.offset.x > 60) move(-1); }}
            initial={{ opacity: 0.4 }} animate={{ opacity: 1 }} transition={{ duration: 0.18 }}
            style={{ aspectRatio: ratio }}
            className="max-h-[56vh] w-full mx-auto touch-pan-y"
          >
            <Thumb id={focus} size={LARGE} alt={`${when(focus)}. ${state(focus)}`} className="!rounded-none !object-contain !bg-transparent" />
          </motion.div>
          <PlayOver id={focus} />
          <div className="absolute top-3 start-3 end-3 flex flex-wrap gap-1.5 pointer-events-none" aria-hidden="true">
            {fate(focus) === 'keeps' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-keep text-keep-ink text-caption font-extrabold">
                <Check className="w-3.5 h-3.5" strokeWidth={3.2} />{changed ? t.groupYourChoice : t.groupKeeps}
              </span>
            )}
            {fate(focus) === 'safe' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full glass text-fg text-caption font-bold">
                <Shield className="w-3.5 h-3.5" strokeWidth={2.6} />{t.groupAlsoKept}
              </span>
            )}
            {focus === group.suggested && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full glass text-fg text-caption font-bold">
                <Sparkles className="w-3.5 h-3.5" strokeWidth={2.4} />{t.groupSuggested}
              </span>
            )}
          </div>
          {group.ids.length > 1 && (
            <>
              <button type="button" aria-label={t.groupPrevious} onClick={() => move(-1)}
                className="absolute start-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full glass text-fg inline-flex items-center justify-center press focus-visible:ring-focus">
                <ChevronLeft className="w-6 h-6 rtl:rotate-180" strokeWidth={2.4} aria-hidden="true" />
              </button>
              <button type="button" aria-label={t.groupNext} onClick={() => move(1)}
                className="absolute end-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full glass text-fg inline-flex items-center justify-center press focus-visible:ring-focus">
                <ChevronRight className="w-6 h-6 rtl:rotate-180" strokeWidth={2.4} aria-hidden="true" />
              </button>
              <span className="absolute bottom-3 end-3 px-2.5 py-1 rounded-full bg-veil text-on-color text-caption font-bold num" aria-hidden="true">
                {`${num(t, at + 1)} / ${num(t, group.ids.length)}`}
              </span>
            </>
          )}
          {debug && photo && (
            <span className="absolute bottom-3 start-3 px-2 py-1 rounded-full bg-veil text-on-color text-micro font-bold num">
              {fmt(t.sharpnessDebug, { s: photo.sharp ?? '–', c: photo.contrast ?? '–' })}
            </span>
          )}
        </div>

        {/* The series as a strip under the photo: a tap looks at a photo (it does not choose it). */}
        <div
          role="group" aria-label={fmt(t.groupSeries, { count: plural(t, unit, group.ids.length) })}
          className="flex gap-[6px] overflow-x-auto no-scrollbar -mx-[16px] px-[16px] py-1"
        >
          {group.ids.map((id, i) => {
            const v = id !== group.best ? verdicts.get(id) : undefined;
            const tag = v?.detail ? short[v.detail] : undefined;
            const f = fate(id);
            const on = id === focus;
            return (
              <button
                key={id} type="button" aria-pressed={on} ref={el => { tiles.current[id] = el; }}
                aria-label={[fmt(t.groupShow, { i: num(t, i + 1), n: num(t, group.ids.length), date: when(id) }), state(id), tag, v?.trust === 'check' ? t.trustCheck : undefined].filter(Boolean).join('. ')}
                onClick={() => { tapLight(); setLooking(id); }}
                className={`relative shrink-0 w-[76px] aspect-square rounded-[10px] overflow-hidden press focus-visible:ring-focus ${on ? 'ring-[3px] ring-accent ring-offset-2 ring-offset-bg' : ''}`}
              >
                <Thumb id={id} className="!rounded-none" />
                {f === 'keeps' && (
                  <span className="absolute top-1 start-1 w-6 h-6 rounded-full bg-keep text-keep-ink inline-flex items-center justify-center ring-2 ring-on-color" aria-hidden="true">
                    <Check className="w-3.5 h-3.5" strokeWidth={3.2} />
                  </span>
                )}
                {f === 'safe' && (
                  <span className="absolute top-1 start-1 w-6 h-6 rounded-full glass text-fg inline-flex items-center justify-center" aria-hidden="true">
                    <Shield className="w-3.5 h-3.5" strokeWidth={2.6} />
                  </span>
                )}
                {id === group.suggested && f !== 'keeps' && (
                  <span className="absolute top-1 end-1 w-6 h-6 rounded-full glass text-fg inline-flex items-center justify-center" aria-hidden="true">
                    <Sparkles className="w-3.5 h-3.5" strokeWidth={2.4} />
                  </span>
                )}
                {player && player.length(id) !== null && (
                  <span className="absolute bottom-1 end-1 w-5 h-5 rounded-full bg-veil text-on-color inline-flex items-center justify-center" aria-hidden="true">
                    <Play className="w-2.5 h-2.5 translate-x-[0.5px]" fill="currentColor" strokeWidth={0} />
                  </span>
                )}
                {tag && (
                  <span className="absolute bottom-1 start-1 end-1 flex" aria-hidden="true">
                    <span className="max-w-full px-1.5 py-0.5 rounded-full bg-veil text-on-color text-micro font-bold truncate">{tag}</span>
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <figcaption className="px-1 space-y-1" aria-live="polite">
          <p className="text-caption text-fg-mute num">{[when(focus), photo ? bytes(t, photo.bytes) : null].filter(Boolean).join(' · ')}</p>
          {reason && <p className="text-label text-fg wrap-prose">{reason}</p>}
          {changed && focus === group.best && <p className="text-label text-fg-mute wrap-prose">{t.groupChangedNote}</p>}
        </figcaption>

        {focus !== group.best && (
          <Button full variant="secondary" icon={Check} onClick={() => onPick(focus)}>{t.groupKeepThis}</Button>
        )}
        {focus === group.best && changed && (
          <Button full variant="ghost" onClick={() => { onPick(group.suggested); setLooking(group.suggested); }}>{t.groupBackToSuggested}</Button>
        )}
      </figure>

      <Dock>
        <div className="grid gap-1">
          <Button full size="lg" icon={Archive} disabled={!others.length} onClick={() => onDeleteOthers(others)}>
            {others.length ? `${t.groupAsideOthers} · ${plural(t, unit, others.length)} · ${bytes(t, othersBytes)}` : t.groupAsideOthers}
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
