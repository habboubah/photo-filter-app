import { motion } from 'motion/react';
import { Check, Map as MapIcon } from 'lucide-react';
import type { RankedCategory } from '../logic/nextStep';
import { Strings, bytes, fmt, plural } from '../translations';
import { categoryCount, categoryWords } from './HomeView';
import { Button } from '../ui/Button';
import { BigNumber } from '../ui/Controls';
import { CountUp, Foot, SETTLE } from '../ui/FirstRun';
import { Thumb } from '../ui/Photo';
import { LARGE } from '../thumbs';

/** The one step the reveal recommends: home's own next step (src/logic/nextStep.ts), worded by App.tsx. */
export interface RevealStep { eyebrow: string; title: string; meta: string; covers: string[]; /** The button's words; "Jetzt durchsehen" without. */ button?: string }

/**
 * After the first scan, one calm overview: what Bildklar found, per category
 * with the space it could free — in home's units, in plain ink, nothing in
 * red, nothing that hurries — the trips it put together, and ONE recommended
 * first step, the same choice home's next-step card makes. A quiet second
 * way: just look around. Shown once; home says the same things from then on.
 */
export function RevealView({ t, files, categories, freeable, trips, tripCover, aiRunning, step, onGo, onLookAround }: {
  t: Strings;
  /** Photos and videos looked at. */
  files: number;
  /** What was found, the category that frees the most first. */
  categories: RankedCategory[];
  /** What could be freed in all (the clean-up summary's total). */
  freeable: number;
  trips: number;
  tripCover?: string;
  /** The AI's pass still runs: more suggestions will come. */
  aiRunning: boolean;
  step: RevealStep | null;
  onGo: () => void;
  onLookAround: () => void;
}) {
  const words = categoryWords(t);
  const ids = step?.covers.slice(0, 3) ?? [];
  const layout = ids.length >= 3 ? 'grid-cols-[2fr_1fr] grid-rows-2 [&>*:first-child]:row-span-2' : ids.length === 2 ? 'grid-cols-2' : 'grid-cols-1';
  const nothing = categories.length === 0;
  return (
    <div className="min-h-screen mx-auto max-w-xl flex flex-col safe-top">
      <main className="flex-1 flex flex-col px-[16px] pt-8">
        <header className="px-2">
          <motion.span
            className="w-12 h-12 rounded-full bg-keep text-keep-ink sheen inline-flex items-center justify-center"
            initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ ...SETTLE, duration: 0.5 }} aria-hidden="true"
          >
            <Check className="w-6 h-6" strokeWidth={2.8} />
          </motion.span>
          <h1 className="title-face text-title1 font-bold text-fg mt-4 wrap-compound">{nothing ? t.cleanupNone : t.revealTitle}</h1>
          <p className="text-label text-fg-mute mt-1 num wrap-prose">{fmt(t.revealLooked, { files: plural(t, 'files', files) })}</p>
        </header>

        <div className="mt-6 space-y-6 rise-children">
          {!nothing && freeable > 0 && (
            <section className="rounded-lg card p-6">
              <p className="text-display text-fg">
                <CountUp value={freeable} seconds={0.9} format={n => <BigNumber text={bytes(t, n)} />} />
              </p>
              <p className="text-label font-semibold text-fg-mute mt-1 wrap-prose">{t.revealFree}</p>
            </section>
          )}

          {step && (
            <section className="rounded-lg card overflow-hidden" aria-labelledby="reveal-step">
              {ids.length > 0 && (
                <div className={`aspect-[16/9] grid gap-[2px] ${layout}`} aria-hidden="true">
                  {ids.map((id, i) => <Thumb key={id} id={id} size={i === 0 ? LARGE : undefined} className="!rounded-none" />)}
                </div>
              )}
              <div className="p-5">
                <p className="eyebrow text-fg-mute">{step.eyebrow}</p>
                <h2 id="reveal-step" className="title-face text-title2 font-bold text-fg mt-0.5 wrap-compound">{step.title}</h2>
                <p className="text-label text-fg-mute mt-1 num wrap-prose">{step.meta}</p>
              </div>
            </section>
          )}

          {nothing && <p className="px-2 text-body text-fg-mute wrap-prose">{t.cleanupNoneBody}</p>}

          {(categories.length > 0 || trips > 0) && (
            <section aria-labelledby="reveal-all">
            <h2 id="reveal-all" className="px-2 pb-2 text-label font-semibold text-fg-mute">{t.revealAll}</h2>
            <ul className="rounded-md card divide-hairline-inset [--sep:78px]">
              {categories.map(c => (
                <li key={c.key} className="min-h-[64px] px-[16px] py-2 flex items-center gap-[14px]">
                  <span className="w-12 h-12 shrink-0 rounded-[11px] overflow-hidden bg-surface-2" aria-hidden="true">
                    {c.covers[0] && <Thumb id={c.covers[0]} className="!rounded-none" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-body text-fg wrap-compound">{words[c.key].label}</span>
                    <span className="block text-caption text-fg-mute num">{categoryCount(t, c)}</span>
                  </span>
                  {c.gain.bytes > 0 && <span className="shrink-0 text-body font-bold text-fg num">{bytes(t, c.gain.bytes)}</span>}
                </li>
              ))}
              {trips > 0 && (
                <li className="min-h-[64px] px-[16px] py-2 flex items-center gap-[14px]">
                  <span className="w-12 h-12 shrink-0 rounded-[11px] overflow-hidden bg-surface-2 inline-flex items-center justify-center text-fg-mute" aria-hidden="true">
                    {tripCover ? <Thumb id={tripCover} className="!rounded-none" /> : <MapIcon className="w-5 h-5" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-body text-fg wrap-compound">{t.tripsTitle}</span>
                    <span className="block text-caption text-fg-mute num">{plural(t, 'trips', trips)}</span>
                  </span>
                </li>
              )}
            </ul>
            </section>
          )}

          {aiRunning && <p className="px-2 text-caption text-fg-mute wrap-prose">{t.revealAiNote}</p>}

        </div>

        <Foot inset={16}>
          {step ? (
            <>
              <Button full size="lg" onClick={onGo}>{step.button ?? t.revealGo}</Button>
              <Button full variant="ghost" className="mt-1" onClick={onLookAround}>{t.revealLook}</Button>
            </>
          ) : <Button full size="lg" onClick={onLookAround}>{t.revealHome}</Button>}
          <p className="text-caption text-fg-mute text-center mt-2 wrap-prose">{t.revealSafe}</p>
        </Foot>
      </main>
    </div>
  );
}
