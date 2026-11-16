import { useCallback, useEffect, useRef, useState } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import type { Album, Photo, ThemeMode } from './types';
import translations, { DEFAULT_LANGUAGE, isLanguage, Language } from './translations';
import { Access, PhotoLibrary, ScanProgress, loadAllFacts } from './native/photoLibrary';
import { PRODUCT_ID, Purchases } from './native/purchases';
import { AppState, SCHEMA_VERSION, emptyState, normalizeState } from './logic/state';
import type { TripEdits } from './logic/trips';

/*
 * All state lives here (no store library): the photo facts, the scan, the
 * access, the unlock, the user's decisions and the view preferences.
 *
 * - View preferences (language, theme, dry run) are `fotonest-*` keys in
 *   localStorage: losing them costs nothing.
 * - The decisions (src/logic/state.ts) go through the native plugin into
 *   SQLite (PhotoLibrary getState/setState) — localStorage on the web —
 *   debounced, and only after they were read, so a slow first read can never
 *   be overwritten by the empty default.
 * - The photo facts come from the native scan cache, page by page.
 */

export const KEY_PREFIX = 'fotonest-';
const K = {
  lang: 'fotonest-lang',
  theme: 'fotonest-theme',
  dryRun: 'fotonest-dry-run',
} as const;

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

/** A rescan when the app comes back after this long. */
const RESCAN_AFTER_MS = 2 * 60_000;

export function useAppStore() {
  const [language, setLanguage] = useState<Language>(initialLanguage);
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    const saved = read(K.theme);
    return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'system';
  });

  /* ------------------------------------------------ debug and the dry run */

  const [debug, setDebug] = useState(false);
  // Safety (docs/PLAN.md): in a debug build the dry run is on until it is turned off by hand.
  const [dryRunPref, setDryRunPref] = useState<boolean | null>(() => {
    const saved = read(K.dryRun);
    return saved === '1' ? true : saved === '0' ? false : null;
  });
  useEffect(() => {
    PhotoLibrary.isDebug().then(r => setDebug(r.debug)).catch(() => setDebug(false));
  }, []);
  /** Release builds never run dry; debug builds do unless it was switched off. */
  const dryRun = debug && dryRunPref !== false;
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
  /** Forget every decision but the purchase; returns the old state for undo. */
  const resetDecisions = (): AppState => {
    const before = state;
    setState(s => ({ ...emptyState(), owned: s.owned }));
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
  const loading = useRef(false);

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
    const progress = PhotoLibrary.addListener('scanProgress', p => setScan(s => ({ ...s, ...p, running: true })));
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
      const before = accessRef.current;
      const a = await refreshAccess();
      if (a !== 'full' && a !== 'limited') return;
      if (a !== before || Date.now() - lastScanAt.current > RESCAN_AFTER_MS) {
        if (before !== 'full' && before !== 'limited') await reload();
        startScan();
      }
    });
    return () => { void handle.then(h => h.remove()).catch(() => {}); };
  }, [refreshAccess, reload, startScan]);

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
    debug, dryRun, setDryRun,
    state, stateReady, storageError, updateTrips, recordAlbum, setBest, addKept, resetDecisions, restoreState,
    owned: isOwned, setOwned,
    access, refreshAccess, accessGranted,
    photos, scan, startScan, reload, removePhotos,
    faces, scoreFaces,
  };
}

export type Store = ReturnType<typeof useAppStore>;
