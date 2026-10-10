/**
 * Which of the home-screen prompts are worth a push notification, and when.
 *
 * The in-app card and the notification are not the same decision. A card costs
 * the reader nothing: it sits there and they see it when they open the app. A
 * notification interrupts them, and the budget for interruptions is small and
 * spends down permanently. Get it wrong and they turn notifications off, at
 * which point the partner-sharing loop stops working.
 *
 * The rule I have applied: notify only when something happened that the person
 * could not have known about, and that they would want to act on. Everything
 * else waits for them to open the app.
 *
 * So: "your partner finished" is a notification, because it changed while they
 * were away and it unlocks something. "You have not opened your results in a
 * month" is not, because nothing happened; that is us wanting their attention
 * rather than them needing ours.
 *
 * Rate limit: at most one every COOLDOWN_DAYS, and no more than MAX_PER_MONTH.
 * Attune is not a daily product and should not behave like one.
 */

import { pronounForm } from './role-tokens.js';
/* The plumbing under shouldNotify: whose devices, and hand it to Expo. The
   rules stay in this file; nothing in push.js decides whether to send. */
import { sendPush } from './push.js';

const DAY = 24 * 60 * 60 * 1000;
export const COOLDOWN_DAYS = 4;
export const MAX_PER_MONTH = 4;

/**
 * Which prompt kinds may ever become a push, and how urgent each is.
 * Anything absent from this table is in-app only, by design.
 *
 * `seenIfOpened` is whether opening the app counts as having seen it. For
 * every kind here that is something which HAPPENED, it does: the card is at
 * the top of the home screen and a push saying the same thing is the product
 * talking twice. For the two that are about a deadline on the reader's own
 * behaviour, it does not: someone can open the app all day and still not have
 * written in their journal, and telling them their streak is safe because they
 * looked at a screen would be false.
 *
 * It was `urgency < 9` before, which conflated "how important" with "can they
 * already know". Two different questions, and the second one is the one being
 * asked.
 */
const PUSHABLE = {
  // Something changed while they were away, and it unlocks the product.
  partner_finished:  { urgency: 10, quiet: false, seenIfOpened: true },
  // Their partner asked for them, which is a person waiting, not us.
  partner_nudged_you:{ urgency: 9,  quiet: false, seenIfOpened: true },
  partner_shared:    { urgency: 8,  quiet: false, seenIfOpened: true },
  // Their partner has arrived. Worth knowing on the phone, but nothing is
  // unlocked by it yet, so it sits below the one that is.
  partner_joined:    { urgency: 9,  quiet: false, seenIfOpened: true },
  // Something changed that they cannot find out any other way, and that
  // changes what is in the product for them. Quiet: it is not good news and it
  // does not need to arrive with a sound.
  partner_deleted:   { urgency: 9,  quiet: true,  seenIfOpened: true },

  // ── ELLIE'S SIX ───────────────────────────────────────────────────────────
  // From her list of 2026-10-10. The in-app half of each decision is separate:
  // results_ready and new_post deliberately draw no alert row, because the
  // home screen already carries a card for each, and that was her earlier
  // instruction. A push is the other case: they are not holding the phone.
  results_ready:     { urgency: 10, quiet: false, seenIfOpened: true },
  workbook_ready:    { urgency: 7,  quiet: false, seenIfOpened: true },
  // Deadlines on their own behaviour. Opening the app is not doing the thing.
  journal_streak:    { urgency: 5,  quiet: true,  seenIfOpened: false },
  exercise_unfinished:{ urgency: 6, quiet: true,  seenIfOpened: false },
  // Content, and the one rule she set on it: only for someone who read two in
  // the previous week. That condition lives with the trigger, in
  // api/cron-push.js, because it is a query rather than a wording.
  new_post:          { urgency: 4,  quiet: true,  seenIfOpened: true },
};

/**
 * Whether this event is worth a push, for this person, right now.
 *
 * ── IT IS LIVE NOW, AND IT WAS NOT ────────────────────────────────────────
 * This function and the table above it sat unused for months: a considered
 * ruleset with no sender behind it, which is a thing that reads as live and is
 * not. api/_lib/push.js calls it on every send, and api/push-token.js is where
 * `pushEnabled` comes from.
 *
 * What still has to be true before anything arrives on a phone: the person has
 * said yes, their device has handed us a token, and the app has been rebuilt
 * with expo-notifications in it. That last one is a binary, not an update,
 * which is why B17b in TASKS.md asks for a build rather than a publish.
 *
 * @param event    { kind, title, body, deepLink }
 * @param history  { sentAt: [ISO strings], pushEnabled, lastOpenedAt, readLastPost }
 * @param now      ISO string or ms
 * @returns { send, reason, payload? }
 */
export function shouldNotify(event, history = {}, now = Date.now()) {
  const t = typeof now === 'string' ? new Date(now).getTime() : now;
  const rule = PUSHABLE[event?.kind];

  if (!history.pushEnabled) return { send: false, reason: 'push_disabled' };
  if (!rule) return { send: false, reason: 'in_app_only' };

  const sent = (history.sentAt || []).map(s => new Date(s).getTime()).filter(n => !isNaN(n));
  const lastSent = sent.length ? Math.max(...sent) : null;
  if (lastSent != null && (t - lastSent) < COOLDOWN_DAYS * DAY) {
    return { send: false, reason: 'cooldown' };
  }
  if (sent.filter(s => t - s < 30 * DAY).length >= MAX_PER_MONTH) {
    return { send: false, reason: 'monthly_cap' };
  }

  // Content only goes to people who read the last one. Nobody should be pushed
  // twice about posts they are ignoring.
  if (rule.quiet && history.readLastPost === false) {
    return { send: false, reason: 'not_reading_posts' };
  }

  // If they opened the app in the last day they have already seen the card,
  // for every kind where the card says the same thing. Not for the two that
  // are about something they have not done yet.
  if (rule.seenIfOpened && history.lastOpenedAt
      && (t - new Date(history.lastOpenedAt).getTime()) < DAY) {
    return { send: false, reason: 'seen_in_app_recently' };
  }

  return {
    send: true,
    reason: 'ok',
    payload: {
      title: event.title,
      body: event.body,
      // The deep link is why URL-addressable sections had to come first: a
      // notification that opens the app to the home screen wastes the tap.
      deepLink: event.deepLink,
      kind: event.kind,
    },
  };
}

/**
 * Events the server can raise, with copy. No urgency language, no guilt.
 *
 * ── THE WORDS ARE ELLIE'S ─────────────────────────────────────────────────
 * She read them in TASKS.md, where they are listed by a generator rather than
 * typed, and sent back the ones she wanted changed. Two kinds went entirely:
 * results_ready and new_post, because the home screen already carries a card
 * for each and an alert above it is the same sentence printed twice.
 *
 * `partnerPronouns` is here for the one line that needs a possessive. A name
 * does not tell you a pronoun; the profile does, and pronounForm falls back to
 * they/them, which is the form that is never wrong about a person.
 */
export function notificationFor(kind, {
  partnerName, partnerPronouns, dimensionLabel,
  /* Her six need four more facts. Each is named rather than formatted into a
     sentence by the caller, because a renderer that is handed a finished
     string cannot be held to the wording. */
  streakDays, exerciseLabel, exerciseView, postTitle, readMinutes,
} = {}) {
  const them = partnerName || 'Your partner';
  /* Possessive of a name, or of the fallback, which is not capitalised
     mid-sentence. "Review Your partner's shared note" is the bug. */
  const theirs = partnerName ? `${partnerName}'s` : 'your partner\u2019s';
  const pos = pronounForm(partnerPronouns, 'pos');
  switch (kind) {
    case 'partner_finished':
      return { kind, title: `${them} completed ${pos} exercises`, body: 'Explore your results', deepLink: '/?view=results' };
    case 'partner_nudged_you':
      return { kind, title: `${them} sent you a nudge`, body: 'Complete your exercises to unlock your results', deepLink: '/?view=home' };
    /**
     * Their partner accepted the invite and linked.
     *
     * Ellie: "Add partner joined as an alert row to app and site."
     *
     * It was a banner on the website's dashboard and nothing at all in the app,
     * so the two surfaces told a couple different things about the same event.
     * As an alert it reaches both, because both draw the alert list from the
     * same rows.
     *
     * The wording is mine and needs her eye, like the rest of these did: she
     * read the first set, kept most and rewrote the ones she wanted changed.
     * Flagged in TASKS.md rather than left to look settled.
     */
    case 'partner_joined':
      return { kind, title: `${them} joined Attune`, body: 'You can both start your exercises now', deepLink: '/?view=home' };
    /**
     * Their partner shared a note with them.
     *
     * Ellie, replacing the previous pair word for word: "Change 'Preston
     * shared something with you / A note from your results' to 'Preston shared
     * a note / Review Preston's shared note'."
     *
     * The dimension variant went with it. She wrote one line for this event and
     * a second version of it that appears only sometimes is the same sentence
     * maintained twice.
     */
    case 'partner_shared':
      return { kind, title: `${them} shared a note`, body: `Review ${theirs} shared note`, deepLink: '/?view=notes' };
    /**
     * Their partner deleted their account.
     *
     * Promised in the retention policy: "Your partner is notified that you
     * have deleted your account." Nothing did.
     *
     * It names no reason, because we do not know one, and it does not ask them
     * to do anything. What it has to carry is what changed for them, which is
     * that the joint parts of their results are gone. Everything they answered
     * themselves is still theirs.
     *
     * ── THE TITLE IS ELLIE'S, THE LINE UNDER IT IS NOT YET ──────────────
     * She rewrote both. The title is hers and is here. The line she wrote for
     * underneath says the couple's results experience is now unavailable, and
     * that is not what happens: the retention policy promises the survivor
     * keeps their results with the departed partner anonymised, and migration
     * 059 made that true after a cascade had been quietly deleting them.
     *
     * So the old line stands until she answers Q4 in TASKS.md. Shipping her
     * sentence now would tell someone their results are gone while they are
     * still there, which is worse than either outcome she is choosing between.
     */
    case 'partner_deleted':
      return {
        kind,
        title: `${them} deleted ${pos} Attune account`,
        body: 'Your own answers are still here. The parts of your results that came from both of you are not.',
        deepLink: '/?view=home',
      };
    /**
     * Both of them have finished, and their results are open.
     *
     * Ellie: "Congratulations! Both you and [Partner] have completed your
     * Attune exercises. Open your dashboard to explore your results".
     *
     * One sentence of hers, split at her own full stop. No alert ROW is
     * written for this: the home screen already carries a results card, and
     * her earlier instruction was that an alert above it is the same sentence
     * printed twice. A push is the other case, because they are not looking at
     * the screen. api/_lib/completion.js raises it push-only.
     */
    case 'results_ready':
      return {
        kind,
        title: 'Congratulations!',
        body: `Both you and ${them} have completed your Attune exercises. Open your dashboard to explore your results`,
        deepLink: '/?view=results',
      };

    /**
     * Their workbook has finished building.
     *
     * Ellie: "Your personalized workbook is ready for you to explore in your
     * learn tab". Split at the clause rather than invented: the title is the
     * first half of her sentence and the line under it is the second.
     */
    case 'workbook_ready':
      return {
        kind,
        title: 'Your personalized workbook is ready',
        body: 'For you to explore in your learn tab',
        deepLink: '/?view=practice',
      };

    /**
     * A run of days in the journal that today would end.
     *
     * Ellie: "Journal streak ending 'Your streak of [#] days of entries in
     * your relationship journal is about to expire.'"
     *
     * Her sentence is the body. The title is a compression of it, in her own
     * words, because a push needs a line above the line; it is listed in
     * TASKS.md for her to correct.
     *
     * The number is the streak as the app draws it, from journalStreak in
     * api/_lib/journal-use.js, so the push and the button cannot disagree
     * about how many days it has been.
     */
    case 'journal_streak':
      return {
        kind,
        title: 'Your journal streak is about to expire',
        body: `Your streak of ${streakDays ?? 0} days of entries in your relationship journal is about to expire.`,
        deepLink: '/?view=notes',
      };

    /**
     * An exercise they own and have not finished.
     *
     * Ellie: "Exercise unfinished 'Don't forget to complete [exercise name]!
     * Finish all exercises to access your results.'" Split at her own
     * exclamation mark.
     *
     * The label and the destination come from the exercise registry, through
     * the trigger, so a sixth exercise is prompted without an edit here.
     */
    case 'exercise_unfinished':
      return {
        kind,
        title: `Don\u2019t forget to complete ${exerciseLabel || 'your exercise'}!`,
        body: 'Finish all exercises to access your results.',
        deepLink: exerciseView ? `/?view=${exerciseView}` : '/?view=home',
      };

    /**
     * A new In Practice article.
     *
     * Ellie: "New article (only if someone read 2 in the previous week)
     * '[Article name] was just published by Attune Relationships! Access this
     * [#] minute read in your learn tab'". Split at her exclamation mark.
     *
     * The condition is not in this file. Who has read two in the previous week
     * is a query, and it lives with the trigger in api/cron-push.js; what lives
     * here is the wording. No alert row for this one either, for the same
     * reason as results_ready.
     */
    case 'new_post':
      return {
        kind,
        title: `${postTitle || 'A new article'} was just published by Attune Relationships!`,
        body: `Access this ${readMinutes ?? 0} minute read in your learn tab`,
        deepLink: '/?view=practice',
      };

    default:
      return null;
  }
}

/**
 * Should this alert be written to the person's list?
 *
 * The database was going to enforce this with a unique index on "same owner,
 * same kind, same subject, same day". A date derived from a timestamptz is not
 * immutable, so Postgres refused to index it twice over. The rule is simple
 * enough to state in code, and here it is testable and changeable without a
 * migration.
 *
 * `recent` is the person's rows for this kind, newest first, as returned by
 * the notifications_recent_idx query.
 */
export function shouldRecord({ kind, subjectId = null, recent = [], now = Date.now() }) {
  if (!kind) return false;
  const DAY = 24 * 60 * 60 * 1000;
  return !recent.some(r =>
    r.kind === kind
    && (r.subject_id || null) === (subjectId || null)
    // Same calendar-ish window, measured as 24 hours rather than a calendar
    // day: a partner finishing at 11pm and a sync firing at 1am is one event,
    // and a date boundary would treat it as two.
    && (now - new Date(r.created_at).getTime()) < DAY
  );
}

/**
 * Write one alert to a person's list.
 *
 * ── WHY THIS IS HERE AND NOT AT EACH CALL SITE ────────────────────────────
 * Four endpoints raise alerts now. Each one has to build the copy, check the
 * duplicate rule, and insert, and three of those four reach Supabase a
 * different way. That is four hand-kept copies of one rule, which is the
 * failure this codebase is organised against, so the rule lives here once and
 * the endpoints pass it a kind and an owner.
 *
 * It reads the environment itself rather than taking a client, because the
 * callers are split between `createClient` and raw REST and the only thing
 * they all have is the environment.
 *
 * ── IT NEVER THROWS ───────────────────────────────────────────────────────
 * An alert is a courtesy on the side of something that matters: finishing an
 * exercise, sharing a note, deleting an account. None of those should fail
 * because the notifications table was unreachable. Failure returns false and
 * says so in the log.
 *
 * @returns {Promise<boolean>} whether a row was written
 */
export async function recordNotification({ ownerId, kind, subjectId = null, copy = {} } = {}) {
  if (!ownerId || !kind) return false;
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY
           || process.env.SUPABASE_SERVICE_ROLE_KEY
           || process.env.SUPABASE_SERVICE_ROLE;
  if (!url || !key) return false;

  const alert = notificationFor(kind, copy);
  if (!alert) return false;

  const svc = { apikey: key, Authorization: `Bearer ${key}` };
  try {
    if (!await notificationIsNew({ ownerId, kind, subjectId })) return false;

    /**
     * The push goes first, and only because of what is written down.
     *
     * The row records whether this also went out as a push, which means the
     * answer has to exist before the insert. Nothing about the push can stop
     * the row: a suppressed push is still an alert the person should find at
     * the top of their home screen, which is what `pushed: false` says.
     *
     * Whether this kind may push at all is the PUSHABLE table at the top of
     * this file, so a caller never decides it and no second list exists.
     */
    const push = await sendPush(ownerId, alert).catch(() => ({ sent: false }));

    const ins = await fetch(`${url}/rest/v1/notifications`, {
      method: 'POST',
      headers: { ...svc, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({
        owner_id: ownerId,
        kind: alert.kind,
        title: alert.title,
        body: alert.body,
        deep_link: alert.deepLink,
        subject_id: subjectId,
        pushed: !!push.sent,
      }),
    });
    return ins.ok;
  } catch (e) {
    console.warn('[notifications] could not record', kind, e?.message);
    return false;
  }
}

/**
 * Has this person already been told this?
 *
 * The same question `recordNotification` asks before inserting, exported
 * because the duplicate rule is one rule: a push-only event has to ask it too,
 * and asking it a second way is how two answers appear.
 */
export async function notificationIsNew({ ownerId, kind, subjectId = null } = {}) {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY
           || process.env.SUPABASE_SERVICE_ROLE_KEY
           || process.env.SUPABASE_SERVICE_ROLE;
  if (!url || !key || !ownerId || !kind) return false;
  try {
    // The person's recent rows of this kind, which is what the duplicate rule
    // reads. notifications_recent_idx exists for exactly this query.
    const r = await fetch(
      `${url}/rest/v1/notifications?owner_id=eq.${ownerId}&kind=eq.${encodeURIComponent(kind)}`
      + '&select=kind,subject_id,created_at&order=created_at.desc&limit=5',
      { headers: { apikey: key, Authorization: `Bearer ${key}` } });
    const recent = (await r.json().catch(() => [])) || [];
    return shouldRecord({ kind, subjectId, recent });
  } catch {
    return false;
  }
}

/**
 * An event that is worth a push and not worth a row.
 *
 * ── WHY THESE TWO ARE NOT THE SAME DECISION ───────────────────────────────
 * Ellie, earlier, on results_ready and new_post: the home screen already
 * carries a card for results that are ready and a card for an unread post, and
 * an alert above it saying the same sentence is one prompt printed twice. That
 * is still true of the row.
 *
 * It is not true of the push, which is the case where they are not looking at
 * the screen at all, and both of those are on her list of six. So the kind has
 * copy, has no row, and can interrupt.
 *
 * It still asks the duplicate question, against the push log rather than the
 * alert list, which is what the cooldown in shouldNotify reads.
 */
export async function pushOnly({ ownerId, kind, copy = {} } = {}) {
  if (!ownerId || !kind) return { sent: false, reason: 'nothing_to_send' };
  const alert = notificationFor(kind, copy);
  if (!alert) return { sent: false, reason: 'no_copy' };
  return sendPush(ownerId, alert).catch(() => ({ sent: false, reason: 'threw' }));
}
