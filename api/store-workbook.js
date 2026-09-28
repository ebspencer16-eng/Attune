/**
 * POST /api/store-workbook
 *
 * Renders the personalized workbook as a PDF through the same page the website
 * prints, uploads it to Supabase Storage, and returns a signed download URL
 * valid for 7 days.
 *
 * Called automatically when both partners complete exercises.
 * Also callable from the admin dashboard to regenerate.
 *
 * Body: { userName, partnerName, scores, partnerScores, coupleType, expGaps, orderId? }
 *
 * Returns: { ok, url, filename }
 */

// fetch is global on the Node 18+ runtime this deploys to. This imported
// node-fetch, which is not in package.json, so the module failed to load and
// every call to this endpoint 500'd before reaching the handler.

export const config = { runtime: 'nodejs' };

import { SITE_URL } from './_lib/site.js';

import { safeError } from './_lib/http.js';
import { payloadForCouple } from './_lib/workbook-couple.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // ── Auth + payment gate (mirrors generate-workbook) ────────────────────────
  // This endpoint generates AND stores a workbook to Supabase Storage. Without
  // a gate, any caller could spam-generate workbooks and exhaust storage.
  // Two ways to satisfy:
  //   1. X-Admin-Key matching ADMIN_API_KEY (admin tools, cron, etc.)
  //   2. Bearer token from a logged-in user with addon_workbook on an order
  const authSupabaseUrl = process.env.SUPABASE_URL;
  const authServiceKey  = process.env.SUPABASE_SERVICE_KEY
                       || process.env.SUPABASE_SERVICE_ROLE
                       || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const adminKey    = process.env.ADMIN_API_KEY;
  const reqAdminKey = req.headers['x-admin-key'];
  const authHeader  = req.headers.authorization || '';
  const accessToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const isAdminCall = !!(adminKey && reqAdminKey && reqAdminKey === adminKey);
  /** The signed-in caller, when there is one. */
  let callerId = null;

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
      // Kept for the payload builder below: a signed-in caller builds their own
      // workbook and nobody else's.
      callerId = userId;

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
      console.error('[store-workbook] payment check error:', e);
      return res.status(500).json({ error: 'Payment verification failed' });
    }
  }

  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
  catch { return res.status(400).json({ error: 'Invalid JSON' }); }

  const supabaseUrl  = process.env.SUPABASE_URL;
  const serviceKey   = process.env.SUPABASE_SERVICE_KEY;

  /**
   * ── BUILT HERE, FROM A USER ID ──────────────────────────────────────────
   * The website hands this endpoint a whole payload, because it has one: it
   * is the screen the couple just finished on. The server has no such screen.
   * Ellie asked for the workbook to exist the moment results open, so the
   * caller that matters now is api/save-exercise.js, and all it knows is who
   * finished.
   *
   * So { userId } is enough. The payload is built from the two profiles with
   * the same module the website builds it with, which is the only reason this
   * cannot drift into a second workbook.
   *
   * Admin only, because a user id in a body is not proof of anything. The call
   * that uses it is server to server with the internal key.
   */
  if (!body?.scores) {
    /**
     * Who the workbook is for, when no payload came with the request.
     *
     * An internal caller says whose; a signed-in person gets their own and
     * cannot ask for anyone else's. The gate above has already established
     * that this person owns a workbook.
     */
    const forUser = isAdminCall ? body?.userId : callerId;
    if (!forUser) return res.status(400).json({ error: 'nothing to build from' });
    if (!supabaseUrl || !serviceKey) return res.status(500).json({ error: 'Server not configured' });
    const built = await payloadForCouple({ supabaseUrl, serviceKey, userId: forUser });
    if (!built) return res.status(409).json({ error: 'not enough answers for a workbook yet' });
    body = { ...built, ...body };
  }

  /**
   * ── ONE WORKBOOK, AND IT IS THE ONE ON THE WEBSITE ────────────────────────
   * Ellie: "the downloaded workbook I'm peeking on the simulator does not have
   * the same look and feel as the workbook we've built online. This is very
   * important to me and you've drifted before, please use the script that
   * already exists to build the workbook as it's already been approved rather
   * than in a different format or visual."
   *
   * She is right and this endpoint was the drift. It called
   * /api/generate-workbook, which assembles a .docx out of the `docx` package:
   * a different document, in a different format, with none of the design of
   * public/workbook-render.html, which is the workbook the website prints and
   * the one that was approved. The app opens whatever file this stores first,
   * so the fast path handed a tester the wrong document every time.
   *
   * /api/generate-pdf is the approved builder. It renders workbook-render
   * through Browserless with the same options a customer gets on the website.
   *
   * ── WHEN BROWSERLESS IS NOT CONFIGURED ────────────────────────────────────
   * Nothing is stored. generate-pdf falls back to the .docx generator when it
   * has no token, and taking that fallback here would store the wrong document
   * again under a different name. Storing nothing is what the app already knows
   * how to handle: no file means it hands the payload to the browser, which
   * draws the same page with html2pdf. Slower, and the right workbook.
   */
  let pdfBuffer;
  const siteUrl = SITE_URL;
  if (!process.env.BROWSERLESS_TOKEN) {
    console.warn('[store-workbook] no BROWSERLESS_TOKEN, so no file is stored and'
      + ' the browser will draw the workbook from the same page instead.');
    return res.status(200).json({ ok: true, url: null, filename: null, reason: 'no_pdf_renderer' });
  }
  try {
    const genHeaders = { 'Content-Type': 'application/json' };
    if (process.env.ADMIN_API_KEY) genHeaders['X-Admin-Key'] = process.env.ADMIN_API_KEY;
    const genRes = await fetch(`${siteUrl}/api/generate-pdf`, {
      method: 'POST',
      headers: genHeaders,
      body: JSON.stringify(body),
    });
    if (!genRes.ok) throw new Error(`Workbook generation failed: ${genRes.status}`);
    const type = genRes.headers.get('content-type') || '';
    if (!/application\/pdf/i.test(type)) {
      /* generate-pdf redirects to the .docx generator when it has no token, and
         a redirect followed here would put that document in storage wearing a
         .pdf name. Refuse rather than store the wrong thing. */
      throw new Error(`expected a pdf and got ${type || 'no content type'}`);
    }
    const arrayBuf = await genRes.arrayBuffer();
    pdfBuffer = Buffer.from(arrayBuf);
  } catch (e) {
    console.error('[store-workbook] generation error:', e);
    return res.status(502).json({ error: safeError('store-workbook', e, 'Workbook generation failed.') });
  }

  const p1 = (body.userName || 'PartnerA').replace(/\s+/g, '_');
  const p2 = (body.partnerName || 'PartnerB').replace(/\s+/g, '_');
  const orderId = body.orderId || `${p1}_${p2}_${Date.now()}`;
  const filename = `Attune_Workbook_${p1}_and_${p2}.pdf`;
  const storagePath = `workbooks/${orderId}/${filename}`;

  if (!supabaseUrl || !serviceKey) {
    // No Supabase — return the pdf directly as base64 with a data URL
    console.warn('[store-workbook] No Supabase configured, returning base64');
    return res.status(200).json({
      ok: true,
      filename,
      base64: pdfBuffer.toString('base64'),
      contentType: 'application/pdf',
    });
  }

  // Upload to Supabase Storage
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

    // Generate a signed URL (7 days = 604800 seconds)
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

    // Optionally update the order record with the workbook URL
    if (body.orderId) {
      await fetch(`${supabaseUrl}/rest/v1/orders?order_num=eq.${encodeURIComponent(body.orderId)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({ workbook_url: downloadUrl, workbook_status: 'ready' }),
      }).catch(() => {});
    }

    return res.status(200).json({ ok: true, url: downloadUrl, filename });
  } catch (e) {
    console.error('[store-workbook] storage error:', e);
    return res.status(500).json({ error: safeError('store-workbook', e, 'Storage upload failed.') });
  }
}

