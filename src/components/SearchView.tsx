import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { ChevronRight, SearchX, Sparkles, X } from 'lucide-react';
import type { Photo } from '../types';
import { Strings, bytes, fmt, percent, plural } from '../translations';
import {
  EXAMPLE_WORDS, FALLBACK_WORDS, TRY_WORDS, type Example, type ExampleScore, type SearchLanguage, type WordFile, type WordSection,
  conceptByWord, conceptWord, filterConcepts, pickExamples, scoreExample, search, suggest, wordSections,
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

/**
 * Suchen: photos by what is in them (src/logic/search.ts) — words from the
 * vocabulary, picked as chips, results best first. A tap on a photo shows the
 * photos like it; "Durchgehen" reviews what was found (search to clean).
 */
export function SearchView({ t, lang, vectors, byId, aiSeen, onBack, onOpen, onReview }: {
  t: Strings;
  lang: SearchLanguage;
  vectors: Vectors;
  byId: Map<string, Photo>;
  /** How far the AI's pass got (src/logic/ai.ts aiProgress): search waits for it. */
  aiSeen: { seen: number; total: number };
  onBack: () => void;
  onOpen: (id: string) => void;
  onReview: (ids: string[]) => void;
}) {
  const [typed, setTyped] = useState('');
  const [tokens, setTokens] = useState<number[]>([]);
  const [allWords, setAllWords] = useState(false);
  const offered = useMemo(() => suggest(FILE, typed, lang).filter(s => !tokens.includes(s.concept)), [typed, lang, tokens]);
  const fallback = useMemo(() => FALLBACK_WORDS.map(w => conceptByWord(FILE, w)).filter(i => i >= 0), []);
  // No screenshots or screen recordings: they have their own list.
  const allowed = useMemo(() => (id: string) => { const p = byId.get(id); return !!p && !p.shot && !p.rec; }, [byId]);
  // A card's cover is never a photo of an ID or a bank card.
  const coverable = useMemo(() => (id: string) => { const p = byId.get(id); return !!p && !p.shot && !p.rec && !sensitiveLabel(p); }, [byId]);
  const cards = useExamples(vectors, coverable);
  const hits = useMemo(() => search(vectors, FILE, tokens, allowed), [vectors, tokens, allowed]);
  const ids = hits.map(h => h.id);
  const size = ids.reduce((s, id) => s + (byId.get(id)?.bytes ?? 0), 0);
  const add = (concept: number) => { tapLight(); setTokens(list => [...list, concept]); setTyped(''); };
  const date = (id: string) => new Date(byId.get(id)?.t ?? 0).toLocaleString(t.locale, { dateStyle: 'medium', timeStyle: 'short' });
  const ready = vectors.size > 0;
  const docked = ready && tokens.length > 0 && ids.length > 0;
  // A few words to try under the cards (none a card already shows), then every word in a sheet.
  const tryWords = useMemo(() => {
    const shown = new Set((cards ?? []).map(c => c.concept));
    return TRY_WORDS.map(w => conceptByWord(FILE, w)).filter(c => c >= 0 && !shown.has(c)).slice(0, 8);
  }, [cards]);
  const allWordsButton = (
    <button
      type="button" onClick={() => { tapLight(); setAllWords(true); }}
      className="min-h-[44px] ps-4 pe-3 inline-flex items-center gap-1 rounded-full text-label font-semibold text-accent bg-accent-dim press focus-visible:ring-focus"
    >
      {fmt(t.searchAllWords, { n: FILE.concepts.length })}<ChevronRight className="w-4 h-4 rtl:rotate-180" aria-hidden="true" />
    </button>
  );

  return (
    <Screen
      title={t.searchTitle} subtitle={tokens.length && ready ? `${plural(t, 'photos', ids.length)} · ${bytes(t, size)}` : undefined}
      onBack={onBack} backLabel={t.back} info={{ label: t.aboutScreen, close: t.close, body: t.searchIntro }} docked={docked}
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

      {!typed.trim() && !tokens.length && ready && cards === null && (
        <div className="grid grid-cols-3 min-[560px]:grid-cols-4 gap-[8px]" aria-hidden="true">
          {[0, 1, 2, 3, 4, 5].map(i => <div key={i} className="aspect-square rounded-sm bg-surface" />)}
        </div>
      )}

      {!typed.trim() && !tokens.length && ready && cards !== null && cards.length > 0 && (
        <section className="space-y-2" aria-labelledby="search-yours-h">
          <h2 id="search-yours-h" className="eyebrow text-fg-mute px-1">{t.searchYours}</h2>
          <div className="grid grid-cols-3 min-[560px]:grid-cols-4 gap-[8px]">
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

      {!typed.trim() && !tokens.length && ready && cards !== null && cards.length > 0 && (
        <section className="space-y-2" aria-labelledby="search-words-h">
          <h2 id="search-words-h" className="eyebrow text-fg-mute px-1">{t.searchWordsTitle}</h2>
          <WordChips words={tryWords.map(c => ({ concept: c, word: conceptWord(FILE, c, lang) }))} onPick={add} after={allWordsButton} />
        </section>
      )}

      {!typed.trim() && !tokens.length && (!ready || (cards !== null && cards.length === 0)) && (
        <section className="space-y-2" aria-labelledby="search-try-h">
          <h2 id="search-try-h" className="eyebrow text-fg-mute px-1">{t.searchTry}</h2>
          <WordChips words={fallback.map(c => ({ concept: c, word: conceptWord(FILE, c, lang) }))} onPick={add} after={allWordsButton} />
        </section>
      )}

      <AllWords t={t} lang={lang} open={allWords} onClose={() => setAllWords(false)} onPick={c => { setAllWords(false); add(c); }} />

      {!ready && (
        <Empty
          icon={Sparkles} tone="accent"
          title={t.searchWaiting}
          body={fmt(t.searchWaitingBody, { pct: percent(t, aiSeen.total ? Math.floor((aiSeen.seen / aiSeen.total) * 100) : 0) })}
        />
      )}

      {ready && tokens.length > 0 && (ids.length
        ? <PhotoGrid ids={ids} columns={3} label={date} onOpen={onOpen} />
        : <Empty icon={SearchX} tone="accent" title={t.searchNone} body={t.searchNoneBody} />)}

      {docked && (
        <Dock>
          <Button full size="lg" onClick={() => onReview(ids)}>{fmt(t.searchReview, { photos: plural(t, 'photos', ids.length) })}</Button>
        </Dock>
      )}
    </Screen>
  );
}

/**
 * Every word Suchen knows, by theme (src/logic/search.ts wordSections), in a
 * sheet: a field narrows it down by any form of a word ("Kuchen" finds
 * Geburtstag), a tap searches for it.
 */
function AllWords({ t, lang, open, onClose, onPick }: { t: Strings; lang: SearchLanguage; open: boolean; onClose: () => void; onPick: (concept: number) => void }) {
  const [filter, setFilter] = useState('');
  const names: Record<WordSection, string> = {
    people: t.wordsPeople, celebrations: t.wordsCelebrations, kids: t.wordsKids, babyMoments: t.wordsBabyMoments, animals: t.wordsAnimals,
    food: t.wordsFood, places: t.wordsPlaces, home: t.wordsHome, transport: t.wordsTransport, sports: t.wordsSports,
    documents: t.wordsDocuments, things: t.wordsThings, kinds: t.wordsKinds,
  };
  const shown = SECTIONS.map(s => ({ ...s, concepts: filterConcepts(FILE, filter, lang, s.concepts) })).filter(s => s.concepts.length);
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
