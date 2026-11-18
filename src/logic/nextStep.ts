import type { CleanupSummary } from '../types';

/*
 * Home's one next step, and the first step the reveal after the first scan
 * recommends — one choice, so the two never disagree:
 *   1. progress month by month exists (a month done, or one left part-way) and a month is left → go on with it;
 *   2. photos wait on the decide-later pile → decide them;
 *   3. something was found to clean up → the category that frees the most;
 *   4. nothing found and no scan running → month by month, the newest first.
 * The screens word it (HomeView's NextStep card, RevealView).
 */

/** The categories that suggest photos to delete, each a row on home. */
export type FoundKey = 'duplicates' | 'similar' | 'videos' | 'failed' | 'screenshots' | 'utility';

/** One category: how many of it there are (groups or photos, as its screen counts), and a few of its photos. */
export interface Found { items: number; covers: string[] }

/** What a category would free: the photos that could go and their size. */
export interface Gain { count: number; bytes: number }

export type StepKind = 'month' | 'later' | 'category' | 'start';

/** The space a category would free, from the clean-up summary (so every figure agrees). */
export function gainOf(summary: CleanupSummary | null, key: FoundKey): Gain {
  if (!summary) return { bytes: 0, count: 0 };
  switch (key) {
    case 'duplicates': return summary.duplicates;
    case 'videos': return summary.lookalike;
    case 'similar': return summary.similar;
    case 'failed': return { bytes: summary.blurry.bytes + summary.exposure.bytes, count: summary.blurry.count + summary.exposure.count };
    case 'screenshots': return summary.screenshots;
    case 'utility': return summary.utility;
  }
}

/** The categories in home's order. */
export const FOUND_KEYS: FoundKey[] = ['duplicates', 'similar', 'videos', 'failed', 'screenshots', 'utility'];

export interface RankedCategory extends Found { key: FoundKey; gain: Gain }

/** The categories that hold something, the one that frees the most first (then the one with the most items). */
export function rankCategories(found: Partial<Record<FoundKey, Found>>, summary: CleanupSummary | null): RankedCategory[] {
  return FOUND_KEYS.filter(k => (found[k]?.items ?? 0) > 0)
    .map(k => ({ key: k, ...found[k]!, gain: gainOf(summary, k) }))
    .sort((a, b) => b.gain.bytes - a.gain.bytes || b.items - a.items);
}

export function nextStepKind(i: {
  /** Months gone through to their end. */
  monthsDone: number;
  /** A month was left part-way (AppState.monthAt). */
  monthStarted?: boolean;
  /** A month not gone through yet exists. */
  hasNextMonth: boolean;
  /** Photos on the decide-later pile. */
  later: number;
  /** Categories that hold something. */
  categories: number;
  scanning: boolean;
}): StepKind | null {
  if ((i.monthsDone > 0 || i.monthStarted) && i.hasNextMonth) return 'month';
  if (i.later > 0) return 'later';
  if (i.categories > 0) return 'category';
  if (i.hasNextMonth && !i.scanning) return 'start';
  return null;
}

/**
 * The first useful task after the first scan (docs/ux-research.md, idea A):
 * one group of near-identical photos to compare. A small group is easier to
 * judge than a long burst, so groups of two to six come first; among those
 * the newest (the moment the user remembers best). Videos and exact copies
 * are left out: comparing them teaches nothing about choosing a favourite.
 * Null when there is no such group — the reveal then offers home's next step.
 */
export function firstGroup<G extends { key: string; kind: string; ids: string[]; best: string }>(
  groups: readonly G[], time: (id: string) => number | undefined,
): G | null {
  const similar = groups.filter(g => g.kind === 'similar' && g.ids.length >= 2);
  if (!similar.length) return null;
  const small = similar.filter(g => g.ids.length <= 6);
  const pool = small.length ? small : similar;
  return pool.reduce((a, g) => ((time(g.best) ?? 0) > (time(a.best) ?? 0) ? g : a));
}
