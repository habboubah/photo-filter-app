import { describe, expect, it } from 'vitest';
import { EXAMPLE_COUNT, EXAMPLE_WORDS, FALLBACK_WORDS, conceptByWord, conceptWord, examples, likeThis, normalize, pickExamples, search, suggest, type WordFile } from './search';
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
    // The demo has a playground, a birthday and snow; no cat, no baby in a bath.
    expect(words).toEqual(expect.arrayContaining(['playground', 'birthday', 'snow']));
    expect(words).not.toContain('cat');
    expect(words).not.toContain('bath');
    expect(new Set(list.map(e => e.cover)).size).toBe(list.length);
    expect(list.find(e => file.concepts[e.concept].en[0] === 'playground')!.cover).toBe('p002');
    expect(examples(Vectors.empty(), file)).toEqual([]);
  });

  it('puts the word with most sure photos first, the list order breaking ties, and gives each card its own cover', () => {
    const picked = pickExamples([
      { concept: 1, sure: 3, best: ['a', 'b'] },
      null,
      { concept: 2, sure: 9, best: ['a', 'c'] },
      { concept: 3, sure: 3, best: ['a'] },
    ], 3);
    expect(picked).toEqual([{ concept: 2, cover: 'a' }, { concept: 1, cover: 'b' }, { concept: 3, cover: 'a' }]);
  });

  it('leaves out what is not allowed (screenshots)', () => {
    const list = examples(vectors, file, id => id !== 'p002');
    expect(list.some(e => e.cover === 'p002')).toBe(false);
  });
});
