/**
 * One flat object per language. Every key must exist in every block — the
 * `Strings` type is derived from `de`, and `en` is checked against it, so a
 * missing key fails `npm run lint`. Placeholders are `{name}` and are filled
 * with `fmt()`; counts go through `plural()` (keys ending in _one / _other).
 *
 * To add a language: add a block. Set `dir: 'rtl'` for Arabic or Hebrew — the
 * layout uses logical spacing everywhere, so it mirrors itself.
 *
 * Strings that name the iPhone, Apple Photos or "Recently Deleted" have an
 * Android twin in `androidStrings` (laid over in the Android app).
 */
const de = {
  languageName: 'Deutsch',
  locale: 'de-DE',
  dir: 'ltr',

  appName: 'Fotonest',
  storeName: 'Fotonest – Fotos aufräumen',
  tagline: 'Reisen sortiert, Doppeltes und Unscharfes aufgeräumt',
  version: 'Version {v}',
  cancel: 'Abbrechen',
  done: 'Fertig',
  close: 'Schließen',
  back: 'Zurück',
  undo: 'Rückgängig',
  save: 'Sichern',
  settings: 'Einstellungen',
  loading: 'Einen Moment …',
  photos_one: '1 Foto',
  photos_other: '{n} Fotos',
  trips_one: '1 Reise',
  trips_other: '{n} Reisen',
  groups_one: '1 Gruppe',
  groups_other: '{n} Gruppen',

  // Permission
  permTitle: 'Bring Ordnung in deine Fotos',
  permBody: 'Fotonest findet deine Reisen, fast gleiche und unscharfe Fotos – direkt auf deinem iPhone.',
  permPoint1: 'Jede Reise wird mit einem Tipp zum Album',
  permPoint2: 'Doppelte und verwackelte Fotos finden und aufräumen',
  permPoint3: 'Alles bleibt auf deinem Gerät – kein Konto, keine Cloud',
  permAllow: 'Fotos freigeben',
  permHint: 'Du kannst auch nur ausgewählte Fotos freigeben und später mehr hinzufügen.',
  deniedTitle: 'Kein Zugriff auf deine Fotos',
  deniedBody: 'Ohne Zugriff kann Fotonest nichts finden. Erlaube den Zugriff in den Einstellungen – unter „Fotos“.',
  restrictedBody: 'Der Zugriff auf Fotos ist auf diesem Gerät eingeschränkt, zum Beispiel durch die Bildschirmzeit.',
  openSettings: 'Einstellungen öffnen',
  limitedBanner: 'Fotonest sieht nur die Fotos, die du ausgewählt hast.',
  addPhotos: 'Fotos auswählen',

  // Scan
  scanList: 'Fotos werden gezählt …',
  scanAnalyse: '{done} von {total} Fotos angesehen',
  scanFirstHint: 'Beim ersten Mal dauert es ein paar Minuten. Lass die App dabei offen.',
  scanTitle: 'Fotonest sieht sich deine Fotos an',
  rescan: 'Neu durchsuchen',
  scanUpdating: 'wird aktualisiert …',
  lastScan: 'Durchsucht {when}',
  emptyLibraryTitle: 'Keine Fotos gefunden',
  emptyLibraryBody: 'Sobald Fotos da sind, findet Fotonest Reisen, doppelte und unscharfe Bilder.',

  // Home
  homeTitle: 'Deine Fotos',
  cleanupCard: 'Platz, der frei werden kann',
  cleanupSimilar: 'Fast gleiche Fotos',
  cleanupBlurry: 'Unscharfe Fotos',
  cleanupButton: 'Aufräumen',
  cleanupNone: 'Alles aufgeräumt',
  cleanupNoneBody: 'Keine fast gleichen oder unscharfen Fotos gefunden.',
  tripsSection: 'Reisen',
  allTrips: 'Alle Reisen',
  noTrips: 'Noch keine Reisen gefunden',
  noTripsBody: 'Eine Reise sind Fotos, die mehr als 50 km von zu Hause und über mindestens sechs Stunden aufgenommen wurden.',
  noLocation: 'Deine Fotos haben keine Ortsangaben – so lassen sich keine Reisen erkennen.',
  similarTile: 'Fast gleiche',
  blurryTile: 'Unscharfe',
  openTrip: '{name} öffnen',

  // Trips
  tripsTitle: 'Reisen',
  ignoredSection: 'Ausgeblendet',
  tripMeta: '{photos} · {size}',
  autoName: 'Automatisch: {name}',
  albumBadge: 'Album erstellt',
  createAlbum: 'Album erstellen',
  albumExists: 'Album erstellt am {date}',
  createAgain: 'Noch einmal erstellen',
  reviewTrip: 'Fotos durchgehen',
  editTrip: 'Reise bearbeiten',
  rename: 'Umbenennen',
  split: 'In zwei Reisen teilen',
  merge: 'Mit einer anderen Reise zusammenführen',
  ignore: 'Ausblenden',
  unignore: 'Wieder einblenden',
  undoSplit: 'Teilung aufheben',
  undoMerge: 'Zusammenführung aufheben',
  renameTitle: 'Reise umbenennen',
  nameLabel: 'Name',
  useAutoName: 'Automatischen Namen verwenden',
  splitTitle: 'Reise teilen',
  splitBody: 'Wähle den Tag, an dem der zweite Teil beginnt.',
  splitDay: '{photos}',
  mergeTitle: 'Zusammenführen mit …',
  mergeBody: 'Wähle die Reise, die zu dieser gehört.',
  noMergeCandidates: 'Es gibt keine andere Reise.',
  tripIgnored: '„{name}“ ausgeblendet',
  tripSplit: 'Reise geteilt',
  tripsMerged: 'Reisen zusammengeführt',
  albumConfirmTitle: 'Album erstellen?',
  albumConfirmBody: 'In Apple Fotos entsteht das Album „{name}“ mit {photos}. Die Fotos selbst bleiben unverändert, nichts wird kopiert.',
  albumCreated: 'Album „{name}“ erstellt',
  albumCancelled: 'Abgebrochen – nichts wurde geändert.',
  albumFailed: 'Das Album konnte nicht erstellt werden.',
  dryRunAlbum: 'Probelauf: Das Album „{name}“ mit {photos} wäre erstellt worden.',

  // Similar
  similarTitle: 'Fast gleiche Fotos',
  similarIntro: 'Fotos, die kurz nacheinander fast gleich aufgenommen wurden. Fotonest schlägt jeweils das beste vor.',
  groupExtra: '{n} können weg',
  bestBadge: 'Bestes',
  pickHint: 'Tippe ein anderes Foto an, um es zu behalten.',
  makeBest: '{date} als bestes wählen',
  bestPicked: 'Wird behalten',
  deleteOthers: 'Die anderen löschen',
  reviewGroup: 'Durchgehen',
  noGroups: 'Keine fast gleichen Fotos',
  noGroupsBody: 'Fotonest hat keine Serien fast gleicher Fotos gefunden.',

  // Blurry
  blurryTitle: 'Unscharfe Fotos',
  blurryIntro: 'Fotonest misst die Schärfe jedes Fotos. Schau lieber selbst noch einmal hin, bevor du löschst.',
  levelHigh: 'Sehr wahrscheinlich unscharf',
  levelMedium: 'Wahrscheinlich unscharf',
  levelLow: 'Vielleicht unscharf',
  filterSure: 'Sicher',
  filterAll: 'Alle',
  noBlurry: 'Keine unscharfen Fotos',
  noBlurryBody: 'Alle angesehenen Fotos sind scharf genug.',
  reviewBlurry: 'Durchgehen',

  // Clean-up
  cleanupTitle: 'Aufräumen',
  cleanupIntro: 'Das hier könnte weg. Du entscheidest bei jedem Foto selbst – gelöscht wird erst, wenn du es bestätigst.',
  cleanupRowSub: '{photos} · {size}',
  reviewAll: 'Alle durchgehen',

  // Review
  reviewTitle: 'Durchgehen',
  reviewProgress: '{i} von {n}',
  keep: 'Behalten',
  delete: 'Löschen',
  markedDelete: 'Wird gelöscht',
  markedKeep: 'Wird behalten',
  suggestDelete: 'Vorschlag: löschen',
  suggestKeep: 'Vorschlag: behalten',
  reasonBest: 'Das beste Foto dieser Serie',
  reasonSimilar: 'Fast gleich wie ein anderes Foto',
  swipeHint: 'Wische nach links zum Löschen, nach rechts zum Behalten.',
  reviewDoneTitle: 'Durchgesehen',
  reviewDoneBody: 'Zum Löschen markiert: {photos} ({size}).',
  reviewNothing: 'Nichts zum Löschen markiert.',
  deleteN_one: '1 Foto löschen',
  deleteN_other: '{n} Fotos löschen',
  deleteHint: 'Sie kommen in „Zuletzt gelöscht“ – dort kannst du sie noch zurückholen.',
  deleted_one: '1 Foto gelöscht',
  deleted_other: '{n} Fotos gelöscht',
  deleteCancelled: 'Abgebrochen – nichts wurde gelöscht.',
  deleteFailed: 'Das Löschen hat nicht geklappt.',
  dryRunDelete: 'Probelauf: {photos} wären gelöscht worden.',
  finishReview: 'Beenden',
  sharpnessDebug: 'Schärfe {s} · Kontrast {c}',

  // Paywall
  paywallTitle: 'Fotonest freischalten',
  paywallBody: 'Durchsuchen und Ansehen ist kostenlos. Zum Aufräumen schaltest du Fotonest einmal frei:',
  paywallAlbums: 'Ein Album für jede Reise – mit einem Tipp',
  paywallDelete: 'Fast gleiche und unscharfe Fotos löschen',
  paywallOnce: 'Einmal zahlen – kein Abo',
  paywallPrivate: 'Alles bleibt auf deinem Gerät',
  buyFor: 'Für {price} freischalten',
  buyLoading: 'Preis wird geladen …',
  restore: 'Käufe wiederherstellen',
  paywallFoot: 'Einmaliger Kauf über deinen Apple-Account. Gilt auf allen deinen Geräten mit diesem Account.',
  storeUnavailable: 'Der Store ist gerade nicht erreichbar. Versuch es später noch einmal.',
  purchasePending: 'Der Kauf wartet noch auf eine Bestätigung.',
  purchaseFailed: 'Der Kauf hat nicht geklappt.',
  purchased: 'Danke! Fotonest ist freigeschaltet.',
  restoredOk: 'Dein Kauf ist wieder da.',
  restoredNone: 'Kein früherer Kauf gefunden.',

  // Settings
  photosSection: 'Fotos',
  accessRow: 'Zugriff',
  accessFull: 'Alle Fotos',
  accessLimited: 'Ausgewählte Fotos',
  accessNone: 'Kein Zugriff',
  manageAccess: 'Zugriff in den Einstellungen ändern',
  unlockSection: 'Vollversion',
  unlockRow: 'Fotonest freischalten',
  unlocked: 'Freigeschaltet – danke!',
  displaySection: 'Darstellung',
  language: 'Sprache',
  appearance: 'Erscheinungsbild',
  themeSystem: 'Wie das System',
  themeLight: 'Hell',
  themeDark: 'Dunkel',
  devSection: 'Nur in der Debug-Version',
  dryRun: 'Probelauf',
  dryRunSub: 'Nichts an der Mediathek wird geändert – die App zeigt nur, was sie getan hätte.',
  dryRunBanner: 'Probelauf – an deinen Fotos wird nichts geändert',
  aboutSection: 'Über die App',
  rate: 'Fotonest bewerten',
  feedback: 'Feedback senden',
  feedbackSub: 'Per Mail, mit App- und Systemversion – sonst nichts',
  feedbackSubject: 'Fotonest – Feedback',
  feedbackInfo: 'Fotonest {version} · {system}',
  privacy: 'Datenschutz',
  licences: 'Lizenzen',
  resetSection: 'Zurücksetzen',
  resetDecisions: 'Meine Entscheidungen zurücksetzen',
  resetTitle: 'Entscheidungen zurücksetzen?',
  resetBody: 'Umbenannte, geteilte, zusammengeführte und ausgeblendete Reisen, gewählte beste Fotos und behaltene Fotos werden vergessen. Deine Fotos und Alben bleiben, wie sie sind.',
  resetDone: 'Zurückgesetzt',
  licencesTitle: 'Lizenzen',
  licencesIntro: 'Fotonest steht auf den Schultern anderer. Danke!',
  licenceGeo: 'Ortsnamen: GeoNames (geonames.org), Lizenz CC BY 4.0. Die Liste ist in der App gespeichert – Fotonest fragt keinen Server.',
  licenceFonts: 'Schriften: Fraunces und Figtree, SIL Open Font License 1.1.',
  licenceIcons: 'Symbole: Lucide, ISC-Lizenz.',
  licenceCode: 'React, Capacitor, Motion: MIT-Lizenz.',

  crashTitle: 'Etwas ist schiefgelaufen',
  crashBody: 'Deinen Fotos ist nichts passiert. Lade die App neu.',
  crashReload: 'Neu laden',
};

export type Strings = { [K in keyof typeof de]: string };

const en: Strings = {
  languageName: 'English',
  locale: 'en-GB',
  dir: 'ltr',

  appName: 'Fotonest',
  storeName: 'Fotonest – Photo Cleanup',
  tagline: 'Trips sorted, duplicates and blurry shots cleaned up',
  version: 'Version {v}',
  cancel: 'Cancel',
  done: 'Done',
  close: 'Close',
  back: 'Back',
  undo: 'Undo',
  save: 'Save',
  settings: 'Settings',
  loading: 'One moment …',
  photos_one: '1 photo',
  photos_other: '{n} photos',
  trips_one: '1 trip',
  trips_other: '{n} trips',
  groups_one: '1 group',
  groups_other: '{n} groups',

  permTitle: 'Bring order to your photos',
  permBody: 'Fotonest finds your trips, near-identical and blurry photos – right on your iPhone.',
  permPoint1: 'Turn every trip into an album with one tap',
  permPoint2: 'Find and clear out duplicate and shaky shots',
  permPoint3: 'Everything stays on your device – no account, no cloud',
  permAllow: 'Allow access to photos',
  permHint: 'You can also share only selected photos and add more later.',
  deniedTitle: 'No access to your photos',
  deniedBody: 'Without access Fotonest can’t find anything. Allow access in Settings – under “Photos”.',
  restrictedBody: 'Access to photos is restricted on this device, for example by Screen Time.',
  openSettings: 'Open Settings',
  limitedBanner: 'Fotonest only sees the photos you selected.',
  addPhotos: 'Select photos',

  scanList: 'Counting photos …',
  scanAnalyse: '{done} of {total} photos looked at',
  scanFirstHint: 'The first time takes a few minutes. Keep the app open meanwhile.',
  scanTitle: 'Fotonest is looking at your photos',
  rescan: 'Scan again',
  scanUpdating: 'updating …',
  lastScan: 'Scanned {when}',
  emptyLibraryTitle: 'No photos found',
  emptyLibraryBody: 'Once there are photos, Fotonest finds trips, duplicates and blurry shots.',

  homeTitle: 'Your photos',
  cleanupCard: 'Space you could free up',
  cleanupSimilar: 'Near-identical photos',
  cleanupBlurry: 'Blurry photos',
  cleanupButton: 'Clean up',
  cleanupNone: 'All tidy',
  cleanupNoneBody: 'No near-identical or blurry photos found.',
  tripsSection: 'Trips',
  allTrips: 'All trips',
  noTrips: 'No trips found yet',
  noTripsBody: 'A trip is photos taken more than 50 km from home over at least six hours.',
  noLocation: 'Your photos carry no location – trips can’t be found without it.',
  similarTile: 'Near-identical',
  blurryTile: 'Blurry',
  openTrip: 'Open {name}',

  tripsTitle: 'Trips',
  ignoredSection: 'Hidden',
  tripMeta: '{photos} · {size}',
  autoName: 'Automatic: {name}',
  albumBadge: 'Album made',
  createAlbum: 'Create album',
  albumExists: 'Album made on {date}',
  createAgain: 'Create it again',
  reviewTrip: 'Go through the photos',
  editTrip: 'Edit trip',
  rename: 'Rename',
  split: 'Split into two trips',
  merge: 'Join with another trip',
  ignore: 'Hide',
  unignore: 'Show again',
  undoSplit: 'Undo the split',
  undoMerge: 'Undo the join',
  renameTitle: 'Rename trip',
  nameLabel: 'Name',
  useAutoName: 'Use the automatic name',
  splitTitle: 'Split trip',
  splitBody: 'Pick the day the second part begins.',
  splitDay: '{photos}',
  mergeTitle: 'Join with …',
  mergeBody: 'Pick the trip that belongs to this one.',
  noMergeCandidates: 'There is no other trip.',
  tripIgnored: '“{name}” hidden',
  tripSplit: 'Trip split',
  tripsMerged: 'Trips joined',
  albumConfirmTitle: 'Create album?',
  albumConfirmBody: 'The album “{name}” with {photos} is created in Apple Photos. The photos themselves stay as they are; nothing is copied.',
  albumCreated: 'Album “{name}” created',
  albumCancelled: 'Cancelled – nothing was changed.',
  albumFailed: 'The album could not be created.',
  dryRunAlbum: 'Dry run: the album “{name}” with {photos} would have been created.',

  similarTitle: 'Near-identical photos',
  similarIntro: 'Photos taken moments apart that look almost the same. Fotonest suggests the best of each.',
  groupExtra: '{n} can go',
  bestBadge: 'Best',
  pickHint: 'Tap another photo to keep that one instead.',
  makeBest: 'Pick {date} as the best',
  bestPicked: 'Kept',
  deleteOthers: 'Delete the others',
  reviewGroup: 'Go through',
  noGroups: 'No near-identical photos',
  noGroupsBody: 'Fotonest found no series of near-identical photos.',

  blurryTitle: 'Blurry photos',
  blurryIntro: 'Fotonest measures how sharp each photo is. Have another look yourself before you delete.',
  levelHigh: 'Very likely blurry',
  levelMedium: 'Probably blurry',
  levelLow: 'Maybe blurry',
  filterSure: 'Sure',
  filterAll: 'All',
  noBlurry: 'No blurry photos',
  noBlurryBody: 'Every photo looked at is sharp enough.',
  reviewBlurry: 'Go through',

  cleanupTitle: 'Clean up',
  cleanupIntro: 'This could go. You decide for every photo – nothing is deleted until you confirm.',
  cleanupRowSub: '{photos} · {size}',
  reviewAll: 'Go through all',

  reviewTitle: 'Go through',
  reviewProgress: '{i} of {n}',
  keep: 'Keep',
  delete: 'Delete',
  markedDelete: 'Will be deleted',
  markedKeep: 'Will be kept',
  suggestDelete: 'Suggested: delete',
  suggestKeep: 'Suggested: keep',
  reasonBest: 'The best photo of this series',
  reasonSimilar: 'Almost the same as another photo',
  swipeHint: 'Swipe left to delete, right to keep.',
  reviewDoneTitle: 'All gone through',
  reviewDoneBody: 'Marked for deleting: {photos} ({size}).',
  reviewNothing: 'Nothing marked for deleting.',
  deleteN_one: 'Delete 1 photo',
  deleteN_other: 'Delete {n} photos',
  deleteHint: 'They go to “Recently Deleted” – you can still get them back from there.',
  deleted_one: '1 photo deleted',
  deleted_other: '{n} photos deleted',
  deleteCancelled: 'Cancelled – nothing was deleted.',
  deleteFailed: 'Deleting didn’t work.',
  dryRunDelete: 'Dry run: {photos} would have been deleted.',
  finishReview: 'Finish',
  sharpnessDebug: 'Sharpness {s} · contrast {c}',

  paywallTitle: 'Unlock Fotonest',
  paywallBody: 'Scanning and looking is free. To clean up, unlock Fotonest once:',
  paywallAlbums: 'An album for every trip – with one tap',
  paywallDelete: 'Delete near-identical and blurry photos',
  paywallOnce: 'Pay once – no subscription',
  paywallPrivate: 'Everything stays on your device',
  buyFor: 'Unlock for {price}',
  buyLoading: 'Loading the price …',
  restore: 'Restore purchases',
  paywallFoot: 'A one-time purchase with your Apple Account, valid on all your devices with it.',
  storeUnavailable: 'The store can’t be reached right now. Please try again later.',
  purchasePending: 'The purchase is waiting for approval.',
  purchaseFailed: 'The purchase didn’t go through.',
  purchased: 'Thank you! Fotonest is unlocked.',
  restoredOk: 'Your purchase is back.',
  restoredNone: 'No earlier purchase found.',

  photosSection: 'Photos',
  accessRow: 'Access',
  accessFull: 'All photos',
  accessLimited: 'Selected photos',
  accessNone: 'No access',
  manageAccess: 'Change access in Settings',
  unlockSection: 'Full version',
  unlockRow: 'Unlock Fotonest',
  unlocked: 'Unlocked – thank you!',
  displaySection: 'Display',
  language: 'Language',
  appearance: 'Appearance',
  themeSystem: 'Like the system',
  themeLight: 'Light',
  themeDark: 'Dark',
  devSection: 'Debug build only',
  dryRun: 'Dry run',
  dryRunSub: 'Nothing in the photo library is changed – the app only shows what it would have done.',
  dryRunBanner: 'Dry run – your photos are not changed',
  aboutSection: 'About',
  rate: 'Rate Fotonest',
  feedback: 'Send feedback',
  feedbackSub: 'By mail, with the app and system version – nothing else',
  feedbackSubject: 'Fotonest – feedback',
  feedbackInfo: 'Fotonest {version} · {system}',
  privacy: 'Privacy',
  licences: 'Licences',
  resetSection: 'Reset',
  resetDecisions: 'Reset my decisions',
  resetTitle: 'Reset your decisions?',
  resetBody: 'Renamed, split, joined and hidden trips, picked best photos and kept photos are forgotten. Your photos and albums stay as they are.',
  resetDone: 'Reset',
  licencesTitle: 'Licences',
  licencesIntro: 'Fotonest stands on the shoulders of others. Thank you!',
  licenceGeo: 'Place names: GeoNames (geonames.org), licence CC BY 4.0. The list is stored in the app – Fotonest asks no server.',
  licenceFonts: 'Fonts: Fraunces and Figtree, SIL Open Font License 1.1.',
  licenceIcons: 'Icons: Lucide, ISC licence.',
  licenceCode: 'React, Capacitor, Motion: MIT licence.',

  crashTitle: 'Something went wrong',
  crashBody: 'Your photos are fine. Reload the app.',
  crashReload: 'Reload',
};

const translations = { de, en } satisfies Record<string, Strings>;
export default translations;

/**
 * Android's wording: what the iPhone calls an album in Photos is a folder
 * here, "Recently Deleted" is the Trash, and the store is Google Play. Laid
 * over each language in the Android app only (`setPlatform`, called once in
 * main.tsx). A test fails when a string naming an Apple thing has no twin.
 */
export const androidStrings: Record<keyof typeof translations, Partial<Strings>> = {
  de: {
    permBody: 'Fotonest findet deine Reisen, fast gleiche und unscharfe Fotos – direkt auf deinem Handy.',
    permPoint1: 'Jede Reise kommt mit einem Tipp in einen eigenen Ordner',
    albumBadge: 'Ordner erstellt',
    createAlbum: 'Ordner erstellen',
    albumExists: 'Ordner erstellt am {date}',
    albumConfirmTitle: 'Ordner erstellen?',
    albumConfirmBody: 'Die {photos} werden in den Ordner „Pictures/Fotonest/{name}“ verschoben – Android fragt dich gleich um Erlaubnis. Die Fotos selbst werden nicht verändert, nichts wird kopiert.',
    albumCreated: 'Ordner „{name}“ erstellt',
    albumFailed: 'Der Ordner konnte nicht erstellt werden.',
    dryRunAlbum: 'Probelauf: {photos} wären in den Ordner „{name}“ verschoben worden.',
    paywallAlbums: 'Ein Ordner für jede Reise – mit einem Tipp',
    deleteHint: 'Sie kommen in den Papierkorb – dort kannst du sie noch zurückholen.',
    paywallFoot: 'Einmaliger Kauf über Google Play. Gilt auf allen deinen Geräten mit diesem Google-Konto.',
    deniedBody: 'Ohne Zugriff kann Fotonest nichts finden. Erlaube den Zugriff in den Einstellungen – unter „Berechtigungen › Fotos und Videos“.',
  },
  en: {
    permBody: 'Fotonest finds your trips, near-identical and blurry photos – right on your phone.',
    permPoint1: 'Move every trip into its own folder with one tap',
    albumBadge: 'Folder made',
    createAlbum: 'Create folder',
    albumExists: 'Folder made on {date}',
    albumConfirmTitle: 'Create folder?',
    albumConfirmBody: 'The {photos} are moved into the folder “Pictures/Fotonest/{name}” – Android asks for your permission next. The photos themselves are not changed; nothing is copied.',
    albumCreated: 'Folder “{name}” created',
    albumFailed: 'The folder could not be created.',
    dryRunAlbum: 'Dry run: {photos} would have been moved into the folder “{name}”.',
    paywallAlbums: 'A folder for every trip – with one tap',
    deleteHint: 'They go to the Trash – you can still get them back from there.',
    paywallFoot: 'A one-time purchase on Google Play, valid on all your devices with this Google Account.',
    deniedBody: 'Without access Fotonest can’t find anything. Allow access in Settings – under “Permissions › Photos and videos”.',
  },
};

let platform: 'android' | null = null;
const merged = new Map<string, Strings>();
/** Which app we run in, for `stringsFor`. Set once, before the first render. */
export function setPlatform(p: 'android' | null): void {
  platform = p;
  merged.clear();
}

/** A language's strings as this platform words them. Components get them as `t`. */
export function stringsFor(lang: keyof typeof translations): Strings {
  if (platform !== 'android') return translations[lang];
  let all = merged.get(lang);
  if (!all) { all = { ...translations[lang], ...androidStrings[lang] }; merged.set(lang, all); }
  return all;
}

export type Language = keyof typeof translations;
export const languages = Object.keys(translations) as Language[];
export const isLanguage = (v: unknown): v is Language =>
  typeof v === 'string' && (languages as string[]).includes(v);
export const DEFAULT_LANGUAGE: Language = 'de';

/** Fill `{name}` placeholders. */
export function fmt(s: string, vars: Record<string, string | number>): string {
  return s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

type PluralBase<T> = { [K in keyof T]: K extends `${infer B}_one` ? B : never }[keyof T];
const rules = new Map<string, Intl.PluralRules>();

/** "1 Foto" / "48.210 Fotos": a count in words, with the number in the app's locale. */
export function plural(t: Strings, base: PluralBase<Strings>, n: number, vars: Record<string, string | number> = {}): string {
  let r = rules.get(t.locale);
  if (!r) { r = new Intl.PluralRules(t.locale); rules.set(t.locale, r); }
  const key = (r.select(n) === 'one' ? `${base}_one` : `${base}_other`) as keyof Strings;
  return fmt(t[key], { n: num(t, n), ...vars });
}

/** A number in the app's locale: 48.210 / 48,210. */
export const num = (t: Strings, n: number) => n.toLocaleString(t.locale);

/** A size in the app's locale: "850 MB", "2,4 GB". */
export function bytes(t: Strings, b: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  let v = b;
  while (v >= 1000 && i < units.length - 1) { v /= 1000; i++; }
  const digits = v < 10 && i >= 2 ? 1 : 0;
  return `${v.toLocaleString(t.locale, { maximumFractionDigits: digits, minimumFractionDigits: digits })} ${units[i]}`;
}
