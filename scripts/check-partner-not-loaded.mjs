#!/usr/bin/env node
/**
 * A partner the site has not heard about yet is not a partner who has not
 * finished.
 *
 * ── THE PROMISE ───────────────────────────────────────────────────────────
 * While the website is still fetching a partner's answers, every partner
 * status row that is not already Done reads "Not loaded yet", Ellie's words
 * (A167), rather than "Pending". `partnerSyncing` had been declared, set by
 * the poll, and read by nothing, so the two states rendered identically.
 *
 * ── WHAT IT HOLDS ─────────────────────────────────────────────────────────
 *   1. `partnerSyncing` starts true. Starting false shows "Pending" on the
 *      first paint, before the poll has even been sent.
 *   2. Nothing in a `catch` or `finally` of the poll clears it. A failed read
 *      says nothing about the partner, so it must not end the unknown state;
 *      a `finally` is how it was written before, and it cleared on failure.
 *   3. Every "Pending" a partner row can render is guarded by
 *      `partnerSyncing ?`, so a fourth row added with a bare "Pending" fails.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * The invited partner's "Waiting for" screen, which draws a hardcoded Pending
 * beside the buyer's name. That screen is only reached after the site has
 * established the buyer has not finished, so Pending there is a fact. It is
 * recognised by `!s.done &&` and named here so it is a decision, not a hole.
 * The app is out of scope: its partner status comes from /api/home already
 * computed, with no client-side fetch to be waiting on.
 */
import { readFileSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname;
const src = readFileSync(`${ROOT}src/App.jsx`, 'utf8');
const fail = [];

// Line comments and block comments out, so prose naming the bug cannot count.
const code = src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
  .split('\n').map((l) => l.replace(/(^|[^:'"`])\/\/.*$/, '$1')).join('\n');

// 1. starts true
if (!/const \[partnerSyncing, setPartnerSyncing\] = useState\(true\)/.test(code)) {
  fail.push('partnerSyncing does not start true, so the first paint says "Pending" before anything was asked.');
}

// 2. no clearing on failure. Find the poll and read its catch and finally.
const pollAt = code.indexOf("console.warn('[Attune] partner poll failed:'");
if (pollAt < 0) {
  fail.push('could not find the partner poll\'s catch. A gate that has lost its subject must not pass.');
} else {
  const tail = code.slice(pollAt - 200, pollAt + 400);
  const end = tail.indexOf('};');
  const block = tail.slice(0, end < 0 ? tail.length : end);
  if (/setPartnerSyncing\(\s*false\s*\)/.test(block) || /finally\s*\{[\s\S]*setPartnerSyncing/.test(block)) {
    fail.push('the partner poll clears partnerSyncing in its catch or finally, so a failed read reads as "not finished".');
  }
}

// 3. every Pending is guarded
const lines = code.split('\n');
let guarded = 0;
let exempt = 0;
lines.forEach((l, i) => {
  if (!/"Pending"|>Pending</.test(l)) return;
  if (/!s\.done &&/.test(l)) { exempt += 1; return; }
  if (/partnerSyncing\)?\s*\?\s*PARTNER_NOT_LOADED/.test(l)) { guarded += 1; return; }
  fail.push(`src/App.jsx:${i + 1} renders "Pending" with no partnerSyncing guard.`);
});
if (guarded < 3) fail.push(`only ${guarded} guarded partner rows found where there are three. The matcher has lost them.`);

if (fail.length) {
  console.error('check-partner-not-loaded FAILED');
  for (const f of fail) console.error('  - ' + f);
  process.exit(1);
}
console.log(`[check-partner-not-loaded] ${guarded} partner status rows say "Not loaded yet" until the server answers; `
  + `the flag starts true and a failed read does not clear it. ${exempt} exempt: the Waiting screen, where Pending is known.`);
