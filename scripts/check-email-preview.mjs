#!/usr/bin/env node
/**
 * Every email Attune sends is previewable, and the preview holds no copy.
 *
 * ── THE PROMISE ───────────────────────────────────────────────────────────
 * 1. Every email-building export under api/ is in api/_lib/email-catalogue.js.
 * 2. Every entry in that catalogue renders a subject and a body.
 * 3. public/email-preview.html contains no email of its own.
 *
 * ── THE BUG IT CAME FROM ──────────────────────────────────────────────────
 * /email-preview held six hand-written mock-ups, with their own CSS and their
 * own wording. The product sends nineteen emails from five modules. So five
 * real emails had no preview at all, including results_viewed, which is the
 * one that tells a couple their results are ready; one preview was of an email
 * retired in 2793bba; and the copy shown for the other six was a second draft
 * of the copy that ships, drifted from it in subject lines and sentences.
 *
 * Ellie writes every word a customer reads, and this is the page she reads
 * them on. It is the same failure as the copy-review document that showed ten
 * action items the product never rendered: copy gets approved that nobody will
 * ever see, and the copy that ships goes unreviewed.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Whether an email should exist, or whether one with no trigger should be
 * brought back or removed. Five have no trigger; the preview says so on the
 * page and TASKS.md carries the decision. A gate that answered that question
 * would be making a product call.
 *
 * Not api/send-feedback.js or the digest crons, which write to Attune's own
 * inbox rather than to a customer.
 */

import { readFileSync, readdirSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname;
const read = (f) => readFileSync(`${ROOT}${f}`, 'utf8');
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const { EMAIL_CATALOGUE, renderEmail } = await import(`${ROOT}api/_lib/email-catalogue.js`);
const problems = [];

// ── 1. Nothing that builds a customer email is missing from the catalogue ────
// Derived by reading the exports, so a new email cannot be added quietly.
const files = [
  ...readdirSync(`${ROOT}api`).filter((f) => f.endsWith('.js')).map((f) => `api/${f}`),
  ...readdirSync(`${ROOT}api/_lib`).filter((f) => f.endsWith('.js')).map((f) => `api/_lib/${f}`),
];

/** Modules that mail Attune rather than a customer. */
const INTERNAL = new Set(['api/send-feedback.js', 'api/submit-beta-survey.js', 'api/cron-beta-digest.js', 'api/cron-feedback-synthesis.js']);

/**
 * Exported names ending in Email that are not an email.
 *
 * brandedEmail is the shared layout every other template is poured into, and
 * renderEmail is this catalogue's own renderer. Both would be caught by the
 * name alone. Nothing else belongs here: if a new name is added to this set to
 * make the build pass, the thing it names is probably an email nobody can
 * preview.
 */
const NOT_AN_EMAIL = new Set(['brandedEmail', 'renderEmail']);

let found = 0;
for (const rel of files) {
  if (INTERNAL.has(rel)) continue;
  const src = strip(read(rel));

  for (const m of src.matchAll(/export const (\w*_EMAILS)\s*=\s*\{/g)) {
    const open = src.indexOf('{', m.index + m[0].length - 1);
    const body = src.slice(open, matchingClose(src, open));
    for (const k of body.matchAll(/^\s{2}(\w+):/gm)) {
      found++;
      if (!EMAIL_CATALOGUE[k[1]]) {
        problems.push(`${rel}: ${m[1]}.${k[1]} is an email nothing can preview. Add it to api/_lib/email-catalogue.js.`);
      }
    }
  }

  for (const m of src.matchAll(/export function (\w+Email)\s*\(/g)) {
    if (NOT_AN_EMAIL.has(m[1])) continue;
    found++;
    const inCatalogue = Object.values(EMAIL_CATALOGUE).some((e) => e.build?.name === m[1] || e.build?.name === `bound ${m[1]}`);
    if (!inCatalogue) {
      problems.push(`${rel}: ${m[1]}() builds a customer email and is not in the catalogue.`);
    }
  }
}

if (found < 15) {
  problems.push(`only found ${found} email builders under api/; there were 19 when this was written, so the scan has gone blind.`);
}

// ── 2. Every entry renders ───────────────────────────────────────────────────
for (const key of Object.keys(EMAIL_CATALOGUE)) {
  let built;
  try { built = renderEmail(key); }
  catch (e) { problems.push(`${key} throws when rendered: ${e.message}`); continue; }
  if (!built?.subject) problems.push(`${key} renders with no subject.`);
  if (!built?.html || built.html.length < 200) problems.push(`${key} renders ${built?.html?.length ?? 0} characters of body.`);
  if (/undefined|\[object Object\]|NaN/.test(built?.html || '')) {
    problems.push(`${key} renders the word undefined, an object, or NaN into the email. Its sample is missing a field.`);
  }
}

// ── 3. The page holds no copy of its own ─────────────────────────────────────
const page = read('public/email-preview.html');
// Every URL the page fetches has to be the preview endpoint. Checking that the
// string appears somewhere is not enough: it appears in the prose and in the
// error message, so a page pointed at something else entirely still passed.
const fetched = [...page.matchAll(/fetch\(\s*([A-Za-z_$][\w$]*|['"][^'"]+['"])/g)].map((m) => m[1]);
if (!fetched.length) {
  problems.push('public/email-preview.html fetches nothing, so it cannot be showing what the senders build.');
}
for (const target of fetched) {
  const literal = /^['"]/.test(target)
    ? target.slice(1, -1)
    : (page.match(new RegExp(`\\b${target}\\s*=\\s*['"]([^'"]+)['"]`)) || [])[1];
  if (!literal || !literal.startsWith('/api/email-preview')) {
    problems.push(`public/email-preview.html fetches ${literal || target}, which is not the preview endpoint.`);
  }
}
for (const m of page.matchAll(/\{[^{}]*\bsubject\s*:[^{}]*\bhtml\s*:/gs)) {
  problems.push('public/email-preview.html defines an email of its own again: an object with a subject and a body. That is the drift this was built to end.');
  break;
}

function matchingClose(s, open) {
  let d = 0;
  for (let i = open; i < s.length; i++) {
    if (s[i] === '{') d++;
    else if (s[i] === '}' && --d === 0) return i + 1;
  }
  return s.length;
}

if (problems.length) {
  console.error('[check-email-preview] the emails and their preview have come apart:\n');
  for (const p of problems) console.error('  ' + p);
  process.exit(1);
}

const live = Object.keys(EMAIL_CATALOGUE).filter((k) => renderEmail(k).sentFrom.length).length;
const total = Object.keys(EMAIL_CATALOGUE).length;
console.log(`[check-email-preview] ${total} emails, all rendered by the code that sends them; ${live} have a trigger, ${total - live} do not and the page says so.`);
