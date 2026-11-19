import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, SearchX, Sparkles, X } from 'lucide-react';
import type { Photo } from '../types';
import { Strings, bytes, fmt, percent, plural } from '../translations';
import {
  EXAMPLE_WORDS, FALLBACK_WORDS, TRY_WORDS, type Example, type ExampleScore, type SearchLanguage, type WordFile, type WordSection,
  chosenScores, conceptByWord, conceptWord, filterConcepts, finds, pickExamples, scoreExample, search, suggest, wordSections,
  type Chosen,
} from '../logic/search';
import { sensitiveLabel } from '../logic/ai';
import type { Vectors } from '../logic/vectors';
import words from '../search/words.json';
import { Dock, Empty, Screen } from '../ui/Screen';
import { Sheet } from '../ui/Sheet';
import { Button } from '../ui/Button';
import { Field } from '../ui/Field';
import { PhotoGrid, Thumb } from '../ui/Photo';
import { tapLight } from '../ui/haptics';
import { MarkButton, Opened, PickBar, gridPick, usePick } from '../ui/pick';

const FILE = words as WordFile;
const SECTIONS = wordSections(FILE);

/** The last cards worked out, kept while the library's vectors stay the same (opening Suchen again is instant). */
let cached: { vectors: Vectors; size: number; list: Example[] } | null = null;

/**
 * The example cards for this library (src/logic/search.ts examples), one
 * word per macrotask so typing stays smooth on a big library; null until done.
 */
function useExamples(vectors: Vectors, allowed: (id: string) => boolean): Example[] | null {
  const fresh = cached && cached.vectors === vectors && cached.size === vectors.size ? cached.list : null;
  const [list, setList] = useState<Example[] | null>(fresh);
  useEffect(() => {
    if (fresh) { setList(fresh); return; }
    if (!vectors.size) return;
    let stop = false;
    let timer = 0;
    const size = vectors.size;
    const concepts = EXAMPLE_WORDS.map(w => conceptByWord(FILE, w));
    const scored: (ExampleScore | null)[] = [];
    const step = () => {
      if (stop) return;
      const c = concepts[scored.length];
      scored.push(c < 0 ? null : scoreExample(vectors, FILE, c, allowed));
      if (scored.length < concepts.length) { timer = window.setTimeout(step, 0); return; }
      const done = pickExamples(scored);
      cached = { vectors, size, list: done };
      setList(done);
    };
    timer = window.setTimeout(step, 0);
    return () => { stop = true; window.clearTimeout(timer); };
    // `allowed` follows byId, which changes with the library, as `vectors` does.
  }, [vectors, vectors.size, fresh]);
  return list;
}

/** Which words find a photo, per library and per choice of words (src/logic/search.ts finds). */
const known = new Map<string, Map<number, boolean>>();
let knownFor: Vectors | null = null;

/**
 * The words that find something in this library — with the chosen words, if
 * any — worked out a few at a time (about 8 ms per macrotask, `first` first)
 * so typing stays smooth; a word not worked out yet counts as not there, so
 * nothing on screen ever leads to an empty result. `check` answers one word
 * at once (the suggestions while typing).
 */
function useSearchable(vectors: Vectors, chosen: Chosen | null, tokens: number[], allowed: (id: string) => boolean, first: number[]) {
  const key = `${vectors.size}|${[...tokens].sort((a, b) => a - b).join(',')}`;
  if (knownFor !== vectors) { known.clear(); knownFor = vectors; }
  if (known.size > 24) known.clear();
  let map = known.get(key);
  if (!map) { map = new Map(); known.set(key, map); }
  const [, bump] = useState(0);
  useEffect(() => {
    if (!vectors.size) return;
    const m = known.get(key) ?? new Map<number, boolean>();
    known.set(key, m);
    const order = [...new Set([...first, ...FILE.concepts.map((_, i) => i)])].filter(c => !tokens.includes(c) && !m.has(c));
    let i = 0;
    let stop = false;
    let timer = 0;
    let shown = 0;
    const step = () => {
      if (stop) return;
      const until = performance.now() + 8;
      while (i < order.length && performance.now() < until) { const c = order[i++]; m.set(c, finds(vectors, FILE, c, chosen, allowed)); }
      // Redraw once the first words are known, then now and then, and at the end.
      if (i >= order.length || (i >= first.length && shown < first.length) || i - shown >= 40) { shown = i; bump(n => n + 1); }
      if (i < order.length) timer = window.setTimeout(step, 0);
    };
    timer = window.setTimeout(step, 0);
    return () => { stop = true; window.clearTimeout(timer); };
    // `chosen` and `allowed` follow `key` and the library.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vectors, key]);
  const m = map;
  const check = (c: number) => {
    let v = m.get(c);
    if (v === undefined && vectors.size) { v = finds(vectors, FILE, c, chosen, allowed); m.set(c, v); }
    return !!v;
  };
  const left = FILE.concepts.length - tokens.length;
  return { ok: (c: number) => m.get(c) === true, check, done: m.size >= left, count: [...m.values()].filter(Boolean).length };
}

/**
 * Suchen: photos by what is in them (src/logic/search.ts) — words from the
 * vocabulary, picked as chips, results best first. Only words that find a
 * photo are offered — with the chosen ones together (useSearchable). A tap
 * opens a photo large, with the photos like it one tap away; *Auswählen* picks
 * (src/ui/pick.tsx); "Durchgehen" reviews what was found (search to clean).
 */
export function SearchView({ t, lang, vectors, byId, aiSeen, onBack, onOpen, onReview, onAside }: {
  t: Strings;
  lang: SearchLanguage;
  vectors: Vectors;
  byId: Map<string, Photo>;
  /** How far the AI's pass got (src/logic/ai.ts aiProgress): search waits for it. */
  aiSeen: { seen: number; total: number };
  onBack: () => void;
  /** Ähnliche Fotos for a photo (from the photo opened large). */
  onOpen: (id: string) => void;
  onReview: (ids: string[]) => void;
  /** Into "Zum Löschen vorgemerkt" (nothing is deleted). */
  onAside: (photos: Photo[]) => void;
}) {
  const [typed, setTyped] = useState('');
  const [tokens, setTokens] = useState<number[]>([]);
  const [allWords, setAllWords] = useState(false);
  const fallbackAll = useMemo(() => FALLBACK_WORDS.map(w => conceptByWord(FILE, w)).filter(i => i >= 0), []);
  const tryAll = useMemo(() => TRY_WORDS.map(w => conceptByWord(FILE, w)).filter(i => i >= 0), []);
  // No screenshots or screen recordings: they have their own list.
  const allowed = useMemo(() => (id: string) => { const p = byId.get(id); return !!p && !p.shot && !p.rec; }, [byId]);
  // A card's cover is never a photo of an ID or a bank card.
  const coverable = useMemo(() => (id: string) => { const p = byId.get(id); return !!p && !p.shot && !p.rec && !sensitiveLabel(p); }, [byId]);
  const cards = useExamples(vectors, coverable);
  const hits = useMemo(() => search(vectors, FILE, tokens, allowed), [vectors, tokens, allowed]);
  const chosen = useMemo(() => chosenScores(vectors, FILE, tokens), [vectors, tokens]);
  const searchable = useSearchable(vectors, chosen, tokens, allowed, [...tryAll, ...fallbackAll]);
  // Suggestions while typing: only words that find something (with the chosen ones).
  const offered = suggest(FILE, typed, lang, 24).filter(x => !tokens.includes(x.concept) && searchable.check(x.concept)).slice(0, 8);
  const fallback = fallbackAll.filter(searchable.ok);
  const ids = hits.map(h => h.id);
  const photos = useMemo(() => hits.flatMap(h => byId.get(h.id) ?? []), [hits, byId]);
  const pick = usePick(photos);
  const [open, setOpen] = useState<string | null>(null);
  const size = ids.reduce((s, id) => s + (byId.get(id)?.bytes ?? 0), 0);
  const add = (concept: number) => { tapLight(); setTokens(list => [...list, concept]); setTyped(''); };
  const date = (id: string) => new Date(byId.get(id)?.t ?? 0).toLocaleString(t.locale, { dateStyle: 'medium', timeStyle: 'short' });
  const ready = vectors.size > 0;
  const docked = ready && tokens.length > 0 && ids.length > 0;
  // A few words to try above the cards (none a card already shows), then every word in a sheet.
  // Only words that find something (with the chosen ones); topped up from the rest of the vocabulary.
  const shownCards = new Set((cards ?? []).map(c => c.concept));
  const tryWords = [...new Set([...tryAll, ...FILE.concepts.map((_, i) => i)])]
    .filter(c => !shownCards.has(c) && !tokens.includes(c) && searchable.ok(c)).slice(0, 8);
  const allWordsButton = (
    <button
      type="button" onClick={() => { tapLight(); setAllWords(true); }}
      className="min-h-[44px] ps-4 pe-3 inline-flex items-center gap-1 rounded-full text-label font-semibold text-accent bg-accent-dim press focus-visible:ring-focus"
    >
      {fmt(t.searchAllWords, { n: searchable.count })}<ChevronRight className="w-4 h-4 rtl:rotate-180" aria-hidden="true" />
    </button>
  );

  return (
    <Screen
      title={t.searchTitle} subtitle={tokens.length && ready ? `${plural(t, 'photos', ids.length)} · ${bytes(t, size)}` : undefined}
      onBack={onBack} backLabel={t.back} info={{ label: t.aboutScreen, close: t.close, how: t.infoHow, body: t.searchIntro }} docked={docked}
    >
      <Field
        label={t.searchLabel} hideLabel value={typed} onChange={setTyped} placeholder={t.searchPlaceholder} autoFocus data-tip="tip.search"
        enterKeyHint="search" autoCapitalize="none" autoCorrect="off" spellCheck={false}
        onKeyDown={e => { if (e.key === 'Enter' && offered[0]) add(offered[0].concept); }}
      />

      {tokens.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tokens.map(c => {
            const word = conceptWord(FILE, c, lang);
            return (
              <button
                key={c} type="button" aria-label={fmt(t.searchRemove, { word })}
                onClick={() => { tapLight(); setTokens(list => list.filter(x => x !== c)); }}
                className="min-h-[44px] ps-4 pe-3 inline-flex items-center gap-1.5 rounded-full bg-accent-fill text-accent-fill-ink sheen text-label font-semibold press focus-visible:ring-focus"
              >
                {word}<X className="w-4 h-4" aria-hidden="true" />
              </button>
            );
          })}
        </div>
      )}

      {typed.trim() !== '' && (
        offered.length
          ? <WordChips words={offered.map(s => ({ concept: s.concept, word: s.word }))} onPick={add} />
          : <p className="text-label text-fg-mute px-1 wrap-prose">{t.searchNoWord}</p>
      )}

      {/* What can be searched for first, as words to tap; the photo cards of the library under them.
          The words stay while a search is shown (without the ones already chosen), so another is one tap away. */}
      {!typed.trim() && ready && (tokens.length > 0 || (cards !== null && cards.length > 0)) && (
        <section className="space-y-2" aria-labelledby="search-words-h">
          <h2 id="search-words-h" className="eyebrow text-fg-mute px-1">{t.searchWordsTitle}</h2>
          <WordChips words={tryWords.map(c => ({ concept: c, word: conceptWord(FILE, c, lang) }))} onPick={add} after={searchable.count > 0 ? allWordsButton : undefined} />
        </section>
      )}

      {!typed.trim() && !tokens.length && ready && cards === null && (
        <div className="grid grid-cols-3 gap-[8px]" aria-hidden="true">
          {[0, 1, 2, 3, 4, 5].map(i => <div key={i} className="aspect-square rounded-sm bg-surface" />)}
        </div>
      )}

      {!typed.trim() && !tokens.length && ready && cards !== null && cards.length > 0 && (
        <section className="space-y-2" aria-labelledby="search-yours-h">
          <h2 id="search-yours-h" className="eyebrow text-fg-mute px-1">{t.searchYours}</h2>
          <div className="grid grid-cols-3 gap-[8px]">
            {cards.map(c => (
              <button
                key={c.concept} type="button" onClick={() => add(c.concept)}
                className="relative aspect-square rounded-sm overflow-hidden bg-surface text-start press focus-visible:ring-focus"
              >
                <Thumb id={c.cover} className="!rounded-none absolute inset-0" />
                <span className="absolute inset-0 photo-shade" aria-hidden="true" />
                <span className="absolute inset-x-0 bottom-0 block px-2 pb-1.5 text-on-color text-caption font-semibold truncate first-letter:uppercase">
                  {conceptWord(FILE, c.concept, lang)}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      {!typed.trim() && !tokens.length && (!ready || (cards !== null && cards.length === 0)) && (
        <section className="space-y-2" aria-labelledby="search-try-h">
          <h2 id="search-try-h" className="eyebrow text-fg-mute px-1">{t.searchTry}</h2>
          <WordChips words={fallback.map(c => ({ concept: c, word: conceptWord(FILE, c, lang) }))} onPick={add} after={allWordsButton} />
        </section>
      )}

      <AllWords t={t} lang={lang} has={searchable.ok} open={allWords} onClose={() => setAllWords(false)} onPick={c => { setAllWords(false); add(c); }} />

      {!ready && (
        <Empty
          icon={Sparkles} tone="accent"
          title={t.searchWaiting}
          body={fmt(t.searchWaitingBody, { pct: percent(t, aiSeen.total ? Math.floor((aiSeen.seen / aiSeen.total) * 100) : 0) })}
        />
      )}

      {ready && tokens.length > 0 && (ids.length
        ? <><PickBar t={t} pick={pick} list={photos} count={n => plural(t, 'binPicked', n)} /><PhotoGrid ids={ids} columns={3} label={date} {...gridPick(pick, setOpen, x => fmt(t.selectTile, { item: date(x) }))} /></>
        : <Empty icon={SearchX} tone="accent" title={t.searchNone} body={t.searchNoneBody} />)}

      {docked && (
        <Dock>
          {pick.selecting
            ? <MarkButton t={t} photos={pick.chosen} count={l => plural(t, 'photos', l.length)} onClick={() => { onAside(pick.chosen); pick.select(false); }} />
            : <Button full size="lg" onClick={() => onReview(ids)}>{fmt(t.searchReview, { photos: plural(t, 'photos', ids.length) })}</Button>}
        </Dock>
      )}
      <Opened t={t} photo={open ? byId.get(open) ?? null : null} alt={open ? date(open) : ''} onClose={() => setOpen(null)} onAside={p => onAside([p])} onLike={p => onOpen(p.id)} />
    </Screen>
  );
}

/**
 * Every word Suchen can find something for (`has`), by theme (src/logic/search.ts wordSections), in a
 * sheet: a field narrows it down by any form of a word ("Kuchen" finds
 * Geburtstag), a tap searches for it.
 */
function AllWords({ t, lang, has, open, onClose, onPick }: { t: Strings; lang: SearchLanguage; has: (concept: number) => boolean; open: boolean; onClose: () => void; onPick: (concept: number) => void }) {
  const [filter, setFilter] = useState('');
  const names: Record<WordSection, string> = {
    people: t.wordsPeople, celebrations: t.wordsCelebrations, kids: t.wordsKids, babyMoments: t.wordsBabyMoments, animals: t.wordsAnimals,
    food: t.wordsFood, places: t.wordsPlaces, home: t.wordsHome, transport: t.wordsTransport, sports: t.wordsSports,
    documents: t.wordsDocuments, things: t.wordsThings, kinds: t.wordsKinds,
  };
  const shown = SECTIONS.map(s => ({ ...s, concepts: filterConcepts(FILE, filter, lang, s.concepts.filter(has)) })).filter(s => s.concepts.length);
  const close = () => { setFilter(''); onClose(); };
  return (
    <Sheet open={open} title={t.searchWordsSheet} closeLabel={t.close} onClose={close}>
      <div className="space-y-5">
        <Field
          label={t.searchWordsFilter} hideLabel value={filter} onChange={setFilter} placeholder={t.searchWordsFilter}
          enterKeyHint="search" autoCapitalize="none" autoCorrect="off" spellCheck={false}
        />
        {shown.length === 0 && <p className="text-label text-fg-mute px-1 wrap-prose">{t.searchNoWord}</p>}
        {shown.map(s => (
          <section key={s.key} className="space-y-2" aria-labelledby={`words-${s.key}`}>
            <h3 id={`words-${s.key}`} className="eyebrow text-fg-mute px-1">{names[s.key]}</h3>
            <WordChips words={s.concepts.map(c => ({ concept: c, word: conceptWord(FILE, c, lang) }))} onPick={c => { setFilter(''); onPick(c); }} />
          </section>
        ))}
      </div>
    </Sheet>
  );
}

function WordChips({ words: list, onPick, after }: { words: { concept: number; word: string }[]; onPick: (concept: number) => void; after?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap gap-2">
      {list.map(w => (
        <button
          key={w.concept} type="button" onClick={() => onPick(w.concept)}
          className="min-h-[44px] px-4 inline-flex items-center rounded-full glass-flat text-fg text-label font-semibold press focus-visible:ring-focus"
        >
          <span className="inline-block first-letter:uppercase">{w.word}</span>
        </button>
      ))}
      {after}
    </div>
  );
}
