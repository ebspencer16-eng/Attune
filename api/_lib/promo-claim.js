/**
 * Count one redemption of a promo code, by compare and swap.
 *
 * Moved out of api/create-payment-intent.js so the Stripe webhook can call it
 * too (A204e). See that file for why it is a compare and swap (A202): move
 * uses_count from the value last seen, and only if it is still that value, so
 * two redemptions at once cannot both count as the first. A code with no row
 * yet (a named code's first use) is inserted, and the unique code makes a
 * second insert fail the same way.
 *
 * ── WHEN ──────────────────────────────────────────────────────────────────
 * A free order is written by the payment endpoint itself, so it claims there,
 * before the order exists. A paid one used to claim there too, before the
 * card was charged, so a declined card or a closed tab spent the code and
 * bought nothing, and the retry said "This code has already been used." The
 * per-couple workbook discounts are single-use, which made that a lost
 * discount. A paid order claims in the webhook now, once the payment has
 * succeeded.
 *
 * Answers true when this call is the one that counted.
 */
export async function claimPromoUse({ supabaseUrl, serviceKey, code, row, count, packageKey, buyerEmail }) {
  const enc = encodeURIComponent(code);
  const H = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };
  const stamp = {
    last_used_at: new Date().toISOString(),
    last_used_by: buyerEmail ? String(buyerEmail).trim().toLowerCase() : null,
  };
  try {
    let res;
    if (row) {
      const was = row.uses_count;
      const still = was == null ? 'uses_count=is.null' : `uses_count=eq.${Number(was)}`;
      res = await fetch(`${supabaseUrl}/rest/v1/beta_codes?code=eq.${enc}&${still}`, {
        method: 'PATCH', headers: H,
        body: JSON.stringify({ uses_count: (Number(was) || 0) + count, ...stamp }),
      });
    } else {
      res = await fetch(`${supabaseUrl}/rest/v1/beta_codes`, {
        method: 'POST', headers: H,
        body: JSON.stringify({ code, package_key: packageKey, uses_count: count, active: true, ...stamp }),
      });
    }
    if (!res.ok) {
      console.warn('[promo] claim refused:', res.status, (await res.text().catch(() => '')).slice(0, 200));
      return false;
    }
    const rows = await res.json().catch(() => null);
    return Array.isArray(rows) && rows.length === 1;
  } catch (e) {
    console.warn('[promo] claim failed:', e);
    return false;
  }
}

/** The code's row, or null when it has none; `undefined` when the read failed. */
export async function readPromoRow({ supabaseUrl, serviceKey, code }) {
  const r = await fetch(`${supabaseUrl}/rest/v1/beta_codes?code=eq.${encodeURIComponent(code)}&select=code,uses_count`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
  }).catch(() => null);
  if (!r?.ok) return undefined;
  const rows = await r.json().catch(() => null);
  return Array.isArray(rows) ? (rows[0] || null) : undefined;
}
