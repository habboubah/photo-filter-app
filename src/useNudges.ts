import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import type { Group, Photo, Trip } from './types';
import { PhotoLibrary } from './native/photoLibrary';
import { isAndroid, isIos, isNative } from './platform';
import {
  SINCE_MIN_GAP, newTrip, parseList, parseRate, shouldAsk, sinceLast, withAsk, withWin, type Since,
} from './logic/nudges';

/*
 * The moments Bildklar speaks up by itself (src/logic/nudges.ts): what is new
 * since the last visit, a trip found since, the weekly reminder offered once,
 * and the rating prompt after a clean-up. View state only, in `bildklar-*`
 * localStorage keys (losing them shows a card once more, nothing else).
 */
const K = {
  lastVisit: 'bildklar-last-visit',
  /** The `lastVisit` whose "since" card was gone through or closed. */
  sinceDone: 'bildklar-since-done',
  tripsSeen: 'bildklar-trips-seen',
  reminderAsked: 'bildklar-reminder-asked',
  rate: 'bildklar-rate',
} as const;
const read = (key: string) => { try { return localStorage.getItem(key); } catch { return null; } };
const write = (key: string, value: string) => { try { localStorage.setItem(key, value); } catch { /* view state only */ } };
const readNum = (key: string) => { const n = Number(read(key)); return Number.isFinite(n) && n > 0 ? n : null; };

export function useNudges({ photos, groups, trips, ready, atHome, debug, reminderOn }: {
  /** The library (without what is marked for deletion). */
  photos: readonly Photo[] | null;
  groups: readonly Group[];
  trips: readonly Trip[];
  /** A scan has finished at least once and none is running: the trips and groups are settled. */
  ready: boolean;
  /** Home is on screen, nothing pushed over it: the moment for a sheet. */
  atHome: boolean;
  debug: boolean;
  reminderOn: boolean;
}) {
  /* ------------------------------------------------- since the last visit */

  // The last visit before this one: read once at the start, and again when the app comes back after a while.
  const [prev, setPrev] = useState<number | null>(() => readNum(K.lastVisit));
  const [sinceDone, setSinceDone] = useState<number | null>(() => readNum(K.sinceDone));
  useEffect(() => {
    write(K.lastVisit, String(Date.now()));
    const h = CapacitorApp.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) { write(K.lastVisit, String(Date.now())); return; }
      const last = readNum(K.lastVisit);
      if (last && Date.now() - last >= SINCE_MIN_GAP) setPrev(last);
      write(K.lastVisit, String(Date.now()));
    });
    return () => { void h.then(x => x.remove()).catch(() => {}); };
  }, []);
  const since: Since | null = useMemo(
    () => (photos && ready && prev && prev !== sinceDone ? sinceLast(photos, groups, prev, Date.now()) : null),
    [photos, groups, prev, sinceDone, ready],
  );
  const closeSince = useCallback(() => {
    if (!prev) return;
    setSinceDone(prev);
    write(K.sinceDone, String(prev));
  }, [prev]);

  /* ------------------------------------------------------------ a new trip */

  // The trips the user has been shown. On the first settled library every trip found counts as seen
  // (the reveal after the first scan shows them): only a trip found after that is news.
  const [tripsSeen, setTripsSeen] = useState<Set<string> | null>(() => (read(K.tripsSeen) === null ? null : new Set(parseList(read(K.tripsSeen)))));
  useEffect(() => {
    if (tripsSeen || !ready || !photos) return;
    const all = new Set(trips.map(x => x.key));
    setTripsSeen(all);
    write(K.tripsSeen, JSON.stringify([...all]));
  }, [tripsSeen, ready, photos, trips]);
  const trip = useMemo(() => (tripsSeen && ready ? newTrip(trips, tripsSeen, Date.now()) : null), [trips, tripsSeen, ready]);
  const seeTrip = useCallback((key: string) => {
    setTripsSeen(s => {
      const next = new Set(s ?? []);
      next.add(key);
      write(K.tripsSeen, JSON.stringify([...next].slice(-200)));
      return next;
    });
  }, []);

  /* --------------------------------------------- the reminder, offered once */

  const [askReminder, setAskReminder] = useState(false);
  /** After the first month gone through or the first real delete: *Jeden Sonntag kurz erinnern?* — once. */
  const offerReminder = useCallback(() => {
    if (reminderOn || read(K.reminderAsked) === '1') return;
    write(K.reminderAsked, '1');
    setAskReminder(true);
  }, [reminderOn]);
  const closeReminder = useCallback(() => setAskReminder(false), []);

  /* -------------------------------------------------- the rating, after a win */

  // A real delete freed space: counted; on home, a moment later, the rating may be asked for
  // (iPhone: the system's own prompt, which iOS may or may not show; Android: a sheet that opens Google Play).
  const [rateDue, setRateDue] = useState(false);
  const [rateSheet, setRateSheet] = useState(false);
  const win = useCallback(() => {
    write(K.rate, JSON.stringify(withWin(parseRate(read(K.rate)))));
    setRateDue(true);
  }, []);
  const asked = useRef(false);
  useEffect(() => {
    if (!rateDue || !atHome || askReminder || asked.current) return;
    const timer = window.setTimeout(() => {
      setRateDue(false);
      // Debug builds (and the App Review recording) and the browser never ask.
      if (debug || !isNative()) return;
      const s = parseRate(read(K.rate));
      if (!shouldAsk(s, Date.now(), __APP_VERSION__)) return;
      asked.current = true;
      write(K.rate, JSON.stringify(withAsk(s, Date.now(), __APP_VERSION__)));
      if (isIos()) void PhotoLibrary.requestReview().catch(() => {});
      else if (isAndroid()) setRateSheet(true);
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [rateDue, atHome, askReminder, debug]);

  return {
    since, sinceFrom: prev, closeSince,
    trip, seeTrip,
    askReminder, offerReminder, closeReminder,
    win, rateSheet, closeRateSheet: () => setRateSheet(false),
  };
}
