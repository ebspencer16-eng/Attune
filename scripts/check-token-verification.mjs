#!/usr/bin/env node
/**
 * Nothing but a genuine, live token gets past verifyToken.
 *
 * ── WHY THIS GATE EXISTS BEFORE THE CODE SHIPPED ──────────────────────────
 * api/_lib/verify-token.js checks a sign-in token against the project's
 * published public key instead of asking Supabase over the network, which
 * takes a round trip off every request the app makes. It is also the code that
 * decides whether somebody is who they say they are, and getting that wrong is
 * worse than a slow app.
 *
 * So this signs its own tokens. It generates a keypair, publishes it as a
 * JWKS the verifier is handed, and then tries fourteen ways past it. Every
 * refusal is a refusal of a token this file MADE, which is the only way to
 * know the door is shut: a gate that can only produce invalid-looking strings
 * proves nothing about a well-formed forgery.
 *
 * ── WHAT "PASS" MEANS FOR EACH ────────────────────────────────────────────
 * Three outcomes, and this asserts which one each case gets. The important
 * word is `accepted`: no forgery may ever be accepted. Several of them are
 * expected to be HANDED TO THE SERVER rather than refused, and that is the
 * deliberate design rather than a soft spot. The rule, from verify-token.js:
 * refuse only what Supabase could not possibly accept either. Everything
 * else is a question, and the server is the one that answers it.
 *
 * ── THE ONE THAT MATTERS MOST ─────────────────────────────────────────────
 * Algorithm confusion. A JWT says which algorithm to check it with, and a
 * verifier that believes it will happily check an HS256 token using the
 * PUBLIC key as the shared secret, which anybody can do because the public key
 * is public. The forgery below does exactly that, and the table of algorithms
 * in verify-token.js is why it cannot work: it contains no symmetric entry, so
 * there is nothing for an HS256 token to be checked with.
 *
 * ── AND THE THREE-ANSWER RULE ─────────────────────────────────────────────
 * The verifier may say "I cannot tell", and the caller then asks Supabase the
 * old way. That is safe and it is also exactly where a mistake would hide, so
 * this asserts WHICH answer each case gets. A forged token returning "cannot
 * tell" would be a pass under a sloppier check and is a failure here.
 */

import { webcrypto } from 'node:crypto';
import { verifyToken, ASK_SERVER, _resetKeyCache } from '../api/_lib/verify-token.js';

if (!globalThis.crypto) globalThis.crypto = webcrypto;

const BASE = 'https://project.supabase.co';
const ISS = `${BASE}/auth/v1`;
const KID = 'test-key-1';
const NOW = 1_800_000_000_000; // a fixed clock, so nothing here is flaky
const sec = Math.floor(NOW / 1000);

const fails = [];

const b64url = (bytes) => Buffer.from(bytes).toString('base64')
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const enc = (obj) => b64url(new TextEncoder().encode(JSON.stringify(obj)));

/** A real P-256 pair, and a second one that is nobody's. */
async function pair() {
  const kp = await webcrypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify'],
  );
  const pub = await webcrypto.subtle.exportKey('jwk', kp.publicKey);
  return { kp, pub };
}

const ours = await pair();
const theirs = await pair();

const jwks = { keys: [{ ...ours.pub, kid: KID, alg: 'ES256', use: 'sig' }] };
const fetchJwks = async () => jwks;

/** Sign a token with a given private key, header and claims. */
async function sign(privateKey, header, claims) {
  const data = `${enc(header)}.${enc(claims)}`;
  const sig = await webcrypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' }, privateKey, new TextEncoder().encode(data),
  );
  return `${data}.${b64url(new Uint8Array(sig))}`;
}

const GOOD_HEADER = { alg: 'ES256', typ: 'JWT', kid: KID };
const GOOD_CLAIMS = {
  iss: ISS, sub: 'c0ffee00-0000-4000-8000-000000000001', aud: 'authenticated',
  email: 'someone@example.com', iat: sec - 60, exp: sec + 3600,
};

/** Every case tried, and what each one was asked for. Counted, not typed. */
const tried = { accept: 0, refuse: 0, ask: 0 };

async function check(name, token, want, how) {
  tried[want] += 1;
  _resetKeyCache();
  let got;
  try {
    got = await verifyToken(token, { baseUrl: BASE, fetchJwks, now: NOW });
  } catch (e) {
    fails.push(`${name}: threw ${e?.message || e}. A verifier must answer, not explode.`);
    return;
  }
  const label = got === ASK_SERVER ? 'ASK_SERVER' : got === null ? 'refused' : `accepted as ${got.id}`;
  if (want === 'accept') {
    if (!got || got === ASK_SERVER) {
      fails.push(`${name}: ${label}, and it should have been accepted. ${how}`);
    }
    return;
  }
  if (want === 'refuse' && got !== null) {
    fails.push(`${name}: ${label}, and it must be REFUSED outright. ${how}`);
  }
  if (want === 'ask' && got !== ASK_SERVER) {
    fails.push(`${name}: ${label}, and it should have fallen back to the server. ${how}`);
  }
}

// ── 1. The one that has to work ─────────────────────────────────────────────
const good = await sign(ours.kp.privateKey, GOOD_HEADER, GOOD_CLAIMS);
await check('a genuine, live token', good, 'accept',
  'If this fails nobody can sign in at all.');

{
  _resetKeyCache();
  const who = await verifyToken(good, { baseUrl: BASE, fetchJwks, now: NOW });
  if (who && who !== ASK_SERVER) {
    if (who.id !== GOOD_CLAIMS.sub) {
      fails.push(`the user id came back as ${who.id}, not the token's own sub.`);
    }
    if (who.email !== GOOD_CLAIMS.email) {
      fails.push(`the email came back as ${who.email}, not the token's own.`);
    }
  }
}

// ── 2. Five forgeries, each one well formed ─────────────────────────────────
await check('signed with somebody else\'s key',
  await sign(theirs.kp.privateKey, GOOD_HEADER, GOOD_CLAIMS), 'refuse',
  'The signature is real; the key is not ours.');

await check('the signature stripped off',
  `${enc({ alg: 'none', typ: 'JWT' })}.${enc(GOOD_CLAIMS)}.`, 'refuse',
  'alg "none" is a token that asks not to be checked.');

/**
 * The same attack with something in the signature slot.
 *
 * This case exists because of a plant that walked straight through. Deleting
 * the "none is refused" line left the gate green: the only `none` token here
 * had an EMPTY signature, and a separate check for that caught it, so the
 * algorithm rule was never the thing being tested. A forged `none` token
 * carrying any old bytes is the shape that proves it.
 */
await check('alg none with a signature glued on',
  `${enc({ alg: 'none', typ: 'JWT', kid: KID })}.${enc(GOOD_CLAIMS)}.${b64url(new TextEncoder().encode('anything'))}`,
  'refuse', 'The algorithm is the thing being refused, not the empty slot.');

{
  /* Algorithm confusion: an HS256 token whose "secret" is the public key,
     which anybody has. A verifier that trusts the header would agree. */
  const header = { alg: 'HS256', typ: 'JWT', kid: KID };
  const data = `${enc(header)}.${enc(GOOD_CLAIMS)}`;
  const secret = new TextEncoder().encode(JSON.stringify(jwks.keys[0]));
  const key = await webcrypto.subtle.importKey(
    'raw', secret, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const mac = await webcrypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  /**
   * Handed to the server, NOT accepted and NOT refused here.
   *
   * Refusing it outright would be safe against this forgery and unsafe
   * against reality: a Supabase project that still signs with the legacy
   * shared secret issues HS256 tokens that are completely genuine, and
   * refusing those locks out every customer at once. Supabase holds that
   * secret and can tell the difference; this file cannot, and says so.
   *
   * What must never happen is `accepted`, which is what a verifier that
   * trusts the header does.
   */
  await check('HS256 signed with the public key as the secret',
    `${data}.${b64url(new Uint8Array(mac))}`, 'ask',
    'Checking it here IS the forgery. Asking Supabase, which holds the real secret, is not.');
}

await check('expired an hour ago',
  await sign(ours.kp.privateKey, GOOD_HEADER, { ...GOOD_CLAIMS, exp: sec - 3600 }), 'refuse',
  'Correctly signed, and over.');

await check('not valid yet',
  await sign(ours.kp.privateKey, GOOD_HEADER, { ...GOOD_CLAIMS, nbf: sec + 600 }), 'refuse',
  'Correctly signed, and not started.');

/*
 * These two are signed with OUR key, which means whoever made them had the
 * private half. That is not an attacker; that is this file being out of date
 * about what Supabase stamps on a token. Both go to the server, so being
 * wrong about either costs a round trip rather than a session.
 */
await check('an issuer that is not this project',
  await sign(ours.kp.privateKey, GOOD_HEADER, { ...GOOD_CLAIMS, iss: 'https://else.supabase.co/auth/v1' }),
  'ask', 'Signed with our key, so the server is the one to ask.');

await check('audience is not a sign-in',
  await sign(ours.kp.privateKey, GOOD_HEADER, { ...GOOD_CLAIMS, aud: 'anon' }), 'ask',
  'Supabase stamps "authenticated" today. If that changes, this must not sign anybody out.');

await check('no subject',
  await sign(ours.kp.privateKey, GOOD_HEADER, { ...GOOD_CLAIMS, sub: '' }), 'refuse',
  'A token with nobody in it must not become a user.');

await check('no expiry at all',
  await sign(ours.kp.privateKey, GOOD_HEADER, { ...GOOD_CLAIMS, exp: undefined }), 'refuse',
  'A token that never expires is not one of ours.');

{
  /* The payload edited after signing: somebody else's id, our signature. */
  const parts = good.split('.');
  const swapped = enc({ ...GOOD_CLAIMS, sub: '00000000-0000-4000-8000-00000000dead' });
  await check('payload edited after signing',
    `${parts[0]}.${swapped}.${parts[2]}`, 'refuse',
    'The signature covers the payload, so changing it must break it.');
}

await check('not a JWT at all', 'hello', 'refuse', 'Three parts or nothing.');
await check('empty', '', 'refuse', 'No token is not a user.');

// ── 3. And the cases it must NOT decide ─────────────────────────────────────
await check('a key id that is not in the key set',
  await sign(ours.kp.privateKey, { ...GOOD_HEADER, kid: 'rotated-away' }, GOOD_CLAIMS), 'ask',
  'A rotation looks like this. Refusing would sign everybody out.');

{
  const dead = async () => { throw new Error('jwks unreachable'); };
  _resetKeyCache();
  const got = await verifyToken(good, { baseUrl: BASE, fetchJwks: dead, now: NOW });
  if (got !== ASK_SERVER) {
    fails.push('a key set that will not load gave a verdict. It is not evidence'
      + ` about a token, and this answered ${got === null ? 'refused' : 'accepted'}.`);
  }
}

// ── 4. The endpoints use it, and none of them kept its own copy ─────────────
import { readFileSync, readdirSync } from 'node:fs';
const ROOT = new URL('..', import.meta.url).pathname;
const endpoints = readdirSync(`${ROOT}api`).filter((f) => f.endsWith('.js') && !f.startsWith('_'));
const inline = [];
const using = [];
for (const f of endpoints) {
  const src = readFileSync(`${ROOT}api/${f}`, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^[ \t]*\/\/.*$/gm, ' ');
  const asks = /auth\/v1\/user/.test(src) || /auth\.getUser\(/.test(src);
  /* Either entry point counts: userForRequest is the one an endpoint uses and
     userFromToken is what it is built on. Matching one name would have called
     seven rewired endpoints unverified. */
  const local = /\buser(ForRequest|FromToken)\(/.test(src);
  if (local) using.push(f);
  else if (asks) inline.push(f);
}
if (!using.length) {
  console.error('[check-token-verification] no endpoint verifies a token locally, so this'
    + ' verifier is dead code and the round trip is still on every request.'
    + ' Refusing to pass: a gate that has lost its subject must never report success.');
  process.exit(1);
}

if (fails.length) {
  console.error('\n check-token-verification: the door is not shut.\n');
  for (const f of fails) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}
/* Counted rather than written out. The sentence said fifteen for a while
   after there were sixteen, which is this project's oldest kind of mistake. */
const total = tried.accept + tried.refuse + tried.ask;
console.log(`[check-token-verification] ${total} tokens tried against a key pair made`
  + ` here: ${tried.accept} genuine one accepted with its own id and email, and not one`
  + ` forgery accepted. ${tried.refuse} refused outright, ${tried.ask} handed to the`
  + ` server because refusing them would be a guess. ${using.length} endpoint(s) verify locally`
  + `${inline.length ? `, ${inline.length} still ask over the network: ${inline.join(', ')}` : ''}.`);
