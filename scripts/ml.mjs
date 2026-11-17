// Runs a Python tool of ml/ with ml/'s own Python: ml/.venv when it is there
// (no need to activate it), else python3. When a module the tool needs is
// missing, it says how to set ml/.venv up instead of a traceback.
//   node scripts/ml.mjs eval_groups.py [args …]
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [tool, ...args] = process.argv.slice(2);
if (!tool) {
  console.error('Usage: node scripts/ml.mjs <tool.py> [args …]');
  process.exit(2);
}
const venv = path.join(root, 'ml', '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
const python = fs.existsSync(venv) ? venv : 'python3';

// What each tool needs beyond the standard library (the light set is enough
// for measuring and the demo; the export and the text vectors need torch).
const LIGHT = ['numpy', 'onnxruntime', 'PIL'];
const FULL = [...LIGHT, 'torch', 'transformers', 'yaml'];
const needs = { 'export.py': FULL, 'labels.py': FULL, 'words.py': FULL, 'compact.py': LIGHT, 'fixtures.py': LIGHT, 'faces.py': LIGHT };
const want = needs[tool] ?? LIGHT;

const probe = spawnSync(python, ['-c', `
import importlib.util, sys
missing = [m for m in sys.argv[1:] if importlib.util.find_spec(m) is None]
print(' '.join(missing))
`, ...want], { encoding: 'utf8' });
if (probe.error) {
  console.error(`No Python found (${python}). Install Python 3 (python.org or Homebrew), then see below.`);
}
const missing = (probe.stdout ?? '').trim();
if (probe.error || missing) {
  const full = want === FULL;
  if (missing) console.error(`ml/${tool} needs Python modules that ${python === 'python3' ? 'python3' : 'ml/.venv'} doesn't have: ${missing}.`);
  console.error(`
Set up ml/'s Python once (it stays in ml/.venv, gitignored; npm run ai:* finds it by itself):

  python3 -m venv ml/.venv
${full
    ? `  ml/.venv/bin/pip install --index-url https://download.pytorch.org/whl/cpu torch==2.15.0
  ml/.venv/bin/pip install -r ml/requirements.txt`
    : `  ml/.venv/bin/pip install -r ml/requirements-light.txt

(Enough for ai:eval, ai:eval-groups and ai:demo. The model export and the
labels need the full ml/requirements.txt with torch — see its first lines.)`}
`);
  process.exit(1);
}

const run = spawnSync(python, [path.join('ml', tool), ...args], { cwd: root, stdio: 'inherit' });
process.exit(run.status ?? 1);
