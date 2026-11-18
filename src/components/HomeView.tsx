import type React from 'react';
import { useState } from 'react';
import { Aperture, CalendarDays, Check, ChevronRight, Clock, FileVideo, Image as ImageIcon, ImagePlus, MessageCircle, Minimize2, RefreshCw, Search, Settings, Shield, Sparkles, Video } from 'lucide-react';
import type { CleanupSummary, Storage } from '../types';
import type { Access } from '../native/photoLibrary';
import type { ScanView } from '../store';
import { Strings, ago, bytes, fmt, num, percent, plural } from '../translations';
import { etaWords } from '../logic/eta';
import { greetingAt } from '../logic/greeting';
import { type Found, type FoundKey, gainOf, nextStepKind, rankCategories } from '../logic/nextStep';
import { Empty, Group, IconTile, Next, Row, Screen, SectionHead } from '../ui/Screen';
import { Button, IconButton } from '../ui/Button';
import { BigNumber, Progress } from '../ui/Controls';
import { StorageBar } from '../ui/StorageBar';
import { tapLight } from '../ui/haptics';
import { Thumb } from '../ui/Photo';
import { LARGE } from '../thumbs';
import { Confirm } from '../ui/Sheet';

export type { Found, FoundKey } from '../logic/nextStep';

/** A count and its size. */
export interface Stat { count: number; bytes: number }

/** The month to go on with (the newest not gone through yet), with what it holds. */
export interface NextMonth { key: string; name: string; photos: number; bytes: number; covers: string[] }

interface Props {
  t: Strings;
  access: Access | null;
  photoCount: number | null;
  scan: ScanView;
  summary: CleanupSummary | null;
  /** Per category; `utility` only once the on-device AI has seen a photo. */
  found: Partial<Record<FoundKey, Found>>;
  large: { count: number; bytes: number; cover?: string };
  liveCount: number;
  liveCover?: string;
  /** "Fotos verkleinern" (src/logic/compress.ts): how many qualify and what they could save. */
  compress: { count: number; saving: number; cover?: string };
  /** "Aus Apps" (Android): shown once the apps' photos hold at least 100 MB. */
  apps: { bytes: number; cover?: string } | null;
  storage: Storage | null;
  freedBytes: number;
  /** Months gone through, and the share of all photos in them (src/logic/months.ts progress). */
  months: { done: number; total: number; pct: number };
  /** The newest month not gone through yet (none when every month is done). */
  nextMonth: NextMonth | null;
  /** The decide-later pile (photos swiped up in a review). */
  later: { count: number; cover?: string };
  /** "Zum Löschen vorgemerkt" (src/logic/bin.ts): what the user set aside, waiting for the real delete; a few of its photos. */
  bin: { count: number; bytes: number; covers: string[] };
  /** Every photo and every video scanned. */
  analysis: { photos: Stat; videos: Stat };
  /** How much is protected (src/logic/protect.ts): never suggested for deleting. */
  protection: { albums: number; trips: number; photos: number };
  /** "An diesem Tag" and the latest trip, from the Ordnen tab: one small tile each. */
  memories: { onThisDay: { photos: number; years: number[]; cover: string } | null; trip: { key: string; title: string; photos: number; cover: string } | null };
  onOnThisDay: () => void;
  onTrip: (key: string) => void;
  /** The Ordnen tab. */
  onOrganize: () => void;
  onLater: () => void;
  onBin: () => void;
  onProtected: () => void;
  /** Every photo analysed again from the start, the AI's pass too (after a confirmation here). */
  onRescan: () => void;
  onSettings: () => void;
  /** Suchen (src/components/SearchView.tsx): find photos by words, then go through them. */
  onSearch?: () => void;
  onAddPhotos: () => void;
  onCleanup: () => void;
  onSimilar: () => void;
  onBlurry: () => void;
  onDuplicates: () => void;
  /** The similar videos (lookalike takes and copies of a video). */
  onVideoGroups: () => void;
  /** Every video of the library. */
  onVideos: () => void;
  onScreenshots: () => void;
  onUtility: () => void;
  onMonths: () => void;
  /** Goes through one month (the next one) at once. */
  onMonth: (key: string) => void;
  onLarge: () => void;
  onLive: () => void;
  onCompress: () => void;
  onApps: () => void;
}

/** How long a phase still takes, in words ("noch etwa 3 Min."); empty while too early to say. */
export function etaText(t: Strings, seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return '';
  const w = etaWords(seconds);
  if (w.kind === 'soon') return t.scanEtaSoon;
  if (w.kind === 'minutes') return fmt(t.scanEtaMinutes, { n: num(t, w.minutes) });
  return w.minutes ? fmt(t.scanEtaHours, { h: num(t, w.hours), m: num(t, w.minutes) }) : fmt(t.scanEtaHoursOnly, { h: num(t, w.hours) });
}

/** A category's name and what its screen counts (groups or photos) — for home's rows and the reveal after the first scan. */
export function categoryWords(t: Strings): Record<FoundKey, { label: string; unit: 'groups' | 'photos' }> {
  return {
    duplicates: { label: t.duplicatesTile, unit: 'groups' },
    similar: { label: t.similarTile, unit: 'groups' },
    videos: { label: t.lookalikeTitle, unit: 'groups' },
    failed: { label: t.failedTile, unit: 'photos' },
    screenshots: { label: t.screenshotsTile, unit: 'photos' },
    utility: { label: t.utilityTile, unit: 'photos' },
  };
}

/** What a category row counts: the photos that could go when the summary knows them, else its groups or photos. */
export function categoryCount(t: Strings, c: { key: FoundKey; items: number; gain: { count: number } }): string {
  if (c.gain.count > 0) return plural(t, c.key === 'videos' ? 'videos' : 'photos', c.gain.count);
  return plural(t, categoryWords(t)[c.key].unit, c.items);
}

/** The line under a recommended category: what could go and how much space that is. */
export function categoryMeta(t: Strings, c: { key: FoundKey; items: number; gain: { count: number; bytes: number } }): string {
  return c.gain.bytes > 0 ? fmt(t.nextCategoryMeta, { count: categoryCount(t, c), size: bytes(t, c.gain.bytes) }) : categoryCount(t, c);
}

type Step = { eyebrow: string; title: string; meta: string; covers: string[]; button: string; onGo: () => void; more?: { label: string; onClick: () => void } };

/**
 * Home, the "Aufräumen" tab, calm and photo-led ("Album", docs/REDESIGN.md):
 * the clean-up card on top (the space that could be freed, the bar of the
 * library, photos and videos — scanned, fine, could go), then ONE next step
 * as a photo card (the next month when there is progress, else what is
 * waiting, else a good place to start), what is marked for deletion, the
 * categories as rows to scan by count and space, what is open, a small look
 * at the Ordnen tab (on this day, the latest trip), the tools that make room
 * without deleting, and what is kept safe. A scan runs above it all as a slim
 * progress card: the app stays usable while it fills in.
 */
export function HomeView(p: Props) {
  const { t, summary } = p;
  const [askRescan, setAskRescan] = useState(false);
  const firstScan = p.scan.running && !p.scan.lastScanAt;
  const loaded = p.photoCount !== null;
  const has = loaded && p.photoCount! > 0;
  // A rescan that only looks at a few new photos stays quiet: the card is for a first scan, a long one, or the AI's pass.
  const bigScan = p.scan.running && (firstScan || (p.scan.phase === 'analyse' && p.scan.total - p.scan.done > 50));
  const aiPass = p.scan.running && p.scan.phase === 'ai' && p.scan.total > 0;
  const analysing = p.scan.running && (firstScan || p.scan.phase === 'analyse');
  const lastScan = p.scan.lastScanAt ? fmt(t.lastScan, { when: ago(t, p.scan.lastScanAt, Date.now()) }) : null;
  const rescanLabel = p.scan.running ? `${t.rescan}: ${t.scanUpdating}` : lastScan ? `${t.rescan} (${lastScan})` : t.rescan;

  // The categories, each with the space it would free (from the summary, so every figure agrees).
  const gain = (k: FoundKey) => gainOf(summary, k);
  const words = categoryWords(t);
  const meta: Record<FoundKey, { label: string; icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; hue: string; unit: 'groups' | 'photos'; onClick: () => void }> = {
    duplicates: { ...words.duplicates, icon: Sparkles, hue: 'rose', onClick: p.onDuplicates },
    similar: { ...words.similar, icon: Sparkles, hue: 'lilac', onClick: p.onSimilar },
    videos: { ...words.videos, icon: Video, hue: 'cyan', onClick: p.onVideoGroups },
    failed: { ...words.failed, icon: Sparkles, hue: 'sand', onClick: p.onBlurry },
    screenshots: { ...words.screenshots, icon: Sparkles, hue: 'sky', onClick: p.onScreenshots },
    utility: { ...words.utility, icon: Sparkles, hue: 'mint', onClick: p.onUtility },
  };
  const keys = (Object.keys(meta) as FoundKey[]).filter(k => p.found[k]);
  const cats = rankCategories(p.found, summary).map(c => ({ ...meta[c.key], ...c }));
  const done = keys.filter(k => p.found[k]!.items === 0).map(k => meta[k].label);
  const bar = keys.map(k => ({ key: k, hue: meta[k].hue, bytes: gain(k).bytes, label: meta[k].label }));
  const countOf = (c: (typeof cats)[number]) => categoryCount(t, c);

  /* ---------------------------------------------------------- the next step */

  const pctText = percent(t, p.months.pct);
  // Which step it is: src/logic/nextStep.ts (the reveal after the first scan recommends the same one).
  const kind = nextStepKind({ monthsDone: p.months.done, hasNextMonth: !!p.nextMonth, later: p.later.count, categories: cats.length, scanning: p.scan.running });
  let step: Step | null = null;
  if (kind === 'month' && p.nextMonth) {
    // Progress exists: go on with the next month.
    const m = p.nextMonth;
    step = {
      eyebrow: t.nextResumeEyebrow, title: m.name, covers: m.covers,
      meta: fmt(t.nextResumeMeta, { photos: plural(t, 'photos', m.photos), pct: pctText }),
      button: fmt(t.nextResumeButton, { month: m.name }), onGo: () => p.onMonth(m.key),
      more: { label: t.nextAllMonths, onClick: p.onMonths },
    };
  } else if (kind === 'later') {
    // Photos put off in a review wait for a decision.
    step = {
      eyebrow: t.nextLaterEyebrow, title: t.laterCard, covers: p.later.cover ? [p.later.cover] : [],
      meta: fmt(t.nextLaterMeta, { photos: plural(t, 'photos', p.later.count) }), button: t.nextLaterButton, onGo: p.onLater,
    };
  } else if (kind === 'category') {
    // A good place to start: the category that frees the most.
    const top = cats[0];
    step = {
      eyebrow: t.nextStartEyebrow, title: top.label, covers: top.covers,
      meta: categoryMeta(t, top),
      button: t.nextCategoryButton, onGo: top.onClick,
    };
  } else if (kind === 'start' && p.nextMonth) {
    // Nothing found to clean up: month by month, the newest first.
    const m = p.nextMonth;
    step = {
      eyebrow: t.monthsCard, title: m.name, covers: m.covers, meta: t.nextMonthsStartMeta,
      button: fmt(t.nextMonthsStartButton, { month: m.name }), onGo: () => p.onMonth(m.key),
      more: { label: t.nextAllMonths, onClick: p.onMonths },
    };
  }

  /* -------------------------------------------------------------- the rest */

  const tools: { key: string; label: string; value: string; cover?: string; icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; hue: string; onClick: () => void }[] = [
    { key: 'large', label: t.largeTile, value: p.large.count ? fmt(t.sizeAndCount, { size: bytes(t, p.large.bytes), count: plural(t, 'files', p.large.count) }) : plural(t, 'files', 0), cover: p.large.cover, icon: FileVideo, hue: 'stone', onClick: p.onLarge },
    ...(p.compress.count > 0 ? [{ key: 'compress', label: t.compressPhotosTile, value: fmt(t.upTo, { size: bytes(t, p.compress.saving) }), cover: p.compress.cover, icon: Minimize2, hue: 'sky', onClick: p.onCompress }] : []),
    ...(p.liveCount > 0 ? [{ key: 'live', label: t.liveTile, value: plural(t, 'photos', p.liveCount), cover: p.liveCover, icon: Aperture, hue: 'mint', onClick: p.onLive }] : []),
    ...(p.apps ? [{ key: 'apps', label: t.appsTile, value: bytes(t, p.apps.bytes), cover: p.apps.cover, icon: MessageCircle, hue: 'lilac', onClick: p.onApps }] : []),
  ];
  const showLater = p.later.count > 0 && kind !== 'later';
  const showMonths = p.months.total > 0 && kind !== 'month' && kind !== 'start';

  // A short greeting by the time of day — no name: there is no account.
  const greeting = { morning: t.greetMorning, day: t.greetDay, evening: t.greetEvening }[greetingAt(new Date().getHours())];

  const link = 'min-h-tap inline-flex items-center text-label font-semibold text-accent rounded-full focus-visible:ring-focus';

  return (
    <Screen
      title={greeting}
      eyebrow={t.tabClean}
      subtitle={has ? fmt(t.homeSub, { files: plural(t, 'files', p.photoCount!) }) : undefined}
      tabbed
      actions={<>
        {has && (
          <IconButton
            label={rescanLabel} icon={RefreshCw} tone="bar" disabled={p.scan.running}
            className={p.scan.running ? '[&>svg]:motion-safe:animate-spin' : ''}
            onClick={() => { if (!p.scan.running) setAskRescan(true); }}
          />
        )}
        {p.onSearch && <IconButton label={t.searchOpen} icon={Search} tone="bar" onClick={p.onSearch} />}
        <IconButton label={t.settings} icon={Settings} tone="bar" onClick={p.onSettings} />
      </>}
    >
      {p.access === 'limited' && (
        <section className="rounded-md card p-4">
          <div className="flex items-center gap-3">
            <IconTile icon={ImagePlus} hue="sky" />
            <p className="flex-1 min-w-0 text-label text-fg wrap-prose">{t.limitedBanner}</p>
          </div>
          <Button full variant="secondary" className="mt-3 !shadow-none glass-flat" onClick={p.onAddPhotos}>{t.addPhotos}</Button>
        </section>
      )}

      {(bigScan || aiPass) && <ScanCard t={t} scan={p.scan} first={firstScan} />}

      {/* The facts are still being read: the page's shape, quietly, instead of blank space. */}
      {!loaded && !bigScan && !aiPass && <HomeSkeleton label={t.loading} />}

      {loaded && p.photoCount === 0 && !p.scan.running && (
        <Empty title={t.emptyLibraryTitle} body={t.emptyLibraryBody} />
      )}

      {/* The one next step first: the obvious thing to do. Then what waits to be confirmed, then the overview. */}
      {has && step && <NextStep step={step} />}

      {has && p.bin.count > 0 && (
        <section aria-labelledby="aside-h">
          <SectionHead id="aside-h" title={t.binTitle} />
          <AsideCard t={t} bin={p.bin} onClick={p.onBin} />
        </section>
      )}

      {has && summary && (
        <CleanupCard
          t={t} summary={summary} bar={bar} library={p.analysis} storage={p.storage} freedBytes={p.freedBytes}
          onOpen={p.onCleanup} onPhotos={p.onMonths} onVideos={p.onVideos}
        />
      )}

      {has && (cats.length > 0 || done.length > 0) && (
        <section aria-labelledby="found-h">
          <SectionHead
            id="found-h" title={t.suggestionsTitle}
            action={summary && <button type="button" onClick={() => { tapLight(); p.onCleanup(); }} className={link}>{t.suggestionsAll}</button>}
          />
          {cats.length > 0 && (
            <Group footer={analysing ? t.suggestionsPartial : undefined}>
              {cats.map(c => (
                <Row
                  key={c.key} onClick={c.onClick} label={c.label} sub={countOf(c)}
                  ariaLabel={[c.label, countOf(c), c.gain.bytes > 0 ? bytes(t, c.gain.bytes) : null].filter(Boolean).join(', ')}
                  leading={c.covers.length ? <RowPhoto id={c.covers[0]} second={c.covers[1]} /> : <IconTile icon={c.icon} hue={c.hue} />}
                  lead={c.covers.length ? 48 : undefined}
                  trailing={
                    <span className="shrink-0 flex items-center gap-1.5">
                      {c.gain.bytes > 0 && <span className="text-body font-bold text-fg num">{bytes(t, c.gain.bytes)}</span>}
                      <ChevronRight className="w-5 h-5 text-fg-faint rtl:rotate-180" aria-hidden="true" />
                    </span>
                  }
                />
              ))}
            </Group>
          )}
          {done.length > 0 && (
            <p className="mt-[12px] px-1 flex items-start gap-2 text-label text-fg-mute wrap-prose">
              <Check className="w-4 h-4 mt-0.5 shrink-0 text-keep" strokeWidth={3} aria-hidden="true" />
              <span>{fmt(t.doneCategories, { list: done.join(', ') })}</span>
            </p>
          )}
        </section>
      )}

      {has && (showLater || showMonths) && (
        <section aria-labelledby="continue-h">
          <SectionHead id="continue-h" title={t.continueTitle} />
          <Group>
            {showLater && (
              <Row
                label={t.laterCard} sub={`${plural(t, 'photos', p.later.count)} · ${t.laterCardBody}`} onClick={p.onLater}
                leading={p.later.cover ? <RowPhoto id={p.later.cover} /> : <IconTile icon={Clock} hue="sand" />} lead={p.later.cover ? 48 : undefined}
                trailing={<Next />}
              />
            )}
            {showMonths && (
              <Row
                label={t.monthsCard} onClick={p.onMonths}
                sub={
                  <span className="flex items-center gap-2.5">
                    <span className="num">{fmt(t.progressDone, { pct: pctText })}</span>
                    <span className="block flex-1 max-w-[120px]"><Progress thin value={p.months.pct / 100} label={fmt(t.progressDone, { pct: pctText })} /></span>
                  </span>
                }
                leading={<IconTile icon={CalendarDays} hue="mint" />}
                trailing={<Next />}
              />
            )}
          </Group>
        </section>
      )}

      {has && (p.memories.onThisDay || p.memories.trip) && (
        <section aria-labelledby="memories-h">
          <SectionHead
            id="memories-h" title={t.memoriesTitle}
            action={<button type="button" onClick={() => { tapLight(); p.onOrganize(); }} className={link}>{t.tabOrganize}</button>}
          />
          <div className="grid grid-cols-2 gap-[12px]">
            {p.memories.onThisDay && (
              <MemoryTile
                cover={p.memories.onThisDay.cover} title={t.onThisDay} onClick={p.onOnThisDay}
                sub={fmt(t.onThisDayBody, { photos: plural(t, 'photos', p.memories.onThisDay.photos), years: p.memories.onThisDay.years.slice(0, 3).join(', ') })}
              />
            )}
            {p.memories.trip && (
              <MemoryTile
                cover={p.memories.trip.cover} title={p.memories.trip.title} onClick={() => p.onTrip(p.memories.trip!.key)}
                sub={`${t.latestTrip} · ${plural(t, 'photos', p.memories.trip.photos)}`}
              />
            )}
          </div>
        </section>
      )}

      {has && (
        <section aria-labelledby="tools-h">
          <SectionHead id="tools-h" title={t.moreSpaceTitle} />
          <Group>
            {tools.map(x => (
              <Row
                key={x.key} label={x.label} sub={x.value} onClick={x.onClick}
                leading={x.cover ? <RowPhoto id={x.cover} /> : <IconTile icon={x.icon} hue={x.hue} />} lead={x.cover ? 48 : undefined}
                trailing={<Next />}
              />
            ))}
          </Group>
        </section>
      )}

      {has && (
        <Group>
          <Row
            label={t.protectedRow}
            sub={fmt(t.protectedRowSub, { albums: plural(t, 'albums', p.protection.albums), trips: plural(t, 'trips', p.protection.trips), photos: plural(t, 'photos', p.protection.photos) })}
            leading={<IconTile icon={Shield} hue="mint" />} trailing={<Next />} onClick={p.onProtected}
          />
        </Group>
      )}
      <Confirm
        open={askRescan} title={t.rescanAllTitle} body={t.rescanAllBody}
        confirmLabel={t.rescan} cancelLabel={t.cancel}
        onConfirm={() => { setAskRescan(false); p.onRescan(); }} onCancel={() => setAskRescan(false)}
      />
    </Screen>
  );
}

/** Home while the facts load: the next step's card and a few rows as soft shapes. */
function HomeSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} className="space-y-6 skeleton">
      <div className="rounded-lg card overflow-hidden">
        <div className="aspect-[16/9] bg-surface-2" />
        <div className="p-5 space-y-3">
          <div className="h-3 w-24 rounded-full bg-surface-2" />
          <div className="h-5 w-48 rounded-full bg-surface-2" />
          <div className="h-12 rounded-full bg-surface-2" />
        </div>
      </div>
      <div className="rounded-md card p-4 space-y-4">
        {[0, 1, 2].map(i => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-[11px] bg-surface-2" />
            <div className="flex-1 space-y-2"><div className="h-3.5 w-32 rounded-full bg-surface-2" /><div className="h-3 w-20 rounded-full bg-surface-2" /></div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** A row's photo in front of its label (48 px, soft corners); with a second photo, a small stack. */
function RowPhoto({ id, second }: { id: string; second?: string }) {
  if (!second) return <span className="w-12 h-12 shrink-0 rounded-[11px] overflow-hidden" aria-hidden="true"><Thumb id={id} className="!rounded-none" /></span>;
  return (
    <span className="relative w-12 h-12 shrink-0" aria-hidden="true">
      <span className="absolute top-0 end-0 w-10 h-10 rounded-[10px] overflow-hidden opacity-70"><Thumb id={second} className="!rounded-none" /></span>
      <span className="absolute bottom-0 start-0 w-10 h-10 rounded-[10px] overflow-hidden ring-2 ring-surface"><Thumb id={id} className="!rounded-none" /></span>
    </span>
  );
}

/**
 * "Zum Löschen vorgemerkt", a section of its own: the photos set aside in a strip (they
 * are not deleted yet — the card says so), what they hold, and a tap opens
 * them to put some back or to delete them for real.
 */
function AsideCard({ t, bin, onClick }: { t: Strings; bin: Props['bin']; onClick: () => void }) {
  const shown = bin.covers.slice(0, 4);
  const more = bin.count - shown.length;
  const line = `${plural(t, 'photos', bin.count)} · ${bytes(t, bin.bytes)}`;
  return (
    <button
      type="button" data-tip="tip.bin" onClick={() => { tapLight(); onClick(); }} aria-label={`${t.binTitle}: ${line}. ${t.binCardBody}`}
      className="w-full rounded-md card p-3 text-start press focus-visible:ring-focus"
    >
      <span className="grid grid-cols-4 gap-[4px]" aria-hidden="true">
        {shown.map((id, i) => (
          <span key={id} className="relative aspect-square rounded-[10px] overflow-hidden">
            <Thumb id={id} className="!rounded-none" />
            {i === shown.length - 1 && more > 0 && (
              <span className="absolute inset-0 bg-veil text-on-color text-label font-bold num inline-flex items-center justify-center">+{num(t, more)}</span>
            )}
          </span>
        ))}
      </span>
      <span className="flex items-center gap-3 px-1 pt-3 pb-0.5">
        <span className="min-w-0 flex-1">
          <span className="block text-body font-semibold text-fg num">{line}</span>
          <span className="block text-caption text-fg-mute wrap-prose">{t.binCardBody}</span>
        </span>
        <ChevronRight className="w-5 h-5 text-fg-faint shrink-0 rtl:rotate-180" aria-hidden="true" />
      </span>
    </button>
  );
}

/**
 * The one next step: its photos on top, edge to edge (one large and two
 * small when there are three), then what it is, one line of why, and one
 * button — a quieter link under it where there is a broader way in.
 */
function NextStep({ step }: { step: Step }) {
  const ids = step.covers.slice(0, 3);
  const layout = ids.length >= 3 ? 'grid-cols-[2fr_1fr] grid-rows-2 [&>*:first-child]:row-span-2' : ids.length === 2 ? 'grid-cols-2' : 'grid-cols-1';
  return (
    <section className="rounded-lg card overflow-hidden" aria-labelledby="next-h">
      {ids.length > 0 && (
        <div className={`aspect-[16/9] grid gap-[2px] ${layout}`} aria-hidden="true">
          {ids.map((id, i) => <Thumb key={id} id={id} size={i === 0 ? LARGE : undefined} className="!rounded-none" />)}
        </div>
      )}
      <div className="p-5">
        <p className="eyebrow text-fg-mute">{step.eyebrow}</p>
        <h2 id="next-h" className="title-face text-title2 font-bold text-fg mt-0.5 wrap-compound">{step.title}</h2>
        <p className="text-label text-fg-mute mt-1 num wrap-prose">{step.meta}</p>
        <Button full size="lg" className="mt-4" onClick={step.onGo}>{step.button}</Button>
        {step.more && <Button full variant="ghost" className="mt-1" onClick={step.more.onClick}>{step.more.label}</Button>}
      </div>
    </section>
  );
}

/** A small photo tile with its name and a line under it, as Photos lays out its collections. */
function MemoryTile({ cover, title, sub, onClick }: { cover: string; title: string; sub: string; onClick: () => void }) {
  return (
    <button type="button" onClick={() => { tapLight(); onClick(); }} className="block text-start rounded-md press focus-visible:ring-focus">
      <span className="block aspect-[4/3] rounded-md overflow-hidden"><Thumb id={cover} className="!rounded-none" /></span>
      <span className="block px-1 pt-2 text-label font-semibold text-fg wrap-compound">{title}</span>
      <span className="block px-1 text-caption text-fg-mute num wrap-prose">{sub}</span>
    </button>
  );
}

/**
 * A scan, without taking over the screen: what it does, how far it is and
 * about how long it still takes, on one slim card above home — the rest of
 * home stays usable and fills in while it runs.
 */
function ScanCard({ t, scan, first }: { t: Strings; scan: ScanView; first: boolean }) {
  const counting = scan.phase === 'list' || scan.total === 0;
  const ai = scan.phase === 'ai';
  const where = counting ? t.scanList
    : ai ? fmt(t.scanAi, { done: num(t, scan.done), total: num(t, scan.total) })
      : fmt(t.scanAnalyse, { done: num(t, scan.done), total: num(t, scan.total) });
  const eta = counting ? '' : etaText(t, scan.left);
  const line = [where, eta].filter(Boolean).join(' · ');
  return (
    <section className="rounded-md card p-4 space-y-3" aria-live="polite" aria-atomic="true">
      <div className="flex items-center gap-3">
        <IconTile icon={Sparkles} hue="mint" />
        <div className="min-w-0 flex-1">
          <p className="text-label font-bold text-fg wrap-compound">{ai ? t.scanAiTitle : t.scanTitle}</p>
          <p className="text-caption text-fg-mute num wrap-prose">{line}</p>
        </div>
      </div>
      <Progress value={counting ? null : scan.done / scan.total} label={line} />
      {first && <p className="text-caption text-fg-mute wrap-prose">{t.scanFirstHint}</p>}
    </section>
  );
}

/**
 * What the library holds, inside the clean-up card: one row for photos and
 * one for videos, each with how many were scanned, how many are good (not
 * marked for deleting) and how many could go — three columns under one quiet
 * header, as a table. A row opens all its photos (month by month) or all its
 * videos.
 */
function LibraryTable({ t, library, marked, onPhotos, onVideos }: {
  t: Strings; library: Props['analysis'];
  /** What the card counts for deleting, photos apart from videos. */
  marked: CleanupSummary['media'];
  onPhotos: () => void; onVideos: () => void;
}) {
  const rows: { key: string; label: string; icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; hue: string; all: Stat; gone: Stat; onClick: () => void }[] = [
    { key: 'photos', label: t.statPhotos, icon: ImageIcon, hue: 'pink', all: library.photos, gone: marked.photos, onClick: onPhotos },
    ...(library.videos.count > 0 ? [{ key: 'videos', label: t.statVideos, icon: FileVideo, hue: 'sand', all: library.videos, gone: marked.videos, onClick: onVideos }] : []),
  ];
  const cols = 'grid grid-cols-[minmax(0,1fr)_repeat(3,minmax(3.5rem,auto))] gap-x-3 items-center';
  return (
    <div role="group" aria-label={t.analysisTitle} className="-mx-2">
      <div className={`${cols} px-2 pb-1 text-caption font-semibold text-fg-mute`} aria-hidden="true">
        <span />
        <span className="text-center">{t.statScanned}</span>
        <span className="text-center">{t.statGood}</span>
        <span className="text-center">{t.statCouldGo}</span>
      </div>
      {rows.map(r => {
        const good = Math.max(0, r.all.count - r.gone.count);
        const label = `${r.label}: ${t.statScanned} ${num(t, r.all.count)}, ${t.statGood} ${num(t, good)}, ${t.statCouldGo} ${num(t, r.gone.count)}`;
        return (
          <button
            key={r.key} type="button" onClick={() => { tapLight(); r.onClick(); }} aria-label={label}
            className={`${cols} w-full min-h-tap rounded-sm px-2 py-1.5 text-start press active:bg-surface-2 focus-visible:ring-focus`}
          >
            <span className="min-w-0 flex items-center gap-2.5">
              <IconTile icon={r.icon} hue={r.hue} />
              <span className="min-w-0 text-label font-semibold text-fg leading-tight wrap-compound">{r.label}</span>
            </span>
            <span className="text-center text-body font-bold text-fg num">{num(t, r.all.count)}</span>
            <span className="text-center text-body font-bold text-keep num">{num(t, good)}</span>
            <span className={`text-center text-body font-bold num ${r.gone.count > 0 ? 'text-fg' : 'text-fg-mute'}`}>{num(t, r.gone.count)}</span>
          </button>
        );
      })}
    </div>
  );
}

/**
 * The card at the top of Aufräumen: the space that could be freed and how
 * much of it is photos and how much videos, a bar of the whole library — one
 * segment per category that could go, then the good photos and the good
 * videos, paler — and its legend, then the table of photos and videos (scanned,
 * good, could go), the free space and the button.
 */
function CleanupCard({ t, summary, bar, library, storage, freedBytes, onOpen, onPhotos, onVideos }: {
  t: Strings; summary: CleanupSummary; bar: { key: string; hue: string; bytes: number; label: string }[];
  library: Props['analysis']; storage: Storage | null; freedBytes: number;
  onOpen: () => void; onPhotos: () => void; onVideos: () => void;
}) {
  const table = (
    <div className="mt-5 pt-3 border-t border-hairline">
      <LibraryTable t={t} library={library} marked={summary.media} onPhotos={onPhotos} onVideos={onVideos} />
    </div>
  );
  const facts = (
    <>
      {storage && <p className="text-caption text-fg-mute num mt-3">{fmt(t.storageFree, { free: bytes(t, storage.free), total: bytes(t, storage.total) })}</p>}
      {freedBytes > 0 && (
        <p className="flex flex-wrap gap-1.5 mt-2.5">
          <span className="rounded-full bg-keep-dim text-keep text-caption font-bold num px-2.5 py-1">{fmt(t.freedSoFar, { size: bytes(t, freedBytes) })}</span>
        </p>
      )}
    </>
  );
  if (summary.total.count === 0) {
    return (
      <section className="rounded-lg card p-6">
        <span className="w-12 h-12 rounded-full bg-keep text-keep-ink sheen inline-flex items-center justify-center mb-3" aria-hidden="true">
          <Check className="w-6 h-6" strokeWidth={2.8} />
        </span>
        <p className="title-face text-title2 font-bold text-fg">{t.cleanupNone}</p>
        <p className="text-label text-fg-mute mt-1 wrap-prose">{t.cleanupNoneBody}</p>
        {table}
        {facts}
      </section>
    );
  }
  const { media } = summary;
  // The good part of the library, paler, after what could go: the bar is the whole library.
  const good = [
    { key: 'goodPhotos', hue: 'pink', soft: true, bytes: Math.max(0, library.photos.bytes - media.photos.bytes), label: t.goodPhotos },
    { key: 'goodVideos', hue: 'sand', soft: true, bytes: Math.max(0, library.videos.bytes - media.videos.bytes), label: t.goodVideos },
  ];
  const shown = [...bar, ...good].filter(b => b.bytes > 0);
  return (
    <section className="rounded-lg card p-6" aria-labelledby="cleanup-h">
      <p id="cleanup-h" className="text-label font-semibold text-fg-mute">{t.cleanupCard}</p>
      <p className="text-display text-fg mt-1"><BigNumber text={bytes(t, summary.total.bytes)} /></p>
      <div className="mt-1 mb-5 text-label text-fg-mute num space-y-0.5">
        <p>{fmt(t.freeLinePhotos, { size: bytes(t, media.photos.bytes), total: bytes(t, library.photos.bytes) })}</p>
        {library.videos.count > 0 && <p>{fmt(t.freeLineVideos, { size: bytes(t, media.videos.bytes), total: bytes(t, library.videos.bytes) })}</p>}
      </div>
      <StorageBar parts={shown} label={fmt(t.storageBarLabel, { list: shown.map(b => `${b.label} ${bytes(t, b.bytes)}`).join(', ') })} />
      {/* The bar's legend, as in iPhone Storage: a dot and a name per segment. */}
      <ul className="flex flex-wrap gap-x-3.5 gap-y-1 mt-2.5" aria-hidden="true">
        {shown.map(b => (
          <li key={b.key} className="inline-flex items-center gap-1.5 text-caption text-fg-mute">
            <span data-hue={b.hue} className={`w-2 h-2 rounded-full bg-hue-solid ${'soft' in b ? 'opacity-40' : ''}`} />{b.label}
          </li>
        ))}
      </ul>
      {table}
      {facts}
      {/* Quieter than the next step below: the one prominent action on home is that card's. */}
      <Button full variant="secondary" className="mt-5 !shadow-none glass-flat" onClick={onOpen}>{t.cleanupButton}</Button>
    </section>
  );
}
