import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Archive, CalendarDays, Check, Lock, MapPin, Sparkles } from 'lucide-react';
import type { ScanView } from '../store';
import { Strings, fmt, num, percent, plural } from '../translations';
import { etaText } from './HomeView';
import { Button } from '../ui/Button';
import { CountUp, Dots, Foot, Ring, SETTLE } from '../ui/FirstRun';
import { tapLight } from '../ui/haptics';
import { Thumb } from '../ui/Photo';

/** How long one explaining card stays before the next comes by itself. */
const CARD_MS = 6500;

/** What the scan found so far, counting up as the facts are read again (src/store.ts). */
export interface FoundSoFar { trips: number; similar: number; duplicates: number; screenshots: number }

/**
 * The first scan, as a moment instead of a wall: a ring with how far it is
 * and about how long it still takes, what was found so far counting up, and
 * the wait used to explain what Bildklar does — five cards, one sentence and
 * a small animation each, coming by themselves (not under reduced motion)
 * or by a tap. The scan never blocks the app: *Schon mal umsehen* goes to
 * home, where the slim card carries on. As soon as the scan has found a
 * group of near-identical photos, its real photos take the cards' place —
 * "found already", the comparison that waits after the scan — so the wait
 * shows results instead of promises (nothing here is invented: no group, no
 * card). Only the first scan looks like this; later ones stay the slim card.
 */
export function FirstScanView({ t, scan, found, firstFind, onLookAround }: {
  t: Strings;
  scan: ScanView;
  found: FoundSoFar;
  /** The first group of near-identical photos found so far (src/logic/nextStep.ts firstGroup): real photos, shown as soon as they exist. */
  firstFind?: { ids: string[]; suggested: string } | null;
  onLookAround: () => void;
}) {
  const reduce = useReducedMotion();
  const counting = scan.phase === 'list' || scan.total === 0;
  const ai = scan.phase === 'ai';
  const share = counting ? null : scan.done / scan.total;
  const where = counting ? t.scanList
    : ai ? fmt(t.scanAi, { done: num(t, scan.done), total: num(t, scan.total) })
      : fmt(t.scanAnalyse, { done: num(t, scan.done), total: num(t, scan.total) });
  const eta = counting ? '' : etaText(t, scan.left);

  const cards = [
    { key: 'trips', title: t.scanCardTripsTitle, body: t.scanCardTrips },
    { key: 'similar', title: t.scanCardSimilarTitle, body: t.scanCardSimilar },
    { key: 'months', title: t.scanCardMonthsTitle, body: t.scanCardMonths },
    { key: 'bin', title: t.scanCardBinTitle, body: t.scanCardBin },
    { key: 'private', title: t.scanCardPrivateTitle, body: t.scanCardPrivate },
  ] as const;
  const [card, setCard] = useState(0);
  // Once the user turns a card themselves, the cards wait for them.
  const [own, setOwn] = useState(false);
  useEffect(() => {
    if (reduce || own) return;
    const timer = window.setInterval(() => setCard(c => (c + 1) % cards.length), CARD_MS);
    return () => window.clearInterval(timer);
  }, [reduce, own, cards.length]);
  const current = cards[card];

  const tiles: { key: keyof FoundSoFar; label: string }[] = [
    { key: 'trips', label: t.tripsTitle },
    { key: 'similar', label: t.similarTile },
    { key: 'duplicates', label: t.duplicatesTile },
    { key: 'screenshots', label: t.screenshotsTile },
  ];

  return (
    <div className="min-h-screen mx-auto max-w-xl flex flex-col safe-top">
      <main className="flex-1 flex flex-col px-6 pt-6">
        <div className="flex flex-col items-center text-center">
          <Ring value={share} size={116} stroke={9} label={[where, eta].filter(Boolean).join(' · ')}>
            {share === null
              ? <Sparkles className="w-8 h-8 text-accent" strokeWidth={2} aria-hidden="true" />
              : <span className="display text-title1 text-fg num" aria-hidden="true">{percent(t, Math.floor(share * 100))}</span>}
          </Ring>
          <h1 className="title-face text-title1 font-bold text-fg mt-5 wrap-compound text-balance">{ai ? t.scanAiTitle : t.scanTitle}</h1>
          {/* One quiet status line: read out when it changes, without interrupting. */}
          <p className="text-label text-fg-mute mt-2 num wrap-prose" aria-live="polite" aria-atomic="true">{[where, eta].filter(Boolean).join(' · ')}</p>
        </div>

        <section className="mt-6" aria-labelledby="found-so-far">
          <h2 id="found-so-far" className="px-1 pb-2 text-label font-semibold text-fg-mute">{t.firstScanFound}</h2>
          <dl className="rounded-md card px-1 py-3 grid grid-cols-4">
            {tiles.map(x => (
              <div key={x.key} className="min-w-0 flex flex-col-reverse items-center text-center">
                <dt className="text-caption text-fg-mute wrap-compound leading-tight mt-0.5">{x.label}</dt>
                <dd className="title-face text-title2 font-bold text-fg num"><CountUp value={found[x.key]} format={n => num(t, n)} /></dd>
              </div>
            ))}
          </dl>
        </section>

        {firstFind ? (
          <motion.section
            className="mt-5 pb-2" aria-labelledby="first-find"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ ...SETTLE, duration: 0.5 }}
          >
            <h2 id="first-find" className="px-1 pb-2 text-label font-semibold text-fg-mute">{t.firstScanFirstFind}</h2>
            <div className="rounded-md card p-3 flex items-center gap-3">
              <span className="flex -space-x-5 rtl:space-x-reverse shrink-0" aria-hidden="true">
                {firstFind.ids.slice(0, 3).map((id, i) => (
                  <span key={id} className="relative block w-16 h-20 rounded-[10px] overflow-hidden ring-2 ring-surface" style={{ zIndex: 3 - i }}>
                    <Thumb id={id} className="!rounded-none" />
                    {id === firstFind.suggested && (
                      <span className="absolute top-1 end-1 w-5 h-5 rounded-full glass text-fg inline-flex items-center justify-center"><Sparkles className="w-3 h-3" strokeWidth={2.6} /></span>
                    )}
                  </span>
                ))}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-label font-bold text-fg wrap-compound">{fmt(t.revealFirstTitle, { photos: plural(t, 'photos', firstFind.ids.length) })}</span>
                <span className="block text-caption text-fg-mute mt-0.5 wrap-prose">{t.firstScanFirstFindBody}</span>
              </span>
            </div>
          </motion.section>
        ) : (
        <section className="mt-5 pb-2" aria-label={t.firstScanCards}>
          <button
            type="button"
            onClick={() => { tapLight(); setOwn(true); setCard(c => (c + 1) % cards.length); }}
            aria-label={`${current.title}. ${current.body} ${t.firstScanCardNext}`}
            className="block w-full text-start rounded-md card p-4 min-h-[112px] press focus-visible:ring-focus"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={current.key}
                className="flex items-center gap-4"
                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
              >
                <Glyph kind={current.key} />
                <span className="min-w-0 flex-1">
                  <span className="block text-label font-bold text-fg wrap-compound">{current.title}</span>
                  <span className="block text-caption text-fg-mute mt-0.5 wrap-prose">{current.body}</span>
                </span>
              </motion.span>
            </AnimatePresence>
          </button>
          <div className="mt-3">
            <Dots count={cards.length} index={card} label={fmt(t.welcomePage, { i: num(t, card + 1), n: num(t, cards.length) })} />
          </div>
        </section>
        )}

        <Foot>
          <Button full size="lg" variant="secondary" onClick={onLookAround}>{t.firstScanLook}</Button>
          <p className="text-caption text-fg-mute text-center mt-3 wrap-prose">{t.firstScanHint}</p>
        </Foot>
      </main>
    </div>
  );
}

/* ------------------------------------------------------------------ glyphs */

const TILE = 'absolute w-7 h-7 rounded-[8px] ring-1 ring-fg/10';

/** A card's small picture, 64 px: tinted tiles standing in for photos, moving once the way the sentence says. */
function Glyph({ kind }: { kind: 'trips' | 'similar' | 'months' | 'bin' | 'private' }) {
  const box = 'relative w-16 h-16 shrink-0 rounded-[18px] bg-surface-2';
  if (kind === 'trips') {
    // Three photos from here and there come together under one pin.
    return (
      <span className={box} aria-hidden="true">
        <motion.span data-hue="sky" className={`${TILE} bg-hue-solid top-[18px] start-[18px]`} initial={{ x: -12, y: -10, rotate: -14 }} animate={{ x: -5, y: 2, rotate: -8 }} transition={{ ...SETTLE, delay: 0.15 }} />
        <motion.span data-hue="sand" className={`${TILE} bg-hue-solid top-[18px] start-[18px]`} initial={{ x: 14, y: 12, rotate: 16 }} animate={{ x: 5, y: 2, rotate: 8 }} transition={{ ...SETTLE, delay: 0.22 }} />
        <motion.span data-hue="mint" className={`${TILE} bg-hue-solid top-[18px] start-[18px] inline-flex items-center justify-center text-on-color`} initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ ...SETTLE, delay: 0.15 }}>
          <MapPin className="w-4 h-4" strokeWidth={2.6} />
        </motion.span>
      </span>
    );
  }
  if (kind === 'similar') {
    // A series of three; the sparkle lands on the best one.
    return (
      <span className={`${box} flex items-center justify-center gap-[3px]`} aria-hidden="true">
        {[0, 1, 2].map(i => (
          <span key={i} data-hue="lilac" className="relative w-[15px] h-[26px] rounded-[5px] bg-hue-solid ring-1 ring-fg/10" style={{ opacity: i === 1 ? 1 : 0.45 }}>
            {i === 1 && (
              <motion.span className="absolute -top-2.5 -end-2.5 w-5 h-5 rounded-full glass text-fg inline-flex items-center justify-center" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ ...SETTLE, duration: 0.4, delay: 0.35 }}>
                <Sparkles className="w-3 h-3" strokeWidth={2.6} />
              </motion.span>
            )}
          </span>
        ))}
      </span>
    );
  }
  if (kind === 'months') {
    // A month, ticked off.
    return (
      <span className={`${box} inline-flex items-center justify-center text-fg`} aria-hidden="true">
        <CalendarDays className="w-8 h-8" strokeWidth={1.8} />
        <motion.span className="absolute bottom-2 end-2 w-5 h-5 rounded-full bg-keep text-keep-ink inline-flex items-center justify-center" initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ ...SETTLE, duration: 0.4, delay: 0.35 }}>
          <Check className="w-3 h-3" strokeWidth={3.4} />
        </motion.span>
      </span>
    );
  }
  if (kind === 'bin') {
    // A photo is put aside into the box — it is still there.
    return (
      <span className={`${box} inline-flex items-end justify-center pb-2.5 text-fg`} aria-hidden="true">
        <motion.span data-hue="rose" className="absolute top-2 start-[22px] w-5 h-5 rounded-[6px] bg-hue-solid ring-1 ring-fg/10" initial={{ y: -4, opacity: 0 }} animate={{ y: 10, opacity: 1 }} transition={{ ...SETTLE, delay: 0.2 }} />
        <Archive className="relative w-8 h-8" strokeWidth={1.8} />
      </span>
    );
  }
  // Private: the lock closes over the phone's photos.
  return (
    <span className={`${box} inline-flex items-center justify-center`} aria-hidden="true">
      <motion.span className="w-9 h-9 rounded-full bg-accent-fill text-accent-fill-ink sheen inline-flex items-center justify-center" initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ ...SETTLE, duration: 0.45, delay: 0.15 }}>
        <Lock className="w-[18px] h-[18px]" strokeWidth={2.5} />
      </motion.span>
    </span>
  );
}
