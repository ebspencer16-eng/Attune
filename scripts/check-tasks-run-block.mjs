/**
 * The SQL she is asked to run is SQL she has not already run.
 *
 * ── THE PROMISE ───────────────────────────────────────────────────────────
 * Ellie: "I'm bothered by tasks. It's unclear. I already ran S75, right, so why
 * is it listed as one to run? Tasks isn't updated, it doesn't align with your
 * above message. This cannot happen."
 *
 * She had run 094. I moved S75 into section 4, where it belongs, and left the
 * run block underneath section 1 still holding 094 and still introduced by the
 * words "S75, the invite codes". So the document said, on one screen, both that
 * she had done it and that she needed to do it.
 *
 * check-tasks-doc could not see it. It holds the table rows: ids live in one
 * section, section 4 rows are short, the blocks match their migrations. The run
 * block is prose and a fence, and nothing tied the id it names to the section
 * that id is in.
 *
 * ── WHAT IT HOLDS ─────────────────────────────────────────────────────────
 *   1. Every id named in the run section exists as a row somewhere.
 *   2. None of them is in section 4, which is the thing that happened.
 *   3. Every SQL block is introduced by a row id, so a block cannot sit there
 *      anonymously and outlive the thing it was for.
 *   4. The heading counts the blocks. "One to run" above two blocks is the same
 *      kind of lie in a smaller font.
 *
 * ── WHAT IT DOES NOT COVER ────────────────────────────────────────────────
 * Whether she has actually run it. Nothing in the repo knows that; only she
 * does, and the way it reaches the document is her saying so and me moving the
 * row. This catches the half that is mine: a row moved and a block left behind.
 */
import { readFileSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname;
const doc = readFileSync(`${ROOT}TASKS.md`, 'utf8');
const fails = [];

/** Each section's heading index, in document order. */
const heads = [...doc.matchAll(/^## (\d)\. .*$/gm)].map((m) => ({ n: Number(m[1]), at: m.index }));
if (heads.length !== 4) {
  console.error(`[check-tasks-run-block] expected 4 sections, found ${heads.length}. check-tasks-doc owns that; stopping rather than guessing.`);
  process.exit(1);
}
const sectionOf = (idx) => {
  let n = 0;
  for (const h of heads) if (h.at < idx) n = h.n;
  return n;
};

/** Where every id is defined, from the table rows. */
const rowSection = {};
for (const m of doc.matchAll(/^\| ([A-Z]+\d+) \|/gm)) rowSection[m[1]] = sectionOf(m.index);

/** The run section: from its heading to the next `## `. */
const runHead = /^### [^\n]*\brun\b[^\n]*$/im.exec(doc);
const blocks = [...doc.matchAll(/<!-- SQL ([\w.-]+): written by scripts\/build-tasks-sql\.mjs\. Do not edit\. -->/g)];

if (!runHead) {
  if (blocks.length) fails.push(`${blocks.length} SQL block(s) with no "to run" heading above them, so nothing tells her what they are for.`);
} else {
  const after = doc.slice(runHead.index);
  const stop = after.search(/^## /m);
  const run = stop > 0 ? after.slice(0, stop) : after;

  // 1 and 2: every id named in the run section.
  const named = [...new Set([...run.matchAll(/\b([A-Z]{1,3}\d+)\b/g)].map((m) => m[1]))];
  if (!named.length) {
    fails.push('the run section names no row id, so nothing connects the block to a task she can see the state of.');
  }
  for (const id of named) {
    const sec = rowSection[id];
    if (sec == null) {
      fails.push(`the run section names ${id}, which is not a row in any section. A block introduced by an id that does not exist cannot be moved when the work is done.`);
    } else if (sec === 4) {
      fails.push(`the run section asks her to run ${id}, and ${id} is in section 4, "Done and verified". She has already run it. This is the exact thing she wrote "This cannot happen" about.`);
    } else if (sec === 3) {
      fails.push(`the run section asks her to run ${id}, and ${id} is in section 3, which is for things to look at rather than to run.`);
    }
  }

  // 3: every block has an id introducing it.
  const inRun = [...run.matchAll(/<!-- SQL ([\w.-]+):/g)].length;
  if (inRun !== blocks.length) {
    fails.push(`${blocks.length - inRun} SQL block(s) sit outside the run section, where no heading says whether they are still wanted.`);
  }

  // 4: the heading counts what is under it.
  const WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5 };
  const said = /^### ([A-Za-z]+)\b/.exec(runHead[0].replace(/^### /, '### '));
  const claimed = said ? WORDS[said[1].toLowerCase()] : null;
  if (claimed != null && claimed !== inRun) {
    fails.push(`the run heading says "${said[1].toLowerCase()}" and there ${inRun === 1 ? 'is' : 'are'} ${inRun} block(s) under it.`);
  }
}

if (fails.length) {
  console.error('[check-tasks-run-block] TASKS.md asks her to run the wrong thing:');
  for (const f of fails) console.error('  ✖ ' + f);
  process.exit(1);
}
console.log(`[check-tasks-run-block] ${blocks.length} SQL block(s), each introduced by a row id that is still open,`
  + ' and the heading counts them. A row moved to section 4 with its block left behind fails this.');
