// Fails the build when the app can talk itself into being signed out.
//
// ── WHAT HAPPENED ──────────────────────────────────────────────────────────
// Ellie opened Resources, saw it flash content, and was asked to sign in
// again. Two separate defects on that path can do it, and both are of the same
// kind: a moment of not knowing who someone is, recorded as the fact that they
// are nobody.
//
// 1. session.ts cached a FAILED keychain read.
//
//    getToken caches its result and only re-reads when the cache is
//    `undefined`. The catch branch wrote `null`. A keychain read can fail
//    while the device is locked, which lasts a second; the cached null lasted
//    until the app was killed. Every screen, every retry, every pull to
//    refresh was signed out. Signing in again fixed it, which is precisely why
//    it read as an expiry rather than a bug.
//
// 2. client.ts declared unauthorized on an empty token without refreshing.
//
//    The 401 path has always refreshed. The no-token-at-all path never did.
//    But the two tokens live in separate keychain entries and are written by
//    separate calls, and setToken swallows a failed write to keep going in
//    memory. So an app can legitimately restart holding a good refresh token
//    and no access token, and be told to sign in while holding everything it
//    needed to continue.
//
// ── WHAT THIS CHECKS ───────────────────────────────────────────────────────
// Both, statically. Neither is reachable from a unit test without standing up
// a fake keychain, and a fake keychain that returns what we tell it to proves
// only that our fake works.
//
// ── WHAT IT DOES NOT CHECK ─────────────────────────────────────────────────
// That the refresh itself succeeds, or that a genuinely expired session shows
// the sign-in screen. It should: being signed out is a real state and the app
// must be able to say so. This only checks the app does not decide it on
// evidence that does not support it.

import { readFileSync } from 'fs';

const ROOT = new URL('..', import.meta.url).pathname;
const problems = [];

// ── 1. A failed keychain read must not be remembered ───────────────────────
const session = readFileSync(ROOT + 'attune-app/src/api/session.ts', 'utf8');
const getTokenBody = session.match(
  /export async function getToken\([^)]*\)[^{]*\{([\s\S]*?)\n\}/);
if (!getTokenBody) {
  problems.push('attune-app/src/api/session.ts: cannot find getToken to check it');
} else {
  const body = getTokenBody[1];
  const catchBlock = body.match(/\}\s*catch[^{]*\{([\s\S]*?)\n  \}/);
  if (!catchBlock) {
    problems.push('session.ts getToken no longer guards the keychain read at all');
  } else if (/\bcached\s*=/.test(catchBlock[1])) {
    problems.push(
      'attune-app/src/api/session.ts: getToken writes to `cached` when the keychain\n'
      + '      read FAILS. The cache is only re-read when it is undefined, so that one\n'
      + '      failure signs the person out for the whole life of the process.\n'
      + '      Return null for this call and leave the cache alone.');
  }
}

// ── 2. An empty token must try the refresh token before giving up ──────────
const client = readFileSync(ROOT + 'attune-app/src/api/client.ts', 'utf8');
const requestBody = client.match(
  /async function request<T>\([\s\S]*?\n  if \(res\.status === 401\)/);
if (!requestBody) {
  problems.push('attune-app/src/api/client.ts: cannot find request() to check it');
} else {
  const preamble = requestBody[0];
  const noToken = preamble.indexOf("detail: 'no token stored'");
  const refreshes = preamble.indexOf('refreshOnce()');
  if (noToken === -1) {
    problems.push('client.ts request() no longer reports a missing token');
  } else if (refreshes === -1 || refreshes > noToken) {
    problems.push(
      'attune-app/src/api/client.ts: request() reports unauthorized for a missing\n'
      + '      access token without calling refreshOnce() first. The refresh token is a\n'
      + '      separate keychain entry written by a separate call, so no access token\n'
      + '      does not mean no session.');
  }
}

// ── 3. A refresh that could not be carried out is not a sign-out ───────────
//
// refreshSession returned a boolean, and every failure was false: no refresh
// token, a keychain that would not open, Supabase returning a 500, the phone
// being offline. The client turned false into unauthorized and the screen
// showed sign-in.
//
// Only one of those is being signed out. Ellie hit the others twice: "When I
// first clicked into this, I was prompted to sign in again. I clicked out then
// back in and it went away." It went away because the next attempt worked.
// Nothing about her session had ended; one call had failed to find out.
const authFile = readFileSync(ROOT + 'attune-app/src/api/auth.ts', 'utf8');

/**
 * refreshSession's body, not the whole file.
 *
 * The first version of this grepped the file, and a plant that removed the
 * 400/401 check from refreshSession still passed: signInWithPassword makes the
 * same check thirty lines further up, so the pattern was found somewhere it
 * proved nothing about. A gate that finds the right string in the wrong
 * function is a gate that passes for the wrong reason.
 */
const auth = (() => {
  const at = authFile.indexOf('export async function refreshSession');
  if (at === -1) return '';
  const end = authFile.indexOf('\n}', at);
  return authFile.slice(at, end === -1 ? authFile.length : end);
})();

if (!auth) {
  problems.push('attune-app/src/api/auth.ts has no refreshSession to check.');
}

if (!/Promise<RefreshOutcome>/.test(auth)) {
  problems.push(
    "attune-app/src/api/auth.ts: refreshSession no longer reports three outcomes.\n"
    + '      A boolean cannot tell "there is no session" from "we could not find out",\n'
    + '      and the caller turns the second into a sign-in screen.');
} else {
  // The server's answer decides. 400 and 401 mean the refresh token is done;
  // anything else is the server having a bad minute, and throwing someone back
  // to a password prompt over a 503 is the product losing its nerve.
  if (!/res\.status === 400 \|\| res\.status === 401/.test(auth)) {
    problems.push(
      'refreshSession no longer distinguishes a refused token from a failed request.\n'
      + '      Only 400 and 401 mean signed out; every other status is unavailable.');
  }
  for (const [what, re] of [
    ['the keychain read', /catch \{[\s\S]{0,200}?return 'unavailable'/],
    ['the network call', /catch \{\s*\n?\s*return 'unavailable';\s*\/\/ no connection/],
  ]) {
    if (!re.test(auth)) {
      problems.push(`refreshSession no longer treats a failure of ${what} as unavailable.`);
    }
  }
}

if (!/outcome === 'unavailable'[\s\S]{0,400}?kind: 'offline'/.test(client)) {
  problems.push(
    "attune-app/src/api/client.ts: an undetermined refresh is not reported as offline.\n"
    + '      Every screen already keeps its last good payload for offline and says so.\n'
    + '      Reporting it as unauthorized is what puts a sign-in screen in front of\n'
    + '      someone whose session is fine.');
}

if (problems.length) {
  console.error('[check-session-recovery] the app can sign someone out on bad evidence:');
  for (const p of problems) console.error(`  ${p}`);
  console.error('');
  console.error('Not knowing who someone is right now is not the same as knowing they');
  console.error('are nobody. Only the second one is worth showing a sign-in screen for.');
  process.exit(1);
}

console.log(
  '[check-session-recovery] a failed keychain read is not remembered, an empty token '
  + 'tries the refresh, and a refresh that could not run is not a sign-out.');
