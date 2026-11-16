/*
 * Days in a row: a day counts when the user cleaned something up — photos
 * moved to the trash, Live Photos turned into photos, a video made smaller,
 * or a review gone through to its end. The streak is the run of such days
 * ending today, or yesterday (today may still come). At most KEEP_DAYS days
 * are remembered.
 */
export const KEEP_DAYS = 60;

const pad = (n: number) => String(n).padStart(2, '0');
/** "2026-11-16", in the phone's local time. */
export const dayKey = (t: number) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

export function addDay(days: string[], t: number): string[] {
  const key = dayKey(t);
  if (days.includes(key)) return days;
  return [...days, key].sort().slice(-KEEP_DAYS);
}

export function streak(days: string[], now: number): number {
  const set = new Set(days);
  const d = new Date(now);
  if (!set.has(dayKey(d.getTime()))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (set.has(dayKey(d.getTime()))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}
