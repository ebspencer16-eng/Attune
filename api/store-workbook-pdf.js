/**
 * POST /api/store-workbook-pdf
 *
 * Same role as /api/store-workbook (auth gate, generate, store, return signed
 * URL) but produces the Volume 01 PDF workbook instead of the docx. Calls an
 * external Python+Playwright service (because Vercel can't run Playwright).
 *
 * Required env vars:
 *   WORKBOOK_SERVICE_URL     — full URL of the deployed service, e.g.
 *                              https://attune-workbook.onrender.com/render
 *   WORKBOOK_SERVICE_SECRET  — shared secret, must match the value set on
 *                              the service host
 *   SUPABASE_URL, SUPABASE_SERVICE_KEY — Supabase Storage upload + order update
 *   ADMIN_API_KEY            — bypass auth for server-to-server calls
 *
 * Body: same shape as /api/store-workbook (the buildWorkbookPayload output
 * from src/App.jsx). The transform happens server-side via payloadToCouple.
 *
 * Returns: { ok, url, filename }
 */

import fetch from 'node-fetch';
import { payloadToCouple } from './_couple-shape.js';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // ── Auth + payment gate (mirrors store-workbook) ─────────────────────────
  const authSupabaseUrl = process.env.SUPABASE_URL;
  const authServiceKey  = process.env.SUPABASE_SERVICE_KEY
                       || process.env.SUPABASE_SERVICE_ROLE
                       || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const adminKey    = process.env.ADMIN_API_KEY;
  const reqAdminKey = req.headers['x-admin-key'];
  const authHeader  = req.headers.authorization || '';
  const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const isAdminCall = !!(adminKey && reqAdminKey && reqAdminKey === adminKey);

  if (!isAdminCall) {
    if (!authSupabaseUrl || !authServiceKey) {
      return res.status(500).json({ error: 'Server not configured for auth' });
    }
    if (!accessToken) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    try {
      const userRes = await fetch(`${authSupabaseUrl}/auth/v1/user`, {
        headers: { apikey: authServiceKey, Authorization: `Bearer ${accessToken}` },
      });
      if (!userRes.ok) return res.status(401).json({ error: 'Invalid auth token' });
      const userJson = await userRes.json();
      const userId = userJson?.id;
      const userEmail = userJson?.email;
      if (!userId) return res.status(401).json({ error: 'Invalid auth token' });

      const orderQuery = userEmail
        ? `or=(user_id.eq.${userId},buyer_email.eq.${encodeURIComponent(userEmail)})`
        : `user_id=eq.${userId}`;
      const ordersRes = await fetch(
        `${authSupabaseUrl}/rest/v1/orders?${orderQuery}&select=addon_workbook&limit=10`,
        { headers: { apikey: authServiceKey, Authorization: `Bearer ${authServiceKey}` } }
      );
      if (!ordersRes.ok) return res.status(500).json({ error: 'Order lookup failed' });
      const orders = await ordersRes.json();
      const hasWorkbook = Array.isArray(orders) && orders.some(o => !!o.addon_workbook);
      if (!hasWorkbook) {
        return res.status(403).json({ error: 'No workbook purchase found for this user' });
      }
    } catch (e) {
      console.error('[store-workbook-pdf] payment check error:', e);
      return res.status(500).json({ error: 'Payment verification failed' });
    }
  }

  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
  catch { return res.status(400).json({ error: 'Invalid JSON' }); }

  const supabaseUrl  = process.env.SUPABASE_URL;
  const serviceKey   = process.env.SUPABASE_SERVICE_KEY;
  const serviceUrl   = process.env.WORKBOOK_SERVICE_URL;
  const serviceSecret = process.env.WORKBOOK_SERVICE_SECRET;

  if (!serviceUrl || !serviceSecret) {
    return res.status(500).json({ error: 'PDF service not configured (WORKBOOK_SERVICE_URL / WORKBOOK_SERVICE_SECRET)' });
  }

  // ── Transform App.jsx payload → COUPLE shape the Python builder expects ──
  let couple;
  try {
    couple = payloadToCouple(body);
  } catch (e) {
    console.error('[store-workbook-pdf] transform error:', e);
    return res.status(400).json({ error: 'Payload transform failed', detail: e.message });
  }

  // ── Call the external Python+Playwright service ──────────────────────────
  let pdfBuffer;
  try {
    const svcRes = await fetch(serviceUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Secret': serviceSecret,
      },
      body: JSON.stringify(couple),
    });
    if (!svcRes.ok) {
      const errText = await svcRes.text().catch(() => '');
      throw new Error(`Service returned ${svcRes.status}: ${errText.slice(0, 200)}`);
    }
    const arrayBuf = await svcRes.arrayBuffer();
    pdfBuffer = Buffer.from(arrayBuf);
    if (pdfBuffer.length < 1000) {
      throw new Error(`Service returned suspiciously small payload (${pdfBuffer.length} bytes)`);
    }
  } catch (e) {
    console.error('[store-workbook-pdf] service call error:', e);
    return res.status(502).json({ error: 'PDF service failed', detail: e.message });
  }

  const p1 = (body.userName || 'PartnerA').replace(/\s+/g, '_');
  const p2 = (body.partnerName || 'PartnerB').replace(/\s+/g, '_');
  const orderId = body.orderId || `${p1}_${p2}_${Date.now()}`;
  const filename = `Attune_Workbook_${p1}_and_${p2}.pdf`;
  // Different folder than docx so both can coexist while we transition
  const storagePath = `workbooks/${orderId}/${filename}`;

  if (!supabaseUrl || !serviceKey) {
    // No Supabase configured — return the PDF directly as base64. Useful
    // for local testing; production should always have Supabase set up.
    console.warn('[store-workbook-pdf] No Supabase configured — returning base64');
    return res.status(200).json({
      ok: true,
      filename,
      base64: pdfBuffer.toString('base64'),
      contentType: 'application/pdf',
    });
  }

  // ── Upload to Supabase Storage ───────────────────────────────────────────
  try {
    const uploadRes = await fetch(
      `${supabaseUrl}/storage/v1/object/workbooks/${orderId}/${encodeURIComponent(filename)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/pdf',
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
          'x-upsert': 'true',
        },
        body: pdfBuffer,
      }
    );
    if (!uploadRes.ok) {
      const err = await uploadRes.text();
      throw new Error(`Storage upload failed: ${err}`);
    }

    // Generate a signed URL (7 days)
    const signedRes = await fetch(
      `${supabaseUrl}/storage/v1/object/sign/workbooks/${orderId}/${encodeURIComponent(filename)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({ expiresIn: 604800 }),
      }
    );
    const signedData = await signedRes.json();
    const downloadUrl = signedData.signedURL
      ? `${supabaseUrl}/storage/v1${signedData.signedURL}`
      : null;

    // Update the order row with the workbook URL + status. Best-effort.
    if (body.orderId) {
      await fetch(`${supabaseUrl}/rest/v1/orders?order_num=eq.${encodeURIComponent(body.orderId)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          workbook_url: downloadUrl,
          workbook_status: 'ready',
          workbook_format: 'pdf',
        }),
      }).catch(() => {});
    }

    return res.status(200).json({ ok: true, url: downloadUrl, filename });
  } catch (e) {
    console.error('[store-workbook-pdf] storage error:', e);
    return res.status(500).json({ error: 'Storage upload failed', detail: e.message });
  }
}
