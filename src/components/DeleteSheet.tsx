import React from 'react';
import { Trash2 } from 'lucide-react';
import type { Photo } from '../types';
import { Strings, bytes, num, plural } from '../translations';
import { Button } from '../ui/Button';
import { Thumb } from '../ui/Photo';
import { Sheet } from '../ui/Sheet';

/** How many photos the sheet draws; the last tile counts the rest. */
const TILES = 48;

/**
 * The one way the app asks before it really deletes: a bottom sheet that
 * shows exactly what goes — the photos themselves, their number and their
 * size — says where they land and that the phone asks once more, and
 * carries the only red button. Cancelling is one tap (or a swipe down); it
 * can have its own words ("Beide behalten"). Used by the bin and after a
 * smaller copy was made. `before`: something shown first instead (the three
 * safety nets, once).
 */
export function DeleteSheet({ t, photos, title, lead, confirmLabel, cancelLabel, before, onConfirm, onCancel }: {
  t: Strings;
  /** What would be deleted; `null` closes the sheet. */
  photos: Photo[] | null;
  title?: string;
  /** A sentence above the photos (what was just saved, why the question comes). */
  lead?: string;
  /** The red button's words; "N Fotos löschen" without. */
  confirmLabel?: string;
  cancelLabel?: string;
  before?: { title: string; body: React.ReactNode };
  onConfirm: (photos: Photo[]) => void;
  onCancel: () => void;
}) {
  const list = photos ?? [];
  const size = list.reduce((s, p) => s + p.bytes, 0);
  const mixed = list.some(p => p.video);
  const count = mixed ? plural(t, 'files', list.length) : plural(t, 'photos', list.length);
  const label = confirmLabel ?? (mixed ? plural(t, 'deleteFilesN', list.length) : plural(t, 'deleteN', list.length));
  const when = (p: Photo) => new Date(p.t).toLocaleString(t.locale, { dateStyle: 'medium', timeStyle: 'short' });
  return (
    <Sheet open={!!photos} title={photos ? (before ? before.title : title ?? label) : ''} closeLabel={cancelLabel ?? t.cancel} onClose={onCancel}>
      {photos && before && before.body}
      {photos && !before && (
        <div className="space-y-4 pb-1">
          {lead && <p className="text-body text-fg wrap-prose">{lead}</p>}
          <p className="text-body text-fg num wrap-prose">{`${count} · ${bytes(t, size)}`}</p>
          <div className="grid grid-cols-6 gap-[3px]" role="list" aria-label={count}>
            {list.slice(0, TILES).map((p, i) => (
              <div key={p.id} role="listitem" aria-label={`${when(p)}, ${bytes(t, p.bytes)}`} className="relative aspect-square rounded-[6px] overflow-hidden">
                <Thumb id={p.id} className="!rounded-none" />
                {i === TILES - 1 && list.length > TILES && (
                  <span className="absolute inset-0 bg-veil text-on-color text-caption font-bold num inline-flex items-center justify-center">+{num(t, list.length - TILES + 1)}</span>
                )}
              </div>
            ))}
          </div>
          <p className="text-label text-fg-mute wrap-prose">{`${t.deleteHint} ${t.deleteSystemNext}`}</p>
          <div className="grid gap-2 pt-1">
            {/* The destructive colour only here, on the last step. */}
            <Button full size="lg" variant="destructive" icon={Trash2} onClick={() => onConfirm(list)}>{`${label} · ${bytes(t, size)}`}</Button>
            <Button full size="lg" variant="secondary" className="!shadow-none glass-flat !text-fg" onClick={onCancel}>{cancelLabel ?? t.cancel}</Button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
