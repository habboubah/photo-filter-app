/*
 * The compact vectors (docs/AI.md, "The compact vector"): for every photo the
 * phone's AI pass stores 256 numbers — the shared image model's embedding,
 * projected (ai-assets/compact.bin) and packed as int8 in base64. They do not
 * ride with the facts (50,000 × 344 characters would slow every reload): the
 * facts carry only `vv`, the AI version of the vector, and the app fetches
 * the vectors it lacks once (PhotoLibrary.getVectors) and keeps them here.
 *
 * From them the app scores its labels (src/logic/ai.ts), confirms similar
 * groups and copies (src/logic/similar.ts), searches by words
 * (src/logic/search.ts) and finds a photo's look-alikes.
 *
 * Cosines: each vector is kept as int8 with its inverse length, so
 * cos(a, b) = dot(a, b) · inv(a) · inv(b) — the int8 scaling cancels out.
 */
export const VEC_DIM = 256;

export interface VectorRow { id: string; v: string }

/** A packed vector (int8 in base64) as numbers; null when it is not VEC_DIM long or not base64. */
export function decode(b64: string, dim = VEC_DIM): Int8Array | null {
  let raw: string;
  try { raw = atob(b64); } catch { return null; }
  if (raw.length !== dim) return null;
  const out = new Int8Array(dim);
  for (let i = 0; i < dim; i++) {
    const b = raw.charCodeAt(i);
    out[i] = b > 127 ? b - 256 : b;
  }
  return out;
}

export class Vectors {
  /** One slot per photo, in the order they arrived; a photo's slot never moves (scores cached per slot stay valid). */
  readonly ids: readonly string[];
  private readonly slots: ReadonlyMap<string, number>;
  /** size × VEC_DIM int8. */
  readonly data: Int8Array;
  /** Each slot's 1 / length. */
  readonly inv: Float32Array;

  private constructor(ids: readonly string[], slots: ReadonlyMap<string, number>, data: Int8Array, inv: Float32Array) {
    this.ids = ids;
    this.slots = slots;
    this.data = data;
    this.inv = inv;
  }

  static empty(): Vectors { return new Vectors([], new Map(), new Int8Array(0), new Float32Array(0)); }

  /** From rows of packed vectors (the demo, the tests). */
  static of(rows: VectorRow[]): Vectors { return Vectors.empty().with(rows); }

  get size(): number { return this.ids.length; }

  has(id: string): boolean { return this.slots.has(id); }
  slot(id: string): number | undefined { return this.slots.get(id); }

  /** A new store with these rows added; a photo already here gets its new vector in its old slot. Rows that don't decode are skipped. */
  with(rows: VectorRow[]): Vectors {
    if (!rows.length) return this;
    const ids = [...this.ids];
    const slots = new Map(this.slots);
    const fresh: [number, Int8Array][] = [];
    for (const r of rows) {
      const v = decode(r.v);
      if (!v) continue;
      let s = slots.get(r.id);
      if (s === undefined) { s = ids.length; ids.push(r.id); slots.set(r.id, s); }
      fresh.push([s, v]);
    }
    if (!fresh.length) return this;
    const data = new Int8Array(ids.length * VEC_DIM);
    data.set(this.data);
    const inv = new Float32Array(ids.length);
    inv.set(this.inv);
    for (const [s, v] of fresh) {
      data.set(v, s * VEC_DIM);
      let n = 0;
      for (let i = 0; i < VEC_DIM; i++) n += v[i] * v[i];
      inv[s] = n > 0 ? 1 / Math.sqrt(n) : 0;
    }
    return new Vectors(ids, slots, data, inv);
  }

  /** The cosine of two slots. */
  cosAt(a: number, b: number): number {
    const d = this.data;
    const oa = a * VEC_DIM;
    const ob = b * VEC_DIM;
    let dot = 0;
    for (let i = 0; i < VEC_DIM; i++) dot += d[oa + i] * d[ob + i];
    return dot * this.inv[a] * this.inv[b];
  }

  /** The cosine of two photos, or undefined when either has no vector. */
  cos(a: string, b: string): number | undefined {
    const sa = this.slots.get(a);
    const sb = this.slots.get(b);
    return sa === undefined || sb === undefined ? undefined : this.cosAt(sa, sb);
  }

  /** dot(unit vector, query) for every slot: the query need not be a unit vector (a label's or a word's, already scaled). */
  scores(query: ArrayLike<number>): Float32Array {
    const d = this.data;
    const out = new Float32Array(this.ids.length);
    for (let s = 0; s < this.ids.length; s++) {
      const o = s * VEC_DIM;
      let dot = 0;
      for (let i = 0; i < VEC_DIM; i++) dot += d[o + i] * query[i];
      out[s] = dot * this.inv[s];
    }
    return out;
  }

  /** The photos most like this one, at least `minCos` alike, most alike first (the photo itself left out). */
  nearest(id: string, minCos: number, limit = 200, among?: (id: string) => boolean): { id: string; cos: number }[] {
    const s = this.slots.get(id);
    if (s === undefined) return [];
    const out: { id: string; cos: number }[] = [];
    for (let o = 0; o < this.ids.length; o++) {
      if (o === s || (among && !among(this.ids[o]))) continue;
      const c = this.cosAt(s, o);
      if (c >= minCos) out.push({ id: this.ids[o], cos: c });
    }
    return out.sort((a, b) => b.cos - a.cos).slice(0, limit);
  }
}

/** Packs numbers like the phones do (ImageEmbedder.packed): int8 scaled by the largest value, base64. For the tests and the fixtures. */
export function pack(v: ArrayLike<number>): string {
  let top = 0;
  for (let i = 0; i < v.length; i++) top = Math.max(top, Math.abs(v[i]));
  const k = top > 0 ? 127 / top : 0;
  let s = '';
  for (let i = 0; i < v.length; i++) {
    const q = Math.max(-127, Math.min(127, Math.round(v[i] * k)));
    s += String.fromCharCode(q < 0 ? q + 256 : q);
  }
  return btoa(s);
}
