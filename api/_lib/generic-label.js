/**
 * A responsibility or life question, written about nobody in particular.
 *
 * ── WHY IT EXISTS ─────────────────────────────────────────────────────────
 * The exercises phrase their items at the person answering: "Planning visits
 * with {userName}'s family". The admin reads them about everybody at once, so
 * the placeholders have to become words, and there is exactly one right
 * answer to what those words are.
 *
 * ── WHY IT IS HERE AND NOT IN TWO ENDPOINTS ───────────────────────────────
 * It was in two, and they disagreed. api/admin-data.js had `famLabel` and
 * api/admin-explore.js had `genericLabel`: identical for the first two rules
 * and different for the next four, so the same item read "Planning visits with
 * one's own family" on the Responses page and "Planning visits with your
 * family" on the Explore page. Two names for one thing, with nothing watching,
 * which is this codebase's whole failure mode.
 *
 * ── WHICH WORDING WON, AND WHY ────────────────────────────────────────────
 * The third-person one. `genericLabel` contradicted itself: it turned
 * "{userName}'s family" into "one's own family" and then turned a bare
 * "{userName}'s" into "your", so one function produced both voices. The admin
 * reads about many couples at once, and in that context "your family" has no
 * answer to "whose?". Longer rules first, because "{userName}'s family" has to
 * match before "{userName}'s" does.
 */
export function genericLabel(t) {
  return String(t || '')
    .replace(/\{userName\}'s family/g, "one's own family")
    .replace(/\{partnerName\}'s family/g, "the other partner's family")
    .replace(/\{userName\}'s/g, "one's own")
    .replace(/\{partnerName\}'s/g, "the other partner's")
    .replace(/\{userName\}/g, 'one')
    .replace(/\{partnerName\}/g, 'the partner');
}
