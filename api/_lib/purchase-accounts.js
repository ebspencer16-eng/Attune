/**
 * The account a purchase makes, for the buyer or for a gift's recipient
 * (A206).
 *
 * Ellie chose this over signing up afterwards: the account exists the moment
 * the payment goes through, so the partner can be invited straight away (an
 * invitation joins on the buyer's invite code, which only an account has),
 * and the confirmation email carries one link that sets a password.
 *
 * ── CONFIRMED AT CREATION ─────────────────────────────────────────────────
 * The address is marked confirmed when the account is made. Nobody can get in
 * without the link we email to that address or a Google or Apple sign-in on
 * it, so whoever owns the inbox owns the account; a second "confirm your
 * email" message would prove nothing the first link does not.
 *
 * ── AN ADDRESS THAT ALREADY HAS AN ACCOUNT ────────────────────────────────
 * Found, not made, and its profile is only filled where it is empty: a
 * returning customer's name and partner are theirs, not the checkout form's.
 */
import { newInviteCode } from './invite-code.js';
import { SITE_URL } from './site.js';

/** { ok, id, isNew } for an address, making the auth user if there is none. */
export async function accountFor(admin, email) {
  const made = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (made?.data?.user?.id) return { ok: true, id: made.data.user.id, isNew: true };
  const err = made?.error;
  if (!err || !(err.code === 'email_exists' || /already|exists|registered/i.test(err.message || ''))) {
    return { ok: false, error: err?.message || 'could not make the account' };
  }
  // It exists. Generating a link sends nothing and hands back the user.
  const found = await admin.auth.admin.generateLink({ type: 'magiclink', email });
  if (found?.data?.user?.id) return { ok: true, id: found.data.user.id, isNew: false };
  return { ok: false, error: found?.error?.message || 'could not find the account' };
}

/**
 * The profile row for an account, made if missing and otherwise only filled
 * where empty. `fields` is what the purchase knows: name, partner_name,
 * partner_email. Returns { ok, inviteCode, name }.
 */
export async function ensureProfile(admin, { id, email, fields = {} }) {
  const { data: rows, error: readErr } = await admin.from('profiles')
    .select('id,name,partner_name,partner_email,invite_code,partner_profile_id').eq('id', id);
  if (readErr) return { ok: false, error: readErr.message };
  const existing = rows?.[0];
  if (!existing) {
    const row = {
      id, email, purchase_email: email, auth_provider: 'email',
      name: fields.name || null, partner_name: fields.partner_name || null,
      partner_email: fields.partner_email || null,
      invite_code: newInviteCode(), partner_joined: false, joined_via_invite: false,
    };
    let { error } = await admin.from('profiles').insert(row);
    if (error?.code === '23505') { row.invite_code = newInviteCode(); ({ error } = await admin.from('profiles').insert(row)); }
    if (error) return { ok: false, error: error.message };
    return { ok: true, inviteCode: row.invite_code, name: row.name, created: true };
  }
  const patch = {};
  for (const k of ['name', 'partner_name', 'partner_email']) if (!existing[k] && fields[k]) patch[k] = fields[k];
  // Somebody already linked to a partner keeps them; nothing to invite.
  if (existing.partner_profile_id) delete patch.partner_email;
  if (!existing.invite_code) patch.invite_code = newInviteCode();
  if (Object.keys(patch).length) {
    const { error } = await admin.from('profiles').update(patch).eq('id', id);
    if (error) return { ok: false, error: error.message };
  }
  return {
    ok: true, inviteCode: patch.invite_code || existing.invite_code,
    name: existing.name || patch.name || null, linked: !!existing.partner_profile_id,
  };
}

/** The link in the email: ours, so it outlives Supabase's hour. */
export const setupUrl = (token) => `${SITE_URL}/app?setup=${encodeURIComponent(token)}`;

/** What an invited partner opens, in the shape the website's invite page reads. */
export function partnerInviteUrl({ inviteCode, fromName, buyerEmail, partnerEmail }) {
  const q = new URLSearchParams({ invite: inviteCode });
  if (fromName) q.set('from', fromName);
  if (buyerEmail) q.set('pae', buyerEmail);
  if (partnerEmail) q.set('iie', partnerEmail);
  return `${SITE_URL}/app?${q.toString()}`;
}
