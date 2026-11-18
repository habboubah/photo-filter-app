/*
 * How long a scan phase still takes: the speed so far in this phase (photos
 * per second since it began), applied to what is left. Nothing is said until
 * the phase has run a few seconds and moved a little — the first batches are
 * the slowest (the thumbnails' cache is cold) and an early guess would jump.
 * The figure is rounded the way people say it ("about 3 minutes"): src/
 * components/HomeView.tsx turns it into words.
 */

/** Where a phase stood at one moment. */
export interface EtaPoint { at: number; done: number }

/** Before this long in a phase, no estimate. */
export const ETA_MIN_MS = 4000;
/** Before this many photos in a phase, no estimate. */
export const ETA_MIN_DONE = 8;

/** Seconds left from `start` (the phase's first progress) to `now`, or null while it is too early to say. */
export function secondsLeft(start: EtaPoint, now: EtaPoint, total: number): number | null {
  const ms = now.at - start.at;
  const moved = now.done - start.done;
  if (ms < ETA_MIN_MS || moved < ETA_MIN_DONE || total <= 0) return null;
  const left = Math.max(0, total - now.done);
  return (left / moved) * (ms / 1000);
}

/**
 * An estimate as people say it: 'soon' under 10 seconds, seconds (up to the
 * next 10) under a minute, else whole minutes (rounded up), else hours and minutes.
 */
export type EtaWords = { kind: 'soon' } | { kind: 'seconds'; seconds: number } | { kind: 'minutes'; minutes: number } | { kind: 'hours'; hours: number; minutes: number };

export function etaWords(seconds: number): EtaWords {
  if (seconds < 10) return { kind: 'soon' };
  if (seconds < 60) return { kind: 'seconds', seconds: Math.min(60, Math.ceil(seconds / 10) * 10) };
  const minutes = Math.ceil(seconds / 60);
  if (minutes < 60) return { kind: 'minutes', minutes };
  // Past an hour, to the nearest 5 minutes: "about 1 h 10 min", never "1 h 7 min".
  const rounded = Math.round(minutes / 5) * 5;
  return { kind: 'hours', hours: Math.floor(rounded / 60), minutes: rounded % 60 };
}
