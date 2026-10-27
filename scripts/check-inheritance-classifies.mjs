/**
 * The inherited-roles charts classify real stored answers, not just new ones.
 *
 * ── THE BUG THIS ENCODES ──────────────────────────────────────────────────
 * Ellie: "Why are what people expect and inherited roles charts both listed
 * as not classified?"
 *
 * Because every answer in the database is in the older spelling. The website
 * stores a SLOT now, 'a' or 'b' or 'both', and it used to store the adult's
 * own word, "Mom" or "Dad" or "Grandma". src/App.jsx says so in a comment
 * beside the writer, and matches the old word in the exercise and nowhere
 * else. `experiencedShape` only understood slots, so every older answer
 * resolved to null, every item counted as unknown, and both charts drew a
 * single bar reading Not classified.
 *
 * Not classified is a real category, which is why nobody questioned it: a
 * chart full of it looks like a product nobody has used yet rather than a
 * reader that cannot read.
 *
 * ── WHY IT RUNS THE CLASSIFIER ON STORED BYTES ────────────────────────────
 * A fixture written in the new spelling would pass while every real answer
 * failed, which is exactly the state this was in. The demo couple in
 * api/_lib/demo-couple.js holds answers in the OLD spelling, so it is the one
 * fixture in the repo that would have caught this, and it is what this runs.
 *
 * ── WHAT IT CHECKS ────────────────────────────────────────────────────────
 * That a real answer set classifies most of its items, both for the shape
 * half and the gendered half. Not a specific number: the thresholds are loose
 * on purpose, because what went wrong was not a wrong count, it was a reader
 * that classified nothing at all.
 */
const roles = await import('../api/_lib/inherited-roles.js');
const q = await import('../api/_questions.js');
const demo = await import('../api/_lib/demo-couple.js');

const fail = [];
const items = q.RESPONSIBILITY_CATEGORIES.flatMap((c) => (c.items || []).map((i) => ({ key: c.id + '__' + i })));
if (items.length < 10) fail.push(`only ${items.length} responsibility items; this gate has lost its subject`);

for (const [who, ex2, profile] of [
  ['the demo couple, half one', demo.sarahEx2, { name: 'Sarah', partner_name: 'James', pronouns: 'she/her' }],
  ['the demo couple, half two', demo.jamesEx2, { name: 'James', partner_name: 'Sarah', pronouns: 'he/him' }],
]) {
  if (!ex2) { fail.push(`${who} has no Expectations answers; this gate has lost its subject`); continue; }
  const r = roles.readInheritance(ex2, profile, items, q.guardiansOf(ex2));
  const shapeKnown = r.shape.same + r.shape.sharedToOne + r.shape.oneToShared + r.shape.other;
  if (shapeKnown === 0) {
    fail.push(`${who}: every one of ${items.length} items came back unclassified for the shape chart, `
      + 'which is a reader that cannot read the spelling the product stored');
  } else if (shapeKnown < items.length / 2) {
    fail.push(`${who}: only ${shapeKnown} of ${items.length} items classified for the shape chart`);
  }
  const genderKnown = r.gendered.keepsSameGenderRole + r.gendered.handsOffSameGenderRole
    + r.gendered.takesOnOtherGenderRole + r.gendered.handsOffOtherGenderRole;
  if (genderKnown === 0) {
    fail.push(`${who}: every item came back unclassified for the gendered chart. `
      + 'That half is unknown far more often by design, but never all of it.');
  }
}

/* The old spelling specifically, since that is what every existing row holds
   and what a future tidy-up is most likely to drop. */
const adults = { a: 'Mom', b: 'Dad' };
for (const [stored, want] of [['Mom', 'a'], ['mom', 'a'], ['Dad', 'b'], ['a', 'a'], ['b', 'b'],
                              ['both', 'both'], ['Both of them', 'both'], ['neither', 'neither'],
                              ['Grandma', null], [null, null], ['', null]]) {
  const got = roles.childhoodSlot(stored, adults);
  if (got !== want) fail.push(`childhoodSlot(${JSON.stringify(stored)}) is ${JSON.stringify(got)}, expected ${JSON.stringify(want)}`);
}

if (fail.length) {
  console.error('check-inheritance-classifies FAILED');
  for (const f of fail) console.error('  - ' + f);
  process.exit(1);
}
console.log(`[check-inheritance-classifies] both halves of the demo couple classify most of their ${items.length} items, `
  + 'in the spelling the database actually holds, and the slot reader understands the adult words as well as the slots.');
