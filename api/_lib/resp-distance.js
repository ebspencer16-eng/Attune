/**
 * How far apart two Expectations answers are. The whole rule, and nothing else.
 *
 * ── WHY IT IS ITS OWN FILE ────────────────────────────────────────────────
 * It lived in api/_lib/expectations.js, which also builds the results rows and
 * therefore imports the question set, the category introductions, the pairing
 * starters and the alignment bands. When api/_workbook-content.js was pointed
 * at this rule so the workbook would stop scoring the mirror backwards, it
 * inherited all four, and the workbook runs in its own container:
 * Dockerfile.workbook copies three files out of api/, and
 * check-workbook-image fails the build when the service reaches one it does
 * not have.
 *
 * Five COPY lines and a redeploy would have been the other answer. This is
 * better: the rule has no dependencies at all, so the container gets one small
 * file and the next thing that needs this rule can have it just as cheaply.
 *
 * expectations.js re-exports from here, so every existing caller is unchanged
 * and there is still exactly one implementation.
 */

/**
 * Where an answer sits on the five-point scale between the two of them.
 *
 * ── WHY A SCALE AND NOT A SIDE ────────────────────────────────────────────
 * Ellie: "I don't think it should be all-or-nothing aligned, I want to include
 * degrees (preston and I were basically aligned on this one so it's a good
 * example)." The example was Emotional Labour, where she answered "Both of us"
 * and refined it to "Usually Ellie, sometimes Preston" while Preston answered
 * "Ellie". Neighbours, scored as a flat miss.
 *
 * `sideOf` above answers a three-way question: you, both, or them. The scale
 * is five points, because the exercise asks a follow-up every time someone
 * answers Both and the follow-up is exactly which way it leans:
 *
 *   0    you                      the name, or "Primarily mine" from you
 *   0.5  both, leaning to you     "Usually <you>, sometimes <them>"
 *   1    both, evenly             "Genuinely 50/50", or Both with no detail
 *   1.5  both, leaning to them    "Usually <them>, sometimes <you>"
 *   2    them                     the name, or "Primarily my partner's"
 *
 * That follow-up has been asked since the exercise shipped, is required
 * before an item counts as answered, and was read by nothing that scored.
 * It is on the page: respDisplay prints it in place of "Both of us". So the
 * product has been showing her the refinement and comparing as though she had
 * not given it.
 *
 * ── THE TWO KINDS OF VALUE, AGAIN ─────────────────────────────────────────
 * A name is absolute: "Ellie" means Ellie whoever stored it, so it needs no
 * mirroring. "Primarily mine" is relative and means a different person on each
 * side, which is why `isYours` exists and why getting it backwards inverts
 * every row while looking entirely plausible. Same trap as everything else in
 * this file.
 *
 * The detail strings are absolute for the same reason: they are built with
 * live names, so "Usually Ellie, sometimes Preston" says Ellie whichever of
 * them picked it. Parsed by the name it puts first rather than by matching the
 * whole sentence, because the sentence is assembled in api/questions.js and a
 * punctuation change there must not quietly stop this reading it.
 */
export const DETAIL_EVEN = 'Genuinely 50/50';

/** Which of the two a "Usually X, sometimes Y" refinement leans toward. */
function detailLean(detail, youName, themName) {
  const text = String(detail ?? '').trim();
  if (!text) return null;
  if (text === DETAIL_EVEN) return 'even';
  const m = /^Usually\s+(.+?),\s*sometimes\b/i.exec(text);
  if (!m) return null;
  const named = m[1].trim();
  if (youName && named === youName) return 'you';
  if (themName && named === themName) return 'them';
  return null;
}

/**
 * The position, or 'na' for an answer that says the question does not apply,
 * or null for one nothing here recognises.
 *
 * "Doesn't apply" stays off the scale rather than being parked at the middle.
 * It is a real answer and the website has always compared it as one: against
 * a position it is a difference, against the same answer it is agreement. A
 * middle rank would make it half-agree with everything.
 */
function positionOf(value, detail, isYours, youName, themName) {
  if (value == null || value === '') return null;
  const at = (pos) => ({ pos, specific: true });
  if (value === "Doesn't apply" || value === "Doesn't apply to us") return { pos: 'na', specific: true };
  if (value === 'Primarily mine') return at(isYours ? 0 : 2);
  if (value === "Primarily my partner's") return at(isYours ? 2 : 0);
  if (value === 'Both of us' || value === 'Balanced') {
    const lean = detailLean(detail, youName, themName);
    if (lean === 'you') return at(0.5);
    if (lean === 'them') return at(1.5);
    if (lean === 'even') return at(1);
    /**
     * Both, with nothing more said about it.
     *
     * The middle is where it sits, and `specific: false` is the part that
     * matters. The follow-up is required before an item counts as answered
     * today, so a row with no detail was stored before the follow-up existed.
     * Reading that as "they said exactly half" would invent a quarter-point
     * gap against a partner who did say which way it leans, and would do it
     * for every Both row the couple ever answered.
     *
     * What a reader sees in those two columns is "Usually Ellie, sometimes
     * Preston" beside "Both". That is one of them being more precise, not the
     * two of them disagreeing, and respDistance reads it that way.
     */
    return { pos: 1, specific: false };
  }
  if (youName && value === youName) return at(0);
  if (themName && value === themName) return at(2);
  return null;
}

/** Anywhere in the middle of the scale: both of them, however it leans. */
const isShared = (pos) => typeof pos === 'number' && pos >= 0.5 && pos <= 1.5;

/**
 * How far apart two responsibility answers are, normalised to 0..1.
 *
 * Null when either side has not answered, which is not a distance of zero.
 * api/_lib/alignment.js turns this into the percentage on the bar and into the
 * band; nothing else is allowed to decide what a distance means.
 */
export function respDistance({ yourValue, theirValue, yourDetail, theirDetail, youName, themName }) {
  const a = positionOf(yourValue, yourDetail, true, youName, themName);
  const b = positionOf(theirValue, theirDetail, false, youName, themName);
  if (a === null || b === null) {
    /* One value nothing recognises, which happens for an answer stored before
       an option was renamed. Fall back to comparing what is stored, the way
       `agrees` does, so the row is still a comparison rather than vanishing. */
    if (yourValue == null || yourValue === '' || theirValue == null || theirValue === '') return null;
    if (a === null && b === null) return yourValue === theirValue ? 0 : 1;
    return 1;
  }
  if (a.pos === 'na' || b.pos === 'na') return a.pos === b.pos ? 0 : 1;
  /* One of them said Both and said no more. See positionOf: that is a row from
     before the follow-up existed, and it agrees with any Both. */
  if ((!a.specific || !b.specific) && isShared(a.pos) && isShared(b.pos)) return 0;
  return Math.abs(a.pos - b.pos) / 2;
}

/**
 * How far apart two life-question answers are, normalised to 0..1.
 *
 * The options are an ordered list, so the distance is the index gap over the
 * widest possible one. Three or four of these questions are categorical rather
 * than linear, which api/_workbook-content.js says out loud beside
 * LIFE_QUESTION_OPTIONS: for those the number is an approximation. It is the
 * same approximation the percentage on the highlight card has always used, so
 * this changes where it is computed and not what it says.
 */
export function lifeDistance(yourValue, theirValue, options) {
  if (yourValue == null || yourValue === '' || theirValue == null || theirValue === '') return null;
  const opts = Array.isArray(options) ? options : null;
  if (!opts || opts.length < 2) return yourValue === theirValue ? 0 : 1;
  const a = opts.indexOf(yourValue);
  const b = opts.indexOf(theirValue);
  if (a === -1 || b === -1) return yourValue === theirValue ? 0 : 1;
  return Math.abs(a - b) / (opts.length - 1);
}
