import { ChevronRight, Star } from 'lucide-react';
import type { Group, GroupKind, Photo } from '../types';
import { Strings, fmt, num, plural } from '../translations';
import { Empty, Screen } from '../ui/Screen';
import { Thumb } from '../ui/Photo';
import { tapLight } from '../ui/haptics';

/** How many groups are drawn at once; more come as the list is scrolled to its end. */
const PAGE = 40;

/** The near-identical photos, the duplicates (photos) or the similar videos, newest first: each group a strip with the one to keep marked. */
export function SimilarView({ t, kind = 'similar', groups, byId, kept, shown, onMore, onBack, onOpen }: {
  t: Strings;
  kind?: GroupKind;
  groups: Group[];
  byId: Map<string, Photo>;
  kept: Set<string>;
  shown: number;
  onMore: () => void;
  onBack: () => void;
  onOpen: (key: string) => void;
}) {
  const dup = kind === 'duplicate';
  const videos = kind === 'lookalike';
  const visible = groups.slice(0, Math.max(PAGE, shown));
  const words = videos
    ? { title: t.lookalikeTitle, intro: t.lookalikeIntro, none: t.noLookalike, noneBody: t.noLookalikeBody }
    : dup
      ? { title: t.duplicatesTitle, intro: t.duplicatesIntro, none: t.noDuplicates, noneBody: t.noDuplicatesBody }
      : { title: t.similarTitle, intro: t.similarIntro, none: t.noGroups, noneBody: t.noGroupsBody };
  const card = (g: Group) => {
    const extra = g.ids.filter(id => id !== g.best && !kept.has(id) && !byId.get(id)?.fav).length;
    const when = new Date(byId.get(g.ids[0])?.t ?? 0).toLocaleString(t.locale, { dateStyle: 'medium', timeStyle: 'short' });
    const count = plural(t, g.kind === 'lookalike' || byId.get(g.ids[0])?.video ? 'videos' : 'photos', g.ids.length);
    return (
      <button
        key={g.key} type="button" onClick={() => { tapLight(); onOpen(g.key); }}
        aria-label={`${when}, ${count}`}
        className="w-full rounded-md card p-[10px] text-start press focus-visible:ring-focus"
      >
        <div className="flex gap-[4px] overflow-hidden rounded-[12px]">
          {g.ids.slice(0, 4).map(id => (
            <div key={id} className="relative flex-1 aspect-square min-w-0">
              <Thumb id={id} className="!rounded-[6px]" />
              {id === g.best && (
                <span className="absolute top-1.5 start-1.5 w-6 h-6 rounded-full bg-keep text-keep-ink inline-flex items-center justify-center" aria-hidden="true">
                  <Star className="w-3.5 h-3.5" fill="currentColor" strokeWidth={0} />
                </span>
              )}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 px-1 pt-2.5">
          <span className="flex-1 min-w-0">
            <span className="block text-label font-bold text-fg">{when}</span>
            <span className="block text-caption text-fg-mute">
              {count}{extra > 0 ? ` · ${fmt(t.groupExtra, { n: num(t, extra) })}` : ''}
            </span>
          </span>
          <ChevronRight className="w-5 h-5 text-fg-faint rtl:rotate-180" aria-hidden="true" />
        </div>
      </button>
    );
  };
  return (
    <Screen title={words.title} subtitle={plural(t, 'groups', groups.length)} onBack={onBack} backLabel={t.back} info={{ label: t.aboutScreen, close: t.close, body: words.intro }}>
      {groups.length === 0 ? <Empty title={words.none} body={words.noneBody} back={{ label: t.emptyBack, onClick: onBack }} /> : (
        <>
          <div className="space-y-[10px]">{visible.map(card)}</div>
          {visible.length < groups.length && <MoreOnScroll onMore={onMore} />}
        </>
      )}
    </Screen>
  );
}

/** Asks for the next page when it scrolls into view. */
function MoreOnScroll({ onMore }: { onMore: () => void }) {
  return (
    <div
      ref={el => {
        if (!el) return;
        const io = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) onMore(); }, { rootMargin: '600px' });
        io.observe(el);
        return () => io.disconnect();
      }}
      className="h-8"
    />
  );
}
