import { useState } from 'react';
import { Archive, Check, ChevronRight, Star } from 'lucide-react';
import type { Group, GroupKind, Photo } from '../types';
import { Strings, fmt, num, plural } from '../translations';
import { Empty, Screen } from '../ui/Screen';
import { Segmented } from '../ui/Controls';
import { Thumb } from '../ui/Photo';
import { tapLight } from '../ui/haptics';

/** How many groups are drawn at once; more come as the list is scrolled to its end. */
const PAGE = 40;

/**
 * The near-identical photos, the duplicates (photos) or the similar videos,
 * newest first: each group a strip with the one to keep marked. Each card
 * settles its group without opening it. The green star is what stays: the
 * app's pick (and favourites, photos kept before) carry it; every other photo
 * has a grey star the user can switch on to keep it too. *Alle behalten*
 * keeps the whole group (it leaves the list); *Ohne Stern zum Löschen
 * vormerken* puts every photo without a star into *Zum Löschen vorgemerkt*
 * and keeps the starred ones — both with undo. It is teal with the archive,
 * like every other marking button: nothing is deleted here (red stayed only
 * a few hours on 18 November 2026). A tap on the photos opens the group to
 * compare. The near-identical photos carry the similar videos too, behind a
 * *Fotos · Videos* switch (their own screen until 18 November 2026).
 */
export function SimilarView({ t, kind = 'similar', groups: photoGroups, videoGroups = [], byId, kept, shown, onMore, onBack, onOpen, onKeepAll, onAsideOthers }: {
  t: Strings;
  kind?: GroupKind;
  groups: Group[];
  /** Near-identical only: the similar videos (lookalike takes and copies of a video), behind a switch. */
  videoGroups?: Group[];
  byId: Map<string, Photo>;
  kept: Set<string>;
  shown: number;
  onMore: () => void;
  onBack: () => void;
  onOpen: (key: string) => void;
  /** Keeps every photo of the group (it leaves the list). */
  onKeepAll: (group: Group) => void;
  /** Marks the group's photos without a star for deletion; `keep` are the ones the user starred (kept from now on). */
  onAsideOthers: (group: Group, ids: string[], keep: string[]) => void;
}) {
  const dup = kind === 'duplicate';
  const [part, setPart] = useState<'photos' | 'videos'>(() => (kind === 'similar' && !photoGroups.length && videoGroups.length ? 'videos' : 'photos'));
  const groups = kind === 'similar' && part === 'videos' ? videoGroups : photoGroups;
  const visible = groups.slice(0, Math.max(PAGE, shown));
  // Stars the user switched on, per group: more photos to keep than the app's pick.
  const [stars, setStars] = useState<Record<string, string[]>>({});
  const toggleStar = (key: string, id: string) => setStars(s => {
    const list = s[key] ?? [];
    return { ...s, [key]: list.includes(id) ? list.filter(x => x !== id) : [...list, id] };
  });
  const words = kind === 'lookalike'
    ? { title: t.lookalikeTitle, intro: t.lookalikeIntro, none: t.noLookalike, noneBody: t.noLookalikeBody }
    : dup
      ? { title: t.duplicatesTitle, intro: t.duplicatesIntro, none: t.noDuplicates, noneBody: t.noDuplicatesBody }
      : { title: t.similarTitle, intro: t.similarIntro, none: t.noGroups, noneBody: t.noGroupsBody };
  const card = (g: Group) => {
    const unit = g.kind === 'lookalike' || byId.get(g.ids[0])?.video ? 'videos' : 'photos';
    // Safe already: the one to keep, a favourite, a photo kept before — they never go.
    const safe = (id: string) => id === g.best || kept.has(id) || !!byId.get(id)?.fav;
    const mine = stars[g.key] ?? [];
    const starred = (id: string) => safe(id) || mine.includes(id);
    const others = g.ids.filter(id => !starred(id));
    const extra = others.length;
    const when = new Date(byId.get(g.ids[0])?.t ?? 0).toLocaleString(t.locale, { dateStyle: 'medium', timeStyle: 'short' });
    const count = plural(t, unit, g.ids.length);
    const shown = g.ids.slice(0, 4);
    const more = g.ids.length - shown.length;
    const open = () => { tapLight(); onOpen(g.key); };
    return (
      <div key={g.key} className="rounded-md card p-[10px]">
        <div className="flex gap-[4px] overflow-hidden rounded-[12px]">
          {shown.map((id, i) => {
            const on = starred(id);
            const fixed = safe(id);
            const date = new Date(byId.get(id)?.t ?? 0).toLocaleString(t.locale, { dateStyle: 'medium', timeStyle: 'short' });
            return (
              <div key={id} className="relative flex-1 aspect-square min-w-0">
                <button type="button" onClick={open} aria-label={`${when}, ${count}`} className="absolute inset-0 rounded-[6px] overflow-hidden press focus-visible:ring-focus">
                  <Thumb id={id} className="!rounded-[6px]" />
                  {i === shown.length - 1 && more > 0 && (
                    <span className="absolute bottom-1.5 end-1.5 px-2 py-0.5 rounded-full bg-veil text-on-color text-micro font-bold num" aria-hidden="true">+{num(t, more)}</span>
                  )}
                </button>
                {/* The star: what stays. The app's pick (and anything safe) is set; on the others a grey star the user can switch on. */}
                {fixed ? (
                  <span className="absolute top-1.5 start-1.5 w-7 h-7 rounded-full bg-keep text-keep-ink inline-flex items-center justify-center pointer-events-none" aria-hidden="true">
                    <Star className="w-4 h-4" fill="currentColor" strokeWidth={0} />
                  </span>
                ) : (
                  <button
                    type="button" aria-pressed={on} aria-label={fmt(t.groupStarKeep, { date })}
                    onClick={() => { tapLight(); toggleStar(g.key, id); }}
                    className="absolute top-0 start-0 w-12 h-12 p-1.5 inline-flex items-start justify-start rounded-[6px] focus-visible:ring-focus"
                  >
                    <span className={`w-7 h-7 rounded-full inline-flex items-center justify-center ${on ? 'bg-keep text-keep-ink' : 'bg-veil text-on-color opacity-70'}`} aria-hidden="true">
                      <Star className="w-4 h-4" fill={on ? 'currentColor' : 'none'} strokeWidth={on ? 0 : 2.2} />
                    </span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <button type="button" onClick={open} aria-label={`${when}, ${count}`} className="w-full flex items-center gap-2 px-1 pt-2 rounded-[10px] text-start press focus-visible:ring-focus">
          <span className="flex-1 min-w-0" aria-hidden="true">
            <span className="block text-label font-bold text-fg">{when}</span>
            <span className="block text-caption text-fg-mute">
              {count}{extra > 0 ? ` · ${fmt(t.groupExtra, { n: num(t, extra) })}` : ''}
            </span>
          </span>
          <ChevronRight className="w-5 h-5 text-fg-faint rtl:rotate-180" aria-hidden="true" />
        </button>
        {/* Settle it here, side by side under the date: keep all, or mark everything without a star (the starred ones are kept). */}
        <div className="grid grid-cols-2 gap-2 pt-2">
          <button
            type="button" onClick={() => { tapLight(); onKeepAll(g); }}
            className="min-w-0 min-h-[44px] px-3 py-1.5 rounded-full bg-keep-dim text-label font-bold text-keep inline-flex items-center justify-center gap-1.5 press focus-visible:ring-focus"
          >
            <Check className="w-4 h-4 shrink-0" strokeWidth={3} aria-hidden="true" /><span className="wrap-prose leading-tight text-center">{t.keepAll}</span>
          </button>
          <button
            type="button" disabled={!extra}
            onClick={() => { tapLight(); onAsideOthers(g, others, mine.filter(id => g.ids.includes(id))); setStars(s => { const { [g.key]: _, ...rest } = s; return rest; }); }}
            aria-label={`${t.groupAsideShort}, ${plural(t, unit, extra)}`}
            className="min-w-0 min-h-[44px] px-3 py-1.5 rounded-full bg-neg-dim text-label font-bold text-neg inline-flex items-center justify-center gap-1.5 press focus-visible:ring-focus disabled:opacity-40"
          >
            {/* Into "Zum Löschen vorgemerkt": red, since these photos are headed for deletion; the archive icon says nothing is deleted yet. */}
            <Archive className="w-4 h-4 shrink-0" strokeWidth={2.4} aria-hidden="true" /><span className="wrap-prose leading-tight text-center">{t.groupAsideShort}</span>
          </button>
        </div>
      </div>
    );
  };
  return (
    <Screen title={words.title} subtitle={plural(t, 'groups', groups.length)} onBack={onBack} backLabel={t.back} info={{ label: t.aboutScreen, close: t.close, how: t.infoHow, body: words.intro }}>
      {kind === 'similar' && videoGroups.length > 0 && (
        <Segmented
          label={words.title} value={part} onChange={setPart}
          options={[
            { value: 'photos', label: `${t.statPhotos} · ${num(t, photoGroups.length)}` },
            { value: 'videos', label: `${t.statVideos} · ${num(t, videoGroups.length)}` },
          ]}
        />
      )}
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
