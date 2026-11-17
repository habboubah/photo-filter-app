import type { UtilityLabel } from './ai';
import type { ReviewItem, Session } from './review';
import { type Trust, lessSure } from './confidence';

/*
 * The local accuracy ledger (docs/AI.md, "Learning on the phone"): how often
 * this user deleted or kept what each finder suggested, counted at the end of
 * every review and kept with the user's decisions (AppState.ledger). It never
 * leaves the phone — no analytics, no server.
 *
 * What the app does with it: a kind of suggestion the user keeps often
 * (STRICT_RATE of at least MIN_SEEN decisions) is trusted one level less
 * (sure → likely → check: quick clean stops taking it in one tap), and a
 * utility label kept often needs STRICT_LOGITS more to suggest a photo at
 * all — twice that when the user keeps most of them. Debug builds show the
 * table (Settings › Treffsicherheit), so real precision can be read on a
 * tester's phone.
 */
export interface Tally { del: number; keep: number }
/** Keys: the review's reasons ("similar", "blurry", "dark" …), the utility photos per label ("utility:receipt"). */
export type Ledger = Record<string, Tally>;

/** Decisions on a kind before the ledger changes anything. */
export const MIN_SEEN = 10;
/** A kind kept at least this often is trusted one level less (and a utility label needs more). */
export const STRICT_RATE = 0.3;
/** …kept at least this often: a utility label needs twice as much more. */
export const STRICTER_RATE = 0.5;
/** Logits a utility label needs more on this phone. */
export const STRICT_LOGITS = 1.0;

/** The ledger key of a suggested delete, or null for an item without a suggestion. */
export function ledgerKey(item: Pick<ReviewItem, 'suggest' | 'reason' | 'label'>): string | null {
  if (item.suggest !== 'delete') return null;
  return item.reason === 'utility' && item.label ? `utility:${item.label}` : item.reason;
}

/** The ledger after a review: each suggested delete the user deleted or kept (put off ones don't count). */
export function record(ledger: Ledger, session: Session): Ledger {
  const out: Ledger = { ...ledger };
  let changed = false;
  for (const item of session.items) {
    const key = ledgerKey(item);
    const d = session.decisions[item.id];
    if (!key || (d !== 'delete' && d !== 'keep')) continue;
    const t = out[key] ?? { del: 0, keep: 0 };
    out[key] = d === 'delete' ? { ...t, del: t.del + 1 } : { ...t, keep: t.keep + 1 };
    changed = true;
  }
  return changed ? out : ledger;
}

/** The share of suggestions of this kind the user kept, once there are MIN_SEEN decisions; else null. */
export function keepRate(t: Tally | undefined): number | null {
  if (!t || t.del + t.keep < MIN_SEEN) return null;
  return t.keep / (t.del + t.keep);
}

/** Whether suggestions of this kind are trusted one level less on this phone. */
export const doubted = (ledger: Ledger, key: string): boolean => (keepRate(ledger[key]) ?? 0) >= STRICT_RATE;

/** A trust as this phone's ledger has it. */
export const adjusted = (ledger: Ledger, key: string | null, trust: Trust): Trust => (key && doubted(ledger, key) ? lessSure(trust) : trust);

/** Review items with their trust as this phone's ledger has it. */
export function adjustItems(items: ReviewItem[], ledger: Ledger): ReviewItem[] {
  return items.map(i => {
    if (!i.trust) return i;
    const trust = adjusted(ledger, ledgerKey(i), i.trust);
    return trust === i.trust ? i : { ...i, trust };
  });
}

/** Logits each utility label needs more on this phone (src/logic/ai.ts utilityMargin's `strict`). */
export function strictUtility(ledger: Ledger): Partial<Record<UtilityLabel, number>> {
  const out: Partial<Record<UtilityLabel, number>> = {};
  for (const [key, t] of Object.entries(ledger)) {
    if (!key.startsWith('utility:')) continue;
    const rate = keepRate(t);
    if (rate === null || rate < STRICT_RATE) continue;
    out[key.slice(8) as UtilityLabel] = rate >= STRICTER_RATE ? 2 * STRICT_LOGITS : STRICT_LOGITS;
  }
  return out;
}

/** The ledger as stored: only well-formed tallies. */
export function normalizeLedger(raw: unknown): Ledger {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return {};
  const out: Ledger = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v !== 'object' || v === null) continue;
    const { del, keep } = v as Record<string, unknown>;
    if (typeof del === 'number' && typeof keep === 'number' && del >= 0 && keep >= 0 && Number.isFinite(del + keep)) {
      out[k] = { del: Math.round(del), keep: Math.round(keep) };
    }
  }
  return out;
}
