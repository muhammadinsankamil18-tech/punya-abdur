#!/usr/bin/env node
// Local preview: builds dist/, serves it, and rebuilds whenever you save
// directory.json (or any other source file). Switch back to the browser tab and
// the page picks up the new data on focus, no reload needed.
//
//   npm run dev            → http://localhost:3000
//   PORT=4000 npm run dev

import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { build, ROOT, DIST, FILES, DATA_FILE } from './build.mjs';
import { summary } from './validate-data.mjs';

const PORT = Number(process.env.PORT) || 3000;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.otf': 'font/otf', '.svg': 'image/svg+xml', '.png': 'image/png',
};
const WATCHED = new Set([DATA_FILE, ...Object.keys(FILES)]);

function rebuild(clean) {
  const t = Date.now();
  const r = build({ clean, quiet: true });
  const stamp = new Date().toLocaleTimeString();
  if (r.ok) {
    console.log(`[${stamp}] ✔ rebuilt in ${Date.now() - t}ms: ${summary(r.data)}`);
    for (const w of r.warnings) console.log(`    ⚠ ${w}`);
  } else {
    console.error(`[${stamp}] ✖ not rebuilt, still serving the last good version:`);
    for (const e of r.errors) console.error(`    • ${e}`);
  }
  return r.ok;
}

if (!rebuild(true) && !fs.existsSync(path.join(DIST, 'index.html'))) {
  console.error('\nFix the problems above, then run npm run dev again.');
  process.exit(1);
}

let timer = null;
fs.watch(ROOT, (_event, name) => {
  if (!name || !WATCHED.has(String(name))) return; // ignore dist/ and anything else
  clearTimeout(timer); timer = setTimeout(() => rebuild(false), 150);
});

http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const file = path.join(DIST, path.normalize(p));
  if (!file.startsWith(DIST)) { res.writeHead(403).end(); return; }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(buf);
  });
}).listen(PORT, () => {
  console.log(`\n  Figma Directory → http://localhost:${PORT}`);
  console.log(`  Editor          → http://localhost:${PORT}/?edit\n`);
  console.log(`  Watching ${DATA_FILE} and the other source files for changes…\n`);
});
