import { ChevronRight, Star } from 'lucide-react';
import type { Group, Photo } from '../types';
import { Strings, fmt, num, plural } from '../translations';
import { Empty, Screen } from '../ui/Screen';
import { Thumb } from '../ui/Photo';
import { tapLight } from '../ui/haptics';

/** How many groups are drawn at once; more come as the list is scrolled to its end. */
const PAGE = 40;

/** The similar groups, newest first: each a strip of its photos with the best one marked. */
export function SimilarView({ t, groups, byId, kept, shown, onMore, onBack, onOpen }: {
  t: Strings;
  groups: Group[];
  byId: Map<string, Photo>;
  kept: Set<string>;
  shown: number;
  onMore: () => void;
  onBack: () => void;
  onOpen: (key: string) => void;
}) {
  const visible = groups.slice(0, Math.max(PAGE, shown));
  return (
    <Screen title={t.similarTitle} subtitle={plural(t, 'groups', groups.length)} onBack={onBack} backLabel={t.back}>
      {groups.length === 0 ? <Empty title={t.noGroups} body={t.noGroupsBody} /> : (
        <>
          <p className="text-label text-fg-mute px-1 -mt-2 wrap-prose">{t.similarIntro}</p>
          <div className="space-y-[10px]">
            {visible.map(g => {
              const extra = g.ids.filter(id => id !== g.best && !kept.has(id) && !byId.get(id)?.fav).length;
              const when = new Date(byId.get(g.ids[0])?.t ?? 0).toLocaleString(t.locale, { dateStyle: 'medium', timeStyle: 'short' });
              return (
                <button
                  key={g.key} type="button" onClick={() => { tapLight(); onOpen(g.key); }}
                  aria-label={`${when}, ${plural(t, 'photos', g.ids.length)}`}
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
                        {plural(t, 'photos', g.ids.length)}{extra > 0 ? ` · ${fmt(t.groupExtra, { n: num(t, extra) })}` : ''}
                      </span>
                    </span>
                    <ChevronRight className="w-5 h-5 text-fg-faint rtl:rotate-180" aria-hidden="true" />
                  </div>
                </button>
              );
            })}
          </div>
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
