#!/usr/bin/env node
/**
 * No page may frame a URL, because this site refuses to be framed.
 *
 * ── THE BUG ───────────────────────────────────────────────────────────────
 * vercel.json sends X-Frame-Options: DENY on every path. DENY, not
 * SAMEORIGIN: a page here cannot frame anything, including this site's own
 * endpoints. /email-preview loaded each email by pointing an iframe at
 * /api/email-preview?type=..., so the browser refused the frame and left the
 * panel empty under a working set of tabs. Nothing threw and nothing logged.
 * Ellie read it as "the preview page isn't working", which is exactly what it
 * was, and it was invisible from the code on either side: the page is right,
 * the endpoint is right, and the header between them is what says no.
 *
 * ── THE RULE ──────────────────────────────────────────────────────────────
 * While that header is DENY, a frame has to be filled rather than pointed:
 * fetch the markup and set srcdoc, which is not a navigation and is not
 * refused. So no page under public/ may give an iframe a src, or assign one.
 *
 * The header is checked too. If someone relaxes it to SAMEORIGIN this gate
 * should be revisited rather than quietly kept: it exists because of the
 * header, not instead of it.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Stripe's frames, which are created by Stripe's own script inside its
 * element, and which the CSP allows by name. Nothing in this repo writes them.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;

const vercel = JSON.parse(readFileSync(`${ROOT}vercel.json`, 'utf8'));
const xfo = (vercel.headers || [])
  .flatMap((h) => (h.headers || []).map((k) => ({ source: h.source, ...k })))
  .find((h) => h.key.toLowerCase() === 'x-frame-options');

if (!xfo) {
  console.error('[check-framed-pages] vercel.json no longer sends X-Frame-Options.');
  console.error('This gate exists because it is DENY. Decide what should replace it.');
  process.exit(1);
}
if (xfo.value.toUpperCase() !== 'DENY') {
  console.error(`[check-framed-pages] X-Frame-Options is now ${xfo.value}, not DENY.`);
  console.error('Framing by URL may be allowed again. Revisit this gate rather than deleting it.');
  process.exit(1);
}

/** Every html and js file a browser loads from public/. */
function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.')) continue;
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(html|js)$/.test(e.name)) out.push(p);
  }
  return out;
}

const problems = [];
for (const abs of walk(`${ROOT}public`)) {
  const rel = relative(ROOT, abs);
  const text = readFileSync(abs, 'utf8');
  text.split('\n').forEach((line, i) => {
    // <iframe ... src="..."> in markup, and .src = ... on a frame in script.
    // Both are a navigation, and both are refused.
    const markup = /<iframe\b[^>]*\bsrc\s*=/i.test(line);
    const script = /\b(iframe|frame|preview)\w*\.src\s*=/i.test(line);
    if (!markup && !script) return;
    if (/^\s*(\/\/|\*|<!--)/.test(line)) return;
    problems.push(`${rel}:${i + 1}  ${line.trim().slice(0, 110)}`);
  });
}

if (problems.length) {
  console.error('[check-framed-pages] a page points a frame at a URL, and the site refuses framed loads:');
  for (const p of problems) console.error(`  ${p}`);
  console.error('');
  console.error('X-Frame-Options is DENY for every path, so the frame will be empty and');
  console.error('nothing will say why. Fetch the markup and set srcdoc instead.');
  process.exit(1);
}

console.log('[check-framed-pages] X-Frame-Options is DENY and no page under public/ points a frame at a URL.');
