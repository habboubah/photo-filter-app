/*
 * Without the unlock, the first FREE_DELETES photos (or videos) may be moved to
 * Recently Deleted / the Trash anyway — enough to see that Bildklar's
 * suggestions are good before paying. Counted when the system's dialog was
 * confirmed (never in a dry run), kept with the user's decisions (so a reset
 * of the decisions does not hand out new ones; a reinstall does). Albums,
 * smaller videos and Live Photo conversions stay part of the unlock.
 */
export const FREE_DELETES = 50;

/*
 * The launch phase (docs/PLAN.md, "Pricing"): until the app has its first
 * downloads and reviews, nothing is for sale. Deleting has no limit, and the
 * extras the unlock will pay for — albums, smaller videos and photos, Live
 * Photos as stills — are hidden, not shown locked (App Review rejects
 * "coming soon"). They show for someone who owns the unlock anyway (a
 * TestFlight purchase, the demo's `owned`).
 *
 * Selling it later is this one switch, in an update: then the paywall, the
 * extras and the FREE_DELETES limit come back — but the limit only for new
 * installs. Whoever ran the app while it was free (`AppState.early`, set on
 * every start while UNLOCK_ON_SALE is false) keeps deleting without a limit.
 */
export const UNLOCK_ON_SALE = false;

/** Albums, smaller videos and photos, Live Photos as stills: offered (behind the paywall) or hidden. */
export const extrasShown = (owned: boolean, onSale = UNLOCK_ON_SALE) => onSale || owned;

/** Deleting without counting: the unlock, an install from the free launch, or nothing for sale yet. */
export const deletesUnlimited = (owned: boolean, early: boolean, onSale = UNLOCK_ON_SALE) => owned || early || !onSale;

export const freeLeft = (used: number) => Math.max(0, FREE_DELETES - used);

/** A delete of `wanted` photos without the unlock: all of them, some of them (`left`), or none. */
export function freeDelete(used: number, wanted: number): { all: boolean; left: number } {
  const left = freeLeft(used);
  return { all: wanted > 0 && wanted <= left, left };
}
