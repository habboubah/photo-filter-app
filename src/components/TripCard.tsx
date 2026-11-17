import { Check, ChevronRight } from 'lucide-react';
import type { Trip } from '../types';
import { Strings, bytes, fmt, plural } from '../translations';
import { Mosaic } from '../ui/Photo';
import { tapLight } from '../ui/haptics';

/** A trip as a card: its photos as a cover, its name, how many photos and how much space. */
export function TripCard({ trip, t, onOpen }: { trip: Trip; t: Strings; onOpen: () => void }) {
  return (
    <button
      type="button" onClick={() => { tapLight(); onOpen(); }}
      aria-label={fmt(t.openTrip, { name: trip.title })}
      className="w-full flex items-center gap-[14px] p-[10px] pe-[14px] rounded-md card press text-start focus-visible:ring-focus"
    >
      <Mosaic ids={trip.ids} className="w-[76px] h-[76px] shrink-0 rounded-[14px]" />
      <span className="min-w-0 flex-1">
        <span className={`block title-face text-body font-semibold wrap-compound ${trip.ignored ? 'text-fg-mute' : 'text-fg'}`}>{trip.title}</span>
        <span className="block text-caption text-fg-mute mt-0.5">
          {fmt(t.tripMeta, { photos: plural(t, 'photos', trip.ids.length), size: bytes(t, trip.bytes) })}
        </span>
        {trip.album && (
          <span className="mt-1.5 inline-flex items-center gap-1 text-caption font-bold text-keep">
            <Check className="w-3.5 h-3.5" strokeWidth={3} aria-hidden="true" />{t.albumBadge}
          </span>
        )}
      </span>
      <ChevronRight className="w-5 h-5 text-fg-faint shrink-0 rtl:rotate-180" aria-hidden="true" />
    </button>
  );
}
