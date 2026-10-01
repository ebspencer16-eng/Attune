/**
 * The In Practice shelves.
 *
 * practice.html had these as markup and nothing else, so the app kept its own
 * copy to build the filter row with. Two hand-maintained lists, and adding a
 * shelf changed the site while the app went on offering the old four.
 *
 * Returned by /api/posts?action=feed so the app renders the shelves the server
 * knows about. Order is display order.
 *
 * A post's category is free text and nullable (migration 052). Anything
 * uncategorised, or carrying a category not listed here, still appears under
 * All rather than vanishing: a post that disappears because someone typed a
 * shelf name slightly differently is a worse failure than one filed oddly.
 */
export const POST_CATEGORIES = [
  'Getting Started',
  // Ellie, choosing between the two names the product was using: "Conflict and
  // Repair and Understanding Each Other". The page tagged cards "Conflict &
  // Repair" and shelved them under "When It's Difficult", so a reader met two
  // names for one shelf. This is the one she picked, spelled the way she wrote
  // it: "and", not an ampersand.
  'Conflict and Repair',
  'Understanding Each Other',
  // Ellie: "I want methodology". This shelf had two names: the index pill said
  // Methodology and its own page, its three cards and its address said Couple
  // Types. One name now, hers, and every surface reads it from here.
  'Methodology',
];
