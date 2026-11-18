import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Check, CloudOff, Lock, MapPin, Pointer, Sparkles, UserX } from 'lucide-react';
import { Strings, fmt, num } from '../translations';
import { Button } from '../ui/Button';
import { Dots, PhotoFrame, SETTLE } from '../ui/FirstRun';
import { tapLight } from '../ui/haptics';
import cake from '../assets/welcome/cake.webp';
import dog1 from '../assets/welcome/dog-1.webp';
import dog2 from '../assets/welcome/dog-2.webp';
import dog3 from '../assets/welcome/dog-3.webp';
import flower from '../assets/welcome/flower.webp';
import harbour from '../assets/welcome/harbour.webp';
import lake from '../assets/welcome/lake.webp';
import castle from '../assets/welcome/castle.webp';

const PAGES = 4;
/** How far a page is dragged before it turns. */
const TURN = 56;

/**
 * The welcome, on the first start only: four short pages, each one line and
 * an illustration of photo frames that animates what the line says — photos
 * settling into a grid, a stack becoming a trip, a series with the app's
 * suggestion and the user's own choice, a phone that keeps everything.
 * Skippable on every page; swipe or *Weiter*. Its photos are the app's own
 * eight (src/assets/welcome/): nothing of the user's is shown before access
 * is granted. An illustration plays once and rests; under reduced motion it
 * shows its end state. Replayed from Einstellungen › So funktioniert Bildklar.
 */
export function WelcomeView({ t, onDone }: { t: Strings; onDone: () => void }) {
  const [page, setPage] = useState(0);
  const [dir, setDir] = useState(1);
  const rtl = t.dir === 'rtl' ? -1 : 1;
  const lines = [t.welcomeLine1, t.welcomeLine2, t.welcomeLine3, t.welcomeLine4];
  const last = page === PAGES - 1;
  const go = (to: number) => {
    if (to < 0 || to === page) return;
    if (to >= PAGES) { onDone(); return; }
    setDir(to > page ? 1 : -1);
    setPage(to);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(page + rtl);
      else if (e.key === 'ArrowLeft') go(page - rtl);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="min-h-screen mx-auto max-w-xl flex flex-col safe-top overflow-x-clip" role="group" aria-roledescription="carousel" aria-label={t.welcomeLabel}>
      <div className="flex justify-end px-[16px] pt-2 min-h-[56px]">
        <Button variant="ghost" onClick={onDone}>{t.welcomeSkip}</Button>
      </div>

      <main className="flex-1 flex flex-col px-6 pb-safe-8 min-h-0">
        {/* The page follows the finger; let go past the threshold (or flicked) and it turns. */}
        <motion.div
          className="flex-1 flex flex-col justify-center min-h-0 touch-pan-y"
          drag="x" dragSnapToOrigin dragElastic={0.35} dragConstraints={{ left: 0, right: 0 }}
          onDragEnd={(_, info) => {
            const x = info.offset.x * rtl;
            const v = info.velocity.x * rtl;
            if (x < -TURN || v < -500) { tapLight(); go(page + 1); }
            else if (x > TURN || v > 500) { tapLight(); go(page - 1); }
          }}
        >
          <AnimatePresence mode="wait" initial={false} custom={dir * rtl}>
            <motion.div
              key={page}
              custom={dir * rtl}
              variants={{
                enter: (d: number) => ({ opacity: 0, x: 36 * d }),
                show: { opacity: 1, x: 0 },
                exit: (d: number) => ({ opacity: 0, x: -36 * d }),
              }}
              initial="enter" animate="show" exit="exit"
              transition={{ duration: 0.22, ease: [0.23, 1, 0.32, 1] }}
              aria-live="polite"
            >
              <div className="mx-auto w-full max-w-[360px] aspect-[5/4] flex items-center justify-center" aria-hidden="true">
                {page === 0 && <Order />}
                {page === 1 && <Trip t={t} />}
                {page === 2 && <BestShot t={t} />}
                {page === 3 && <Private t={t} />}
              </div>
              <h1 className="title-face text-title1 font-bold text-fg text-center wrap-compound mt-8 text-balance">{lines[page]}</h1>
            </motion.div>
          </AnimatePresence>
        </motion.div>

        <div className="pt-6">
          <Dots count={PAGES} index={page} label={fmt(t.welcomePage, { i: num(t, page + 1), n: num(t, PAGES) })} />
          <Button full size="lg" className="mt-6" onClick={() => go(page + 1)}>{last ? t.welcomeStart : t.welcomeNext}</Button>
        </div>
      </main>
    </div>
  );
}

/* ----------------------------------------------------------- illustrations */

/** Page 1: a loose pile of photos settles into a tidy grid. */
function Order() {
  const photos = [cake, dog1, flower, harbour, lake, castle];
  // Where each tile starts, relative to its place in the grid: pulled towards the middle, turned, a little larger.
  const from = [
    { x: '62%', y: '34%', rotate: -13 }, { x: '4%', y: '46%', rotate: 9 }, { x: '-58%', y: '30%', rotate: 15 },
    { x: '70%', y: '-38%', rotate: 11 }, { x: '-6%', y: '-30%', rotate: -8 }, { x: '-66%', y: '-36%', rotate: -16 },
  ];
  return (
    <div className="grid grid-cols-3 gap-2 w-full">
      {photos.map((src, i) => (
        <motion.div
          key={src}
          initial={{ ...from[i], scale: 1.08 }}
          animate={{ x: 0, y: 0, rotate: 0, scale: 1 }}
          transition={{ ...SETTLE, duration: 0.7, delay: 0.25 + i * 0.07 }}
        >
          <PhotoFrame src={src} className="aspect-square" />
        </motion.div>
      ))}
    </div>
  );
}

/** Page 2: three loose photos gather behind one cover and become a trip, with its place and date. */
function Trip({ t }: { t: Strings }) {
  return (
    <div className="relative w-[78%] aspect-[4/3]">
      <motion.div
        className="absolute inset-0"
        initial={{ x: '-46%', y: '10%', rotate: -16 }} animate={{ x: '-7%', y: '3%', rotate: -6 }}
        transition={{ ...SETTLE, duration: 0.7, delay: 0.3 }}
      >
        <PhotoFrame src={harbour} className="w-full h-full !rounded-md" />
      </motion.div>
      <motion.div
        className="absolute inset-0"
        initial={{ x: '46%', y: '-8%', rotate: 15 }} animate={{ x: '7%', y: '-3%', rotate: 5 }}
        transition={{ ...SETTLE, duration: 0.7, delay: 0.38 }}
      >
        <PhotoFrame src={castle} className="w-full h-full !rounded-md" />
      </motion.div>
      <motion.div
        className="absolute inset-0"
        initial={{ scale: 0.86 }} animate={{ scale: 1 }}
        transition={{ ...SETTLE, duration: 0.7, delay: 0.3 }}
      >
        <PhotoFrame src={lake} className="w-full h-full !rounded-md">
          <span className="absolute inset-0 photo-shade" />
          <motion.span
            className="absolute inset-x-0 bottom-0 p-4 text-on-color text-start"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.95 }}
          >
            <span className="flex items-center gap-1.5 title-face text-heading font-bold">
              <MapPin className="w-[18px] h-[18px] shrink-0" strokeWidth={2.4} />{t.welcomeTripName}
            </span>
            <span className="block text-caption font-semibold opacity-90 num mt-0.5">{t.welcomeTripMeta}</span>
          </motion.span>
        </PhotoFrame>
      </motion.div>
    </div>
  );
}

/** Page 3: a series of three; the app marks its suggestion, then a finger picks another — the user's choice. */
function BestShot({ t }: { t: Strings }) {
  const reduce = useReducedMotion();
  const shots = [dog1, dog2, dog3];
  return (
    <div className="w-full">
      <div className="relative grid grid-cols-3 gap-2">
        {shots.map((src, i) => (
          <motion.div key={src} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.1 + i * 0.07 }}>
            <PhotoFrame src={src} className="aspect-[3/4]">
              {i === 1 && (
                <motion.span
                  className="absolute top-1.5 end-1.5 w-7 h-7 rounded-full glass text-fg inline-flex items-center justify-center"
                  initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ ...SETTLE, duration: 0.4, delay: 0.7 }}
                >
                  <Sparkles className="w-4 h-4" strokeWidth={2.4} />
                </motion.span>
              )}
              {i === 2 && (
                <>
                  <motion.span
                    className="absolute inset-0 rounded-sm ring-[3px] ring-inset ring-keep"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2, delay: 2.05 }}
                  />
                  <motion.span
                    className="absolute top-1.5 start-1.5 w-7 h-7 rounded-full bg-keep text-keep-ink ring-2 ring-on-color inline-flex items-center justify-center"
                    initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ ...SETTLE, duration: 0.4, delay: 2.05 }}
                  >
                    <Check className="w-4 h-4" strokeWidth={3.2} />
                  </motion.span>
                </>
              )}
            </PhotoFrame>
          </motion.div>
        ))}
        {/* The finger: comes up to the third photo, taps, and leaves. Physical (right), as a hand is. */}
        {!reduce && (
          <motion.span
            className="absolute right-[6%] bottom-[8%] w-11 h-11 rounded-full glass text-fg inline-flex items-center justify-center"
            initial={{ opacity: 0, x: -70, y: 60, scale: 1 }}
            animate={{ opacity: [0, 1, 1, 1, 0], x: [-70, 0, 0, 0, 0], y: [60, 0, 0, 0, 8], scale: [1, 1, 0.86, 1, 1] }}
            transition={{ duration: 1.5, delay: 1.2, times: [0, 0.45, 0.58, 0.72, 1], ease: 'easeOut' }}
          >
            <Pointer className="w-5 h-5" strokeWidth={2.2} />
          </motion.span>
        )}
      </div>
      {/* What the two marks mean: a neutral sparkle for the app, a green check for you. */}
      <motion.div
        className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-4 text-caption font-semibold text-fg-mute"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3, delay: 0.8 }}
      >
        <span className="inline-flex items-center gap-1.5">
          <span className="w-5 h-5 rounded-full glass-flat text-fg inline-flex items-center justify-center"><Sparkles className="w-3 h-3" strokeWidth={2.6} /></span>
          {t.groupSuggested}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-5 h-5 rounded-full bg-keep text-keep-ink inline-flex items-center justify-center"><Check className="w-3 h-3" strokeWidth={3.4} /></span>
          {t.groupYourChoice}
        </span>
      </motion.div>
    </div>
  );
}

/** Page 4: a phone that holds the photos, a lock on it — and no cloud, no account beside it. */
function Private({ t }: { t: Strings }) {
  const inside = [lake, dog2, cake, flower, castle, harbour];
  const chip = 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full glass text-fg text-caption font-bold whitespace-nowrap';
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <motion.div
        className="relative h-full aspect-[9/17] rounded-[26px] bg-surface p-2 shadow-e2 ring-[3px] ring-fg/15"
        initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} transition={{ ...SETTLE, duration: 0.5, delay: 0.1 }}
      >
        <span className="block mx-auto w-9 h-1.5 rounded-full bg-fg/15 mb-2" />
        <div className="grid grid-cols-2 gap-1">
          {inside.map((src, i) => (
            <motion.span key={src} className="block" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ ...SETTLE, duration: 0.4, delay: 0.35 + i * 0.06 }}>
              <span className="relative block aspect-square overflow-hidden rounded-[7px] bg-surface-2">
                <img src={src} alt="" draggable={false} className="absolute inset-0 w-full h-full object-cover" />
              </span>
            </motion.span>
          ))}
        </div>
        <motion.span
          className="absolute -bottom-4 start-1/2 w-12 h-12 -ms-6 rounded-full bg-accent-fill text-accent-fill-ink sheen inline-flex items-center justify-center"
          initial={{ opacity: 0, scale: 0.5, y: -10 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ ...SETTLE, duration: 0.5, delay: 0.95 }}
        >
          <Lock className="w-6 h-6" strokeWidth={2.4} />
        </motion.span>
      </motion.div>
      <motion.span
        className={`absolute start-0 top-[18%] ${chip}`}
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 1.25 }}
      >
        <CloudOff className="w-4 h-4 shrink-0" strokeWidth={2.4} />{t.welcomeNoCloud}
      </motion.span>
      <motion.span
        className={`absolute end-0 bottom-[22%] ${chip}`}
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 1.4 }}
      >
        <UserX className="w-4 h-4 shrink-0" strokeWidth={2.4} />{t.welcomeNoAccount}
      </motion.span>
    </div>
  );
}
