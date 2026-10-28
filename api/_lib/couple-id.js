/**
 * The anonymous names for a couple and for a person, shared by four admin
 * endpoints.
 *
 * ── WHY IT HAS TO BE SHARED ───────────────────────────────────────────────
 * The admin page is sent no profile ids at all, deliberately: it anonymises by
 * design and the banner on it promises so. What it IS sent, per cube row, is a
 * non-reversible hash of the sorted id pair, which names a couple without
 * naming anybody.
 *
 * That key is now a JOIN rather than a label. Ellie: "comp funnel only has a
 * couple of slicer categories - it should have way more. Be thorough and fix
 * this throughout the site." The Responses tiles read aggregates the server
 * computes, because raw answers never reach the browser, so a cut they can
 * show is a cut the server has computed. Pre-computing one bundle per stored
 * field capped them at the stored fields: ten of the hundred and fifty cuts
 * the taxonomy offers, because the rest are derived from exercise answers.
 *
 * So the page sends the couples a cut keeps, by this key, and the server
 * answers with that bundle. api/admin-explore.js mints both keys;
 * api/admin-data.js reads the couple one back, api/admin-engagement.js reads
 * the person one, and api/admin-survey.js mints the couple one for a survey
 * answer. Four endpoints that have to agree about a hash, which is the exact
 * shape this codebase fails at. One implementation, imported by all of them,
 * and check-couple-id.mjs holds them to it.
 *
 * A disagreement would be loud rather than quiet, which is the other half of
 * making it safe: nothing would resolve, so a cut would answer "no couples"
 * instead of answering about the wrong ones.
 */

/** Non-reversible hash of the sorted id pair. */
export function coupleHash(a, b) {
  const s = [a, b].filter(Boolean).sort().join('|');
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return 'c' + h.toString(36);
}

/**
 * Which id this person's couple is named by, or null for a couple of one.
 *
 * Two routes, and the order matters. A linked partner profile is the couple;
 * failing that, an invite code whose session carries answers is a partner who
 * never made a profile, and the code names that pair. Both endpoints resolve
 * those two facts from their own reads and pass them in, so the RULE is here
 * and only the lookups are theirs.
 */
export function coupleKeyOf(profile, { partnerPresent, invitePresent } = {}) {
  if (!profile) return null;
  if (partnerPresent && profile.partner_profile_id) return profile.partner_profile_id;
  if (invitePresent && profile.invite_code) return 'inv:' + profile.invite_code;
  return null;
}

/**
 * One PERSON's anonymous handle.
 *
 * ── WHY THERE IS A PERSON ONE TOO ─────────────────────────────────────────
 * The couple key answers a cut on a measure about pairs. api/admin-engagement
 * counts things one person does - their notes, their tags, their article
 * reads, their time on a page - so a cut there has to keep ONE partner, and a
 * couple key keeps both.
 *
 * That endpoint used to take the cut as `field::value` and look the field up
 * on the profile row. It could therefore honour the seven demographic columns
 * and nothing else, while the panel beside it offered a hundred and fifty
 * cuts, and a derived one arrived as field `g`: no profile has a `g`, so
 * nobody matched and every tile on the page drew a confident zero. That is
 * worse than a click that does nothing.
 *
 * The same hash as a couple's, over one id instead of two, so there is one
 * implementation of "name somebody without naming them". It is a stable
 * pseudonym rather than an id: not reversible, and no more revealing than the
 * couple key the cube has always sent, on a page whose banner promises
 * "records are identified by random UUID only".
 */
export function anonPersonId(id) {
  return id ? coupleHash(id, null) : null;
}

/** This person's anonymous couple id, or null. */
export function anonCoupleId(profile, opts) {
  const key = coupleKeyOf(profile, opts);
  return key ? coupleHash(profile.id, key) : null;
}
