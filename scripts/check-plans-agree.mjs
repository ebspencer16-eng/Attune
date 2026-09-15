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

const fails = [];

/** A plan with three domains, as the glance page draws it. */
const tiles = [
  { domain: 'inner', label: 'Internal Processing', color: '#9B5DE5', dim: 'energy', title: null, body: 'Say the thing you are chewing on out loud before it is finished.' },
  { domain: 'connection', label: 'How You Connect', color: '#E8673A', dim: 'love', title: null, body: 'Name one bid you missed this week.' },
  { domain: 'hard', label: 'When Things Get Hard', color: '#1B5FE8', dim: 'conflict', title: null, body: 'Agree the pause before you need it.', reflect: 'And ask whether you are trying to understand or to win.' },
];

const intimacyDims = [
  { id: 'frequency', section: 'intimacy-frequency', label: 'Frequency', state: 'discuss', distancePct: 60, prompt: 'How often feels right to each of you?' },
  { id: 'meaning', section: 'intimacy-meaning', label: 'What It Is For', state: 'different', distancePct: 40, prompt: 'What is it for, for each of you?' },
  { id: 'comfort', section: 'intimacy-comfort', label: 'Comfort & Safety', state: 'aligned', distancePct: 5, prompt: 'Nothing to raise.' },
];

/**
 * The protocols ride on the same object, because api/results.js passes the
 * whole plan. They are the list this page used to build its Communication
 * group from, and they are deliberately in the fixture: without them a branch
 * that prefers them falls through to the tiles and the plant passes. Which it
 * did, the first time this gate was planted against.
 */
const protocols = [
  { title: 'Name the pause', thisWeek: 'Agree a word that means stop.' },
  { title: 'Say the unfinished thought', thisWeek: 'Before it is tidy.' },
  { title: 'Ask the second question', thisWeek: 'One more than feels natural.' },
];

const { groups } = whatComesNext({
  coupleTypeId: null,
  commsPlan: { tiles, protocols },
  expectations: null,
  intimacy: { actionPlan: intimacyActionPlan(intimacyDims) },
  reflection: null,
  conflictReady: false,
  names: { you: 'Ellie', them: 'Preston' },
});

const byId = Object.fromEntries(groups.map((g) => [g.id, g]));

/** Communication: the same three tiles, in the same order. */
const comm = byId.comm;
if (!comm) {
  fails.push('there is no Communication group at all');
} else {
  if (comm.items.length !== tiles.length) {
    fails.push(`Communication lists ${comm.items.length} items and the glance plan has ${tiles.length}`);
  }
  // A protocol's words must not be here: their presence means the group was
  // built from the wrong list, whatever it happens to contain.
  const all = comm.items.map((it) => `${it.title || ''} ${it.body || ''} ${it.say || ''}`).join(' ');
  for (const pr of protocols) {
    if (all.includes(pr.title) || (pr.thisWeek && all.includes(pr.thisWeek))) {
      fails.push(`Communication is built from the protocols, not from the glance plan: "${pr.title}"`);
    }
  }
  tiles.forEach((tile, i) => {
    const item = comm.items[i];
    if (!item) return;
    const wanted = tile.body || tile.title;
    const got = `${item.title || ''} ${item.body || ''} ${item.say || ''}`;
    if (wanted && !got.includes(wanted)) {
      fails.push(`Communication item ${i + 1} does not carry the glance tile's advice: "${String(wanted).slice(0, 48)}"`);
    }
    if (tile.reflect && !got.includes(tile.reflect)) {
      fails.push(`Communication item ${i + 1} drops the extra line the glance tile carries`);
    }
  });
}

/** Physical Intimacy: the same list the glance page's plan is. */
const intimacy = byId.intimacy;
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

console.log(`[check-plans-agree] ${groups.length} groups; Communication and Physical Intimacy carry exactly their own section's plan.`);
