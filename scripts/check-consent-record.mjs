// Fails the build when the two moments of agreement record nothing.
//
// ── THE PROMISE ────────────────────────────────────────────────────────────
// The published retention policy says: "Timestamped records of user consent
// events (when each partner accepted Terms and Privacy Policy). Retained for
// 7 years from the consent date... These records are retained even after
// account deletion."
//
// Nothing recorded one. No checkbox, no column, no table. The EULA on the same
// page says buying is the act of agreeing, which made the order row the
// nearest thing we had, and deleting an account deletes the orders. So nothing
// survived deletion, which is the one thing that paragraph specifically
// promises.
//
// ── WHAT THIS CHECKS ───────────────────────────────────────────────────────
// 1. Both moments write one: api/stripe-webhook.js at checkout, and
//    api/create-profile.js at account creation. Both, because someone can buy
//    and never set up, and an invited partner sets up without ever buying.
// 2. The version recorded is generated from the documents, not typed.
// 3. The generated file is current with public/legal.html.
//
// ── WHY A HASH RATHER THAN AN EFFECTIVE DATE ───────────────────────────────
// A consent record has to say which words were agreed to. Two of the five
// documents on /legal are published today reading "Effective date: TODO before
// publishing", so the date cannot answer it, and setting one is a legal
// decision rather than something a build should invent. The hash answers it
// exactly and changes the moment the text does.

import { createHash } from 'crypto';
import { readFileSync } from 'fs';

import { LEGAL_DOCUMENTS, LEGAL_VERSION } from '../api/_lib/legal-version.js';
import { docText } from './_lib/legal-docs.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const read = (f) => readFileSync(`${ROOT}${f}`, 'utf8');

const problems = [];

// ── 1. Both moments record ────────────────────────────────────────────────
const MOMENTS = [
  ['api/stripe-webhook.js', "source: 'checkout'", 'a purchase'],
  ['api/create-profile.js', "source: 'account_creation'", 'creating an account'],
];
for (const [file, needle, what] of MOMENTS) {
  const src = read(file);
  if (!/recordConsent/.test(src) || !src.includes(needle)) {
    problems.push(
      `${file} does not record a consent event for ${what}.\n`
      + '      The policy says one exists and keeps it for seven years.');
  }
}

// ── 2. The version is generated ───────────────────────────────────────────
const lib = read('api/_lib/consent.js');
if (!/LEGAL_VERSION/.test(lib)) {
  problems.push('api/_lib/consent.js records no version, so a record cannot say what was agreed to.');
}
if (!/^\s*export const LEGAL_VERSION = '[0-9a-f]{12}';$/m.test(read('api/_lib/legal-version.js'))) {
  problems.push('api/_lib/legal-version.js does not hold a generated hash. Run node scripts/build-legal-version.mjs.');
}

// ── 3. It matches the documents on the page ───────────────────────────────
const html = read('public/legal.html');
const parts = [];
for (const id of LEGAL_DOCUMENTS) {
  const text = docText(html, id);
  if (!text) { problems.push(`public/legal.html has no document with id doc-${id}.`); continue; }
  parts.push(`${id}:${text}`);
}
if (parts.length === LEGAL_DOCUMENTS.length) {
  const current = createHash('sha256').update(parts.join('\n')).digest('hex').slice(0, 12);
  if (current !== LEGAL_VERSION) {
    problems.push(
      `the legal documents have changed and the version has not: page is ${current},\n`
      + `      api/_lib/legal-version.js says ${LEGAL_VERSION}. Every consent recorded\n`
      + '      since the edit points at the old text. Run node scripts/build-legal-version.mjs.');
  }
}

if (problems.length) {
  console.error('[check-consent-record] agreement is not being recorded:');
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

console.log(
  `[check-consent-record] both moments record a consent event at legal version ${LEGAL_VERSION}, `
  + `covering ${LEGAL_DOCUMENTS.join(' and ')}.`);
