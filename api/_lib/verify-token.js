/**
 * Who a bearer token belongs to, without asking over the network.
 *
 * ── WHY ───────────────────────────────────────────────────────────────────
 * Ellie: "My pages are still taking a long time to load. We need to fix this,
 * other apps don't do this, even apps where I have notes and content saved."
 *
 * Measured, from inside the app, on a cold launch: /api/home 4.1s,
 * /api/results 6.3s, and a static file from the same domain 238ms in the same
 * run. The time is in the server, and the first thing every one of these
 * endpoints did was hand the token to Supabase and ask, over the network, who
 * it belongs to. One round trip before any work starts, on every request the
 * app makes, on every screen.
 *
 * It does not need the network. A Supabase access token is a JWT signed with
 * the project's own key, and the project publishes the PUBLIC half of that key
 * at /auth/v1/.well-known/jwks.json. Checking a signature against a public key
 * takes well under a millisecond. The key is fetched once per server instance
 * and kept.
 *
 * ── AND IT IS ALSO SEVEN COPIES OF ONE RULE ───────────────────────────────
 * The same six lines were pasted into home, results, notes, posts,
 * notifications, tool-data and conflict-results, with survey doing the same
 * thing through the Supabase client. Seven implementations of "who is this",
 * which is the shape of every serious bug in this codebase. There is one now.
 *
 * ── THE THREE ANSWERS ─────────────────────────────────────────────────────
 * This is security code, so it is explicit about not knowing:
 *
 *   a user      the signature checked out and every claim is in order
 *   null        the token is bad, and it is bad for a stated reason
 *   ASK_SERVER  this cannot tell, so the caller asks Supabase as before
 *
 * The third is what makes it safe to deploy. An unfamiliar algorithm, a key id
 * that is not in the JWKS, a JWKS that will not load: none of those are
 * evidence that a token is forged, and none of them is allowed to be treated
 * as evidence that it is genuine either. The old path is still there, and in
 * those cases it runs.
 *
 * ── THE LINE BETWEEN REFUSING AND ASKING ──────────────────────────────────
 * It is drawn in one place and it is this: **a token is refused here only
 * when Supabase could not possibly accept it either.** A signature that does
 * not verify, a token that expired an hour ago, one with nobody in it, one
 * with no expiry: asking about any of those would be a round trip to be told
 * no. Everything else, including anything this file simply does not
 * understand, goes to the server.
 *
 * That line is what makes the change safe to deploy rather than merely
 * plausible. If I have misjudged what a genuine token from this project looks
 * like, the cost is that it takes the slow path it has always taken. The
 * alternative kind of mistake signs everybody out at once, and there is no
 * version of that worth a faster page.
 *
 * It is why a token asking for HS256 is handed on rather than refused, which
 * looks wrong and is not. Checking it here is the forgery below; handing it to
 * Supabase, which holds the real shared secret, is just a question. And a
 * project that still signs with that secret keeps working, on the path it
 * already used, instead of locking out every customer the moment this ships.
 *
 * ── WHY WEB CRYPTO ────────────────────────────────────────────────────────
 * Every one of these endpoints runs on Vercel's edge runtime, which has no
 * node:crypto. `crypto.subtle` is there, it does ECDSA P-256 and RSA, and it
 * takes the raw r||s signature a JWT carries without the DER wrapping that
 * node:crypto would want. Node has the same API, so the gate runs this exact
 * code rather than a second version of it.
 */

/** The caller should fall back to asking Supabase. Not a user, not a refusal. */
export const ASK_SERVER = Symbol('ask the server');

/**
 * How long a fetched key set is kept.
 *
 * Ten minutes. Supabase rotates signing keys rarely and a rotation is handled
 * before this expires anyway: an unknown key id forces one refetch.
 */
const JWKS_TTL_MS = 10 * 60 * 1000;

/** And how often an unknown key id may force one, so a bad token cannot. */
const REFETCH_FLOOR_MS = 60 * 1000;

let cache = { keys: null, at: 0, lastFetch: 0 };

/** Visible for the gate: start again with nothing cached. */
export function _resetKeyCache() {
  cache = { keys: null, at: 0, lastFetch: 0 };
}

function b64urlToBytes(s) {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

function b64urlToJson(s) {
  try { return JSON.parse(new TextDecoder().decode(b64urlToBytes(s))); }
  catch { return null; }
}

/**
 * What each algorithm means to Web Crypto.
 *
 * Only asymmetric algorithms are here, and that is the point rather than an
 * omission. HS256 and its siblings are signed with a SHARED SECRET, so a token
 * asking to be checked with one cannot be checked against a public key at all.
 * Accepting the attempt is the algorithm-confusion attack: somebody signs
 * their own token using the public key as the secret, and a verifier that is
 * relaxed about the algorithm agrees. The table below is why this file can
 * never do that, and `none` is absent for the same reason.
 */
const ALGS = {
  ES256: { imp: { name: 'ECDSA', namedCurve: 'P-256' }, ver: { name: 'ECDSA', hash: 'SHA-256' } },
  ES384: { imp: { name: 'ECDSA', namedCurve: 'P-384' }, ver: { name: 'ECDSA', hash: 'SHA-384' } },
  ES512: { imp: { name: 'ECDSA', namedCurve: 'P-521' }, ver: { name: 'ECDSA', hash: 'SHA-512' } },
  RS256: { imp: { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, ver: { name: 'RSASSA-PKCS1-v1_5' } },
  RS384: { imp: { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-384' }, ver: { name: 'RSASSA-PKCS1-v1_5' } },
  RS512: { imp: { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-512' }, ver: { name: 'RSASSA-PKCS1-v1_5' } },
};

/**
 * `none` means "do not check this", which is never a thing a real token asks
 * for. Refused outright, and it is the only algorithm that is.
 */
const NONE = /^none$/i;

/**
 * How long a FAILED fetch is remembered.
 *
 * Thirty seconds, and it is not an optimisation. Without it, a project whose
 * key set cannot be reached pays a failing request before every single
 * authenticated call, for ever: the thing this file exists to remove, added
 * back and made worse. Short, so a key set that comes back is picked up
 * almost at once.
 */
const JWKS_FAIL_TTL_MS = 30 * 1000;

async function keysFor(base, fetchJwks, force) {
  const now = Date.now();
  const ttl = cache.keys ? JWKS_TTL_MS : JWKS_FAIL_TTL_MS;
  const fresh = cache.at && now - cache.at < ttl;
  if (fresh && !force) return cache.keys;
  if (force && now - cache.lastFetch < REFETCH_FLOOR_MS) return cache.keys;
  cache.lastFetch = now;
  try {
    const got = await (fetchJwks
      ? fetchJwks()
      : fetch(`${base}/auth/v1/.well-known/jwks.json`).then((r) => (r.ok ? r.json() : null)));
    const keys = Array.isArray(got?.keys) && got.keys.length ? got.keys : null;
    cache = { keys: keys || null, at: now, lastFetch: now };
    return keys;
  } catch {
    // A key set that will not load is not evidence about a token. Remembered
    // as a failure so the next request does not try again immediately.
    cache = { keys: null, at: now, lastFetch: now };
    return null;
  }
}

/**
 * Check a token against the project's published key.
 *
 * @param {string} token          the bare JWT, no "Bearer "
 * @param {object} [opts]
 * @param {string} [opts.baseUrl] the Supabase project URL; defaults to env
 * @param {Function} [opts.fetchJwks] for the gate: returns a JWKS document
 * @param {number} [opts.now]     for the gate: milliseconds since the epoch
 * @returns {Promise<{id: string, email: string|null}|null|symbol>}
 */
export async function verifyToken(token, opts = {}) {
  const base = (opts.baseUrl || process.env.SUPABASE_URL || '').replace(/\/+$/, '');
  if (!base) return ASK_SERVER;
  if (typeof token !== 'string' || !token) return null;

  /**
   * ── NO KEY SET, NO OPINION ────────────────────────────────────────────
   * The key set is fetched before the token is even looked at, and if there
   * is none this file has nothing to judge anything against. Every answer it
   * could give would be a guess, including "that is not even a JWT".
   *
   * It matters more than it looks. The structural checks used to run first,
   * so a server with no reachable key set still refused anything that was not
   * a well-formed JWT. That is a verifier with no key deciding who is not
   * allowed in, which is the wrong shape even where the answer is right, and
   * it broke every gate in this repo that drives an endpoint with a
   * stand-in token: they stub the Supabase call, not the key set, so the
   * fall-back they rely on never ran.
   *
   * It costs nothing: the key set is fetched once per server instance and
   * kept, and a request that needs it needs it anyway.
   */
  const have = await keysFor(base, opts.fetchJwks, false);
  if (!have?.length) return ASK_SERVER;

  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [h, p, sig] = parts;

  const header = b64urlToJson(h);
  const claims = b64urlToJson(p);
  if (!header || !claims) return null;

  const alg = String(header.alg || '');
  if (NONE.test(alg) || !sig) return null;
  const spec = ALGS[alg];
  /**
   * Anything not in that table goes to the server, and that INCLUDES the
   * symmetric algorithms. Verifying HS256 here would be the forgery; asking
   * Supabase about it is not, because Supabase holds the secret. See the
   * header: a project still signing with the legacy secret has to keep
   * working.
   */
  if (!spec) return ASK_SERVER;

  let keys = have;
  let jwk = keys?.find((k) => k.kid === header.kid && (!k.alg || k.alg === alg));
  if (!jwk) {
    // A rotation looks exactly like this. One refetch, rate limited, then give
    // up and let the server answer rather than refusing somebody's session.
    keys = await keysFor(base, opts.fetchJwks, true);
    jwk = keys?.find((k) => k.kid === header.kid && (!k.alg || k.alg === alg));
  }
  if (!jwk) return ASK_SERVER;

  let ok = false;
  try {
    const key = await crypto.subtle.importKey('jwk', jwk, spec.imp, false, ['verify']);
    ok = await crypto.subtle.verify(
      spec.ver, key, b64urlToBytes(sig), new TextEncoder().encode(`${h}.${p}`),
    );
  } catch {
    // A key that will not import is this file's problem, not the token's.
    return ASK_SERVER;
  }
  if (!ok) return null;

  /*
   * The signature is good. Everything from here is about whether the token is
   * one of OURS and whether it is still live, and every one of these is a
   * refusal rather than a fall-back: a correctly signed token from the wrong
   * issuer, or one that expired yesterday, is not a question the server needs
   * asking about.
   */
  const now = Math.floor((opts.now ?? Date.now()) / 1000);
  /* Five seconds, for clocks that disagree. Not a minute: the whole point of
     an expiry is that it happens. */
  const SKEW = 5;
  if (typeof claims.exp !== 'number' || claims.exp + SKEW <= now) return null;
  if (typeof claims.nbf === 'number' && claims.nbf - SKEW > now) return null;
  if (typeof claims.sub !== 'string' || !claims.sub) return null;

  /**
   * The last two are asked rather than refused, for the reason in the header.
   *
   * A token this project signed, that has not expired and names somebody, but
   * whose issuer or audience is not the string expected here, is far more
   * likely to be this file being out of date about Supabase than it is to be
   * an attack: a forger would need the private key, and with the private key
   * they would simply write the expected values.
   *
   * So the check stays, and being wrong about it costs a round trip instead
   * of somebody's session.
   */
  if (claims.iss !== `${base}/auth/v1`) return ASK_SERVER;
  const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!aud.includes('authenticated')) return ASK_SERVER;

  return { id: claims.sub, email: typeof claims.email === 'string' ? claims.email : null };
}

/**
 * Who this token belongs to, checking locally first and asking Supabase only
 * when the local check cannot decide.
 *
 * This is what an endpoint calls. `askServer` is the endpoint's existing
 * round trip, passed in rather than imported, because the two runtimes build
 * that request slightly differently and this file should not care.
 *
 * @param {string} token
 * @param {() => Promise<{id: string, email?: string|null}|null>} askServer
 * @param {object} [opts] forwarded to verifyToken
 */
export async function userFromToken(token, askServer, opts = {}) {
  const local = await verifyToken(token, opts);
  if (local === ASK_SERVER) return askServer ? askServer() : null;
  return local;
}

/**
 * The whole of "who is this request from", for an endpoint.
 *
 * Seven endpoints had the same six lines pasted into them. This is those six
 * lines, once, with the local check in front of them: the network call is now
 * the fall-back rather than the first thing that happens.
 *
 * Returns null for a token that is refused OR that Supabase does not
 * recognise, which is what every caller already did with both.
 */
export async function userForRequest({ token, supabaseUrl, anonKey }) {
  return userFromToken(token, async () => {
    const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const user = await res.json().catch(() => null);
    return user?.id ? { id: user.id, email: user.email || null } : null;
  }, { baseUrl: supabaseUrl });
}
