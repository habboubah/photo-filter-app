import { beforeAll, describe, expect, it } from 'vitest';
import translations, { ago, androidStrings, bytes, fmt, languageNames, languages, loadFirstRun, loadLanguage, plural, setPlatform, stringsFor } from './translations';

// Arabic is its own chunk, and so are the first run's German and English strings: load them as the app does.
beforeAll(async () => { await loadLanguage('ar'); await loadFirstRun(); });

describe('translations', () => {
  it('has every key with the same placeholders in every language', () => {
    const base = translations.de;
    const holes = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map(m => m[1]).sort().join(',');
    for (const lang of languages) {
      const t = translations[lang];
      expect(Object.keys(t).sort()).toEqual(Object.keys(base).sort());
      for (const k of Object.keys(base) as (keyof typeof base)[]) expect(holes(t[k]), `${lang}.${k}`).toBe(holes(base[k]));
    }
  });

  it('gives every string naming an Apple thing an Android twin', () => {
    const apple = /iPhone|iOS|Apple|iCloud|Zuletzt gelöscht|Recently Deleted|Album|ألبوم|المحذوفة مؤخر|تطبيق الصور/;
    for (const lang of languages) {
      for (const [k, v] of Object.entries(translations[lang])) {
        if (k === 'tagline' || !apple.test(v)) continue;
        expect(androidStrings[lang][k as keyof typeof androidStrings.de], `${lang}.${k} needs an Android twin`).toBeTruthy();
      }
    }
  });

  it('lays Android’s wording over the language in the Android app', () => {
    setPlatform('android');
    expect(stringsFor('de').createAlbum).toBe('Ordner erstellen');
    setPlatform(null);
    expect(stringsFor('de').createAlbum).toBe('Album erstellen');
  });

  it('counts and sizes in the app’s locale', () => {
    expect(plural(translations.de, 'photos', 1)).toBe('1 Foto');
    expect(plural(translations.de, 'photos', 48210)).toBe('48.210 Fotos');
    expect(plural(translations.en, 'photos', 48210)).toBe('48,210 photos');
    expect(bytes(translations.de, 2_400_000_000)).toBe('2,4 GB');
    expect(bytes(translations.en, 850_000_000)).toBe('850 MB');
    expect(fmt('{a} {b}', { a: 1 })).toBe('1 {b}');
  });

  it('says Arabic counts in all its forms, right to left', () => {
    expect(translations.ar.dir).toBe('rtl');
    for (const l of languages) expect(languageNames[l]).toBe(translations[l].languageName);
    expect(plural(translations.ar, 'photos', 1)).toBe('صورة واحدة');
    expect(plural(translations.ar, 'photos', 2)).toBe('صورتان');
    expect(plural(translations.ar, 'photos', 5)).toBe('5 صور');
    expect(plural(translations.ar, 'photos', 15)).toBe('15 صورة');
    expect(plural(translations.ar, 'photos', 100)).toBe('100 صورة');
    setPlatform('android');
    expect(plural(stringsFor('ar'), 'albums', 2)).toBe('مجلدان');
    expect(stringsFor('ar').createAlbum).toBe('إنشاء مجلد');
    setPlatform(null);
    expect(plural(translations.ar, 'albums', 2)).toBe('ألبومان');
  });
});

describe('ago', () => {
  const now = Date.UTC(2026, 10, 17, 12);
  it('says how long ago in the locale', () => {
    expect(ago(translations.en, now - 20_000, now)).toBe('now');
    expect(ago(translations.en, now - 5 * 60_000, now)).toBe('5 minutes ago');
    expect(ago(translations.de, now - 3 * 3600_000, now)).toBe('vor 3 Stunden');
    expect(ago(translations.de, now - 24 * 3600_000, now)).toBe('gestern');
  });
});
