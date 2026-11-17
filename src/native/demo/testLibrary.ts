import type { Photo } from '../../types';

/*
 * The test library in the web demo: about 560 real photos and videos
 * (scripts/demo-library.py → ./test-library/, not in git). Loaded only in
 * `npm run dev` and only when it has been built; library.ts decides.
 */
const files = import.meta.glob('./test-library/facts.json', { eager: true, import: 'default' }) as Record<string, Photo[]>;
const urls = import.meta.glob('./test-library/photos/*.jpg', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

export const facts: Photo[] = Object.values(files)[0] ?? [];
/** A copy the demo made (a still from a Live Photo, a smaller video) shows its original's picture. */
export const urlOf = (id: string) => urls[`./test-library/photos/${id.split('-')[0]}.jpg`] ?? '';
