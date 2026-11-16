import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.habboubah.fotonest',
  appName: 'Fotonest',
  webDir: 'dist',
  plugins: {
    // Android draws edge to edge; index.html says viewport-fit=cover, and
    // telling Capacitor up front spares the first frame a jump.
    SystemBars: { initialViewportFitValueHint: 'cover' },
  },
  ios: {
    // The page paints its own background under the status bar (safe-top), so
    // the web view must run edge to edge rather than being inset by iOS.
    contentInset: 'never',
  },
};

export default config;
