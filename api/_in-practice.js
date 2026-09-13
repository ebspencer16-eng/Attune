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
 * Twelve exist. Six are here. See PENDING_EXCERPT below for the other six and
 * what they are waiting on.
 *
 * So the app was not missing a feature. It was reading a different source from
 * the one the content lives in.
 *
 * This is the index, and only the index: slug, title, excerpt, category, read
 * time. The article bodies stay on the website and the app opens them there,
 * the same way every other thing the app cannot yet render is handled. When
 * posts are genuinely published to the table, that takes precedence and this
 * becomes the fallback for an empty table rather than the only source.
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
};

/** The canonical shelf for an article, for the app's filter row. */
export function shelfFor(a) {
  return SHELF[a.category] || POST_CATEGORIES[0];
}

/**
 * The six pieces on the website that the app's shelf does not carry, and why.
 *
 * Twelve articles exist. public/practice/all.html indexes all twelve and
 * vercel.json routes all twelve. IN_PRACTICE below carries six, because six is
 * how many have a card on public/practice.html, and a card is the only place
 * an excerpt was ever written.
 *
 * So the gap is one sentence per piece, in Ellie's voice, of the kind already
 * below: what the piece is about, in the tone of the article. Nothing else is
 * missing; the titles, categories and read times are on all.html already.
 *
 * Listing them here rather than leaving them absent is the point. An article
 * that is neither here nor in IN_PRACTICE fails check-in-practice.mjs, so a
 * thirteenth piece cannot be added and quietly reach only half the product,
 * which is exactly what happened to these six.
 *
 * Ellie writes all customer-facing copy, so these stay listed until she writes
 * the six lines. The build does not fail for a copy gap.
 */
export const PENDING_EXCERPT = [
  'how-to-use-your-results',
  'why-couples-fight-about-the-same-things',
  'what-your-communication-style-reveals',
  'what-your-couple-type-tells-you',
  'for-the-bridge-the-conversation-you-need',
  'why-naming-the-pattern-changes-everything',
];

export const IN_PRACTICE = [
  {"slug": "how-to-review-your-results-together", "path": "/practice/how-to-review-your-results-together", "category": "getting-started", "categoryLabel": "Getting Started", "title": "How to review your results together", "excerpt": "Some couples open their results immediately; others wait for a quiet moment. Either approach works. What matters is how you do it.", "readMinutes": 6},
  {"slug": "how-to-start-a-hard-conversation", "path": "/practice/how-to-start-a-hard-conversation", "category": "conflict", "categoryLabel": "Conflict & Repair", "title": "How to start a hard conversation", "excerpt": "When you find a gap in your results that feels significant, here's a structure that opens things up rather than putting either person on the defensive.", "readMinutes": 7},
  {"slug": "conflict-vs-repair", "path": "/practice/conflict-vs-repair", "category": "conflict", "categoryLabel": "Conflict & Repair", "title": "The difference between conflict and repair", "excerpt": "Two people can have compatible conflict styles and completely incompatible repair needs. Most couples have never distinguished these.", "readMinutes": 5},
  {"slug": "when-a-conversation-turns-heated", "path": "/practice/when-a-conversation-turns-heated", "category": "conflict", "categoryLabel": "Conflict & Repair", "title": "When a conversation turns heated", "excerpt": "Understanding each other deeply doesn't mean you'll stop having hard moments. It means you have better tools when you do.", "readMinutes": 5},
  {"slug": "staying-current-with-each-other", "path": "/practice/staying-current-with-each-other", "category": "getting-started", "categoryLabel": "Getting Started", "title": "Staying current with each other over time", "excerpt": "People change. What you need, value, and envision shifts. The couples who stay genuinely close over decades check in.", "readMinutes": 5},
  {"slug": "five-books-that-change-how-couples-think", "path": "/practice/five-books-that-change-how-couples-think", "category": "understanding", "categoryLabel": "Understanding", "title": "Five books that change how couples think", "excerpt": "Not a comprehensive bibliography. A short list of books that genuinely shift how people see each other, curated because they earn their place.", "readMinutes": 4}
];

/** Newest first is the order practice.html lists them in. */
export function inPracticeIndex() {
  return IN_PRACTICE;
}
