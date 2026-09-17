#!/usr/bin/env node
/**
 * Writes the product's prose into TASKS.md, generated from what it sends.
 *
 * ── WHY ───────────────────────────────────────────────────────────────────
 * Ellie: "Please make this the practice from now on so that I can review all
 * prose in the tasks document."
 *
 * She has been bitten twice by the other way of doing this. /email-preview
 * held six hand-written mock-ups while nineteen real emails went out, and the
 * copy-review document listed ten action items the product never rendered. A
 * document that describes the product instead of reading it becomes a second
 * draft of it, and the half that ships is the half nobody reviews.
 *
 * So every block here is built by running or reading the source the product
 * itself uses, and check-copy-docs.mjs regenerates them on every build and
 * fails if TASKS.md has drifted.
 *
 * ── METHOD, WHICH IS THE PART TO ARGUE WITH ───────────────────────────────
 * The home cards are read out of the add({...}) calls in the priority engine
 * rather than produced by running it, because running it means inventing the
 * twenty-six states that reach each card, and a state I invent wrong hides a
 * card rather than showing a wrong one. Template holes are filled with sample
 * names. Everything else is imported and rendered.
 */

import { readFileSync, writeFileSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname;
const DOC = `${ROOT}TASKS.md`;

const YOU = 'Ellie';
const THEM = 'Preston';

const esc = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n+/g, ' ').trim();

/** Fill a template literal's holes with the sample names. */
const fill = (s) => String(s ?? '')
  .replace(/\$\{them\}/g, THEM)
  .replace(/\$\{you\}/g, YOU)
  .replace(/\$\{label\}/g, 'Communication')
  // The one line that asks for a possessive. Rendering it as an ellipsis made
  // the table say "finishes … final exercise", which reads as a missing word
  // rather than as a pronoun that depends on the reader's partner.
  .replace(/\$\{pronounForm\([^)]*\)\}/g, 'his')
  .replace(/\$\{[^}]+\}/g, '…')
  .replace(/\{U\}/g, YOU)
  .replace(/\{P\}/g, THEM);

// ── 1. The two framings of the intimacy questions ─────────────────────────
async function intimacyBlock() {
  const m = await import(`${ROOT}api/_intimacy-questions.js`);
  const rows = m.INTIMACY_QUESTIONS.map((q, i) => {
    const same = q.premarital === q.married;
    return `| ${i + 1} | ${esc(q.topic || q.id)} | ${esc(q.married)} | ${same ? '*same*' : esc(q.premarital)} |`;
  });
  const differing = m.INTIMACY_QUESTIONS.filter((q) => q.premarital !== q.married).length;
  return [
    'Every question in Physical Intimacy Expectations, both ways it can be',
    `asked. ${differing} of ${m.INTIMACY_QUESTIONS.length} are worded differently for a couple who`,
    'are not yet physically intimate; the rest are the same sentence either way.',
    'Which one a reader gets is decided by the relationship status on their',
    'profile, so a profile with none falls back to the not-yet wording.',
    '',
    '| # | Topic | Already intimate | Not yet |',
    '|--|--|--|--|',
    ...rows,
  ].join('\n');
}

// ── 2. The page that opens each exercise ──────────────────────────────────
async function introBlock() {
  const m = await import(`${ROOT}api/_lib/exercise-intro.js`);
  const { EXERCISES } = await import(`${ROOT}api/_exercises.js`);
  const rows = EXERCISES.map((e) => {
    const intro = m.exerciseIntro(e.key, { partner: THEM });
    if (!intro) return null;
    return `| ${esc(e.fullLabel || e.label)} | ${esc(intro.title)} | ${intro.body.map(esc).join(' ')} | ${esc(intro.note)} | ${esc(intro.cta)} |`;
  }).filter(Boolean);
  return [
    'The page that opens each exercise, on both surfaces. Conflict Patterns is',
    'the long one.',
    '',
    '| Exercise | Heading | What it says | Footnote | Button |',
    '|--|--|--|--|--|',
    ...rows,
  ].join('\n');
}

// ── 3. What the app says while it waits ───────────────────────────────────
function loadingBlock() {
  const src = readFileSync(`${ROOT}attune-app/src/constants/loading-copy.ts`, 'utf8');
  const rows = [];
  // Each line is preceded by the comment saying where it appears, which is the
  // context she asked for and the reason they are in one file.
  for (const m of src.matchAll(/\/\*\* ([^*]+?) \*\/\s*\n\s*(\w+): '([^']*)'/g)) {
    rows.push(`| ${esc(m[3])} | ${esc(m[1])} |`);
  }
  return [
    'Every line the app shows while it is waiting, and where it appears. They',
    'were typed into fifteen screens; they are one file now, which is what',
    'makes this list possible.',
    '',
    '| Line | Where |',
    '|--|--|',
    ...rows,
  ].join('\n');
}

// ── Write them in ──────────────────────────────────────────────────────────
/**
 * ── WHAT IS NO LONGER HERE ────────────────────────────────────────────────
 * The home tile, the two deletion emails and the workbook's prose each had a
 * block. Ellie read all three, sent her changes, approved them, and asked for
 * the tables to come out: "R74 has been approved, remove this reference table
 * from tasks." A table nobody is reading any more costs review attention on
 * the wrong half of the document, which is the same failure the blocks exist
 * to prevent, pointed the other way.
 *
 * The prose itself is still generated from the product wherever it is shown.
 * Adding a block back is a few lines; the builders are in the history.
 */
const BLOCKS = {
  intimacy: await intimacyBlock(),
  intros: await introBlock(),
  loading: loadingBlock(),
};

let doc = readFileSync(DOC, 'utf8');
const missing = [];
for (const [name, content] of Object.entries(BLOCKS)) {
  const start = `<!-- copy:${name}: generated by scripts/build-copy-docs.mjs -->`;
  const end = `<!-- end copy:${name} -->`;
  const from = doc.indexOf(start);
  const to = doc.indexOf(end);
  if (from < 0 || to < 0) { missing.push(`${start}\n${end}`); continue; }
  doc = doc.slice(0, from) + `${start}\n\n${content}\n\n${end}` + doc.slice(to + end.length);
}
if (missing.length) {
  console.error('[build-copy-docs] TASKS.md has no block for:');
  for (const m of missing) console.error(`  ${m.split('\n')[0]}`);
  process.exit(1);
}

if (process.argv.includes('--print')) {
  process.stdout.write(Object.entries(BLOCKS).map(([k, v]) => `## ${k}\n${v}`).join('\n\n'));
} else {
  writeFileSync(DOC, doc);
  console.log(`[build-copy-docs] ${Object.keys(BLOCKS).length} prose blocks written into TASKS.md.`);
}
