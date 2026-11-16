// Renders every icon and splash image from the one master, assets/icon.svg
// (three photos resting in a nest, on the app's teal), so the icon and the
// splash can't drift apart.
//
// What this writes:
//   assets/icon-source.png       1024  the picture, framed for iOS
//   assets/icon-only.png         1024  iOS (@capacitor/assets reads it)
//   assets/icon-foreground.png   1024  Android's adaptive icon: the picture smaller,
//                                      so the nest stays inside the circle a launcher may cut
//   assets/icon-background.png   1024  the teal behind it
//   assets/splash.png            2732  the icon as a tile on the app's day canvas
//   assets/splash-dark.png       2732  … on its night canvas
//   public/icon.png               256  the icon inside the app (permission screen, settings, paywall)
//   store/play-icon-512.png       512  Google Play's store icon (upload it in the Play Console)
//
// Usage:  node scripts/icon-assets.mjs && npm run assets:generate
// Change the canvas colours here (and in package.json's assets:generate) when
// --t-bg changes in src/index.css.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SVG = fs.readFileSync(path.join(root, 'assets', 'icon.svg'), 'utf8');
const TEAL = '#1C6B65';
const DAY = '#F7F3EC';
const NIGHT = '#121617';

const svgAt = (size, extra = '') => SVG.replace('<svg ', `<svg width="${size}" height="${size}" style="display:block;${extra}" `);

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 1 });
async function render(file, size, html) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<style>html,body{margin:0;width:${size}px;height:${size}px;overflow:hidden;background:transparent}</style>${html}`);
  fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
  await page.screenshot({ path: path.join(root, file) });
  console.log(`  ${file}  ${size} × ${size}`);
}
const centred = (inner, bg) => `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:${bg}">${inner}</div>`;
const tile = size => `<div style="width:${size}px;height:${size}px;border-radius:${Math.round(size * 0.2237)}px;overflow:hidden">${svgAt(size)}</div>`;

try {
  await render('assets/icon-source.png', 1024, svgAt(1024));
  await render('assets/icon-only.png', 1024, svgAt(1024));
  await render('assets/icon-foreground.png', 1024, centred(svgAt(800), TEAL));
  await render('assets/icon-background.png', 1024, `<div style="width:100%;height:100%;background:${TEAL}"></div>`);
  await render('assets/splash.png', 2732, centred(tile(560), DAY));
  await render('assets/splash-dark.png', 2732, centred(tile(560), NIGHT));
  await render('public/icon.png', 256, svgAt(256));
  await render('store/play-icon-512.png', 512, svgAt(512));
} finally {
  await browser.close();
}
console.log('\nNext: npm run assets:generate');
