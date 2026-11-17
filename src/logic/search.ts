import { VEC_DIM, decode, type Vectors } from './vectors';

/*
 * Search by words (Suchen, docs/features.md): without a text model on the
 * phone. src/search/words.json (ml/words.py, from ml/words.yaml) holds a few
 * hundred concepts — each with the words people type for it in German,
 * English and Arabic, and its vector in the compact space, made from an
 * English prompt with SigLIP 2's text encoder. A photo's score for a concept
 * is scored like a label's (src/logic/ai.ts): scale · k · dot(vector, concept)
 * + bias, a logit. Several concepts: the mean of their logits, so a photo
 * needs a bit of each ("Hund" + "Strand").
 *
 * PROVISIONAL (17 November 2026, 800 COCO photos with their captions): the
 * 20 best results matched the word 75–100 % of the time; SEARCH_MIN keeps
 * what is likely to show the thing, best first.
 */
export interface Concept { k: number; v: string; de: string[]; en: string[]; ar: string[] }
export interface WordFile { aiVersion: number; scale: number; bias: number; concepts: Concept[] }
export type SearchLanguage = 'de' | 'en' | 'ar';

/** A photo whose mean logit for the concepts is below this is not shown. */
export const SEARCH_MIN = -10;
/** At most this many results. */
export const SEARCH_LIMIT = 500;

/** For matching what is typed: lower case, no accents or Arabic vowel marks, one form of alef, yeh and teh marbuta. */
export function normalize(s: string): string {
  return s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
    .replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
    .replace(/\s+/g, ' ').trim();
}

export interface Suggestion { concept: number; word: string }

/**
 * Concepts for what was typed, the best match first: a word that is exactly
 * it, then one that starts with it, then one with a part that starts with it
 * ("parkschein" for "schein"), then one that contains it. The app's language
 * first, English after it (people type "Selfie" in any language).
 */
export function suggest(file: WordFile, typed: string, lang: SearchLanguage, limit = 8): Suggestion[] {
  const q = normalize(typed);
  if (!q) return [];
  const langs: SearchLanguage[] = lang === 'en' ? ['en'] : [lang, 'en'];
  const found = new Map<number, { word: string; rank: number }>();
  file.concepts.forEach((c, i) => {
    langs.forEach((l, li) => {
      for (const word of c[l]) {
        const w = normalize(word);
        const rank = w === q ? 0 : w.startsWith(q) ? 1 : w.split(/[\s-]/).some(part => part.startsWith(q)) ? 2 : w.includes(q) && q.length >= 3 ? 3 : -1;
        if (rank < 0) continue;
        const score = rank * 2 + li;
        const had = found.get(i);
        if (!had || score < had.rank) found.set(i, { word, rank: score });
      }
    });
  });
  return [...found.entries()]
    .sort((a, b) => a[1].rank - b[1].rank || a[1].word.length - b[1].word.length || a[1].word.localeCompare(b[1].word))
    .slice(0, limit)
    .map(([concept, { word }]) => ({ concept, word }));
}

/** The concept's word to show in the app's language (its first). */
export const conceptWord = (file: WordFile, concept: number, lang: SearchLanguage): string =>
  file.concepts[concept]?.[lang][0] ?? file.concepts[concept]?.en[0] ?? '';

/** The concept's vector, already multiplied by scale · k (for Vectors.scores). */
function query(file: WordFile, concept: number): Float64Array | null {
  const c = file.concepts[concept];
  const v = c && decode(c.v);
  if (!v) return null;
  const out = new Float64Array(VEC_DIM);
  for (let i = 0; i < VEC_DIM; i++) out[i] = v[i] * c.k * file.scale;
  return out;
}

export interface Hit { id: string; z: number }

/**
 * The photos that show the concepts, best first: every photo with a vector
 * (that `allowed` lets through — no screenshots, say) whose mean logit
 * reaches SEARCH_MIN, at most SEARCH_LIMIT.
 */
export function search(vectors: Vectors, file: WordFile, concepts: number[], allowed?: (id: string) => boolean): Hit[] {
  const queries = concepts.map(c => query(file, c)).filter((q): q is Float64Array => !!q);
  if (!queries.length || !vectors.size) return [];
  const sum = new Float64Array(vectors.size);
  for (const q of queries) {
    const s = vectors.scores(q);
    for (let i = 0; i < s.length; i++) sum[i] += s[i];
  }
  const hits: Hit[] = [];
  for (let i = 0; i < sum.length; i++) {
    const z = sum[i] / queries.length + file.bias;
    if (z < SEARCH_MIN) continue;
    const id = vectors.ids[i];
    if (!allowed || allowed(id)) hits.push({ id, z });
  }
  return hits.sort((a, b) => b.z - a.z).slice(0, SEARCH_LIMIT);
}

/* ------------------------------------------------------------ examples */

/*
 * What Suchen offers before anything is typed: the words below that this
 * library really has, each as a card with its best photo ("Baby", "Hund" …).
 * A word is offered when at least EXAMPLE_MIN photos reach EXAMPLE_SURE — a
 * stricter mark than SEARCH_MIN, so a word the library hasn't got doesn't
 * show a photo of something else. The most such photos first; the order
 * below breaks ties (families first). PROVISIONAL (17 November 2026, the
 * demo library): every best photo at -7.1 or above showed the word, none at
 * -8.4 or below did.
 */
/** The candidates, by their concept's first English word. */
export const EXAMPLE_WORDS = [
  'baby', 'child', 'toddler', 'family', 'twins', 'siblings', 'birthday', 'playground', 'sleeping', 'bath',
  'dog', 'cat', 'beach', 'snow', 'mountains', 'city', 'christmas', 'eid', 'ramadan', 'zoo',
  'food', 'cake', 'flowers', 'sunset', 'car', 'receipt', 'document', 'qr code',
];
export const EXAMPLE_SURE = -7.5;
export const EXAMPLE_MIN = 2;
export const EXAMPLE_COUNT = 8;
/** The words offered while the AI hasn't seen the photos yet: plain chips. */
export const FALLBACK_WORDS = ['baby', 'dog', 'beach', 'birthday', 'snow', 'playground', 'food', 'receipt'];

/** The concept whose first English word this is (-1 if none). */
export const conceptByWord = (file: WordFile, en: string): number => file.concepts.findIndex(c => c.en[0] === en);

/** One candidate scored: how many photos surely show it, and its best photos (best first, a few). */
export interface ExampleScore { concept: number; sure: number; best: string[] }

/** Scores one candidate (one pass over the vectors: the caller can spread the candidates over frames). */
export function scoreExample(vectors: Vectors, file: WordFile, concept: number, allowed?: (id: string) => boolean): ExampleScore | null {
  const q = query(file, concept);
  if (!q || !vectors.size) return null;
  const s = vectors.scores(q);
  const sure: Hit[] = [];
  for (let i = 0; i < s.length; i++) {
    const z = s[i] + file.bias;
    if (z < EXAMPLE_SURE) continue;
    const id = vectors.ids[i];
    if (!allowed || allowed(id)) sure.push({ id, z });
  }
  if (sure.length < EXAMPLE_MIN) return null;
  sure.sort((a, b) => b.z - a.z);
  return { concept, sure: sure.length, best: sure.slice(0, 12).map(h => h.id) };
}

export interface Example { concept: number; cover: string }

/**
 * The cards from the scored candidates (in EXAMPLE_WORDS' order): the most
 * sure photos first, at most `limit`; each card's cover is its best photo
 * that no card before it shows.
 */
export function pickExamples(scored: (ExampleScore | null)[], limit = EXAMPLE_COUNT): Example[] {
  const ranked = scored
    .map((s, order) => s && { ...s, order })
    .filter((s): s is ExampleScore & { order: number } => !!s)
    .sort((a, b) => b.sure - a.sure || a.order - b.order)
    .slice(0, limit);
  const used = new Set<string>();
  return ranked.map(s => {
    const cover = s.best.find(id => !used.has(id)) ?? s.best[0];
    used.add(cover);
    return { concept: s.concept, cover };
  });
}

/** All at once (the tests; the app spreads scoreExample over frames). */
export const examples = (vectors: Vectors, file: WordFile, allowed?: (id: string) => boolean, words = EXAMPLE_WORDS): Example[] =>
  pickExamples(words.map(w => { const c = conceptByWord(file, w); return c < 0 ? null : scoreExample(vectors, file, c, allowed); }));

/* ------------------------------------------------------- photos like this */

/** "Ähnliche Fotos": at least this alike to the photo (the vectors' cosine). */
export const LIKE_COS = 0.8;

/** The photos most like this one, most alike first (src/logic/vectors.ts nearest). */
export const likeThis = (vectors: Vectors, id: string, allowed?: (id: string) => boolean): Hit[] =>
  vectors.nearest(id, LIKE_COS, SEARCH_LIMIT, allowed).map(n => ({ id: n.id, z: n.cos }));
