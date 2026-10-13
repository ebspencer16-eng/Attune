/**
 * Which day it is, for the things that change once a day.
 *
 * ── THE BUG THIS CAME FROM ────────────────────────────────────────────────
 * Ellie: "Why am I seeing different insight of the day and different word +
 * definition on my app on my phone vs on my simulator on the same day?"
 *
 * Because it was not the same day to us. Both were picked with
 *
 *     Math.floor(now.getTime() / 86400000)
 *
 * which counts days from the epoch in UTC and therefore turns over at 00:00Z.
 * That is 5pm in California and 8pm in New York. Everyone in the United States
 * got a new word and a new insight in the late afternoon, and two devices
 * opened either side of that hour disagreed while plainly being on the same
 * day. It is timezone-independent arithmetic, so it made no difference whether
 * the pick happened in a browser or on the server: both rolled at 5pm.
 *
 * ── THE RULE ──────────────────────────────────────────────────────────────
 * A day is the reader's calendar day. Given a Date, that is its LOCAL year,
 * month and date, which is the reader's own day in a browser and the device's
 * own day in the app. Given a 'YYYY-MM-DD' string it is that day, which is how
 * the app tells the server which day it is standing in: the server runs in UTC
 * and has no other way to know.
 *
 * The same shape as the journal's day key, which has always been the reader's
 * own date for the same reason.
 */

/** 'YYYY-MM-DD', the way the app and the journal write a day. */
const KEY = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * A day, counted from the epoch, for picking one item out of a rotation.
 *
 * @param {Date|string} [input] a Date, read in its local timezone, or a day key.
 * @returns {number} days since 1970-01-01 in that calendar.
 */
export function dayNumber(input = new Date()) {
  if (typeof input === 'string') {
    const m = KEY.exec(input.trim());
    /* A key we cannot read is not a reason to show nothing: fall through to
       this machine's own day, which is what the caller would have had. */
    if (m) return Math.floor(Date.UTC(+m[1], +m[2] - 1, +m[3]) / 86400000);
    return dayNumber(new Date());
  }
  const d = input instanceof Date && !Number.isNaN(input.getTime()) ? input : new Date();
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86400000);
}

/** Today where the caller is standing, as the key the app sends. */
export function dayKey(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * The reader's day, from the offset their device already sends.
 *
 * `/api/home` has taken `tzOffset` since the greeting needed it: minutes to
 * add to local time to reach UTC, exactly as getTimezoneOffset reports it. So
 * the server does not need a new parameter to know which day the reader is
 * standing in, and the app does not need a release.
 *
 * Deliberately arithmetic rather than Date parts: this runs on the edge, where
 * the server's own timezone is UTC today and is nobody's promise tomorrow.
 */
export function dayNumberForOffset(tzOffsetMinutes = 0, now = Date.now()) {
  const off = Number.isFinite(tzOffsetMinutes) && Math.abs(tzOffsetMinutes) <= 900
    ? tzOffsetMinutes : 0;
  return Math.floor((now - off * 60000) / 86400000);
}
