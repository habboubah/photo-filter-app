import { Strings, fmt } from './translations';

/*
 * Where Einstellungen › Über die App leads. Each opens outside the app — the
 * store, Mail, the browser — and only when tapped; nothing is fetched. Every
 * URL here is on the privacy check's allowlist (scripts/privacy-check.mjs).
 */

/**
 * The app's Apple ID on the App Store (App Store Connect → the app → App
 * Information → Apple ID, a number). Empty until it is filled in: the iPhone
 * app then shows no "Fotonest bewerten" row instead of one that leads nowhere.
 */
export const APP_STORE_ID: string = '';
/** Opens the App Store's "write a review" page (works once the app is live). */
export const REVIEW_URL = APP_STORE_ID ? `https://apps.apple.com/app/id${APP_STORE_ID}?action=write-review` : '';
/** The app's page on Google Play: where Android users rate it. */
export const PLAY_URL = 'https://play.google.com/store/apps/details?id=com.habboubah.fotonest';
const PRIVACY_URL = 'https://habboubah.github.io/privacy-policy/fotonest/';
const PRIVACY_URL_DE = 'https://habboubah.github.io/privacy-policy/fotonest/de/';
/** The published privacy policy: German, and English for every other language. */
export const privacyUrl = (language: string) => (language === 'de' ? PRIVACY_URL_DE : PRIVACY_URL);
/** Where feedback goes: the support address the privacy policy gives. */
export const FEEDBACK_TO = 'ahmad.habboubah@gmail.com';

/** Where "App bewerten" leads on this platform, or null when there is nowhere yet. */
export function rateUrl(platform: 'ios' | 'android' | 'web'): string | null {
  if (platform === 'android') return PLAY_URL;
  if (platform === 'ios') return REVIEW_URL || null;
  return null;
}

/** "iOS 18.1" / "Android 15" from the user agent — all the app knows of the system. */
export function systemFromAgent(userAgent: string): string {
  const ios = /\bOS (\d+)_(\d+)(?:_(\d+))?\b/.exec(userAgent);
  if (ios && /iPhone|iPad|iPod/.test(userAgent)) return `iOS ${ios[1]}.${ios[2]}${ios[3] ? `.${ios[3]}` : ''}`;
  const android = /Android (\d+(?:\.\d+)*)/.exec(userAgent);
  if (android) return `Android ${android[1]}`;
  return /Mac OS X/.test(userAgent) ? 'macOS' : /Windows/.test(userAgent) ? 'Windows' : 'Web';
}

/**
 * The mail *Feedback senden* opens in the user's own mail app: a subject,
 * room to write, and the app's and the system's version — nothing else.
 * The app sends nothing; the user writes and sends it.
 */
export function feedbackMail(t: Strings, appVersion: string, system: string): string {
  const body = `\n\n\n— ${fmt(t.feedbackInfo, { version: appVersion, system })}`;
  return `mailto:${FEEDBACK_TO}?subject=${encodeURIComponent(t.feedbackSubject)}&body=${encodeURIComponent(body)}`;
}

/**
 * Open an address outside the app. Capacitor hands a new-window https link to
 * the system browser (Safari, Chrome) and a mailto: to the mail app, on the
 * iPhone and on Android alike; in a browser it is a new tab.
 */
export function openExternal(url: string): void {
  if (url.startsWith('mailto:')) window.location.href = url;
  else window.open(url, '_blank', 'noopener');
}
