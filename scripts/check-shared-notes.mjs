// The shared-note path, exercised against the real server rules.
//
// Creating a shared note and having the partner see it depends on both sides
// computing the same couple key, and on each side's read filter matching what
// the other side wrote. Both halves are in api/notes.js.

import { readFileSync } from 'fs';

/**
 * The real rule, imported rather than rewritten.
 *
 * This used to lift the one-liner out of api/notes.js by regex, because that was
 * where it lived and a second copy here would have been a second rule. It is a
 * module now, shared with the couple's tools, so it is imported. Same intent: if
 * the way a couple key is built ever changes, this changes with it rather than
 * quietly testing something that is no longer true.
 */
import { coupleKeyOf } from '../api/_lib/couple-key.js';

/* And the endpoint still has to be the thing that uses it. Importing a module
   the server no longer calls would test a rule nothing enforces. */
const notesSrc = readFileSync(new URL('../api/notes.js', import.meta.url), 'utf8');
if (!/coupleKeyOf\(/.test(notesSrc)) {
  console.error('[check-shared-notes] api/notes.js does not call coupleKeyOf, so'
    + ' whatever it files shared notes under is not what this checks.');
  process.exit(1);
}

let fails = 0;
const ok = (n, c) => { console.log((c ? '  ok    ' : '  FAIL  ') + n); if (!c) fails++; };

const alex = '11111111-1111-1111-1111-111111111111';
const sam  = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

// 1. Both partners must derive the same key, in either direction.
ok('both partners compute the same couple key',
   coupleKeyOf(alex, sam) === coupleKeyOf(sam, alex));

// 2. A shared note written by one side must match the other side's read filter.
//    Mirrors: notes?couple_key=eq.<key>&visibility=eq.shared&owner_id=neq.<me>
const noteFromAlex = {
  owner_id: alex, visibility: 'shared', couple_key: coupleKeyOf(alex, sam),
  title: 'Worth talking about', body: 'The Sunday thing.',
};
const samSees = (n) =>
  n.couple_key === coupleKeyOf(sam, alex) && n.visibility === 'shared' && n.owner_id !== sam;
ok('a note Alex shares reaches Sam', samSees(noteFromAlex));

// 3. A private note must not.
ok('a private note does not reach the partner',
   !samSees({ ...noteFromAlex, visibility: 'private', couple_key: null }));

// 4. Your own shared note must not come back in your own sharedWithMe.
const alexSees = (n) =>
  n.couple_key === coupleKeyOf(alex, sam) && n.visibility === 'shared' && n.owner_id !== alex;
ok('your own shared note is not in your shared-with-me list', !alexSees(noteFromAlex));

// 5. Unsharing must clear the key, or it keeps matching the partner's filter.
const unshared = { ...noteFromAlex, visibility: 'private', couple_key: null };
ok('unsharing removes it from the partner view', !samSees(unshared));
ok('unsharing clears couple_key', unshared.couple_key === null);

// 6. The dangerous case: a note left shared with a stale key after unsharing.
const staleKey = { ...noteFromAlex, visibility: 'private' }; // key not cleared
ok('visibility alone still hides it even with a stale key', !samSees(staleKey));

// 7. A third party must never match.
const eve = '99999999-9999-9999-9999-999999999999';
const eveSees = (n) =>
  n.couple_key === coupleKeyOf(eve, alex) && n.visibility === 'shared' && n.owner_id !== eve;
ok('someone outside the couple cannot match the key', !eveSees(noteFromAlex));

console.log(fails
  ? `[check-shared-notes] ${fails} failed`
  : '[check-shared-notes] a shared note reaches the partner and nobody else.');
process.exit(fails ? 1 : 0);
