/**
 * Recording that someone agreed to the Terms and the Privacy Policy.
 *
 * ── WHY ───────────────────────────────────────────────────────────────────
 * The retention policy promises these records and keeps them for seven years,
 * "even after account deletion". Nothing recorded one. See migration 058 for
 * what the row holds and why it holds a hash rather than an address.
 *
 * ── WHERE IT IS CALLED ────────────────────────────────────────────────────
 * The two moments the EULA and the signup flow treat as agreement:
 *
 *   checkout          api/stripe-webhook.js, when an order is created
 *   account_creation  api/create-profile.js, when a profile is written
 *
 * Both, not one: someone can buy and never create an account, and a partner
 * can create an account without ever buying.
 *
 * ── IT NEVER FAILS THE THING IT IS RECORDING ──────────────────────────────
 * A consent record that cannot be written must not fail a purchase or block
 * someone from setting up. It logs and moves on. That is a deliberate choice
 * about which failure is worse, and it is why the write is fire and forget.
 */

import { LEGAL_VERSION } from './legal-version.js';

/**
 * A one-way reference to a person, so a consent can be found again without
 * the table holding an address.
 *
 * The pepper lives in the environment, not in the table, so the hashes are
 * useless to anyone who only has the database. With no pepper set the hash is
 * still stable and still not reversible to an address by reading it; it is
 * just easier to attack with a dictionary of emails, which is why the env var
 * should be set.
 */
export async function subjectHash(email) {
  const pepper = process.env.CONSENT_PEPPER || '';
  const input = String(email || '').trim().toLowerCase() + pepper;
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Write one consent event. Returns true if it landed.
 *
 * `source` is 'checkout' or 'account_creation'. `country` is optional and is
 * the country only, never an address.
 */
export async function recordConsent({ email, userId = null, source, country = null }) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY
    || process.env.SUPABASE_SERVICE_ROLE_KEY
    || process.env.SUPABASE_SERVICE_ROLE;
  if (!url || !key || !email || !source) return false;

  try {
    const res = await fetch(`${url}/rest/v1/consent_events`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        user_id: userId,
        subject_hash: await subjectHash(email),
        legal_version: LEGAL_VERSION,
        source,
        country,
      }),
    });
    if (!res.ok) {
      // A missing table is the expected failure until migration 058 is run.
      // Said plainly, because a previous endpoint promised to "degrade
      // gracefully" before its migration and degraded to a 500 instead.
      console.warn(`[consent] not recorded (${res.status}). Migration 058 may not have been run.`);
      return false;
    }
    return true;
  } catch (e) {
    console.warn('[consent] not recorded:', e?.message);
    return false;
  }
}
