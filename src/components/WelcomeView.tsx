import { motion, useReducedMotion } from 'motion/react';
import { Check, Lock, MapPin, Pointer, Sparkles } from 'lucide-react';
import type { Strings } from '../translations';
import { Button } from '../ui/Button';
import { Foot, PhotoFrame, SETTLE } from '../ui/FirstRun';
import { tapLight } from '../ui/haptics';
import dog1 from '../assets/welcome/dog-1.webp';
import dog2 from '../assets/welcome/dog-2.webp';
import dog3 from '../assets/welcome/dog-3.webp';

/**
 * The welcome, on the first start only: ONE screen. The benefit first ("Find
 * the photos worth keeping"), an illustration of what that means — a series
 * of three, the app's suggestion and then the user's own choice — and the
 * three things Bildklar does in a line each: similar shots compared, trips
 * sorted, all of it on the phone. One button leads on to the photo access,
 * which says why it is needed right before Android (or iOS) asks. The
 * gestures are taught later, on the first real card — not here (docs/ux-research.md).
 * Its photos are the app's own (src/assets/welcome/): nothing of the user's
 * is shown before access is granted. The illustration plays once and rests;
 * under reduced motion it shows its end state. Replayed from Einstellungen ›
 * So funktioniert Bildklar.
 */
export function WelcomeView({ t, onDone }: { t: Strings; onDone: () => void }) {
  const points = [
    { icon: Sparkles, hue: 'lilac', title: t.welcomeSimilarTitle, body: t.welcomeSimilar },
    { icon: MapPin, hue: 'sky', title: t.welcomeTripsTitle, body: t.welcomeTrips },
    { icon: Lock, hue: 'mint', title: t.welcomePrivateTitle, body: t.welcomePrivate },
  ];
  return (
    <div className="min-h-screen mx-auto max-w-xl flex flex-col safe-top" aria-label={t.welcomeLabel}>
      <main className="flex-1 flex flex-col px-6 pt-6 min-h-0">
        <div className="flex-1 flex flex-col justify-center pb-4">
        <div className="mx-auto w-full max-w-[340px]" aria-hidden="true">
          <BestShot t={t} />
        </div>
        <h1 className="title-face text-title1 font-bold text-fg wrap-compound mt-7 text-balance">{t.welcomeTitle}</h1>
        <ul className="mt-5 space-y-4 rise-children">
          {points.map(({ icon: Icon, hue, title, body }) => (
            <li key={title} className="flex items-start gap-3.5">
              <span className="icon-tile w-10 h-10 shrink-0 rounded-[11px] bg-hue-solid text-on-color sheen !shadow-none inline-flex items-center justify-center" data-hue={hue} aria-hidden="true">
                <Icon className="w-5 h-5" strokeWidth={2.2} />
              </span>
              <span className="min-w-0 pt-0.5">
                <span className="block text-body font-bold text-fg wrap-compound">{title}</span>
                <span className="block text-label text-fg-mute wrap-prose">{body}</span>
              </span>
            </li>
          ))}
        </ul>
        </div>
        <Foot>
          <Button full size="lg" onClick={() => { tapLight(); onDone(); }}>{t.welcomeStart}</Button>
        </Foot>
      </main>
    </div>
  );
}

/* ----------------------------------------------------------- illustrations */

/** A series of three; the app marks its suggestion, then a finger picks another — the user's choice. */
function BestShot({ t }: { t: Strings }) {
  const reduce = useReducedMotion();
  const shots = [dog1, dog2, dog3];
  // The finger comes in from the series' start towards its last photo — from the other side right to left.
  const side = t.dir === 'rtl' ? -1 : 1;
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
        {/* The finger: comes up to the third photo, taps, and leaves. */}
        {!reduce && (
          <motion.span
            className="absolute end-[6%] bottom-[8%] w-11 h-11 rounded-full glass text-fg inline-flex items-center justify-center"
            initial={{ opacity: 0, x: -70 * side, y: 60, scale: 1 }}
            animate={{ opacity: [0, 1, 1, 1, 0], x: [-70 * side, 0, 0, 0, 0], y: [60, 0, 0, 0, 8], scale: [1, 1, 0.86, 1, 1] }}
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
