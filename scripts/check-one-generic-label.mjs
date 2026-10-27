/**
 * One way to write a responsibility about nobody in particular.
 *
 * ── THE BUG THIS ENCODES ──────────────────────────────────────────────────
 * The exercises phrase their items at the person answering: "Planning visits
 * with {userName}'s family". The admin reads them about everybody at once, so
 * those placeholders become words. Two endpoints did that conversion, with two
 * functions, and the two disagreed: api/admin-data.js had `famLabel` and
 * api/admin-explore.js had `genericLabel`, identical for their first two rules
 * and different for the next four. So the same item read "Planning visits with
 * one's own family" on the Responses page and "Planning visits with your
 * family" on the Explore page, and nothing could see it, because each function
 * was correct on its own.
 *
 * `genericLabel` also contradicted itself, turning "{userName}'s family" into
 * "one's own family" and a bare "{userName}'s" into "your". One function, two
 * voices. It is api/_lib/generic-label.js now and the wording is third person,
 * because the admin reads about many couples and "your family" has no answer
 * to "whose?".
 *
 * ── WHAT IT CHECKS, AND WHAT IT DELIBERATELY ALLOWS ───────────────────────
 * Replacing a placeholder with a PLAIN WORD is the job this module owns, and
 * no other file under api/ may do it. Three other things look like it and are
 * not, so all three pass:
 *
 *   - substituting a real name, which uses a variable or a template, as
 *     api/admin-explore.js does to rebuild a storage key and as the customer
 *     surfaces do to address a person;
 *   - mirroring the two placeholders into each other, which
 *     api/_lib/expectations.js does so a partner's answer reads the right way
 *     round. The replacement there is itself a placeholder, so it is told
 *     apart by the braces in it rather than by the file it is in;
 *   - anything outside api/. src/App.jsx substitutes real names for a reader
 *     and is a different job entirely.
 *
 * It says nothing about whether the wording is the right wording. That is a
 * judgement, and it lives in one place now so it can be made once.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const OWNER = 'api/_lib/generic-label.js';
const files = [];
const walk = (d) => { for (const e of readdirSync(d, { withFileTypes: true })) {
  if (e.isDirectory()) walk(join(d, e.name)); else if (e.name.endsWith('.js')) files.push(join(d, e.name)); } };
walk('api');

const fail = [];
let scanned = 0;
let ownerRules = 0;

/* .replace(<regex naming a placeholder>, <replacement>) — the replacement is
   captured so a plain word can be told from a variable. */
const RE = /\.replace\(\s*\/[^/]*\\\{(?:userName|partnerName)\\\}[^/]*\/[a-z]*\s*,\s*([^)]*)\)/g;

for (const file of files) {
  const src = readFileSync(file, 'utf8');
  if (!src.includes('{userName}') && !src.includes('{partnerName}')) continue;
  scanned++;
  for (const m of [...src.matchAll(RE)]) {
    const repl = m[1].trim();
    const isLiteral = /^(['"]).*\1$/s.test(repl);
    if (!isLiteral) continue;                       // a variable or a template: a real name
    if (repl.includes('{')) continue;               // a placeholder for a placeholder: mirroring
    if (file === OWNER) { ownerRules++; continue; }
    fail.push(`${file} turns a placeholder into the plain word ${repl}. That conversion belongs to ${OWNER};`
      + ' import genericLabel rather than writing a second set of rules, which is how the Responses page and the'
      + ' Explore page came to call the same item two different things.');
  }
}

/* ── THE OWNER IS CHECKED BY RUNNING IT ───────────────────────────────────
   This counted the owner's `.replace` lines and failed under four. That is a
   gate encoding the current state rather than the rule, and it passed a plant
   that deleted half the rules: the plant's own strip ate alternate lines, four
   survived, and four was the threshold. Two wrong things agreeing.

   What the module actually promises is that no placeholder survives it and
   that what comes out is third person. Both are answerable by calling it, so
   both are asked of the real function over inputs taken from the exercise
   itself rather than typed here. A rule that can be executed should be. */
const { genericLabel } = await import('../api/_lib/generic-label.js');
const { RESPONSIBILITY_CATEGORIES, LIFE_QUESTIONS } = await import('../api/_questions.js');
const subjects = [
  ...RESPONSIBILITY_CATEGORIES.flatMap((c) => (c.items || []).map((i) => (typeof i === 'string' ? i : i.label || ''))),
  ...(LIFE_QUESTIONS || []).map((q) => q.text || ''),
];
const withPlaceholder = subjects.filter((t) => /\{(userName|partnerName)\}/.test(t));
if (!withPlaceholder.length) fail.push('no exercise item contains a placeholder, so the owner was never exercised and this gate proved nothing');
for (const t of withPlaceholder) {
  const out = genericLabel(t);
  if (/\{(userName|partnerName)\}/.test(out)) fail.push(`genericLabel left a placeholder in: ${JSON.stringify(out)}`);
  /* Second person is the voice the deleted copy drifted into, and it is the
     one the admin must not use: it reads about many couples, so "your family"
     has no answer to "whose?". */
  if (/\b(your|you)\b/i.test(out) && !/\b(your|you)\b/i.test(t)) fail.push(`genericLabel wrote second person into: ${JSON.stringify(out)}`);
}
if (!scanned) fail.push('no file under api/ mentions the placeholders at all, so this gate proved nothing');

if (fail.length) {
  console.error('check-one-generic-label FAILED');
  for (const f of fail) console.error('  - ' + f);
  process.exit(1);
}
console.log(`[check-one-generic-label] ${ownerRules} placeholder rules, all in ${OWNER}; `
  + `${scanned} file(s) under api/ mention the placeholders and none of the others turns one into a plain word.`);
