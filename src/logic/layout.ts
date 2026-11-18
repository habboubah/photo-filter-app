/**
 * How a layout adapts to the width it gets (docs/DESIGN.md, *Adaptive layout*).
 *
 * Column counts are chosen for a phone: a 390-point iPhone less its margins
 * shows about 358 px of content. On a narrower phone (320–359 px) a grid of
 * four drops to three, so names and photos keep a readable size. The page
 * never gets wider than a large phone (`max-w-column`), so a grid never shows
 * more than its phone count.
 */

/** The content width the column counts are chosen for, in CSS px. */
export const PHONE_CONTENT = 358;

/**
 * The number of columns for a grid that shows `base` columns on a phone,
 * at `width` px of content. Never fewer than three (or `base`, if smaller),
 * never more than `base`.
 */
export function gridColumns(width: number, base: number): number {
  if (!(width > 0) || !(base > 0)) return Math.max(1, Math.round(base) || 1);
  const cell = PHONE_CONTENT / base;
  const n = Math.round(width / cell);
  return Math.max(Math.min(base, 3), Math.min(base, n));
}
