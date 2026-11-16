import { Capacitor } from '@capacitor/core';

/** In the iPhone or the Android app (not the web or PWA). */
export const isNative = () => Capacitor.isNativePlatform();
/** In the Android app — or, in development, a browser told to look like it (`fotonest-dev-platform`). */
export const isAndroid = () => Capacitor.getPlatform() === 'android' || devPlatform() === 'android';
/** In the iPhone app. */
export const isIos = () => Capacitor.getPlatform() === 'ios';

/**
 * Development only: localStorage `fotonest-dev-native` = "1" shows the
 * app-only settings rows (rating) in the browser, so the screen can be built
 * and captured. Production builds drop it.
 */
export function devNative(): boolean {
  if (!import.meta.env.DEV) return false;
  try { return localStorage.getItem('fotonest-dev-native') === '1'; } catch { return false; }
}

/**
 * Development and demo builds only: localStorage `fotonest-dev-platform` =
 * "android" gives the browser Android's wording (for `npm run screenshots --
 * --android`). Nothing native runs there; the app builds (`--mode native`) drop it.
 */
function devPlatform(): string | null {
  if (!import.meta.env.DEV && !__DEMO__) return null;
  try { return localStorage.getItem('fotonest-dev-platform'); } catch { return null; }
}
