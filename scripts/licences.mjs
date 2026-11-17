// Builds src/licences.json: what Einstellungen › Über die App › Lizenzen
// lists — one row per open-source part the app ships, each opening its full
// licence text, as other apps do (Google's "Open source licences" screen,
// iOS acknowledgements).
//
// The npm packages come from the production dependency tree (`npm ls
// --omit=dev`), with the LICENSE file each one ships. The parts that are not
// npm packages — the native libraries, the AI model, the fonts, the city
// table — are listed below by hand. Shared texts (Apache 2.0, the OFL) are
// stored once.
//
// Run it again after adding or updating a dependency: `npm run licences`
// (src/licences.test.ts fails while a dependency or its version is missing).
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (...p) => fs.readFileSync(path.join(root, ...p), 'utf8');

/** A licence text for a phone screen: the hard line breaks of an 80-column file joined, paragraphs and list items kept. */
export function reflow(text) {
  const item = /^(\d+[.)]|\([a-z0-9]+\)|[a-z][.)]|[-*•])\s/i;
  return text.replace(/\r\n?/g, '\n').split(/\n\s*\n/).map(par => {
    const lines = par.split('\n').map(l => l.trim()).filter(Boolean);
    const out = [];
    for (const l of lines) {
      if (out.length && !item.test(l) && !/^-{3,}$/.test(l) && !/^-{3,}$/.test(out[out.length - 1])) out[out.length - 1] += ` ${l}`;
      else out.push(l);
    }
    return out.join('\n');
  }).filter(Boolean).join('\n\n');
}

const MIT = holder => `MIT License

Copyright (c) ${holder}

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.`;

// The shared texts: Apache 2.0 from TypeScript's LICENSE.txt (the plain licence), the OFL from the font's own file.
const ofl = read('src', 'assets', 'fonts', 'OFL.txt');
const texts = {
  'Apache-2.0': reflow(read('node_modules', 'typescript', 'LICENSE.txt')),
  'OFL-1.1': reflow(ofl.slice(ofl.indexOf('PREAMBLE'))),
  'CC-BY-4.0': 'Creative Commons Attribution 4.0 International (CC BY 4.0)\n\nYou may share and adapt the material for any purpose, even commercially, as long as you give appropriate credit, provide a link to the licence and indicate if changes were made.\n\nThe full licence: creativecommons.org/licenses/by/4.0/legalcode',
};

/** The parts that are not npm packages. `platforms` limits a part to the phones that ship it. */
const native = [
  { name: 'ONNX Runtime', version: '1.24.2', licence: 'MIT', text: MIT('Microsoft Corporation') },
  { name: 'SigLIP 2', licence: 'Apache-2.0', notice: 'google/siglip2-base-patch32-256 — Copyright 2025 Google LLC. Bildklar ships the image encoder, exported to ONNX and quantised to 8-bit weights, and label vectors made with the text encoder.', text: '@Apache-2.0' },
  { name: 'Figtree', licence: 'OFL-1.1', notice: 'Copyright 2022 The Figtree Project Authors (github.com/erikdkennedy/figtree)', text: '@OFL-1.1' },
  { name: 'GeoNames', licence: 'CC-BY-4.0', note: 'licenceGeo', text: '@CC-BY-4.0' },
  { name: 'AndroidX', licence: 'Apache-2.0', platforms: ['android'], notice: 'AppCompat, Core, CoordinatorLayout, ExifInterface, HeifWriter — Copyright The Android Open Source Project', text: '@Apache-2.0' },
  { name: 'Jetpack Media3', licence: 'Apache-2.0', platforms: ['android'], notice: 'Transformer, Common — Copyright The Android Open Source Project', text: '@Apache-2.0' },
  { name: 'Kotlin Standard Library', licence: 'Apache-2.0', platforms: ['android'], notice: 'Copyright 2010-2025 JetBrains s.r.o. and Kotlin Programming Language contributors', text: '@Apache-2.0' },
];

/** The production npm tree: every package that ends up in the app. */
function npmPackages() {
  const tree = JSON.parse(execFileSync('npm', ['ls', '--omit=dev', '--all', '--json'], { cwd: root, encoding: 'utf8' }));
  const seen = new Map();
  const walk = deps => {
    for (const [name, d] of Object.entries(deps ?? {})) {
      if (!d.version || seen.has(name)) continue;
      seen.set(name, d.version);
      walk(d.dependencies);
    }
  };
  walk(tree.dependencies);
  return [...seen].map(([name, version]) => {
    const dir = path.join(root, 'node_modules', name);
    const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
    const file = fs.readdirSync(dir).find(f => /^licen[cs]e(\.(md|txt))?$/i.test(f));
    if (!file) throw new Error(`${name} ships no LICENSE file`);
    const platforms = name === '@capacitor/android' ? ['android'] : name === '@capacitor/ios' ? ['ios'] : undefined;
    return { name, version, licence: pkg.license, ...(platforms ? { platforms } : {}), text: reflow(fs.readFileSync(path.join(dir, file), 'utf8')) };
  });
}

const entries = [...npmPackages(), ...native].sort((a, b) => a.name.replace(/^@/, '').localeCompare(b.name.replace(/^@/, ''), 'en'));
for (const e of entries) if (e.text.startsWith('@') && !texts[e.text.slice(1)]) throw new Error(`${e.name}: no shared text ${e.text}`);
fs.writeFileSync(path.join(root, 'src', 'licences.json'), `${JSON.stringify({ texts, entries }, null, 1)}\n`);
console.log(`src/licences.json: ${entries.length} parts`);
