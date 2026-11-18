import { ChevronRight } from 'lucide-react';
import { Strings, bytes, fmt, plural } from '../translations';
import { sortPhotos, type SortKey } from '../logic/sort';
import type { Photo } from '../types';
import type { Source, SourceGroup } from '../logic/sources';
import { Empty, Screen } from '../ui/Screen';
import { Thumb } from '../ui/Photo';
import { tapLight } from '../ui/haptics';
import { SortButton } from './SortButton';

/**
 * "Chats & soziale Medien" [Chats & social media]: photos and videos saved by
 * messengers and social apps (src/logic/sources.ts), one card per app with
 * its count and size; a tap goes through that app's photos in the order of
 * the sort menu.
 */
export function AppsView({ t, groups, sort, onSort, onBack, onReview }: {
  t: Strings;
  groups: SourceGroup[];
  sort: SortKey;
  onSort: (key: SortKey) => void;
  onBack: () => void;
  onReview: (photos: Photo[]) => void;
}) {
  const name: Record<Source, string> = {
    whatsapp: 'WhatsApp', telegram: 'Telegram', signal: 'Signal', instagram: 'Instagram', facebook: 'Messenger',
    snapchat: 'Snapchat', tiktok: 'TikTok', download: t.sourceDownload, other: t.sourceOther,
  };
  const total = groups.reduce((s, g) => s + g.bytes, 0);
  return (
    <Screen
      title={t.appsTitle} subtitle={bytes(t, total)} onBack={onBack} backLabel={t.back} info={{ label: t.aboutScreen, close: t.close, body: t.appsIntro }}
      actions={<SortButton t={t} value={sort} onChange={onSort} />}
    >
      {groups.length === 0 ? <Empty title={t.appsNone} body={t.appsNoneBody} back={{ label: t.emptyBack, onClick: onBack }} /> : (
        <div className="space-y-[10px]">
          {groups.map(g => {
            const list = sortPhotos(g.photos, sort);
            const line = fmt(t.cleanupRowSub, { photos: plural(t, 'files', g.photos.length), size: bytes(t, g.bytes) });
            return (
              <button
                key={g.source} type="button" onClick={() => { tapLight(); onReview(list); }}
                aria-label={`${name[g.source]}, ${line}`}
                className="w-full rounded-md card p-[10px] text-start press focus-visible:ring-focus"
              >
                <div className="flex gap-[4px] overflow-hidden rounded-[12px]">
                  {list.slice(0, 4).map(p => (
                    <div key={p.id} className="flex-1 aspect-square min-w-0 max-w-[25%]"><Thumb id={p.id} className="!rounded-[6px]" /></div>
                  ))}
                </div>
                <div className="flex items-center gap-2 px-1 pt-2.5">
                  <span className="flex-1 min-w-0">
                    <span className="block text-body font-bold text-fg">{name[g.source]}</span>
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
