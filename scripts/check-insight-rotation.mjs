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
 * ── WHAT IT PROMISES, AND THE PROMISE IT CANNOT MAKE YET ──────────────────
 * It fails on two consecutive days by the same WRITER, or about the same
 * subject. It does not fail on two consecutive days from the same publication,
 * because that cannot be dealt: 47 of these 74 quotations are Gottman
 * Institute articles, by thirteen different writers, and a value held by more
 * than half a list has to touch itself somewhere whatever the order.
 *
 * So the publication is counted and printed instead of asserted. That number is
 * the argument for the 26 quotations Ellie asked for next: at 100 entries, 47
 * is under half and this becomes a promise worth making. When they land, the
 * count below turns into an assertion.
 *
 * A gate that claims a rule it cannot keep gets loosened until it means
 * nothing. One that states the rule, the exception, and the arithmetic behind
 * the exception survives the next edit.
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
  /* Counted, not asserted. See the header: 47 of 74 are from one publication. */
  if (a.work && a.work === b.work) samePublication += 1;
}

if (problems.length) {
  console.error('[check-insight-rotation] the insight of the day repeats itself:');
  for (const p of problems.slice(0, 20)) console.error(`  ✗ ${p}`);
  if (problems.length > 20) console.error(`  ... and ${problems.length - 20} more`);
  console.error('');
  console.error('  The deal is greedy and takes the largest pile first, which is what keeps a');
  console.error('  big source from being stranded at the end. If it cannot find a legal next');
  console.error('  entry it takes one anyway rather than hanging, and this is what tells you.');
  console.error('  A subject holding more than half the list cannot be dealt without a repeat.');
  process.exit(1);
}

const writers = new Set(INSIGHTS.map((i) => i.author || i.work));
const count = (key) => {
  const m = new Map();
  for (const i of INSIGHTS) m.set(key(i), (m.get(key(i)) || 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
};
const topics = count((i) => i.topic);
const pubs = count((i) => i.work);
const half = Math.floor(n / 2);

console.log(`[check-insight-rotation] ${n} quotations by ${writers.size} writers in`
  + ` ${topics.length} subjects: no two days running share a writer or a subject, wrap`
  + ` included. Largest subject ${topics[0][0]} with ${topics[0][1]}, largest writer`
  + ` ${count((i) => i.author || i.work)[0][1]}; above ${half} of ${n} no deal exists.`);
console.log(`  The publication is counted, not asserted: ${samePublication} of ${n} days`
  + ` follow one from the same publication, because ${pubs[0][1]} of ${n} are`
  + ` ${pubs[0][0]}. Under ${half} and this becomes an assertion.`);
