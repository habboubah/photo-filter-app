/*
 * Without the unlock, the first FREE_DELETES photos (or videos) may be moved to
 * Recently Deleted / the Trash anyway — enough to see that Bildklar's
 * suggestions are good before paying. Counted when the system's dialog was
 * confirmed (never in a dry run), kept with the user's decisions (so a reset
 * of the decisions does not hand out new ones; a reinstall does). Albums,
 * smaller videos and Live Photo conversions stay part of the unlock.
 */
export const FREE_DELETES = 50;

export const freeLeft = (used: number) => Math.max(0, FREE_DELETES - used);

/** A delete of `wanted` photos without the unlock: all of them, some of them (`left`), or none. */
export function freeDelete(used: number, wanted: number): { all: boolean; left: number } {
  const left = freeLeft(used);
  return { all: wanted > 0 && wanted <= left, left };
}
