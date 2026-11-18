import { fileUrl, PhotoLibrary } from './native/photoLibrary';

/*
 * Thumbnails: the native side makes a JPEG on demand (PhotoLibrary.thumbnail)
 * and keeps it in the app's cache folder under a size cap; here they are
 * asked for at most CONCURRENT at a time, newest request first (what is on
 * screen now matters more than what scrolled past), and remembered for the
 * session.
 */

/** The two sizes in use: grid tiles and a photo shown large (the review, a group's best). */
export const SMALL = 256;
export const LARGE = 1024;
/** A photo looked at closely (ui/Zoom): asked for only then. */
export const ZOOM = 2048;

const CONCURRENT = 6;
const done = new Map<string, string>();
const waiting = new Map<string, Promise<string>>();
const queue: (() => void)[] = [];
let active = 0;

const key = (id: string, size: number) => `${size}|${id}`;

function pump() {
  while (active < CONCURRENT && queue.length) {
    active++;
    queue.pop()!();
  }
}

export const cachedThumb = (id: string, size: number) => done.get(key(id, size));

export function thumbUrl(id: string, size: number): Promise<string> {
  const k = key(id, size);
  const have = done.get(k);
  if (have) return Promise.resolve(have);
  const pending = waiting.get(k);
  if (pending) return pending;
  const p = new Promise<string>((resolve, reject) => {
    queue.push(() => {
      PhotoLibrary.thumbnail({ id, size })
        .then(({ path }) => { const url = fileUrl(path); done.set(k, url); resolve(url); })
        .catch(reject)
        .finally(() => { waiting.delete(k); active--; pump(); });
    });
    pump();
  });
  waiting.set(k, p);
  return p;
}

/** After the native cache was emptied (a full rescan): no file remembered here exists any more. */
export function forgetAllThumbs() {
  done.clear();
}

/** A photo that is gone (deleted, moved out of reach) no longer has a thumbnail to remember. */
export function forgetThumbs(ids: string[]) {
  for (const id of ids) { done.delete(key(id, SMALL)); done.delete(key(id, LARGE)); done.delete(key(id, ZOOM)); }
}
