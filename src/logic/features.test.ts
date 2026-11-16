import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import { FEATURE_VERSION, dHash, features, fitSize, grey, hamming, hashParts, sharpness, stats } from './features';

const dir = path.resolve(__dirname, '..', '..', 'fixtures', 'features');
const expected = JSON.parse(fs.readFileSync(path.join(dir, 'expected.json'), 'utf8'));

function readPgm(name: string) {
  const buf = fs.readFileSync(path.join(dir, name));
  const m = /^P5\s+(\d+)\s+(\d+)\s+255\s/.exec(buf.subarray(0, 64).toString('latin1'))!;
  return { w: Number(m[1]), h: Number(m[2]), g: new Uint8Array(buf.subarray(m[0].length)) };
}

describe('feature spec', () => {
  it('matches the shared expected values (the Swift and Kotlin tests check the same file)', () => {
    expect(expected.featureVersion).toBe(FEATURE_VERSION);
    for (const [name, want] of Object.entries<Record<string, number | string>>(expected.pictures)) {
      const { w, h, g } = readPgm(name);
      expect({ w, h, ...features(g, w, h) }).toEqual(want);
    }
  });

  it('scores a sharp photo sharper than its blurred copy', () => {
    const a = readPgm('scene.pgm');
    const b = readPgm('scene-blur.pgm');
    expect(sharpness(a.g, a.w, a.h)).toBeGreaterThan(10 * sharpness(b.g, b.w, b.h));
  });

  it('hashes a re-saved, resized copy close to its original, and another picture far away', () => {
    const h = (n: string) => { const p = readPgm(n); return hashParts(dHash(p.g, p.w, p.h)); };
    expect(hamming(h('scene.pgm'), h('scene-copy.pgm'))).toBeLessThanOrEqual(10);
    expect(hamming(h('scene.pgm'), h('other.pgm'))).toBeGreaterThan(20);
  });

  it('turns RGB grey with the integer weights', () => {
    expect(grey(255, 255, 255)).toBe(255);
    expect(grey(0, 0, 0)).toBe(0);
    expect(grey(255, 0, 0)).toBe(77);
  });

  it('fits a picture into 512 without enlarging it', () => {
    expect(fitSize(4032, 3024)).toEqual({ w: 512, h: 384 });
    expect(fitSize(3024, 4032)).toEqual({ w: 384, h: 512 });
    expect(fitSize(200, 100)).toEqual({ w: 200, h: 100 });
  });

  it('handles flat and tiny pictures', () => {
    const flat = new Uint8Array(16).fill(128);
    expect(sharpness(flat, 4, 4)).toBe(0);
    expect(dHash(flat, 4, 4)).toBe('0000000000000000');
    expect(stats(new Uint8Array([0, 255]))).toEqual({ contrast: 127.5, expo: 0.5, clip: 1 });
    expect(sharpness(new Uint8Array(4), 2, 2)).toBe(0);
  });

  it('counts differing bits', () => {
    expect(hamming(hashParts('0000000000000000'), hashParts('ffffffffffffffff'))).toBe(64);
    expect(hamming(hashParts('8000000000000001'), hashParts('0000000000000000'))).toBe(2);
  });
});
