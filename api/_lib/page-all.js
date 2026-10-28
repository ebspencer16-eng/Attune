/**
 * Every row of a read, in pages of a thousand.
 *
 * ── WHY ───────────────────────────────────────────────────────────────────
 * Supabase answers at most a thousand rows per request, whatever the request
 * asks for. `.limit(100000)` does not raise that ceiling; it is silently cut
 * to it, with no error and nothing in the reply to say so. So a figure built
 * from a whole table stops moving on the day the table passes a thousand rows,
 * and the admin goes on drawing the first thousand for ever. Ellie asked for
 * the admin to "update as it should" (A169), which is exactly what it stops
 * doing.
 *
 * api/admin-engagement.js got this right from the start with its own `all()`,
 * and nothing else did. That function is `restAll` below now, and the
 * supabase-js shape beside it, so there is one way to read a whole table.
 *
 * ── WHAT A CALLER GETS ────────────────────────────────────────────────────
 * The shape a single read returns, so a call site changes in one place:
 * `{ data, error }` for pageAll, `{ rows, error }` for restAll. For pageAll
 * an error on any page is the error for the whole read and `data` is null:
 * half a table presented as the table is the bug this exists to end. restAll
 * keeps the shape the Engagement endpoint was written against, the rows so far
 * beside the error, because every caller of it reports the error on the page.
 * check-row-cap holds both.
 */

/** The server's ceiling. Asking for more per page is asking for this. */
export const PAGE = 1000;

/**
 * `make` builds the query afresh for each page, with any filters, and pageAll
 * adds the range. `order` names the columns that make the pages stable: without
 * an ORDER BY, Postgres may hand the same row to two pages and skip another.
 * A leading `-` is newest first, for a read whose callers keep its order.
 *
 *   const { data, error } = await pageAll(
 *     () => admin.from('orders').select('*'), { order: ['id'] });
 */
export async function pageAll(make, { order = ['id'] } = {}) {
  const out = [];
  for (let from = 0; ; from += PAGE) {
    let q = make();
    for (const col of order) {
      q = col.startsWith('-') ? q.order(col.slice(1), { ascending: false }) : q.order(col, { ascending: true });
    }
    const { data, error } = await q.range(from, from + PAGE - 1);
    if (error) return { data: null, error };
    const rows = data || [];
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return { data: out, error: null };
}

/**
 * The same over PostgREST directly, for the endpoints that build their own
 * URLs. `path` is everything after /rest/v1/, query string included; it should
 * carry an `order=` for the same reason as above.
 */
export async function restAll(url, key, path) {
  const out = [];
  for (let from = 0; ; from += PAGE) {
    const res = await fetch(`${url}/rest/v1/${path}`, {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Range: `${from}-${from + PAGE - 1}`,
        Prefer: 'count=none',
      },
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      return { rows: out, error: `${path.split('?')[0]}: ${res.status} ${detail.slice(0, 160)}` };
    }
    const rows = await res.json().catch(() => []);
    if (!Array.isArray(rows) || rows.length === 0) break;
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return { rows: out, error: null };
}

/**
 * A read by a list of ids, in batches.
 *
 * `.in('id', ids)` writes every id into the request's address, about 37
 * characters each, and the address has a ceiling. The admin's Feedback page
 * read every survey respondent's profile that way in one request, so a few
 * hundred respondents would have failed the whole page. Found in the A170
 * sweep. Batches of 100 keep each address near 4 KB.
 *
 *   const { data, error } = await inBatches(ids, (chunk) =>
 *     selectProfiles(admin, (q) => q.select('id').in('id', chunk)));
 *
 * Any failed batch fails the read: some of the people is not the people.
 */
export const IN_BATCH = 100;
export async function inBatches(ids, read) {
  const out = [];
  const list = [...ids];
  for (let i = 0; i < list.length; i += IN_BATCH) {
    const r = await read(list.slice(i, i + IN_BATCH));
    if (r?.error) return { ...r, data: null, error: r.error };
    out.push(...(r?.data || []));
  }
  return { data: out, error: null };
}
