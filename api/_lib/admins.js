/**
 * Who can open the admin from inside the app.
 *
 * ── WHY AN ENVIRONMENT VARIABLE ───────────────────────────────────────────
 * Ellie: "Can you adjust carolina's and my app view so that we can access admin
 * page through our portal?"
 *
 * Two people, named by email. Not in the repo: a colleague's address is theirs,
 * and a list of the two people who can reach the admin is exactly the list an
 * attacker would want. ADMIN_EMAILS holds them, comma separated, in Vercel
 * beside every other secret this product has.
 *
 * ── WHY IT IS NOT CALLED isAdminEmail ─────────────────────────────────────
 * check-email-preview.mjs reads every function whose name ends in Email as a
 * customer email that has to be previewable, which is the right rule and this
 * is not one of those. A predicate about an address is better named for what
 * it asks anyway.
 *
 * ── WHAT THIS DOES NOT DO ─────────────────────────────────────────────────
 * It does not authorise anything. Every admin endpoint is still behind
 * ADMIN_SECRET and checkAdminAuth, and the admin page still asks for it. This
 * decides one thing: whether the app shows the way in. Someone who guessed
 * their way past this would find the same locked door as everyone else.
 */

/** @returns {boolean} whether this address is one of the named few. */
export function isAdminAddress(email) {
  const list = (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (!list.length) return false;
  return list.includes(String(email || '').trim().toLowerCase());
}
