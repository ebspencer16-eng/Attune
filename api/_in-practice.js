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
  experience: POST_CATEGORIES[0],
  understanding: POST_CATEGORIES[1],
  conflict: POST_CATEGORIES[2],
  methodology: POST_CATEGORIES[3],
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
  /* The thirteen Ellie approved on 22 October, in her four sections and her
     order. Twelve are placeholders she rewrites as she has time; the second
     one is hers already and its page is her words untouched. */
  {"slug": "what-is-the-attune-experience", "path": "/practice/what-is-the-attune-experience", "category": "experience", "title": "What the Attune experience is for", "excerpt": "Most couples do not go looking for a relationship tool because something is wrong.", "readMinutes": 6},
  {"slug": "how-to-review-your-results-together", "path": "/practice/how-to-review-your-results-together", "category": "experience", "title": "How to review your results together", "excerpt": "Though there is no prescribed method or ‘best way’ to approach your Attune insights, we compiled the following outline to guide anyone trying to thoughtfully approach this experience.", "readMinutes": 6},
  {"slug": "living-attuned", "path": "/practice/living-attuned", "category": "experience", "title": "Living attuned", "excerpt": "Finishing your Attune experience is not the end of anything.", "readMinutes": 7},
  {"slug": "understanding-is-an-action", "path": "/practice/understanding-is-an-action", "category": "understanding", "title": "Understanding is something you do", "excerpt": "Most people treat understanding their partner as a state they arrived at some time ago.", "readMinutes": 6},
  {"slug": "the-importance-of-understanding", "path": "/practice/the-importance-of-understanding", "category": "understanding", "title": "Why understanding matters more than agreement", "excerpt": "There is a finding in relationship research that surprises almost everybody who hears it.", "readMinutes": 7},
  {"slug": "how-to-create-an-understanding-environment", "path": "/practice/how-to-create-an-understanding-environment", "category": "understanding", "title": "How to build a relationship where understanding is normal", "excerpt": "Understanding does not happen because two people intend it.", "readMinutes": 7},
  {"slug": "conflict-is-inevitable", "path": "/practice/conflict-is-inevitable", "category": "conflict", "title": "Conflict is not the problem", "excerpt": "Plenty of couples arrive at a relationship tool quietly hoping it will help them argue less.", "readMinutes": 6},
  {"slug": "conflict-vs-repair", "path": "/practice/conflict-vs-repair", "category": "conflict", "title": "The difference between conflict and repair", "excerpt": "Two people can handle conflict in almost exactly the same way and still need completely different things once it is over.", "readMinutes": 6},
  {"slug": "how-to-start-a-hard-conversation", "path": "/practice/how-to-start-a-hard-conversation", "category": "conflict", "title": "How to start a hard conversation", "excerpt": "When you already know a conversation is going to be difficult, the hardest part is almost always the first sentence.", "readMinutes": 7},
  {"slug": "why-couples-fight-about-the-same-things", "path": "/practice/why-couples-fight-about-the-same-things", "category": "conflict", "title": "Why couples fight about the same things", "excerpt": "Most couples have one argument that keeps returning.", "readMinutes": 6},
  {"slug": "the-attune-exercises", "path": "/practice/the-attune-exercises", "category": "methodology", "title": "The Attune exercises, and what each one is for", "excerpt": "Attune is made of five exercises.", "readMinutes": 8},
  {"slug": "understanding-your-couple-type", "path": "/practice/understanding-your-couple-type", "category": "methodology", "title": "What your couple type changes", "excerpt": "Your couple type is a description of the dynamic the two of you make together.", "readMinutes": 6},
  {"slug": "why-individual-exercises-work", "path": "/practice/why-individual-exercises-work", "category": "methodology", "title": "Why you answer separately", "excerpt": "Every exercise in Attune is completed alone.", "readMinutes": 6}
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
