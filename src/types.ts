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
}

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

/** Near-identical photos taken within a short time. */
export interface Group {
  key: string;
  /** In time order. */
  ids: string[];
  /** The one the app would keep, or the user's pick. */
  best: string;
  /** The one the app would keep. */
  suggested: string;
}

export interface CleanupSummary {
  similar: { count: number; bytes: number; groups: number };
  blurry: { count: number; bytes: number };
  total: { count: number; bytes: number };
}

export type ThemeMode = 'system' | 'light' | 'dark';
