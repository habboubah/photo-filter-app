import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import data from './licences.json';

const root = path.resolve(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')) as { dependencies: Record<string, string> };

describe('licences.json (npm run licences)', () => {
  it('lists every dependency at the installed version', () => {
    for (const name of Object.keys(pkg.dependencies)) {
      const installed = JSON.parse(fs.readFileSync(path.join(root, 'node_modules', name, 'package.json'), 'utf8')).version;
      expect(data.entries.find(e => e.name === name)?.version, `${name}: run npm run licences`).toBe(installed);
    }
  });
  it('has a text for every part', () => {
    for (const e of data.entries) {
      const text = e.text.startsWith('@') ? (data.texts as Record<string, string>)[e.text.slice(1)] : e.text;
      expect(text?.length ?? 0, e.name).toBeGreaterThan(200);
    }
  });
});
