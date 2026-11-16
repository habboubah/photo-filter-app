import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { App as CapacitorApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { KeepAwake } from '@capacitor-community/keep-awake';
import { AlertTriangle, FlaskConical } from 'lucide-react';
import { useAppStore } from './store';
import { bytes, fmt, plural, stringsFor } from './translations';
import type { Photo, Trip } from './types';
import { PhotoLibrary } from './native/photoLibrary';
import { PRODUCT_ID, Purchases } from './native/purchases';
import { loadCities } from './cities';
import { forgetThumbs } from './thumbs';
import type { CityIndex } from './logic/geo';
import { buildGroups, buildTrips, cleanupBlurry, detect, findBlurry, makeLibrary, summarize } from './logic/analyze';
import { folderName } from './logic/naming';
import { addMerge, addSplit, removeMerge, removeSplits, setIgnored, setName } from './logic/trips';
import {
  Decision, ReviewItem, Session, decide, isDone, keptAgainstSuggestion, reviewBlurry, reviewCleanup, reviewGroup,
  reviewLarge, reviewScreenshots, reviewTrip, reviewUtility, startSession, undo,
} from './logic/review';
import { aiProgress, categories, findUtility, type MemoryLabel } from './logic/ai';
import { findScreenshots, isOldShot, oldShots } from './logic/screenshots';
import { findLarge, findLive } from './logic/large';
import { buildMonths, onThisDay } from './logic/months';
import { cleanParts } from './logic/smartClean';
import { streak } from './logic/streak';
import { feedbackMail, openExternal, privacyUrl, rateUrl, systemFromAgent } from './links';
import { devNative, isAndroid, isIos } from './platform';
import { Toast, useToast } from './ui/Toast';
import { Confirm } from './ui/Sheet';
import { notifySuccess } from './ui/haptics';
import { PermissionView } from './components/PermissionView';
import { HomeView } from './components/HomeView';
import { TripsView } from './components/TripsView';
import { TripView } from './components/TripView';
import { CleanupView } from './components/CleanupView';
import { SimilarView } from './components/SimilarView';
import { GroupView } from './components/GroupView';
import { BlurryView } from './components/BlurryView';
import { ScreenshotsView } from './components/ScreenshotsView';
import { QuickCleanView } from './components/QuickCleanView';
import { MonthsView } from './components/MonthsView';
import { LargeView } from './components/LargeView';
import { LiveView } from './components/LiveView';
import { UtilityView } from './components/UtilityView';
import { CategoryView } from './components/CategoryView';
import { Progress } from './ui/Controls';
import { Sheet } from './ui/Sheet';
import { ReviewView } from './components/ReviewView';
import { PaywallSheet, type FreeInfo } from './components/PaywallSheet';
import { freeDelete, freeLeft } from './logic/allowance';
import { LicencesView, SettingsView } from './components/SettingsView';

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
  const groups = useMemo(
    () => buildGroups(lib, detection.groups, state, store.faces),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lib, detection, state.best, store.faces],
  );
  const kept = useMemo(() => new Set(state.kept), [state.kept]);
  const blurry = useMemo(() => findBlurry(lib, groups).filter(p => !kept.has(p.id)), [lib, groups, kept]);
  const similarGroups = useMemo(() => groups.filter(g => g.kind === 'similar'), [groups]);
  const dupGroups = useMemo(() => groups.filter(g => g.kind === 'duplicate'), [groups]);
  // "Now" for the screenshots' age and "On this day": taken again whenever the photos change.
  const now = useMemo(() => Date.now(), [photos]); // eslint-disable-line react-hooks/exhaustive-deps
  const shots = useMemo(() => findScreenshots(lib.photos, kept), [lib, kept]);
  const old = useMemo(() => oldShots(shots, now), [shots, now]);
  // The on-device AI (src/logic/ai.ts): utility photos, categories, how far its pass got.
  const utility = useMemo(() => findUtility(lib.photos, kept), [lib, kept]);
  const cats = useMemo(() => categories(lib.photos), [lib]);
  const aiSeen = useMemo(() => aiProgress(lib.photos), [lib]);
  const summary = useMemo(
    () => (photos ? summarize(lib, groups, blurry, kept, old, utility) : null),
    [photos, lib, groups, blurry, kept, old, utility],
  );
  const parts = useMemo(() => cleanParts(groups, blurry, old, kept, lib.byId), [groups, blurry, old, kept, lib]);
  const months = useMemo(() => buildMonths(lib.photos), [lib]);
  const doneMonths = useMemo(() => new Set(state.months), [state.months]);
  const today = useMemo(() => onThisDay(lib.photos, now), [lib, now]);
  const large = useMemo(() => findLarge(lib.photos), [lib]);
  const live = useMemo(() => findLive(lib.photos), [lib]);
  const hasLocations = useMemo(() => lib.photos.some(p => p.lat !== undefined), [lib]);

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
        line: [summary.total.count ? bytes(t, summary.total.bytes) : null,
          storage ? fmt(t.storageValue, { free: bytes(t, storage.free), total: bytes(t, storage.total) }) : null].filter(Boolean).join(' · '),
      };
    const key = JSON.stringify(data);
    if (key === widgetSent.current) return;
    const timer = window.setTimeout(() => {
      widgetSent.current = key;
      void PhotoLibrary.setWidget(data).catch(() => {});
    }, 1500);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos, summary, today, store.storage, language]);

  /* ---------------------------------------------------------- navigation */

  const [showTrips, setShowTrips] = useState(false);
  const [tripKey, setTripKey] = useState<string | null>(null);
  const [showCleanup, setShowCleanup] = useState(false);
  const [showSimilar, setShowSimilar] = useState(false);
  const [similarShown, setSimilarShown] = useState(40);
  const [groupKey, setGroupKey] = useState<string | null>(null);
  const [showBlurry, setShowBlurry] = useState(false);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [duplicatesShown, setDuplicatesShown] = useState(40);
  const [showScreenshots, setShowScreenshots] = useState(false);
  const [showQuickClean, setShowQuickClean] = useState(false);
  const [showMonths, setShowMonths] = useState(false);
  const [monthsShown, setMonthsShown] = useState(24);
  const [showLarge, setShowLarge] = useState(false);
  const [showLive, setShowLive] = useState(false);
  const [showUtility, setShowUtility] = useState(false);
  const [category, setCategory] = useState<MemoryLabel | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showLicences, setShowLicences] = useState(false);
  const [review, setReview] = useState<Review | null>(null);

  const trip = tripKey ? trips.find(x => x.key === tripKey) ?? null : null;
  const group = groupKey ? groups.find(g => g.key === groupKey) ?? null : null;

  const closeReview = () => {
    if (review) {
      store.addKept(keptAgainstSuggestion(review.session));
      if (isDone(review.session)) review.onDone?.();
    }
    setReview(null);
  };

  // Screens pushed over Home, the deepest first. Every pushed screen must be
  // here: it drives the hardware back, the scroll reset and the slide.
  const pushed: [string, boolean, () => void][] = [
    ['review', !!review, closeReview],
    ['licences', showLicences, () => setShowLicences(false)],
    ['group', !!group, () => setGroupKey(null)],
    ['trip', !!trip, () => setTripKey(null)],
    ['similar', showSimilar, () => setShowSimilar(false)],
    ['duplicates', showDuplicates, () => setShowDuplicates(false)],
    ['blurry', showBlurry, () => setShowBlurry(false)],
    ['screenshots', showScreenshots, () => setShowScreenshots(false)],
    ['quickClean', showQuickClean, () => setShowQuickClean(false)],
    ['large', showLarge, () => setShowLarge(false)],
    ['utility', showUtility, () => setShowUtility(false)],
    ['live', showLive, () => setShowLive(false)],
    ['cleanup', showCleanup, () => setShowCleanup(false)],
    ['category', !!category, () => setCategory(null)],
    ['months', showMonths, () => setShowMonths(false)],
    ['trips', showTrips, () => setShowTrips(false)],
    ['settings', showSettings, () => setShowSettings(false)],
  ];
  const topIndex = pushed.findIndex(([, open]) => open);
  const screen = topIndex === -1 ? 'home' : pushed[topIndex][0];

  const nav = useRef({ screen, depth: 0, dir: 0 });
  const depth = topIndex === -1 ? 0 : pushed.filter(([, open]) => open).length;
  if (nav.current.screen !== screen) nav.current = { screen, depth, dir: depth > nav.current.depth ? 1 : -1 };
  const dir = nav.current.dir;
  const rtl = t.dir === 'rtl' ? -1 : 1;

  useEffect(() => { window.scrollTo(0, 0); }, [screen]);

  useEffect(() => {
    const handle = CapacitorApp.addListener('backButton', () => {
      if (topIndex !== -1) pushed[topIndex][2]();
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
   */
  const deletePhotos = (ids: string[], keepIds: string[] = [], after?: () => void) => {
    const run = (list: string[], free: boolean, done?: () => void) =>
      void trash(list, keepIds, free).then(ok => { if (ok) done?.(); });
    if (store.owned) { run(ids, false, after); return; }
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
  useEffect(() => {
    const handle = PhotoLibrary.addListener('compressProgress', e => setCompressing(c => (c && c.id === e.id ? { ...c, progress: e.progress } : c)));
    return () => { void handle.then(h => h.remove()).catch(() => {}); };
  }, []);
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

  const startReview = (items: ReviewItem[], onDone?: () => void) => {
    if (items.length) setReview({ session: startSession(items), finished: false, onDone });
  };
  const isOld = (p: Photo) => isOldShot(p, now);
  const openMonth = (key: string) => {
    const m = months.find(x => x.key === key);
    if (m) startReview(reviewTrip(m.ids, groups, lib.byId, kept, isOld), () => { store.markMonthDone(key); store.markDay(); });
  };
  const onDecide = (d: Decision) => setReview(r => (r ? { ...r, session: decide(r.session, d) } : r));
  const onUndo = () => setReview(r => (r ? { ...r, session: undo(r.session), finished: false } : r));

  /* ----------------------------------------------------------- the rest */

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
          onDecide={onDecide} onUndo={onUndo}
          onFinish={() => setReview(r => (r ? { ...r, finished: true } : r))}
          onDelete={ids => deletePhotos(ids, keptAgainstSuggestion(review.session), () => {
            if (isDone(review.session)) review.onDone?.();
            setReview(null);
          })}
          onClose={closeReview}
        />
      );
    }
    if (showLicences) return <LicencesView t={t} onBack={() => setShowLicences(false)} />;
    if (group) {
      return (
        <GroupView
          t={t} group={group} byId={byId} kept={kept} debug={store.debug}
          onBack={() => setGroupKey(null)}
          onPick={id => store.setBest(group.key, id === group.suggested ? null : id)}
          onReview={() => startReview(reviewGroup(group, kept, byId))}
          onDeleteOthers={ids => deletePhotos(ids, [], () => setGroupKey(null))}
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
          onCreateAlbum={() => needUnlock(() => setAlbumFor(trip))}
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
    if (showBlurry) {
      return <BlurryView t={t} photos={blurry} onBack={() => setShowBlurry(false)} onReview={(list: Photo[]) => startReview(reviewBlurry(list))} />;
    }
    if (showScreenshots) {
      return (
        <ScreenshotsView
          t={t} photos={shots} now={now} onBack={() => setShowScreenshots(false)}
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
            const reasons = new Map(reviewCleanup(groups, cleanupBlurry(blurry, kept), kept, byId, old).map(i => [i.id, i]));
            startReview(ids.map(id => reasons.get(id)).filter((i): i is ReviewItem => !!i));
          }}
          onDelete={ids => deletePhotos(ids, [], () => setShowQuickClean(false))}
        />
      );
    }
    if (showLarge) {
      return (
        <LargeView
          t={t} photos={large} canCompress
          onBack={() => setShowLarge(false)}
          onReview={(list: Photo[]) => startReview(reviewLarge(list))}
          onCompress={p => needUnlock(() => { void compress(p); })}
          onDelete={p => deletePhotos([p.id])}
        />
      );
    }
    if (showUtility) {
      return (
        <UtilityView
          t={t} photos={utility} progress={aiSeen} onBack={() => setShowUtility(false)}
          onReview={(list: Photo[]) => startReview(reviewUtility(list))}
        />
      );
    }
    if (showLive) {
      return <LiveView t={t} photos={live} onBack={() => setShowLive(false)} onConvert={list => needUnlock(() => setLiveConfirm(list))} />;
    }
    if (showCleanup && summary) {
      return (
        <CleanupView
          t={t} summary={summary} onBack={() => setShowCleanup(false)}
          onDuplicates={() => setShowDuplicates(true)}
          onSimilar={() => setShowSimilar(true)} onBlurry={() => setShowBlurry(true)}
          onScreenshots={() => setShowScreenshots(true)}
          onUtility={() => setShowUtility(true)}
          onReviewAll={() => startReview(reviewCleanup(groups, cleanupBlurry(blurry, kept), kept, byId, old, utility))}
          onQuickClean={() => setShowQuickClean(true)}
        />
      );
    }
    if (category) {
      const c = cats.find(x => x.label === category);
      return <CategoryView t={t} label={category} photos={c?.photos ?? []} onBack={() => setCategory(null)} />;
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
          t={t} language={language} themeMode={store.themeMode} access={access} owned={store.owned} freeLeft={freeLeft(state.freeUsed)}
          debug={store.debug} dryRun={store.dryRun} storage={store.storage} freed={state.freed}
          reminder={store.reminder}
          onReminder={on => { void store.setReminder(on, t.reminderTitle, t.reminderBody).then(ok => { if (on && !ok) show(t.reminderDenied); }); }}
          onBack={() => setShowSettings(false)}
          onLanguage={store.setLanguage} onTheme={store.setThemeMode}
          onAddPhotos={addPhotos}
          onOpenSettings={() => { void PhotoLibrary.openSettings(); }}
          onRescan={() => { store.startScan(); setShowSettings(false); }}
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
          t={t} access={access}
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
    return (
      <HomeView
        t={t} access={access} photoCount={photos ? photos.length : null} scan={store.scan}
        trips={trips} hasLocations={hasLocations} summary={summary}
        groupCount={similarGroups.length} duplicateCount={dupGroups.length}
        blurryCount={blurry.length} screenshotCount={shots.length}
        large={{ count: large.length, bytes: large.reduce((sum, p) => sum + p.bytes, 0) }} liveCount={isAndroid() ? 0 : live.length}
        utility={{ show: aiSeen.seen > 0, count: utility.length, bytes: utility.reduce((sum, p) => sum + p.bytes, 0) }}
        categories={cats.slice(0, 8).map(c => ({ label: c.label, count: c.photos.length, cover: c.photos[0].id }))}
        storage={store.storage} freedBytes={state.freed.bytes} streak={streak(state.days, now)}
        months={{ done: months.filter(m => doneMonths.has(m.key)).length, total: months.length }}
        onThisDay={{ photos: today.ids.length, years: today.years, cover: today.ids[0] }}
        onSettings={() => setShowSettings(true)}
        onRescan={store.startScan}
        onAddPhotos={addPhotos}
        onCleanup={() => setShowCleanup(true)}
        onSimilar={() => setShowSimilar(true)}
        onBlurry={() => setShowBlurry(true)}
        onDuplicates={() => setShowDuplicates(true)}
        onScreenshots={() => setShowScreenshots(true)}
        onMonths={() => setShowMonths(true)}
        onLarge={() => setShowLarge(true)}
        onLive={() => setShowLive(true)}
        onUtility={() => setShowUtility(true)}
        onCategory={setCategory}
        onOnThisDay={() => startReview(reviewTrip(today.ids, groups, byId, kept))}
        onTrips={() => setShowTrips(true)}
        onTrip={setTripKey}
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
        key={screen}
        initial={dir === 0 ? false : dir === 1 ? { x: `${100 * rtl}%` } : { x: `${-30 * rtl}%`, opacity: 0.6 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
      >
        {content()}
      </motion.div>

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

      <Sheet open={!!compressing} title={t.compressing} closeLabel={t.close} onClose={() => {}}>
        <div className="space-y-3 pb-2">
          <p className="text-label text-fg-mute">{t.compressing}</p>
          <Progress value={compressing?.progress ?? null} label={t.compressing} />
        </div>
      </Sheet>

      <Toast toast={toast} onDone={hide} raised={['trip', 'group', 'blurry', 'screenshots', 'utility', 'quickClean', 'large', 'live', 'cleanup', 'review'].includes(screen)} />
    </div>
  );
}
