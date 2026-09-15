#!/usr/bin/env node
/**
 * The task document has to be true.
 *
 * ── WHAT WENT WRONG ───────────────────────────────────────────────────────
 * Ellie: "Seems like tasks doc isn't being updated. Ideally, I can go there
 * and get all the updates/status reports I need."
 *
 * She was right, and the cause is worth writing down because it is the oldest
 * mistake in this repo wearing new clothes. The script that moves finished
 * rows out of section 2 did all its edits in memory and wrote at the end,
 * which is correct. It threw on the last edit before the write, so none of
 * them landed. The commit that followed said the work was done, the work WAS
 * done, and the document still listed fourteen open items that were not.
 *
 * Nothing noticed because nothing was looking. A document is a claim like any
 * other, and it had no evidence behind it.
 *
 * ── WHAT IS CHECKED ───────────────────────────────────────────────────────
 *   1. No id appears in two sections. That is the shape of "moved but not
 *      removed", which is what happened, and of "approved but still open".
 *   2. Section 2's promise matches section 2's contents: if it says nothing is
 *      open there must be no rows, and if it has rows it must not say that.
 *   3. Every section's table has rows or says in words that it is empty, so an
 *      empty table never reads as a missing one.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Whether a row is finished. No check can know that; it is why section 3
 * exists. This only holds the document to being internally consistent, which
 * is the part that failed.
 */

import { readFileSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname;
const doc = readFileSync(`${ROOT}TASKS.md`, 'utf8');
const fails = [];

const HEADS = ['## 1. Needs you', '## 2. Open', '## 3. For you to review', '## 4. Done and verified'];
for (const h of HEADS) {
  if (!doc.includes(h)) {
    console.error(`[check-tasks-doc] TASKS.md has no "${h}" section; refusing to pass.`);
    process.exit(1);
  }
}

/** Each section's text, and the ids in its tables. */
const sections = HEADS.map((h, i) => {
  const from = doc.indexOf(h);
  const to = i + 1 < HEADS.length ? doc.indexOf(HEADS[i + 1], from) : doc.length;
  const text = doc.slice(from, to);
  return { name: h.replace(/^## /, ''), text, ids: [...text.matchAll(/^\| ([A-Z]+\d+) \|/gm)].map((m) => m[1]) };
});

// ── 1. an id lives in one place ───────────────────────────────────────────
const seen = new Map();
for (const sec of sections) {
  for (const id of sec.ids) {
    if (seen.has(id)) {
      fails.push(`${id} is in both "${seen.get(id)}" and "${sec.name}". An id lives in one section.`);
    } else {
      seen.set(id, sec.name);
    }
  }
}

// ── 2. section 2 says what it holds ───────────────────────────────────────
const open = sections[1];
const claimsEmpty = /\*\*Nothing open\.\*\*/.test(open.text);
if (claimsEmpty && open.ids.length) {
  fails.push(`section 2 says "Nothing open" and lists ${open.ids.length}: ${open.ids.join(', ')}`);
}
if (!claimsEmpty && !open.ids.length) {
  fails.push('section 2 is empty and does not say so, so it reads as a table that failed to load');
}

// ── 3. an empty table says it is empty ────────────────────────────────────
for (const sec of sections) {
  for (const m of sec.text.matchAll(/\| # \| [^|]+ \|\n\|--\|--\|\n(\| .+\n)?/g)) {
    if (!m[1]) {
      // The table has no rows. Something above it has to say so in words.
      const before = sec.text.slice(Math.max(0, m.index - 400), m.index);
      if (!/\*\*Nothing (waiting|open|outstanding)/i.test(before)) {
        fails.push(`an empty table in "${sec.name}" has nothing above it saying it is empty`);
      }
    }
  }
}

if (fails.length) {
  console.error('[check-tasks-doc] TASKS.md is not telling the truth about itself:');
  for (const f of fails) console.error(`  ${f}`);
  console.error('');
  console.error('It is the one place Ellie goes for status. A row that was finished and');
  console.error('not moved is worse than no document, because it is read as current.');
  process.exit(1);
}

const counts = sections.map((s) => `${s.name.split('.')[0]}: ${s.ids.length}`).join(', ');
console.log(`[check-tasks-doc] four sections, no id in two of them (${counts}).`);
