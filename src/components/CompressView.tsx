import { useMemo, useState } from 'react';
import { CheckCircle2, Circle, Minimize2 } from 'lucide-react';
import type { Photo } from '../types';
import { Strings, bytes, fmt, plural } from '../translations';
import { estimatedSaving } from '../logic/compress';
import { Dock, Empty, Screen } from '../ui/Screen';
import { Button } from '../ui/Button';
import { Segmented } from '../ui/Controls';
import { PhotoGrid } from '../ui/Photo';
import { SelectBar } from '../ui/SelectBar';

/**
 * "Fotos verkleinern" [Make photos smaller]: the photos that qualify
 * (src/logic/compress.ts), the largest saving first, all selected; a tap
 * leaves one out. "42 Fotos verkleinern" makes the copies (progress in a
 * sheet), then the app asks whether the originals may go — the system's dialog.
 */
export function CompressView({ t, photos, screenshots, onBack, onRun }: {
  t: Strings;
  photos: Photo[];
  screenshots: Photo[];
  onBack: () => void;
  onRun: (photos: Photo[]) => void;
}) {
  const [tab, setTab] = useState<'photos' | 'screenshots'>(photos.length || !screenshots.length ? 'photos' : 'screenshots');
  const list = tab === 'photos' ? photos : screenshots;
  const [left, setLeft] = useState<Set<string>>(() => new Set());
  const byId = useMemo(() => new Map(list.map(p => [p.id, p])), [list]);
  const chosen = list.filter(p => !left.has(p.id));
  const saving = chosen.reduce((s, p) => s + estimatedSaving(p), 0);
  const all = left.size === 0 || list.every(p => !left.has(p.id));
  const none = chosen.length === 0;
  const toggle = (id: string) => setLeft(s => { const next = new Set(s); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const when = (p: Photo) => new Date(p.t).toLocaleString(t.locale, { dateStyle: 'medium', timeStyle: 'short' });

  return (
    <Screen title={t.compressPhotosTitle} subtitle={fmt(t.upTo, { size: bytes(t, saving) })} onBack={onBack} backLabel={t.back} info={{ label: t.aboutScreen, close: t.close, how: t.infoHow, body: t.compressPhotosIntro }} docked={list.length > 0}>
      {photos.length > 0 && screenshots.length > 0 && (
        <Segmented
          label={t.compressPhotosTitle} value={tab} onChange={setTab}
          options={[{ value: 'photos', label: t.filterPhotos }, { value: 'screenshots', label: t.screenshotsTile }]}
        />
      )}
      {list.length === 0 ? <Empty title={t.compressNone} body={t.compressNoneBody} back={{ label: t.emptyBack, onClick: onBack }} /> : (<>
        <SelectBar
          text={plural(t, 'binPicked', chosen.length)} all={all} none={none}
          onAll={() => setLeft(new Set())} onNone={() => setLeft(new Set(list.map(p => p.id)))}
          labels={{ all: t.pickAll, none: t.pickNone }}
        />
        <PhotoGrid
          ids={list.map(p => p.id)}
          label={id => { const p = byId.get(id)!; return `${when(p)}, ${fmt(t.upTo, { size: bytes(t, estimatedSaving(p)) })}, ${left.has(id) ? t.notSelected : t.selected}`; }}
          onOpen={toggle}
          overlay={id => {
            const on = !left.has(id);
            return (
              <>
                {!on && <span aria-hidden="true" className="absolute inset-0 bg-veil" />}
                <span aria-hidden="true" className="absolute top-1.5 end-1.5 w-6 h-6 rounded-full bg-surface inline-flex items-center justify-center">
                  {on ? <CheckCircle2 className="w-6 h-6 text-accent" /> : <Circle className="w-6 h-6 text-fg-faint" />}
                </span>
                <span aria-hidden="true" className="absolute bottom-1.5 start-1.5 px-1.5 py-0.5 rounded-full bg-veil text-on-color text-micro font-bold num">
                  {`−${bytes(t, estimatedSaving(byId.get(id)!))}`}
                </span>
              </>
            );
          }}
        />
      </>)}
      {list.length > 0 && (
        <Dock>
          <Button full size="lg" icon={Minimize2} disabled={!chosen.length} onClick={() => onRun(chosen)}>
            {plural(t, 'compressN', chosen.length)}
          </Button>
        </Dock>
      )}
    </Screen>
  );
}
