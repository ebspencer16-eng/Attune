#!/usr/bin/env node
/**
 * No two days running share a source or a subject.
 *
 * ── WHAT SHE ASKED FOR ────────────────────────────────────────────────────
 * Ellie, reviewing the hundred: "I worry about only having a handful of
 * sources... I want to make sure we aren't using quotes from the same source or
 * about the same topic day after day. Please postcode these in a way to
 * organize posting order and ensure variety."
 *
 * The source half had already been wrong once. The list is harvested book by
 * book, and walking it in order gave ten consecutive days of Hold Me Tight
 * followed by eleven of Seven Principles, which reads as a product with one
 * source. Dealing round robin by work fixed that and nothing held it there.
 *
 * The subject half is the new one, and it is the half a reader notices first: a
 * week of the four horsemen from four different authors is still a week about
 * the same thing.
 *
 * ── HOW IT ASKS ───────────────────────────────────────────────────────────
 * By calling insightOfTheDay for every day of the cycle, not by reading the
 * rotation array. The array is one line away from being the thing nobody uses,
 * and a gate aimed at the half that is already correct is the most expensive
 * habit in this repo: check-card-type-clipping passed for weeks while the app
 * clipped a number, because it ran the server's copy of the arithmetic.
 *
 * So the subject is the sentence a reader actually meets on day n.
 *
 * ── WHAT IT PROMISES, AND THE ARITHMETIC UNDER IT ─────────────────────────
 * No two consecutive days share a writer, a subject, or a publication. The wrap
 * counts: day 99 is followed by day 0.
 *
 * The third of those was impossible for a while and the gate said so rather
 * than claiming it: 47 of the 74 quotations were Gottman Institute articles,
 * and anything held by more than half a list has to touch itself somewhere
 * whatever the order. The 26 Ellie asked for are what fixed it. 47 of 100 is
 * under half, and the deal comes out clean.
 *
 * Getting it to clean took one change to the deal and it is worth recording:
 * ordering candidates by the writer's pile alone split that publication into
 * thirteen small piles, so the deal under-used it early and was left holding
 * nothing but Gottman at the end. Two days in a hundred followed another from
 * the same publication. Ordering by how many of a PUBLICATION are left places
 * those 47 evenly.
 *
 * If a publication ever passes half the list again, this fails and the message
 * says which and by how much, because the fix is a quotation from somewhere
 * else rather than a looser gate. A gate that claims a rule it cannot keep gets
 * loosened until it means nothing.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Whether the topic on an entry is the right word for it. That is editorial and
 * it is Ellie's; INSIGHTS-REVIEW.md prints the code beside each quotation so
 * she can see what the rotation is being told.
 *
 * Whether the quotation is real, which is check-quotes-verbatim, and whether it
 * carries a citation, which is check-insight-provenance.
 */

import { INSIGHTS, insightOfTheDay } from '../api/_insights.js';

const byId = new Map(INSIGHTS.map((i) => [i.id, i]));
const n = INSIGHTS.length;
const problems = [];

if (!n) {
  console.error('[check-insight-rotation] api/_insights.js holds no insights at all.'
    + ' Refusing to pass: a gate that has lost its subject must never report success.');
  process.exit(1);
}

/** Every entry needs both postcodes, or the deal has nothing to work with. */
const noTopic = INSIGHTS.filter((i) => !String(i.topic || '').trim());
for (const i of noTopic) {
  problems.push(`${i.id} has no topic. The rotation deals by writer and subject together,`
    + ' and an entry with no subject can sit next to anything.');
}
const noWork = INSIGHTS.filter((i) => !String(i.work || i.author || '').trim());
for (const i of noWork) problems.push(`${i.id} has neither a work nor an author.`);

/* The hand the product actually deals, day by day, for one full cycle. */
const days = [];
for (let d = 0; d < n; d += 1) {
  const got = insightOfTheDay(d);
  const entry = byId.get(got.id);
  if (!entry) {
    problems.push(`day ${d} served id ${got.id}, which is not in INSIGHTS.`);
    continue;
  }
  days.push({ d, entry });
}

/* Every quotation, once, before anything is said about the order. A cycle that
   repeats one and skips another is a worse bug than two days about conflict. */
const served = new Set(days.map((x) => x.entry.id));
if (served.size !== n) {
  problems.push(`one cycle of ${n} days serves only ${served.size} different quotations.`
    + ` ${n - served.size} are repeated inside the cycle and that many are never shown.`);
}

/* The wrap is included: day n - 1 is followed by day 0. */
let samePublication = 0;
for (let k = 0; k < days.length; k += 1) {
  const a = days[k].entry;
  const b = days[(k + 1) % days.length].entry;
  const day = `days ${days[k].d} and ${days[(k + 1) % days.length].d}`;
  if ((a.author || a.work) === (b.author || b.work)) {
    problems.push(`${day} are both by ${a.author || a.work}. (${a.id}, then ${b.id})`);
  }
  if (a.topic && a.topic === b.topic) {
    problems.push(`${day} are both about ${a.topic}. (${a.id}, then ${b.id})`);
  }
  if (a.work && a.work === b.work) {
    samePublication += 1;
    problems.push(`${day} are both from ${a.work}, by different writers.`
      + ` (${a.id}, then ${b.id})`);
  }
}

const tally = (key) => {
  const m = new Map();
  for (const i of INSIGHTS) m.set(key(i), (m.get(key(i)) || 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
};
const pubsNow = tally((i) => i.work);
const topicsNow = tally((i) => i.topic);
const writersNow = tally((i) => i.author || i.work);

if (problems.length) {
  console.error('[check-insight-rotation] the insight of the day repeats itself:');
  for (const p of problems.slice(0, 20)) console.error(`  ✗ ${p}`);
  if (problems.length > 20) console.error(`  ... and ${problems.length - 20} more`);
  console.error('');
  console.error('  The deal is greedy and takes the largest pile first, which is what keeps a');
  console.error('  big source from being stranded at the end. If it cannot find a legal next');
  console.error('  entry it takes one anyway rather than hanging, and this is what tells you.');
  console.error('  A writer, subject or publication holding more than half the list cannot be');
  console.error('  dealt without a repeat, whatever the order. Counts now:');
  for (const [what, rows] of [['publication', pubsNow], ['subject', topicsNow], ['writer', writersNow]]) {
    console.error(`    largest ${what}: ${rows[0][0]} with ${rows[0][1]} of ${n}`);
  }
  console.error('  If one of those is over half, the fix is a quotation from somewhere else.');
  process.exit(1);
}

const writers = new Set(INSIGHTS.map((i) => i.author || i.work));
const topics = topicsNow;
const pubs = pubsNow;
const count = tally;
const half = Math.floor(n / 2);

console.log(`[check-insight-rotation] ${n} quotations by ${writers.size} writers in`
  + ` ${topics.length} subjects: no two days running share a writer or a subject, wrap`
  + ` included. Largest subject ${topics[0][0]} with ${topics[0][1]}, largest writer`
  + ` ${count((i) => i.author || i.work)[0][1]}; above ${half} of ${n} no deal exists.`);
console.log(`  No two days running come from the same publication either, which was`
  + ` impossible at 74: ${pubs[0][1]} of ${n} are ${pubs[0][0]}, and above ${half} of ${n}`
  + ' there is no such order.');
