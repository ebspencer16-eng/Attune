/**
 * GET /api/cron-daily-push — the insight and the word, at the time each
 * reader asked for.
 *
 * ── WHAT ELLIE ASKED FOR ──────────────────────────────────────────────────
 * "Notifications settings should offer a once-a-day notification that sends
 * you the insight of the day at a time you select (default should be 7:30am),
 * same for word of the day."
 *
 * ── WHY IT IS SEPARATE FROM api/cron-push.js ──────────────────────────────
 * That one answers "who qualifies for something the product noticed". This
 * one answers "whose alarm is it". The two have nothing in common but the
 * sender: cron-push runs once a day and works out eligibility, this runs every
 * half hour and works out whose clock it is.
 *
 * Folding them together would mean one file running 48 times a day doing
 * cron-push's six queries 47 times for nothing.
 *
 * ── HOW A TIME IN SOMEBODY ELSE'S DAY IS MATCHED ──────────────────────────
 * `tz_offset_minutes` is what Date.getTimezoneOffset() returns on their
 * device: the minutes to ADD to their local clock to reach UTC. So their local
 * clock is `now - offset`, and New York in summer stores 240.
 *
 * This runs every WINDOW_MINUTES. A send happens when the reader's chosen
 * local time falls in the half hour that has just passed, so every chosen time
 * is hit exactly once a day and nothing is missed by a run starting late.
 *
 * Somebody with no offset stored has never set a time, because the endpoint
 * that sets one writes it. They are skipped rather than guessed at: a guess
 * puts a 7:30 in the middle of somebody's night.
 *
 * ── WHAT IT DOES NOT DECIDE ───────────────────────────────────────────────
 * Whether push is on for this person, and whether their device gave us a
 * token. api/_lib/push.js refuses both, and shouldNotify refuses anyone who
 * has not opted in. What these two kinds do skip is the cooldown and the
 * monthly cap, because a schedule the reader set is not the product deciding
 * to interrupt them. That exemption is `asked` in api/_lib/notifications.js.
 *
 * ── THE WORDS ARE THE CONTENT ─────────────────────────────────────────────
 * No copy here. The title is the label the tile carries and the body is the
 * insight or the word itself, which is why there is nothing in this file for
 * Ellie to review.
 *
 * Required env: SUPABASE_URL, SUPABASE_SERVICE_KEY, CRON_SECRET.
 */

import { createClient } from '@supabase/supabase-js';

import { DAILY_KINDS } from './daily-push.js';
import { INSIGHT_EYEBROW, insightOfTheDay } from './_insights.js';
import { WORD_EYEBROW, wordOfTheDay } from './_words.js';
import { notificationFor } from './_lib/notifications.js';
import { sendPush } from './_lib/push.js';
import { dayNumberForOffset } from './_lib/day-number.js';

/**
 * ── AND WHERE IT RUNS ─────────────────────────────────────────────────────
 * Pinned next to the database. An edge function runs near whoever is asking,
 * which is the wrong default when every answer comes from one database
 * somewhere else: a request that landed in San Francisco spent two crossings
 * of the country on a lookup by id. See api/_lib/db-region.js for the
 * measurement, and check-edge-region.mjs, which holds every one of these to
 * the one constant that says where.
 */
export const config = { runtime: 'edge', regions: ['iad1'] };

const HEADERS = { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' };
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: HEADERS });

/**
 * How often this runs, and therefore how wide the window is.
 *
 * It has to match the schedule in vercel.json. If the cron ran hourly and this
 * said 30, every time in the other half hour would be silently skipped for
 * ever, and the only symptom would be somebody saying they never get theirs.
 * check-daily-push-window.mjs holds the two together.
 */
export const WINDOW_MINUTES = 30;

/** Minutes past midnight, from 'HH:MM'. Null for anything that is not one. */
export function minutesOf(at) {
  const m = /^([01][0-9]|2[0-3]):([0-5][0-9])$/.exec(String(at || ''));
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/**
 * Is this reader's chosen time inside the window that just closed?
 *
 * Both are minutes past their own midnight, so the comparison needs no dates.
 * The window wraps at midnight, which is the case a naive `>= from && < to`
 * gets wrong for anybody who picks 00:15.
 */
export function dueNow(chosenAt, localMinutes, window = WINDOW_MINUTES) {
  const want = minutesOf(chosenAt);
  if (want == null) return false;
  const DAY = 24 * 60;
  /* How long ago their chosen time was, going backwards from local now. */
  const ago = ((localMinutes - want) % DAY + DAY) % DAY;
  return ago < window;
}

/** Their local clock, in minutes past midnight, from the offset they gave us. */
export function localMinutesFor(nowMs, offsetMinutes) {
  const local = new Date(nowMs - offsetMinutes * 60000);
  return local.getUTCHours() * 60 + local.getUTCMinutes();
}

export default async function handler(req) {
  const secret = process.env.CRON_SECRET;
  const auth = (req.headers.get('authorization') || req.headers.get('Authorization') || '')
    .replace(/^Bearer\s+/i, '').trim();
  if (!secret || auth !== secret) return json({ ok: false, error: 'Unauthorized' }, 401);

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return json({ ok: false, error: 'Supabase env vars missing' }, 500);
  const admin = createClient(url, key);

  const now = Date.now();
  const out = { ok: true, considered: 0, due: 0, sent: 0, skipped: {} };
  const note = (reason) => { out.skipped[reason] = (out.skipped[reason] || 0) + 1; };

  let rows = [];
  try {
    const { data, error } = await admin.from('profiles')
      .select(`id, tz_offset_minutes, ${Object.values(DAILY_KINDS).join(', ')}`)
      .or(Object.values(DAILY_KINDS).map((c) => `${c}.not.is.null`).join(','));
    if (error) throw error;
    rows = data || [];
  } catch (e) {
    const missing = /daily_insight_at|daily_word_at|tz_offset_minutes/.test(String(e?.message || ''));
    return json({
      ok: false,
      error: missing ? 'Daily notification settings are not set up yet (migration 083)' : 'Query failed',
    }, missing ? 503 : 500);
  }

  for (const row of rows) {
    out.considered += 1;
    /* Never set a time, so we do not know when their morning is. The endpoint
       that sets one writes this, so this is a row that predates it. */
    if (!Number.isFinite(row.tz_offset_minutes)) { note('no_timezone'); continue; }

    const localMinutes = localMinutesFor(now, row.tz_offset_minutes);
    /* The day the reader is standing in, so the word and the insight are the
       ones their own app is showing them this morning. */
    const readerDay = dayNumberForOffset(row.tz_offset_minutes);

    for (const [kind, column] of Object.entries(DAILY_KINDS)) {
      if (!dueNow(row[column], localMinutes)) continue;
      out.due += 1;

      let alert = null;
      if (kind === 'insight') {
        const pick = insightOfTheDay(readerDay);
        alert = notificationFor('daily_insight', {
          dailyLabel: pick?.label || INSIGHT_EYEBROW,
          dailyBody: pick?.body || '',
        });
      } else {
        const pick = wordOfTheDay(readerDay);
        alert = notificationFor('daily_word', {
          dailyLabel: pick?.label || WORD_EYEBROW,
          dailyTitle: pick?.word || '',
          dailyBody: pick?.definition || '',
        });
      }
      if (!alert?.body) { note('nothing_to_say'); continue; }

      const res = await sendPush(row.id, alert);
      if (res.sent) out.sent += 1;
      else note(res.reason || 'not_sent');
    }
  }

  return json(out);
}
