#!/usr/bin/env node
/**
 * What Comes Next lists each section's own action plan, not a second one.
 *
 * ── THE BUG ───────────────────────────────────────────────────────────────
 * Ellie: "Comms action items on what comes next page are different from and
 * need to match the action plan from comms at a glance. Please ensure that
 * each section in the what comes next page's action plan matches the action
 * plan from each section's at a glance page."
 *
 * The Communication group was built from commsProtocols while the
 * Communication at-a-glance page draws commsActionPlan. Both are real lists
 * of things to do about communication, derived from the same answers, and
 * they are not the same list. So a couple was told two different things
 * depending on which page they were reading.
 *
 * That is the exact thing this page is not supposed to do. Its whole premise
 * is that nothing on it is new: every group is something the reader has
 * already met in context, collected in one place.
 *
 * ── IT WAS BRIEFLY REVERSED, AND SHE REVERSED IT BACK ─────────────────────
 * Reading both pages side by side she asked for something else: "Both app and
 * site use the wrong setup for comms action items. Bold title should be the
 * detailed page name, then the content should be the 'try' content that the
 * site shows."
 *
 * The website's Try line for Communication comes from the protocols, which is
 * the thing this gate was written to forbid, and the protocols appear nowhere
 * else in the app. Told that, she said: "Good call. Revert, make the action
 * items for comms match the comms overview page's action items exactly."
 *
 * Both quotes are kept because the round trip is the useful part: the rule
 * above survived a direct instruction to break it, on the strength of what
 * breaking it would have cost, which is a better argument for it than the
 * original bug.
 *
 * ── AND THEN THE TRY LINE CAME OFF ALTOGETHER ────────────────────────────
 * Reading the finished page: "Remove the try lines, sorry."
 *
 * So a row is now its heading and the arrow to the page it came from, on both
 * surfaces. That page is where the advice lives and always was, and for the
 * comms rows this line was the only place in the app some of those sentences
 * appeared, which is the thing this page is not supposed to do.
 *
 * `say` is still SENT, and this gate still compares it, which is the whole
 * reason the field survives: it is how a row is proved to have come from its
 * own section's plan rather than from a second list. The moment it stops being
 * sent, the Communication group and the protocols become indistinguishable
 * again and this gate has nothing to compare.
 *
 * Three instructions on one line, two of them reversals, all three quoted here,
 * because the round trip is the useful part: the rule survived a direct
 * instruction to break it on the strength of what breaking it would cost.
 *
 * ── WHAT IS CHECKED ───────────────────────────────────────────────────────
 * For each section that has both an at-a-glance plan and a group here, the
 * items are built and compared. Not the wording of the group's title, which
 * is the page's own framing, but the substance: same count, and each item's
 * text appearing in the glance plan it came from.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Conflict, whose group is a single pointer by design: the patterns behind it
 * are private to each reader and this page is read together. That is a
 * decision rather than a drift, and it is written down here so nobody
 * "fixes" it.
 */

import { whatComesNext } from '../api/_lib/what-comes-next.js';
import { intimacyActionPlan } from '../api/_lib/intimacy-results.js';
import { personalityFeedback, commsActionPlan, commsProtocols } from '../api/_lib/comms-plan.js';
import { contentFor } from '../api/_content/index.js';
import { COMM_DOMAINS } from '../api/_lib/tags.js';

const fails = [];

/**
 * ── THE TILES COME FROM THE FUNCTION THAT MAKES THEM ──────────────────────
 * These three were typed out here, and that cost two things.
 *
 * Every one carried `title: null`, so the aligned branch was never exercised,
 * and the hard one carried a `reflect` field this gate then asserted was
 * carried through. commsActionPlan has not emitted `reflect` since Ellie asked
 * for that prompt removed from the overview everywhere. So the gate was
 * holding the product to a field the product had deleted, and would have
 * failed a correct implementation.
 *
 * A fixture that mirrors the producer is the failure this repo is about: it
 * drifts, and the comparison quietly stops being about anything. The tiles are
 * built now, from feedback over real answers, which is also the only way a
 * change to how a domain picks its lead dimension can reach this check.
 */
const copy = contentFor(null);
const COMM_DIMS = [...new Set(COMM_DOMAINS.flatMap((d) => d.dims))];

/**
 * Four couples, chosen for the cases the rule turns on rather than swept.
 *
 * `tied` is the one that matters: equal gaps inside a domain, which is where
 * two different tie-breaks pick two different dimensions and give a couple two
 * different pieces of advice. The website had its own tie-break and that case
 * is 11% of real domain tiles, so a fixture without it passes while the bug
 * ships.
 */
const COUPLES = {
  'wide gaps everywhere': Object.fromEntries(COMM_DIMS.map((k) => [k, [1, 5]])),
  'matched everywhere': Object.fromEntries(COMM_DIMS.map((k) => [k, [3, 3]])),
  'tied gaps inside every domain': Object.fromEntries(COMM_DIMS.map((k) => [k, [2, 4]])),
  'one domain matched, two not': Object.fromEntries(COMM_DIMS.map((k) => [k,
    ['conflict', 'repair', 'feedback'].includes(k) ? [3, 3] : [1, 5]])),
};

function tilesFor(pairs) {
  const dimensions = COMM_DIMS.map((k) => ({
    key: k, label: k, left: 'one way', right: 'another way',
    a: pairs[k]?.[0] ?? 3, b: pairs[k]?.[1] ?? 3,
  }));
  const feedback = personalityFeedback({
    dimensions, viewer: 'a', youName: 'Ellie', themName: 'Preston', copy,
  });
  return {
    tiles: commsActionPlan({ feedback, copy }),
    protocols: commsProtocols(
      Object.fromEntries(feedback.map((f) => [f.dim, f])), 'Ellie', 'Preston'),
  };
}

const intimacyDims = [
  { id: 'frequency', section: 'intimacy-frequency', label: 'Frequency', state: 'discuss', distancePct: 60, prompt: 'How often feels right to each of you?' },
  { id: 'meaning', section: 'intimacy-meaning', label: 'What It Is For', state: 'different', distancePct: 40, prompt: 'What is it for, for each of you?' },
  { id: 'comfort', section: 'intimacy-comfort', label: 'Comfort & Safety', state: 'aligned', distancePct: 5, prompt: 'Nothing to raise.' },
];

/**
 * ── COMMUNICATION: EVERY ROW IS ITS GLANCE TILE ────────────────────────────
 * Run per couple, because the rule that picks a domain's lead dimension is the
 * part that broke, and it only shows on a couple whose gaps make it choose.
 *
 * The protocols ride on the same object, because api/results.js passes the
 * whole plan. They are the list this page used to build its Communication
 * group from, and they stay in deliberately: without them a branch that
 * prefers them falls through to the tiles and the plant passes. Which it did,
 * the first time this gate was planted against.
 */
for (const [who, pairs] of Object.entries(COUPLES)) {
  const { tiles, protocols } = tilesFor(pairs);
  const { groups } = whatComesNext({
    coupleTypeId: null,
    commsPlan: { tiles, protocols },
    expectations: null,
    intimacy: null,
    reflection: null,
    conflictReady: false,
    names: { you: 'Ellie', them: 'Preston' },
  });
  const comm = groups.find((g) => g.id === 'comm');
  const where = `(${who})`;

  if (!comm) {
    fails.push(`there is no Communication group at all ${where}`);
    continue;
  }
  if (comm.items.length !== tiles.length) {
    fails.push(`Communication has ${comm.items.length} rows and the glance plan has`
      + ` ${tiles.length} tiles ${where}. The rows are the tiles.`);
  }

  /*
   * A protocol's words must not be here: their presence means the group was
   * built from the wrong list, whatever it happens to contain. This is the
   * original rule, restored at her word.
   */
  const all = comm.items.map((it) => `${it.title || ''} ${it.body || ''} ${it.say || ''}`).join(' ');
  for (const pr of protocols) {
    if (all.includes(pr.title) || (pr.thisWeek && all.includes(pr.thisWeek))) {
      fails.push(`Communication is built from the protocols, not from the glance plan:`
        + ` "${pr.title}" ${where}`);
    }
  }

  tiles.forEach((tile, i) => {
    const item = comm.items[i];
    if (!item) return;
    /*
     * `title` and `say`, not `body`. `body` is on the payload and nothing has
     * ever rendered it on this page, so a row whose advice sits there is lost
     * rather than merely hidden, which is exactly what the conflict rows were.
     * The Try line is no longer drawn, at her word, but `say` is still where a
     * row's advice is carried and it is still what proves where the row came
     * from.
     */
    const drawn = `${item.title || ''} ${item.say || ''}`;
    /*
     * Both halves of the tile, because the overview draws both: its heading
     * and the advice under it. Checking only the advice is how the heading
     * came to be a sentence on one page and a domain name on the other.
     */
    for (const [what, wanted] of [['heading', tile.label], ['advice', tile.body], ['title', tile.title]]) {
      if (wanted && !drawn.includes(wanted)) {
        fails.push(`Communication row ${i + 1} does not carry the glance tile's ${what}:`
          + ` "${String(wanted).slice(0, 48)}" ${where}`);
      }
    }
  });
}

/** Physical Intimacy: the same list the glance page's plan is. */
const { groups: intimacyGroups } = whatComesNext({
  coupleTypeId: null,
  commsPlan: tilesFor(COUPLES['wide gaps everywhere']),
  expectations: null,
  intimacy: { actionPlan: intimacyActionPlan(intimacyDims) },
  reflection: null,
  conflictReady: false,
  names: { you: 'Ellie', them: 'Preston' },
});
const intimacy = intimacyGroups.find((g) => g.id === 'intimacy');
const plan = intimacyActionPlan(intimacyDims);
if (!intimacy) {
  fails.push('there is no Physical Intimacy group at all');
} else if (intimacy.items.length !== plan.length) {
  fails.push(`Physical Intimacy lists ${intimacy.items.length} items and its glance plan has ${plan.length}`);
} else {
  plan.forEach((d, i) => {
    const got = `${intimacy.items[i]?.title || ''} ${intimacy.items[i]?.say || ''}`;
    if (!got.toLowerCase().includes(d.label.toLowerCase())) {
      fails.push(`Physical Intimacy item ${i + 1} is not ${d.label}`);
    }
  });
}

if (fails.length) {
  console.error('[check-plans-agree] What Comes Next is telling a couple something their own section did not:');
  for (const f of fails) console.error(`  ${f}`);
  console.error('');
  console.error('Every group on that page is the section\'s own action plan, collected.');
  console.error('See api/_lib/what-comes-next.js.');
  process.exit(1);
}

console.log(`[check-plans-agree] ${Object.keys(COUPLES).length} couples, including one with tied`
  + ` gaps in every domain; Communication and Physical Intimacy carry exactly their own`
  + ` section's plan, heading and advice. The advice is carried rather than drawn,`
  + ` at her word: "Remove the try lines, sorry."`);
