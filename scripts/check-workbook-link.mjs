#!/usr/bin/env node
/**
 * Nobody is handed a download link that has already expired.
 *
 * ── THE PROMISE ───────────────────────────────────────────────────────────
 * The workbook file lives in Supabase storage behind a signed URL. Every
 * surface that offers it either mints a fresh signature or checks the stored
 * one is still live first. A dead link never reaches a reader.
 *
 * ── THE BUG IT CAME FROM ──────────────────────────────────────────────────
 * api/store-workbook.js signs the URL for seven days and writes it onto the
 * order. Both surfaces then handed that stored string over forever:
 * /api/tool-data gave it to the app, and the website's download button read it
 * out of the cached order and set it as an anchor's href with target=_blank.
 *
 * A signature that expired six months ago is still a URL. Nothing checks it,
 * the click opens a new tab, storage answers 400, and the customer sees an
 * error page with no way to tell that from a slow download. Most couples come
 * back more than a week after buying, so most of them would have hit it.
 *
 * ── HOW IT IS CHECKED ─────────────────────────────────────────────────────
 * By running the expiry test over real token shapes, and by reading the two
 * surfaces to confirm neither uses a stored URL without either minting a new
 * one or testing the old one first.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Whether storage accepts the signature, which only storage can say. This is
 * about not offering one that is spent on its face.
 */

import { readFileSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname;
const { signedUrlIsLive } = await import(`${ROOT}api/_lib/workbook-link.js`);
const read = (f) => readFileSync(`${ROOT}${f}`, 'utf8');
const problems = [];

// ── 1. The expiry test itself ────────────────────────────────────────────────
const token = (exp) => ['e30', Buffer.from(JSON.stringify({ exp })).toString('base64url'), 'sig'].join('.');
const url = (exp) => `https://x.supabase.co/storage/v1/object/sign/workbooks/A/B.docx?token=${token(exp)}`;
const now = Math.floor(Date.now() / 1000);

const CASES = [
  ['a link good for another hour', url(now + 3600), true],
  ['a link that died a day ago', url(now - 86400), false],
  ['a link that died a second ago', url(now - 1), false],
  ['a URL with no token at all', 'https://x.supabase.co/storage/v1/object/public/workbooks/A/B.docx', false],
  ['a token that is not a JWT', 'https://x/y?token=not-a-jwt', false],
  // Three segments, so it gets as far as decoding, and the middle one is not
  // JSON. This is the case that reaches the catch, and the catch has to fail
  // towards regenerating rather than towards a broken download.
  ['a token whose payload is gibberish', 'https://x/y?token=aaa.%%%%.ccc', false],
  ['a payload with no exp in it', `https://x/y?token=aaa.${Buffer.from('{"iss":"x"}').toString('base64url')}.ccc`, false],
  ['nothing', null, false],
  ['a number', 42, false],
];
for (const [name, value, want] of CASES) {
  const got = signedUrlIsLive(value);
  if (got !== want) problems.push(`signedUrlIsLive said ${got} for ${name}; it has to say ${want}.`);
}

// ── 2. Neither surface hands over a stored URL unchecked ─────────────────────
const toolData = read('api/tool-data.js');
if (!/freshWorkbookUrl\(/.test(toolData)) {
  problems.push('api/tool-data.js does not mint a fresh link. It would be serving the one signed when the file was made.');
}
if (/url:\s*row\?\.workbook_url\s*\|\|\s*null/.test(toolData)) {
  problems.push('api/tool-data.js hands over the stored workbook_url directly again.');
}

// Only where the URL is handed to the reader. Asking whether a file exists is
// a different question from asking whether this link still opens it: one use
// of ord.workbookUrl is a presence test that skips regeneration, and a stale
// signature says nothing about whether the file is there.
const app = read('src/App.jsx');
for (const m of app.matchAll(/(\w+)\.href\s*=\s*([A-Za-z_$][\w$?.]*workbookUrl)/gi)) {
  const before = app.slice(Math.max(0, m.index - 700), m.index);
  if (!/signedUrlIsLive/.test(before)) {
    problems.push(`src/App.jsx sets ${m[1]}.href from ${m[2]} without checking the signature is still live.`);
  }
}
for (const m of app.matchAll(/window\.open\(\s*([A-Za-z_$][\w$?.]*workbookUrl)/gi)) {
  const before = app.slice(Math.max(0, m.index - 700), m.index);
  if (!/signedUrlIsLive/.test(before)) {
    problems.push(`src/App.jsx opens ${m[1]} without checking the signature is still live.`);
  }
}
if (!/signedUrlIsLive/.test(app)) {
  problems.push('src/App.jsx never checks a signed URL, so either the download moved or the check was dropped.');
}

if (problems.length) {
  console.error('[check-workbook-link] a workbook download can hand over a dead link:\n');
  for (const p of problems) console.error('  ' + p);
  process.exit(1);
}

console.log(`[check-workbook-link] ${CASES.length} link shapes judged correctly; both surfaces mint or verify before offering one.`);
