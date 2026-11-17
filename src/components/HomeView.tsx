import type React from 'react';
import { Aperture, CalendarDays, Check, Clock, FileVideo, ImagePlus, MessageCircle, Minimize2, RefreshCw, Search, Settings, Shield, Sparkles } from 'lucide-react';
import type { CleanupSummary, Storage } from '../types';
import type { Access } from '../native/photoLibrary';
import type { ScanView } from '../store';
import { Strings, ago, bytes, fmt, num, percent, plural } from '../translations';
import { Empty, Group, IconTile, Next, Row, Screen, SectionHead } from '../ui/Screen';
import { Button, IconButton } from '../ui/Button';
import { BigNumber, Progress } from '../ui/Controls';
import { StorageBar } from '../ui/StorageBar';
import { tapLight } from '../ui/haptics';
import { Thumb } from '../ui/Photo';

/** The categories that suggest photos to delete, each a photo card on home. */
export type FoundKey = 'duplicates' | 'similar' | 'failed' | 'screenshots' | 'utility';

/** One category: how many of it there are (groups or photos, as its screen counts), and a few of its photos. */
export interface Found { items: number; covers: string[] }

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
  streak: number;
  /** Months gone through, and the share of all photos in them (src/logic/months.ts progress). */
  months: { done: number; total: number; pct: number };
  /** The decide-later pile (photos swiped up in a review). */
  later: { count: number; cover?: string };
  /** How much is protected (src/logic/protect.ts): never suggested for deleting. */
  protection: { albums: number; trips: number; photos: number };
  onLater: () => void;
  onProtected: () => void;
  onRescan: () => void;
  onSettings: () => void;
  /** Suchen (src/components/SearchView.tsx): find photos by words, then go through them. */
  onSearch?: () => void;
  onAddPhotos: () => void;
  onCleanup: () => void;
  onSimilar: () => void;
  onBlurry: () => void;
  onDuplicates: () => void;
  onScreenshots: () => void;
  onUtility: () => void;
  onMonths: () => void;
  onLarge: () => void;
  onLive: () => void;
  onCompress: () => void;
  onApps: () => void;
}

/**
 * Home, the "Aufräumen" tab: the space that could be freed and where it comes
 * from (one bar), then every category as a card with its own photos — the
 * most space first — then the tools that make room without deleting, then
 * what was left half done; at the end what is kept safe and a fresh scan.
 */
export function HomeView(p: Props) {
  const { t, summary } = p;
  const firstScan = p.scan.running && !p.scan.lastScanAt;
  const loaded = p.photoCount !== null;
  const has = loaded && p.photoCount! > 0;
  // A rescan that only looks at a few new photos stays quiet: the card is for a first scan or a long one.
  const bigScan = p.scan.running && (firstScan || (p.scan.phase === 'analyse' && p.scan.total - p.scan.done > 50));
  // The AI's pass (docs/AI.md) runs after the scan and can take long: the app stays usable, the subtitle counts along.
  const aiPass = p.scan.running && p.scan.phase === 'ai' && p.scan.total > 0;
  const scanLine = aiPass ? fmt(t.scanAi, { done: num(t, p.scan.done), total: num(t, p.scan.total) }) : t.scanUpdating;
  const subtitle = loaded && !(p.photoCount === 0 && p.scan.running)
    ? [plural(t, 'photos', p.photoCount!), p.scan.running && !bigScan ? scanLine : null]
      .filter(Boolean).join(' · ')
    : t.loading;

  // The categories, each with the space it would free (from the summary, so the bar and the cards agree).
  const gain = (k: FoundKey) => {
    if (!summary) return { bytes: 0, count: 0 };
    switch (k) {
      case 'duplicates': return { bytes: summary.duplicates.bytes + summary.lookalike.bytes, count: summary.duplicates.count + summary.lookalike.count };
      case 'similar': return summary.similar;
      case 'failed': return { bytes: summary.blurry.bytes + summary.exposure.bytes, count: summary.blurry.count + summary.exposure.count };
      case 'screenshots': return summary.screenshots;
      case 'utility': return summary.utility;
    }
  };
  const meta: Record<FoundKey, { label: string; hue: string; unit: 'groups' | 'photos'; onClick: () => void }> = {
    duplicates: { label: t.duplicatesTile, hue: 'rose', unit: 'groups', onClick: p.onDuplicates },
    similar: { label: t.similarTile, hue: 'lilac', unit: 'groups', onClick: p.onSimilar },
    failed: { label: t.failedTile, hue: 'sand', unit: 'photos', onClick: p.onBlurry },
    screenshots: { label: t.screenshotsTile, hue: 'sky', unit: 'photos', onClick: p.onScreenshots },
    utility: { label: t.utilityTile, hue: 'mint', unit: 'photos', onClick: p.onUtility },
  };
  const keys = (Object.keys(meta) as FoundKey[]).filter(k => p.found[k]);
  const cards = keys.filter(k => p.found[k]!.items > 0)
    .map(k => ({ key: k, ...meta[k], ...p.found[k]!, gain: gain(k) }))
    .sort((a, b) => b.gain.bytes - a.gain.bytes || b.items - a.items);
  const done = keys.filter(k => p.found[k]!.items === 0).map(k => meta[k].label);
  const bar = keys.map(k => ({ key: k, hue: meta[k].hue, bytes: gain(k).bytes, label: meta[k].label }));

  const tools: { key: string; label: string; value: string; cover?: string; icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; hue: string; onClick: () => void }[] = [
    { key: 'large', label: t.largeTile, value: p.large.count ? fmt(t.sizeAndCount, { size: bytes(t, p.large.bytes), count: plural(t, 'files', p.large.count) }) : plural(t, 'files', 0), cover: p.large.cover, icon: FileVideo, hue: 'stone', onClick: p.onLarge },
    ...(p.compress.count > 0 ? [{ key: 'compress', label: t.compressPhotosTile, value: fmt(t.upTo, { size: bytes(t, p.compress.saving) }), cover: p.compress.cover, icon: Minimize2, hue: 'sky', onClick: p.onCompress }] : []),
    ...(p.liveCount > 0 ? [{ key: 'live', label: t.liveTile, value: plural(t, 'photos', p.liveCount), cover: p.liveCover, icon: Aperture, hue: 'mint', onClick: p.onLive }] : []),
    ...(p.apps ? [{ key: 'apps', label: t.appsTile, value: bytes(t, p.apps.bytes), cover: p.apps.cover, icon: MessageCircle, hue: 'lilac', onClick: p.onApps }] : []),
  ];

  return (
    <Screen
      title={t.tabClean}
      subtitle={subtitle}
      tabbed
      actions={<>
        {p.onSearch && <IconButton label={t.searchOpen} icon={Search} tone="bar" onClick={p.onSearch} />}
        <IconButton label={t.settings} icon={Settings} tone="bar" onClick={p.onSettings} />
      </>}
    >
      {p.access === 'limited' && (
        <section className="rounded-md card p-4">
          <div className="flex items-center gap-3">
            <span data-hue="sky" className="w-10 h-10 shrink-0 rounded-[12px] bg-hue-solid text-on-color sheen !shadow-none inline-flex items-center justify-center" aria-hidden="true">
              <ImagePlus className="w-5 h-5" />
            </span>
            <p className="flex-1 min-w-0 text-label text-fg wrap-prose">{t.limitedBanner}</p>
          </div>
          <Button full variant="secondary" className="mt-3 !shadow-none glass-flat" onClick={p.onAddPhotos}>{t.addPhotos}</Button>
        </section>
      )}

      {(bigScan || !loaded) && <ScanCard t={t} scan={p.scan} first={firstScan || !loaded} />}

      {loaded && p.photoCount === 0 && !p.scan.running && (
        <Empty title={t.emptyLibraryTitle} body={t.emptyLibraryBody} />
      )}

      {has && summary && (
        <CleanupCard t={t} summary={summary} bar={bar} storage={p.storage} freedBytes={p.freedBytes} streak={p.streak} onOpen={p.onCleanup} />
      )}

      {has && (cards.length > 0 || done.length > 0) && (
        <section aria-labelledby="found-h">
          <SectionHead id="found-h" title={t.suggestionsTitle} />
          {cards.length > 0 && (
            <div className="grid grid-cols-2 gap-[12px]">
              {cards.map((c, i) => (
                <PhotoCard
                  // An odd last card takes the whole row, wider and lower, so the grid never ends on a gap.
                  wide={i === cards.length - 1 && cards.length % 2 === 1}
                  key={c.key} hue={c.hue} label={c.label} covers={c.covers} onClick={c.onClick}
                  value={c.gain.bytes > 0 ? bytes(t, c.gain.bytes) : plural(t, c.unit, c.items)}
                  sub={c.gain.bytes > 0 ? plural(t, 'photos', c.gain.count) : undefined}
                />
              ))}
            </div>
          )}
          {done.length > 0 && (
            <p className="mt-[12px] rounded-md card px-4 py-3 flex items-center gap-2.5 text-label text-fg-mute wrap-prose">
              <span className="w-6 h-6 shrink-0 rounded-full bg-keep-dim text-keep inline-flex items-center justify-center" aria-hidden="true">
                <Check className="w-3.5 h-3.5" strokeWidth={3} />
              </span>
              {fmt(t.doneCategories, { list: done.join(', ') })}
            </p>
          )}
        </section>
      )}

      {has && (
        <section aria-labelledby="tools-h">
          <SectionHead id="tools-h" title={t.moreSpaceTitle} />
          <Group>
            {tools.map(x => (
              <Row
                key={x.key} label={x.label} sub={x.value} onClick={x.onClick}
                leading={x.cover ? <RowPhoto id={x.cover} /> : <IconTile icon={x.icon} hue={x.hue} />} lead={x.cover ? 44 : undefined}
                trailing={<Next />}
              />
            ))}
          </Group>
        </section>
      )}

      {has && (p.later.count > 0 || p.months.total > 0) && (
        <section aria-labelledby="continue-h">
          <SectionHead id="continue-h" title={t.continueTitle} />
          <Group>
            {p.later.count > 0 && (
              <Row
                label={t.laterCard} sub={t.laterCardBody} onClick={p.onLater}
                ariaLabel={`${t.laterCard} (${num(t, p.later.count)})`}
                leading={p.later.cover ? <RowPhoto id={p.later.cover} /> : <IconTile icon={Clock} hue="sand" />} lead={p.later.cover ? 44 : undefined}
                trailing={<Next value={num(t, p.later.count)} />}
              />
            )}
            {p.months.total > 0 && (
              <Row
                label={t.monthsCard} onClick={p.onMonths}
                sub={
                  <span className="flex items-center gap-2.5">
                    <span className="num">{fmt(t.progressDone, { pct: percent(t, p.months.pct) })}</span>
                    <span className="block flex-1 max-w-[120px]"><Progress thin value={p.months.pct / 100} label={fmt(t.progressDone, { pct: percent(t, p.months.pct) })} /></span>
                  </span>
                }
                leading={<IconTile icon={CalendarDays} hue="mint" />}
                trailing={<Next />}
              />
            )}
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
          {!p.scan.running && (
            <Row
              label={t.rescan} sub={p.scan.lastScanAt ? fmt(t.lastScan, { when: ago(t, p.scan.lastScanAt, Date.now()) }) : undefined}
              leading={<IconTile icon={RefreshCw} hue="lilac" />} onClick={p.onRescan}
            />
          )}
        </Group>
      )}
    </Screen>
  );
}

/** A row's photo in front of its label (44 px, soft corners). */
function RowPhoto({ id }: { id: string }) {
  return <span className="w-11 h-11 shrink-0 rounded-[10px] overflow-hidden" aria-hidden="true"><Thumb id={id} className="!rounded-none" /></span>;
}

/**
 * A category as a card made of its own photos (one, two side by side, one
 * large and two small, or four), edge to edge, as the collections in Photos:
 * its name with its dot — the hue of its segment in the bar above — and the
 * space it would free lie on a shade at the foot of the photos.
 */
function PhotoCard({ hue, label, value, sub, covers, wide, onClick }: {
  hue: string; label: string; value: string; sub?: string; covers: string[]; wide?: boolean; onClick: () => void;
}) {
  const ids = covers.slice(0, 4);
  const layout = ids.length >= 4 ? 'grid-cols-2 grid-rows-2'
    : ids.length === 3 ? 'grid-cols-2 grid-rows-2 [&>*:first-child]:row-span-2'
      : ids.length === 2 ? 'grid-cols-2' : 'grid-cols-1';
  return (
    <button
      type="button" onClick={() => { tapLight(); onClick(); }}
      className={`relative block rounded-md overflow-hidden bg-surface text-start press focus-visible:ring-focus ${wide ? 'col-span-2 aspect-[2/1]' : 'aspect-[4/5]'}`}
    >
      <span data-hue={hue} className={`absolute inset-0 grid gap-[2px] ${ids.length ? '' : 'bg-hue-bg'} ${layout}`} aria-hidden="true">
        {ids.map(id => <Thumb key={id} id={id} className="!rounded-none" />)}
      </span>
      <span className="absolute inset-0 photo-shade" aria-hidden="true" />
      <span className="absolute inset-x-0 bottom-0 px-3.5 pb-3 pt-6 text-on-color">
        <span className="flex items-center gap-1.5 text-label font-semibold">
          <span data-hue={hue} className="w-2.5 h-2.5 rounded-full bg-hue-solid ring-[1.5px] ring-on-color shrink-0" aria-hidden="true" />
          <span className="min-w-0 wrap-compound">{label}</span>
        </span>
        <span className="block num mt-0.5 leading-tight">
          <span className="display text-title2">{value}</span>
          {sub && <span className="text-caption font-semibold opacity-90"> · {sub}</span>}
        </span>
      </span>
    </button>
  );
}

function ScanCard({ t, scan, first }: { t: Strings; scan: ScanView; first: boolean }) {
  const analysing = scan.phase === 'analyse' && scan.total > 0;
  return (
    <section className="rounded-lg card p-5 space-y-3" aria-live="polite">
      <div className="flex items-center gap-3">
        <span data-hue="mint" className="w-10 h-10 shrink-0 rounded-[12px] bg-hue-solid text-on-color sheen !shadow-none inline-flex items-center justify-center" aria-hidden="true">
          <Sparkles className="w-5 h-5" />
        </span>
        <div className="min-w-0">
          <p className="text-body font-bold text-fg">{t.scanTitle}</p>
          <p className="text-caption text-fg-mute num">
            {analysing ? fmt(t.scanAnalyse, { done: num(t, scan.done), total: num(t, scan.total) }) : t.scanList}
          </p>
        </div>
      </div>
      <Progress value={analysing ? scan.done / scan.total : null} label={t.scanTitle} />
      {first && <p className="text-caption text-fg-mute wrap-prose">{t.scanFirstHint}</p>}
    </section>
  );
}

function CleanupCard({ t, summary, bar, storage, freedBytes, streak, onOpen }: {
  t: Strings; summary: CleanupSummary; bar: { key: string; hue: string; bytes: number; label: string }[];
  storage: Storage | null; freedBytes: number; streak: number; onOpen: () => void;
}) {
  const facts = (
    <>
      {storage && <p className="text-caption text-fg-mute num mt-3">{fmt(t.storageFree, { free: bytes(t, storage.free), total: bytes(t, storage.total) })}</p>}
      {(freedBytes > 0 || streak >= 2) && (
        <p className="flex flex-wrap gap-1.5 mt-2.5">
          {freedBytes > 0 && <span className="rounded-full bg-keep-dim text-keep text-caption font-bold num px-2.5 py-1">{fmt(t.freedSoFar, { size: bytes(t, freedBytes) })}</span>}
          {streak >= 2 && <span className="rounded-full bg-accent-dim text-accent text-caption font-bold num px-2.5 py-1">{fmt(t.streakLine, { n: num(t, streak) })}</span>}
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
        {facts}
      </section>
    );
  }
  const shown = bar.filter(b => b.bytes > 0);
  return (
    <section className="rounded-lg card p-6" aria-labelledby="cleanup-h">
      <p id="cleanup-h" className="text-label font-semibold text-fg-mute">{t.cleanupCard}</p>
      <p className="text-display text-fg mt-1 mb-5"><BigNumber text={bytes(t, summary.total.bytes)} /></p>
      <StorageBar parts={shown} label={fmt(t.storageBarLabel, { list: shown.map(b => `${b.label} ${bytes(t, b.bytes)}`).join(', ') })} />
      {/* The bar's legend, as in iPhone Storage: a dot and a name per segment. */}
      <ul className="flex flex-wrap gap-x-3.5 gap-y-1 mt-2.5" aria-hidden="true">
        {shown.map(b => (
          <li key={b.key} className="inline-flex items-center gap-1.5 text-caption text-fg-mute">
            <span data-hue={b.hue} className="w-2 h-2 rounded-full bg-hue-solid" />{b.label}
          </li>
        ))}
      </ul>
      {facts}
      <Button full size="lg" className="mt-5" onClick={onOpen}>{t.cleanupButton}</Button>
    </section>
  );
}
