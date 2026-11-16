import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import pkg from './package.json' with { type: 'json' };

/*
 * A Content-Security-Policy on production builds only (dev and HMR stay
 * untouched), as the shopping list ships it. `img-src 'self'` covers the
 * thumbnails: the native side writes them to the app's cache folder and the
 * web view loads them through Capacitor's own origin (capacitor://localhost/
 * _capacitor_file_/… on the iPhone, https://localhost/_capacitor_file_/… on
 * Android). `connect-src 'self'` keeps every request on the app's own origin
 * (the city table is fetched from the bundle); the privacy check enforces
 * that nothing else leaves.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "worker-src 'self'",
  "img-src 'self' data: blob:",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

const csp = {
  name: 'bildklar-csp',
  apply: 'build' as const,
  transformIndexHtml(html: string) {
    return {
      html,
      tags: [{
        tag: 'meta',
        attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP },
        injectTo: 'head-prepend' as const,
      }],
    };
  },
};

/*
 * Modes: the default build (and `npm run dev`) carries the demo library — the
 * fixture photos and their made-up metadata that stand in for the photo
 * library in a browser (the privacy check, the screenshots, the preview video,
 * the App Review rehearsal). `--mode native` (every build that goes into
 * ios/ or android/) drops it: __DEMO__ is false, the demo is never imported,
 * and its pictures are not even in the bundle.
 */
export default defineConfig(({ mode }) => ({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __DEMO__: JSON.stringify(mode !== 'native'),
  },
  plugins: [csp, react(), tailwindcss()],
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
  build: {
    // The demo photos are separate files, never inlined.
    assetsInlineLimit: 0,
  },
  test: {
    include: ['src/**/*.test.ts'],
  },
}));
