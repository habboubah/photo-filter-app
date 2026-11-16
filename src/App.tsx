import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { App as CapacitorApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { KeepAwake } from '@capacitor-community/keep-awake';
import { AlertTriangle, FlaskConical } from 'lucide-react';
import { useAppStore } from './store';
import { fmt, plural, stringsFor } from './translations';
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
  Decision, ReviewItem, Session, decide, keptAgainstSuggestion, reviewBlurry, reviewCleanup, reviewGroup, reviewTrip,
  startSession, undo,
} from './logic/review';
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
import { ReviewView } from './components/ReviewView';
import { PaywallSheet } from './components/PaywallSheet';
import { LicencesView, SettingsView } from './components/SettingsView';

interface Review { session: Session; finished: boolean }

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
  const summary = useMemo(() => (photos ? summarize(lib, groups, blurry, kept) : null), [photos, lib, groups, blurry, kept]);
  const hasLocations = useMemo(() => lib.photos.some(p => p.lat !== undefined), [lib]);

  /* ---------------------------------------------------------- navigation */

  const [showTrips, setShowTrips] = useState(false);
  const [tripKey, setTripKey] = useState<string | null>(null);
  const [showCleanup, setShowCleanup] = useState(false);
  const [showSimilar, setShowSimilar] = useState(false);
  const [similarShown, setSimilarShown] = useState(40);
  const [groupKey, setGroupKey] = useState<string | null>(null);
  const [showBlurry, setShowBlurry] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showLicences, setShowLicences] = useState(false);
  const [review, setReview] = useState<Review | null>(null);

  const trip = tripKey ? trips.find(x => x.key === tripKey) ?? null : null;
  const group = groupKey ? groups.find(g => g.key === groupKey) ?? null : null;

  const closeReview = () => {
    if (review) store.addKept(keptAgainstSuggestion(review.session));
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
    ['blurry', showBlurry, () => setShowBlurry(false)],
    ['cleanup', showCleanup, () => setShowCleanup(false)],
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
  const longScan = scan.running && (!scan.lastScanAt || (scan.phase === 'analyse' && scan.total - scan.done > 50));
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
  const afterUnlock = useRef<(() => void) | null>(null);
  const needUnlock = (then: () => void) => {
    if (store.owned) { then(); return; }
    afterUnlock.current = then;
    setPaywall(true);
  };
  const unlocked = () => {
    store.setOwned(true);
    setPaywall(false);
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
  const trash = async (ids: string[], keepIds: string[] = []): Promise<boolean> => {
    try {
      const r = await PhotoLibrary.trash({ ids, dryRun: store.dryRun });
      if (r.cancelled) { show(t.deleteCancelled); return false; }
      store.addKept(keepIds);
      if (r.dryRun) { show(fmt(t.dryRunDelete, { photos: plural(t, 'photos', ids.length) })); return true; }
      store.removePhotos(r.trashed);
      forgetThumbs(r.trashed);
      notifySuccess();
      show(plural(t, 'deleted', r.trashed.length));
      return true;
    } catch {
      show(t.deleteFailed);
      return false;
    }
  };
  const deletePhotos = (ids: string[], keepIds: string[] = [], after?: () => void) =>
    needUnlock(() => { void trash(ids, keepIds).then(ok => { if (ok) after?.(); }); });

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

  /* -------------------------------------------------------------- review */

  const startReview = (items: ReviewItem[]) => {
    if (items.length) setReview({ session: startSession(items), finished: false });
  };
  const onDecide = (d: Decision) => setReview(r => (r ? { ...r, session: decide(r.session, d) } : r));
  const onUndo = () => setReview(r => (r ? { session: undo(r.session), finished: false } : r));

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
          onDelete={ids => deletePhotos(ids, keptAgainstSuggestion(review.session), () => setReview(null))}
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
          t={t} groups={groups} byId={byId} kept={kept} shown={similarShown}
          onMore={() => setSimilarShown(n => n + 40)}
          onBack={() => setShowSimilar(false)} onOpen={setGroupKey}
        />
      );
    }
    if (showBlurry) {
      return <BlurryView t={t} photos={blurry} onBack={() => setShowBlurry(false)} onReview={(list: Photo[]) => startReview(reviewBlurry(list))} />;
    }
    if (showCleanup && summary) {
      return (
        <CleanupView
          t={t} summary={summary} onBack={() => setShowCleanup(false)}
          onSimilar={() => setShowSimilar(true)} onBlurry={() => setShowBlurry(true)}
          onReviewAll={() => startReview(reviewCleanup(groups, cleanupBlurry(blurry, kept), kept, byId))}
        />
      );
    }
    if (showTrips) return <TripsView t={t} trips={trips} onBack={() => setShowTrips(false)} onOpen={setTripKey} />;
    if (showSettings) {
      return (
        <SettingsView
          t={t} language={language} themeMode={store.themeMode} access={access} owned={store.owned}
          debug={store.debug} dryRun={store.dryRun}
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
        groupCount={groups.length} blurryCount={blurry.length}
        onSettings={() => setShowSettings(true)}
        onRescan={store.startScan}
        onAddPhotos={addPhotos}
        onCleanup={() => setShowCleanup(true)}
        onSimilar={() => setShowSimilar(true)}
        onBlurry={() => setShowBlurry(true)}
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

      <PaywallSheet t={t} open={paywall} onClose={() => { setPaywall(false); afterUnlock.current = null; }} onOwned={unlocked} toast={label => show(label)} />

      <Confirm
        open={!!albumFor}
        title={t.albumConfirmTitle}
        body={albumFor ? fmt(t.albumConfirmBody, { name: folderName(albumFor.title), photos: plural(t, 'photos', albumFor.ids.length) }) : ''}
        confirmLabel={t.createAlbum}
        cancelLabel={t.cancel}
        onConfirm={() => { if (albumFor) void makeAlbum(albumFor); }}
        onCancel={() => setAlbumFor(null)}
      />

      <Toast toast={toast} onDone={hide} raised={['trip', 'group', 'blurry', 'cleanup', 'review'].includes(screen)} />
    </div>
  );
}
