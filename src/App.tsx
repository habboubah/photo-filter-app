import { Suspense, lazy, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { App as CapacitorApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { KeepAwake } from '@capacitor-community/keep-awake';
import { AlertTriangle, FlaskConical, Images, Sparkles } from 'lucide-react';
import { useAppStore } from './store';
import { bytes, fmt, percent, plural, stringsFor } from './translations';
import type { Photo, Trip } from './types';
import { PhotoLibrary, type AlbumInfo } from './native/photoLibrary';
import { PRODUCT_ID, Purchases } from './native/purchases';
import { loadCities } from './cities';
import { forgetThumbs } from './thumbs';
import type { CityIndex } from './logic/geo';
import { buildGroups, buildTrips, cleanupBlurry, detect, findBlurry, makeLibrary, summarize, openGroups, isVideoGroup, mediaTotals } from './logic/analyze';
import { folderName } from './logic/naming';
import { addMerge, addSplit, removeMerge, removeSplits, setIgnored, setName } from './logic/trips';
import {
  Decision, ReviewItem, Session, decide, fileTo, isDone, isNewAlbum, keptAgainstSuggestion, laterIds, reviewBlurry, reviewCleanup, reviewGroup,
  reviewExposure, reviewLarge, reviewLater, reviewScreenshots, reviewTrip, reviewUtility, settledIds, startSession, undo,
} from './logic/review';
import { aiProgress, categories, findUtility, type MemoryLabel } from './logic/ai';
import { findScreenshots, isOldShot, oldShots } from './logic/screenshots';
import { findLarge, findLive } from './logic/large';
import { buildMonths, onThisDay, progress } from './logic/months';
import { findExposure } from './logic/exposure';
import { sortFor, type SortScreen } from './logic/sort';
import { protectedIds } from './logic/protect';
import { batches, findCompressible, tally } from './logic/compress';
import { APPS_TILE_MIN, groupBySource, reviewSource } from './logic/sources';
import { cleanParts } from './logic/smartClean';
import { streak } from './logic/streak';
import { feedbackMail, openExternal, privacyUrl, rateUrl, systemFromAgent } from './links';
import { devNative, isAndroid, isIos } from './platform';
import { Toast, useToast } from './ui/Toast';
import { Confirm } from './ui/Sheet';
import { notifySuccess } from './ui/haptics';
import { PermissionView } from './components/PermissionView';
import { HomeView } from './components/HomeView';
import { TabBar } from './ui/TabBar';

import type { FailedTab } from './components/FailedView';
import { Progress } from './ui/Controls';
import { Sheet } from './ui/Sheet';
import type { ReviewOutcome } from './components/ReviewView';
import { PaywallSheet, type FreeInfo } from './components/PaywallSheet';
import { UNLOCK_ON_SALE, deletesUnlimited, extrasShown, freeDelete, freeLeft } from './logic/allowance';

/*
 * Screens opened less often are loaded on first use (the main bundle has a
 * budget: scripts/perf-check.mjs). They come from local files on the phone,
 * so the wait is a frame or two.
 */
const FailedView = lazy(() => import('./components/FailedView').then(m => ({ default: m.FailedView })));
const ScreenshotsView = lazy(() => import('./components/ScreenshotsView').then(m => ({ default: m.ScreenshotsView })));
const QuickCleanView = lazy(() => import('./components/QuickCleanView').then(m => ({ default: m.QuickCleanView })));
const MonthsView = lazy(() => import('./components/MonthsView').then(m => ({ default: m.MonthsView })));
const LargeView = lazy(() => import('./components/LargeView').then(m => ({ default: m.LargeView })));
const LiveView = lazy(() => import('./components/LiveView').then(m => ({ default: m.LiveView })));
const UtilityView = lazy(() => import('./components/UtilityView').then(m => ({ default: m.UtilityView })));
const CategoryView = lazy(() => import('./components/CategoryView').then(m => ({ default: m.CategoryView })));
const TripsView = lazy(() => import('./components/TripsView').then(m => ({ default: m.TripsView })));
const SettingsView = lazy(() => import('./components/SettingsView').then(m => ({ default: m.SettingsView })));
const TripView = lazy(() => import('./components/TripView').then(m => ({ default: m.TripView })));
const CleanupView = lazy(() => import('./components/CleanupView').then(m => ({ default: m.CleanupView })));
const SimilarView = lazy(() => import('./components/SimilarView').then(m => ({ default: m.SimilarView })));
const GroupView = lazy(() => import('./components/GroupView').then(m => ({ default: m.GroupView })));
const ReviewView = lazy(() => import('./components/ReviewView').then(m => ({ default: m.ReviewView })));
const AppsView = lazy(() => import('./components/AppsView').then(m => ({ default: m.AppsView })));
const CompressView = lazy(() => import('./components/CompressView').then(m => ({ default: m.CompressView })));
const ProtectedView = lazy(() => import('./components/ProtectedView').then(m => ({ default: m.ProtectedView })));
const LicencesView = lazy(() => import('./components/LicencesView').then(m => ({ default: m.LicencesView })));
const LicenceView = lazy(() => import('./components/LicencesView').then(m => ({ default: m.LicenceView })));
const OrganizeView = lazy(() => import('./components/OrganizeView').then(m => ({ default: m.OrganizeView })));

/** `onDone`: what happens once the review was gone through to its end (a month marked as done). */
interface Review { session: Session; finished: boolean; onDone?: () => void }

export default function App() {
  const store = useAppStore();
  const { language, state, photos } = store;
  const t = stringsFor(language);
  const { toast, show, hide } = useToast();

  /* ------------------------------------------------------------ analysis */

  const [cities, setCities] = useState<CityIndex | null>(null);
  useEffect(() => {
    if (photos?.length && !cities) void loadCities().then(setCities);
  }, [photos, cities]);

  const lib = useMemo(() => makeLibrary(photos ?? []), [photos]);
  const detection = useMemo(() => detect(lib), [lib]);
  const trips = useMemo(
    () => buildTrips(lib, detection.trips, state, cities, language, t.locale),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lib, detection, state.trips, cities, language],
  );
  // Every photo never to be suggested but the favourites (src/logic/protect.ts): kept in a review,
  // protected by hand, in a protected trip or album. Every finder below takes it as `kept`.
  const kept = useMemo(() => {
    const tripIds = new Map(trips.map(x => [x.key, x.ids]));
    return protectedIds(state.kept, state.protect, key => tripIds.get(key), store.albumMembers);
  }, [state.kept, state.protect, trips, store.albumMembers]);
  // Settled groups (every photo but the one to keep is kept — "Alle behalten") are not shown again (openGroups).
  const groups = useMemo(
    () => openGroups(buildGroups(lib, detection.groups, state, store.faces, kept), kept),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lib, detection, state.best, store.faces, kept],
  );
  const blurry = useMemo(() => findBlurry(lib, groups).filter(p => !kept.has(p.id)), [lib, groups, kept]);
  // Too dark and too bright (src/logic/exposure.ts): with the blurry ones on the "Missglückt" screen.
  const exposure = useMemo(() => findExposure(lib.photos, new Set(groups.flatMap(g => g.ids)), kept), [lib, groups, kept]);
  const exposureAll = useMemo(() => [...exposure.dark, ...exposure.bright], [exposure]);
  const similarGroups = useMemo(() => groups.filter(g => g.kind === 'similar'), [groups]);
  // Photos apart from videos: the duplicates screen holds copies of photos; copies of a video and lookalike takes are the similar videos.
  const dupGroups = useMemo(() => groups.filter(g => g.kind === 'duplicate' && !isVideoGroup(g, lib.byId)), [groups, lib]);
  const videoGroups = useMemo(() => groups.filter(g => isVideoGroup(g, lib.byId)), [groups, lib]);
  // The analysis at the top of Aufräumen: every photo and every video, counted and sized.
  const totals = useMemo(() => mediaTotals(lib.photos), [lib]);
  const allVideos = useMemo(() => lib.photos.filter(p => p.video), [lib]);
  // "Now" for the screenshots' age and "On this day": taken again whenever the photos change.
  const now = useMemo(() => Date.now(), [photos]); // eslint-disable-line react-hooks/exhaustive-deps
  const shots = useMemo(() => findScreenshots(lib.photos, kept), [lib, kept]);
  const old = useMemo(() => oldShots(shots, now), [shots, now]);
  // The on-device AI (src/logic/ai.ts): utility photos, categories, how far its pass got.
  const utility = useMemo(() => findUtility(lib.photos, kept), [lib, kept]);
  const cats = useMemo(() => categories(lib.photos), [lib]);
  const aiSeen = useMemo(() => aiProgress(lib.photos), [lib]);
  const summary = useMemo(
    () => (photos ? summarize(lib, groups, blurry, kept, old, utility, exposureAll) : null),
    [photos, lib, groups, blurry, kept, old, utility, exposureAll],
  );
  const parts = useMemo(() => cleanParts(groups, blurry, old, kept, lib.byId, exposureAll), [groups, blurry, old, kept, lib, exposureAll]);
  const months = useMemo(() => buildMonths(lib.photos), [lib]);
  const doneMonths = useMemo(() => new Set(state.months), [state.months]);
  /** The share of the library gone through month by month, whole percent (for home, the months and the widget). */
  const pct = useMemo(() => progress(months, doneMonths), [months, doneMonths]);
  const today = useMemo(() => onThisDay(lib.photos, now), [lib, now]);
  const large = useMemo(() => findLarge(lib.photos), [lib]);
  const live = useMemo(() => findLive(lib.photos), [lib]);
  const compressible = useMemo(() => findCompressible(lib.photos, kept), [lib, kept]);
  // "Chats & soziale Medien" (src/logic/sources.ts): Android by folder, the iPhone by the apps' own albums.
  const sources = useMemo(() => groupBySource(lib.photos, isAndroid() ? undefined : store.appAlbums), [lib, store.appAlbums]);
  const sourcesBytes = useMemo(() => sources.reduce((s, g) => s + g.bytes, 0), [sources]);
  const hasLocations = useMemo(() => lib.photos.some(p => p.lat !== undefined), [lib]);
  // The decide-later pile, without photos that are gone (a full scan's view of the library prunes it for good).
  const laterPile = useMemo(() => state.later.filter(id => lib.byId.has(id)), [state.later, lib]);
  useEffect(() => {
    if (photos && store.access === 'full' && !store.scan.running && store.stateReady) store.pruneLaterPile(id => lib.byId.has(id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos, store.access, store.scan.running, store.stateReady, lib]);

  /* ------------------------------------------------------------- widget */

  // The home-screen widget shows "On this day" (with its first photo) or the space that could be freed;
  // sent again only when what it shows changes.
  const widgetSent = useRef('');
  useEffect(() => {
    if (!photos || !summary) return;
    const storage = store.storage;
    const data = today.ids.length
      ? {
        title: t.onThisDay,
        line: fmt(t.onThisDayBody, { photos: plural(t, 'photos', today.ids.length), years: today.years.map(y => String(y)).join(', ') }),
        photoId: today.ids[0],
      }
      : {
        title: summary.total.count ? t.cleanupCard : t.cleanupNone,
        // With nothing to clean up, the progress figure says something instead (when there is one).
        line: [summary.total.count ? bytes(t, summary.total.bytes) : pct > 0 ? fmt(t.widgetProgress, { pct: percent(t, pct) }) : null,
          storage ? fmt(t.storageValue, { free: bytes(t, storage.free), total: bytes(t, storage.total) }) : null].filter(Boolean).join(' · '),
      };
    // The Lock Screen widget (iPhone): the space that could be freed and the share gone through.
    const lock = { freeable: summary.total.bytes, pct };
    const key = JSON.stringify({ ...data, ...lock });
    if (key === widgetSent.current) return;
    const timer = window.setTimeout(() => {
      widgetSent.current = key;
      void PhotoLibrary.setWidget({ ...data, ...lock }).catch(() => {});
    }, 1500);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos, summary, today, store.storage, language, pct]);

  /* ---------------------------------------------------------- navigation */

  // The root's two tabs (ui/TabBar): cleaning up and organising. Each keeps its
  // scroll position; tapping the current tab again goes back to its top.
  type HomeTab = 'clean' | 'organize';
  const [tab, setTab] = useState<HomeTab>('clean');
  const tabScroll = useRef<Record<HomeTab, number>>({ clean: 0, organize: 0 });
  const switchTab = (next: HomeTab) => {
    if (next === tab) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    tabScroll.current[tab] = window.scrollY;
    setTab(next);
  };

  const [showTrips, setShowTrips] = useState(false);
  const [tripKey, setTripKey] = useState<string | null>(null);
  const [showCleanup, setShowCleanup] = useState(false);
  const [showSimilar, setShowSimilar] = useState(false);
  const [similarShown, setSimilarShown] = useState(40);
  const [groupKey, setGroupKey] = useState<string | null>(null);
  const [showBlurry, setShowBlurry] = useState(false);
  const [failedTab, setFailedTab] = useState<FailedTab>('blurry');
  const openFailed = (tab: FailedTab) => { setFailedTab(tab); setShowBlurry(true); };
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [showVideoGroups, setShowVideoGroups] = useState(false);
  const [videoGroupsShown, setVideoGroupsShown] = useState(40);
  const [showVideos, setShowVideos] = useState(false);
  const [duplicatesShown, setDuplicatesShown] = useState(40);
  const [showScreenshots, setShowScreenshots] = useState(false);
  const [showQuickClean, setShowQuickClean] = useState(false);
  const [showMonths, setShowMonths] = useState(false);
  const [monthsShown, setMonthsShown] = useState(24);
  const [showLarge, setShowLarge] = useState(false);
  const [showLive, setShowLive] = useState(false);
  const [showCompress, setShowCompress] = useState(false);
  const [showApps, setShowApps] = useState(false);
  const [showUtility, setShowUtility] = useState(false);
  const [category, setCategory] = useState<MemoryLabel | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showLicences, setShowLicences] = useState(false);
  /** The part whose licence is open (Einstellungen › Lizenzen › one row). */
  const [licence, setLicence] = useState<string | null>(null);
  const [showProtected, setShowProtected] = useState(false);
  const [review, setReview] = useState<Review | null>(null);

  const trip = tripKey ? trips.find(x => x.key === tripKey) ?? null : null;
  const group = groupKey ? groups.find(g => g.key === groupKey) ?? null : null;

  /** The decide-later pile after a review: what was put off joins it, what was decided leaves it. */
  const applyLater = (session: Session) => store.updateLater(laterIds(session), settledIds(session));
  const closeReview = () => {
    if (review) {
      store.addKept(keptAgainstSuggestion(review.session));
      applyLater(review.session);
      if (isDone(review.session)) review.onDone?.();
    }
    setReview(null);
  };

  // Screens pushed over Home, the deepest first. Every pushed screen must be
  // here: it drives the hardware back, the scroll reset and the slide.
  const pushed: [string, boolean, () => void][] = [
    ['review', !!review, closeReview],
    ['licence', !!licence, () => setLicence(null)],
    ['licences', showLicences, () => setShowLicences(false)],
    ['protected', showProtected, () => setShowProtected(false)],
    ['group', !!group, () => setGroupKey(null)],
    ['trip', !!trip, () => setTripKey(null)],
    ['similar', showSimilar, () => setShowSimilar(false)],
    ['duplicates', showDuplicates, () => setShowDuplicates(false)],
    ['videoGroups', showVideoGroups, () => setShowVideoGroups(false)],
    ['blurry', showBlurry, () => setShowBlurry(false)],
    ['screenshots', showScreenshots, () => setShowScreenshots(false)],
    ['quickClean', showQuickClean, () => setShowQuickClean(false)],
    ['large', showLarge, () => setShowLarge(false)],
    ['videos', showVideos, () => setShowVideos(false)],
    ['utility', showUtility, () => setShowUtility(false)],
    ['live', showLive, () => setShowLive(false)],
    ['compress', showCompress, () => setShowCompress(false)],
    ['apps', showApps, () => setShowApps(false)],
    ['cleanup', showCleanup, () => setShowCleanup(false)],
    ['category', !!category, () => setCategory(null)],
    ['months', showMonths, () => setShowMonths(false)],
    ['trips', showTrips, () => setShowTrips(false)],
    ['settings', showSettings, () => setShowSettings(false)],
  ];
  const topIndex = pushed.findIndex(([, open]) => open);
  const screen = topIndex === -1 ? 'home' : pushed[topIndex][0];
  // The two tabs are one screen for the stack, two for the transition: switching crossfades (dir 2) instead of sliding.
  const screenKey = screen === 'home' ? `home-${tab}` : screen;

  const nav = useRef({ screen: screenKey, depth: 0, dir: 0 });
  const depth = topIndex === -1 ? 0 : pushed.filter(([, open]) => open).length;
  if (nav.current.screen !== screenKey) {
    const tabSwitch = screen === 'home' && nav.current.screen.startsWith('home-');
    nav.current = { screen: screenKey, depth, dir: tabSwitch ? 2 : depth > nav.current.depth ? 1 : -1 };
  }
  const dir = nav.current.dir;
  const rtl = t.dir === 'rtl' ? -1 : 1;

  useEffect(() => { window.scrollTo(0, 0); }, [screen]);
  useLayoutEffect(() => { window.scrollTo(0, tabScroll.current[tab]); }, [tab]);

  useEffect(() => {
    const handle = CapacitorApp.addListener('backButton', () => {
      if (topIndex !== -1) pushed[topIndex][2]();
      else if (tab !== 'clean') setTab('clean');
      else void CapacitorApp.minimizeApp();
    });
    return () => { void handle.then(h => h.remove()).catch(() => {}); };
  });

  // A long scan keeps the screen on: iOS pauses an app whose screen went dark, and the scan with it.
  const scan = store.scan;
  const longScan = scan.running && (!scan.lastScanAt || ((scan.phase === 'analyse' || scan.phase === 'ai') && scan.total - scan.done > 50));
  useEffect(() => {
    if (longScan) void KeepAwake.keepAwake().catch(() => {});
    else void KeepAwake.allowSleep().catch(() => {});
  }, [longScan]);

  useEffect(() => {
    const resolved = document.documentElement.getAttribute('data-theme');
    void StatusBar.setStyle({ style: resolved === 'dark' ? Style.Dark : Style.Light }).catch(() => {});
  }, [store.themeMode]);

  /* ------------------------------------------------------------- unlock */

  // The launch phase (src/logic/allowance.ts): the extras hidden, deleting unlimited.
  const extras = extrasShown(store.owned);
  const unlimited = deletesUnlimited(store.owned, state.early);
  const [paywall, setPaywall] = useState(false);
  /** Set when the paywall opened for a delete larger than the free deletions left. */
  const [paywallFree, setPaywallFree] = useState<FreeInfo | null>(null);
  const afterUnlock = useRef<(() => void) | null>(null);
  const needUnlock = (then: () => void) => {
    if (store.owned) { then(); return; }
    afterUnlock.current = then;
    setPaywallFree(null);
    setPaywall(true);
  };
  const closePaywall = () => { setPaywall(false); setPaywallFree(null); afterUnlock.current = null; };
  const unlocked = () => {
    store.setOwned(true);
    setPaywall(false);
    setPaywallFree(null);
    const then = afterUnlock.current;
    afterUnlock.current = null;
    // The store may still hold the old `owned` for a frame: the action runs unlocked by itself.
    if (then) window.setTimeout(then, 250);
  };
  const restore = async () => {
    try {
      const { owned } = await Purchases.restore({ id: PRODUCT_ID });
      store.setOwned(owned);
      show(owned ? t.restoredOk : t.restoredNone);
    } catch { show(t.storeUnavailable); }
  };

  /* ------------------------------------------------- deleting and albums */

  /** Moves photos to Recently Deleted / the Trash, through the system's own dialog. True when done. */
  const trash = async (ids: string[], keepIds: string[] = [], free = false): Promise<boolean> => {
    try {
      const r = await PhotoLibrary.trash({ ids, dryRun: store.dryRun });
      if (r.cancelled) { show(t.deleteCancelled); return false; }
      store.addKept(keepIds);
      if (r.dryRun) { show(fmt(t.dryRunDelete, { photos: plural(t, 'photos', ids.length) })); return true; }
      store.addFreed(r.trashed.length, r.trashed.reduce((sum, id) => sum + (lib.byId.get(id)?.bytes ?? 0), 0));
      store.markDay();
      if (free) store.countFree(r.trashed.length);
      store.removePhotos(r.trashed);
      forgetThumbs(r.trashed);
      store.refreshStorage();
      notifySuccess();
      const left = free ? freeLeft(state.freeUsed + r.trashed.length) : -1;
      show(left < 0 ? plural(t, 'deleted', r.trashed.length)
        : `${plural(t, 'deleted', r.trashed.length)} · ${left > 0 ? plural(t, 'freeLeft', left) : t.freeUsedUp}`);
      return true;
    } catch {
      show(t.deleteFailed);
      return false;
    }
  };
  /**
   * Deleting without the unlock: the first FREE_DELETES photos go through as
   * usual. A selection larger than what is left opens the paywall, which also
   * offers to delete just the photos still free (the first ones selected).
   * While nothing is for sale, and for installs from that time, nothing counts.
   */
  const deletePhotos = (ids: string[], keepIds: string[] = [], after?: () => void) => {
    const run = (list: string[], free: boolean, done?: () => void) =>
      void trash(list, keepIds, free).then(ok => { if (ok) done?.(); });
    if (unlimited) { run(ids, false, after); return; }
    const { all, left } = freeDelete(state.freeUsed, ids.length);
    if (all) { run(ids, true, after); return; }
    afterUnlock.current = () => run(ids, false, after);
    setPaywallFree({
      left, wanted: ids.length,
      deleteLeft: left > 0 ? () => { closePaywall(); window.setTimeout(() => run(ids.slice(0, left), true), 250); } : undefined,
    });
    setPaywall(true);
  };

  const [albumFor, setAlbumFor] = useState<Trip | null>(null);
  const makeAlbum = async (x: Trip) => {
    setAlbumFor(null);
    const title = folderName(x.title);
    try {
      const r = await PhotoLibrary.createAlbum({ title, ids: x.ids, dryRun: store.dryRun });
      if (r.cancelled) { show(t.albumCancelled); return; }
      const photosText = plural(t, 'photos', r.done || x.ids.length);
      if (r.dryRun) { show(fmt(t.dryRunAlbum, { name: title, photos: photosText })); return; }
      store.recordAlbum(x.key, { title, count: r.done, at: Date.now() });
      notifySuccess();
      show(fmt(t.albumCreated, { name: title }));
      // Android moved the files: the next scan sees them in their new folder.
      if (isAndroid()) store.startScan();
    } catch {
      show(t.albumFailed);
    }
  };

  /* ----------------------------------------------- videos and Live Photos */

  // Making a video smaller: progress while it runs, then the question whether the original may go.
  const [compressing, setCompressing] = useState<{ id: string; progress: number } | null>(null);
  const [afterCompress, setAfterCompress] = useState<{ id: string; before: number; after: number } | null>(null);
  // Photos made smaller, in batches: where the run is (the progress events count within one batch).
  const [photoRun, setPhotoRun] = useState<{ total: number; progress: number } | null>(null);
  const [afterPhotos, setAfterPhotos] = useState<{ from: string[]; saved: number } | null>(null);
  const run = useRef({ batch: 0, batches: 1, stop: false });
  useEffect(() => {
    const handle = PhotoLibrary.addListener('compressProgress', e => {
      if (e.id === 'photos') {
        const r = run.current;
        setPhotoRun(p => (p ? { ...p, progress: Math.min(1, (r.batch + e.progress) / r.batches) } : p));
        return;
      }
      setCompressing(c => (c && c.id === e.id ? { ...c, progress: e.progress } : c));
    });
    // Into the background: the run stops after the batch it is in (iOS would pause it anyway).
    const away = CapacitorApp.addListener('appStateChange', ({ isActive }) => { if (!isActive) run.current.stop = true; });
    return () => { for (const h of [handle, away]) void h.then(x => x.remove()).catch(() => {}); };
  }, []);
  const compressPhotos = async (list: Photo[]) => {
    const parts = batches(list.map(p => p.id));
    run.current = { batch: 0, batches: parts.length, stop: false };
    setPhotoRun({ total: list.length, progress: 0 });
    const results: { from: string; to: string; before: number; after: number }[] = [];
    let failed = false;
    try {
      for (const [i, part] of parts.entries()) {
        if (run.current.stop) break;
        run.current.batch = i;
        const r = await PhotoLibrary.compressPhotos({ ids: part, dryRun: store.dryRun });
        results.push(...r.results);
        setPhotoRun(p => (p ? { ...p, progress: (i + 1) / parts.length } : p));
      }
    } catch {
      failed = true;
    } finally {
      setPhotoRun(null);
    }
    const { count, saved } = tally(results);
    if (store.dryRun) { show(fmt(t.dryRunCompressPhotos, { photos: plural(t, 'photos', count), size: bytes(t, saved) })); return; }
    if (!count) { show(failed ? t.compressFailed : t.compressPhotosNone); return; }
    store.startScan();
    store.markDay();
    if (run.current.stop) show(fmt(t.compressPhotosStopped, { photos: plural(t, 'photos', count) }));
    setShowCompress(false);
    setAfterPhotos({ from: results.map(r => r.from), saved });
  };
  const compress = async (p: Photo) => {
    setCompressing({ id: p.id, progress: 0 });
    try {
      const r = await PhotoLibrary.compressVideo({ id: p.id, dryRun: store.dryRun });
      if (r.dryRun) { show(fmt(t.dryRunCompress, { before: bytes(t, r.before), after: bytes(t, r.after) })); return; }
      if (!r.created) { show(t.compressNoGain); return; }
      store.startScan();
      store.markDay();
      setAfterCompress({ id: p.id, before: r.before, after: r.after });
    } catch {
      show(t.compressFailed);
    } finally {
      setCompressing(null);
    }
  };

  const [liveConfirm, setLiveConfirm] = useState<Photo[] | null>(null);
  const convertLive = async (list: Photo[]) => {
    setLiveConfirm(null);
    try {
      const r = await PhotoLibrary.convertLive({ ids: list.map(p => p.id), dryRun: store.dryRun });
      if (r.dryRun) { show(fmt(t.dryRunLive, { photos: plural(t, 'photos', r.converted.length) })); return; }
      if (!r.converted.length) { show(t.liveFailed); return; }
      store.startScan();
      store.markDay();
      const ok = await trash(r.converted.map(c => c.from));
      if (!ok) show(t.liveKeptBoth);
      else setShowLive(false);
    } catch {
      show(t.liveFailed);
    }
  };

  /* -------------------------------------------------------------- review */

  /** A list screen's order and how to change it (src/logic/sort.ts). */
  const sorting = (screen: SortScreen) => ({ sort: sortFor(state.sort, screen), onSort: (k: Parameters<typeof store.setSort>[1]) => store.setSort(screen, k) });

  const startReview = (items: ReviewItem[], onDone?: () => void) => {
    if (!items.length) return;
    setReview({ session: startSession(items), finished: false, onDone });
    if (extras && !albumList) void PhotoLibrary.listAlbums().then(r => setAlbumList(r.albums)).catch(() => setAlbumList([]));
  };

  /* -------------------------------------------- albums while swiping */

  // The chips: the albums (iPhone) / folders (Android), the last used first, then by name. Asked when a review opens.
  const [albumList, setAlbumList] = useState<AlbumInfo[] | null>(null);
  const chips = useMemo(() => {
    const recent = state.recentAlbums;
    const rank = (id: string) => { const i = recent.indexOf(id); return i === -1 ? Infinity : i; };
    return (albumList ?? []).slice().sort((a, b) => rank(a.id) - rank(b.id) || a.title.localeCompare(b.title, t.locale))
      .map(a => ({ id: a.id, title: a.title }));
  }, [albumList, state.recentAlbums, t.locale]);
  const onFile = (album: string) => needUnlock(() => setReview(r => (r ? { ...r, session: fileTo(r.session, album) } : r)));
  /** The end screen's albums: one native call for all of them (Android: one dialog). True when done (or nothing to do). */
  const fileAlbums = async (plan: ReviewOutcome['albums']): Promise<boolean> => {
    if (!plan.length) return true;
    const filed = plan.reduce((n, a) => n + a.ids.length, 0);
    try {
      const r = await PhotoLibrary.addToAlbums({
        groups: plan.map(a => (isNewAlbum(a.album) ? { title: a.album.slice(4), ids: a.ids } : { albumId: a.album, ids: a.ids })),
        dryRun: store.dryRun,
      });
      if (r.cancelled) { show(t.filedCancelled); return false; }
      if (r.dryRun) { show(fmt(t.dryRunFiled, { photos: plural(t, 'photos', filed) })); return true; }
      store.useAlbums(plan.map(a => a.album).filter(a => !isNewAlbum(a)));
      setAlbumList(null);
      if (isAndroid()) store.startScan();
      notifySuccess();
      show(fmt(t.filedDone, { photos: plural(t, 'photos', r.done) }));
      return true;
    } catch {
      show(t.filedFailed);
      return false;
    }
  };
  const isOld = (p: Photo) => isOldShot(p, now);
  const openMonth = (key: string) => {
    const m = months.find(x => x.key === key);
    if (m) startReview(reviewTrip(m.ids, groups, lib.byId, kept, isOld), () => { store.markMonthDone(key); store.markDay(); });
  };
  const onDecide = (d: Decision) => setReview(r => (r ? { ...r, session: decide(r.session, d) } : r));
  const onUndo = () => setReview(r => (r ? { ...r, session: undo(r.session), finished: false } : r));

  /* ----------------------------------------------------------- the rest */

  // Settings › Geschützt: the albums to choose from, asked when the screen opens (stable, so it asks once).
  const loadAlbums = useCallback(() => PhotoLibrary.listAlbums().then(r => r.albums), []);

  const rate = rateUrl(isAndroid() ? 'android' : isIos() || devNative() ? 'ios' : 'web');
  const byId = lib.byId;
  const access = store.access;
  const hasAccess = access === 'full' || access === 'limited';

  const addPhotos = async () => {
    const { access: a } = await PhotoLibrary.addMorePhotos().catch(() => ({ access: access ?? 'denied' }));
    await store.accessGranted(a);
  };

  const content = () => {
    if (review) {
      return (
        <ReviewView
          t={t} session={review.session} finished={review.finished} byId={byId} debug={store.debug}
          onDecide={onDecide} onUndo={onUndo} albums={chips} android={isAndroid()} onFile={extras ? onFile : undefined}
          onProtect={id => { store.protectPhotos([id], true); onDecide('keep'); show(t.protected); }}
          onPreview={id => { void PhotoLibrary.preview({ id }).catch(() => show(t.previewFailed)); }}
          onFinish={() => setReview(r => (r ? { ...r, finished: true } : r))}
          onDelete={outcome => {
            applyLater(review.session);
            const finish = () => { if (isDone(review.session)) review.onDone?.(); setReview(null); };
            void fileAlbums(outcome.albums).then(() => {
              if (outcome.deleteIds.length) deletePhotos(outcome.deleteIds, keptAgainstSuggestion(review.session), finish);
              else { store.addKept(keptAgainstSuggestion(review.session)); finish(); }
            });
          }}
          onClose={closeReview}
        />
      );
    }
    if (licence) return <LicenceView t={t} name={licence} onBack={() => setLicence(null)} />;
    if (showLicences) return <LicencesView t={t} onBack={() => setShowLicences(false)} onOpen={setLicence} />;
    if (showProtected) {
      return (
        <ProtectedView
          t={t} loadAlbums={loadAlbums} albums={state.protect.albums}
          trips={trips.filter(x => state.protect.trips.includes(x.key)).map(x => ({ key: x.key, title: x.title, count: x.ids.length }))}
          photos={state.protect.ids.filter(id => byId.has(id))}
          photoDate={id => new Date(byId.get(id)?.t ?? 0).toLocaleString(t.locale, { dateStyle: 'medium', timeStyle: 'short' })}
          onAlbum={store.protectAlbum}
          onTrip={key => store.protectTrip(key, false)}
          onPhoto={id => store.protectPhotos([id], false)}
          onBack={() => setShowProtected(false)}
        />
      );
    }
    if (group) {
      return (
        <GroupView
          t={t} group={group} byId={byId} kept={kept} debug={store.debug}
          onBack={() => setGroupKey(null)}
          onPick={id => store.setBest(group.key, id === group.suggested ? null : id)}
          onReview={() => startReview(reviewGroup(group, kept, byId))}
          onDeleteOthers={ids => deletePhotos(ids, [], () => setGroupKey(null))}
          onKeepAll={() => {
            const ids = group.ids.filter(id => !state.kept.includes(id));
            store.addKept(ids);
            setGroupKey(null);
            show(t.keepAllDone, { label: t.undo, run: () => store.removeKept(ids) });
          }}
          onScoreFaces={ids => { void store.scoreFaces(ids); }}
        />
      );
    }
    if (trip) {
      const base = trip.key.split('+')[0];
      return (
        <TripView
          t={t} trip={trip} trips={trips.filter(x => !x.ignored)} byId={byId}
          isMerged={state.trips.merges.some(g => g.includes(trip.key))}
          isSplit={!!state.trips.splits[base]}
          onBack={() => setTripKey(null)}
          onCreateAlbum={extras ? () => needUnlock(() => setAlbumFor(trip)) : undefined}
          onReview={() => startReview(reviewTrip(trip.ids, groups, byId, kept))}
          onRename={name => store.updateTrips(e => setName(e, trip.key, name))}
          onSplit={at => { store.updateTrips(e => addSplit(e, trip.key, at)); show(t.tripSplit); }}
          onMerge={other => {
            const o = trips.find(x => x.key === other);
            store.updateTrips(e => addMerge(e, [trip.key, other]));
            if (o && o.start < trip.start) setTripKey(o.key);
            show(t.tripsMerged);
          }}
          onUndoSplit={() => { store.updateTrips(e => removeSplits(e, trip.key)); setTripKey(base); }}
          onUndoMerge={() => store.updateTrips(e => removeMerge(e, trip.key))}
          isProtected={state.protect.trips.includes(trip.key)}
          onProtect={on => { store.protectTrip(trip.key, on); if (on) show(fmt(t.tripProtected, { name: trip.title })); }}
          onIgnore={ignored => {
            store.updateTrips(e => setIgnored(e, trip.key, ignored));
            if (ignored) {
              const key = trip.key;
              setTripKey(null);
              show(fmt(t.tripIgnored, { name: trip.title }), { label: t.undo, run: () => store.updateTrips(e => setIgnored(e, key, false)) });
            }
          }}
        />
      );
    }
    if (showSimilar) {
      return (
        <SimilarView
          t={t} groups={similarGroups} byId={byId} kept={kept} shown={similarShown}
          onMore={() => setSimilarShown(n => n + 40)}
          onBack={() => setShowSimilar(false)} onOpen={setGroupKey}
        />
      );
    }
    if (showDuplicates) {
      return (
        <SimilarView
          t={t} kind="duplicate" groups={dupGroups} byId={byId} kept={kept} shown={duplicatesShown}
          onMore={() => setDuplicatesShown(n => n + 40)}
          onBack={() => setShowDuplicates(false)} onOpen={setGroupKey}
        />
      );
    }
    if (showVideoGroups) {
      return (
        <SimilarView
          t={t} kind="lookalike" groups={videoGroups} byId={byId} kept={kept} shown={videoGroupsShown}
          onMore={() => setVideoGroupsShown(n => n + 40)}
          onBack={() => setShowVideoGroups(false)} onOpen={setGroupKey}
        />
      );
    }
    if (showBlurry) {
      return (
        <FailedView
          t={t} {...sorting('failed')} blurry={blurry} dark={exposure.dark} bright={exposure.bright} tab={failedTab}
          onBack={() => setShowBlurry(false)}
          onReviewBlurry={(list: Photo[]) => startReview(reviewBlurry(list))}
          onReviewExposure={(list, level) => startReview(reviewExposure(list, level))}
        />
      );
    }
    if (showScreenshots) {
      return (
        <ScreenshotsView
          t={t} {...sorting('screenshots')} photos={shots} now={now} onBack={() => setShowScreenshots(false)}
          onReview={(list: Photo[]) => startReview(reviewScreenshots(list))}
        />
      );
    }
    if (showQuickClean) {
      return (
        <QuickCleanView
          t={t} parts={parts} storage={store.storage}
          onBack={() => setShowQuickClean(false)}
          onReview={ids => {
            const reasons = new Map(reviewCleanup(groups, cleanupBlurry(blurry, kept), kept, byId, old, [], exposureAll).map(i => [i.id, i]));
            startReview(ids.map(id => reasons.get(id)).filter((i): i is ReviewItem => !!i));
          }}
          onDelete={ids => deletePhotos(ids, [], () => setShowQuickClean(false))}
        />
      );
    }
    if (showLarge) {
      return (
        <LargeView
          t={t} {...sorting('large')} photos={large} canCompress={extras}
          onBack={() => setShowLarge(false)}
          onReview={(list: Photo[]) => startReview(reviewLarge(list))}
          onCompress={p => needUnlock(() => { void compress(p); })}
          onDelete={p => deletePhotos([p.id])}
        />
      );
    }
    if (showVideos) {
      return (
        <LargeView
          t={t} {...sorting('large')} photos={allVideos} videosOnly canCompress={extras}
          onBack={() => setShowVideos(false)}
          onReview={(list: Photo[]) => startReview(reviewLarge(list))}
          onCompress={p => needUnlock(() => { void compress(p); })}
          onDelete={p => deletePhotos([p.id])}
        />
      );
    }
    if (showUtility) {
      return (
        <UtilityView
          t={t} {...sorting('utility')} photos={utility} progress={aiSeen} onBack={() => setShowUtility(false)}
          onReview={(list: Photo[]) => startReview(reviewUtility(list))}
        />
      );
    }
    if (showApps) {
      return (
        <AppsView
          t={t} groups={sources} {...sorting('apps')}
          onBack={() => setShowApps(false)}
          onReview={list => startReview(reviewSource(list, kept))}
        />
      );
    }
    if (showCompress) {
      return (
        <CompressView
          t={t} photos={compressible.photos} screenshots={compressible.screenshots}
          onBack={() => setShowCompress(false)}
          onRun={list => needUnlock(() => { void compressPhotos(list); })}
        />
      );
    }
    if (showLive) {
      return <LiveView t={t} {...sorting('live')} photos={live} onBack={() => setShowLive(false)} onConvert={list => needUnlock(() => setLiveConfirm(list))} />;
    }
    if (showCleanup && summary) {
      return (
        <CleanupView
          t={t} summary={summary} onBack={() => setShowCleanup(false)}
          onDuplicates={() => setShowDuplicates(true)}
          onVideoGroups={() => setShowVideoGroups(true)}
          onSimilar={() => setShowSimilar(true)} onBlurry={() => openFailed('blurry')}
          onExposure={() => openFailed(exposure.dark.length ? 'dark' : 'bright')}
          onScreenshots={() => setShowScreenshots(true)}
          onUtility={() => setShowUtility(true)}
          onReviewAll={() => startReview(reviewCleanup(groups, cleanupBlurry(blurry, kept), kept, byId, old, utility, exposureAll))}
          onQuickClean={() => setShowQuickClean(true)}
        />
      );
    }
    if (category) {
      const c = cats.find(x => x.label === category);
      return <CategoryView t={t} {...sorting('category')} label={category} photos={c?.photos ?? []} onBack={() => setCategory(null)} />;
    }
    if (showMonths) {
      return (
        <MonthsView
          t={t} months={months} done={doneMonths} byId={byId} shown={monthsShown}
          onMore={() => setMonthsShown(n => n + 24)}
          onBack={() => setShowMonths(false)} onOpen={openMonth}
        />
      );
    }
    if (showTrips) return <TripsView t={t} trips={trips} onBack={() => setShowTrips(false)} onOpen={setTripKey} />;
    if (showSettings) {
      return (
        <SettingsView
          t={t} language={language} themeMode={store.themeMode} access={access} owned={store.owned} onSale={UNLOCK_ON_SALE} unlimited={unlimited} freeLeft={freeLeft(state.freeUsed)}
          debug={store.debug} dryRunAvailable={store.dryRunAvailable} dryRun={store.dryRun}
          reminder={store.reminder}
          onReminder={on => { void store.setReminder(on, t.reminderTitle, t.reminderBody).then(ok => { if (on && !ok) show(t.reminderDenied); }); }}
          onBack={() => setShowSettings(false)}
          onLanguage={store.setLanguage} onTheme={store.setThemeMode}
          onOpenSettings={() => { void PhotoLibrary.openSettings(); }}
          onUnlock={() => setPaywall(true)}
          onRestore={restore}
          onDryRun={store.setDryRun}
          onRate={rate ? () => openExternal(rate) : undefined}
          onFeedback={() => openExternal(feedbackMail(t, __APP_VERSION__, systemFromAgent(navigator.userAgent)))}
          onPrivacy={() => openExternal(privacyUrl(language))}
          onLicences={() => setShowLicences(true)}
          onReset={() => {
            const before = store.resetDecisions();
            show(t.resetDone, { label: t.undo, run: () => store.restoreState(before) });
          }}
        />
      );
    }
    if (access && !hasAccess) {
      return (
        <PermissionView
          t={t} access={access} albums={extras}
          onAllow={async () => {
            const { access: a } = await PhotoLibrary.requestAccess().catch(() => ({ access: 'denied' as const }));
            await store.accessGranted(a);
          }}
          onOpenSettings={() => { void PhotoLibrary.openSettings(); }}
          onSettings={() => setShowSettings(true)}
        />
      );
    }
    if (!access) return <div className="min-h-screen" aria-busy="true" />;
    if (tab === 'organize') {
      return (
        <OrganizeView
          t={t} photoCount={photos ? photos.length : null} trips={trips} hasLocations={hasLocations}
          onThisDay={{ photos: today.ids.length, years: today.years, cover: today.ids[0] }}
          categories={cats.slice(0, 8).map(c => ({ label: c.label, count: c.photos.length, cover: c.photos[0].id }))}
          onSettings={() => setShowSettings(true)}
          onOnThisDay={() => startReview(reviewTrip(today.ids, groups, byId, kept))}
          onTrips={() => setShowTrips(true)}
          onTrip={setTripKey}
          onCategory={setCategory}
        />
      );
    }
    const failedAll = [...blurry, ...exposureAll];
    return (
      <HomeView
        t={t} access={access} photoCount={photos ? photos.length : null} scan={store.scan} summary={summary}
        found={{
          duplicates: { items: dupGroups.length, covers: dupGroups.slice(0, 4).map(g => g.ids.find(id => id !== g.suggested) ?? g.ids[0]) },
          videos: { items: videoGroups.length, covers: videoGroups.slice(0, 4).map(g => g.ids.find(id => id !== g.suggested) ?? g.ids[0]) },
          similar: { items: similarGroups.length, covers: similarGroups.slice(0, 4).map(g => g.suggested) },
          failed: { items: failedAll.length, covers: failedAll.slice(0, 4).map(x => x.id) },
          screenshots: { items: shots.length, covers: shots.slice(0, 4).map(x => x.id) },
          ...(aiSeen.seen > 0 ? { utility: { items: utility.length, covers: utility.slice(0, 4).map(x => x.id) } } : {}),
        }}
        large={{ count: large.length, bytes: large.reduce((sum, x) => sum + x.bytes, 0), cover: large[0]?.id }}
        liveCount={isAndroid() || !extras ? 0 : live.length} liveCover={live[0]?.id}
        compress={{ count: extras ? compressible.photos.length + compressible.screenshots.length : 0, saving: compressible.saving, cover: (compressible.photos[0] ?? compressible.screenshots[0])?.id }}
        onCompress={() => setShowCompress(true)}
        apps={sourcesBytes >= APPS_TILE_MIN ? { bytes: sourcesBytes, cover: sources[0]?.photos[0]?.id } : null}
        onApps={() => setShowApps(true)}
        storage={store.storage} freedBytes={state.freed.bytes} streak={streak(state.days, now)}
        months={{ done: months.filter(m => doneMonths.has(m.key)).length, total: months.length, pct }}
        later={{ count: laterPile.length, cover: laterPile[0] }}
        protection={{ albums: state.protect.albums.length, trips: state.protect.trips.length, photos: state.protect.ids.length }}
        onLater={() => startReview(reviewLater(laterPile))}
        onProtected={() => setShowProtected(true)}
        onRescan={() => store.startScan()}
        onSettings={() => setShowSettings(true)}
        onAddPhotos={addPhotos}
        onCleanup={() => setShowCleanup(true)}
        onSimilar={() => setShowSimilar(true)}
        onBlurry={() => openFailed('blurry')}
        onDuplicates={() => setShowDuplicates(true)}
        onVideoGroups={() => setShowVideoGroups(true)}
        onVideos={() => setShowVideos(true)}
        analysis={{
          photos: totals.photos, videos: totals.videos,
          similarPhotos: summary ? { count: summary.similar.count, bytes: summary.similar.bytes } : { count: 0, bytes: 0 },
          similarVideos: summary ? { count: summary.lookalike.count, bytes: summary.lookalike.bytes } : { count: 0, bytes: 0 },
          chats: { count: sources.reduce((n, g) => n + g.photos.length, 0), bytes: sourcesBytes },
          screenshots: { count: shots.length, bytes: shots.reduce((s, p) => s + p.bytes, 0) },
        }}
        onScreenshots={() => setShowScreenshots(true)}
        onMonths={() => setShowMonths(true)}
        onLarge={() => setShowLarge(true)}
        onLive={() => setShowLive(true)}
        onUtility={() => setShowUtility(true)}
      />
    );
  };

  return (
    <div className="font-sans text-fg min-h-screen bg-bg overflow-x-clip">
      {store.storageError && (
        <div role="alert" className="bg-neg-dim text-neg px-4 py-2 safe-top">
          <div className="mx-auto max-w-xl flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span className="text-caption font-bold flex-1">{t.deleteFailed}</span>
          </div>
        </div>
      )}

      <motion.div
        key={screenKey}
        initial={dir === 0 ? false : dir === 2 ? { opacity: 0 } : dir === 1 ? { x: `${100 * rtl}%` } : { x: `${-30 * rtl}%`, opacity: 0.6 }}
        animate={{ x: 0, opacity: 1 }}
        transition={dir === 2 ? { duration: 0.2, ease: 'easeOut' } : { duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
      >
        <Suspense fallback={<div className="min-h-screen" aria-busy="true" />}>{content()}</Suspense>
      </motion.div>

      {screen === 'home' && hasAccess && (
        <TabBar
          label={t.tabsLabel} current={tab} onChange={switchTab}
          tabs={[{ key: 'clean', label: t.tabClean, icon: Sparkles }, { key: 'organize', label: t.tabOrganize, icon: Images }]}
        />
      )}

      {store.dryRun && (
        <div className="fixed inset-x-0 top-0 z-40 flex justify-center pointer-events-none safe-top">
          <span className="mt-1 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-warn-dim text-warn text-micro font-extrabold">
            <FlaskConical className="w-3.5 h-3.5" aria-hidden="true" />{t.dryRunBanner}
          </span>
        </div>
      )}

      <PaywallSheet t={t} open={paywall} free={store.owned ? undefined : paywallFree ?? { left: freeLeft(state.freeUsed) }} onClose={closePaywall} onOwned={unlocked} toast={label => show(label)} />

      <Confirm
        open={!!albumFor}
        title={t.albumConfirmTitle}
        body={albumFor ? fmt(t.albumConfirmBody, { name: folderName(albumFor.title), photos: plural(t, 'photos', albumFor.ids.length) }) : ''}
        confirmLabel={t.createAlbum}
        cancelLabel={t.cancel}
        onConfirm={() => { if (albumFor) void makeAlbum(albumFor); }}
        onCancel={() => setAlbumFor(null)}
      />

      <Confirm
        open={!!liveConfirm}
        title={t.liveConfirmTitle}
        body={liveConfirm ? fmt(t.liveConfirmBody, { photos: plural(t, 'photos', liveConfirm.length) }) : ''}
        confirmLabel={t.liveConfirm}
        cancelLabel={t.cancel}
        onConfirm={() => { if (liveConfirm) void convertLive(liveConfirm); }}
        onCancel={() => setLiveConfirm(null)}
      />

      <Confirm
        open={!!afterCompress}
        title={t.compressDeleteTitle}
        body={afterCompress ? fmt(t.compressDeleteBody, { before: bytes(t, afterCompress.before), after: bytes(t, afterCompress.after) }) : ''}
        confirmLabel={t.deleteVideo}
        cancelLabel={t.compressKeep}
        danger
        onConfirm={() => { const a = afterCompress; setAfterCompress(null); if (a) void trash([a.id]); }}
        onCancel={() => { setAfterCompress(null); show(t.compressKept); }}
      />

      <Confirm
        open={!!afterPhotos}
        title={afterPhotos ? fmt(t.compressPhotosDone, { size: bytes(t, afterPhotos.saved) }) : ''}
        body={afterPhotos ? fmt(t.compressPhotosDoneBody, { photos: plural(t, 'photos', afterPhotos.from.length) }) : ''}
        confirmLabel={t.deleteOriginals}
        cancelLabel={t.keepBoth}
        danger
        onConfirm={() => { const a = afterPhotos; setAfterPhotos(null); if (a) void trash(a.from); }}
        onCancel={() => { setAfterPhotos(null); show(t.compressPhotosKept); }}
      />

      <Sheet open={!!photoRun} title={t.compressingPhotos} closeLabel={t.close} onClose={() => {}}>
        <div className="space-y-3 pb-2">
          <p className="text-label text-fg-mute num">{photoRun ? fmt(t.compressingPhotosBody, { done: Math.round(photoRun.progress * photoRun.total), total: photoRun.total }) : ''}</p>
          <Progress value={photoRun?.progress ?? null} label={t.compressingPhotos} />
        </div>
      </Sheet>

      <Sheet open={!!compressing} title={t.compressing} closeLabel={t.close} onClose={() => {}}>
        <div className="space-y-3 pb-2">
          <p className="text-label text-fg-mute">{t.compressing}</p>
          <Progress value={compressing?.progress ?? null} label={t.compressing} />
        </div>
      </Sheet>

      <Toast toast={toast} onDone={hide} raised={['trip', 'group', 'blurry', 'screenshots', 'utility', 'quickClean', 'large', 'live', 'compress', 'cleanup', 'review'].includes(screen)} />
    </div>
  );
}
