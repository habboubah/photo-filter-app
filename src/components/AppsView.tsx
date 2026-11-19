import { ChevronRight } from 'lucide-react';
import { Strings, bytes, fmt, plural } from '../translations';
import { sortPhotos, type SortKey } from '../logic/sort';
import { sourceName, type Source, type SourceGroup } from '../logic/sources';
import { Empty, Screen } from '../ui/Screen';
import { Thumb } from '../ui/Photo';
import { tapLight } from '../ui/haptics';
import { SortButton } from './SortButton';

/**
 * "Chats & soziale Medien" [Chats & social media]: photos and videos saved by
 * messengers and social apps (src/logic/sources.ts), one card per app with
 * two rows of its photos, its count and size. A tap opens that app's photos
 * (App.tsx, an AlbumView like every grid: *Auswählen* picks), where
 * *Durchgehen* starts the review.
 */
export function AppsView({ t, groups, sort, onSort, onBack, onOpen }: {
  t: Strings;
  groups: SourceGroup[];
  sort: SortKey;
  onSort: (key: SortKey) => void;
  onBack: () => void;
  /** One app's photos opened to pick from. */
  onOpen: (source: Source) => void;
}) {
  const name = (s: Source) => sourceName(s, { download: t.sourceDownload, other: t.sourceOther });
  const total = groups.reduce((s, g) => s + g.bytes, 0);
  return (
    <Screen
      title={t.appsTitle} subtitle={bytes(t, total)} onBack={onBack} backLabel={t.back} info={{ label: t.aboutScreen, close: t.close, how: t.infoHow, body: t.appsIntro }}
    >
      {/* The order in a row above the cards, as above every grid (not in the bar). */}
      {groups.length > 0 && <div className="flex justify-end px-1 pb-1"><SortButton inline t={t} value={sort} onChange={onSort} /></div>}
      {groups.length === 0 ? <Empty title={t.appsNone} body={t.appsNoneBody} back={{ label: t.emptyBack, onClick: onBack }} /> : (
        <div className="space-y-[10px]">
          {groups.map(g => {
            const list = sortPhotos(g.photos, sort);
            const line = fmt(t.cleanupRowSub, { photos: plural(t, 'files', g.photos.length), size: bytes(t, g.bytes) });
            return (
              <button
                key={g.source} type="button" onClick={() => { tapLight(); onOpen(g.source); }}
                aria-label={`${name(g.source)}, ${line}`}
                className="w-full rounded-md card p-[10px] text-start press focus-visible:ring-focus"
              >
                {/* Two rows of four (one when there are four or fewer). */}
                <div className="grid grid-cols-4 gap-[4px] overflow-hidden rounded-[12px]">
                  {list.slice(0, 8).map(p => (
                    <div key={p.id} className="aspect-square min-w-0"><Thumb id={p.id} className="!rounded-[6px]" /></div>
                  ))}
                </div>
                <div className="flex items-center gap-2 px-1 pt-2.5">
                  <span className="flex-1 min-w-0">
                    <span className="block text-body font-bold text-fg">{name(g.source)}</span>
                    <span className="block text-caption text-fg-mute num">{line}</span>
                  </span>
                  <ChevronRight className="w-5 h-5 text-fg-faint rtl:rotate-180" aria-hidden="true" />
                </div>
              </button>
            );
          })}
        </div>
      )}
    </Screen>
  );
}
