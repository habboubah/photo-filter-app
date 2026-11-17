import { useState } from 'react';
import { Check, EyeOff, Eye, FolderPlus, ImagePlus, Merge, MoreHorizontal, Pencil, Scissors, Shield, ShieldOff, Undo2 } from 'lucide-react';
import type { Photo, Trip } from '../types';
import { Strings, bytes, fmt, plural } from '../translations';
import { tripDays } from '../logic/trips';
import { Dock, Group, IconTile, Row, Screen } from '../ui/Screen';
import { Button, IconButton } from '../ui/Button';
import { Sheet } from '../ui/Sheet';
import { Field } from '../ui/Field';
import { PhotoGrid } from '../ui/Photo';
import { isAndroid } from '../platform';

interface Props {
  t: Strings;
  trip: Trip;
  trips: Trip[];
  byId: Map<string, Photo>;
  isMerged: boolean;
  isSplit: boolean;
  onBack: () => void;
  onCreateAlbum: () => void;
  onReview: () => void;
  onRename: (name: string) => void;
  onSplit: (at: number) => void;
  onMerge: (otherKey: string) => void;
  onUndoSplit: () => void;
  onUndoMerge: () => void;
  onIgnore: (ignored: boolean) => void;
  /** Marked "Nie vorschlagen": none of its photos is ever suggested for deleting (src/logic/protect.ts). */
  isProtected: boolean;
  onProtect: (on: boolean) => void;
}

type SheetKind = null | 'actions' | 'rename' | 'split' | 'merge';

export function TripView(p: Props) {
  const { t, trip } = p;
  const [sheet, setSheet] = useState<SheetKind>(null);
  const [name, setName] = useState(trip.title);
  const locale = t.locale;
  const timeOf = (id: string) => p.byId.get(id)?.t ?? 0;
  const dateLabel = (id: string) => new Date(timeOf(id)).toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' });
  const days = tripDays(trip.ids, timeOf);
  const AlbumIcon = isAndroid() ? FolderPlus : ImagePlus;

  const others = p.trips
    .filter(x => x.key !== trip.key)
    .sort((a, b) => Math.abs(a.start - trip.start) - Math.abs(b.start - trip.start))
    .slice(0, 12);

  const close = () => setSheet(null);

  return (
    <Screen
      title={trip.title}
      subtitle={<>
        <span className="block">{fmt(t.tripMeta, { photos: plural(t, 'photos', trip.ids.length), size: bytes(t, trip.bytes) })}</span>
        {trip.title !== trip.autoTitle && <span className="block text-caption font-normal">{fmt(t.autoName, { name: trip.autoTitle })}</span>}
      </>}
      onBack={p.onBack}
      backLabel={t.back}
      actions={<IconButton label={t.editTrip} icon={MoreHorizontal} tone="bar" onClick={() => setSheet('actions')} />}
      docked
    >
      {trip.album && (
        <div className="rounded-md bg-keep-dim px-4 py-3 flex items-center gap-2 text-keep">
          <Check className="w-5 h-5 shrink-0" strokeWidth={2.6} aria-hidden="true" />
          <span className="text-label font-bold">
            {fmt(t.albumExists, { date: new Date(trip.album.at).toLocaleDateString(locale, { dateStyle: 'medium' }) })}
          </span>
        </div>
      )}
      <PhotoGrid ids={trip.ids} label={dateLabel} />

      <Dock>
        <div className="flex gap-2">
          {trip.album
            ? <Button full size="lg" onClick={p.onReview}>{t.reviewTrip}</Button>
            : <>
                <Button size="lg" variant="secondary" onClick={p.onReview} aria-label={t.reviewTrip}>{t.reviewGroup}</Button>
                <Button full size="lg" icon={AlbumIcon} onClick={p.onCreateAlbum}>{t.createAlbum}</Button>
              </>}
        </div>
      </Dock>

      <Sheet open={sheet === 'actions'} title={t.editTrip} closeLabel={t.close} onClose={close}>
        <div className="space-y-5">
          <Group>
            <Row label={t.rename} leading={<IconTile icon={Pencil} hue="sky" />} onClick={() => { setName(trip.title); setSheet('rename'); }} />
            {days.length > 1 && <Row label={t.split} leading={<IconTile icon={Scissors} hue="sand" />} onClick={() => setSheet('split')} />}
            {others.length > 0 && <Row label={t.merge} leading={<IconTile icon={Merge} hue="lilac" />} onClick={() => setSheet('merge')} />}
            {p.isSplit && <Row label={t.undoSplit} leading={<IconTile icon={Undo2} hue="stone" />} onClick={() => { p.onUndoSplit(); close(); }} />}
            {p.isMerged && <Row label={t.undoMerge} leading={<IconTile icon={Undo2} hue="stone" />} onClick={() => { p.onUndoMerge(); close(); }} />}
          </Group>
          <Group>
            {trip.album && <Row label={t.createAgain} leading={<IconTile icon={AlbumIcon} hue="mint" />} onClick={() => { close(); p.onCreateAlbum(); }} />}
            <Row
              label={p.isProtected ? t.neverSuggestOn : t.neverSuggest}
              leading={<IconTile icon={p.isProtected ? ShieldOff : Shield} hue="mint" />}
              onClick={() => { p.onProtect(!p.isProtected); close(); }}
            />
            <Row
              label={trip.ignored ? t.unignore : t.ignore}
              leading={<IconTile icon={trip.ignored ? Eye : EyeOff} hue="rose" />}
              onClick={() => { p.onIgnore(!trip.ignored); close(); }}
            />
          </Group>
        </div>
      </Sheet>

      <Sheet
        open={sheet === 'rename'} title={t.renameTitle} closeLabel={t.cancel} onClose={close}
        action={{ label: t.save, onClick: () => { p.onRename(name.trim() === trip.autoTitle ? '' : name); close(); } }}
      >
        <div className="space-y-4">
          <Field label={t.nameLabel} value={name} onChange={setName} autoFocus maxLength={80}
            onKeyDown={e => { if (e.key === 'Enter') { p.onRename(name.trim() === trip.autoTitle ? '' : name); close(); } }} />
          {trip.title !== trip.autoTitle && (
            <Button variant="ghost" onClick={() => { p.onRename(''); close(); }}>{t.useAutoName}</Button>
          )}
        </div>
      </Sheet>

      <Sheet open={sheet === 'split'} title={t.splitTitle} closeLabel={t.cancel} onClose={close}>
        <p className="text-label text-fg-mute mb-4 wrap-prose">{t.splitBody}</p>
        <Group>
          {days.slice(1).map(d => (
            <Row
              key={d.day}
              label={new Date(d.first).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })}
              sub={fmt(t.splitDay, { photos: plural(t, 'photos', d.count) })}
              onClick={() => { p.onSplit(d.first); close(); }}
            />
          ))}
        </Group>
      </Sheet>

      <Sheet open={sheet === 'merge'} title={t.mergeTitle} closeLabel={t.cancel} onClose={close}>
        <p className="text-label text-fg-mute mb-4 wrap-prose">{t.mergeBody}</p>
        {others.length ? (
          <Group>
            {others.map(o => (
              <Row key={o.key} label={o.title} sub={plural(t, 'photos', o.ids.length)} onClick={() => { p.onMerge(o.key); close(); }} />
            ))}
          </Group>
        ) : <p className="text-label text-fg-mute">{t.noMergeCandidates}</p>}
      </Sheet>
    </Screen>
  );
}
