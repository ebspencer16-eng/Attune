/**
 * One-time backfill for profiles.entitlements.
 *
 * Computes and stores the authoritative entitlements blob for every existing
 * profile, so no account is left relying on the client-side fallback. New
 * accounts populate themselves via the writer triggers (webhook, partner-sync,
 * and the login recompute), so this is only needed once for accounts that
 * existed before Move 3 shipped.
 *
 * Run locally with the service role key (the same one in Vercel env):
 *
 *   SUPABASE_URL="https://xixzdigq....supabase.co" \
 *   SUPABASE_SERVICE_ROLE="eyJ...service-role-key..." \
 *   node scripts/backfill_entitlements.mjs
 *
 * Safe to run more than once (it just recomputes). The service key is never
 * stored; it is read from the environment for this run only.
 */

import { writeEntitlements } from '../api/_lib/entitlements.js';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceKey  = process.env.SUPABASE_SERVICE_ROLE
                 || process.env.SUPABASE_SERVICE_ROLE_KEY
                 || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE in the environment.');
  process.exit(1);
}

async function allProfileIds() {
  const ids = [];
  const pageSize = 1000;
  let from = 0;
  while (true) {
    const res = await fetch(`${supabaseUrl}/rest/v1/profiles?select=id`, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        Range: `${from}-${from + pageSize - 1}`,
        'Range-Unit': 'items',
      },
    });
    if (!res.ok) {
      console.error('profile fetch failed:', res.status, await res.text().catch(() => ''));
      break;
    }
    const rows = await res.json();
    for (const r of rows) if (r?.id) ids.push(r.id);
    if (rows.length < pageSize) break;
    from += pageSize;
  }
  return ids;
}

const ids = await allProfileIds();
console.log(`Backfilling entitlements for ${ids.length} profile(s)...`);

let ok = 0, fail = 0;
for (const id of ids) {
  const r = await writeEntitlements({ supabaseUrl, serviceKey, userId: id });
  if (r.ok) { ok++; }
  else { fail++; console.warn(`  ${id}: ${r.error}`); }
}

console.log(`Done. ${ok} written, ${fail} failed.`);
