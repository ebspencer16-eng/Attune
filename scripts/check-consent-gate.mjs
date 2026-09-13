// Fails the build when the EU consent banner is theatre.
//
// ── THE PROMISE ────────────────────────────────────────────────────────────
// The published privacy policy says: "If you are accessing the Service from
// the European Union or United Kingdom, a consent banner will be presented to
// you upon first visit."
//
// What existed was a notice with no Accept button, shown to everyone. Its own
// comment argued correctly that US state law is opt-out and a wall is the
// wrong answer there. Both things were true; the product had one answer for
// two jurisdictions.
//
// ── WHAT MAKES A CONSENT BANNER REAL ───────────────────────────────────────
// Three things, and this checks all three, because any one missing turns it
// into a decoration that makes the page look compliant:
//
//   1. It asks where the visitor is. /api/region reads Vercel's country
//      header, and api/_lib/consent-region.js decides. An unknown country is
//      treated as needing consent: unknown is not the same as the US.
//   2. There is something to decline, not only something to accept.
//   3. Declining stops something. On this site that is Sentry, which records a
//      replay when an error fires, and a replay can contain what somebody
//      typed into an exercise. It is the only thing here that is not strictly
//      necessary, and if it starts regardless then the banner does nothing.
//
// ── WHAT IT DOES NOT COVER ─────────────────────────────────────────────────
// Whether the country header is accurate, which is Vercel's business, and
// whether the list of countries is legally exactly right, which is a lawyer's.
// The list and its reasoning are in api/_lib/consent-region.js.

import { readFileSync } from 'fs';

import { consentRequired } from '../api/_lib/consent-region.js';

const ROOT = new URL('..', import.meta.url).pathname;
const read = (f) => readFileSync(`${ROOT}${f}`, 'utf8');

const problems = [];

// ── The rule itself ───────────────────────────────────────────────────────
for (const [country, want, why] of [
  ['DE', true, 'an EU member state'],
  ['GB', true, 'the United Kingdom'],
  ['NO', true, 'the EEA'],
  ['US', false, 'the United States, where the law is opt-out'],
  ['', true, 'an unknown country, which must not be treated as the US'],
]) {
  if (consentRequired(country) === want) continue;
  problems.push(`consentRequired('${country}') is ${!want}, and ${country || 'no country'} is ${why}.`);
}

// ── 1. It asks ────────────────────────────────────────────────────────────
const region = read('api/region.js');
if (!/x-vercel-ip-country/i.test(region)) {
  problems.push('api/region.js does not read the country header, so it cannot tell anyone apart.');
}
if (!/runtime:\s*'edge'/.test(region)) {
  problems.push("api/region.js does not declare runtime 'edge' while returning a Response.");
}
if (!/no-store/.test(region)) {
  problems.push(
    'api/region.js does not forbid caching.\n'
    + '      Cached at the edge it hands one visitor\'s country to the next.');
}

// Comments stripped: the first version matched the word "Decline" in the
// explanatory comment above the banner, so deleting the button changed
// nothing it could see.
const flags = read('public/_flags.js')
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|\s)\/\/[^\n]*/g, ' ');
if (!/\/api\/region/.test(flags)) {
  problems.push('public/_flags.js never asks /api/region, so every visitor gets the same banner.');
}

// ── 2. There is something to decline ──────────────────────────────────────
if (!/btn\('Decline'/.test(flags) || !/btn\('Accept'/.test(flags)) {
  problems.push(
    'public/_flags.js does not offer both Accept and Decline.\n'
    + '      A banner with one button is a notice, and the policy promises a choice.');
}
if (!/attune_consent/.test(flags)) {
  problems.push('public/_flags.js does not store the answer, so it asks again on every page.');
}

// ── 3. Declining stops something ──────────────────────────────────────────
const main = read('src/main.jsx');
if (/^\s*if \(import\.meta\.env\.PROD\) \{\s*$/m.test(main)) {
  problems.push(
    'src/main.jsx starts Sentry on production alone, with no consent check.\n'
    + '      A Decline then changes nothing, which is the definition of theatre.');
}
if (!/attune_consent/.test(main)) {
  problems.push('src/main.jsx never reads the stored answer, so a Decline cannot reach it.');
}

if (problems.length) {
  console.error('[check-consent-gate] the consent banner does not do what the policy says:');
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

console.log('[check-consent-gate] region asked, both answers offered, and a decline stops error reporting.');
