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
import { execSync } from 'node:child_process';

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

/**
 * ── NOTHING IS BORN IN SECTION 4 ──────────────────────────────────────────
 * Ellie: "I never approved the insights page web view and it's not in sections
 * 1, 2, or 3."
 *
 * That has happened before and she was blunter about it then: "Not only are
 * those not done, but they never appeared in tasks as open or ready for review.
 * This is not ok." Filing something straight into "done and verified" takes it
 * off both of our lists at once, and under-delivering is visible while a
 * verified row is not.
 *
 * ── WHY THIS SHAPE ────────────────────────────────────────────────────────
 * The obvious rule, "every section 4 row records an approval", fails on 488 of
 * the 645 rows that are already there: months of settled work she reported,
 * I fixed, and she moved on from. A check that reports 488 failures on every
 * run is a check nobody reads, and a real break hides inside the noise. This
 * file's own repository has paid for that exact mistake once.
 *
 * So the rule is about MOVEMENT, which is what the complaint is actually about:
 * an id may not make its first appearance in section 4. It has to have been
 * open or ready for review in an earlier commit first. Historical rows are not
 * re-litigated because they are not new.
 *
 * Compared against the previous commit rather than a date, so there is nothing
 * to grandfather and no cutoff to go stale.
 */
{
  /**
   * The id's history, not just the last commit.
   *
   * Comparing to HEAD~1 alone was too narrow and said so immediately: six rows
   * Ellie had approved in earlier messages were flagged as born in section 4,
   * because they had been in section 3 two commits back and I had dropped them
   * from the file instead of moving them. The id had a history; one commit of
   * it did not.
   *
   * Bounded at forty revisions. A row that has not been mentioned in forty
   * edits of this file is not one anybody is tracking.
   */
  let revisions = [];
  try {
    revisions = execSync('git log -n 40 --format=%H -- TASKS.md',
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
      .split('\n').map((x) => x.trim()).filter(Boolean);
    /**
     * ── WHETHER THE NEWEST REVISION IS HISTORY OR IS THE DOCUMENT ─────────
     * This used to drop it unconditionally, with `.slice(1)`, on the assumption
     * that HEAD holds the version being checked. That is only true after a
     * commit, and `npm run check` runs BEFORE one. So while TASKS.md was
     * modified in the working tree, the baseline excluded the one revision where
     * a row approved in the last commit still sat in section 3, and every such
     * row read as having been born in section 4.
     *
     * It cost a false alarm the day after the gate was widened to forty
     * revisions for exactly this class of mistake. So the question is asked
     * rather than assumed: if HEAD's copy is the file on disk, HEAD is the
     * document and is not evidence about its own past. If it differs, the
     * change is uncommitted and HEAD is genuine history.
     */
    if (revisions.length) {
      let head = null;
      try {
        head = execSync(`git show ${revisions[0]}:TASKS.md`,
          { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
      } catch { head = null; }
      if (head !== null && head === doc) revisions = revisions.slice(1);
    }
  } catch {
    /* Not a git checkout, or TASKS.md is new. Nothing to compare, and saying so
       is better than inventing a baseline. */
  }

  if (revisions.length) {
    const idsIn = (text) => {
      const out = new Map();
      let current = null;
      for (const line of text.split('\n')) {
        const h = /^##\s*(\d)\./.exec(line);
        if (h) { current = Number(h[1]); continue; }
        const row = /^\|\s*([A-Z]+\d+)\s*\|/.exec(line);
        if (row && current) out.set(row[1], current);
      }
      return out;
    };
    /** Every id that has ever been in a section, across those revisions. */
    const everTracked = new Set();
    for (const rev of revisions) {
      let text = '';
      try {
        text = execSync(`git show ${rev}:TASKS.md`,
          { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
      } catch { continue; }
      for (const id of idsIn(text).keys()) everTracked.add(id);
    }

    const now = idsIn(doc);
    for (const [id, section] of now) {
      if (section !== 4) continue;
      if (everTracked.has(id)) continue;
      fails.push(`${id} appears in "4. Done and verified" and has never been in any section`
        + ' before.\n      An id has to be open or ready for review first. Filing one straight'
        + ' into section 4\n      takes it off both lists at once, which is the thing Ellie has'
        + ' asked about twice.');
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
