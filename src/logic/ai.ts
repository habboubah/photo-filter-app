import type { Photo } from '../types';
import { VEC_DIM, type Vectors, decode } from './vectors.ts';

/*
 * The on-device AI's labels and what the app makes of them (docs/AI.md).
 *
 * The phone's scan runs the shared image model (SigLIP 2's image encoder,
 * ai-assets/image.onnx) over every photo with a local copy and stores its
 * compact vector (src/logic/vectors.ts). Since AI version 2 the app scores the
 * labels itself, from the vector and the label vectors in aiLabels.json
 * (ml/labels.py): a photo's logit for a label is `scale · dot(vector, label) +
 * bias`, kept × 10 in Photo.ai (LABELS order). New or better labels need no
 * new scan — only aiLabels.json and LABELS_VERSION. Here the logits become
 * decisions, so they can be tested and tuned:
 *
 * - a photo is a *utility* photo ("unwichtig": taken to remember a piece of
 *   information, not a moment) when its best utility label reaches
 *   UTILITY_MIN and beats its best memory label by UTILITY_MARGIN. On an
 *   iPhone with iOS 18+, Vision's own utility flag lowers the bar by
 *   UTIL_FLAG_BONUS. Never a favourite, a screenshot or screen recording
 *   (they have their own list), a video, a photo with a face (iPhone's
 *   face scores), one the user kept, or a *sensitive* one;
 * - a *sensitive* photo (an identity document, a bank card) reaches
 *   SENSITIVE_MIN on one of those labels and beats every utility label: it is
 *   kept for a reason, so no finder ever suggests it (src/App.tsx adds it to
 *   the protected photos) and it is no category;
 * - its *category* is its best memory label, when that reaches MEMORY_MIN
 *   and it is not a utility or sensitive photo.
 *
 * The thresholds are provisional — tuned on drawn test pictures and 1,600
 * COCO photos (docs/AI.md, "Thresholds") and deliberately strict; real photos
 * decide them.
 */

/** Bump with vectors.json `aiVersion`, ImageEmbedder.swift and ImageEmbedder.kt: every photo gets its AI pass again. */
export const AI_VERSION = 2;
/** Bump with ml/labels.py LABELS_VERSION when a label is added, removed or reworded (no new scan). */
export const LABELS_VERSION = 2;

export type LabelKind = 'utility' | 'sensitive' | 'memory';

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
  { id: 'ticket', kind: 'utility' },
  { id: 'product', kind: 'utility' },
  { id: 'parking', kind: 'utility' },
  { id: 'map', kind: 'utility' },
  { id: 'idcard', kind: 'sensitive' },
  { id: 'bankcard', kind: 'sensitive' },
  { id: 'kids', kind: 'memory' },
  { id: 'baby', kind: 'memory' },
  { id: 'people', kind: 'memory' },
  { id: 'selfie', kind: 'memory' },
  { id: 'group', kind: 'memory' },
  { id: 'pet', kind: 'memory' },
  { id: 'food', kind: 'memory' },
  { id: 'birthday', kind: 'memory' },
  { id: 'playground', kind: 'memory' },
  { id: 'school', kind: 'memory' },
  { id: 'beach', kind: 'memory' },
  { id: 'snow', kind: 'memory' },
  { id: 'landscape', kind: 'memory' },
  { id: 'city', kind: 'memory' },
  { id: 'flowers', kind: 'memory' },
  { id: 'home', kind: 'memory' },
  { id: 'christmas', kind: 'memory' },
  { id: 'ramadan', kind: 'memory' },
  { id: 'sports', kind: 'memory' },
] as const;

export type LabelId = (typeof LABELS)[number]['id'];
export type UtilityLabel = Extract<(typeof LABELS)[number], { kind: 'utility' }>['id'];
export type SensitiveLabel = Extract<(typeof LABELS)[number], { kind: 'sensitive' }>['id'];
export type MemoryLabel = Extract<(typeof LABELS)[number], { kind: 'memory' }>['id'];

/** Logits (not tenths). Provisional: docs/AI.md, "Thresholds" (17 November 2026: smoke set + COCO). */
export const UTILITY_MIN = -5.0;
export const UTILITY_MARGIN = 1.0;
export const UTIL_FLAG_BONUS = 1.0;
export const MEMORY_MIN = -12.0;
export const SENSITIVE_MIN = -7.0;
/**
 * A utility photo is "likely" (src/logic/confidence.ts) when its label clears the bar by this much;
 * just over the bar it is one to check.
 */
export const UTILITY_SURE_MARGIN = 2.0;

const UTILITY_AT = LABELS.flatMap((l, i) => (l.kind === 'utility' ? [i] : []));
const SENSITIVE_AT = LABELS.flatMap((l, i) => (l.kind === 'sensitive' ? [i] : []));
const MEMORY_AT = LABELS.flatMap((l, i) => (l.kind === 'memory' ? [i] : []));

/* ------------------------------------------------- scoring from the vectors */

/** aiLabels.json as the app reads it: each label's vector already multiplied by scale · k. */
export interface LabelModel {
  labelsVersion: number;
  bias: number;
  /** LABELS.length × VEC_DIM. */
  rows: Float64Array;
}

interface LabelFile {
  aiVersion: number; labelsVersion: number; dim: number; scale: number; bias: number;
  labels: { id: string; kind: string; k: number; v: string }[];
}

/** The label file, checked against this build (the same labels in the same order, the same AI version); null when it does not fit. */
export function labelModel(file: LabelFile): LabelModel | null {
  if (file.aiVersion !== AI_VERSION || file.labelsVersion !== LABELS_VERSION || file.dim !== VEC_DIM) return null;
  if (file.labels.length !== LABELS.length || file.labels.some((l, i) => l.id !== LABELS[i].id || l.kind !== LABELS[i].kind)) return null;
  const rows = new Float64Array(LABELS.length * VEC_DIM);
  for (const [i, l] of file.labels.entries()) {
    const v = decode(l.v);
    if (!v) return null;
    for (let j = 0; j < VEC_DIM; j++) rows[i * VEC_DIM + j] = v[j] * l.k * file.scale;
  }
  return { labelsVersion: file.labelsVersion, bias: file.bias, rows };
}

/**
 * Every slot's label logits × 10, rounded (LABELS.length per slot). `prev`:
 * the scores of an earlier, smaller store with the same labels — its slots are
 * copied, only the new ones are worked out (the AI's pass adds vectors in
 * batches).
 */
export function scoreLabels(vectors: Vectors, model: LabelModel, prev?: Int16Array, from?: number, to?: number): Int16Array {
  const n = LABELS.length;
  const out = new Int16Array(vectors.size * n);
  const start = from ?? (prev && prev.length <= out.length ? prev.length / n : 0);
  if (prev && prev.length <= out.length) out.set(prev);
  scoreInto(out, vectors, model, start, to ?? vectors.size);
  return out;
}

/** The label scores of slots [from, to) into `out` (the hot loop: 33 × 256 multiplications per photo). */
export function scoreInto(out: Int16Array, vectors: Vectors, model: LabelModel, from: number, to: number): void {
  const n = LABELS.length;
  const D = VEC_DIM; // a local: the loop must not look an imported binding up 8,448 times per photo
  const d = vectors.data;
  const rows = model.rows;
  const v = new Float64Array(D);
  for (let s = from; s < to; s++) {
    const o = s * D;
    for (let i = 0; i < D; i++) v[i] = d[o + i];
    const inv = vectors.inv[s];
    for (let l = 0; l < n; l++) {
      const r = l * D;
      let d0 = 0; let d1 = 0; let d2 = 0; let d3 = 0;
      for (let i = 0; i < D; i += 4) {
        d0 += v[i] * rows[r + i];
        d1 += v[i + 1] * rows[r + i + 1];
        d2 += v[i + 2] * rows[r + i + 2];
        d3 += v[i + 3] * rows[r + i + 3];
      }
      out[s * n + l] = Math.round(((d0 + d1 + d2 + d3) * inv + model.bias) * 10);
    }
  }
}

/**
 * The photos with their label scores laid on (Photo.ai), from the vectors' slots. Photos without a
 * vector — or whose slot has no scores yet (more vectors arrived, their scores are on the way) — stay as they are.
 */
export function withScores(photos: Photo[], vectors: Vectors, scores: Int16Array): Photo[] {
  const n = LABELS.length;
  const scored = scores.length / n;
  return photos.map(p => {
    const s = vectors.slot(p.id);
    return s === undefined || s >= scored ? p : { ...p, ai: scores.subarray(s * n, (s + 1) * n) };
  });
}

/** The photo's label logits, or null when the AI has not seen it (or its scores come from another label set). */
export function logits(p: Photo): number[] | null {
  return p.ai && p.ai.length === LABELS.length ? Array.from(p.ai, v => v / 10) : null;
}

/** The photo's scores in tenths, read in place (no copy: the finders ask for 50,000 photos at a time). */
const tenths = (p: Photo): ArrayLike<number> | null => (p.ai && p.ai.length === LABELS.length ? p.ai : null);

/** The best of these labels, as a logit. */
function best(z: ArrayLike<number>, at: number[]): { i: number; z: number } {
  let i = at[0];
  for (const j of at) if (z[j] > z[i]) i = j;
  return { i, z: z[i] / 10 };
}

/** Never a utility suggestion, whatever the scores say. */
const protectedPhoto = (p: Photo) => !!(p.fav || p.shot || p.rec || p.video || (p.faces ?? 0) > 0);

/** The sensitive label (an identity document, a bank card) the photo shows, or null: such a photo is never suggested. */
export function sensitiveLabel(p: Photo): SensitiveLabel | null {
  const z = tenths(p);
  if (!z || p.video) return null;
  const s = best(z, SENSITIVE_AT);
  return s.z >= SENSITIVE_MIN && s.z >= best(z, UTILITY_AT).z ? (LABELS[s.i].id as SensitiveLabel) : null;
}

/**
 * How far over its bar a utility photo's label is (logits), or null when it is no utility photo.
 * `strict`: logits added to the bar for this label — the user kept many of its suggestions on this
 * phone (src/logic/ledger.ts).
 */
export function utilityMargin(p: Photo, strict: Partial<Record<UtilityLabel, number>> = {}): { label: UtilityLabel; over: number } | null {
  const z = tenths(p);
  if (!z || protectedPhoto(p) || sensitiveLabel(p)) return null;
  const u = best(z, UTILITY_AT);
  const m = best(z, MEMORY_AT);
  const label = LABELS[u.i].id as UtilityLabel;
  const min = UTILITY_MIN - (p.util ? UTIL_FLAG_BONUS : 0) + (strict[label] ?? 0);
  return u.z >= min && u.z - m.z >= UTILITY_MARGIN ? { label, over: Math.min(u.z - min, u.z - m.z - UTILITY_MARGIN) } : null;
}

/** The utility label the photo is filed under, or null. */
export function utilityLabel(p: Photo, strict?: Partial<Record<UtilityLabel, number>>): UtilityLabel | null {
  return utilityMargin(p, strict)?.label ?? null;
}

/** The photo's category (what is in it), or null. */
export function memoryLabel(p: Photo): MemoryLabel | null {
  const z = tenths(p);
  if (!z || p.shot || p.rec || p.video) return null;
  const m = best(z, MEMORY_AT);
  if (m.z < MEMORY_MIN || utilityLabel(p) || sensitiveLabel(p)) return null;
  return LABELS[m.i].id as MemoryLabel;
}

/**
 * Every utility photo that could go, newest first: never a protected one
 * (`kept`: src/logic/protect.ts protectedIds — the same rule as isProtected,
 * written out here because scripts/ai-check.mjs loads this file on its own).
 */
export function findUtility(photos: Photo[], kept: Set<string>, strict?: Partial<Record<UtilityLabel, number>>): Photo[] {
  return photos.filter(p => !p.fav && !kept.has(p.id) && utilityLabel(p, strict) !== null).sort((a, b) => b.t - a.t);
}

/** The sensitive photos (identity documents, bank cards): never suggested by any finder. */
export function findSensitive(photos: Photo[]): string[] {
  return photos.filter(p => sensitiveLabel(p) !== null).map(p => p.id);
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
