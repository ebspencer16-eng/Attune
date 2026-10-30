/**
 * POST /api/invite-partner  { partnerEmail, partnerName? }   (Bearer token)
 * GET  /api/invite-partner  the form's words, for the app
 *
 * Invites the signed-in person's partner, by email, from the dashboard or the
 * app (A206).
 *
 * Ellie: someone who ticks "I will invite my partner later" at checkout is
 * told they can invite their partner from the dashboard, "and then those
 * users need to be prompted in their dashboard to invite their partner". The
 * prompt is the `invite-partner` card in api/_lib/next-action.js, on both
 * surfaces; this is what its button does.
 *
 * It is also what the app's own profile setup was missing: the app saved the
 * partner's address and sent nothing, so a buyer who set up in the app had
 * never invited anyone. The website sends its invitation from the browser,
 * through /api/send-email; this is the server doing it, which the app needs
 * because it has no other way to send mail.
 *
 * ── WHO MAY BE EMAILED ────────────────────────────────────────────────────
 * Somebody signed in, who owns a purchase, whose partner has not joined, and
 * who has not had an invitation sent in the last ten minutes. The address is
 * theirs to choose, which is what inviting a partner is; the limit is what
 * stops the button being a way to mail anyone as often as it is pressed.
 */
export const config = { runtime: 'edge', regions: ['iad1'] };

import { jsonBody } from './_lib/http.js';
import { userForRequest } from './_lib/verify-token.js';
import { emailOrNull } from './_lib/owns-core.js';
import { capabilitiesFor } from './_lib/ownership.js';
import { newInviteCode } from './_lib/invite-code.js';
import { partnerInviteUrl } from './_lib/purchase-accounts.js';
import { ORDER_EMAILS } from './_lib/order-emails.js';
import { INVITE_COPY } from './_lib/invite-copy.js';

const GAP_MS = 10 * 60 * 1000;
const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});

export default async function handler(req) {
  // The form's words, for the app, which cannot import them.
  if (req.method === 'GET') return json({ ok: true, copy: INVITE_COPY });
  if (req.method !== 'POST') return json({ ok: false, error: 'method not allowed' }, 405);
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || serviceKey;
  const resendKey = process.env.RESEND_API_KEY;
  if (!supabaseUrl || !serviceKey || !resendKey) return json({ ok: false, error: 'not configured' }, 503);

  const token = (req.headers.get('authorization') || req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return json({ ok: false, error: 'sign in first' }, 401);
  const user = await userForRequest({ token, supabaseUrl, anonKey }).catch(() => null);
  if (!user?.id) return json({ ok: false, error: 'sign in first' }, 401);

  const parsed = await jsonBody(req);
  if (parsed.error) return parsed.error;
  const partnerEmail = emailOrNull(parsed.body?.partnerEmail);
  const partnerName = typeof parsed.body?.partnerName === 'string' ? parsed.body.partnerName.trim().slice(0, 60) : '';
  if (!partnerEmail) return json({ ok: false, error: 'enter an email address' }, 400);

  const H = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' };
  const pr = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=*`, { headers: H }).catch(() => null);
  if (!pr?.ok) return json({ ok: false, error: 'could not check that right now' }, 503);
  const me = (await pr.json().catch(() => []))?.[0];
  if (!me) return json({ ok: false, error: 'no profile' }, 404);
  if (me.partner_profile_id) return json({ ok: false, error: 'your partner has already joined' }, 409);
  if (!capabilitiesFor(me).purchased) return json({ ok: false, error: 'no purchase' }, 403);
  if (partnerEmail === String(me.email || '').toLowerCase()) return json({ ok: false, error: "that's your own address" }, 400);
  if (me.partner_invited_at && Date.now() - new Date(me.partner_invited_at).getTime() < GAP_MS) {
    return json({ ok: false, error: 'an invitation was sent a moment ago', retryAfterMinutes: 10 }, 429);
  }

  // Stamped before sending, by compare and swap, so two presses send once.
  const stamp = new Date().toISOString();
  const inviteCode = me.invite_code || newInviteCode();
  const guard = me.partner_invited_at ? `partner_invited_at=eq.${encodeURIComponent(me.partner_invited_at)}` : 'partner_invited_at=is.null';
  const up = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&${guard}`, {
    method: 'PATCH', headers: { ...H, Prefer: 'return=representation' },
    body: JSON.stringify({
      partner_email: partnerEmail, partner_invited_at: stamp,
      ...(partnerName ? { partner_name: partnerName } : {}),
      ...(me.invite_code ? {} : { invite_code: inviteCode }),
    }),
  }).catch(() => null);
  if (!up?.ok) return json({ ok: false, error: 'could not save that right now' }, 503);
  const claimed = await up.json().catch(() => []);
  if (!claimed?.length) return json({ ok: false, error: 'an invitation was sent a moment ago', retryAfterMinutes: 10 }, 429);

  const mail = ORDER_EMAILS.order_partner_invite({
    buyerName: me.name || null, partnerName: partnerName || me.partner_name || null,
    partnerInviteUrl: partnerInviteUrl({ inviteCode, fromName: me.name, buyerEmail: me.email, partnerEmail }),
  });
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: `Attune <${process.env.FROM_EMAIL || 'hello@attune-relationships.com'}>`, to: [partnerEmail], ...mail }),
  }).catch(() => null);
  if (!r?.ok) {
    // Given back, so trying again is not refused as too soon.
    await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&partner_invited_at=eq.${encodeURIComponent(stamp)}`, {
      method: 'PATCH', headers: { ...H, Prefer: 'return=minimal' }, body: JSON.stringify({ partner_invited_at: me.partner_invited_at || null }),
    }).catch(() => null);
    return json({ ok: false, error: 'the email did not send' }, 502);
  }
  return json({ ok: true, sentTo: partnerEmail });
}
