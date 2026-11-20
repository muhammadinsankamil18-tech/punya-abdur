#!/usr/bin/env node
// Builds the site into dist/. Every source file sits in the repo root (no
// folders, so it can be uploaded straight through the GitHub website); this
// script puts each one where the page expects it.
//
//   npm run build   → validate directory.json, then write dist/
//   npm run check   → validate only
//
// If directory.json has a mistake the build fails with a readable message,
// so Vercel keeps serving the last good deploy instead of a broken page.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalize, summary } from './validate-data.mjs';

export const ROOT = path.dirname(fileURLToPath(import.meta.url));
export const DIST = path.join(ROOT, 'dist');
export const DATA_FILE = 'directory.json';

// source file (repo root) → path inside dist/
export const FILES = {
  'index.html': 'index.html',
  'xlsmart-tokens.css': 'assets/xlsmart-tokens.css',
  'xlsmart-ds.js': 'assets/xlsmart-ds.js',
  'dc-runtime.js': 'assets/dc-runtime.js',
  'react.production.min.js': 'assets/vendor/react.production.min.js',
  'react-dom.production.min.js': 'assets/vendor/react-dom.production.min.js',
  'XLSMARTSans-Regular.otf': 'assets/fonts/XLSMARTSans-Regular.otf',
  'XLSMARTSans-SemiBold.otf': 'assets/fonts/XLSMARTSans-SemiBold.otf',
};

function locate(text, err) {
  const m = /position (\d+)/.exec(err.message);
  if (!m) return '';
  const pos = Number(m[1]);
  const before = text.slice(0, pos);
  const line = before.split('\n').length;
  const col = pos - before.lastIndexOf('\n');
  const src = text.split('\n')[line - 1] || '';
  const where = /line \d+/.test(err.message) ? '' : ` (line ${line}, column ${col})`;
  return `${where}\n    ${src.trim()}`;
}

/** Read + validate directory.json. Returns { data, errors, warnings }. */
export function readData() {
  let text;
  try { text = fs.readFileSync(path.join(ROOT, DATA_FILE), 'utf8'); }
  catch { return { data: [], errors: [`${DATA_FILE} not found in the repo root`], warnings: [] }; }
  let raw;
  try { raw = JSON.parse(text); }
  catch (err) { return { data: [], errors: [`${DATA_FILE} is not valid JSON: ${err.message}${locate(text, err)}\n    Tip: look for a missing comma, or a trailing comma before ] or }.`], warnings: [] }; }
  return normalize(raw);
}

/** Build into dist/. `clean` wipes dist first (the dev server skips it on rebuilds). */
export function build({ clean = true, quiet = false } = {}) {
  const { data, errors, warnings } = readData();
  if (!quiet) for (const w of warnings) console.log(`  ⚠ ${w}`);
  if (errors.length) return { ok: false, errors, warnings };

  const missing = Object.keys(FILES).filter(f => !fs.existsSync(path.join(ROOT, f)));
  if (missing.length) return { ok: false, errors: missing.map(f => `${f} is missing from the repo root. Upload it again.`), warnings };

  if (clean) fs.rmSync(DIST, { recursive: true, force: true });
  for (const [src, dest] of Object.entries(FILES)) {
    const out = path.join(DIST, dest);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.copyFileSync(path.join(ROOT, src), out);
  }
  // Write to a temp file then rename, so a request mid-build never sees half a file.
  const out = path.join(DIST, 'data', 'directory.json');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out + '.tmp', JSON.stringify(data, null, 2) + '\n');
  fs.renameSync(out + '.tmp', out);
  return { ok: true, data, warnings };
}

// CLI
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const fail = errors => {
    console.error(`\n✖ Build stopped: ${errors.length} problem(s):\n`);
    for (const e of errors) console.error(`  • ${e}`);
    process.exit(1);
  };
  if (process.argv.includes('--check')) {
    const { data, errors, warnings } = readData();
    for (const w of warnings) console.log(`  ⚠ ${w}`);
    if (errors.length) fail(errors);
    console.log(`✔ ${DATA_FILE} is valid: ${summary(data)}`);
  } else {
    const r = build();
    if (!r.ok) fail(r.errors);
    console.log(`✔ Built dist/: ${summary(r.data)}`);
  }
}
