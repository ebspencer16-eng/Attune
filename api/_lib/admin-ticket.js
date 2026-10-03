/**
 * A short-lived ticket that stands in for the admin password, once.
 *
 * ── WHY ───────────────────────────────────────────────────────────────────
 * Ellie: "Carolina and I shouldn't have to enter the admin password if we are
 * entering through our accounts. We should have the 4-digit pin once when we
 * initially click admin from settings, but no passwords from that point."
 *
 * The app holds their Supabase session. The admin pages want ADMIN_SECRET. The
 * two have to meet somewhere, and the obvious shortcut is to hand the app the
 * secret and let it put it in the URL it opens. That is the master key to the
 * customer database, in a URL, for the life of the browser's history.
 *
 * So the app gets a ticket instead: proof that a signed-in admin account asked
 * for one, good for two minutes, exchanged at /api/admin-login for the secret
 * the admin page already uses. What travels in the URL expires while you are
 * still looking at the page.
 *
 * ── WHAT IT IS NOT ────────────────────────────────────────────────────────
 * Not single use. That needs somewhere to record what has been spent, and this
 * runs on serverless instances that share no memory; a table for it is a bigger
 * decision than this change. Two minutes is the bound, and it is stated here
 * rather than implied so nobody later reads "ticket" as "one time".
 *
 * ── HOW IT IS SIGNED ──────────────────────────────────────────────────────
 * HMAC-SHA256 under ADMIN_SECRET itself, so a ticket cannot be made by anyone
 * who does not already hold the secret, and verifying one needs no storage.
 */

const TTL_SECONDS = 120;

const enc = new TextEncoder();

async function key(secret) {
  return crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
}

const hex = (buf) => Array.from(new Uint8Array(buf))
  .map((b) => b.toString(16).padStart(2, '0')).join('');

/** Constant time, because a plain === leaks how far a guess got. */
function sameHex(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/**
 * @param {string} secret  ADMIN_SECRET
 * @param {number} [nowMs] for tests
 * @returns {Promise<string>} `<expiry seconds>.<signature>`
 */
export async function mintAdminTicket(secret, nowMs = Date.now()) {
  const exp = Math.floor(nowMs / 1000) + TTL_SECONDS;
  const sig = hex(await crypto.subtle.sign('HMAC', await key(secret), enc.encode(String(exp))));
  return `${exp}.${sig}`;
}

/**
 * @returns {Promise<boolean>} whether this ticket was minted under that secret
 *   and has not expired.
 */
export async function adminTicketValid(ticket, secret, nowMs = Date.now()) {
  if (typeof ticket !== 'string' || !secret) return false;
  const [expStr, sig] = ticket.split('.');
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || !sig) return false;
  /* Expiry first, so a stale ticket costs no signing work. */
  if (exp * 1000 <= nowMs) return false;
  const want = hex(await crypto.subtle.sign('HMAC', await key(secret), enc.encode(expStr)));
  return sameHex(sig, want);
}

export const ADMIN_TICKET_TTL_SECONDS = TTL_SECONDS;
