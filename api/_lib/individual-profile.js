/**
 * One partner's own placement, in words: the blurb and the two axis rows.
 *
 * ── WHY THIS IS A MODULE AND NOT A COMPONENT ──────────────────────────────
 * The website's couple type page carries a "Your individual types" panel: each
 * partner's individual type, a sentence or two about where they sit, and a bar
 * per axis with a band ("leans open") and the dimension driving it ("Ada
 * expresses feelings readily").
 *
 * The app's couple type page carried none of it. Not because anyone decided it
 * should not, but because the prose and the banding were written inline inside
 * a 15,700-line src/App.jsx and had never left the browser. The app cannot
 * compute any of it: it never scores, and the drivers read raw dimension
 * scores. So the panel was invisible to the app no matter how it was written.
 *
 * Both the website and /api/results now call these. The website passes the raw
 * dimension scores it types from client-side on the demo path; the endpoint
 * passes the blended scores off the stored row. Same words either way.
 *
 * ── THE BANDS ─────────────────────────────────────────────────────────────
 * A coordinate is 0..1 on its axis. Five bands, because three read as a verdict
 * and seven read as false precision. "flexible" is the middle band and is not a
 * failure to land anywhere: neither end of an axis is better than the other.
 */

import { pronounForm } from './role-tokens.js';

/**
 * The five-band label for a 0..1 coordinate.
 * @param {number} score 0..1, where 1 is the `hi` pole.
 */
export function axisBand(score, hi, lo) {
  return score >= 0.8 ? `clearly ${hi}`
    : score >= 0.6 ? `leans ${hi}`
    : score >= 0.4 ? 'flexible'
    : score >= 0.2 ? `leans ${lo}`
    : `clearly ${lo}`;
}

/**
 * The blurb: where this person sits, in two sentences.
 *
 * Verbs conjugate, because "they names feelings in the moment" is the kind of
 * error that makes a reader stop trusting the rest of the page.
 *
 * @param {string} name
 * @param {string} pronouns e.g. 'she/her'
 * @param {number} ec engage coordinate, 0..1, 1 is engage
 * @param {number} oc open coordinate, 0..1, 1 is open
 */
export function individualBlurb(name, pronouns, ec, oc) {
  const sub = pronounForm(pronouns, 'sub');
  const pos = pronounForm(pronouns, 'pos');
  const Sub = sub.charAt(0).toUpperCase() + sub.slice(1);
  const pl = sub === 'they';
  const v = (sg, pv) => (pl ? pv : sg);

  const eng =
    ec >= 0.8 ? `${name} moves toward resolution quickly, feeling what is unresolved and going straight at it.`
    : ec >= 0.6 ? `${name} leans toward engaging, sometimes after a minute to process first.`
    : ec >= 0.4 ? `${name} sits near the middle in terms of how much ${sub} ${v('engages', 'engage')}. Quick to move toward resolution on an easy day, wanting to take a minute under stress.`
    : ec >= 0.2 ? `${name} tends to take space first, then discuss what is unresolved.`
    : `${name} usually needs real space before engaging. What ${sub} ${v('brings', 'bring')} back, once ready, is often thought out.`;

  const opn =
    oc >= 0.8 ? `${Sub} ${v('names', 'name')} feelings in the moment.`
    : oc >= 0.6 ? `${Sub} usually ${v('shares', 'share')} more of ${pos} thoughts and feelings than ${sub} ${v('keeps', 'keep')} back.`
    : oc >= 0.4 ? `${Sub} ${v('shares', 'share')} some thoughts and feelings and ${v('holds', 'hold')} some privately, depending on the moment.`
    : oc >= 0.2 ? `${Sub} may prefer to keep ${pos} thoughts and feelings more private.`
    : `${Sub} ${v('processes', 'process')} privately and ${v('surfaces', 'surface')} thoughts and feelings later.`;

  return `${eng} ${opn}`;
}

/*
 * A note on what is deliberately not here.
 *
 * This module used to carry a `driver` sentence per axis ("Ada expresses
 * feelings readily"), lifted from src/App.jsx where it had been computed for
 * every bar and then destructured and dropped. It had never rendered, on
 * either surface, which means it had never been read by anyone and never
 * reviewed as copy.
 *
 * Porting it would have put unreviewed sentences about a real person on a real
 * results page purely because the code to produce them already existed. If the
 * bars should say why, that is copy for Ellie to write and a block to add to
 * the spec, not a dead branch to revive.
 */

/**
 * The two axis rows for one person: label, band, 0..1 score and the driver.
 *
 * @param {string} name
 * @param {{engage: number, open: number}} coords 0..1 each
 */
export function axisRows(name, coords) {
  return [
    {
      axis: 'engage',
      label: 'Engage/Withdraw',
      value: axisBand(coords.engage, 'engaged', 'withdrawn'),
      score: coords.engage,
    },
    {
      axis: 'open',
      label: 'Open/Guarded',
      value: axisBand(coords.open, 'open', 'guarded'),
      score: coords.open,
    },
  ];
}
