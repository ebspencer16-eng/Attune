/**
 * The three research findings, and where each comes from.
 *
 * ── WHY THIS FILE ─────────────────────────────────────────────────────────
 * This copy was written for the website's Our Purpose page and lives in the
 * markup there. The app's home screen now shows one of them, and copying three
 * paragraphs and three citations into a second surface is how the two end up
 * saying slightly different things about what the research found. A citation
 * that drifts is worse than most drift: it attributes a claim to a source that
 * did not quite make it.
 *
 * So: one copy, here, served to the app through /api/home.
 *
 * public/purpose.html cannot import this, because it is a static page with no
 * build step. check-research.mjs holds the two together instead, the same way
 * check-testimonials.mjs holds the two testimonial blocks together. If the page
 * ever gains a build step, generate it from here and delete that gate.
 *
 * ── THE COPY IS NOT MINE TO EDIT ──────────────────────────────────────────
 * Ellie writes everything a customer reads. These strings are lifted verbatim
 * from the published page, entities and all. If a finding needs rewording it is
 * reworded here and on the page, and the gate makes sure neither is forgotten.
 */

export const RESEARCH = [
  {
    id: 'early-conversations',
    title: 'Early conversations compound',
    body: 'The things that feel too soon to bring up are usually exactly the right things to bring up. Couples who name expectations early stay closer, longer.',
    source: 'Gottman & Silver, The Seven Principles',
  },
  {
    id: 'unsaid',
    title: "Most distance comes from what's unsaid",
    body: "It's rarely incompatibility that creates friction. It's the assumptions each person carries privately (about roles, money, the future) that no one's named yet.",
    source: 'Gottman et al., Journal of Marriage and Family',
  },
  {
    id: 'being-understood',
    title: 'The deepest intimacy is being understood',
    body: 'More than attraction, more than compatibility, being genuinely known by your partner is what makes a relationship hold. Attune helps you get there.',
    source: 'Johnson, Hold Me Tight',
  },
];

/**
 * One finding, chosen by the day rather than at random.
 *
 * Random would mean a reader who opens the app twice in a minute sees two
 * different claims about relationship science, which reads as decoration. By
 * the day it is the same thought for as long as you are thinking about it, and
 * a different one tomorrow.
 */
export function researchOfTheDay(now = new Date()) {
  const day = Math.floor(now.getTime() / 86400000);
  return RESEARCH[day % RESEARCH.length];
}
