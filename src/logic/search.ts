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

/* ------------------------------------------------- words that find something */

/*
 * Suchen only offers words that find a photo in this library (19 November
 * 2026): with nothing chosen, a word on its own; with words chosen, the word
 * together with them (search's mean logit, the same SEARCH_MIN and `allowed`).
 * So no chip, suggestion or word in the sheet leads to an empty result.
 */

/** The chosen concepts' scores summed per slot (null with none chosen): what `finds` adds a word to. */
export interface Chosen { sum: Float64Array; n: number }

export function chosenScores(vectors: Vectors, file: WordFile, concepts: number[]): Chosen | null {
  const queries = concepts.map(c => query(file, c)).filter((q): q is Float64Array => !!q);
  if (!queries.length || !vectors.size) return null;
  const sum = new Float64Array(vectors.size);
  for (const q of queries) {
    const sc = vectors.scores(q);
    for (let i = 0; i < sc.length; i++) sum[i] += sc[i];
  }
  return { sum, n: queries.length };
}

/** Whether searching for `concept` (with the chosen ones, if any) finds at least one photo `allowed` lets through. */
export function finds(vectors: Vectors, file: WordFile, concept: number, chosen: Chosen | null, allowed?: (id: string) => boolean): boolean {
  const q = query(file, concept);
  if (!q || !vectors.size) return false;
  const sc = vectors.scores(q);
  const n = (chosen?.n ?? 0) + 1;
  const base = chosen?.sum;
  const { bias } = file;
  const ids = vectors.ids;
  for (let i = 0; i < sc.length; i++) {
    const z = ((base ? base[i] : 0) + sc[i]) / n + bias;
    if (z >= SEARCH_MIN && (!allowed || allowed(ids[i]))) return true;
  }
  return false;
}

/* ------------------------------------------------------------ examples */

/*
 * What Suchen offers before anything is typed: the words below that this
 * library really has, each as a card with its best photo ("Baby", "Hund" …).
 * A word is offered when at least EXAMPLE_MIN photos reach EXAMPLE_SURE — a
 * stricter mark than SEARCH_MIN, so a word the library hasn't got doesn't
 * show a photo of something else. The family words come first (Bildklar is
 * for parents), at most EXAMPLE_FAMILY_MAX of them, in the list's order; then
 * the others, the most such photos first. A word whose best photos are
 * mostly a card's already shown is left out (Baby, Kind and Kleinkind are
 * often the same photos). PROVISIONAL (18 November 2026, the demo and the
 * test library): every best photo at -7.1 or above showed the word, none at
 * -8.4 or below did.
 */
/** The candidates, by their concept's first English word. */
export const EXAMPLE_WORDS = [
  // the family words (EXAMPLE_FAMILY of them)
  'baby', 'child', 'toddler', 'family', 'twins', 'siblings', 'birthday', 'playground', 'sleeping', 'bath',
  'first steps', 'toys', 'drawing', 'kindergarten',
  // the rest
  'dog', 'cat', 'horse', 'bird', 'zoo', 'farm', 'beach', 'sea', 'lake', 'mountains', 'forest', 'park', 'garden',
  'flowers', 'snow', 'sunset', 'night', 'city', 'old town', 'museum', 'christmas', 'eid', 'ramadan', 'easter',
  'halloween', 'carnival', 'fireworks', 'wedding', 'friends', 'selfie', 'food', 'cake', 'pizza', 'ice cream',
  'restaurant', 'pool', 'swimming', 'football', 'hiking', 'skiing', 'car', 'airplane', 'train', 'boat',
  'receipt', 'document', 'qr code',
];
/** The first this many of EXAMPLE_WORDS are the family words. */
export const EXAMPLE_FAMILY = 14;
export const EXAMPLE_FAMILY_MAX = 6;
export const EXAMPLE_SURE = -7.5;
export const EXAMPLE_MIN = 2;
export const EXAMPLE_COUNT = 16;
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

/** A candidate shows mostly a chosen card's photos: more than half of its best are that card's. */
const overlaps = (chosen: string[], best: string[]): boolean => {
  const set = new Set(chosen);
  return best.filter(id => set.has(id)).length * 2 > best.length;
};

/**
 * The cards from the scored candidates (in EXAMPLE_WORDS' order, the first
 * `family` of them the family words): the family words first, at most
 * `familyMax`, in their order; then the rest, the most sure photos first;
 * at most `limit` in all, none showing mostly another's photos. Each card's
 * cover is its best photo that no card before it shows.
 */
export function pickExamples(scored: (ExampleScore | null)[], limit = EXAMPLE_COUNT, family = EXAMPLE_FAMILY, familyMax = EXAMPLE_FAMILY_MAX): Example[] {
  const all = scored.map((s, order) => s && { ...s, order }).filter((s): s is ExampleScore & { order: number } => !!s);
  const first = all.filter(s => s.order < family);
  const rest = all.filter(s => s.order >= family).sort((a, b) => b.sure - a.sure || a.order - b.order);
  const chosen: ExampleScore[] = [];
  const take = (list: ExampleScore[], max: number) => {
    let n = 0;
    for (const s of list) {
      if (chosen.length >= limit || n >= max) return;
      if (chosen.some(c => overlaps(c.best, s.best))) continue;
      chosen.push(s);
      n++;
    }
  };
  take(first, familyMax);
  take(rest, limit);
  const used = new Set<string>();
  return chosen.map(s => {
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

/*
 * The vocabulary by theme, for "Alle Wörter" on Suchen: ml/words.yaml keeps
 * its concepts in sections (people, celebrations, … photo kinds), and
 * words.json keeps their order — each section starts at its first word here
 * and runs to the next one's.
 */
export const WORD_SECTIONS = [
  { key: 'people', first: 'baby' },
  { key: 'celebrations', first: 'birthday' },
  { key: 'kids', first: 'school' },
  { key: 'babyMoments', first: 'sleeping' },
  { key: 'animals', first: 'dog' },
  { key: 'food', first: 'food' },
  { key: 'places', first: 'beach' },
  { key: 'home', first: 'living room' },
  { key: 'transport', first: 'car' },
  { key: 'sports', first: 'football' },
  { key: 'documents', first: 'receipt' },
  { key: 'things', first: 'phone' },
  { key: 'kinds', first: 'black and white' },
] as const;
export type WordSection = (typeof WORD_SECTIONS)[number]['key'];

/** Every concept in its section, in the vocabulary's order (a section whose first word is missing joins the one before). */
export function wordSections(file: WordFile): { key: WordSection; concepts: number[] }[] {
  const starts = WORD_SECTIONS.map(s => ({ key: s.key, at: conceptByWord(file, s.first) })).filter(s => s.at >= 0).sort((a, b) => a.at - b.at);
  return starts.map((s, i) => ({
    key: s.key,
    concepts: Array.from({ length: (starts[i + 1]?.at ?? file.concepts.length) - (i === 0 ? 0 : s.at) }, (_, j) => (i === 0 ? 0 : s.at) + j),
  }));
}

/** A few words to try, offered under the cards: one from many themes. */
export const TRY_WORDS = ['dog', 'beach', 'snow', 'sunset', 'christmas', 'food', 'car', 'mountains', 'zoo', 'receipt', 'sleeping', 'playground'];

/** Concepts whose words (in `lang` or English) contain what is typed; all of them for an empty filter. */
export function filterConcepts(file: WordFile, typed: string, lang: SearchLanguage, concepts: number[]): number[] {
  const q = normalize(typed);
  if (!q) return concepts;
  const langs: SearchLanguage[] = lang === 'en' ? ['en'] : [lang, 'en'];
  return concepts.filter(i => langs.some(l => file.concepts[i][l].some(w => normalize(w).includes(q))));
}
