import { Check, History, MapPin, Search, Settings } from 'lucide-react';
import type { Trip } from '../types';
import type { MemoryLabel } from '../logic/ai';
import { Strings, bytes, fmt, num, plural } from '../translations';
import { LARGE } from '../thumbs';
import { Screen, SectionHead } from '../ui/Screen';
import { IconButton } from '../ui/Button';
import { tapLight } from '../ui/haptics';
import { Thumb } from '../ui/Photo';

interface Props {
  t: Strings;
  photoCount: number | null;
  trips: Trip[];
  hasLocations: boolean;
  onThisDay: { photos: number; years: number[]; cover?: string };
  /** The on-device AI's categories (src/logic/ai.ts), the largest first. */
  categories: { label: MemoryLabel; count: number; cover: string }[];
  onSettings: () => void;
  /** Suchen (src/components/SearchView.tsx); absent until the AI has vectors to search. */
  onSearch?: () => void;
  onOnThisDay: () => void;
  onTrips: () => void;
  onTrip: (key: string) => void;
  onCategory: (label: MemoryLabel) => void;
}

/** How many trips the tab shows before "All trips". */
const SHOWN_TRIPS = 3;

/**
 * The "Ordnen" tab: the photos to keep and look back on. On this day as a
 * photo, the trips as large cover cards (each becomes an album or folder),
 * what the on-device AI saw on the photos.
 */
export function OrganizeView(p: Props) {
  const { t } = p;
  const visible = p.trips.filter(x => !x.ignored);
  const loaded = p.photoCount !== null;
  const subtitle = loaded
    ? [visible.length ? plural(t, 'trips', visible.length) : null, plural(t, 'photos', p.photoCount!)].filter(Boolean).join(' · ')
    : t.loading;

  return (
    <Screen
      title={t.tabOrganize}
      subtitle={subtitle}
      tabbed
      actions={<>
        {p.onSearch && <IconButton label={t.searchOpen} icon={Search} tone="bar" onClick={p.onSearch} />}
        <IconButton label={t.settings} icon={Settings} tone="bar" onClick={p.onSettings} />
      </>}
    >
      {loaded && p.onThisDay.photos > 0 && p.onThisDay.cover && (
        <button
          type="button" onClick={() => { tapLight(); p.onOnThisDay(); }}
          className="relative block w-full aspect-[4/3] rounded-lg overflow-hidden bg-surface text-start press focus-visible:ring-focus"
        >
          <Thumb id={p.onThisDay.cover} size={LARGE} className="!rounded-none absolute inset-0" />
          <span className="absolute inset-0 photo-shade" aria-hidden="true" />
          <span className="absolute top-3 start-3 inline-flex items-center gap-1.5 rounded-full glass text-fg text-caption font-bold px-3 py-1.5">
            <History className="w-4 h-4 shrink-0" aria-hidden="true" />{t.onThisDay}
          </span>
          <span className="absolute inset-x-0 bottom-0 text-on-color px-5 pb-4 flex items-end gap-3">
            <span className="min-w-0 flex-1 display text-title2 num wrap-compound">
              {fmt(t.onThisDayBody, { photos: plural(t, 'photos', p.onThisDay.photos), years: p.onThisDay.years.map(y => String(y)).join(', ') })}
            </span>
            <span className="shrink-0 rounded-full glass text-fg text-label font-bold px-4 py-2">{t.onThisDayOpen}</span>
          </span>
        </button>
      )}

      {loaded && (
        <section aria-labelledby="trips-h">
          <SectionHead
            id="trips-h" title={t.tripsSection}
            action={p.trips.length > SHOWN_TRIPS ? (
              <button type="button" onClick={() => { tapLight(); p.onTrips(); }} className="text-label font-bold text-accent hit-44 focus-visible:ring-focus rounded-full">
                {t.allTrips} ({num(t, p.trips.length)})
              </button>
            ) : undefined}
          />
          {visible.length ? (
            <div className="space-y-[12px]">
              {visible.slice(0, SHOWN_TRIPS).map(trip => <TripCover key={trip.key} trip={trip} t={t} onOpen={() => p.onTrip(trip.key)} />)}
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

      {loaded && p.categories.length > 0 && (
        <section aria-labelledby="categories-h">
          <SectionHead id="categories-h" title={t.categoriesTitle} />
          <div className="flex gap-[12px] overflow-x-auto no-scrollbar -mx-[16px] px-[16px] pb-1">
            {p.categories.map(c => (
              <button
                key={c.label} type="button" onClick={() => { tapLight(); p.onCategory(c.label); }}
                className="relative shrink-0 w-[140px] aspect-[4/5] rounded-md overflow-hidden bg-surface text-start press focus-visible:ring-focus"
              >
                <Thumb id={c.cover} className="!rounded-none absolute inset-0" />
                <span className="absolute inset-0 photo-shade" aria-hidden="true" />
                <span className="absolute inset-x-0 bottom-0 px-3 pb-2.5 text-on-color">
                  <span className="block text-label font-semibold truncate">{t[`aiLabel_${c.label}`]}</span>
                  <span className="block text-caption font-medium num opacity-90">{plural(t, 'photos', c.count)}</span>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}
    </Screen>
  );
}

/** A trip as a large card, as a memory in Photos: a photo from its middle edge to edge, its name and how many photos and how much space on a shade at its foot. */
function TripCover({ trip, t, onOpen }: { trip: Trip; t: Strings; onOpen: () => void }) {
  const cover = trip.ids[Math.floor(trip.ids.length / 2)];
  return (
    <button
      type="button" onClick={() => { tapLight(); onOpen(); }}
      aria-label={fmt(t.openTrip, { name: trip.title })}
      className="relative block w-full aspect-[16/11] rounded-lg overflow-hidden bg-surface text-start press focus-visible:ring-focus"
    >
      {cover && <Thumb id={cover} size={LARGE} className="!rounded-none absolute inset-0" />}
      <span className="absolute inset-0 photo-shade" aria-hidden="true" />
      {trip.album && (
        <span className="absolute top-3 start-3 inline-flex items-center gap-1 rounded-full glass text-keep text-caption font-bold px-2.5 py-1.5">
          <Check className="w-3.5 h-3.5" strokeWidth={3} aria-hidden="true" />{t.albumBadge}
        </span>
      )}
      <span className="absolute inset-x-0 bottom-0 px-5 pb-4 text-on-color">
        <span className="block display text-title2 wrap-compound">{trip.title}</span>
        <span className="block text-label font-medium mt-0.5 num opacity-90">
          {fmt(t.tripMeta, { photos: plural(t, 'photos', trip.ids.length), size: bytes(t, trip.bytes) })}
        </span>
      </span>
    </button>
  );
}
