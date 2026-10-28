#!/usr/bin/env node
/**
 * An invited partner of a plain core purchase can reach their results.
 *
 * ── THE BUG THIS ENCODES ──────────────────────────────────────────────────
 * Ellie, of a linked couple who had both finished everything they own: "their
 * results aren't generating because it says his are incomplete... I want
 * their account to function normally now."
 *
 * Nothing was wrong with their data. Both profiles pointed at each other,
 * both had finished Communication and Expectations, neither owned anything
 * else, and api/_lib/results-gate.js returns ready for both of them when run
 * over their exact rows. The SERVER would have served the results.
 *
 * The website refused. Its `_purchased` is the gate's `purchased` argument,
 * and every term in it is something the BUYER's order carries: an order
 * number, a comp flag, a package above core, or an add-on. An invited partner
 * has no order of their own; their device rebuilds a couple-level order from
 * what /api/partner-sync sends as `inherited`, and that carried the add-ons
 * and the workbook and nothing about the grant. So for a plain CORE purchase
 * the invitee satisfied no term at all: `purchased` false, resultsGate
 * answered not_purchased, and the dashboard told them they were waiting on a
 * partner who had finished.
 *
 * For ever, and for every invited partner of every core purchase, which is
 * the ordinary path rather than an edge case. The couple in question had been
 * linked by hand outside checkout, which is why it looked like their fault.
 * It was not.
 *
 * ── HOW IT IS CHECKED ─────────────────────────────────────────────────────
 * By lifting the `_purchased` expression out of src/App.jsx and RUNNING it,
 * over an invitee's rebuilt order, and then feeding the answer to the real
 * resultsGate. The expression is 19,000 lines into a file no gate here can
 * import, so lifting it is the only way to test the copy that ships: the same
 * approach check-card-type-clipping takes with the app's own type scale, for
 * the same reason.
 *
 * A gate that asserted the string `inheritedHasGrant` appears would pass on a
 * field that is sent, carried and never read.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Whether /api/partner-sync actually computes the grant correctly for a given
 * couple. computeEntitlements owns that and has its own tests. This covers the
 * hand-off: that the endpoint sends it, the poll carries it, and the rule
 * reads it, which is the chain that was broken in its middle.
 */
import { readFileSync } from 'node:fs';

import { resultsGate } from '../api/_lib/results-gate.js';

const fails = [];
const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const APP = read('src/App.jsx');
const SYNC = read('api/partner-sync.js');

/* ── 1. THE RULE, LIFTED AND RUN ─────────────────────────────────────────── */
const at = APP.indexOf('const _purchased = !!(');
const end = APP.indexOf(');', at) + 2;
if (at < 0 || end < 2) {
  console.error('[check-invitee-sees-results] could not find `const _purchased = !!(` in'
    + ' src/App.jsx. A gate that has lost its subject must never report success.');
  process.exit(1);
}
const expr = APP.slice(at, end).replace(/\/\*[\s\S]*?\*\//g, ' ');
const purchasedFor = (order, account, pkgKey) =>
  // eslint-disable-next-line no-new-func
  new Function('order', 'account', '_effectivePkgKey', `${expr} return _purchased;`)(order, account, pkgKey);

/* What an invited partner's device actually holds: the order their poll
   rebuilds from `inherited`, for a buyer who bought plain core. No order
   number, no add-ons, package core. */
const inviteeOrder = {
  addonReflection: false, addonBudget: false, addonChecklist: false,
  addonIntimacy: false, addonConflict: false, addonWorkbook: null,
  workbookStatus: null, inheritedFromPartner: true,
  pkg: 'core', comp: false, inheritedHasGrant: true,
};
const inviteeAccount = { isComp: false, joinedViaInvite: true };

if (!purchasedFor(inviteeOrder, inviteeAccount, 'core')) {
  fails.push('the website decides nobody paid for an invited partner of a plain core purchase,'
    + ' whose device holds the buyer\'s grant. resultsGate then answers not_purchased and they'
    + ' wait on a partner who has finished.');
}

/* And the consequence, through the real gate, so the failure is named in the
   terms the customer sees rather than as a boolean. */
const done = { ex1: true, ex2: true, ex3: false, intimacy: false, conflict: false };
const caps = { hasAnniversary: false, hasIntimacy: false, hasConflict: false };
const gate = resultsGate({
  pkg: caps, mine: done, theirs: done, partnerLinked: true,
  purchased: purchasedFor(inviteeOrder, inviteeAccount, 'core'),
});
if (!gate.ready) {
  fails.push(`an invited partner who has finished everything they own is refused their results:`
    + ` the gate answers "${gate.reason}". Both halves of a core couple who have done`
    + ' Communication and Expectations own nothing else, so there is nothing left to wait for.');
}

/* The grant must be the thing doing the work. Without this the test above
   passes on an order that happens to carry something else. */
const { inheritedHasGrant, ...withoutGrant } = inviteeOrder;
if (purchasedFor(withoutGrant, inviteeAccount, 'core')) {
  fails.push('the invitee reads as purchased even with the inherited grant removed, so this test'
    + ' is not measuring the grant. Some other term in `_purchased` is carrying it, and the'
    + ' fixture no longer represents an invited partner of a core purchase.');
}

/* ── 2. THE HAND-OFF, END TO END ─────────────────────────────────────────── */
/**
 * The endpoint has to send it, FROM the computed entitlements.
 *
 * This read `/inherited\.hasGrant\s*=/`, which `inherited.hasGrant = false`
 * satisfies perfectly: the plant that hardcoded it walked through. Matching a
 * name instead of what follows it, which is the fault this repo records more
 * often than any other, made in the gate written to stop a quiet refusal.
 *
 * The value is the rule. computeEntitlements owns whether a set of orders is a
 * grant, so the assignment has to come from its answer.
 */
if (!/inherited\.hasGrant\s*=\s*!!\s*ent\.hasGrant\b/.test(SYNC)) {
  fails.push('api/partner-sync.js does not set inherited.hasGrant from ent.hasGrant, so an'
    + ' invited partner\'s device is either never told that the buyer paid, or told a constant'
    + ' that has nothing to do with the orders.');
}
/**
 * THE POLL MAY NOT TAKE CAPABILITY AWAY, and this is run rather than read.
 *
 * ── TWO WRONG VERSIONS OF THIS CHECK, BOTH MINE ───────────────────────────
 * It first asserted `/inherited\.hasGrant\s*=/`, which `inherited.hasGrant =
 * false` satisfies perfectly, so the plant that hardcoded it walked through.
 * Then it asserted `/inheritedHasGrant:\s*!!json\.inherited\.hasGrant/` and
 * failed the build on a CORRECT change made an hour later, when the merge
 * became grant-only so one bad poll could not un-grant somebody.
 *
 * Matching a name instead of what follows it lets a wrong value through;
 * matching one spelling of an expression fails a right one. Both are a
 * matcher that knows one form, and this repo's own answer is to run the code
 * and compare answers. So the merge is lifted out of src/App.jsx and executed
 * over two responses, which is a rule about values rather than about text.
 *
 * ── THE RULE ──────────────────────────────────────────────────────────────
 * api/partner-sync builds its `inherited` by pre-filling false and then
 * reading the buyer's orders inside a try whose catch only warns. So the
 * shape it sends when a query fails is indistinguishable from "the buyer
 * bought nothing", and eight fields were plain overwrites of what the
 * invitee's browser already knew. One rejected query took their exercises
 * away until the next good poll, on their device only, nothing logged.
 *
 * `capabilitiesFor` on the server unions the order columns with the
 * entitlements blob and can never take access away. This holds the client to
 * the same rule, in both directions: a grant arriving has to land, and a
 * grant already held has to survive a response that knows nothing.
 *
 * Out of scope, deliberately: `carryWorkbook`, which runs on the result and
 * is already `||` all the way down, and `pkg` arriving LOWER from a read that
 * SUCCEEDED, which is the truth rather than a fault.
 */
const liftStart = APP.indexOf('const keep = (mine, theirs)');
const liftAnchor = liftStart === -1 ? -1 : APP.indexOf('inheritedFromPartner: true,', liftStart);
const liftEnd = liftAnchor === -1 ? -1 : APP.indexOf('};', liftAnchor);
if (liftStart === -1 || liftEnd === -1) {
  /* A gate that has lost its subject must never report success. */
  console.error('check-invitee-sees-results FAILED');
  console.error('  - the partner poll\'s merge could not be found in src/App.jsx, so whether an'
    + ' invited partner keeps what they own was not checked at all. If the merge moved, point'
    + ' this gate at it; do not delete the check.');
  process.exit(1);
}
const MERGE_SRC = APP.slice(liftStart, liftEnd + 2);
let runMerge;
try {
  runMerge = new Function('prev', 'json', MERGE_SRC + '\nreturn merged;');
} catch (e) {
  console.error('check-invitee-sees-results FAILED');
  console.error('  - the merge lifted out of src/App.jsx would not run: ' + e.message);
  process.exit(1);
}

/** Everything a buyer can own, as the endpoint sends it. */
const ALL_GRANTED = {
  hasGrant: true, comp: true, pkg: 'premium',
  addonReflection: true, addonBudget: true, addonChecklist: true,
  addonIntimacy: true, addonConflict: true,
  addonWorkbook: 'digital', workbookStatus: 'ready',
};
/** The same facts as the invitee's own browser holds them. */
const ALL_HELD = {
  inheritedHasGrant: true, comp: true, pkg: 'premium',
  addonReflection: true, addonBudget: true, addonChecklist: true,
  addonIntimacy: true, addonConflict: true,
  addonWorkbook: 'digital', workbookStatus: 'ready',
};
/**
 * What partner-sync sends when its orders read throws: its initialiser,
 * untouched. Not a hypothetical. It is the object literal in that file.
 */
const KNOWS_NOTHING = {
  hasGrant: false, comp: false, pkg: null,
  addonReflection: false, addonBudget: false, addonChecklist: false,
  addonIntimacy: false, addonConflict: false,
  addonWorkbook: '', workbookStatus: null,
};

/**
 * The one field whose name differs on the two sides. The endpoint calls it
 * `hasGrant`, because it is the buyer's; the order calls it
 * `inheritedHasGrant`, because on this device it came from somebody else.
 * Without the mapping a dropped grant reported "the endpoint sent undefined",
 * which is a true statement about the fixture and a false one about the bug.
 */
const SENT_AS = { inheritedHasGrant: 'hasGrant' };

/* 1. A grant arriving has to land on a device that knows nothing. */
const landed = runMerge({}, { inherited: ALL_GRANTED });
for (const [k, want] of Object.entries(ALL_HELD)) {
  if (landed[k] !== want) {
    const sent = ALL_GRANTED[SENT_AS[k] || k];
    fails.push(`the poll does not carry ${k} onto the rebuilt order: the endpoint sent `
      + `${JSON.stringify(sent)} and the order came back ${JSON.stringify(landed[k])}.`
      + ' An invited partner is not told what the buyer paid for.');
  }
}

/* 2. A grant already held has to survive a response that knows nothing. */
const survived = runMerge({ ...ALL_HELD }, { inherited: KNOWS_NOTHING });
for (const [k, want] of Object.entries(ALL_HELD)) {
  if (survived[k] !== want) {
    fails.push(`one failed poll takes ${k} away from an invited partner: they held `
      + `${JSON.stringify(want)}, api/partner-sync answered with its initialiser because its`
      + ` orders read threw, and the merge wrote ${JSON.stringify(survived[k])} over the truth.`);
  }
}

/**
 * 3. And nothing arriving must grant nothing.
 *
 * Without this the first two tests are satisfied by `inheritedHasGrant: true`
 * written as a constant: a grant always lands, and a grant always survives.
 * That is the shape this repo records more than any other, a branch disabled
 * with a constant, and it would hand every invited partner of every account
 * the results of a purchase nobody made.
 */
const empty = runMerge({}, { inherited: KNOWS_NOTHING });
const NOTHING_LOOKS_LIKE = {
  inheritedHasGrant: false, comp: false, pkg: 'core',
  addonReflection: false, addonBudget: false, addonChecklist: false,
  addonIntimacy: false, addonConflict: false,
  addonWorkbook: null, workbookStatus: null,
};
for (const [k, want] of Object.entries(NOTHING_LOOKS_LIKE)) {
  if (empty[k] !== want) {
    fails.push(`the poll grants ${k} to a device that holds nothing when the endpoint sent`
      + ` nothing either: it came back ${JSON.stringify(empty[k])} rather than`
      + ` ${JSON.stringify(want)}. A merge that always says yes is not a merge.`);
  }
}

/* 4. And the endpoint has to answer "unknown" rather than "core", or the test
      above cannot tell a failed read from a real core purchase. */
if (!/pkg:\s*null\s*\}/.test(SYNC) || /inherited\.pkg\s*=\s*ent\.pkg\s*\|\|\s*'core'/.test(SYNC)) {
  fails.push('api/partner-sync initialises or defaults the inherited package to \'core\' rather'
    + ' than null, so a failed orders read is sent as a real answer and the browser cannot tell'
    + ' it from a buyer who really did buy core.');
}

if (fails.length) {
  console.error('check-invitee-sees-results FAILED');
  for (const f of fails) console.error('  - ' + f);
  process.exit(1);
}
console.log('[check-invitee-sees-results] the website\'s own purchased rule, lifted and run: an'
  + ' invited partner of a plain core purchase reads as purchased, the real gate then opens their'
  + ' results, and removing the inherited grant closes them again. The poll\'s merge is lifted and'
  + ' run too, over all ten inherited fields three ways: a grant arriving lands, a grant already'
  + ' held survives a response that knows nothing, and nothing arriving grants nothing.');
