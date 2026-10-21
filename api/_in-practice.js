/**
 * The In Practice index.
 *
 * ── WHY THIS EXISTS ───────────────────────────────────────────────────────
 * The app's Resources tab has an In Practice shelf and it has always been
 * empty, because the app reads the `posts` table and nothing has ever been
 * published to it. The pieces that actually exist are pages on the website,
 * routed in vercel.json and indexed by hand in public/practice.html and
 * public/practice/all.html.
 *
 * All twelve are here. Six carry an excerpt, from the card each has on
 * practice.html. The other six do not, because a card is the only place an
 * excerpt was ever written and Ellie has said one is not needed.
 *
 * So the app was not missing a feature. It was reading a different source from
 * the one the content lives in.
 *
 * This is the index, and only the index: slug, title, excerpt, category, read
 * time. The bodies are generated from the pages themselves into
 * api/_in-practice-bodies.js, so the app draws the articles rather than
 * handing the reader to the browser. When posts are genuinely published to the
 * table, that takes precedence and this becomes the fallback for an empty
 * table rather than the only source.
 *
 * ── HOW IT IS KEPT HONEST ─────────────────────────────────────────────────
 * public/practice.html is static with no build step, so it cannot import this.
 * check-in-practice.mjs holds the two together, the same arrangement
 * check-research.mjs has for the research findings. If that page ever gains a
 * build step, generate it from here and delete the gate.
 */

import { POST_CATEGORIES } from './_lib/post-categories.js';

/**
 * The page tags a card "Conflict & Repair" and shelves it under "When It's
 * Difficult". Two vocabularies for the same four shelves, and the app filters
 * by the shelf, so the tag on its own would put every conflict piece in a
 * category the filter row does not have.
 *
 * The labels come from post-categories.js by position rather than being typed
 * again here, so renaming a shelf renames it everywhere.
 */
const SHELF = {
  'getting-started': POST_CATEGORIES[0],
  conflict: POST_CATEGORIES[1],
  understanding: POST_CATEGORIES[2],
  methodology: POST_CATEGORIES[3],
  // A fifth name on the website for the fourth shelf here. practice.html files
  // /practice/couple-types under Methodology in its own nav, and three
  // articles carry cat:'couple-types' in all.html. Without this they fall back
  // to Getting Started, which is the wrong shelf and a silent one.
  'couple-types': POST_CATEGORIES[3],
};

/** The canonical shelf for an article, for the app's filter row. */
export function shelfFor(a) {
  return SHELF[a.category] || POST_CATEGORIES[0];
}

/**
 * The name each section is shown under.
 *
 * ── WHY IT IS NOT ON THE ARTICLE ──────────────────────────────────────────
 * It was. Every row carried its own `categoryLabel`, typed out, and two of the
 * twelve disagreed with their neighbours: an article filed under `conflict` was
 * labelled "Getting Started", and the two `understanding` articles were labelled
 * "Understanding" and "Understanding Each Other". So a reader met one section
 * wearing two names, and a section wearing another section's name, depending on
 * which article they happened to open.
 *
 * Found while listing the articles for someone to make cover images from, which
 * is the usual way: a list of a thing is where the thing's inconsistencies show
 * up.
 *
 * ── AND THERE IS ONE NAMING SYSTEM NOW, WHICH IS HERS ─────────────────────
 * There were two. This map had its own strings and `SHELF` above mapped the
 * same categories onto POST_CATEGORIES, so an article's label and the shelf it
 * sat on could disagree, and two of them did: "Conflict & Repair" against
 * "Conflict and Repair", and "Couple Types" against "Methodology".
 *
 * Ellie: "The sections should match what we have on the app and site, right
 * now the site one is called methodology." She is right, and the site already
 * said Methodology everywhere a reader could see it: the pill, the cards and
 * the page's own address. The only thing still saying Couple Types was this
 * map, which is what the app draws on an article card and what the Drive docs
 * were built from.
 *
 * So there is nothing typed here any more. The label IS the shelf, read
 * through `shelfFor`, which reads POST_CATEGORIES, which is where she named
 * them. Renaming a shelf renames it on every surface in one edit.
 */
const labelFor = (category) => SHELF[category] || POST_CATEGORIES[0];

const IN_PRACTICE_ROWS = [
  {"slug": "how-to-review-your-results-together", "path": "/practice/how-to-review-your-results-together", "category": "getting-started", "title": "How to review your results together", "excerpt": "Though there is no prescribed method or \u2018best way\u2019 to approach your Attune insights, we compiled the following outline to guide anyone trying to thoughtfully approach this experience.", "readMinutes": 6},
  {"slug": "how-to-start-a-hard-conversation", "path": "/practice/how-to-start-a-hard-conversation", "category": "conflict", "title": "How to start a hard conversation", "excerpt": "When you find a gap in your results that feels significant, here's a structure that opens things up rather than putting either person on the defensive.", "readMinutes": 7},
  {"slug": "conflict-vs-repair", "path": "/practice/conflict-vs-repair", "category": "conflict", "title": "The difference between conflict and repair", "excerpt": "Two people can have compatible conflict styles and completely incompatible repair needs. Most couples have never distinguished these.", "readMinutes": 5},
  {"slug": "when-a-conversation-turns-heated", "path": "/practice/when-a-conversation-turns-heated", "category": "conflict", "title": "When a conversation turns heated", "excerpt": "Understanding each other deeply doesn't mean you'll stop having hard moments. It means you have better tools when you do.", "readMinutes": 5},
  {"slug": "staying-current-with-each-other", "path": "/practice/staying-current-with-each-other", "category": "getting-started", "title": "Staying current with each other over time", "excerpt": "People change. What you need, value, and envision shifts. The couples who stay genuinely close over decades check in.", "readMinutes": 5},
  {"slug": "five-books-that-change-how-couples-think", "path": "/practice/five-books-that-change-how-couples-think", "category": "understanding", "title": "Five books that change how couples think", "excerpt": "Not a comprehensive bibliography. A short list of books that genuinely shift how people see each other, curated because they earn their place.", "readMinutes": 4},

  // The six the website has and the app did not. Added without an excerpt:
  // Ellie, 12 Sep, "we need the 12 articles written as placeholders ... but we
  // don't need excerpts". The app renders the subtitle only when there is one.
  //
  // categoryLabel is what all.html says. category is what it files them
  // under, and shelfFor uses that, so why-couples-fight lands on "When It's
  // Difficult" rather than the "Getting Started" its label claims. That
  // mismatch is on the website, not here, and is worth a look.
  {"slug": "how-to-use-your-results", "path": "/practice/how-to-use-your-results", "category": "getting-started", "title": "How to use your results", "readMinutes": 8},
  {"slug": "why-couples-fight-about-the-same-things", "path": "/practice/why-couples-fight-about-the-same-things", "category": "conflict", "title": "Why couples fight about the same things", "readMinutes": 6},
  {"slug": "what-your-communication-style-reveals", "path": "/practice/what-your-communication-style-reveals", "category": "understanding", "title": "What your communication style reveals", "readMinutes": 7},
  {"slug": "what-your-couple-type-tells-you", "path": "/practice/what-your-couple-type-tells-you", "category": "couple-types", "title": "What your couple type tells you", "readMinutes": 6},
  {"slug": "why-naming-the-pattern-changes-everything", "path": "/practice/why-naming-the-pattern-changes-everything", "category": "couple-types", "title": "Why naming the pattern changes everything", "readMinutes": 4}
];

/**
 * Every article, with its section name derived rather than carried. A row that
 * still has a `categoryLabel` of its own is ignored, which is what stops the
 * old shape creeping back one article at a time.
 */
export const IN_PRACTICE = IN_PRACTICE_ROWS.map(({ categoryLabel: _ignored, ...row }) => ({
  ...row,
  categoryLabel: labelFor(row.category),
}));

/** Newest first is the order practice.html lists them in. */
export function inPracticeIndex() {
  return IN_PRACTICE;
}
