/**
 * The partner invite code: one place that makes one.
 *
 * ── WHY IT MOVED TO THE SERVER ────────────────────────────────────────────
 * Ellie, of Rebecca: "did she complete demos and account setup? Did she invite
 * a partner? If no to any of that, we need to prompt her with it immediately."
 *
 * Rebecca had a partner name and a partner email on her profile and no invite
 * code, so nothing could ever be sent to Abram. That was not an accident of
 * her broken sign-up. The code was minted in ONE place, `genInvite` in
 * src/App.jsx, which is the website; `api/create-profile.js` stored whatever
 * the client sent and null when it sent nothing; and the app sends a code only
 * when somebody is JOINING on an invite of someone else's.
 *
 * So every person who set their profile up in the app as the first partner got
 * no code at all. The app is the path Ellie wants everybody on: "Everything
 * should run in the app. Ideally, a user purchases online then downloads the
 * app and only uses the app from that point." That path collected a partner's
 * email and could never invite them.
 *
 * It is minted here now, on the server, because the server is the one thing
 * both surfaces go through. A surface that forgets to ask gets one anyway,
 * which is the difference between a rule and a reminder.
 *
 * ── WHAT IT IS AND IS NOT ─────────────────────────────────────────────────
 * It is a lookup key for "this invite belongs to this couple", not a secret.
 * It goes in a URL and in an email, and partner-sync uses it to join two
 * accounts. It is not a password and nothing is authorised by holding one.
 *
 * It is still worth it not being guessable in sequence, so this is random
 * rather than counted. Eight characters from an unambiguous alphabet: no O or
 * 0, no I or 1, because the one thing anybody ever does with one of these is
 * read it off a screen and type it into a phone.
 */

/** No O/0 and no I/1: these get read off a screen and typed back in. */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** How long a code is. Eight of 32 characters is 32^8, about a thousand
 *  billion, which makes a collision something to handle rather than expect. */
const LENGTH = 8;

/**
 * One code. Uses the platform's cryptographic source where there is one.
 *
 * `Math.random` was what the website used, and for a lookup key it is not
 * wrong. It is not better either, and both runtimes here have getRandomValues,
 * so there is no reason to take the weaker one. The fallback exists so this
 * module cannot throw inside a profile creation on a runtime that lacks it.
 */
export function newInviteCode() {
  const n = ALPHABET.length;
  const g = globalThis.crypto?.getRandomValues?.bind(globalThis.crypto);
  if (g) {
    const bytes = new Uint8Array(LENGTH);
    g(bytes);
    /* Modulo over 256 on a 32-letter alphabet is exact: 256 is 8 × 32, so
       every letter is reachable by the same number of byte values and none is
       favoured. Worth saying because a modulo over an alphabet that does NOT
       divide 256 quietly biases the first few letters. */
    let out = '';
    for (const b of bytes) out += ALPHABET[b % n];
    return out;
  }
  let out = '';
  for (let i = 0; i < LENGTH; i++) out += ALPHABET[Math.floor(Math.random() * n)];
  return out;
}

/**
 * Whether this profile should be given a code of its own.
 *
 * The second partner joins on the first partner's code and has none, which is
 * deliberate and is what `joined_via_invite` records. Giving them one would
 * put two codes on one couple and make "which of these is the couple" a
 * question with two answers.
 *
 * Taken as the stored row rather than as a request body, so it answers the
 * same way for a profile being created and for one being backfilled.
 */
export function needsInviteCode(row) {
  if (!row) return false;
  if (row.joined_via_invite) return false;
  return !(typeof row.invite_code === 'string' && row.invite_code.trim());
}
