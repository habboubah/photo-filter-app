/**
 * One photo as the native side describes it (PhotoLibrary.getFacts). Keys are
 * short because 50,000 of them cross the bridge, 2,000 per call. Everything
 * after `shot` comes from the analysis of a small grey copy of the picture
 * (docs/PLAN.md, "Features") and is missing until the scan has reached the
 * photo — or for good, when no local copy exists (an iCloud-only original is
 * never downloaded).
 */
export interface Photo {
  /** The library's own id: PHAsset.localIdentifier on the iPhone, "<volume>:<_ID>" on Android. */
  id: string;
  /** When it was taken, ms since 1970. */
  t: number;
  /** Where, when the photo carries a location (Android only with ACCESS_MEDIA_LOCATION). */
  lat?: number;
  lon?: number;
  /** Size in bytes: exact on Android, estimated from the pixels on the iPhone (`exact` unset). */
  bytes: number;
  exact?: boolean;
  w: number;
  h: number;
  /** A favourite in the system's Photos / Gallery: never suggested for deleting. */
  fav?: boolean;
  /** A screenshot: left out of trips, similar groups and the blurry list. */
  shot?: boolean;
  /** A video (length `dur` in ms): left out of trips, similar groups and the blurry list; its hash is its poster frame's. */
  video?: boolean;
  dur?: number;
  /** A screen recording (a video): listed with the screenshots. */
  rec?: boolean;
  /** iPhone: a Live Photo — a still with a short video, which can be turned into a plain photo. */
  live?: boolean;
  /** iPhone: the burst this photo belongs to, and whether it is the burst's pick (by the user or by Photos). */
  burst?: string;
  pick?: boolean;
  /** Perceptual hash: 64-bit dHash as 16 hex digits. */
  hash?: string;
  /** Variance of the Laplacian on the grey image (long side 512 px): low = blurry. */
  sharp?: number;
  /** Standard deviation of the grey image: low = little to see (fog, a dark room). */
  contrast?: number;
  /** Mean brightness, 0–1. */
  expo?: number;
  /** Share of pixels that are pure black or pure white, 0–1. */
  clip?: number;
  /** iPhone only, asked for a similar group's photos (PhotoLibrary.scoreFaces): faces found, the best face's capture quality and how open its eyes are (0–1). */
  faces?: number;
  faceQ?: number;
  eyes?: number;
  /**
   * The on-device AI (docs/AI.md): each label's score, as logit × 10 rounded,
   * in src/logic/ai.ts LABELS order — worked out by the app from the photo's
   * compact vector (src/logic/ai.ts scoreLabels), not sent by the phone.
   * Missing until the scan's AI pass reached the photo, and for photos
   * without a local copy.
   */
  ai?: ArrayLike<number>;
  /**
   * The AI version of the photo's compact vector (src/logic/vectors.ts), when
   * the phone has one: the vector itself is fetched apart (PhotoLibrary.getVectors).
   */
  vv?: number;
  /** iPhone with iOS 18+: Vision's aesthetics score (−1 … 1) and its "utility photo" flag. */
  aes?: number;
  util?: boolean;
  /**
   * Scan schema 4 (17 November 2026). The original's file format (photos
   * only): what "Fotos verkleinern" may re-save (src/logic/compress.ts).
   */
  fmt?: PhotoFormat;
  /** iPhone: edited in Photos (re-saving would bake the edit in). Android can't tell (unset). */
  edited?: boolean;
  /** Android: the folder the file lies in (MediaStore RELATIVE_PATH, "DCIM/Camera/") — where it came from (src/logic/sources.ts). */
  dir?: string;
  /** Videos: their poster frame's embedding from the on-device AI, 768 int8 values in base64 (lookalike videos). */
  emb?: string;
}

export type PhotoFormat = 'jpeg' | 'heic' | 'png' | 'raw' | 'other';

/** How sure the app is that a photo is blurry. */
export type Confidence = 'high' | 'medium' | 'low';

/** A place on the map. */
export interface Point { lat: number; lon: number }

/** A trip as the app shows it: detected, then cut, joined, renamed or hidden by the user. */
export interface Trip {
  key: string;
  start: number;
  end: number;
  /** Every photo of the trip, in time order: the ones taken away from home and the ones without a location in between. */
  ids: string[];
  /** "Paris" — the place most of its photos were taken near, in the app's language. */
  place: string;
  /** "März 2026" / "März – April 2026". */
  dates: string;
  /** The user's own name, else "{place}, {dates}". */
  title: string;
  /** The name the app gave it (shown under a renamed trip). */
  autoTitle: string;
  ignored: boolean;
  /** Set once an album (iPhone) or folder (Android) was made from it. */
  album?: Album;
  bytes: number;
}

export interface Album {
  title: string;
  count: number;
  at: number;
}

/**
 * similar: near-identical shots taken within a short time; duplicate: the same picture again, however much later
 * (src/logic/similar.ts); lookalike: two videos of the same scene, taken within two hours (src/logic/lookalike.ts).
 */
export type GroupKind = 'similar' | 'duplicate' | 'lookalike';

/** Photos that show the same picture: a series of near-identical shots, or copies. */
export interface Group {
  key: string;
  kind: GroupKind;
  /** In time order. */
  ids: string[];
  /** The one the app would keep, or the user's pick. */
  best: string;
  /** The one the app would keep. */
  suggested: string;
  /** A duplicate group held together by a copy only the AI's vectors confirmed (src/logic/similar.ts): one to check. */
  weak?: boolean;
}

export interface CleanupSummary {
  similar: { count: number; bytes: number; groups: number };
  duplicates: { count: number; bytes: number; groups: number };
  /** Similar videos: the extra takes of lookalike videos and the copies of a video (`duplicates` is photos only). */
  lookalike: { count: number; bytes: number; groups: number };
  blurry: { count: number; bytes: number };
  /** Too dark or too bright (src/logic/exposure.ts), not already counted above. */
  exposure: { count: number; bytes: number };
  /** Screenshots older than OLD_SHOT_DAYS (src/logic/screenshots.ts). */
  screenshots: { count: number; bytes: number };
  /** Utility photos the on-device AI found (src/logic/ai.ts), not already counted above. */
  utility: { count: number; bytes: number };
  total: { count: number; bytes: number };
}

/** Free and total space on the phone, in bytes (PhotoLibrary.getStorage). */
export interface Storage { free: number; total: number }

export type ThemeMode = 'system' | 'light' | 'dark';
