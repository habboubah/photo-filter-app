#!/usr/bin/env node
/**
 * Contrast audit for the colour tokens in src/index.css ("Glass", iOS 27).
 *
 * In both themes it checks where text and glyphs meet a fill: the inks on
 * the page, on a card and on a fill; the accent as text on each of them and
 * on its own tint; the ink on the accent fill; keep (green), delete (red) and
 * blurry (amber) as text on their tints and as fills with their own ink; the
 * toast; the inks on the glass of the floating bars (over the page and over a
 * dark photo). For every tile hue it checks the hue's ink and plain text on
 * its tile, the hue's ink on a card, and the white glyph on the hue's solid
 * squircle (a settings icon tile).
 *
 * Text needs 4.5:1, icons 3:1 (WCAG 2.2 AA). `fg-faint` is not checked: it is
 * for placeholders and decoration only (CLAUDE.md, Accessibility). Values are
 * read from the CSS itself, so the audit follows every change; exit code 1 if
 * anything fails.
 *
 *   node scripts/contrast-audit.mjs          table of the worst case per row
 *   node scripts/contrast-audit.mjs --all    every check
 */
import { readFileSync } from 'node:fs';

const TEXT = 4.5;
const ICON = 3;
const verbose = process.argv.includes('--all');

const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

// Every innermost `selector { declarations }`; the selector is what follows
// the previous `;`, `{` or `}`.
const blocks = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, sel, body]) => ({
  sel: sel.split(';').pop().trim().replace(/\s+/g, ' '),
  vars: Object.fromEntries([...body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map(m => [m[1], m[2].trim()])),
}));
const block = test => {
  const b = blocks.find(x => test(x.sel));
  if (!b) throw new Error(`index.css: no block matching ${test}`);
  return b.vars;
};

const tokens = block(s => s === '@theme');
const themes = {
  light: block(s => s.includes('[data-theme="light"]')),
  dark: block(s => s.includes('[data-theme="dark"]')),
};
const hues = Object.keys(themes.light).flatMap(k => /^--t-([\w]+)-bg$/.exec(k)?.slice(1) ?? []);
if (!hues.length) throw new Error('index.css: no tile hues (--t-<hue>-bg)');

/* --------------------------------------------------------------- colour */

function resolve(value, scope, depth = 0) {
  if (depth > 10) throw new Error(`Circular var() in ${value}`);
  return value.replace(/var\((--[\w-]+)\)/g, (_, name) => {
    if (!(name in scope)) throw new Error(`Undefined ${name} (in ${value})`);
    return resolve(scope[name], scope, depth + 1);
  });
}

/** `#RRGGBB`, `rgb(r g b / a)` or `rgba(r, g, b, a)` → [r, g, b, a], channels 0–1. */
function parse(value) {
  const v = value.trim();
  let m = /^#([0-9a-f]{6})$/i.exec(v);
  if (m) return [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16) / 255).concat(1);
  m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*(?:[,/]\s*([\d.]+%?))?\s*\)$/i.exec(v);
  if (m) {
    const a = m[4] === undefined ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    return [+m[1] / 255, +m[2] / 255, +m[3] / 255, a];
  }
  throw new Error(`Cannot parse colour "${value}"`);
}

/** `top` painted over an opaque `bottom`. */
const over = (top, bottom) => [0, 1, 2].map(i => top[i] * top[3] + bottom[i] * (1 - top[3])).concat(1);
const lum = c => {
  const f = x => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
};
/** Contrast of `fg` (may be translucent) on the opaque `bg`. */
const ratio = (fg, bg) => {
  const a = lum(over(fg, bg));
  const b = lum(bg);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
};

/* --------------------------------------------------------------- checks */

const rows = [];
let failures = 0;

function audit(label, scope, list) {
  const color = name => parse(resolve(`var(${name})`, scope));
  const results = list(color).map(([what, fg, bg, need]) => ({ what, need, r: ratio(fg, bg) }));
  const bad = results.filter(x => x.r < x.need);
  failures += bad.length;
  const worst = results.reduce((a, b) => (b.r / b.need < a.r / a.need ? b : a));
  rows.push({ label, worst, bad, results });
}

const darkPhoto = parse('#202020');
const lightPhoto = parse('#d8d8d8');

for (const theme of ['light', 'dark']) {
  const scope = { ...tokens, ...themes[theme] };
  audit(`inks · ${theme}`, scope, c => {
    const bg = c('--t-bg');
    const surface = c('--t-surface');
    const fill = over(c('--t-surface-2'), surface);
    const fillOnPage = over(c('--t-surface-2'), bg);
    // The glass of a floating bar: its fill over the page, and over the darkest / lightest photo it may float on.
    const glassPage = over(c('--t-glass'), bg);
    const glassDark = over(c('--t-glass'), darkPhoto);
    const glassLight = over(c('--t-glass'), lightPhoto);
    return [
      ['text on page', c('--t-fg'), bg, TEXT],
      ['text on card', c('--t-fg'), surface, TEXT],
      ['text on fill', c('--t-fg'), fill, TEXT],
      ['text on a fill on the page', c('--t-fg'), fillOnPage, TEXT],
      ['mute text on page', c('--t-fg-mute'), bg, TEXT],
      ['mute text on card', c('--t-fg-mute'), surface, TEXT],
      ['mute text on fill', c('--t-fg-mute'), fill, TEXT],
      ['accent text on page', c('--t-accent'), bg, TEXT],
      ['accent text on card', c('--t-accent'), surface, TEXT],
      ['accent text on fill', c('--t-accent'), fill, TEXT],
      ['accent text on its tint (card)', c('--t-accent'), over(c('--t-accent-dim'), surface), TEXT],
      ['accent text on its tint (page)', c('--t-accent'), over(c('--t-accent-dim'), bg), TEXT],
      ['ink on accent fill', c('--t-accent-fill-ink'), c('--t-accent-fill'), TEXT],
      ['keep text on its tint (page)', c('--t-keep'), over(c('--t-keep-dim'), bg), TEXT],
      ['keep text on its tint (card)', c('--t-keep'), over(c('--t-keep-dim'), surface), TEXT],
      ['keep text on a card', c('--t-keep'), surface, TEXT],
      ['ink on the keep fill', c('--t-keep-ink'), c('--t-keep'), TEXT],
      ['delete text on page', c('--t-neg'), bg, TEXT],
      ['delete text on card', c('--t-neg'), surface, TEXT],
      ['delete text on its tint (page)', c('--t-neg'), over(c('--t-neg-dim'), bg), TEXT],
      ['delete text on its tint (card)', c('--t-neg'), over(c('--t-neg-dim'), surface), TEXT],
      ['ink on the delete fill', c('--t-neg-ink'), c('--t-neg'), TEXT],
      ['blurry text on its tint', c('--t-warn'), over(c('--t-warn-dim'), bg), TEXT],
      ['blurry dot on a card', c('--t-warn'), surface, ICON],
      ['white on the photo veil', c('--color-on-color'), over(c('--color-veil'), parse('#9a9a9a')), TEXT],
      ['white on a photo card\'s shade', c('--color-on-color'), over(c('--color-shade'), lightPhoto), TEXT],
      ['text on glass (page)', c('--t-fg'), glassPage, TEXT],
      ['text on glass (dark photo)', c('--t-fg'), glassDark, TEXT],
      ['text on glass (light photo)', c('--t-fg'), glassLight, TEXT],
      ['mute text on glass (page)', c('--t-fg-mute'), glassPage, TEXT],
      ['accent on glass (page)', c('--t-accent'), glassPage, TEXT],
      ['accent icon on glass (dark photo)', c('--t-accent'), glassDark, ICON],
    ];
  });
  audit(`hues · ${theme}`, scope, c =>
    hues.flatMap(h => [
      [`${h} ink on its tile`, c(`--t-${h}-ink`), c(`--t-${h}-bg`), TEXT],
      [`text on ${h} tile`, c('--t-fg'), c(`--t-${h}-bg`), TEXT],
      [`${h} ink on a card`, c(`--t-${h}-ink`), c('--t-surface'), TEXT],
      [`white glyph on ${h} squircle`, c('--color-on-color'), c(`--t-${h}-solid`), ICON],
    ]));
}

/* --------------------------------------------------------------- report */

const pad = (s, n) => String(s).padEnd(n);
console.log(`${pad('', 16)}${pad('worst', 8)}need  where`);
for (const { label, worst, bad, results } of rows) {
  console.log(`${pad(label, 16)}${pad(worst.r.toFixed(2), 8)}${pad(worst.need, 6)}${worst.what}${bad.length ? `   ✗ ${bad.length} failing` : ''}`);
  for (const x of verbose ? results : bad) {
    console.log(`  ${x.r < x.need ? '✗' : ' '} ${pad(x.r.toFixed(2), 6)} ${x.what} (needs ${x.need})`);
  }
}
console.log(failures
  ? `\n${failures} check(s) below the minimum contrast.`
  : `\nAll ${rows.reduce((n, r) => n + r.results.length, 0)} checks pass (2 themes, ${hues.length} hues).`);
process.exit(failures ? 1 : 0);
