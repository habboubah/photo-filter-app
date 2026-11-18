import { Archive, Check, ChevronRight, Star } from 'lucide-react';
import type { Group, GroupKind, Photo } from '../types';
import { Strings, fmt, num, plural } from '../translations';
import { Empty, Screen } from '../ui/Screen';
import { Thumb } from '../ui/Photo';
import { tapLight } from '../ui/haptics';

/** How many groups are drawn at once; more come as the list is scrolled to its end. */
const PAGE = 40;

/**
 * The near-identical photos, the duplicates (photos) or the similar videos,
 * newest first: each group a strip with the one to keep marked. Each card
 * settles its group in one tap, without opening it: *Alle behalten* (the
 * group leaves the list and is not suggested again) or *Die anderen
 * vormerken* (the others go to *Zum Löschen vorgemerkt*; favourites and kept
 * photos stay) — both with undo. A tap on the photos opens the group to compare.
 */
export function SimilarView({ t, kind = 'similar', groups, byId, kept, shown, onMore, onBack, onOpen, onKeepAll, onAsideOthers }: {
  t: Strings;
  kind?: GroupKind;
  groups: Group[];
  byId: Map<string, Photo>;
  kept: Set<string>;
  shown: number;
  onMore: () => void;
  onBack: () => void;
  onOpen: (key: string) => void;
  /** Keeps every photo of the group (it leaves the list). */
  onKeepAll: (group: Group) => void;
  /** Marks the group's others for deletion (not the one to keep, no favourite, nothing kept). */
  onAsideOthers: (group: Group, ids: string[]) => void;
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
    const others = g.ids.filter(id => id !== g.best && !kept.has(id) && !byId.get(id)?.fav);
    const extra = others.length;
    const when = new Date(byId.get(g.ids[0])?.t ?? 0).toLocaleString(t.locale, { dateStyle: 'medium', timeStyle: 'short' });
    const count = plural(t, g.kind === 'lookalike' || byId.get(g.ids[0])?.video ? 'videos' : 'photos', g.ids.length);
    return (
      <div key={g.key} className="rounded-md card p-[10px]">
      <button
        type="button" onClick={() => { tapLight(); onOpen(g.key); }}
        aria-label={`${when}, ${count}`}
        className="w-full rounded-[12px] text-start press focus-visible:ring-focus"
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
      {/* Settle it here: keep all, or mark the others — the same two choices as inside the group. */}
      <div className="grid grid-cols-2 gap-2 pt-2.5">
        <button
          type="button" onClick={() => { tapLight(); onKeepAll(g); }}
          className="min-h-control px-3 rounded-full glass-flat text-label font-semibold text-fg inline-flex items-center justify-center gap-1.5 press focus-visible:ring-focus"
        >
          <Check className="w-4 h-4 shrink-0 text-keep" strokeWidth={3} aria-hidden="true" /><span className="wrap-compound">{t.keepAll}</span>
        </button>
        <button
          type="button" disabled={!extra} onClick={() => { tapLight(); onAsideOthers(g, others); }}
          aria-label={`${t.groupAsideOthers}, ${plural(t, g.kind === 'lookalike' ? 'videos' : 'photos', extra)}`}
          className="min-h-control px-3 rounded-full bg-accent-dim text-accent text-label font-bold inline-flex items-center justify-center gap-1.5 press focus-visible:ring-focus disabled:opacity-40"
        >
          <Archive className="w-4 h-4 shrink-0" strokeWidth={2.4} aria-hidden="true" /><span className="wrap-compound">{fmt(t.groupAsideShort, { n: num(t, extra) })}</span>
        </button>
      </div>
      </div>
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
