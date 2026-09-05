/**
 * POST /api/generate-workbook-promo
 *
 * Fired once when a couple's results first generate. Creates a single-use,
 * 30-day, 30%-off-workbook code bound to the couple's two emails (strict
 * binding), then emails both partners.
 *
 * Body: { accountEmail, partnerEmail?, toName?, partnerName? }
 * Idempotent: if a workbook flash code already exists for either email, it
 * returns that code and sends nothing.
 */
export const config = { runtime: 'edge' };

const DISCOUNT_PERCENT = 30;
const VALID_DAYS = 30;

function genCode() {
  // Unambiguous charset (no 0/O/1/I). ATTUNE-WB-XXXXXXXX.
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  let out = '';
  for (const b of bytes) out += chars[b % chars.length];
  return 'ATTUNE-WB-' + out;
}

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  let body;
  try { body = await req.json(); } catch { return new Response('Invalid JSON', { status: 400 }); }

  const accountEmail = (body.accountEmail || '').toLowerCase().trim();
  const partnerEmail = (body.partnerEmail || '').toLowerCase().trim();
  const toName       = (body.toName || '').toString().slice(0, 60);
  const partnerName  = (body.partnerName || '').toString().slice(0, 60);

  if (!accountEmail || !accountEmail.includes('@')) {
    return new Response(JSON.stringify({ error: 'accountEmail required' }), {
      status: 400, headers: { 'Content-Type': 'application/json' },
    });
  }

  const sUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const sAnon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

  // Require the caller to prove they own accountEmail. Without this, anyone
  // could POST an arbitrary address and have us email it (from our verified
  // sending domain) and mint a promo code bound to it.
  {
    const authHeader = req.headers.get('authorization') || req.headers.get('Authorization') || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    if (!token) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401, headers: { 'Content-Type': 'application/json' } });
    }
    try {
      const ur = await fetch(`${sUrl}/auth/v1/user`, {
        headers: { apikey: sAnon || process.env.SUPABASE_SERVICE_KEY || '', Authorization: `Bearer ${token}` },
      });
      const u = ur.ok ? await ur.json().catch(() => null) : null;
      if (!u?.email || u.email.toLowerCase().trim() !== accountEmail) {
        return new Response(JSON.stringify({ error: 'Not authorized for this account' }), {
          status: 403, headers: { 'Content-Type': 'application/json' } });
      }
    } catch {
      return new Response(JSON.stringify({ error: 'Authentication failed' }), {
        status: 401, headers: { 'Content-Type': 'application/json' } });
    }
  }

  const sKey = process.env.SUPABASE_SERVICE_ROLE
            || process.env.SUPABASE_SERVICE_KEY
            || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!sUrl || !sKey) {
    return new Response(JSON.stringify({ ok: true, skipped: 'no_db' }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  }
  const dbHeaders = { apikey: sKey, Authorization: `Bearer ${sKey}`, 'Content-Type': 'application/json' };

  // ── Idempotency: a workbook flash code already bound to either email? ──
  try {
    const conds = [`bound_emails.cs.{${accountEmail}}`];
    if (partnerEmail && partnerEmail.includes('@')) conds.push(`bound_emails.cs.{${partnerEmail}}`);
    const q = `${sUrl}/rest/v1/beta_codes?select=code&applies_to=eq.workbook&or=(${conds.join(',')})`;
    const chk = await fetch(q, { headers: dbHeaders });
    const existing = await chk.json();
    if (Array.isArray(existing) && existing.length) {
      return new Response(JSON.stringify({ ok: true, deduped: true, code: existing[0].code }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (e) {
    console.warn('[wb-promo] dedup check failed (continuing):', e);
  }

  // ── Skip if the couple already owns the workbook (premium bundles it, or the
  //    workbook add-on was purchased). No point promoting what they already have.
  try {
    const emails = [accountEmail];
    if (partnerEmail && partnerEmail.includes('@')) emails.push(partnerEmail);
    const inList = emails.map(e => `"${String(e).replace(/[",()]/g, '')}"`).join(',');
    const oq = `${sUrl}/rest/v1/orders?select=addon_workbook,pkg_key&buyer_email=in.(${inList})`;
    const or = await fetch(oq, { headers: dbHeaders });
    const orders = or.ok ? await or.json().catch(() => []) : [];
    const ownsWorkbook = Array.isArray(orders) && orders.some(o => o.addon_workbook || o.pkg_key === 'premium');
    if (ownsWorkbook) {
      return new Response(JSON.stringify({ ok: true, skipped: 'owns_workbook' }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (e) {
    console.warn('[wb-promo] workbook-ownership check failed (continuing):', e);
  }

  const code = genCode();
  const expiresAt = new Date(Date.now() + VALID_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const bound = [accountEmail];
  if (partnerEmail && partnerEmail.includes('@')) bound.push(partnerEmail);

  // ── Create the code ──
  try {
    const ins = await fetch(`${sUrl}/rest/v1/beta_codes`, {
      method: 'POST',
      headers: { ...dbHeaders, Prefer: 'return=minimal' },
      body: JSON.stringify({
        code,
        package_key:    '*',          // applies regardless of package; only the workbook is discounted
        discount_mode:  'percent',
        discount_value: DISCOUNT_PERCENT,
        applies_to:     'workbook',
        includes_workbook: false,
        max_uses:       1,
        uses_count:     0,
        active:         true,
        expires_at:     expiresAt,
        bound_emails:   bound,
        note:           `Flash promo - ${toName || accountEmail}`,
      }),
    });
    if (!ins.ok && ins.status !== 409) {
      const t = await ins.text();
      console.warn('[wb-promo] insert failed:', ins.status, t);
      return new Response(JSON.stringify({ error: 'insert_failed' }), {
        status: 500, headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (e) {
    console.warn('[wb-promo] insert error:', e);
    return new Response(JSON.stringify({ error: 'insert_error' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }

  // ── Email both partners ──
  let origin = 'https://attune-relationships.com';
  try { origin = new URL(req.url).origin; } catch (e) {}
  const checkoutUrl = 'https://attune-relationships.com/app';

  async function sendTo(toEmail, name, otherName) {
    if (!toEmail || !toEmail.includes('@')) return;
    try {
      // Server-to-server: no Origin header, so it must present the internal
      // secret or send-email refuses it.
      await fetch(`${origin}/api/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-attune-internal': process.env.INTERNAL_API_SECRET || '' },
        body: JSON.stringify({
          type: 'workbook_promo',
          toEmail, toName: name || 'there', partnerName: otherName || '',
          code, checkoutUrl, discountPercent: DISCOUNT_PERCENT,
        }),
      });
    } catch (e) { console.warn('[wb-promo] email failed:', toEmail, e); }
  }
  await sendTo(accountEmail, toName, partnerName);
  await sendTo(partnerEmail, partnerName, toName);

  return new Response(JSON.stringify({ ok: true, code }), {
    status: 200, headers: { 'Content-Type': 'application/json' },
  });
}
