/**
 * GET /api/cron-prune-events  (daily)
 *
 * Deletes engagement measurements older than ninety days.
 *
 * ── WHY A JOB AND NOT A SENTENCE ──────────────────────────────────────────
 * The privacy policy says these rows are deleted after ninety days. A
 * retention promise with nothing that enforces it is the shape of every other
 * gap found in that document this week: a sentence describing behaviour the
 * code did not have.
 *
 * Ninety days is enough for every measure on the Engagement tab, all of which
 * are averages and rates. A year of rows answers nothing a quarter of rows
 * does not, and keeping them would be collecting for its own sake.
 */

import { consentRequired } from './_lib/consent-region.js';

export const config = { runtime: 'edge' };

const DAYS = 90;

function json(o, s = 200) {
  return new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json' } });
}

export default async function handler(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return new Response('Cron not configured', { status: 500 });
  const auth = req.headers.get('authorization') || req.headers.get('Authorization');
  if (auth !== `Bearer ${secret}`) return new Response('Unauthorized', { status: 401 });

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY
    || process.env.SUPABASE_SERVICE_ROLE_KEY
    || process.env.SUPABASE_SERVICE_ROLE;
  if (!url || !key) return json({ error: 'Missing env vars' }, 500);

  const cutoff = new Date(Date.now() - DAYS * 864e5).toISOString();
  try {
    const res = await fetch(`${url}/rest/v1/page_events?created_at=lt.${cutoff}`, {
      method: 'DELETE',
      headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: 'return=minimal' },
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      // Said plainly. A missing table is the expected state until migration 060
      // is run, and a retention job that fails quietly is a retention promise
      // that fails quietly.
      console.warn(`[prune-events] delete failed ${res.status}: ${body.slice(0, 200)}`);
      return json({ ok: false, status: res.status, cutoff, note: 'Migration 060 may not have been run.' }, 200);
    }
    return json({ ok: true, cutoff, days: DAYS });
  } catch (e) {
    return json({ ok: false, error: String(e?.message || e) }, 500);
  }
}

// consentRequired is imported so this file fails to build if that module is
// removed: the retention promise and the consent rule are described in the same
// paragraph of the privacy policy, and neither should outlive the other
// silently.
void consentRequired;
