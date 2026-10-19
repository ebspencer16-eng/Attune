/**
 * How long each part of a request took, said in the response.
 *
 * ── WHY ───────────────────────────────────────────────────────────────────
 * Ellie: "My pages are still taking a long time to load."
 *
 * Finding out where that time went meant instrumenting the app, launching it
 * cold on a simulator and reading Metro's log, which is a lot of machinery to
 * answer "is it us or is it the phone". The server says now instead.
 *
 * It paid for itself immediately. On /api/home the first database read
 * measured between 158ms and 2308ms across five launches while every other
 * read stayed under 500ms, which is not a slow query, it is two code paths.
 * Nothing visible from outside would ever have shown that.
 *
 * ── WHAT IS IN IT ─────────────────────────────────────────────────────────
 * A phase name and a number of milliseconds. Nothing about a customer, no
 * identifiers, no counts of anybody's rows. `Server-Timing` is a standard
 * header and is visible in any network inspector, which is the point: the
 * next person asking this question should not have to build the rig again.
 *
 * The marks are a list rather than an object so the order is the order they
 * happened in, which is half of what a waterfall tells you.
 */

/** One request's worth of marks. */
export function phases() {
  const startedAt = Date.now();
  const marks = [];
  return {
    /**
     * Run `work`, and record how long it took under `name`.
     *
     * The mark is written in a finally, so a phase that throws is still
     * reported: a read that fails slowly is exactly the thing worth seeing.
     */
    async mark(name, work) {
      const at = Date.now();
      try { return await work(); }
      finally { marks.push(`${name};dur=${Date.now() - at}`); }
    },
    /** A note with no duration of its own, for something worth recording. */
    note(name, value) {
      marks.push(`${name};dur=${Number(value) || 0}`);
    },
    /** The header value: every mark in order, then the whole handler. */
    header() {
      return [...marks, `total;dur=${Date.now() - startedAt}`].join(', ');
    },
  };
}

/**
 * A `json` helper that carries the timing.
 *
 * Each endpoint builds its own Response and they do not share one, so this
 * takes the headers it should use rather than owning them.
 */
export function withTiming(headers, timing) {
  return timing ? { ...headers, 'Server-Timing': timing } : headers;
}
