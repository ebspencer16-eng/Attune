/**
 * Demo accounts are not people, and the admin must not count them.
 *
 * ── WHY THIS EXISTS ───────────────────────────────────────────────────────
 * Ellie, having looked at who the admin was reporting as non-binary: "Alex and
 * Sam were demos." Then: "Alex and sam and test profiles should not be included
 * in admin."
 *
 * They are rows in `profiles` like anybody else, so they were inside every
 * figure the admin draws: the couple types, the demographics, the engagement,
 * the completion funnel, the survey's segments. With a handful of real couples,
 * two demo accounts are a large share of every number on the page, and a number
 * that is mostly us is worse than no number.
 *
 * ── HOW A ROW IS MARKED ───────────────────────────────────────────────────
 * One column, `profiles.is_demo`, set by migration 082 and editable afterwards.
 * Not a name match at read time: "test" appears in real words, somebody called
 * Alex will sign up one day, and a rule that guesses would quietly drop a
 * customer out of the figures with nobody the wiser. The migration names who it
 * marks and prints them back.
 *
 * ── WHILE THE MIGRATION HAS NOT RUN ───────────────────────────────────────
 * Asking PostgREST for a column that does not exist is a 400, which would take
 * every admin page down between a deploy and her running the SQL. So every
 * read here tries the filter, and on that specific failure runs again without
 * it and says so in `demoFilterApplied`. The admin shows a line when it is
 * false, because quietly counting demos is how this started.
 *
 * This file is the one place that knows any of it.
 */

/** The PostgREST filter, for a URL-built query. */
export const DEMO_FILTER_QS = 'is_demo=not.is.true';

/** The column, for a select list that has to carry it. */
export const DEMO_COLUMN = 'is_demo';

/** Does this row look like the column is missing rather than the data? */
export function isMissingColumn(err) {
  const text = String((err && (err.message || err.details || err.hint)) || err || '');
  return /is_demo/.test(text) && /does not exist|unknown|column|schema cache/i.test(text);
}

/**
 * Run a supabase-js profiles query with demo rows excluded.
 *
 * `build` is given a fresh query so it can be run twice: once filtered, and
 * again unfiltered if the column is not there yet.
 *
 * Returns { data, error, demoFilterApplied }.
 */
export async function selectProfiles(admin, build) {
  const first = await build(admin.from('profiles')).not(DEMO_COLUMN, 'is', true);
  if (!first.error) return { ...first, demoFilterApplied: true };
  if (!isMissingColumn(first.error)) return { ...first, demoFilterApplied: true };
  const again = await build(admin.from('profiles'));
  return { ...again, demoFilterApplied: false };
}

/**
 * The same, for the engagement endpoint, which builds its own URLs.
 *
 * `run` takes a path and answers `{ rows, error }`, the shape that endpoint's
 * own fetch helper returns. It is called with the filter and, if the column is
 * missing, again without it.
 */
export async function fetchProfiles(run, path) {
  const sep = path.includes('?') ? '&' : '?';
  const first = await run(`${path}${sep}${DEMO_FILTER_QS}`);
  if (!first.error) return { ...first, demoFilterApplied: true };
  if (!isMissingColumn(first.error)) return { ...first, demoFilterApplied: true };
  return { ...(await run(path)), demoFilterApplied: false };
}

/**
 * The demo ids, for a surface that filters rows of another table by who owns
 * them. The survey's responses are the case: dropping the demographics of a
 * demo respondent would leave their answers in the charts.
 *
 * Returns { ids: Set, demoFilterApplied }. An unmarked database answers with
 * an empty set and false, which counts demos and says so.
 */
export async function demoIds(admin) {
  const { data, error } = await admin.from('profiles').select('id').eq(DEMO_COLUMN, true);
  if (error) return { ids: new Set(), demoFilterApplied: false };
  return { ids: new Set((data || []).map((r) => r.id)), demoFilterApplied: true };
}

/** For rows already in hand: true when this profile is a demo. */
export const isDemo = (p) => !!(p && p.is_demo);
