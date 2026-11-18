/*
 * Without the unlock, the first FREE_DELETES photos (or videos) may be moved to
 * Recently Deleted / the Trash anyway — enough to see that Bildklar's
 * suggestions are good before paying. Counted when the system's dialog was
 * confirmed, kept with the user's decisions (so a reset
 * of the decisions does not hand out new ones; a reinstall does). Albums,
 * smaller videos and Live Photo conversions are part of the unlock once it
 * is for sale.
 */
export const FREE_DELETES = 50;

/*
 * The launch phase (docs/PLAN.md, "Pricing"): until the app has its users,
 * nothing is for sale and everything is free — deleting has no limit, and
 * the extras the unlock will pay for (albums and folders, smaller videos and
 * photos, Live Photos as stills) work for everyone, with no paywall.
 *
 * Selling it later is this one switch, in an update: then the paywall and
 * the FREE_DELETES limit come — but only for new installs. Whoever ran the
 * app while it was free (`AppState.early`, set on every start while
 * UNLOCK_ON_SALE is false) keeps everything they had: deleting without a
 * limit and the extras (decided 18 November 2026; to sell the extras to them
 * too, drop `early` from extrasFree).
 */
export const UNLOCK_ON_SALE = false;

/** Albums and folders, smaller videos and photos, Live Photos as stills, without the paywall: the unlock, an install from the free launch, or nothing for sale yet. */
export const extrasFree = (owned: boolean, early: boolean, onSale = UNLOCK_ON_SALE) => owned || early || !onSale;

/** Deleting without counting: the unlock, an install from the free launch, or nothing for sale yet. */
export const deletesUnlimited = (owned: boolean, early: boolean, onSale = UNLOCK_ON_SALE) => owned || early || !onSale;

export const freeLeft = (used: number) => Math.max(0, FREE_DELETES - used);

/** A delete of `wanted` photos without the unlock: all of them, some of them (`left`), or none. */
export function freeDelete(used: number, wanted: number): { all: boolean; left: number } {
  const left = freeLeft(used);
  return { all: wanted > 0 && wanted <= left, left };
}
