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

if (problems.length) {
  console.error('[check-session-recovery] the app can sign someone out on bad evidence:');
  for (const p of problems) console.error(`  ${p}`);
  console.error('');
  console.error('Not knowing who someone is right now is not the same as knowing they');
  console.error('are nobody. Only the second one is worth showing a sign-in screen for.');
  process.exit(1);
}

console.log('[check-session-recovery] a failed keychain read is not remembered, and an empty token tries the refresh.');
