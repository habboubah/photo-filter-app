import { useMemo, useState } from 'react';
import { X } from 'lucide-react';
import type { Photo } from '../types';
import { Strings, bytes, fmt, percent, plural } from '../translations';
import { type SearchLanguage, type WordFile, conceptWord, search, suggest } from '../logic/search';
import type { Vectors } from '../logic/vectors';
import words from '../search/words.json';
import { Dock, Empty, Screen } from '../ui/Screen';
import { Button } from '../ui/Button';
import { Field } from '../ui/Field';
import { PhotoGrid } from '../ui/Photo';
import { tapLight } from '../ui/haptics';

const FILE = words as WordFile;
/** The words offered before anything is typed (by their English word). */
const EXAMPLES = ['dog', 'beach', 'receipt', 'birthday', 'snow', 'car', 'food', 'qr code'];

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
  const offered = useMemo(() => suggest(FILE, typed, lang).filter(s => !tokens.includes(s.concept)), [typed, lang, tokens]);
  const examples = useMemo(
    () => EXAMPLES.map(w => FILE.concepts.findIndex(c => c.en.includes(w))).filter(i => i >= 0 && !tokens.includes(i)),
    [tokens],
  );
  // No screenshots or screen recordings: they have their own list.
  const hits = useMemo(
    () => search(vectors, FILE, tokens, id => { const p = byId.get(id); return !!p && !p.shot && !p.rec; }),
    [vectors, tokens, byId],
  );
  const ids = hits.map(h => h.id);
  const size = ids.reduce((s, id) => s + (byId.get(id)?.bytes ?? 0), 0);
  const add = (concept: number) => { tapLight(); setTokens(list => [...list, concept]); setTyped(''); };
  const date = (id: string) => new Date(byId.get(id)?.t ?? 0).toLocaleString(t.locale, { dateStyle: 'medium', timeStyle: 'short' });
  const ready = vectors.size > 0;
  const docked = ready && tokens.length > 0 && ids.length > 0;

  return (
    <Screen
      title={t.searchTitle} subtitle={tokens.length && ready ? `${plural(t, 'photos', ids.length)} · ${bytes(t, size)}` : undefined}
      onBack={onBack} backLabel={t.back} info={{ label: t.aboutScreen, close: t.close, body: t.searchIntro }} docked={docked}
    >
      <Field
        label={t.searchLabel} hideLabel value={typed} onChange={setTyped} placeholder={t.searchPlaceholder} autoFocus
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

      {!typed.trim() && !tokens.length && (
        <section className="space-y-2" aria-labelledby="search-try-h">
          <h2 id="search-try-h" className="eyebrow text-fg-mute px-1">{t.searchTry}</h2>
          <WordChips words={examples.map(c => ({ concept: c, word: conceptWord(FILE, c, lang) }))} onPick={add} />
        </section>
      )}

      {!ready && (
        <Empty
          title={t.searchWaiting}
          body={fmt(t.searchWaitingBody, { pct: percent(t, aiSeen.total ? Math.floor((aiSeen.seen / aiSeen.total) * 100) : 0) })}
        />
      )}

      {ready && tokens.length > 0 && (ids.length
        ? <PhotoGrid ids={ids} columns={3} label={date} onOpen={onOpen} />
        : <Empty title={t.searchNone} body={t.searchNoneBody} />)}

      {docked && (
        <Dock>
          <Button full size="lg" onClick={() => onReview(ids)}>{fmt(t.searchReview, { photos: plural(t, 'photos', ids.length) })}</Button>
        </Dock>
      )}
    </Screen>
  );
}

function WordChips({ words: list, onPick }: { words: { concept: number; word: string }[]; onPick: (concept: number) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {list.map(w => (
        <button
          key={w.concept} type="button" onClick={() => onPick(w.concept)}
          className="min-h-[44px] px-4 inline-flex items-center rounded-full glass-flat text-fg text-label font-semibold press focus-visible:ring-focus"
        >
          {w.word}
        </button>
      ))}
    </div>
  );
}
