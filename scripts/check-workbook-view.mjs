#!/usr/bin/env node
/**
 * The app and the website hand the workbook page the same payload.
 *
 * ── WHY THIS GATE EXISTS ──────────────────────────────────────────────────
 * public/workbook-render.html is the workbook: one designed page, read by the
 * website when it prints a PDF and by the app when it opens one. It takes its
 * data from a query parameter, so every caller builds that object by hand, and
 * a caller that forgets a key does not fail. It renders a workbook with a
 * blank half.
 *
 * Ellie found the version of this that matters: the app had a workbook of its
 * own, built a different way, which "does not look like the workbook we render
 * on the site". One page fixed that. This keeps it fixed.
 *
 * ── WHAT IT CHECKS ────────────────────────────────────────────────────────
 * That the keys api/workbook-view.js sends, the keys src/App.jsx sends, and
 * the keys the page reads are the same set.
 *
 * ── WHAT IT DELIBERATELY DOES NOT ─────────────────────────────────────────
 * Whether the values are right. The page reading `scores` says nothing about
 * whether those are this couple's scores, and no scan can tell.
 */

import { readFileSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname;
const read = (p) => readFileSync(`${ROOT}${p}`, 'utf8');

/** The keys of the object a caller builds for the page. */
function keysOfPayload(source, marker) {
  const at = source.indexOf(marker);
  if (at === -1) return null;
  const open = source.indexOf('{', at);
  let depth = 0;
  let end = open;
  for (let i = open; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1;
    if (source[i] === '}') { depth -= 1; if (!depth) { end = i; break; } }
  }
  const body = source.slice(open + 1, end);
  /**
   * Top-level keys, found by walking rather than by line.
   *
   * The first version read one key per line, which is true of the endpoint and
   * not of the website, where the payload is written four keys to a line. It
   * reported five missing keys that were all there, which is the sort of gate
   * that gets switched off rather than read.
   */
  const keys = [];
  depth = 0;
  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i];
    if ('{[('.includes(ch)) { depth += 1; continue; }
    if ('}])'.includes(ch)) { depth -= 1; continue; }
    if (depth !== 0) continue;
    const m = /^([A-Za-z_]\w*)\s*:/.exec(body.slice(i));
    if (m && !/[\w.]/.test(body[i - 1] || '')) { keys.push(m[1]); i += m[0].length - 1; }
  }
  return keys;
}

const problems = [];

const fromApp = keysOfPayload(read('api/workbook-view.js'), '      data: {');
const fromSite = keysOfPayload(read('src/App.jsx'), 'const _data = encodeURIComponent(JSON.stringify({');
const page = read('public/workbook-render.html');
const readByPage = [...page.matchAll(/\bD\.([A-Za-z_]\w*)/g)].map((m) => m[1]);

if (!fromApp) problems.push('api/workbook-view.js no longer builds a `data` object for the page');
if (!fromSite) problems.push('src/App.jsx no longer builds a payload for /workbook-render');
if (!readByPage.length) problems.push('public/workbook-render.html reads nothing off its payload');

if (fromApp && fromSite && readByPage.length) {
  const wanted = new Set(readByPage);
  const missingFromApp = [...wanted].filter((k) => !fromApp.includes(k));
  const missingFromSite = [...wanted].filter((k) => !fromSite.includes(k));
  const unread = fromApp.filter((k) => !wanted.has(k));

  for (const k of missingFromApp) {
    problems.push(`the page reads D.${k} and api/workbook-view.js does not send it`);
  }
  for (const k of missingFromSite) {
    problems.push(`the page reads D.${k} and src/App.jsx does not send it`);
  }
  for (const k of unread) {
    problems.push(`api/workbook-view.js sends ${k} and the page never reads it`);
  }
}

if (problems.length) {
  console.error('[check-workbook-view] the workbook page is not being handed what it draws:');
  for (const p of problems) console.error(`  ${p}`);
  console.error('');
  console.error('One page draws the workbook on both surfaces. A caller that leaves a key');
  console.error('out does not fail; it renders a workbook with a blank half.');
  process.exit(1);
}

console.log(`[check-workbook-view] ${readByPage.length} payload keys, sent by both surfaces and read by the page.`);
