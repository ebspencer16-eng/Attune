// Fails the build when the one write that touches another person's note stops
// being narrow.
//
// ── WHY THIS NEEDS ITS OWN GATE ────────────────────────────────────────────
// Every write in /api/notes is scoped `owner_id=eq.<caller>`. That single
// clause is the authorisation for all of them: another person's note matches
// nothing, so an edit, a delete or a reshare cannot reach it.
//
// `open` is the exception, and it exists because "which of these are unread"
// needs a mark that only the reader can make. The reader is not the owner. So
// it writes to a row somebody else owns, deliberately, and everything that
// makes that safe is in its filter rather than in the shape of the endpoint.
//
// Four clauses, and all four matter:
//
//   id              the note being opened
//   couple_key      it belongs to this caller's couple
//   visibility      it was actually shared, not private
//   owner_id NEQ    it is the partner's note, not the caller's own
//
// Drop couple_key and any shared note in the product is reachable by anyone.
// Drop visibility and a private note can be written to. Drop the owner clause
// and the action becomes a way to touch your own rows through a path with no
// ownership check, which is the one thing every other action here refuses.
//
// And it must write one column. A PATCH that can set anything, on a row the
// caller does not own, is not an open receipt.

import { readFileSync } from 'fs';

const ROOT = new URL('..', import.meta.url).pathname;
const src = readFileSync(ROOT + 'api/notes.js', 'utf8');

const problems = [];

const at = src.indexOf("if (action === 'open')");
if (at === -1) {
  problems.push("api/notes.js has no 'open' action. Unread state on shared notes depends on it.");
} else {
  const end = src.indexOf('return json({ ok: true, opened:', at);
  const body = src.slice(at, end === -1 ? at + 2000 : end);

  const REQUIRED = [
    ['couple_key=eq.', 'the couple key, without which every shared note in the product is reachable'],
    ['visibility=eq.shared', 'the shared check, without which a private note can be written to'],
    ['owner_id=neq.', "the owner check, without which this becomes a write to your own rows with no ownership filter"],
  ];
  for (const [needle, why] of REQUIRED) {
    if (body.includes(needle)) continue;
    problems.push(`the 'open' action no longer filters on ${needle}\n      That clause is ${why}.`);
  }

  // One column, and it is a timestamp.
  const patched = [...body.matchAll(/JSON\.stringify\(\{([^}]*)\}\)/g)].map((m) => m[1]);
  for (const p of patched) {
    const keys = [...p.matchAll(/(\w+)\s*:/g)].map((m) => m[1]);
    const extra = keys.filter((k) => k !== 'opened_at');
    if (extra.length) {
      problems.push(
        `the 'open' action writes ${extra.join(', ')} as well as opened_at.\n`
        + '      It is a receipt on a row the caller does not own, and a receipt sets one\n'
        + '      timestamp. Anything else belongs on an action the owner calls.');
    }
  }

  if (!/method:\s*'PATCH'/.test(body)) {
    problems.push("the 'open' action is no longer a PATCH. It must not create or delete anything.");
  }
}

// And the general rule it is the exception to: every OTHER write still scopes
// by owner. If that stops being true, this gate is guarding a door in a wall
// that no longer exists.
const scope = src.match(/const scope = `notes\?id=eq\.\$\{noteId\}&owner_id=eq\.\$\{me\}`/);
if (!scope) {
  problems.push(
    'the shared scope for update/share/delete no longer filters on owner_id.\n'
    + '      Those actions are authorised by that clause and nothing else.');
}

if (problems.length) {
  console.error('[check-note-open] the cross-owner write is wider than it should be:');
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

console.log(
  "[check-note-open] 'open' writes one timestamp, to a shared note, in the caller's "
  + 'couple, owned by someone else; every other write is owner-scoped.');
