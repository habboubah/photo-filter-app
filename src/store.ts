import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import type { Album, Photo, Storage, ThemeMode } from './types';
import translations, { DEFAULT_LANGUAGE, isLanguage, Language, loadLanguage } from './translations';
import { Access, PAGE, PhotoLibrary, ScanProgress, loadAllFacts } from './native/photoLibrary';
import { Vectors } from './logic/vectors';
import { forgetAllThumbs } from './thumbs';
import { AI_VERSION, LABELS, type LabelModel, labelModel, scoreInto, scoreLabels, withScores } from './logic/ai';
import { PRODUCT_ID, Purchases } from './native/purchases';
import { AppState, RECENT_ALBUMS, SCHEMA_VERSION, emptyState, normalizeState, pruneLater } from './logic/state';
import type { TripEdits } from './logic/trips';
import { type EtaPoint, secondsLeft } from './logic/eta';
import { learnPick } from './logic/best';
import { addToBin, removeFromBin } from './logic/bin';
import { record } from './logic/ledger';
import type { Session } from './logic/review';
import type { SortKey } from './logic/sort';
import { toggled } from './logic/protect';
import { UNLOCK_ON_SALE } from './logic/allowance';
import { type Source, sourceOfAlbum } from './logic/sources';
import { ALL, parseSeen, serializeSeen, withSeen, withoutSeen } from './logic/firstRun';
import { isAndroid } from './platform';
import { LocalNotifications } from '@capacitor/local-notifications';

/*
 * All state lives here (no store library): the photo facts, the scan, the
 * access, the unlock, the user's decisions and the view preferences.
 *
 * - View preferences (language, theme, dry run, what of the first run was
 *   seen) are `bildklar-*` keys in localStorage: losing them costs nothing —
 *   a welcome or a hint showing again is harmless.
 * - The decisions (src/logic/state.ts) go through the native plugin into
 *   SQLite (PhotoLibrary getState/setState) — localStorage on the web —
 *   debounced, and only after they were read, so a slow first read can never
 *   be overwritten by the empty default.
 * - The photo facts come from the native scan cache, page by page; the
 *   photos' compact vectors (src/logic/vectors.ts) come apart, once each, and
 *   the label scores the app works out from them are laid onto the photos.
 */

export const KEY_PREFIX = 'bildklar-';
const K = {
  lang: 'bildklar-lang',
  theme: 'bildklar-theme',
  dryRun: 'bildklar-dry-run',
  reminder: 'bildklar-reminder',
  /** The welcome was seen ("1"). */
  welcome: 'bildklar-welcome',
  /** What else of the first run was seen: a JSON list of ids (src/logic/firstRun.ts). */
  seen: 'bildklar-seen',
} as const;

/** The weekly reminder's id in the system (one notification, repeating). */
const REMINDER_ID = 7001;

const read = (key: string) => { try { return localStorage.getItem(key); } catch { return null; } };
const write = (key: string, value: string) => { try { localStorage.setItem(key, value); return true; } catch { return false; } };

/** The language to start in: the one chosen in Settings, else the device's, else German. main.tsx loads it before the first render. */
export function initialLanguage(): Language {
  const saved = read(K.lang);
  if (isLanguage(saved)) return saved;
  const device = navigator.language.split('-')[0];
  return isLanguage(device) ? device : DEFAULT_LANGUAGE;
}

export interface ScanView extends ScanProgress {
  running: boolean;
  lastScanAt: number;
  /** Seconds the current phase still takes at its speed so far (src/logic/eta.ts); null while too early to say. */
  left?: number | null;
}

/** During the AI's pass (16 photos per progress event), the facts are read again every this many photos. */
const AI_RELOAD_EVERY = 480;
const AI_BATCH = 16;

/**
 * While new photos are analysed, the facts are read again at most this often
 * (and at once when the listing is done), so home fills in during a first scan
 * instead of waiting for its end. A big library waits longer between reads:
 * every read works the groups, trips and finders out again.
 */
const ANALYSE_RELOAD_MS = 8000;
const analyseReloadMs = (photos: number) => Math.max(ANALYSE_RELOAD_MS, photos * 0.3);

/** Photos whose label scores are worked out between two pauses (src/logic/ai.ts scoreInto). */
const SCORE_SLICE = 2000;

/** A rescan when the app comes back after this long. */
const RESCAN_AFTER_MS = 2 * 60_000;

export function useAppStore() {
  const [language, setLanguageNow] = useState<Language>(initialLanguage);
  // Arabic comes from its own chunk: switch once its strings are there.
  const setLanguage = useCallback((l: Language) => { void loadLanguage(l).then(() => setLanguageNow(l)); }, []);
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const saved = read(K.theme);
    return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system';
  });

  /* ------------------------------------------------ debug and the dry run */

  // TEMPORARY (November 2026): the dry run switch in release builds, so Ahmad
  // can test a TestFlight / Play build on his phone. Set back to false (or
  // remove) before a build goes to review — release builds must never run dry.
  const DRY_RUN_IN_RELEASE = true;

  const [debug, setDebug] = useState(false);
  // Safety (docs/PLAN.md): in a debug build the dry run is on until it is turned off by hand.
  const [dryRunPref, setDryRunPref] = useState<boolean | null>(() => {
    const saved = read(K.dryRun);
    return saved === '1' ? true : saved === '0' ? false : null;
  });
  useEffect(() => {
    PhotoLibrary.isDebug().then(r => setDebug(r.debug)).catch(() => setDebug(false));
  }, []);
  /** Release builds never run dry; debug builds do unless it was switched off.
   *  While DRY_RUN_IN_RELEASE is on, release builds offer it too (for testing on a phone). */
  const dryRunAvailable = debug || DRY_RUN_IN_RELEASE;
  const dryRun = dryRunAvailable && dryRunPref !== false;
  const setDryRun = (on: boolean) => { setDryRunPref(on); write(K.dryRun, on ? '1' : '0'); };

  /* ------------------------------------------------------------ decisions */

  const [state, setState] = useState<AppState>(emptyState);
  const [stateReady, setStateReady] = useState(false);
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    PhotoLibrary.getState()
      .then(({ json }) => { if (json) setState(normalizeState(JSON.parse(json))); })
      .catch(() => { /* first launch, or unreadable: start empty */ })
      .finally(() => {
        // While nothing is for sale, this install counts as an early one (src/logic/allowance.ts).
        if (!UNLOCK_ON_SALE) setState(s => (s.early ? s : { ...s, early: true }));
        setStateReady(true);
      });
  }, []);
  useEffect(() => {
    if (!stateReady) return;
    const timer = window.setTimeout(() => {
      PhotoLibrary.setState({ json: JSON.stringify({ ...state, schemaVersion: SCHEMA_VERSION }) })
        .then(() => setStorageError(false))
        .catch(() => setStorageError(true));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [state, stateReady]);

  const updateTrips = (fn: (e: TripEdits) => TripEdits) =>
    setState(s => ({ ...s, trips: { ...s.trips, ...fn(s.trips) } }));
  const recordAlbum = (key: string, album: Album) =>
    setState(s => ({ ...s, trips: { ...s.trips, albums: { ...s.trips.albums, [key]: album } } }));
  /** A best shot picked by hand (or the pick undone). `learn`: the user's pick and the app's own, to learn from (src/logic/best.ts). */
  const setBest = (groupKey: string, id: string | null, learn?: { chosen: Photo; suggested: Photo }) => setState(s => {
    const best = { ...s.best };
    if (id) best[groupKey] = id; else delete best[groupKey];
    return { ...s, best, ...(learn ? { picks: learnPick(s.picks, learn.chosen, learn.suggested) } : {}) };
  });
  /** The end of a review: what the user deleted and kept of each kind of suggestion (src/logic/ledger.ts). */
  const recordReview = (session: Session) => setState(s => { const ledger = record(s.ledger, session); return ledger === s.ledger ? s : { ...s, ledger }; });
  const addKept = (ids: string[]) => {
    if (ids.length) setState(s => ({ ...s, kept: [...new Set([...s.kept, ...ids])] }));
  };
  /** Undoes `addKept` (the toast after "Alle behalten"): these photos may be suggested again. */
  const removeKept = (ids: string[]) => {
    const gone = new Set(ids);
    if (ids.length) setState(s => ({ ...s, kept: s.kept.filter(id => !gone.has(id)) }));
  };
  /**
   * The decide-later pile after a review: the photos put off join it (at the
   * end, once), the ones given a final answer leave it.
   */
  const updateLater = (add: string[], settled: string[]) => {
    if (!add.length && !settled.length) return;
    setState(s => {
      const gone = new Set(settled);
      const later = [...new Set([...s.later.filter(id => !gone.has(id)), ...add])];
      return later.length === s.later.length && later.every((id, i) => id === s.later[i]) ? s : { ...s, later };
    });
  };
  /** Photos no longer in the library leave the pile. */
  const pruneLaterPile = (exists: (id: string) => boolean) =>
    setState(s => { const later = pruneLater(s.later, exists); return later === s.later ? s : { ...s, later }; });
  /** Photos chosen for deleting: put aside in "Zum Löschen" (src/logic/bin.ts), not deleted yet. */
  const binAdd = (ids: string[]) =>
    setState(s => { const bin = addToBin(s.bin, ids); return bin === s.bin ? s : { ...s, bin }; });
  /** Photos put back from "Zum Löschen", or deleted for good: they leave it. */
  const binRemove = (ids: string[]) =>
    setState(s => { const bin = removeFromBin(s.bin, ids); return bin === s.bin ? s : { ...s, bin }; });
  /** Photos no longer in the library (deleted elsewhere) leave the bin. */
  const pruneBin = (exists: (id: string) => boolean) =>
    setState(s => { const bin = pruneLater(s.bin, exists); return bin === s.bin ? s : { ...s, bin }; });
  /** Photos protected by hand (the shield in the review), or no longer. Protected ones count as kept; lifting it lifts both. */
  const protectPhotos = (ids: string[], on: boolean) => setState(s => {
    const list = toggled(s.protect.ids, ids, on);
    const kept = toggled(s.kept, ids, on);
    return list === s.protect.ids && kept === s.kept ? s : { ...s, kept, protect: { ...s.protect, ids: list } };
  });
  /** A trip marked "Nie vorschlagen" [Never suggest], or no longer. */
  const protectTrip = (key: string, on: boolean) => setState(s => {
    const trips = toggled(s.protect.trips, [key], on);
    return trips === s.protect.trips ? s : { ...s, protect: { ...s.protect, trips } };
  });
  /** An album (iPhone) / folder (Android) whose photos are never suggested, or no longer. */
  const protectAlbum = (id: string, on: boolean) => setState(s => {
    const albums = toggled(s.protect.albums, [id], on);
    return albums === s.protect.albums ? s : { ...s, protect: { ...s.protect, albums } };
  });
  /** "Ähnliche mitschützen" on or off (src/logic/protect.ts likeProtected). */
  const protectSimilar = (on: boolean) => setState(s => (s.protect.similar === on ? s : { ...s, protect: { ...s.protect, similar: on } }));
  /** Albums just used while swiping: first in the chips next time. */
  const useAlbums = (ids: string[]) => {
    if (!ids.length) return;
    setState(s => ({ ...s, recentAlbums: [...new Set([...ids, ...s.recentAlbums])].slice(0, RECENT_ALBUMS) }));
  };
  /** A list screen's order (src/logic/sort.ts). */
  const setSort = (screen: string, key: SortKey) =>
    setState(s => (s.sort[screen] === key ? s : { ...s, sort: { ...s.sort, [screen]: key } }));
  /** Photos deleted without the unlock: counted against the free ones. */
  const countFree = (n: number) => {
    if (n > 0) setState(s => ({ ...s, freeUsed: s.freeUsed + n }));
  };
  /** A month of "Month by month" gone through to the end. */
  const markMonthDone = (key: string) => setState(s => {
    if (s.months.includes(key) && !(key in s.monthAt)) return s;
    const { [key]: _, ...monthAt } = s.monthAt;
    return { ...s, months: s.months.includes(key) ? s.months : [...s.months, key], monthAt };
  });
  /** A month left part-way: where to go on (the time of the last photo decided in it; AppState.monthAt). */
  const setMonthAt = (key: string, at: number) => setState(s => (s.monthAt[key] === at || s.months.includes(key) ? s : { ...s, monthAt: { ...s.monthAt, [key]: at } }));
  /** Photos moved to Recently Deleted / the Trash: added to the "freed so far" count. */
  const addFreed = (count: number, bytes: number) => {
    if (count > 0) setState(s => ({ ...s, freed: { count: s.freed.count + count, bytes: s.freed.bytes + Math.max(0, bytes) } }));
  };
  /** Forget every decision but the purchase, the free deletes and the "freed so far" count; returns the old state for undo. */
  const resetDecisions = (): AppState => {
    const before = state;
    // Everything decided goes, "Zum Löschen vorgemerkt" too: those photos come back into their groups
    // (Ahmad, 18 November 2026: starting over means starting over). The toast's undo brings it all back.
    setState(s => ({ ...emptyState(), owned: s.owned, freed: s.freed, freeUsed: s.freeUsed, early: s.early }));
    return before;
  };
  const restoreState = (s: AppState) => setState(s);

  /* -------------------------------------------------------------- unlock */

  const [owned, setOwnedState] = useState<boolean | null>(null);
  const setOwned = useCallback((v: boolean) => {
    setOwnedState(v);
    setState(s => (s.owned === v ? s : { ...s, owned: v }));
  }, []);
  useEffect(() => {
    // The store's answer wins over the stored hint; offline, the hint stands.
    Purchases.isOwned({ id: PRODUCT_ID }).then(r => setOwned(r.owned)).catch(() => {});
    const handle = Purchases.addListener('ownedChanged', e => setOwned(e.owned));
    return () => { void handle.then(h => h.remove()).catch(() => {}); };
  }, [setOwned]);
  const isOwned = owned ?? state.owned;

  /* ----------------------------------------------------- photos and scan */

  const [access, setAccess] = useState<Access | null>(null);
  /** The facts as the phone reports them; `photos` (below) are these with the label scores laid on. */
  const [facts, setPhotos] = useState<Photo[] | null>(null);
  const [scan, setScan] = useState<ScanView>({ running: false, phase: 'list', done: 0, total: 0, lastScanAt: 0 });
  /** Whether a scan ever finished is known (`scan.lastScanAt`): asked at launch, so a first scan is not mistaken for one. */
  const [scanKnown, setScanKnown] = useState(false);
  const [faces, setFaces] = useState<Map<string, Partial<Photo>>>(() => new Map());
  const [storage, setStorage] = useState<Storage | null>(null);
  const loading = useRef(false);

  /* ------------------------------------------- the AI's vectors and labels */

  // The compact vectors the app lacks are fetched once each (PAGE per call) after every load of the facts.
  const [vectors, setVectors] = useState<Vectors>(() => Vectors.empty());
  const vectorsRef = useRef(vectors);
  vectorsRef.current = vectors;
  const fetchingVectors = useRef(false);
  /** Moves on with every full rescan (rescanAll): what was fetched or loaded for the old cache is dropped. */
  const generation = useRef(0);
  useEffect(() => {
    if (!facts || fetchingVectors.current) return;
    const missing = facts.filter(p => p.vv === AI_VERSION && !vectorsRef.current.has(p.id)).map(p => p.id);
    if (!missing.length) return;
    fetchingVectors.current = true;
    const gen = generation.current;
    void (async () => {
      let next = vectorsRef.current;
      try {
        for (let i = 0; i < missing.length; i += PAGE) {
          const { rows } = await PhotoLibrary.getVectors({ ids: missing.slice(i, i + PAGE) });
          next = next.with(rows);
        }
      } catch { /* an older native build: no vectors, the app works without them */ }
      fetchingVectors.current = false;
      if (gen === generation.current) setVectors(next);
    })();
  }, [facts]);
  // The labels' vectors (src/logic/aiLabels.json) load apart from the main bundle.
  const [labels, setLabels] = useState<LabelModel | null>(null);
  useEffect(() => {
    void import('./logic/aiLabels.json').then(m => setLabels(labelModel(m.default))).catch(() => setLabels(null));
  }, []);
  // Each photo's label scores, worked out once per vector (only the new ones when more arrive), in
  // slices of SCORE_SLICE photos with a pause between, so 50,000 of them never freeze the screen.
  const [scores, setScores] = useState<Int16Array | null>(null);
  const scoresRef = useRef<Int16Array | undefined>(undefined);
  useEffect(() => {
    if (!labels || !vectors.size) return;
    let alive = true;
    void (async () => {
      const prev = scoresRef.current;
      const out = scoreLabels(vectors, labels, prev, 0, 0);
      for (let from = prev ? Math.min(prev.length / LABELS.length, vectors.size) : 0; from < vectors.size; from += SCORE_SLICE) {
        scoreInto(out, vectors, labels, from, Math.min(vectors.size, from + SCORE_SLICE));
        await new Promise(r => window.setTimeout(r, 0));
        if (!alive) return;
      }
      scoresRef.current = out;
      setScores(out);
    })();
    return () => { alive = false; };
  }, [vectors, labels]);
  const photos = useMemo(() => (facts && scores ? withScores(facts, vectors, scores) : facts), [facts, vectors, scores]);

  /** Free and total space on the phone; asked again after deleting and when the app comes back. */
  const refreshStorage = useCallback(() => {
    PhotoLibrary.getStorage()
      .then(s => setStorage(s.total > 0 ? { free: s.free, total: s.total } : null))
      .catch(() => setStorage(null));
  }, []);
  useEffect(() => { refreshStorage(); }, [refreshStorage]);

  // A read asked for while one runs (the scan's end during a read in its middle) runs once more after it.
  const readAgain = useRef(false);
  const reload = useCallback(async () => {
    if (loading.current) { readAgain.current = true; return; }
    loading.current = true;
    try {
      do {
        readAgain.current = false;
        const gen = generation.current;
        try {
          const rows = await loadAllFacts();
          if (gen === generation.current) setPhotos(rows);
        } catch { setPhotos(p => p ?? []); }
      } while (readAgain.current);
    } finally { loading.current = false; }
  }, []);

  const startScan = useCallback(() => {
    setScan(s => ({ ...s, running: true }));
    PhotoLibrary.startScan().catch(() => setScan(s => ({ ...s, running: false })));
  }, []);

  /**
   * "Neu durchsuchen": every photo analysed again from the start, the AI's
   * pass too. The native scan cache and its thumbnails are emptied first
   * (clearCache stops a scan that runs); the app then shows a first scan.
   * The user's decisions are a file of their own and stay.
   */
  const rescanAll = useCallback(async () => {
    generation.current++;
    setScan(s => ({ ...s, running: true, phase: 'list', done: 0, total: 0, lastScanAt: 0 }));
    try { await PhotoLibrary.clearCache(); } catch { /* the scan below still finds what is new */ }
    forgetAllThumbs();
    const empty = Vectors.empty();
    vectorsRef.current = empty;
    setVectors(empty);
    scoresRef.current = undefined;
    setScores(null);
    setPhotos([]);
    startScan();
  }, [startScan]);

  const refreshAccess = useCallback(async () => {
    const { access: a } = await PhotoLibrary.getAccess().catch(() => ({ access: 'denied' as Access }));
    setAccess(a);
    return a;
  }, []);

  // At launch: what the cache already knows, then a scan for what changed.
  useEffect(() => {
    let alive = true;
    void (async () => {
      const a = await refreshAccess();
      if (!alive) return;
      // Without access nothing was ever scanned: a scan after the permission is the first one.
      if (a !== 'full' && a !== 'limited') { setScanKnown(true); return; }
      const s = await PhotoLibrary.getScanState().catch(() => null);
      if (s) setScan(v => ({ ...v, lastScanAt: s.lastScanAt }));
      setScanKnown(true);
      await reload();
      if (alive) startScan();
    })();
    return () => { alive = false; };
  }, [refreshAccess, reload, startScan]);

  // Where the current phase began (for its time estimate) and when the facts were last read during it.
  const phaseStart = useRef<(EtaPoint & { phase: ScanProgress['phase']; total: number }) | null>(null);
  const lastRead = useRef(0);
  const factCount = useRef(0);
  factCount.current = facts?.length ?? 0;
  useEffect(() => {
    const progress = PhotoLibrary.addListener('scanProgress', p => {
      const now = Date.now();
      let start = phaseStart.current;
      const newPhase = !start || start.phase !== p.phase || start.total !== p.total;
      if (newPhase) start = phaseStart.current = { phase: p.phase, total: p.total, at: now, done: p.done };
      const left = secondsLeft(start!, { at: now, done: p.done }, p.total);
      setScan(s => ({ ...s, ...p, videos: p.videos, videosDone: p.videosDone, running: true, left }));
      // Analysing: the photos are all listed by now; what is analysed shows up as it comes, not only at the end.
      if (p.phase === 'analyse' && (newPhase || now - lastRead.current > analyseReloadMs(factCount.current))) {
        lastRead.current = now;
        void reload();
      }
      // The AI's pass is long: its results show up every AI_RELOAD_EVERY photos, not only at the end.
      if (p.phase === 'ai' && p.done > 0 && p.done % AI_RELOAD_EVERY < AI_BATCH) void reload();
    });
    const done = PhotoLibrary.addListener('scanDone', st => {
      phaseStart.current = null;
      setScan(s => ({ ...s, running: false, lastScanAt: st.lastScanAt, left: null }));
      void reload();
    });
    let changeTimer = 0;
    const changed = PhotoLibrary.addListener('libraryChanged', () => {
      window.clearTimeout(changeTimer);
      changeTimer = window.setTimeout(startScan, 3000);
    });
    return () => {
      window.clearTimeout(changeTimer);
      for (const h of [progress, done, changed]) void h.then(x => x.remove()).catch(() => {});
    };
  }, [reload, startScan]);

  // Back in the app: access may have changed in Settings, photos may have been taken.
  const lastScanAt = useRef(0);
  lastScanAt.current = scan.lastScanAt;
  const accessRef = useRef(access);
  accessRef.current = access;
  useEffect(() => {
    const handle = CapacitorApp.addListener('appStateChange', async ({ isActive }) => {
      if (!isActive) return;
      refreshStorage();
      const before = accessRef.current;
      const a = await refreshAccess();
      if (a !== 'full' && a !== 'limited') return;
      if (a !== before || Date.now() - lastScanAt.current > RESCAN_AFTER_MS) {
        if (before !== 'full' && before !== 'limited') await reload();
        startScan();
      }
    });
    return () => { void handle.then(h => h.remove()).catch(() => {}); };
  }, [refreshAccess, reload, startScan, refreshStorage]);

  /** After the permission dialog or the limited picker. */
  const accessGranted = async (a: Access) => {
    setAccess(a);
    if (a === 'full' || a === 'limited') { await reload(); startScan(); }
  };

  /** Photos moved to the trash: gone from every list at once (the next scan agrees). */
  const removePhotos = (ids: string[]) => {
    const gone = new Set(ids);
    setPhotos(p => (p ? p.filter(x => !gone.has(x.id)) : p));
  };

  // The photos of the protected albums: asked once per load of the facts, and when the albums chosen change.
  const [albumMembers, setAlbumMembers] = useState<Set<string>>(() => new Set());
  const protectedAlbums = state.protect.albums.join('\n');
  useEffect(() => {
    const ids = protectedAlbums ? protectedAlbums.split('\n') : [];
    if (!ids.length || !photos) { setAlbumMembers(m => (m.size ? new Set() : m)); return; }
    let alive = true;
    PhotoLibrary.albumMembers({ ids })
      .then(r => { if (alive) setAlbumMembers(new Set(r.ids)); })
      .catch(() => { /* an older native build, or no access: the albums protect nothing until it answers */ });
    return () => { alive = false; };
  }, [protectedAlbums, photos]);

  // iPhone: the photos in the albums WhatsApp, Telegram, Instagram, Snapchat … make in Photos — the
  // "Chats & soziale Medien" groups (src/logic/sources.ts). Asked once per load of the facts. Android
  // knows the source from the folder and needs none of this.
  const [appAlbums, setAppAlbums] = useState<Map<string, Source>>(() => new Map());
  useEffect(() => {
    if (!photos || isAndroid()) return;
    let alive = true;
    void (async () => {
      try {
        const { albums } = await PhotoLibrary.listAlbums();
        const map = new Map<string, Source>();
        for (const a of albums) {
          const source = sourceOfAlbum(a.title);
          if (!source || !a.count) continue;
          const { ids } = await PhotoLibrary.albumMembers({ ids: [a.id] });
          for (const id of ids) if (!map.has(id)) map.set(id, source);
        }
        if (alive) setAppAlbums(map);
      } catch { /* no access to albums, or an older native build: no app groups on the iPhone */ }
    })();
    return () => { alive = false; };
  }, [photos]);

  /** Face scores for a similar group (iPhone: Vision; Android: YuNet), worked out on demand and laid over the photos for ranking. */
  const scoreFaces = useCallback(async (ids: string[]) => {
    const missing = ids.filter(id => !faces.has(id));
    if (!missing.length) return;
    try {
      const { rows } = await PhotoLibrary.scoreFaces({ ids: missing });
      if (!rows.length) return;
      setFaces(prev => {
        const next = new Map(prev);
        for (const r of rows) next.set(r.id, { faces: r.faces, faceQ: r.faceQ, eyes: r.eyes });
        return next;
      });
    } catch { /* an older native build, or the photo is gone: rank without faces */ }
  }, [faces]);

  /* --------------------------------------------------- weekly reminder */

  const [reminder, setReminderState] = useState(() => read(K.reminder) === '1');
  /**
   * On: asks for permission to notify (the system's dialog, once), then one
   * local notification every Sunday at 18:00 — scheduled on the phone, no
   * server. Off: it is cancelled. Answers whether it is on.
   */
  const setReminder = useCallback(async (on: boolean, title: string, body: string): Promise<boolean> => {
    try {
      await LocalNotifications.cancel({ notifications: [{ id: REMINDER_ID }] }).catch(() => {});
      if (on) {
        const perm = await LocalNotifications.requestPermissions();
        if (perm.display !== 'granted') { setReminderState(false); write(K.reminder, '0'); return false; }
        await LocalNotifications.schedule({
          notifications: [{ id: REMINDER_ID, title, body, schedule: { on: { weekday: 1, hour: 18, minute: 0 }, allowWhileIdle: false } }],
        });
      }
      setReminderState(on);
      write(K.reminder, on ? '1' : '0');
      return on;
    } catch {
      setReminderState(false);
      write(K.reminder, '0');
      return false;
    }
  }, []);

  /* ------------------------------------------------------ the first run */

  // The welcome and every one-time hint (src/logic/firstRun.ts). "Von vorn anfangen" leaves them:
  // they are about knowing the app, not about decisions.
  const [welcomeSeen, setWelcomeSeenState] = useState(() => read(K.welcome) === '1');
  const setWelcomeSeen = useCallback((v: boolean) => {
    setWelcomeSeenState(v);
    if (v) write(K.welcome, '1'); else { try { localStorage.removeItem(K.welcome); } catch { /* storage is unavailable */ } }
  }, []);
  const [seen, setSeen] = useState(() => parseSeen(read(K.seen)));
  useEffect(() => { write(K.seen, serializeSeen(seen)); }, [seen]);
  /** These moments or tips were shown (or done): never again by themselves. */
  const markSeen = useCallback((...ids: string[]) => setSeen(s => withSeen(s, ids)), []);
  /** Shows these again; `null` shows every hint again. */
  const replay = useCallback((ids: string[] | null) => setSeen(s => withoutSeen(s, ids)), []);
  /** Hides every hint from now on (Settings › So funktioniert Bildklar). */
  const hideAllHints = useCallback(() => setSeen(s => withSeen(s, [ALL])), []);

  /* --------------------------------------------------- view preferences */

  useEffect(() => {
    write(K.lang, language);
    document.documentElement.lang = language;
    document.documentElement.dir = translations[language].dir;
  }, [language]);

  useEffect(() => {
    write(K.theme, themeMode);
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const resolved = themeMode === 'system' ? (mq.matches ? 'dark' : 'light') : themeMode;
      document.documentElement.setAttribute('data-theme', resolved);
      const bg = getComputedStyle(document.documentElement).getPropertyValue('--t-bg').trim();
      if (bg) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', bg);
    };
    apply();
    if (themeMode !== 'system') return;
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [themeMode]);

  return {
    language, setLanguage, themeMode, setThemeMode,
    debug, dryRunAvailable, dryRun, setDryRun,
    state, stateReady, storageError, updateTrips, recordAlbum, setBest, recordReview, addKept, removeKept, updateLater, pruneLaterPile, binAdd, binRemove, pruneBin, setSort, protectPhotos, protectTrip, protectAlbum, protectSimilar, albumMembers, useAlbums, markMonthDone, setMonthAt, addFreed, countFree, resetDecisions, restoreState,
    reminder, setReminder,
    welcomeSeen, setWelcomeSeen, seen, markSeen, replay, hideAllHints,
    owned: isOwned, setOwned,
    access, refreshAccess, accessGranted,
    photos, scan, scanKnown, startScan, rescanAll, reload, removePhotos, vectors,
    faces, scoreFaces,
    appAlbums,
    storage, refreshStorage,
  };
}

export type Store = ReturnType<typeof useAppStore>;
