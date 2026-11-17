import { describe, expect, it } from 'vitest';
import { conceptWord, likeThis, normalize, search, suggest, type WordFile } from './search';
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
});
