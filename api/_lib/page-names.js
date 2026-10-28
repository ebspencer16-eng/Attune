/**
 * What each marketing page is called, for charts that list them.
 *
 * ── WHY IT EXISTS ─────────────────────────────────────────────────────────
 * Ellie, of the Engagement page's time-per-page chart: "Marketing pages
 * column labels are wrong, they should be Home, Our Purpose, Packages,
 * Registry, In Practice, FAQs."
 *
 * They were the raw paths, because api/admin-engagement.js built each column
 * as `{ key: k, label: k }`: the label was the path and nobody had given it
 * anything else to use. So a chart about where people spend their time read
 * "/offerings" at a reader who calls that page Packages.
 *
 * ── WHY A MAP AND NOT A PRETTIFIER ────────────────────────────────────────
 * "/wedding-registry" does not become "Registry" by any rule, and "/faq" does
 * not become "FAQs". These are names, and a name has to be written down.
 * check-page-names holds every one of them to the link text in the site's own
 * nav, so this cannot drift into calling a page something the nav does not,
 * which is the failure that gave the product two names for one section.
 *
 * A path with no entry keeps its path, which is what it had before, and the
 * gate reports it rather than letting it pass as a name.
 */
export const MARKETING_PAGE_NAMES = {
  '/home': 'Home',
  '/purpose': 'Our Purpose',
  '/offerings': 'Packages',
  '/wedding-registry': 'Registry',
  '/practice': 'In Practice',
  '/faq': 'FAQs',
};

/**
 * The short form, for a column label.
 *
 * ── WHY A SECOND MAP RATHER THAN INITIALS ─────────────────────────────────
 * Ellie: "Marketing page labels still make no sense on marketing pages time
 * per page chart. We can abbreviate to H, OP, BP, WR, IP, FAQ."
 *
 * Her list is not the initials of the names above: Packages abbreviates to BP
 * and Registry to WR, because the pages are Buy Packages and the Wedding
 * Registry in her head. So this is a name too, and a name has to be written
 * down. Keyed by path like the long form, so the two cannot come to disagree
 * about which page they are describing, and the gate checks every path has
 * both.
 *
 * The full name is still in the hover: the chart draws these and says the
 * long one when you ask it.
 */
export const MARKETING_PAGE_SHORT = {
  '/home': 'H',
  '/purpose': 'OP',
  '/offerings': 'BP',
  '/wedding-registry': 'WR',
  '/practice': 'IP',
  '/faq': 'FAQ',
};

/** The name for a recorded path, or the path when it has no name yet. */
export function marketingPageName(path) {
  if (!path) return path;
  const p = String(path).replace(/\/+$/, '') || '/home';
  return MARKETING_PAGE_NAMES[p] || MARKETING_PAGE_NAMES['/' + p.replace(/^\//, '')] || path;
}

/** The short label for a recorded path, or its long name when it has none. */
export function marketingPageShort(path) {
  if (!path) return path;
  const p = String(path).replace(/\/+$/, '') || '/home';
  return MARKETING_PAGE_SHORT[p] || MARKETING_PAGE_SHORT['/' + p.replace(/^\//, '')] || marketingPageName(path);
}

/**
 * A long section name, short enough to sit under a column.
 *
 * ── WHY INITIALS AND NOT A MAP ────────────────────────────────────────────
 * Ellie: "Exercises column labels can be abbreviated (CS. E. RR. PIE. CP.)
 * same with results (H. CT. CS. E. RR. PIE. CP. WN.)"
 *
 * Her list is the initials of the names the product already uses, for seven
 * of the eight: Communication Styles, Expectations, Relationship Reflection,
 * Physical Intimacy Expectations, Conflict Patterns, Highlights, Couple Type.
 * A map would be a second copy of all seven, and a second copy of a name is
 * how this product ended up calling one section two things.
 *
 * The eighth is "What Comes Next", which gives WCN where she wrote WN. Taking
 * the initials is the rule; that one difference is named in TASKS.md rather
 * than smuggled in as an exception, because an exception list is where the
 * next real mismatch would hide.
 */
export function abbreviate(label) {
  const words = String(label || '').split(/[\s&/-]+/).filter((w) => /[A-Za-z]/.test(w));
  if (!words.length) return String(label || '');
  const short = words.map((w) => w[0].toUpperCase()).join('');
  /* A name already short enough reads better whole than as one letter. */
  return String(label).length <= 3 ? String(label) : short;
}
