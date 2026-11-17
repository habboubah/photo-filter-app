import type { Photo } from '../types';

/*
 * The on-device AI's labels and what the app makes of them (docs/AI.md).
 *
 * The native scan runs the shared image model (SigLIP 2's image encoder,
 * ai-assets/image.onnx) over every photo with a local copy and stores, per
 * label, the logit `scale · dot(image, label) + bias` × 10 (Photo.ai). Here
 * those numbers become decisions, so they can be tested and tuned:
 *
 * - a photo is a *utility* photo ("unwichtig": taken to remember a piece of
 *   information, not a moment) when its best utility label reaches
 *   UTILITY_MIN and beats its best memory label by UTILITY_MARGIN. On an
 *   iPhone with iOS 18+, Vision's own utility flag lowers the bar by
 *   UTIL_FLAG_BONUS. Never a favourite, a screenshot or screen recording
 *   (they have their own list), a video, a photo with a face (iPhone's
 *   face scores) or one the user kept.
 * - its *category* is its best memory label, when that reaches MEMORY_MIN
 *   and it is not a utility photo.
 *
 * The thresholds are provisional — tuned on drawn test pictures (docs/AI.md,
 * "Thresholds") and deliberately strict; real photos decide them.
 */

/** Bump with vectors.json `aiVersion`, ImageEmbedder.swift and ImageEmbedder.kt: every photo gets its AI pass again. */
export const AI_VERSION = 1;

export type LabelKind = 'utility' | 'memory';

/** In ml/labels.yaml order — the order of Photo.ai. `npm run check:ai` compares them. */
export const LABELS = [
  { id: 'receipt', kind: 'utility' },
  { id: 'document', kind: 'utility' },
  { id: 'whiteboard', kind: 'utility' },
  { id: 'screen', kind: 'utility' },
  { id: 'chat', kind: 'utility' },
  { id: 'meme', kind: 'utility' },
  { id: 'code', kind: 'utility' },
  { id: 'accidental', kind: 'utility' },
  { id: 'kids', kind: 'memory' },
  { id: 'people', kind: 'memory' },
  { id: 'pet', kind: 'memory' },
  { id: 'food', kind: 'memory' },
  { id: 'landscape', kind: 'memory' },
] as const;

export type LabelId = (typeof LABELS)[number]['id'];
export type UtilityLabel = Extract<(typeof LABELS)[number], { kind: 'utility' }>['id'];
export type MemoryLabel = Extract<(typeof LABELS)[number], { kind: 'memory' }>['id'];

/** Logits (not tenths). Provisional: docs/AI.md, "Thresholds" (16 November 2026, smoke set). */
export const UTILITY_MIN = -5.0;
export const UTILITY_MARGIN = 1.0;
export const UTIL_FLAG_BONUS = 1.0;
export const MEMORY_MIN = -12.0;

const UTILITY_AT = LABELS.flatMap((l, i) => (l.kind === 'utility' ? [i] : []));
const MEMORY_AT = LABELS.flatMap((l, i) => (l.kind === 'memory' ? [i] : []));

/** The photo's label logits, or null when the AI has not seen it (or its scores come from another label set). */
export function logits(p: Photo): number[] | null {
  return p.ai && p.ai.length === LABELS.length ? p.ai.map(v => v / 10) : null;
}

function best(z: number[], at: number[]): { i: number; z: number } {
  let i = at[0];
  for (const j of at) if (z[j] > z[i]) i = j;
  return { i, z: z[i] };
}

/** Never a utility suggestion, whatever the scores say. */
const protectedPhoto = (p: Photo) => !!(p.fav || p.shot || p.rec || p.video || (p.faces ?? 0) > 0);

/** The utility label the photo is filed under, or null. */
export function utilityLabel(p: Photo): UtilityLabel | null {
  const z = logits(p);
  if (!z || protectedPhoto(p)) return null;
  const u = best(z, UTILITY_AT);
  const m = best(z, MEMORY_AT);
  const min = UTILITY_MIN - (p.util ? UTIL_FLAG_BONUS : 0);
  return u.z >= min && u.z - m.z >= UTILITY_MARGIN ? (LABELS[u.i].id as UtilityLabel) : null;
}

/** The photo's category (what is in it), or null. */
export function memoryLabel(p: Photo): MemoryLabel | null {
  const z = logits(p);
  if (!z || p.shot || p.rec || p.video) return null;
  const m = best(z, MEMORY_AT);
  if (m.z < MEMORY_MIN || utilityLabel(p)) return null;
  return LABELS[m.i].id as MemoryLabel;
}

/**
 * Every utility photo that could go, newest first: never a protected one
 * (`kept`: src/logic/protect.ts protectedIds — the same rule as isProtected,
 * written out here because scripts/ai-check.mjs loads this file on its own).
 */
export function findUtility(photos: Photo[], kept: Set<string>): Photo[] {
  return photos.filter(p => !p.fav && !kept.has(p.id) && utilityLabel(p) !== null).sort((a, b) => b.t - a.t);
}

export interface LabelGroup<L extends LabelId> {
  label: L;
  photos: Photo[];
  bytes: number;
}

/** Utility photos by label, in LABELS order; empty labels left out. */
export function groupUtility(photos: Photo[]): LabelGroup<UtilityLabel>[] {
  const by = new Map<UtilityLabel, Photo[]>();
  for (const p of photos) {
    const l = utilityLabel(p);
    if (!l) continue;
    const list = by.get(l);
    if (list) list.push(p); else by.set(l, [p]);
  }
  return LABELS.flatMap(({ id }) => {
    const list = by.get(id as UtilityLabel);
    return list ? [{ label: id as UtilityLabel, photos: list, bytes: list.reduce((s, p) => s + p.bytes, 0) }] : [];
  });
}

/** The categories for the home row: photos per memory label, most first, newest photo first in each. */
export function categories(photos: Photo[]): LabelGroup<MemoryLabel>[] {
  const by = new Map<MemoryLabel, Photo[]>();
  for (const p of photos) {
    const l = memoryLabel(p);
    if (!l) continue;
    const list = by.get(l);
    if (list) list.push(p); else by.set(l, [p]);
  }
  return [...by.entries()]
    .map(([label, list]) => ({ label, photos: [...list].sort((a, b) => b.t - a.t), bytes: list.reduce((s, p) => s + p.bytes, 0) }))
    .sort((a, b) => b.photos.length - a.photos.length);
}

/** How far the AI got: photos it has seen, of those it will look at (photos with a local copy — they have a hash —, not videos, screenshots or screen recordings). */
export function aiProgress(photos: Photo[]): { seen: number; total: number } {
  let seen = 0;
  let total = 0;
  for (const p of photos) {
    if (p.video || p.shot || p.rec || !p.hash) continue;
    total++;
    if (p.ai) seen++;
  }
  return { seen, total };
}
