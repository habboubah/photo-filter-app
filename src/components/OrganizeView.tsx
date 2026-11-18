import { useState } from 'react';
import { Check, FolderOpen, History, MapPin, Search, Settings } from 'lucide-react';
import type { Trip } from '../types';
import type { MemoryLabel } from '../logic/ai';
import { Strings, fmt, num, plural } from '../translations';
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
  /** The albums of the phone (Android: its folders), the last used first; a cover once their photos are known. Null while asked for. */
  albums: { id: string; title: string; count: number; cover?: string }[] | null;
  onAlbum: (id: string) => void;
}

/** Albums shown before *Alle zeigen*: two rows of four. */
const ALBUMS_SHOWN = 8;

/**
 * The "Ordnen" tab: the photos to keep and look back on. Search first, as a
 * field (what is on the photo — the on-device AI), then On this day as a
 * large photo, every trip as a tile, four to a row (each becomes an album or
 * folder; all of them in view at once), the albums the phone already has
 * (Android: its folders) the same way, and what the AI saw on the photos as
 * larger photo cards, three to a row, the name on the photo. While the facts
 * load, the page's shape breathes instead of a blank screen.
 */
export function OrganizeView(p: Props) {
  const { t } = p;
  const visible = p.trips.filter(x => !x.ignored);
  const [allAlbums, setAllAlbums] = useState(false);
  const albums = p.albums ?? [];
  const shownAlbums = allAlbums ? albums : albums.slice(0, ALBUMS_SHOWN);
  const loaded = p.photoCount !== null;
  const subtitle = loaded
    ? [visible.length ? plural(t, 'trips', visible.length) : null, plural(t, 'photos', p.photoCount!)].filter(Boolean).join(' · ')
    : t.loading;

  return (
    <Screen
      title={t.tabOrganize}
      subtitle={subtitle}
      tabbed
      actions={<IconButton label={t.settings} icon={Settings} tone="bar" onClick={p.onSettings} />}
    >
      {/* Search as a field, the way into the library by what is on the photos. */}
      {loaded && p.onSearch && (
        <button
          type="button" onClick={() => { tapLight(); p.onSearch!(); }}
          aria-label={`${t.searchOpen}: ${t.searchLabel}`}
          className="w-full min-h-control rounded-full card ps-4 pe-5 py-2.5 flex items-center gap-3 text-start press focus-visible:ring-focus"
        >
          <Search className="w-5 h-5 shrink-0 text-fg-mute" strokeWidth={2.4} aria-hidden="true" />
          <span className="min-w-0 flex-1" aria-hidden="true">
            <span className="block text-body text-fg wrap-compound">{t.searchLabel}</span>
            <span className="block text-caption text-fg-mute wrap-compound">{t.searchPlaceholder}</span>
          </span>
        </button>
      )}

      {!loaded && <OrganizeSkeleton label={t.loading} />}

      {loaded && p.onThisDay.photos > 0 && p.onThisDay.cover && (
        <button
          type="button" data-tip="tip.widget" onClick={() => { tapLight(); p.onOnThisDay(); }}
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
        <section aria-labelledby="trips-h" data-tip="tip.trips">
          <SectionHead
            id="trips-h" title={t.tripsSection}
            // Every trip shows here; "All trips" stays for the hidden ones (at the end of that list).
            action={p.trips.length > visible.length ? (
              <button type="button" onClick={() => { tapLight(); p.onTrips(); }} className="text-label font-bold text-accent hit-44 focus-visible:ring-focus rounded-full">
                {t.allTrips} ({num(t, p.trips.length)})
              </button>
            ) : undefined}
          />
          {visible.length ? (
            /* Four to a row on a phone, three on the narrowest (a container query on the page). */
            <div className="grid grid-cols-3 @xs/page:grid-cols-4 gap-x-[8px] gap-y-[12px]">
              {visible.map(trip => <TripTile key={trip.key} trip={trip} t={t} onOpen={() => p.onTrip(trip.key)} />)}
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

      {loaded && albums.length > 0 && (
        <section aria-labelledby="albums-h">
          <SectionHead
            id="albums-h" title={t.albumsSection}
            action={albums.length > ALBUMS_SHOWN ? (
              <button type="button" aria-expanded={allAlbums} onClick={() => { tapLight(); setAllAlbums(v => !v); }} className="text-label font-bold text-accent hit-44 focus-visible:ring-focus rounded-full">
                {allAlbums ? t.albumsLess : `${t.albumsAll} (${num(t, albums.length)})`}
              </button>
            ) : undefined}
          />
          <div className="grid grid-cols-3 @xs/page:grid-cols-4 gap-x-[8px] gap-y-[12px]">
            {shownAlbums.map(a => (
              <button
                key={a.id} type="button" onClick={() => { tapLight(); p.onAlbum(a.id); }}
                aria-label={`${fmt(t.openAlbum, { name: a.title })}, ${plural(t, 'photos', a.count)}`}
                className="min-w-0 self-start text-start press focus-visible:ring-focus rounded-sm"
              >
                <span className="relative block aspect-square rounded-[12px] overflow-hidden bg-surface">
                  {a.cover
                    ? <Thumb id={a.cover} className="!rounded-none absolute inset-0" />
                    : <FolderOpen className="absolute inset-0 m-auto w-7 h-7 text-fg-faint" aria-hidden="true" />}
                </span>
                <span aria-hidden="true" className="mt-1.5 px-0.5 text-caption font-semibold text-fg leading-tight line-clamp-2 hyphens-auto">{a.title}</span>
                <span aria-hidden="true" className="block px-0.5 text-caption text-fg-mute num truncate">{num(t, a.count)}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {loaded && p.categories.length > 0 && (
        <section aria-labelledby="categories-h">
          <SectionHead id="categories-h" title={t.categoriesTitle} />
          <div className="grid grid-cols-3 gap-[8px]">
            {p.categories.map(c => (
              <button
                key={c.label} type="button" onClick={() => { tapLight(); p.onCategory(c.label); }}
                aria-label={`${t[`aiLabel_${c.label}`]}, ${plural(t, 'photos', c.count)}`}
                className="relative block aspect-[4/5] rounded-[16px] overflow-hidden bg-surface text-start press focus-visible:ring-focus"
              >
                <Thumb id={c.cover} className="!rounded-none absolute inset-0" />
                <span className="absolute inset-0 photo-shade" aria-hidden="true" />
                <span className="absolute inset-x-0 bottom-0 px-2.5 pb-2 text-on-color" aria-hidden="true">
                  <span className="block title-face text-label font-bold leading-tight line-clamp-2 hyphens-auto">{t[`aiLabel_${c.label}`]}</span>
                  <span className="block text-caption font-semibold opacity-90 num">{num(t, c.count)}</span>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}
    </Screen>
  );
}

/** A trip as a tile, like the categories: a photo from its middle, a check once its album is made, the place, the dates and the photo count under it. */
function TripTile({ trip, t, onOpen }: { trip: Trip; t: Strings; onOpen: () => void }) {
  const cover = trip.ids[Math.floor(trip.ids.length / 2)];
  return (
    <button
      type="button" onClick={() => { tapLight(); onOpen(); }}
      aria-label={fmt(t.openTrip, { name: trip.title })}
      className="min-w-0 self-start text-start press focus-visible:ring-focus rounded-sm"
    >
      <span className="relative block aspect-square rounded-[12px] overflow-hidden bg-surface">
        {cover && <Thumb id={cover} className="!rounded-none absolute inset-0" />}
        {trip.album && (
          <span className="absolute top-1.5 end-1.5 w-6 h-6 inline-flex items-center justify-center rounded-full glass text-keep" title={t.albumBadge}>
            <Check className="w-3.5 h-3.5" strokeWidth={3} aria-hidden="true" />
            <span className="sr-only">{t.albumBadge}</span>
          </span>
        )}
      </span>
      {/* The place and the dates on lines of their own (a renamed trip: its name, then the dates), so neither is cut in two. */}
      <span className="mt-1.5 px-0.5 text-caption font-semibold text-fg leading-tight line-clamp-2 hyphens-auto">{trip.title === trip.autoTitle ? trip.place : trip.title}</span>
      <span className="block px-0.5 text-caption text-fg-mute leading-tight line-clamp-2">{trip.dates}</span>
      <span className="block px-0.5 text-caption text-fg-mute num truncate">{plural(t, 'photos', trip.ids.length)}</span>
    </button>
  );
}

/** Ordnen while the facts load: the search field, a row of trip tiles and the photo cards as soft shapes. */
function OrganizeSkeleton({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} className="space-y-6 skeleton">
      <div className="h-[56px] rounded-full bg-surface" />
      <div className="space-y-3">
        <div className="h-5 w-24 rounded-full bg-surface" />
        <div className="grid grid-cols-3 @xs/page:grid-cols-4 gap-[8px]">{[0, 1, 2, 3].map(i => <div key={i} className="aspect-square rounded-[12px] bg-surface" />)}</div>
      </div>
      <div className="space-y-3">
        <div className="h-5 w-40 rounded-full bg-surface" />
        <div className="grid grid-cols-3 gap-[8px]">{[0, 1, 2].map(i => <div key={i} className="aspect-[4/5] rounded-[16px] bg-surface" />)}</div>
      </div>
    </div>
  );
}
