/**
 * Which albums (iPhone) / folders (Android) stand as chips under the photo in
 * a review. Not all of them — a phone has dozens (WhatsApp, Snapchat, …): only
 * the ones the user chose in the review's *Alben* sheet (kept as a view
 * preference, `bildklar-review-albums`), the ones made in this review, and
 * the one the photo on screen is already filed into, so its state is always
 * visible. In the order of `all` (the last used first); made ones first.
 */
export function rowAlbums<A extends { id: string }>(all: readonly A[], pinned: readonly string[], made: readonly A[], current?: string): A[] {
  const pin = new Set(pinned);
  const seen = new Set<string>();
  const out: A[] = [];
  for (const a of [...made, ...all.filter(x => pin.has(x.id) || x.id === current)]) {
    if (seen.has(a.id)) continue;
    seen.add(a.id);
    out.push(a);
  }
  return out;
}

const KEY = 'bildklar-review-albums';

/** The albums chosen for the review's row (a view preference: may come back empty, never throws). */
export function loadPinned(): string[] {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function savePinned(ids: readonly string[]): void {
  try { localStorage.setItem(KEY, JSON.stringify(ids)); } catch { /* storage full or off: the row just forgets */ }
}
