// Fails the build when a measurement could be taken without permission, or
// kept beyond what the policy promises.
//
// ── WHAT IS BEING MEASURED ─────────────────────────────────────────────────
// Ellie asked the Engagement tab for site visits and time per page, per
// exercise and per dashboard page. None of it existed, and building it means
// the product started recording what customers do. That is a different kind of
// data from anything else here, so it comes with rules, and this is what
// holds them.
//
// ── THE FOUR RULES ─────────────────────────────────────────────────────────
//   1. A row cannot identify anyone. No session id, device id, referrer or
//      user agent is sent or stored. An account id is attached only inside the
//      product, only from a bearer token, and never from the request body: a
//      client that can name the id it writes can name somebody else's.
//   2. Where consent is required it is checked on the server, not only in the
//      browser. The browser rule can be bypassed by anyone who wants to.
//   3. The privacy policy says what is collected and for how long. A promise
//      with nothing enforcing it is how every other gap in that document
//      started.
//   4. Ninety days, by a job. See api/cron-prune-events.js.
//
// ── WHAT IT DOES NOT COVER ─────────────────────────────────────────────────
// Whether Vercel's country header is right, and whether ninety days is the
// correct number. The first is Vercel's business; the second is a decision,
// written into the policy and into the job together so they cannot drift.

import { readFileSync } from 'fs';

const ROOT = new URL('..', import.meta.url).pathname;
const read = (f) => readFileSync(`${ROOT}${f}`, 'utf8');
const strip = (t) => t
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|\s)\/\/[^\n]*/g, ' ');

const problems = [];
const api = strip(read('api/track.js'));
const client = strip(read('public/_track.js'));

// ── 1. Nothing identifying ────────────────────────────────────────────────
const FORBIDDEN = ['document.cookie', 'navigator.userAgent', 'document.referrer', 'localStorage.getItem(\'attune_account\')'];
for (const f of FORBIDDEN) {
  if (!client.includes(f)) continue;
  problems.push(`public/_track.js reads ${f}. A measurement that identifies a person is not a measurement.`);
}
if (/owner_id:\s*(body|payload)\./.test(api)) {
  problems.push(
    'api/track.js takes the account id from the request body.\n'
    + '      A client that can name the id it writes can name somebody else\'s.');
}
if (!/auth\/v1\/user/.test(api)) {
  problems.push('api/track.js does not resolve the account id from the token, so it either has none or trusts the client.');
}

// ── 2. Consent, on the server ─────────────────────────────────────────────
if (!/consentRequired\(/.test(api)) {
  problems.push(
    'api/track.js does not apply the consent rule.\n'
    + '      The browser check is the one that can be bypassed; this is the one that decides.');
}
if (!/attune_consent/.test(client)) {
  problems.push('public/_track.js does not read the stored consent answer, so a decline sends events anyway.');
}

// ── 3. The policy says so ─────────────────────────────────────────────────
const legal = read('public/legal.html');
if (!/ninety days|90 days/i.test(legal)) {
  problems.push('the privacy policy does not state how long these measurements are kept.');
}
if (!/no session identifier|no device identifier/i.test(legal)) {
  problems.push(
    'the privacy policy does not say that the measurements cannot be connected to a person.\n'
    + '      That is the whole basis on which they are collected.');
}

// ── 4. And something deletes them ─────────────────────────────────────────
const prune = (() => { try { return strip(read('api/cron-prune-events.js')); } catch { return ''; } })();
if (!/page_events/.test(prune) || !/DELETE/.test(prune)) {
  problems.push('nothing deletes old measurements, so the ninety days in the policy is a sentence and not a fact.');
}
const days = /const DAYS = (\d+);/.exec(prune);
if (!days || Number(days[1]) !== 90) {
  problems.push(`the prune job keeps ${days ? days[1] : 'an unknown number of'} days and the policy says ninety.`);
}
try {
  const vercel = JSON.parse(read('vercel.json'));
  if (!(vercel.crons || []).some((c) => c.path === '/api/cron-prune-events')) {
    problems.push('api/cron-prune-events.js is never scheduled in vercel.json, so it never runs.');
  }
} catch {
  problems.push('vercel.json could not be read, so the prune schedule cannot be checked.');
}

if (problems.length) {
  console.error('[check-tracking-consent] a measurement could be taken without permission, or kept too long:');
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

console.log('[check-tracking-consent] nothing identifying, consent checked on the server, ninety days, and a job that enforces it.');
