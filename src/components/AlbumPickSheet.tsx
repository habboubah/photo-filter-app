import { useEffect, useState } from 'react';
import { FolderInput, Plus } from 'lucide-react';
import type { AlbumInfo } from '../native/photoLibrary';
import { Strings, plural } from '../translations';
import { Sheet } from '../ui/Sheet';
import { Field } from '../ui/Field';
import { Button } from '../ui/Button';
import { tapLight } from '../ui/haptics';

/** Where picked photos go: an album the user has, or a new one with its name. */
export type AlbumTarget = { albumId: string; title: string } | { title: string };

/**
 * Choosing the album (Android: the folder) for picked photos — every album
 * of the phone, a filter once there are many, and *Neues Album* at the foot,
 * which asks for a name. With `name` set the sheet opens on the name (a new
 * album for all of a category, its name filled in). The tap on an album or
 * *Sichern* is the user's choice; Android then asks with its own dialog.
 */
export function AlbumPickSheet({ t, open, albums, count, name, onPick, onClose }: {
  t: Strings;
  open: boolean;
  albums: AlbumInfo[];
  /** How many photos go (in the title of the new album's sheet). */
  count: number;
  /** Open straight on a new album with this name filled in. */
  name?: string;
  onPick: (target: AlbumTarget) => void;
  onClose: () => void;
}) {
  const [filter, setFilter] = useState('');
  const [naming, setNaming] = useState<string | null>(null);
  useEffect(() => { if (open) { setFilter(''); setNaming(name ?? null); } }, [open, name]);
  const q = filter.trim().toLocaleLowerCase();
  const found = albums.filter(a => !q || a.title.toLocaleLowerCase().includes(q));
  const save = () => { const title = naming?.trim(); if (title) onPick({ title }); };

  return (
    <>
      <Sheet open={open && naming === null} title={t.albumPickTitle} closeLabel={t.close} onClose={onClose}>
        <p className="text-label text-fg-mute wrap-prose">{t.albumPickBody}</p>
        {albums.length > 8 && <div className="mt-3"><Field label={t.reviewAlbumsFilter} value={filter} onChange={setFilter} /></div>}
        {albums.length > 0 && (
          <ul className="mt-3 rounded-md bg-surface-2 divide-hairline-inset overflow-hidden">
            {found.map(a => (
              <li key={a.id}>
                <button
                  type="button" onClick={() => { tapLight(); onPick({ albumId: a.id, title: a.title }); }}
                  className="w-full min-h-[52px] px-4 py-2 flex items-center gap-3 text-start press focus-visible:ring-focus"
                >
                  <FolderInput className="w-5 h-5 shrink-0 text-fg-mute" aria-hidden="true" />
                  <span className="min-w-0 flex-1 text-body text-fg wrap-compound">{a.title}</span>
                  <span className="shrink-0 text-label text-fg-mute num">{plural(t, 'photos', a.count)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <Button full variant="ghost" icon={Plus} className="mt-3" onClick={() => setNaming('')}>{t.newAlbum}</Button>
      </Sheet>
      <Sheet
        open={open && naming !== null} title={`${t.newAlbum} · ${plural(t, 'photos', count)}`} closeLabel={t.cancel}
        onClose={() => (name !== undefined ? onClose() : setNaming(null))}
        action={{ label: t.save, onClick: save, disabled: !naming?.trim() }}
      >
        <Field label={t.albumName} value={naming ?? ''} onChange={setNaming} autoFocus maxLength={80} onKeyDown={e => { if (e.key === 'Enter') save(); }} />
      </Sheet>
    </>
  );
}
