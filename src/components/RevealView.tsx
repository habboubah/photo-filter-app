import { motion } from 'motion/react';
import { Check, Map as MapIcon, Sparkles } from 'lucide-react';
import type { RankedCategory } from '../logic/nextStep';
import { Strings, bytes, fmt, num, plural } from '../translations';
import { categoryCount, categoryWords } from './HomeView';
import { Button } from '../ui/Button';
import { Foot, SETTLE } from '../ui/FirstRun';
import { Thumb } from '../ui/Photo';
import { LARGE } from '../thumbs';

/** The first group to compare (src/logic/nextStep.ts firstGroup): the reveal's first step when there is one. */
export interface RevealGroup { ids: string[]; suggested: string; date: string }

/** The one step the reveal recommends: home's own next step (src/logic/nextStep.ts), worded by App.tsx. */
export interface RevealStep { eyebrow: string; title: string; meta: string; covers: string[]; /** The button's words; "Jetzt durchsehen" without. */ button?: string }

/**
 * After the first scan, one calm overview that leads with ONE useful task, not
 * with a storage figure: when a group of near-identical photos exists, its
 * photos side by side and *Compare your first group* (docs/ux-research.md,
 * idea A); without one, the step home's next-step card would choose. Under it,
 * what was found per category with the space it could free — in home's
 * units, in plain ink, nothing in red, nothing that hurries — and the trips.
 * A quiet second way: just look around. Shown once; home says the same
 * things from then on.
 */
export function RevealView({ t, files, categories, first, trips, tripCover, aiRunning, step, onGo, onLookAround }: {
  t: Strings;
  /** Photos and videos looked at. */
  files: number;
  /** What was found, the category that frees the most first. */
  categories: RankedCategory[];
  /** The first group to compare; when set, it is the step and `onGo` opens it. */
  first: RevealGroup | null;
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
    <div className="min-h-screen mx-auto max-w-column flex flex-col safe-top">
      <main className="flex-1 flex flex-col px-page pt-8">
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
          {first && <FirstGroup t={t} group={first} />}

          {!first && step && (
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

        <Foot inset="page">
          {first || step ? (
            <>
              <Button full size="lg" onClick={onGo}>{first ? t.revealCompare : step?.button ?? t.revealGo}</Button>
              <Button full variant="ghost" className="mt-1" onClick={onLookAround}>{t.revealLook}</Button>
            </>
          ) : <Button full size="lg" onClick={onLookAround}>{t.revealHome}</Button>}
          <p className="text-caption text-fg-mute text-center mt-2 wrap-prose">{t.revealSafe}</p>
        </Foot>
      </main>
    </div>
  );
}

/**
 * The first group, the way the comparison will show it: its photos side by
 * side in the same shape, the app's suggestion marked with the neutral
 * sparkle (never green: green is the user's choice, made on the next screen).
 */
function FirstGroup({ t, group }: { t: Strings; group: RevealGroup }) {
  // At most three side by side; the suggestion is always among them.
  const shown = group.ids.includes(group.suggested)
    ? [group.suggested, ...group.ids.filter(id => id !== group.suggested)].slice(0, 3).sort((a, b) => group.ids.indexOf(a) - group.ids.indexOf(b))
    : group.ids.slice(0, 3);
  const more = group.ids.length - shown.length;
  return (
    <section className="rounded-lg card overflow-hidden" aria-labelledby="reveal-first">
      <div className={`grid gap-[3px] p-[3px] ${shown.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`} aria-hidden="true">
        {shown.map((id, i) => (
          <span key={id} className="relative block aspect-[3/4] overflow-hidden rounded-[13px] bg-surface-2">
            <Thumb id={id} size={LARGE} className="!rounded-none" />
            {id === group.suggested && (
              <span className="absolute top-1.5 end-1.5 w-7 h-7 rounded-full glass text-fg inline-flex items-center justify-center">
                <Sparkles className="w-4 h-4" strokeWidth={2.4} />
              </span>
            )}
            {more > 0 && i === shown.length - 1 && (
              <span className="absolute bottom-1.5 end-1.5 px-2 py-0.5 rounded-full bg-veil text-on-color text-caption font-bold num">{fmt(t.revealMore, { n: num(t, more) })}</span>
            )}
          </span>
        ))}
      </div>
      <div className="px-5 pt-3 pb-5">
        <p className="eyebrow text-fg-mute">{t.revealFirstEyebrow}</p>
        <h2 id="reveal-first" className="title-face text-title2 font-bold text-fg mt-0.5 wrap-compound">{fmt(t.revealFirstTitle, { photos: plural(t, 'photos', group.ids.length) })}</h2>
        <p className="text-label text-fg-mute mt-1 num wrap-prose">{group.date}</p>
        <p className="text-label text-fg mt-2 wrap-prose inline-flex items-start gap-1.5">
          <Sparkles className="w-4 h-4 mt-[3px] shrink-0 text-fg-mute" strokeWidth={2.4} aria-hidden="true" />
          <span>{t.revealFirstMeta}</span>
        </p>
      </div>
    </section>
  );
}
