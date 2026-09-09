/**
 * The Communication action plan, and the per-dimension read behind it.
 *
 * ── WHY THIS FILE ─────────────────────────────────────────────────────────
 * Three of the five copy sources in api/_content could not be reached by the
 * app: DIM_ACTION_ITEMS, DOMAIN_ALIGNED and REFLECTION_ACTION_TITLES. All
 * three were consumed only by src/App.jsx, so the website's action plans
 * existed and the app's did not.
 *
 * ── THE THREE BANDS ───────────────────────────────────────────────────────
 * A dimension is read by how far apart the two people are, and the bands are
 * not cosmetic. Under 0.75 is a strength, and gets a line about sharing a
 * position. Between 0.75 and 1.5 is a note: close but not identical, which is
 * its own thing and not a small version of a gap. Over 1.5 is an opportunity,
 * and only then does the shift prose apply, because that copy is written for
 * pairs far enough apart to warrant it.
 *
 * Everything here takes the copy snapshot as an argument. A couple reads the
 * version their results were stamped with, never whatever is current.
 */

import { alignedAdvice, getDimShift } from './dimension-copy.js';
import { COMM_DOMAINS } from './tags.js';

const STRENGTH = 0.75;
const OPPORTUNITY = 1.5;

/**
 * How each dimension reads for this couple.
 *
 * `dimensions` is the list /api/results already builds, so the scores, labels
 * and ends come from one place rather than being derived again.
 */
export function personalityFeedback({ dimensions, viewer, youName, themName, copy }) {
  return dimensions.map((d) => {
    // a and b follow the stored order, not the reader.
    const myScore = (viewer === 'a' ? d.a : d.b) ?? 3;
    const partScore = (viewer === 'a' ? d.b : d.a) ?? 3;
    const gap = Math.abs(myScore - partScore);

    const isStrength = gap <= STRENGTH;
    const isNote = gap > STRENGTH && gap <= OPPORTUNITY;
    const isOpportunity = gap > OPPORTUNITY;

    const label = (d.label || d.key).toLowerCase();
    const myEnd = (myScore < 3 ? d.left : d.right) || 'one way';
    const partEnd = (partScore < 3 ? d.left : d.right) || 'another way';
    const isSame = myEnd === partEnd;

    return {
      dim: d.key,
      label: d.label,
      gap, myScore, partScore,
      isStrength, isNote, isOpportunity,
      strengthText: (isStrength || isNote)
        ? (isSame
          ? `You and ${themName} both tend toward the ${myEnd.toLowerCase()} end of ${label}.`
          : `Even with slightly different scores, you and ${themName} navigate ${label} in compatible ways.`)
        : null,
      insightText: isOpportunity
        ? `${youName} tends ${myEnd.toLowerCase()} while ${themName} tends ${partEnd.toLowerCase()} on ${label}.`
        : isNote
        ? `You're close but not identical here, ${label} shows a small but real difference.`
        : null,
      // The shift prose only applies to a real gap. A closely matched couple
      // gets the aligned line instead, further down.
      adviceText: (isOpportunity || isNote)
        ? getDimShift(d.key, myScore, partScore, youName, themName, copy)
        : null,
    };
  });
}

/**
 * The "this week" protocols, one per dimension that needs one.
 *
 * Order is deliberate and is the website's: conflict and repair first, because
 * a couple reading a list of things to work on should meet the hardest one at
 * the top rather than after seven easier ones.
 */
/**
 * Exported because it is the canonical list.
 *
 * It is what a customer actually sees on the Communication overview. It was
 * private, so the copy-review document could not read it and showed
 * DIM_ACTION_ITEMS instead, which is a different ten items that the product
 * has never rendered. Carolina approved those; nobody has ever reviewed these.
 *
 * If you add a dimension here, add it to the review document's reachability
 * check too, or rather: do not, because check-approval-doc.mjs derives from
 * this export and will find it on its own.
 */
export const PROTOCOLS = [
  ['conflict', 'Create a pause protocol', "Next time something feels off between you, before trying to resolve it, one of you says: 'I need [time amount] before we talk about this.' Practice naming the specific time you need, rather than only asking for space."],
  ['repair', 'Agree on what repaired looks like', "Within 24 hours of your next disagreement, one of you takes a small step to come back, not to relitigate it, just to signal you're okay. Notice how the other responds."],
  ['energy', 'Name your recharge needs', "This week, tell each other in advance when you need recharge time, before you're depleted. Try: 'I need a quiet evening Thursday.' That's it."],
  ['needs', 'Practice the direct ask', "Once this week, ask directly for something you'd normally hint at or leave unsaid. Just the request, no preamble, no apology."],
  ['bids', 'Stay tuned to small moments', "Once a day this week, when the other person does something small for you, makes you coffee, sends you something, acknowledge it specifically. Not just 'thanks,' but 'I noticed that.'"],
  ['listening', 'Match presence to what’s needed', "This week, when one of you brings something up, ask first: 'do you want me to just listen, or do you want me to weigh in?' Then do that one thing."],
  ['expression', 'Build toward more openness', "This week, each of you says one thing out loud that you'd normally hold back or let pass. Not something big, just something that's been sitting there."],
  ['feedback', 'Practice the small direct mention', "This week, when something bothers you, name it within the same day, not to fight, just to say it. 'Hey, that landed a little off for me.' See what happens."],
  ['love', "Learn each other's language", "Ask your partner: 'What's one thing I do that makes you feel really cared for that I might not realize has that effect?' Then listen without commenting."],
];

export function commsProtocols(byDim, youName, themName) {
  const out = [];
  for (const [dim, title, thisWeek] of PROTOCOLS) {
    const fb = byDim[dim];
    if (fb?.isOpportunity || fb?.isNote) out.push({ dim, title, body: fb.adviceText, thisWeek });
  }

  // Nothing to work on is a real result and gets its own three, because a
  // blank action plan reads as the product having nothing to say.
  if (!out.length) {
    out.push(
      { dim: null, title: 'Keep checking in', body: `${youName} and ${themName} are closely aligned across all ten dimensions. The work here is about staying connected rather than catching up. Couples who stay curious about each other's inner experience, even when things feel stable, tend to stay that way longer.` },
      { dim: null, title: 'Stay curious as things change', body: "When two people are this in sync, it's easy to assume the picture stays the same. But what each of you needs, values, and envisions can shift gradually. A brief check-in every few months keeps you current with each other." },
      { dim: null, title: "Name what's working", body: `Most couples only talk about their relationship when something feels off. ${youName} and ${themName} have something worth naming explicitly: real alignment. Talking about what you're doing well, alongside what feels hard, reinforces it.` },
    );
  }
  return out;
}

/**
 * The three-tile plan on the Communication overview, one per domain.
 *
 * Each tile leads with the domain's widest dimension, and shows the shift that
 * helps. When the two are matched there is no shift to give, so the tile
 * carries DOMAIN_ALIGNED's own title and body, which say something useful
 * about sharing a position rather than restating that they share it.
 */
export function commsActionPlan({ feedback, copy }) {
  const byDim = Object.fromEntries(feedback.map((f) => [f.dim, f]));

  return COMM_DOMAINS.map((domain) => {
    const inDomain = domain.dims.map((d) => byDim[d]).filter(Boolean);
    if (!inDomain.length) return null;

    const lead = inDomain.reduce((m, f) => (f.gap > m.gap ? f : m), inDomain[0]);
    const advice = lead.adviceText
      || alignedAdvice(lead.dim, lead.myScore, lead.partScore, copy)
      || lead.strengthText
      || null;

    // No generic label on this page. "One thing to try" and "One thing to keep
    // in mind" sat where a summary line should and said nothing: the domain
    // name is above and the advice below. On Conflict Patterns the same label
    // does real work, separating an action from an awareness note against the
    // frequency band. There is no such distinction here.
    //
    // An aligned domain keeps its title, because DOMAIN_ALIGNED's is a real
    // sentence about this couple rather than a label.
    const aligned = copy.DOMAIN_ALIGNED?.[domain.id];
    const base = advice
      ? { title: null, body: advice, dimLabel: lead.label }
      : { title: aligned?.title || null, body: aligned?.body || null, dimLabel: null };

    return {
      domain: domain.id,
      label: domain.label,
      color: domain.color,
      dim: lead.dim,
      ...base,
      // The website adds this one line to the hardest of the three domains.
      ...(domain.id === 'hard'
        ? { reflect: "In your next hard conversation, pause and ask yourself: am I trying to understand my partner's side, or am I trying to win the argument? Aim for the first one." }
        : {}),
    };
  }).filter(Boolean);
}
