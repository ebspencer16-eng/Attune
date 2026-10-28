#!/usr/bin/env node
/**
 * A partner's progress is read from the PARTNER's answers.
 *
 * ── THE BUG THIS ENCODES ──────────────────────────────────────────────────
 * Ellie: "Rebecca was seeing that abram's exercises were incomplete when they
 * were not."
 *
 * src/App.jsx stores the linked partner's answers in localStorage under
 * `attune_partner_session`, and the dashboard reads a partner's per-exercise
 * status from it. An invitee's own device ALSO writes a routing marker to that
 * same key, holding that person's OWN ex1 and ex2 and no partnerProfileId, so
 * that someone who finished on another device is not sent back into the
 * exercise flow.
 *
 * `_partnerLinked` accepted a session with no partnerProfileId as long as its
 * inviteCode matched the account's, which the marker's does. So on an
 * invitee's device `partnerEx1Done` and `partnerEx2Done` were computed from
 * that person's own answers, and the partner column reported the other person
 * as complete or incomplete according to what the reader had done.
 *
 * Nothing threw. Both objects have an ex1 and an ex2; only whose they are
 * differs, and no shape distinguishes them.
 *
 * ── WHAT IT CHECKS ────────────────────────────────────────────────────────
 * By lifting the three derivations out of src/App.jsx and RUNNING them over
 * both shapes a partner session can take:
 *
 *   a real partner session   partnerProfileId + their answers  -> partner read
 *   a self marker            selfMarker + my own answers       -> no partner
 *
 * The first version of the fix labelled the marker and excluded the label.
 * This gate refused it on its first run, and was right: every marker already
 * sitting in a browser carries no label, so the people affected would have
 * stayed affected. partnerProfileId is the only field that says a set of
 * answers belongs to somebody else, so that is the only test, and this gate
 * fails if the inviteCode fallback returns.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Whether the poll delivers the partner's answers at all. That is a request at
 * runtime; this is about what the dashboard concludes from what it holds. The
 * couple-type computation is already safe by a different route: it reads
 * partnerEx1/partnerEx2, which require hasRealPartner, which has always
 * required partnerProfileId.
 */
import { readFileSync } from 'node:fs';

const APP = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const fails = [];

/* ── The derivations, lifted and run ─────────────────────────────────────── */
const grab = (start, endMark) => {
  const at = APP.indexOf(start);
  if (at < 0) return null;
  const end = APP.indexOf(endMark, at);
  return end < 0 ? null : APP.slice(at, end + endMark.length);
};
/* To the end of its own statement. This looked for `');'`, which was the end
   of _partnerLinked when it was a two-term expression and, once it became one
   term, was the end of partnerEx1Done three lines further down: the lifted
   body then declared that name twice and the gate died on a SyntaxError.
   A fixed closing token is a guess about a shape; the statement's own
   semicolon is not. */
const linked = grab('const _partnerLinked =', ';');
const ex1Done = grab('const partnerEx1Done =', ';');
const ex2Done = grab('const partnerEx2Done =', ';');
if (!linked || !ex1Done || !ex2Done) {
  console.error('[check-partner-status-is-the-partner] could not find _partnerLinked /'
    + ' partnerEx1Done / partnerEx2Done in src/App.jsx. A gate that has lost its subject must'
    + ' never report success.');
  process.exit(1);
}
const body = `${linked}\n${ex1Done}\n${ex2Done}\nreturn { _partnerLinked, partnerEx1Done, partnerEx2Done };`
  .replace(/\/\*[\s\S]*?\*\//g, ' ');
// eslint-disable-next-line no-new-func
const run = new Function('partnerSession', 'account', body);

const mine = { a: 1 };
const theirs = { b: 2 };

/* A real partner session: their answers, and the link. */
const real = run({ partnerProfileId: 'THEM', ex1: theirs, ex2: theirs }, { inviteCode: 'CODE1' });
if (!real._partnerLinked || !real.partnerEx1Done || !real.partnerEx2Done) {
  fails.push('a real partner session, carrying partnerProfileId and both answer sets, does not'
    + ' read as a linked partner who has finished. The dashboard would report a partner who has'
    + ' finished as not having.');
}

/* The routing marker an invitee's own device writes: my answers, my code. */
const self = run({ selfMarker: true, inviteCode: 'CODE1', ex1: mine, ex2: mine }, { inviteCode: 'CODE1' });
if (self.partnerEx1Done || self.partnerEx2Done) {
  fails.push("an invitee's own routing marker reads as their PARTNER having finished. The"
    + ' dashboard reports the other person\'s progress from the reader\'s own answers:'
    + ' complete when they are not, and incomplete when they are.');
}

/* And the same marker without the flag must still not pass, or the fix rests
   on a field a future writer can forget. */
const unlabelled = run({ inviteCode: 'CODE1', ex1: mine, ex2: mine }, { inviteCode: 'CODE1' });
if (unlabelled.partnerEx1Done || unlabelled.partnerEx2Done) {
  fails.push('a session with answers, a matching inviteCode and NO partnerProfileId reads as a'
    + ' partner. Whoever wrote it, there is no partner in it: the only thing that says these'
    + " answers belong to somebody else is partnerProfileId.");
}

/* ── The one test, and no other ──────────────────────────────────────────── */
/* The inviteCode fallback is what matched the marker. If it comes back, so
   does the bug, and no amount of labelling the writer prevents it: the markers
   already in people's browsers carry no label. */
if (/_partnerLinked[\s\S]{0,400}?inviteCode\s*===\s*account\?\.inviteCode/.test(APP)) {
  fails.push('_partnerLinked accepts a matching inviteCode again. That is what read an'
    + " invitee's own routing marker as their partner, and a marker already in a browser cannot"
    + ' be labelled retroactively. partnerProfileId is the only field that says the answers'
    + ' belong to somebody else.');
}
/* Matched with the key it is written under, because the marker is only
   dangerous because it shares that key with the partner's answers. */
if (!/attune_partner_session['"]\s*,\s*JSON\.stringify\(_marker\)/.test(APP)) {
  fails.push('the routing marker is no longer written to attune_partner_session. If it moved to'
    + ' a key of its own that is strictly better, and this gate and its reader exclusion should'
    + ' be deleted in the same commit rather than left as cover for a path that no longer exists.');
}

if (fails.length) {
  console.error('check-partner-status-is-the-partner FAILED');
  for (const f of fails) console.error('  - ' + f);
  process.exit(1);
}
console.log('[check-partner-status-is-the-partner] the three partner-status derivations, lifted'
  + " from src/App.jsx and run: a real partner session reads as finished, an invitee's own routing"
  + ' marker reads as no partner, and a session with answers but no partnerProfileId reads as no'
  + ' partner whether or not it is labelled.');
