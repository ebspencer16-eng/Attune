#!/usr/bin/env node
/**
 * A time a reader picked is a time something arrives at.
 *
 * ── WHAT ELLIE ASKED FOR ──────────────────────────────────────────────────
 * "Notifications settings should offer a once-a-day notification that sends
 * you the insight of the day at a time you select (default should be 7:30am),
 * same for word of the day."
 *
 * ── THE FAILURE THIS IS AGAINST ───────────────────────────────────────────
 * Every part of this is silent when it breaks. A cron scheduled hourly against
 * a half-hour window drops every time in the other half hour and nobody ever
 * sees an error: the only symptom is somebody saying they never got theirs.
 * The same is true of a picker offering a minute the cron cannot match, of a
 * kind the sender refuses on a cooldown, and of a default written in two
 * places that drift.
 *
 * ── WHAT IS CHECKED ───────────────────────────────────────────────────────
 * 1. The cron's window is its schedule. Both are read from the files.
 * 2. Every time the app offers is a time the cron would fire on, swept over a
 *    whole day of reader clocks rather than sampled.
 * 3. The two kinds skip the cooldown and the monthly cap, because a schedule
 *    the reader set is not the product deciding to interrupt them. Run, not
 *    read: shouldNotify is called with a history that would refuse any other
 *    kind.
 * 4. One default, and it is 7:30.
 * 5. Nothing in this path writes a sentence of its own. The notification is
 *    the insight or the word, so there is no copy here for Ellie to review
 *    and no second description of either to go stale.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Whether a phone receives anything, which needs Expo, a device and a build
 * with the native module in it. And not the permission prompt, which is
 * api/push-token.js and the row above this one in Settings.
 */

import { readFileSync } from 'node:fs';

import { WINDOW_MINUTES, dueNow, localMinutesFor, minutesOf } from '../api/cron-daily-push.js';
import { DAILY_DEFAULT_AT, DAILY_KINDS, validAt } from '../api/daily-push.js';
import { shouldNotify, COOLDOWN_DAYS, MAX_PER_MONTH } from '../api/_lib/notifications.js';

const ROOT = new URL('..', import.meta.url).pathname;

/**
 * Comments blanked before anything is matched.
 *
 * Every file this reads explains at length what it is for, quoting Ellie, and
 * the quotes contain the very things being looked for: "default should be
 * 7:30am" is in two headers. Both of this gate's first two failures were it
 * reading its own subject's reasoning, which CLAUDE.md says about
 * check-style-codes and which keeps happening because the explanation and the
 * code say the same words.
 *
 * Blanked rather than removed, so line numbers still point at their lines.
 */
const strip = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
  .replace(/(^|[^:])\/\/[^\n]*/g, (m, pre) => pre + m.slice(pre.length).replace(/[^\n]/g, ' '));

const read = (f) => strip(readFileSync(`${ROOT}${f}`, 'utf8'));
const fails = [];
const notes = [];

// ── 1. The window is the schedule ───────────────────────────────────────────
{
  const vercel = JSON.parse(readFileSync(`${ROOT}vercel.json`, 'utf8'));
  const cron = (vercel.crons || []).find((c) => c.path === '/api/cron-daily-push');
  if (!cron) {
    fails.push('vercel.json schedules no /api/cron-daily-push, so nothing ever sends these. Refusing to pass: a gate that has lost its subject must never report success.');
  } else {
    // An every-N-minutes schedule is the only shape this cron is written for.
    // (Written as a line comment on purpose: the cron syntax for it contains
    // the characters that close a block comment, which cost one build.)
    const every = /^\*\/(\d+) \* \* \* \*$/.exec(cron.schedule);
    if (!every) {
      fails.push(`/api/cron-daily-push is scheduled "${cron.schedule}", which this check cannot read as an interval. The window in the handler is ${WINDOW_MINUTES} minutes and has to match however often it runs.`);
    } else if (Number(every[1]) !== WINDOW_MINUTES) {
      fails.push(`the cron runs every ${every[1]} minutes and the handler's window is ${WINDOW_MINUTES}. `
        + (Number(every[1]) > WINDOW_MINUTES
          ? 'Every chosen time outside the window would be skipped for ever, with no error anywhere.'
          : 'Every chosen time would be sent more than once a day.'));
    } else {
      notes.push(`the cron runs every ${every[1]} minutes and the window is ${WINDOW_MINUTES}`);
    }
  }
}

// ── 2. Every time the app offers is a time that fires ───────────────────────
{
  const settings = read('attune-app/src/components/settings.tsx');
  const slots = /const DAILY_SLOTS = Array\.from\(\{ length: (\d+) \}/.exec(settings);
  if (!slots) {
    fails.push('cannot find DAILY_SLOTS in Settings, so nothing here is checking what the app offers.');
  } else {
    const n = Number(slots[1]);
    const step = (24 * 60) / n;
    if (step !== WINDOW_MINUTES) {
      fails.push(`the app offers ${n} times a day, one every ${step} minutes, and the cron fires every ${WINDOW_MINUTES}. A reader can pick a time nothing will ever match.`);
    }

    /**
     * And then swept, rather than argued about. Every offered time against
     * every minute of a reader's day: each must be due exactly once.
     *
     * The sweep is what catches the midnight wrap, which a tidy `>= from &&
     * < to` gets wrong for anybody who picks 00:15 and which no round number
     * of sample points would have found.
     */
    const offered = Array.from({ length: n }, (_, i) => {
      const h = Math.floor(i / 2);
      return `${String(h).padStart(2, '0')}:${i % 2 ? '30' : '00'}`;
    });
    for (const at of offered) {
      if (!validAt(at)) fails.push(`the app offers ${at}, which the endpoint would refuse.`);
    }

    /**
     * Every minute the ENDPOINT would store, not only the 48 the app offers.
     *
     * The first version swept the offered times alone and a plant that
     * replaced the wrap-safe comparison with `want <= now < want + window`
     * walked through it, because on half-hour boundaries the naive version is
     * right. It is wrong for 23:45, which validAt accepts and which a second
     * client, an old build or a curl could store. A gate that only tests the
     * inputs one caller happens to send is testing the caller.
     */
    let swept = 0;
    for (let want = 0; want < 24 * 60; want++) {
      const at = `${String(Math.floor(want / 60)).padStart(2, '0')}:${String(want % 60).padStart(2, '0')}`;
      if (!validAt(at)) continue;
      swept += 1;
      let hits = 0;
      for (let m = 0; m < 24 * 60; m++) if (dueNow(at, m)) hits += 1;
      if (hits !== WINDOW_MINUTES) {
        fails.push(`${at} is due on ${hits} minutes of a reader's day and the window is ${WINDOW_MINUTES}. `
          + (hits === 0 ? 'Nobody who sets it ever gets one.' : 'It would arrive more than once.')
          + (want + WINDOW_MINUTES > 24 * 60 ? ' This one crosses midnight, which is where a comparison that does not wrap goes wrong.' : ''));
        break;
      }
    }
    if (!fails.length) notes.push(`all ${offered.length} offered times, and all ${swept} the endpoint accepts, fire exactly once a day`);
  }

  /* And the offset arithmetic, against a zone that is not UTC. New York in
     summer stores 240: minutes to ADD to local to reach UTC. */
  const utcNoon = Date.UTC(2026, 5, 1, 12, 0);
  const ny = localMinutesFor(utcNoon, 240);
  if (ny !== 8 * 60) {
    fails.push(`at noon UTC a reader at +240 is read as ${Math.floor(ny / 60)}:${String(ny % 60).padStart(2, '0')} local, and should be 8:00. The sign of the offset is the other way round somewhere.`);
  } else {
    notes.push('the offset arithmetic puts noon UTC at 8am in New York');
  }
}

// ── 3. The two kinds are not throttled ──────────────────────────────────────
{
  /* A history that would refuse anything the product decided to send: one
     yesterday, and the month's allowance already spent. */
  const now = Date.now();
  const DAY = 86400000;
  const history = {
    pushEnabled: true,
    sentAt: Array.from({ length: MAX_PER_MONTH }, (_, i) => new Date(now - (i + 1) * DAY).toISOString()),
    readLastPost: false,
    lastOpenedAt: new Date(now - 3600000).toISOString(),
  };

  for (const kind of ['daily_insight', 'daily_word']) {
    const v = shouldNotify({ kind, title: 'x', body: 'y' }, history, now);
    if (!v.send) {
      fails.push(`${kind} was refused with "${v.reason}" for somebody who set a daily time, had one yesterday and has had ${MAX_PER_MONTH} this month. A ${COOLDOWN_DAYS} day cooldown on a daily alarm means it arrives one day in ${COOLDOWN_DAYS + 1}, and the reader is told nothing.`);
    }
  }
  /**
   * And the exemption has not leaked into the kinds it must not.
   *
   * Checked on the REASON, not on the refusal. A plant that widened the
   * exemption to everything passed the first version: partner_shared was
   * still refused, by the "seen in the app an hour ago" rule further down, so
   * `send: false` was true and the cooldown had quietly stopped applying to
   * anything. Match the name with what follows it.
   */
  const other = shouldNotify({ kind: 'partner_shared', title: 'x', body: 'y' },
    { ...history, lastOpenedAt: new Date(now - 10 * DAY).toISOString() }, now);
  if (other.reason !== 'cooldown' && other.reason !== 'monthly_cap') {
    fails.push(`partner_shared, with one sent yesterday and ${MAX_PER_MONTH} this month, was answered "${other.reason}" rather than cooldown or monthly_cap. The exemption written for the two daily kinds has spread to the kinds the product decides to send.`);
  } else {
    notes.push(`the two daily kinds skip the cooldown and the cap; partner_shared still gets "${other.reason}"`);
  }

  /* Push being off still refuses them. A schedule is not consent. */
  for (const kind of ['daily_insight', 'daily_word']) {
    const off = shouldNotify({ kind, title: 'x', body: 'y' }, { ...history, pushEnabled: false }, now);
    if (off.send) {
      fails.push(`${kind} would be sent to somebody who has not turned notifications on. A time set in Settings is not permission.`);
    }
  }
}

// ── 4. One default, and it is 7:30 ──────────────────────────────────────────
{
  if (DAILY_DEFAULT_AT !== '07:30') {
    fails.push(`the default time is ${DAILY_DEFAULT_AT}. Ellie: "default should be 7:30am".`);
  }
  if (minutesOf(DAILY_DEFAULT_AT) == null) {
    fails.push(`the default time ${DAILY_DEFAULT_AT} is not a clock reading the cron can match.`);
  }
  /* And it reaches the app from the server rather than being typed there. */
  const settings = read('attune-app/src/components/settings.tsx');
  const client = read('attune-app/src/api/client.ts');
  if (/07:30|7:30/.test(settings) || /07:30/.test(client)) {
    fails.push('the app writes the default time itself. It comes down with the home payload as `defaultAt`, from api/daily-push.js, so there is one of it.');
  }
  /* The name WITH its use. `/DAILY_DEFAULT_AT/` alone matches the import line,
     so a plant that sent `defaultAt: null` from the payload passed. */
  const home = read('api/home.js');
  if (!/defaultAt:\s*DAILY_DEFAULT_AT/.test(home)) {
    fails.push('api/home.js does not send DAILY_DEFAULT_AT as the payload\'s defaultAt, so the app has nothing to open the picker on.');
  } else {
    notes.push(`one default, ${DAILY_DEFAULT_AT}, sent from the server`);
  }
}

// ── 5. No copy of its own ───────────────────────────────────────────────────
{
  /**
   * The notification is the insight or the word. Anything else would be a
   * second description of them, written by me, on a lock screen.
   */
  const cron = read('api/cron-daily-push.js');
  const quoted = [...cron.matchAll(/'([^'\\\n]{25,})'|"([^"\\\n]{25,})"/g)].map((m) => m[1] || m[2]);
  /**
   * An error message is not copy. These are what an operator reads in a log or
   * a curl, never what a reader sees, and the two have to be told apart or the
   * check either passes on a lock-screen sentence or fails on "Unauthorized".
   *
   * The test is who it is addressed to: anything naming the plumbing is the
   * operator's, and everything else has to justify itself.
   */
  const OPERATOR = /env var|supabase|select|query|unauthorized|not set up|migration|configured|failed|^\/|^[a-z_]+$/i;
  const prose = quoted.filter((q) => / /.test(q) && !OPERATOR.test(q));
  if (prose.length) {
    fails.push(`api/cron-daily-push.js carries ${prose.length} sentence(s) of its own: ${prose.slice(0, 2).map((p) => `"${p.slice(0, 50)}"`).join(', ')}. The body is the insight or the word; a sentence here is a second description of them that nothing holds to the list.`);
  } else {
    notes.push('the cron writes no sentence of its own');
  }

  /* And both kinds reach a screen. A deep link nothing routes is a tap that
     opens the home screen, which is the thing CLAUDE.md calls a wasted tap. */
  const { notificationFor } = await import('../api/_lib/notifications.js');
  /**
   * Where each one belongs, in the app's own words.
   *
   * The insight is read on the Learn tab, which is `/?view=practice` to
   * appTargetFor and `/resources` to the router: three names for one screen,
   * and the deep link has to be the one the resolver knows. This check asked
   * for the word "learn" and the correct link does not contain it, which is a
   * gate failing a working destination over vocabulary.
   */
  for (const [kind, expect] of [['daily_insight', 'practice'], ['daily_word', 'notes']]) {
    const n = notificationFor(kind, { dailyLabel: 'L', dailyTitle: 'T', dailyBody: 'B' });
    if (!n.title) fails.push(`${kind} has no title, so the lock screen shows the app name and nothing else.`);
    if (!n.body) fails.push(`${kind} has no body.`);
    if (!n.deepLink || !n.deepLink.includes(expect)) {
      fails.push(`${kind} opens "${n.deepLink}" and the thing it is about is on ${expect}.`);
    }
  }
  notes.push(`${Object.keys(DAILY_KINDS).length} kinds, each with a title, a body and a destination`);
}

for (const n of notes) console.log(`  ok  ${n}`);
if (fails.length) {
  console.error(`\ncheck-daily-push: ${fails.length} problem${fails.length === 1 ? '' : 's'}\n`);
  for (const f of fails) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log(`\n[check-daily-push] every half hour a reader can pick is one the cron fires on, the two kinds skip the cooldown and nothing else does, and the notification is the insight or the word rather than a sentence about it.`);
