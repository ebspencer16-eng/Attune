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

const DAY = 24 * 60 * 60 * 1000;
export const COOLDOWN_DAYS = 4;
export const MAX_PER_MONTH = 4;

// Which prompt kinds may ever become a push, and how urgent each is.
// Anything absent from this table is in-app only, by design.
const PUSHABLE = {
  // Something changed while they were away, and it unlocks the product.
  partner_finished:  { urgency: 10, quiet: false },
  results_ready:     { urgency: 10, quiet: false },
  // Their partner asked for them, which is a person waiting, not us.
  partner_nudged_you:{ urgency: 9,  quiet: false },
  partner_shared:    { urgency: 8,  quiet: false },
  // Genuinely new content, at most monthly, and only if they read the last one.
  new_post:          { urgency: 3,  quiet: true },
};

/**
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

  // If they opened the app in the last day they have already seen the card.
  if (rule.urgency < 9 && history.lastOpenedAt && (t - new Date(history.lastOpenedAt).getTime()) < DAY) {
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

/** Events the server can raise, with copy. No urgency language, no guilt. */
export function notificationFor(kind, { partnerName, postTitle, dimensionLabel } = {}) {
  const them = partnerName || 'Your partner';
  switch (kind) {
    case 'partner_finished':
      return { kind, title: `${them} finished`, body: 'Your results are ready to open together.', deepLink: '/?view=results' };
    case 'results_ready':
      return { kind, title: 'Your results are ready', body: 'Everything you both answered, side by side.', deepLink: '/?view=results' };
    case 'partner_nudged_you':
      return { kind, title: `${them} is waiting on you`, body: 'One exercise left before your results unlock.', deepLink: '/?view=home' };
    case 'partner_shared':
      return { kind, title: `${them} shared something with you`, body: dimensionLabel ? `A note on ${dimensionLabel}.` : 'A note from your results.', deepLink: '/?view=notes' };
    case 'new_post':
      return { kind, title: 'New in In Practice', body: postTitle || 'Something new to read.', deepLink: '/?view=practice' };
    default:
      return null;
  }
}
