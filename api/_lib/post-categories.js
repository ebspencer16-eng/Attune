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
  // Ellie's four, 22 October, replacing Getting Started and Methodology:
  // "as mentioned above I want these to replace what's live". The order is
  // hers and it is display order, so changing it changes both surfaces.
  'The Attune Experience',
  'Understanding Each Other',
  'Conflict and Repair',
  'Attune Methodology',
];
