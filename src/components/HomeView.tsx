import type React from 'react';
import { Copy, Focus, ImagePlus, MapPin, RefreshCw, Settings, Sparkles } from 'lucide-react';
import type { CleanupSummary, Trip } from '../types';
import type { Access } from '../native/photoLibrary';
import type { ScanView } from '../store';
import { Strings, bytes, fmt, num, plural } from '../translations';
import { Empty, Screen } from '../ui/Screen';
import { Button, IconButton } from '../ui/Button';
import { Progress } from '../ui/Controls';
import { tapLight } from '../ui/haptics';
import { TripCard } from './TripCard';

interface Props {
  t: Strings;
  access: Access | null;
  photoCount: number | null;
  scan: ScanView;
  trips: Trip[];
  hasLocations: boolean;
  summary: CleanupSummary | null;
  groupCount: number;
  blurryCount: number;
  onSettings: () => void;
  onRescan: () => void;
  onAddPhotos: () => void;
  onCleanup: () => void;
  onSimilar: () => void;
  onBlurry: () => void;
  onTrips: () => void;
  onTrip: (key: string) => void;
}

/** How many trips home shows before "All trips". */
const HOME_TRIPS = 4;

export function HomeView(p: Props) {
  const { t } = p;
  const visible = p.trips.filter(x => !x.ignored);
  const firstScan = p.scan.running && !p.scan.lastScanAt;
  const loaded = p.photoCount !== null;
  // A rescan that only looks at a few new photos stays quiet: the card is for a first scan or a long one.
  const bigScan = p.scan.running && (firstScan || (p.scan.phase === 'analyse' && p.scan.total - p.scan.done > 50));
  const subtitle = loaded && !(p.photoCount === 0 && p.scan.running)
    ? [plural(t, 'photos', p.photoCount!), visible.length ? plural(t, 'trips', visible.length) : null, p.scan.running && !bigScan ? t.scanUpdating : null]
      .filter(Boolean).join(' · ')
    : t.loading;

  return (
    <Screen
      title={t.homeTitle}
      eyebrow={<span className="inline-flex items-center gap-2"><img src="/icon.png" alt="" className="w-5 h-5 rounded-[6px]" />{t.appName}</span>}
      subtitle={subtitle}
      actions={<>
        {!p.scan.running && loaded && <IconButton label={t.rescan} icon={RefreshCw} tone="bar" onClick={p.onRescan} />}
        <IconButton label={t.settings} icon={Settings} tone="bar" onClick={p.onSettings} />
      </>}
    >
      {p.access === 'limited' && (
        <section className="rounded-md card p-4 flex items-center gap-3">
          <span data-hue="sky" className="w-10 h-10 shrink-0 rounded-[12px] bg-hue-bg text-hue-ink inline-flex items-center justify-center" aria-hidden="true">
            <ImagePlus className="w-5 h-5" />
          </span>
          <p className="flex-1 min-w-0 text-label text-fg wrap-prose">{t.limitedBanner}</p>
          <Button variant="secondary" onClick={p.onAddPhotos}>{t.addPhotos}</Button>
        </section>
      )}

      {(bigScan || !loaded) && <ScanCard t={t} scan={p.scan} first={firstScan || !loaded} />}

      {loaded && p.photoCount === 0 && !p.scan.running && (
        <Empty title={t.emptyLibraryTitle} body={t.emptyLibraryBody} />
      )}

      {loaded && p.photoCount! > 0 && p.summary && <CleanupCard t={t} summary={p.summary} onOpen={p.onCleanup} />}

      {loaded && p.photoCount! > 0 && (
        <div className="grid grid-cols-2 gap-[12px]">
          <Tile hue="lilac" icon={Copy} label={t.similarTile} value={plural(t, 'groups', p.groupCount)} onClick={p.onSimilar} />
          <Tile hue="sand" icon={Focus} label={t.blurryTile} value={plural(t, 'photos', p.blurryCount)} onClick={p.onBlurry} />
        </div>
      )}

      {loaded && p.photoCount! > 0 && (
        <section aria-labelledby="trips-h">
          <div className="flex items-baseline justify-between px-1 pb-2">
            <h2 id="trips-h" className="display text-title2 font-semibold text-fg">{t.tripsSection}</h2>
            {p.trips.length > HOME_TRIPS && (
              <button type="button" onClick={() => { tapLight(); p.onTrips(); }} className="text-label font-bold text-accent hit-44 focus-visible:ring-focus rounded-full">
                {t.allTrips} ({num(t, p.trips.length)})
              </button>
            )}
          </div>
          {visible.length ? (
            <div className="space-y-[10px]">
              {visible.slice(0, HOME_TRIPS).map(trip => <TripCard key={trip.key} trip={trip} t={t} onOpen={() => p.onTrip(trip.key)} />)}
            </div>
          ) : (
            <div className="rounded-md card p-5 flex gap-3">
              <MapPin className="w-5 h-5 text-fg-mute shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="text-body font-bold text-fg">{t.noTrips}</p>
                <p className="text-label text-fg-mute mt-1 wrap-prose">{p.hasLocations ? t.noTripsBody : t.noLocation}</p>
              </div>
            </div>
          )}
        </section>
      )}
    </Screen>
  );
}

function ScanCard({ t, scan, first }: { t: Strings; scan: ScanView; first: boolean }) {
  const analysing = scan.phase === 'analyse' && scan.total > 0;
  return (
    <section className="rounded-md card p-5 space-y-3" aria-live="polite">
      <div className="flex items-center gap-3">
        <span data-hue="mint" className="w-10 h-10 shrink-0 rounded-[12px] bg-hue-bg text-hue-ink inline-flex items-center justify-center" aria-hidden="true">
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

function CleanupCard({ t, summary, onOpen }: { t: Strings; summary: CleanupSummary; onOpen: () => void }) {
  if (summary.total.count === 0) {
    return (
      <section className="rounded-lg card p-6">
        <p className="display text-title2 font-semibold text-fg">{t.cleanupNone}</p>
        <p className="text-label text-fg-mute mt-1">{t.cleanupNoneBody}</p>
      </section>
    );
  }
  return (
    <section className="rounded-lg card p-6" aria-labelledby="cleanup-h">
      <p id="cleanup-h" className="eyebrow text-fg-mute">{t.cleanupCard}</p>
      <p className="display text-display font-semibold text-fg num mt-1">{bytes(t, summary.total.bytes)}</p>
      <dl className="mt-4 space-y-2">
        <Line label={t.cleanupSimilar} value={plural(t, 'photos', summary.similar.count)} hue="lilac" />
        <Line label={t.cleanupBlurry} value={plural(t, 'photos', summary.blurry.count)} hue="sand" />
      </dl>
      <Button full size="lg" className="mt-5" onClick={onOpen}>{t.cleanupButton}</Button>
    </section>
  );
}

function Line({ label, value, hue }: { label: string; value: string; hue: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span data-hue={hue} className="w-2.5 h-2.5 rounded-full bg-hue-ink shrink-0" aria-hidden="true" />
      <dt className="flex-1 text-label text-fg">{label}</dt>
      <dd className="text-label font-bold text-fg num">{value}</dd>
    </div>
  );
}

function Tile({ hue, icon: Icon, label, value, onClick }: {
  hue: string; icon: React.ComponentType<{ className?: string }>; label: string; value: string; onClick: () => void;
}) {
  return (
    <button type="button" onClick={() => { tapLight(); onClick(); }} data-hue={hue}
      className="rounded-md bg-hue-bg p-4 text-start press focus-visible:ring-focus min-h-[112px] flex flex-col justify-between">
      <Icon className="w-6 h-6 text-hue-ink" aria-hidden="true" />
      <span>
        <span className="block text-body font-bold text-hue-ink">{label}</span>
        <span className="block text-caption text-hue-ink num">{value}</span>
      </span>
    </button>
  );
}
