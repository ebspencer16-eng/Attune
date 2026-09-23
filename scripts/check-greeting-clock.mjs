// Fails the build when the greeting is picked from the wrong clock.
//
// ── WHAT HAPPENED ──────────────────────────────────────────────────────────
// Ellie, at noon: "it's noon right now and showing me 'good evening'."
//
// /api/home runs on the edge runtime, where the server's clock is UTC, and
// greeting() read it with getHours(). Noon in Mountain Time is 18:00 UTC,
// the first hour of "Good evening". The greeting was right for a server
// nobody lives on, and it had been wrong for every reader outside UTC since
// it was written.
//
// It is the same shape as every unit bug here: a number crossing a boundary
// whose name does not say what it is measured against. An instant has no
// hour until you say whose.
//
// ── WHAT THIS CHECKS ───────────────────────────────────────────────────────
// Three things, because the fix has three parts and any one of them going
// missing brings the bug back silently:
//
//   1. greeting() reads the hour off a shifted clock, never getHours().
//   2. the endpoint passes an offset in.
//   3. the app sends one.
//
// And then it runs the thing: six times of day in two zones, checked against
// what a person in that zone would say.

import { readFileSync } from 'fs';
import { greeting } from '../api/_lib/next-action.js';

const ROOT = new URL('..', import.meta.url).pathname;
const problems = [];

const lib = readFileSync(ROOT + 'api/_lib/next-action.js', 'utf8');
const endpoint = readFileSync(ROOT + 'api/home.js', 'utf8');
const client = readFileSync(ROOT + 'attune-app/src/api/client.ts', 'utf8');

// 1. The local hour, not the server's.
const fn = lib.slice(lib.indexOf('export function greeting'));
const body = fn.slice(0, fn.indexOf('\n}'));
if (/\.getHours\s*\(/.test(body)) {
  problems.push(
    'greeting() reads .getHours(), which is the hour of whatever machine runs it.\n'
    + '      On the edge runtime that is UTC. Shift by the caller\'s offset and read\n'
    + '      .getUTCHours() instead.');
}
if (!/tzOffsetMinutes/.test(body)) {
  problems.push('greeting() takes no timezone offset, so it cannot know whose morning it is.');
}

// 2. The endpoint has to pass one.
if (!/tzOffsetMinutes\s*:/.test(endpoint)) {
  problems.push('api/home.js calls greeting() without passing an offset.');
}
if (!/searchParams\.get\(['"]tzOffset['"]\)/.test(endpoint)) {
  problems.push('api/home.js never reads tzOffset off the request.');
}

/**
 * 3. The app has to send one.
 *
 * Through whatever fetchHome calls, not only from inside fetchHome itself.
 * This read the body of `export function fetchHome` and nothing else, so the
 * day the request was moved into a helper behind a single-flight window, the
 * offset was still being sent on every call and this reported that it was not.
 *
 * A gate matching on a literal name is blind to anything reached through one
 * more hop, which is what the rest of this repo is built out of. So the
 * function's own body is read, and so is the body of anything it calls that is
 * declared in the same file.
 *
 * Comments are stripped first. The doc comment above the call explains what
 * getTimezoneOffset() returns, so a version of this that read the raw text
 * passed a plant that replaced the call with a constant: it was matching the
 * sentence describing the code rather than the code. check-fonts.mjs was
 * reading its own documentation the same way once.
 */
const stripComments = (t) => t.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^\s*\/\/.*$/gm, ' ');
const fnBody = (name) => {
  const at = client.search(new RegExp(`(?:export\\s+)?function ${name}\\b`));
  if (at < 0) return '';
  const rest = client.slice(at);
  const end = rest.indexOf('\n}');
  return stripComments(end < 0 ? rest : rest.slice(0, end));
};
const fetchBody = (() => {
  const own = fnBody('fetchHome');
  const called = [...own.matchAll(/\b([a-z][A-Za-z0-9_]*)\s*\(/g)].map((m) => m[1]);
  return own + called.map(fnBody).join('\n');
})();
if (!fetchBody) {
  problems.push('fetchHome() is no longer declared in the app client; refusing to pass.');
} else if (!/getTimezoneOffset\s*\(\s*\)/.test(fetchBody) || !/tzOffset=/.test(fetchBody)) {
  problems.push(
    'fetchHome() does not send the device\'s timezone offset, so the server falls\n'
    + '      back to UTC and every reader outside it gets the wrong greeting.');
}

// ── And the behaviour, which is the only part that proves the rest ─────────
// Mountain is UTC+360 minutes of offset; Tokyo is -540.
const CASES = [
  ['08:00 Mountain', '2026-09-12T14:00:00Z', 360, 'Good morning'],
  ['12:00 Mountain', '2026-09-12T18:00:00Z', 360, 'Good afternoon'],
  ['21:00 Mountain', '2026-09-13T03:00:00Z', 360, 'Good evening'],
  ['09:00 Tokyo',    '2026-09-12T00:00:00Z', -540, 'Good morning'],
  ['13:00 Tokyo',    '2026-09-12T04:00:00Z', -540, 'Good afternoon'],
  ['20:00 Tokyo',    '2026-09-12T11:00:00Z', -540, 'Good evening'],
];
for (const [label, now, off, want] of CASES) {
  const got = greeting({ now, firstName: null, tzOffsetMinutes: off });
  if (got !== want) problems.push(`${label}: expected "${want}", got "${got}".`);
}

// A junk offset must not move anyone by a day.
const junk = greeting({ now: '2026-09-12T18:00:00Z', firstName: null, tzOffsetMinutes: 'banana' });
if (!/^Good /.test(junk)) problems.push(`a junk offset produced "${junk}" rather than a greeting.`);

if (problems.length) {
  console.error('[check-greeting-clock] the greeting can come from the wrong clock:');
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

console.log(`[check-greeting-clock] the reader's own clock decides; ${CASES.length} times of day in 2 zones correct.`);
