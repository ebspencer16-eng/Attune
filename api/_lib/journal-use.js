/**
 * How often someone writes in their relationship journal.
 *
 * ── WHAT ELLIE ASKED FOR ──────────────────────────────────────────────────
 * "I want admin data about how often it's used, and I want a slicer variable
 * for never used journal, uses <3x/mo, or uses 3x+/mo."
 *
 * ── WHAT IS AND IS NOT MEASURED ───────────────────────────────────────────
 * The COUNT of entries and the days they were written on. Not a word of what
 * anyone wrote. This file never sees a body, because the query that feeds it
 * asks for `owner_id, created_at` and nothing else, and the field it produces
 * is one of three strings. A diary is the most private thing in this product
 * and an admin page that could quote one would be a different product.
 *
 * ── WHY A RATE AND NOT A COUNT ────────────────────────────────────────────
 * "3x/mo" is a rate, and a raw total answers a different question: someone
 * who wrote forty entries last year and stopped is not a person who uses the
 * journal three times a month. So it is entries in the last thirty days,
 * which is the reading of "uses" that is about now.
 *
 * The raw count goes out beside it, because a bucket that cannot be checked
 * against the number under it is a bucket nobody trusts.
 *
 * ── WHY ITS OWN FILE ──────────────────────────────────────────────────────
 * Two callers: the explore page's per-person field, and any later roll-up.
 * The boundaries are the thing that must not be restated: "under three" and
 * "three or more" typed in two places drift the first time one is tuned.
 */

/** The window "per month" means here. */
export const JOURNAL_WINDOW_DAYS = 30;

/** Where the buckets divide. Entries in the window, per person. */
export const JOURNAL_BUCKETS = {
  never: 'Never used',
  light: 'Under 3 a month',
  regular: '3 or more a month',
};

/**
 * Which bucket a person falls in.
 *
 * `recent` is entries inside the window; `ever` is whether they have written
 * one at all. Someone who wrote in March and not since is not "never used":
 * they are someone whose rate is now zero, which the light bucket says and
 * the never bucket would not.
 */
export function journalBucket({ recent = 0, ever = 0 } = {}) {
  if (!ever) return JOURNAL_BUCKETS.never;
  return recent >= 3 ? JOURNAL_BUCKETS.regular : JOURNAL_BUCKETS.light;
}

/**
 * Per-owner counts from the rows of a journal query.
 *
 * Takes `{ owner_id, created_at }` and nothing else: passing whole note rows
 * in here would mean a body reached this file, and the point is that one
 * never does.
 */
export function journalUseByOwner(rows = [], now = Date.now()) {
  const cutoff = now - JOURNAL_WINDOW_DAYS * 86400000;
  const out = new Map();
  for (const r of rows) {
    const id = r?.owner_id;
    if (!id) continue;
    const at = Date.parse(r.created_at || '');
    const seen = out.get(id) || { ever: 0, recent: 0 };
    seen.ever += 1;
    if (Number.isFinite(at) && at >= cutoff) seen.recent += 1;
    out.set(id, seen);
  }
  return out;
}

/**
 * All-time volume, in bands.
 *
 * The slicer above is a rate, which is what Ellie asked for and is the right
 * reading of "uses". It cannot answer "has anyone written a lot in here", so
 * this is the total, banded rather than raw.
 *
 * Banded because the admin explorer draws a category per distinct value: a
 * raw count would put one bar on the chart for every person who has written a
 * different number of entries, which is a chart of nothing.
 */
export const JOURNAL_VOLUME_BANDS = ['0', '1', '2', '3\u20135', '6\u201310', '11+'];

export function journalVolumeBand(ever = 0) {
  if (ever <= 0) return JOURNAL_VOLUME_BANDS[0];
  if (ever === 1) return JOURNAL_VOLUME_BANDS[1];
  if (ever === 2) return JOURNAL_VOLUME_BANDS[2];
  if (ever <= 5) return JOURNAL_VOLUME_BANDS[3];
  if (ever <= 10) return JOURNAL_VOLUME_BANDS[4];
  return JOURNAL_VOLUME_BANDS[5];
}

/** The whole product's number, for a line on the engagement page. */
export function journalTotals(byOwner) {
  let people = 0;
  let regular = 0;
  let entries = 0;
  for (const v of byOwner.values()) {
    people += 1;
    entries += v.ever;
    if (v.recent >= 3) regular += 1;
  }
  return { people, entries, regular };
}
