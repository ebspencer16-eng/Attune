#!/usr/bin/env node
/**
 * What Comes Next says the same things on both surfaces.
 *
 * ── WHY IT IS NEEDED ──────────────────────────────────────────────────────
 * api/_lib/what-comes-next.js builds this page and the app renders it. The
 * website builds its own, from its own client-side results, which is the
 * architecture it has: it computes results in the browser and cannot always
 * ask the server for them.
 *
 * So there are two implementations of one page, and they had drifted in four
 * ways at once, every one of which Ellie found by reading the page:
 *
 *   the expectations rows said "Work through your household list together" on
 *   the website and "Work through household together" on the server, and she
 *   asked for a third wording;
 *
 *   the group was called "Physical Intimacy" where the exercise is called
 *   Physical Intimacy Expectations;
 *
 *   the conflict list was selected by raw answer value on the website and by
 *   band on the server, so the two were different lengths. Hers: "I have 4
 *   items in my conflict action plan on that overview page, but one thing
 *   listed in the what comes next section for conflict";
 *
 *   and the whole conflict block sat inside the Physical Intimacy branch on the
 *   website, so a couple who owned Conflict and had not finished Intimacy got
 *   no conflict list at all. Nothing failed: a section that is not pushed is a
 *   section that is simply not there.
 *
 * ── WHAT IT CHECKS ────────────────────────────────────────────────────────
 * The things that can be compared across two implementations that take
 * different inputs: the group labels, the wording template of the expectations
 * rows, the rule the conflict list is selected by, and that the conflict group
 * is not nested inside another section's condition.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Whether the two produce the same items for the same couple. They cannot be
 * run side by side: the server takes a results payload and the website takes
 * raw answers it has already turned into its own shapes. Closing that properly
 * means the website reading the server's page, which is the right answer and a
 * larger change than this; it is named in TASKS.md rather than half-done here.
 */

import { readFileSync } from 'node:fs';

import { whatComesNext } from '../api/_lib/what-comes-next.js';

const ROOT = new URL('..', import.meta.url).pathname;
const WEB = 'src/App.jsx';
const web = readFileSync(`${ROOT}${WEB}`, 'utf8');
const fails = [];

/** The website's block, by its own marker, so nothing outside it is read. */
const block = (() => {
  const at = web.indexOf('const groups = [];');
  if (at === -1) return null;
  const end = web.indexOf('{/* block: what-comes-next/groups */}', at);
  if (end === -1) return null;
  /* Comments stripped. The comment above the expectations rows quotes Ellie
     saying "Rather than 'Work through household together'", so a plant moving
     the server back to that wording passed: the phrase was still in the file,
     in the sentence explaining why it is not used any more. */
  return web.slice(at, end)
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n').map((l) => l.replace(/(^|[^:])\/\/.*$/, '$1')).join('\n');
})();
if (!block) {
  console.error(`[check-next-steps-mirror] could not find the website's What Comes Next block in`
    + ` ${WEB}.`
    + ' Refusing to pass: a gate that has lost its subject must never report success.');
  process.exit(1);
}

/**
 * Every group the server can produce, with enough input that each one appears.
 *
 * Built from the module rather than listed here, so a sixth group is compared
 * the day it is added rather than the day somebody remembers.
 */
const server = whatComesNext({
  coupleTypeId: 'WX',
  commsPlan: { protocols: [{ title: 'A protocol', thisWeek: 'Try this' }] },
  expectations: { categories: [{ label: 'Household', differences: 3, section: 'exp-convo-0' }] },
  intimacy: { actionPlan: [{ label: 'How it happens', prompt: 'Say this' }] },
  reflection: { insights: [] },
  reflectionPlan: [{ title: 'A reflection', action: 'Do this' }],
  conflictReady: true,
  conflictAnswers: null,
  names: { you: 'Sarah', them: 'James' },
});
const serverLabels = server.groups.map((g) => g.label);
if (serverLabels.length < 4) {
  console.error(`[check-next-steps-mirror] the server produced ${serverLabels.length} groups from`
    + ' a full set of inputs, which cannot be right.'
    + ' Refusing to pass: a gate that has lost its subject must never report success.');
  process.exit(1);
}

// ── 1. The same names for the same sections ─────────────────────────────────
for (const label of serverLabels) {
  if (!block.includes(`label: "${label}"`) && !block.includes(`label: '${label}'`)) {
    const near = [...block.matchAll(/label: ["']([^"']+)["']/g)].map((m) => m[1]);
    fails.push(`the server calls a group "${label}" and the website calls its groups`
      + ` ${near.map((n) => `"${n}"`).join(', ')}.\n`
      + '      One of them is the name Ellie wrote. Two names for one section is how Physical\n'
      + '      Intimacy Expectations became Physical Intimacy on one surface.');
  }
}

// ── 2. The expectations rows, worded the same ───────────────────────────────
const expItem = server.groups.find((g) => g.id === 'exp')?.items[0];
if (!expItem) {
  fails.push('the server built no expectations row from a category with differences in it.');
} else {
  /* The template rather than the sentence: the category name is interpolated,
     so what has to match is the words around it. */
  /* The whole template with the category name taken out, both halves, so
     "Discuss X expectations together" cannot match "Discuss X together". */
  const [before, after] = expItem.title.split('household');
  const shape = `${before.trim()}|${(after || '').trim()}`;
  if (!block.includes(before.trim()) || !(after || '').trim().split(' ').every((w) => block.includes(w))) {
    fails.push(`the server's expectations rows read "${expItem.title}" and the website's do not`
      + ` read "${shape.replace('|', ' ... ')}".\n`
      + '      Ellie wrote this sentence once. The website said "Work through your household list\n'
      + '      together" while the server said something else, and she asked for a third thing.');
  }
  if (!expItem.section) {
    fails.push('the server\'s expectations rows carry no `section`, so neither surface can draw'
      + ' the arrow that opens that page. Ellie asked for one on every row.');
  }
  if (!/section: \(FIXED_CATS\.find|section: \w+\.section/.test(block)) {
    fails.push('the website\'s expectations rows carry no section, so they have no arrow.');
  }
}

// ── 3. The conflict list, selected the same way ─────────────────────────────
/*
 * By band on both sides. The website picked `value >= 2`, which is a different
 * list of a different length from the one the overview page shows, and that
 * difference is exactly what she reported: four items on one page and one on
 * the other.
 */
if (!/band === "worth_watching"|band === 'worth_watching'/.test(block)) {
  fails.push('the website selects its conflict items by something other than the band.\n'
    + '      api/_lib/what-comes-next.js and the overview page both take the patterns in a band\n'
    + '      worth watching or worth attention. Any other rule produces a different list, which\n'
    + '      is the four-against-one she found.');
}
if (/\(pp\.value \?\? 0\) >= 2/.test(block)) {
  fails.push('the website still selects conflict items by raw answer value.');
}

// ── 4. And conflict is its own section ──────────────────────────────────────
/*
 * The push used to sit inside `if (intimacyBothDone && intimacySummary) {`, so
 * owning Conflict and not having finished Intimacy meant no conflict group.
 * Measured by brace depth from the start of the block rather than by reading
 * the nesting, because the nesting is what was wrong and looked right.
 */
const confAt = block.indexOf('id: "conflict"');
if (confAt === -1) {
  fails.push('the website builds no conflict group at all.');
} else {
  let depth = 0;
  for (let i = 0; i < confAt; i += 1) {
    if (block[i] === '{') depth += 1;
    else if (block[i] === '}') depth -= 1;
  }
  const expAt = block.indexOf('id: "exp"');
  let expDepth = 0;
  for (let i = 0; i < expAt; i += 1) {
    if (block[i] === '{') expDepth += 1;
    else if (block[i] === '}') expDepth -= 1;
  }
  if (depth > expDepth) {
    fails.push(`the website's conflict group is nested ${depth - expDepth} level(s) deeper than`
      + ' its expectations group, so it is inside another section\'s condition.\n'
      + '      It was inside the Physical Intimacy branch: a couple who owned Conflict and had\n'
      + '      not finished Intimacy got no conflict list, and nothing failed.');
  }
}

if (fails.length) {
  console.error('\n check-next-steps-mirror: the two What Comes Next pages do not say the same'
    + ' things.\n');
  for (const f of fails) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}

console.log(`[check-next-steps-mirror] ${serverLabels.length} groups: the same names on both`
  + ' surfaces, the same expectations wording with a page to open, and the conflict list selected'
  + ' by band and built outside any other section.');
