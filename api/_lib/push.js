/**
 * Sending a push notification, and the one place that decides whether to.
 *
 * ── WHAT THIS IS AND IS NOT ───────────────────────────────────────────────
 * Not a second set of rules. Whether an event is worth interrupting someone
 * for is `shouldNotify` in api/_lib/notifications.js, which has carried a
 * cooldown, a monthly cap and a quiet class since long before anything could
 * send. This file is the plumbing under that decision: whose devices, has the
 * person said yes, hand it to Expo, write down that it went.
 *
 * ── WHY EXPO AND NOT APPLE DIRECTLY ───────────────────────────────────────
 * The app is an Expo app and its credentials live in Expo's hands already: the
 * APNs key Ellie generated is uploaded there with `eas credentials`, not kept
 * in Vercel. So the server posts to Expo's push service and Expo talks to
 * Apple. Nothing here holds an Apple key, which is the point: a key in two
 * places is a key that expires in one of them.
 *
 * EXPO_ACCESS_TOKEN is optional and recommended. Without it, anyone holding a
 * device's push token could send that device a notification that looks like
 * ours; with it, Expo refuses a send that is not signed by the account.
 *
 * ── WHAT IT NEVER DOES ────────────────────────────────────────────────────
 * It never sends to someone whose `push_opt_in` is not exactly true. Not null,
 * which means they have never been asked, and not false. And it never carries
 * anything the reader or their partner wrote: the copy comes from
 * notificationFor, which takes names and counts and nothing else. A lock
 * screen is a public place.
 */

const EXPO_SEND = 'https://exp.host/--/api/v2/push/send';

const env = () => ({
  url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  key: process.env.SUPABASE_SERVICE_KEY
    || process.env.SUPABASE_SERVICE_ROLE_KEY
    || process.env.SUPABASE_SERVICE_ROLE,
});

const svc = (key) => ({ apikey: key, Authorization: `Bearer ${key}` });

/** The 30 days the monthly cap is measured over, and the window the log needs. */
const LOG_WINDOW_DAYS = 31;

/**
 * Everything the decision needs about one person, in one round trip each.
 *
 * Returns null when the person cannot be pushed at all, which is the common
 * case today and must be cheap: no token, no consent, no send.
 */
export async function pushHistoryFor(profileId) {
  const { url, key } = env();
  if (!url || !key || !profileId) return null;
  const headers = svc(key);
  const since = new Date(Date.now() - LOG_WINDOW_DAYS * 86400000).toISOString();

  const [profRes, tokRes, sendRes] = await Promise.all([
    fetch(`${url}/rest/v1/profiles?id=eq.${profileId}&select=push_opt_in,app_last_opened_at`, { headers }),
    fetch(`${url}/rest/v1/push_tokens?profile_id=eq.${profileId}&select=token,platform`, { headers }),
    fetch(`${url}/rest/v1/push_sends?profile_id=eq.${profileId}&ok=is.true&sent_at=gte.${since}`
      + '&select=kind,sent_at&order=sent_at.desc&limit=50', { headers }),
  ]);
  /**
   * A missing table is not a refusal.
   *
   * Until migration 078 runs, these three selects answer 404 and that must
   * read as "push is not set up here" rather than as "this person said no".
   * Returning null does exactly that: nothing is sent and nothing is logged.
   */
  if (!profRes.ok || !tokRes.ok || !sendRes.ok) return null;

  const prof = (await profRes.json().catch(() => []))?.[0] || null;
  const tokens = (await tokRes.json().catch(() => [])) || [];
  const sends = (await sendRes.json().catch(() => [])) || [];
  return {
    pushEnabled: prof?.push_opt_in === true && tokens.length > 0,
    lastOpenedAt: prof?.app_last_opened_at || null,
    tokens: tokens.map((t) => t.token).filter(Boolean),
    sentAt: sends.map((s) => s.sent_at),
  };
}

/** Write down that it went, or that Expo refused it. */
async function logSend(profileId, kind, ok, detail) {
  const { url, key } = env();
  if (!url || !key) return;
  await fetch(`${url}/rest/v1/push_sends`, {
    method: 'POST',
    headers: { ...svc(key), 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ profile_id: profileId, kind, ok, detail: detail ? String(detail).slice(0, 300) : null }),
  }).catch(() => {});
}

/**
 * A token Expo says is dead is a device that no longer exists.
 *
 * DeviceNotRegistered is what Expo answers for an app that has been deleted or
 * whose permission was revoked. Keeping the row would mean trying that device
 * for ever and counting a failure against nothing; removing it is the only way
 * the table stays honest about who can be reached.
 */
async function forgetToken(token) {
  const { url, key } = env();
  if (!url || !key) return;
  await fetch(`${url}/rest/v1/push_tokens?token=eq.${encodeURIComponent(token)}`, {
    method: 'DELETE',
    headers: { ...svc(key), Prefer: 'return=minimal' },
  }).catch(() => {});
}

/**
 * Send one alert to one person's devices, if the rules allow it.
 *
 * @param alert   what notificationFor returned: { kind, title, body, deepLink }
 * @returns {Promise<{sent: boolean, reason: string}>}
 */
export async function sendPush(profileId, alert) {
  if (!profileId || !alert?.kind || !alert?.title) return { sent: false, reason: 'nothing_to_send' };

  const history = await pushHistoryFor(profileId);
  if (!history) return { sent: false, reason: 'push_not_set_up' };

  /* The decision is not made here. */
  const { shouldNotify } = await import('./notifications.js');
  const verdict = shouldNotify(alert, history);
  if (!verdict.send) return { sent: false, reason: verdict.reason };

  const messages = history.tokens.map((to) => ({
    to,
    title: alert.title,
    body: alert.body || undefined,
    sound: 'default',
    /* Where the tap goes. The app reads `deepLink` out of this and hands it to
       the same resolver a home-screen card uses, so a push and a card cannot
       disagree about where one kind of event belongs. */
    data: { kind: alert.kind, deepLink: alert.deepLink || '/?view=home' },
  }));
  if (!messages.length) return { sent: false, reason: 'no_devices' };

  const headers = { 'Content-Type': 'application/json', Accept: 'application/json' };
  const accessToken = process.env.EXPO_ACCESS_TOKEN;
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  let body = null;
  try {
    const res = await fetch(EXPO_SEND, {
      method: 'POST', headers, body: JSON.stringify(messages),
      signal: AbortSignal.timeout(8000),
    });
    body = await res.json().catch(() => null);
    if (!res.ok) {
      await logSend(profileId, alert.kind, false, `expo ${res.status}`);
      return { sent: false, reason: 'expo_refused' };
    }
  } catch (e) {
    await logSend(profileId, alert.kind, false, e?.message);
    return { sent: false, reason: 'expo_unreachable' };
  }

  /* Expo answers per message. One dead device must not read as a failed send,
     and a send where every device is dead must not read as a success. */
  const tickets = Array.isArray(body?.data) ? body.data : [];
  let delivered = 0;
  for (let i = 0; i < tickets.length; i += 1) {
    const t = tickets[i];
    if (t?.status === 'ok') { delivered += 1; continue; }
    if (t?.details?.error === 'DeviceNotRegistered') await forgetToken(messages[i].to);
  }
  const ok = delivered > 0;
  await logSend(profileId, alert.kind, ok, ok ? null : (tickets[0]?.message || 'no device accepted it'));
  return { sent: ok, reason: ok ? 'ok' : 'all_devices_refused' };
}
