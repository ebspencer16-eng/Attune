import { COMM_DOMAINS as DOMAINS } from './tags.js';

/**
 * The three Communication domain pages: what each one is called, what it says,
 * and what colour it is painted.
 *
 * ── WHY THIS LEFT src/App.jsx ─────────────────────────────────────────────
 * These four facts were inline in the website's results component, which meant
 * the app could not have them. It had no intro paragraph on a domain page and
 * drew every one on the same cream ground, while the website opens each with a
 * paragraph on a ground tinted to that domain.
 *
 * The app was not choosing to look different. The words and the colour had
 * never been anywhere it could read them.
 *
 * `ground` is the gradient the website paints the page with, expressed as its
 * three stops so a native gradient can use the same numbers. `dark` is the
 * tint those stops are built from, kept because the website builds the string
 * from it.
 */

/** The tint each domain's page is painted with. */
const TINT = { inner: '#5B21B6', connection: '#C2410C', hard: '#1E3A8A' };

/** The three stops of a domain page's background, dark to light. */
export function groundFor(id) {
  const t = TINT[id] || TINT.inner;
  return [`${t}dd`, `${t}99`, '#22204a'];
}

/*
 * The three opening paragraphs are Ellie's, from her message of 20
 * September, and replaced longer ones she had not written. Both surfaces read
 * them from here.
 */
/**
 * ── THE THREE DOMAINS, DERIVED ────────────────────────────────────────────
 * This list used to carry each domain's id, label, colour and dimensions,
 * typed out, beside DOMAIN_LABEL, DOMAIN_COLOR and DOMAIN_OF in tags.js doing
 * the same job. Two copies of the three domains, in two modules, read by
 * different halves of the product: commsActionPlan builds the action plan from
 * tags.js, while src/App.jsx and what-comes-next.js read this one.
 *
 * All four values agreed, which is why nothing had ever noticed. Values that
 * agree today are the ones nothing watches, and the shape of every serious bug
 * in this codebase is one rule maintained by hand in two places. Had the two
 * `dims` lists ever parted, a dimension would have been scored into one
 * domain's action plan and drawn on another domain's page.
 *
 * So the facts come from tags.js. The prose stays here, which is the one thing
 * this module owns.
 */
const PROSE = {
  inner: "How you handle feelings before sharing thoughts aloud. Understand each other's approaches to establish supportive communication methods.",
  connection: "The mechanics of your relationship. Understanding your unique dynamic helps you communicate in a way that will be interpreted clearly.",
  hard: 'All couples navigate conflict. What sets healthy relationships apart is the ability to communicate effectively in difficult situations.',
};

export const COMM_DOMAINS = DOMAINS.map((d) => ({ ...d, prose: PROSE[d.id] }));

/** Everything a renderer needs for one domain, ground included. */
export function commDomains() {
  return COMM_DOMAINS.map((d) => ({ ...d, ground: groundFor(d.id) }));
}

/**
 * The order Communication dimensions are shown in, everywhere.
 *
 * ── WHY IT IS THE DOMAINS FLATTENED ───────────────────────────────────────
 * The results present these as three domains: what happens inside you, how you
 * connect, and what happens when things get hard. A glance page that lists all
 * ten has to pick an order, and the only one that will not fight the rest of
 * the section is the order the domains themselves put them in. Read the glance
 * top to bottom and then the three detail pages, and nothing moves.
 *
 * ── WHY IT IS DERIVED AND NOT WRITTEN ─────────────────────────────────────
 * It was written out by hand in src/App.jsx, twice, as DOMAIN_ORDER and
 * UR_DOMAIN_ORDER. The app had neither, so it used the order the dimensions
 * arrive in, which is DIM_KEYS: the scoring order. Those differ. `needs` and
 * `bids` are swapped and `listening` sits four places apart.
 *
 * So the same ten rows read in a different order on the two products, and
 * Ellie found it by looking. Nothing could have caught it: one order was a
 * literal in a file the app cannot read and the other was an implicit
 * consequence of an object's key order.
 *
 * Derived from COMM_DOMAINS, so moving a dimension between domains moves it
 * here too and cannot leave the glance disagreeing with the pages.
 */
export const DIMENSION_DISPLAY_ORDER = COMM_DOMAINS.flatMap((d) => d.dims);
