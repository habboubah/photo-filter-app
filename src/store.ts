import { useCallback, useEffect, useRef, useState } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import type { Album, Photo, Storage, ThemeMode } from './types';
import translations, { DEFAULT_LANGUAGE, isLanguage, Language } from './translations';
import { Access, PhotoLibrary, ScanProgress, loadAllFacts } from './native/photoLibrary';
import { PRODUCT_ID, Purchases } from './native/purchases';
import { AppState, SCHEMA_VERSION, emptyState, normalizeState, pruneLater } from './logic/state';
import type { TripEdits } from './logic/trips';
import { addDay } from './logic/streak';
import type { SortKey } from './logic/sort';
import { toggled } from './logic/protect';
import { LocalNotifications } from '@capacitor/local-notifications';

/*
 * All state lives here (no store library): the photo facts, the scan, the
 * access, the unlock, the user's decisions and the view preferences.
 *
 * - View preferences (language, theme, dry run) are `bildklar-*` keys in
 *   localStorage: losing them costs nothing.
 * - The decisions (src/logic/state.ts) go through the native plugin into
 *   SQLite (PhotoLibrary getState/setState) — localStorage on the web —
 *   debounced, and only after they were read, so a slow first read can never
 *   be overwritten by the empty default.
 * - The photo facts come from the native scan cache, page by page.
 */

export const KEY_PREFIX = 'bildklar-';
const K = {
  lang: 'bildklar-lang',
  theme: 'bildklar-theme',
  dryRun: 'bildklar-dry-run',
  reminder: 'bildklar-reminder',
} as const;

/** The weekly reminder's id in the system (one notification, repeating). */
const REMINDER_ID = 7001;

const read = (key: string) => { try { return localStorage.getItem(key); } catch { return null; } };
const write = (key: string, value: string) => { try { localStorage.setItem(key, value); return true; } catch { return false; } };

function initialLanguage(): Language {
  const saved = read(K.lang);
  if (isLanguage(saved)) return saved;
  const device = navigator.language.split('-')[0];
  return isLanguage(device) ? device : DEFAULT_LANGUAGE;
}

export interface ScanView extends ScanProgress {
  running: boolean;
  lastScanAt: number;
}

/** During the AI's pass (16 photos per progress event), the facts are read again every this many photos. */
const AI_RELOAD_EVERY = 480;
const AI_BATCH = 16;

/** A rescan when the app comes back after this long. */
const RESCAN_AFTER_MS = 2 * 60_000;

export function useAppStore() {
  const [language, setLanguage] = useState<Language>(initialLanguage);
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
      .finally(() => setStateReady(true));
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
  const setBest = (groupKey: string, id: string | null) => setState(s => {
    const best = { ...s.best };
    if (id) best[groupKey] = id; else delete best[groupKey];
    return { ...s, best };
  });
  const addKept = (ids: string[]) => {
    if (ids.length) setState(s => ({ ...s, kept: [...new Set([...s.kept, ...ids])] }));
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
  /** A list screen's order (src/logic/sort.ts). */
  const setSort = (screen: string, key: SortKey) =>
    setState(s => (s.sort[screen] === key ? s : { ...s, sort: { ...s.sort, [screen]: key } }));
  /** Photos deleted without the unlock: counted against the free ones. */
  const countFree = (n: number) => {
    if (n > 0) setState(s => ({ ...s, freeUsed: s.freeUsed + n }));
  };
  /** Today counts for the streak: something was cleaned up. */
  const markDay = () => setState(s => {
    const days = addDay(s.days, Date.now());
    return days === s.days ? s : { ...s, days };
  });
  /** A month of "Month by month" gone through to the end. */
  const markMonthDone = (key: string) => setState(s => (s.months.includes(key) ? s : { ...s, months: [...s.months, key] }));
  /** Photos moved to Recently Deleted / the Trash: added to the "freed so far" count. */
  const addFreed = (count: number, bytes: number) => {
    if (count > 0) setState(s => ({ ...s, freed: { count: s.freed.count + count, bytes: s.freed.bytes + Math.max(0, bytes) } }));
  };
  /** Forget every decision but the purchase and the "freed so far" count; returns the old state for undo. */
  const resetDecisions = (): AppState => {
    const before = state;
    setState(s => ({ ...emptyState(), owned: s.owned, freed: s.freed, days: s.days, freeUsed: s.freeUsed }));
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
  const [photos, setPhotos] = useState<Photo[] | null>(null);
  const [scan, setScan] = useState<ScanView>({ running: false, phase: 'list', done: 0, total: 0, lastScanAt: 0 });
  const [faces, setFaces] = useState<Map<string, Partial<Photo>>>(() => new Map());
  const [storage, setStorage] = useState<Storage | null>(null);
  const loading = useRef(false);

  /** Free and total space on the phone; asked again after deleting and when the app comes back. */
  const refreshStorage = useCallback(() => {
    PhotoLibrary.getStorage()
      .then(s => setStorage(s.total > 0 ? { free: s.free, total: s.total } : null))
      .catch(() => setStorage(null));
  }, []);
  useEffect(() => { refreshStorage(); }, [refreshStorage]);

  const reload = useCallback(async () => {
    if (loading.current) return;
    loading.current = true;
    try { setPhotos(await loadAllFacts()); } catch { setPhotos(p => p ?? []); } finally { loading.current = false; }
  }, []);

  const startScan = useCallback(() => {
    setScan(s => ({ ...s, running: true }));
    PhotoLibrary.startScan().catch(() => setScan(s => ({ ...s, running: false })));
  }, []);

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
      if (!alive || (a !== 'full' && a !== 'limited')) return;
      const s = await PhotoLibrary.getScanState().catch(() => null);
      if (s) setScan(v => ({ ...v, lastScanAt: s.lastScanAt }));
      await reload();
      if (alive) startScan();
    })();
    return () => { alive = false; };
  }, [refreshAccess, reload, startScan]);

  useEffect(() => {
    const progress = PhotoLibrary.addListener('scanProgress', p => {
      setScan(s => ({ ...s, ...p, running: true }));
      // The AI's pass is long: its results show up every AI_RELOAD_EVERY photos, not only at the end.
      if (p.phase === 'ai' && p.done > 0 && p.done % AI_RELOAD_EVERY < AI_BATCH) void reload();
    });
    const done = PhotoLibrary.addListener('scanDone', st => {
      setScan(s => ({ ...s, running: false, lastScanAt: st.lastScanAt }));
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

  /** iPhone: face scores for a similar group, worked out on demand and laid over the photos for ranking. */
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
    } catch { /* Android, or the photo is gone: rank without faces */ }
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
    state, stateReady, storageError, updateTrips, recordAlbum, setBest, addKept, updateLater, pruneLaterPile, setSort, protectPhotos, protectTrip, protectAlbum, albumMembers, markMonthDone, addFreed, markDay, countFree, resetDecisions, restoreState,
    reminder, setReminder,
    owned: isOwned, setOwned,
    access, refreshAccess, accessGranted,
    photos, scan, startScan, reload, removePhotos,
    faces, scoreFaces,
    storage, refreshStorage,
  };
}

export type Store = ReturnType<typeof useAppStore>;
