/**
 * Everybody who can invite a partner leaves profile creation with a code.
 *
 * ── THE PROMISE ───────────────────────────────────────────────────────────
 * Ellie, of Rebecca: "Did she invite a partner? If no to any of that, we need
 * to prompt her with it immediately."
 *
 * Rebecca's row carried Abram's name and Abram's email and no invite code, so
 * nothing could ever be sent to him. The cause was not her sign-up: the code
 * was minted in exactly one place, `genInvite` in src/App.jsx, which is the
 * website. api/create-profile.js stored whatever a client sent and null when
 * it sent nothing, and the app sends a code only when somebody is JOINING on
 * an invite of someone else's.
 *
 * So every FIRST partner who set up in the app got no code, had their
 * partner's email collected, and could never invite them. The app is the path
 * Ellie wants everyone on.
 *
 * Four things held here:
 *
 *   1. A first partner always ends up with a code, whether the client sent one
 *      or not, measured by running the rule rather than by reading for it.
 *   2. A second partner never gets one of their own. Two codes on one couple
 *      makes "which code is this couple" a question with two answers.
 *   3. A code the client DID send is kept. The website builds the invite URL
 *      from the code it sent in the same breath, so replacing it would send an
 *      invite to a code nobody holds.
 *   4. The endpoint hands back what it stored, so a caller builds its link
 *      from the row rather than from what it hoped it sent.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Whether the invite is ever SENT. That is a surface question, and today the
 * app has no invite screen at all, which is S76 in TASKS.md and a decision for
 * Ellie rather than a bug to fix quietly. This gate is only about the code
 * existing, which is the thing that made sending impossible.
 *
 * It also says nothing about the code being secret. It is a lookup key that
 * travels in a URL and an email; nothing is authorised by holding one.
 */
import { readFileSync } from 'fs';
import { newInviteCode, needsInviteCode } from '../api/_lib/invite-code.js';

const fails = [];
const fail = (m) => fails.push(m);

// ── 1, 2, 3: the rule, run ───────────────────────────────────────────────
const cases = [
  ['a first partner who sent no code', { invite_code: null, joined_via_invite: false }, true],
  ['a first partner who sent an empty string', { invite_code: '', joined_via_invite: false }, true],
  ['a first partner who sent only spaces', { invite_code: '   ', joined_via_invite: false }, true],
  ['a first partner who sent a code', { invite_code: 'WEBSITE1', joined_via_invite: false }, false],
  ['a second partner joining on an invite', { invite_code: null, joined_via_invite: true }, false],
  ['a second partner carrying the first one\'s code', { invite_code: 'WEBSITE1', joined_via_invite: true }, false],
];
for (const [what, row, want] of cases) {
  const got = needsInviteCode(row);
  if (got !== want) fail(`${what}: needsInviteCode said ${got}, expected ${want}`);
}
if (needsInviteCode(null) || needsInviteCode(undefined)) fail('needsInviteCode invents a code for no row at all');

// ── The codes themselves ─────────────────────────────────────────────────
{
  const n = 50000;
  const seen = new Set();
  for (let i = 0; i < n; i++) seen.add(newInviteCode());
  if (seen.size !== n) fail(`${n - seen.size} duplicate(s) in ${n} codes`);

  const sample = [...seen].slice(0, 2000);
  // The app accepts A-Z0-9 and a dash, 4 to 32. A code it would refuse is a
  // code nobody can type in, which is this bug with extra steps.
  const APP_ACCEPTS = /^[A-Z0-9-]{4,32}$/;
  for (const c of sample) {
    if (!APP_ACCEPTS.test(c)) { fail(`the app's own check would refuse the code ${c}`); break; }
  }
  // No O/0 or I/1 together, because these are read off a screen and retyped.
  const AMBIGUOUS = /[O0I1]/;
  const bad = sample.filter((c) => AMBIGUOUS.test(c));
  if (bad.length) {
    fail(`${bad.length} of ${sample.length} codes contain an O, 0, I or 1 (e.g. ${bad[0]}),`
      + ' which are the characters that get mistyped off a screen');
  }
  // Every letter of the alphabet should actually turn up, or the generator is
  // biased in a way a spot check would not show.
  const used = new Set(sample.join('').split(''));
  if (used.size < 30) fail(`only ${used.size} distinct characters across ${sample.length} codes; the draw is biased`);
}

// ── 1 and 4, in the endpoint ─────────────────────────────────────────────
{
  const src = readFileSync(new URL('../api/create-profile.js', import.meta.url), 'utf8')
    // Comments explain this rule at length and name every identifier in it.
    .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  if (!/needsInviteCode\(\s*profile\s*\)/.test(src)) {
    fail('create-profile does not ask needsInviteCode about the row it is about'
      + ' to write, so a client that sends nothing stores null');
  }
  if (!/profile\.invite_code\s*=\s*newInviteCode\(\)/.test(src)) {
    fail('create-profile never mints a code, so the rule is asked and ignored');
  }
  if (!/inviteCode:\s*profile\.invite_code/.test(src)) {
    fail('create-profile does not return the code it stored, so a caller has to'
      + ' guess what is in the row');
  }
  // The guard has to be a question about the row, not a constant. `if (true)`
  // and `if (false)` both leave every identifier above exactly where it was.
  if (/if\s*\(\s*(true|false)\s*\)\s*profile\.invite_code/.test(src)) {
    fail('the mint is behind a constant rather than behind the rule');
  }
}

// ── The backfill exists and leaves the second partner alone ──────────────
//
// Scoped to the UPDATE statement, not to the file. The first version tested
// the whole of 094 for the word `joined_via_invite` and for a `coalesce` on
// the code, and both appear in the SELECTs that report before and after. So
// deleting the guards from the UPDATE itself changed nothing the gate could
// see, and two plants walked straight through. Matching a name instead of the
// place it has to be, which is this repo's oldest way of writing a blind gate.
{
  const sql = readFileSync(new URL('../supabase/migrations/094_mint_missing_invite_codes.sql', import.meta.url), 'utf8');
  const stripped = sql.replace(/^\s*--.*$/gm, '');

  const writes = [...stripped.matchAll(/\bupdate\s+public\.profiles[\s\S]*?;/gi)].map((m) => m[0]);
  if (writes.length !== 1) {
    fail(`094 has ${writes.length} update statements against profiles, expected exactly 1.`
      + ' A second one is a second copy of this rule.');
  }
  const update = writes[0] || '';

  if (!/invite_code\s*=/.test(update)) {
    fail('094 no longer fills a code in, so the people this already happened to keep none');
  }
  if (!/joined_via_invite\s*,\s*false\s*\)\s*=\s*false/.test(update)) {
    fail('the UPDATE in 094 does not exclude the second partner, so it would put a'
      + ' second code on a couple that already has one. The word appears in the'
      + ' reporting selects either way, which is why this reads the statement.');
  }
  if (!/coalesce\(\s*p?\.?invite_code\s*,\s*''\s*\)\s*=\s*''/i.test(update)) {
    fail('the UPDATE in 094 is not restricted to rows with no code, so it would'
      + ' overwrite a code that is already out in an invite link somebody holds');
  }
  // A per-row expression, not one value handed to every row. The unique index
  // would reject the second row, so the symptom is a failed migration rather
  // than two couples sharing a key, but she would be the one to find it.
  if (!/p\.id/.test(update.slice(update.indexOf('invite_code ='), update.indexOf('where')))) {
    fail("the code in 094 is not derived from the row's own id, so it may be"
      + ' evaluated once and handed to every row');
  }
}

if (fails.length) {
  console.error('[check-invite-code-minted] FAILED');
  for (const f of fails) console.error('  ✖ ' + f);
  process.exit(1);
}

console.log('[check-invite-code-minted] a first partner always leaves profile creation with a code,'
  + ' whatever the client sent; a second partner never gets one of their own; a code the client did send'
  + ' is kept; and the endpoint returns what it stored. 50000 codes, all distinct, none containing an'
  + ' O, 0, I or 1, all acceptable to the app\'s own check. 094 fills the rows this already happened to'
  + ' and leaves both the second partner and any existing code alone.');
