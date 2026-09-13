// Writes scripts/workbook_prose.json from api/_workbook-prose.js.
//
// The PDF builder is Python and cannot import JavaScript, so the prose both
// builders share is written out for it. Same arrangement as PKG_CAPS to
// public/_pkg-rules.js, and for the same reason: the alternative is two copies
// that agree until somebody edits one.
//
// Run before build. The result is committed, because Dockerfile.workbook
// copies the repo into the container and there is no build step in there.

import { writeFileSync, readFileSync } from 'fs';

import * as prose from '../api/_workbook-prose.js';

const OUT = new URL('./workbook_prose.json', import.meta.url).pathname;

const payload = Object.fromEntries(
  Object.keys(prose).sort().map((k) => [k, prose[k]]),
);

const text = JSON.stringify(payload, null, 1) + '\n';

if (text.length < 20000) {
  console.error(`[build-workbook-prose] result is ${text.length} bytes, which is too small to be the workbook prose.`);
  console.error('  Refusing to write: a truncated file here silently empties half the PDF.');
  process.exit(1);
}

const before = (() => { try { return readFileSync(OUT, 'utf8'); } catch { return ''; } })();
if (before === text) {
  console.log(`[build-workbook-prose] scripts/workbook_prose.json already current (${Object.keys(payload).length} blocks).`);
} else {
  writeFileSync(OUT, text);
  console.log(`[build-workbook-prose] scripts/workbook_prose.json written (${Object.keys(payload).length} blocks, ${text.length} bytes).`);
}
