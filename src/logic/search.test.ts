import { describe, expect, it } from 'vitest';
import { EXAMPLE_COUNT, EXAMPLE_WORDS, FALLBACK_WORDS, TRY_WORDS, WORD_SECTIONS, conceptByWord, filterConcepts, wordSections, conceptWord, examples, likeThis, normalize, pickExamples, search, suggest, type WordFile } from './search';
import { Vectors } from './vectors';
import wordFile from '../search/words.json';
import facts from '../native/demo/facts.json';

const file = wordFile as WordFile;
const demo = (facts as { id: string; vec?: string; shot?: boolean }[]).filter(p => p.vec);
const vectors = Vectors.of(demo.map(p => ({ id: p.id, v: p.vec! })));
const conceptOf = (en: string) => file.concepts.findIndex(c => c.en.includes(en));

describe('search by words', () => {
  it('matches what is typed without case, accents or Arabic vowel marks', () => {
    expect(normalize('  Kassénzettel ')).toBe('kassenzettel');
    expect(normalize('إيصال')).toBe(normalize('ايصال'));
  });

  it('suggests the word in the app\'s language first, then English', () => {
    expect(suggest(file, 'hund', 'de')[0].word).toBe('Hund');
    expect(suggest(file, 'selfie', 'de')[0].word).toBe('Selfie');
    expect(suggest(file, 'كلب', 'ar')[0].concept).toBe(conceptOf('dog'));
    expect(suggest(file, 'beach', 'de')[0].concept).toBe(conceptOf('beach'));
    expect(suggest(file, '', 'de')).toEqual([]);
    expect(suggest(file, 'xyzqw', 'de')).toEqual([]);
  });

  it('finds the demo\'s receipt first, and nothing for a word with no photo', () => {
    const hits = search(vectors, file, [conceptOf('receipt')]);
    expect(hits[0].id).toBe('p094');
    expect(hits.every((h, i) => i === 0 || h.z <= hits[i - 1].z)).toBe(true);
    expect(search(vectors, file, [])).toEqual([]);
    expect(search(Vectors.empty(), file, [conceptOf('receipt')])).toEqual([]);
  });

  it('shows the concept\'s word in the app\'s language', () => {
    expect(conceptWord(file, conceptOf('dog'), 'de')).toBe('Hund');
    expect(conceptWord(file, conceptOf('dog'), 'ar')).toBe('كلب');
  });

  it('finds a photo\'s look-alikes, most alike first, never the photo itself', () => {
    // The Garda lake series (p068 …) is drawn from one scene.
    const hits = likeThis(vectors, 'p068');
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.some(h => h.id === 'p068')).toBe(false);
    expect(hits[0].z).toBeGreaterThanOrEqual(hits[hits.length - 1].z);
  });
  it('knows every example word, and offers only what the library has, best photo as the cover', () => {
    for (const w of [...EXAMPLE_WORDS, ...FALLBACK_WORDS]) expect(conceptByWord(file, w), w).toBeGreaterThanOrEqual(0);
    const list = examples(vectors, file);
    const words = list.map(e => file.concepts[e.concept].en[0]);
    expect(list.length).toBeGreaterThan(0);
    expect(list.length).toBeLessThanOrEqual(EXAMPLE_COUNT);
    // The demo has a child, a birthday and snow; no cat, no baby in a bath. The family words come first
    // (since 19 Nov 2026 no demo photo reads as a baby: the sandbox shot became pancakes).
    expect(words).toEqual(expect.arrayContaining(['birthday', 'snow']));
    expect(words[0]).toBe('child');
    expect(words).not.toContain('cat');
    expect(words).not.toContain('bath');
    expect(new Set(list.map(e => e.cover)).size).toBe(list.length);
    expect(list.find(e => file.concepts[e.concept].en[0] === 'birthday')!.cover).toBe('p031');
    expect(examples(Vectors.empty(), file)).toEqual([]);
  });

  it('puts the word with most sure photos first, the list order breaking ties, and gives each card its own cover', () => {
    const picked = pickExamples([
      { concept: 1, sure: 3, best: ['a', 'b', 'x'] },
      null,
      { concept: 2, sure: 9, best: ['a', 'c', 'y'] },
      { concept: 3, sure: 3, best: ['a', 'd', 'z'] },
    ], 3, 0);
    expect(picked).toEqual([{ concept: 2, cover: 'a' }, { concept: 1, cover: 'b' }, { concept: 3, cover: 'd' }]);
  });

  it('shows the family words first, in their order and at most so many, and no word showing mostly the same photos', () => {
    const picked = pickExamples([
      { concept: 10, sure: 2, best: ['b1', 'b2', 'b3'] }, // baby
      { concept: 11, sure: 8, best: ['b1', 'b2', 'k1'] }, // child: mostly the baby's photos
      { concept: 12, sure: 3, best: ['f1', 'f2'] }, // family
      { concept: 13, sure: 5, best: ['g1', 'g2'] }, // birthday: one family word too many
      { concept: 20, sure: 30, best: ['r1', 'r2'] }, // receipt
      { concept: 21, sure: 9, best: ['c1', 'c2'] }, // city
    ], 8, 4, 2);
    expect(picked.map(p => p.concept)).toEqual([10, 12, 20, 21]);
  });

  it('leaves out what is not allowed (screenshots)', () => {
    const list = examples(vectors, file, id => id !== 'p031');
    expect(list.some(e => e.cover === 'p031')).toBe(false);
  });
});

describe('the vocabulary by theme', () => {
  it('finds every section and puts every word in exactly one', () => {
    for (const s of WORD_SECTIONS) expect(conceptByWord(file, s.first), s.first).toBeGreaterThanOrEqual(0);
    const sections = wordSections(file);
    expect(sections.map(s => s.key)).toEqual(WORD_SECTIONS.map(s => s.key));
    const all = sections.flatMap(s => s.concepts);
    expect(all).toEqual(file.concepts.map((_, i) => i));
    expect(sections.find(s => s.key === 'animals')!.concepts.map(i => file.concepts[i].en[0])).toContain('giraffe');
    expect(sections.find(s => s.key === 'documents')!.concepts.map(i => file.concepts[i].en[0])).toContain('passport');
  });

  it('offers words to try that exist', () => {
    for (const w of TRY_WORDS) expect(conceptByWord(file, w), w).toBeGreaterThanOrEqual(0);
  });

  it('filters the list by any of a word\'s forms', () => {
    const all = file.concepts.map((_, i) => i);
    expect(filterConcepts(file, '', 'de', all)).toHaveLength(all.length);
    const cake = filterConcepts(file, 'kuchen', 'de', all).map(i => file.concepts[i].en[0]);
    expect(cake).toContain('birthday');
    expect(filterConcepts(file, 'giraffe', 'de', all).map(i => file.concepts[i].en[0])).toEqual(['giraffe']);
  });
});
