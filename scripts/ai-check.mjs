// The on-device AI's guardrails (docs/AI.md), part of `npm run check`:
//   - ai-assets/ is complete and consistent: the model, the compact vectors'
//     projection (the right size), vectors.json, the licences;
//   - the labels are the same, in the same order, in ml/labels.yaml,
//     src/logic/aiLabels.json and src/logic/ai.ts LABELS — Photo.ai is read
//     by position — and LABELS_VERSION agrees with aiLabels.json and ml/labels.py;
//   - AI_VERSION agrees in src/logic/ai.ts, vectors.json, the golden fixtures,
//     aiLabels.json, the search words, ImageEmbedder.swift and ImageEmbedder.kt;
//   - every label has its name in German and English;
//   - no Google ML library (ML Kit, MediaPipe, LiteRT from Play services,
//     Gemini Nano / AICore) or Firebase in the Android build files or the
//     iOS package list — they report to Google;
//   - the app's licence screen names the model and ONNX Runtime (src/licences.json).
// Usage: node --experimental-strip-types scripts/ai-check.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { AI_VERSION, LABELS, LABELS_VERSION } from '../src/logic/ai.ts';
import translations from '../src/translations.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
let failures = 0;
const report = (pass, msg) => { console.log(`  ${pass ? '✓' : '✗'} ${msg}`); if (!pass) failures += 1; };

console.log('AI check');

const assets = path.join(root, 'ai-assets');
const files = ['image.onnx', 'compact.bin', 'vectors.json', 'faces.onnx', 'LICENSES.md'];
const missing = files.filter(f => !fs.existsSync(path.join(assets, f)));
report(missing.length === 0, missing.length ? `ai-assets is missing ${missing.join(', ')}` : 'ai-assets has the model, the projection, the face detector and the licences');

const meta = JSON.parse(read('ai-assets/vectors.json'));
const labelFile = JSON.parse(read('src/logic/aiLabels.json'));
const words = JSON.parse(read('src/search/words.json'));
const ids = LABELS.map(l => l.id);
const yamlIds = [...read('ml/labels.yaml').matchAll(/^\s*- id: (\S+)/gm)].map(m => m[1]);
report(JSON.stringify(labelFile.labels.map(l => l.id)) === JSON.stringify(ids), 'aiLabels.json has src/logic/ai.ts LABELS, in order');
report(JSON.stringify(yamlIds) === JSON.stringify(ids), 'ml/labels.yaml has src/logic/ai.ts LABELS, in order');
report(labelFile.labels.every((l, i) => l.kind === LABELS[i]?.kind), 'the labels\' kinds agree');
const pyLabels = Number(/^LABELS_VERSION = (\d+)/m.exec(read('ml/labels.py'))?.[1]);
report(labelFile.labelsVersion === LABELS_VERSION && pyLabels === LABELS_VERSION,
  `LABELS_VERSION ${LABELS_VERSION} in src/logic/ai.ts, aiLabels.json (${labelFile.labelsVersion}) and ml/labels.py (${pyLabels})`);
report(labelFile.dim === meta.vecDim && labelFile.labels.every(l => Buffer.from(l.v, 'base64').length === meta.vecDim),
  `every label vector has ${meta.vecDim} numbers`);
report(words.concepts.length > 0 && words.concepts.every(c => Buffer.from(c.v, 'base64').length === meta.vecDim && c.de?.length && c.en?.length && c.ar?.length),
  `the search words: ${words.concepts.length} concepts, each with its vector and words in German, English and Arabic`);
const projBytes = fs.statSync(path.join(assets, 'compact.bin')).size;
report(projBytes === meta.vecDim * meta.dim * 2, `compact.bin holds ${meta.vecDim} × ${meta.dim} float16 (${projBytes} bytes)`);

const versions = {
  'src/logic/ai.ts': AI_VERSION,
  'vectors.json': meta.aiVersion,
  'fixtures/ai/expected.json': JSON.parse(read('fixtures/ai/expected.json')).aiVersion,
  'src/logic/aiLabels.json': labelFile.aiVersion,
  'src/search/words.json': words.aiVersion,
  'ImageEmbedder.swift': Number(/static let aiVersion = (\d+)/.exec(read('ios/App/App/ImageEmbedder.swift'))?.[1]),
  'ImageEmbedder.kt': Number(/const val AI_VERSION = (\d+)/.exec(read('android/app/src/main/java/com/habboubah/bildklar/ImageEmbedder.kt'))?.[1]),
};
const distinct = new Set(Object.values(versions));
report(distinct.size === 1, distinct.size === 1 ? `AI_VERSION ${AI_VERSION} everywhere` : `AI_VERSION differs: ${JSON.stringify(versions)}`);

for (const lang of Object.keys(translations)) {
  const block = translations[lang];
  const without = ids.filter(id => typeof block[`aiLabel_${id}`] !== 'string');
  report(without.length === 0, without.length ? `${lang}: no name for ${without.join(', ')}` : `${lang}: every label has a name`);
}

const BANNED = /(com\.google\.mlkit|com\.google\.mediapipe|play-services-(litert|tflite|mlkit)|com\.google\.android\.gms|aicore|firebase|google-ai-edge)/i;
const buildFiles = ['android/app/build.gradle', 'android/build.gradle', 'android/variables.gradle', 'android/app/capacitor.build.gradle'];
const resolved = [
  'ios/App/App.xcodeproj/project.xcworkspace/xcshareddata/swiftpm/Package.resolved',
  'ios/App/App.xcodeproj/project.pbxproj',
  'ios/App/CapApp-SPM/Package.swift',
  'ios/AIFeatures/Package.swift',
];
// Comment lines may name them ("No Firebase, no ML Kit"); only what is built counts.
const code = f => read(f).split('\n').filter(line => !/^\s*(\/\/|#|\*|\/\*)/.test(line)).join('\n');
const offenders = [...buildFiles, ...resolved].filter(f => fs.existsSync(path.join(root, f)) && BANNED.test(code(f)));
report(offenders.length === 0, offenders.length ? `a Google ML library or Firebase in ${offenders.join(', ')}` : 'no ML Kit, MediaPipe, Play-services ML, AICore or Firebase');

// The licence screen (Einstellungen › Lizenzen, src/components/LicencesView.tsx) lists src/licences.json:
// the model and its runtime must be there, on both phones.
const licences = JSON.parse(read('src/licences.json'));
const listed = name => licences.entries.some(e => e.name === name && !e.platforms);
report(/licences\.json/.test(read('src/components/LicencesView.tsx')) && listed('SigLIP 2') && listed('ONNX Runtime'),
  'the licence screen names the model and its runtime');

if (failures) {
  console.log(`\n${failures} AI check(s) failed`);
  process.exit(1);
}
