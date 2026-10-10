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

import { capabilitiesFor } from './_lib/ownership.js';

import { WORKBOOK_EXT, WORKBOOK_MIME } from './_lib/workbook-format.js';
import { payloadToCouple } from './_couple-shape.js';
import { payloadForCouple } from './_lib/workbook-couple.js';
import { safeError } from './_lib/http.js';

/**
 * ── WHY THIS ONE NEEDS LONGER THAN THE DEFAULT ────────────────────────────
 * Ellie, twice: "The workbook service did not answer, give it a minute and try
 * again", and the environment variables have been set for months.
 *
 * A Vercel Node function defaults to about ten seconds. This one posts to an
 * external service that starts a headless browser and prints a forty-page
 * document, and if that service has been idle it has to wake up first, which on
 * a small host is most of a minute on its own. Ten seconds was never going to be
 * enough for a cold start plus a render, and the function dying looks exactly
 * like the service refusing: the page gets a 5xx either way.
 *
 * Sixty is the ceiling on the smallest Vercel plan, so it is the honest maximum
 * to ask for rather than a number chosen to be comfortable.
 */
export const config = { runtime: 'nodejs', maxDuration: 60 };

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

  // Set once the caller is authenticated. Used to persist the finished workbook
  // onto the profile, which is the only row a comp account has.
  let authedUserId = null;

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
      authedUserId = userId;

      const orderQuery = userEmail
        ? `or=(user_id.eq.${userId},buyer_email.eq.${encodeURIComponent(userEmail)})`
        : `user_id=eq.${userId}`;
      const ordersRes = await fetch(
        `${authSupabaseUrl}/rest/v1/orders?${orderQuery}&select=addon_workbook,pkg_key&limit=10`,
        { headers: { apikey: authServiceKey, Authorization: `Bearer ${authServiceKey}` } }
      );
      if (!ordersRes.ok) return res.status(500).json({ error: 'Order lookup failed' });
      const orders = await ordersRes.json();
      // Ownership is broader than the add-on flag (10.6). Premium includes the
      // workbook with addon_workbook left empty, and comp accounts have no
      // order row at all. Gating on addon_workbook alone 403'd both, which the
      // client swallowed, leaving the dashboard stuck on "Generating now".
      let hasWorkbook = Array.isArray(orders)
        && orders.some(o => capabilitiesFor(o).ownsWorkbook);
      if (!hasWorkbook) {
        const profRes = await fetch(
          `${authSupabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=is_comp&limit=1`,
          { headers: { apikey: authServiceKey, Authorization: `Bearer ${authServiceKey}` } }
        );
        if (profRes.ok) {
          const profs = await profRes.json();
          hasWorkbook = Array.isArray(profs) && profs.some(pr => pr.is_comp === true);
        }
      }
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

  /**
   * ── THE APP HAS NO PAYLOAD TO SEND ──────────────────────────────────────
   * The website builds one in the browser, out of state it already holds, and
   * posts it. The app holds none of that: it knows a user id and nothing else,
   * which is why it was calling /api/store-workbook, the endpoint that assembles
   * the payload on the server from the couple's answers.
   *
   * That is the whole reason the app has never had the right workbook. The two
   * endpoints differed in what they would accept, so the app used the one that
   * took a user id, and that one builds a different document. Ellie has reported
   * it three times.
   *
   * So this takes either. A body that carries scores is the website's payload; a
   * body that carries only a user id is assembled here from the same source
   * /api/store-workbook uses, and both end at the same renderer.
   */
  /**
   * Whose workbook this is.
   *
   * ── WHY IT IS HOISTED ───────────────────────────────────────────────────
   * This was computed inside the branch that assembles a payload, and the
   * persist below used `authedUserId`, which is null on an admin call. The
   * automatic trigger IS an admin call, so the one path that now builds every
   * couple's workbook stored the link on nobody's profile. For a couple with
   * an order row that was survivable, because the order carries it too; for a
   * comp account, which has no order row, the file was written into a folder
   * named after a timestamp and nothing could ever find it again.
   */
  const subjectUserId = isAdminCall ? (body?.userId || null) : authedUserId;

  if (!body?.scores && !body?.partnerScores) {
    const forUser = subjectUserId;
    if (!forUser) return res.status(400).json({ error: 'nothing to build from' });
    if (!supabaseUrl || !serviceKey) return res.status(500).json({ error: 'Server not configured' });
    const built = await payloadForCouple({ supabaseUrl, serviceKey, userId: forUser });
    if (!built) return res.status(409).json({ error: 'not enough answers for a workbook yet' });
    body = { ...built, ...body };
  }

  // ── Transform App.jsx payload → COUPLE shape the Python builder expects ──
  let couple;
  try {
    couple = payloadToCouple(body);
  } catch (e) {
    console.error('[store-workbook-pdf] transform error:', e);
    return res.status(400).json({ error: safeError('store-workbook-pdf', e, 'Payload transform failed.') });
  }

  // ── Call the external Python+Playwright service ──────────────────────────
  let pdfBuffer;
  try {
    /**
     * Timed out here rather than by the function dying.
     *
     * With no signal, an unreachable service holds the connection until Vercel
     * kills the whole invocation, and a killed invocation cannot say anything.
     * Stopping a few seconds short leaves room to report which failure this was,
     * which is the difference between "try again in a minute" and "someone has
     * to look at the service".
     *
     * The host is logged, never the secret. Knowing which host was called is
     * what tells a stale URL from a service that is down, and that question cost
     * a day: I probed the hostname from a setup document rather than the one
     * actually configured, and reported the service as never deployed on the
     * strength of it.
     */
    let svcRes;
    try {
      svcRes = await fetch(serviceUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Secret': serviceSecret,
        },
        body: JSON.stringify(couple),
        signal: AbortSignal.timeout(52000),
      });
    } catch (e) {
      const host = (() => { try { return new URL(serviceUrl).host; } catch { return 'an unparseable URL'; } })();
      const timedOut = e?.name === 'TimeoutError' || /timeout|aborted/i.test(String(e?.message || ''));
      console.error(`[store-workbook-pdf] ${timedOut ? 'timed out after 52s' : 'could not reach'} ${host}:`, e?.message || e);
      return res.status(504).json({
        error: timedOut
          ? `PDF service at ${host} did not answer within 52 seconds`
          : `PDF service at ${host} could not be reached`,
      });
    }
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
    return res.status(502).json({ error: safeError('store-workbook-pdf', e, 'PDF service failed.') });
  }

  const p1 = (body.userName || 'PartnerA').replace(/\s+/g, '_');
  const p2 = (body.partnerName || 'PartnerB').replace(/\s+/g, '_');
  const orderId = body.orderId || `${p1}_${p2}_${Date.now()}`;
  const filename = `Attune_Workbook_${p1}_and_${p2}.${WORKBOOK_EXT}`;
  /**
   * The same folder the .docx builder writes to, which a comment here used to
   * deny: it said "different folder than docx so both can coexist while we
   * transition", and both have always been `workbooks/<orderId>/`. They coexist
   * by sharing a folder, and for a while the reader got whichever was newest,
   * which for every couple was the Word file. The format is what tells them
   * apart now; see _lib/workbook-format.js.
   */
  const storagePath = `workbooks/${orderId}/${filename}`;

  if (!supabaseUrl || !serviceKey) {
    // No Supabase configured — return the PDF directly as base64. Useful
    // for local testing; production should always have Supabase set up.
    console.warn('[store-workbook-pdf] No Supabase configured — returning base64');
    return res.status(200).json({
      ok: true,
      filename,
      base64: pdfBuffer.toString('base64'),
      contentType: WORKBOOK_MIME,
    });
  }

  // ── Upload to Supabase Storage ───────────────────────────────────────────
  try {
    const uploadRes = await fetch(
      `${supabaseUrl}/storage/v1/object/workbooks/${orderId}/${encodeURIComponent(filename)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': WORKBOOK_MIME,
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

    // Persist onto the profile — both partners', so either can download from any
    // device. This is what makes comp accounts (which have no order row) behave
    // like paid ones. Best-effort: a failure here still returns the URL to the
    // caller, who downloads it directly.
    if (subjectUserId && downloadUrl) {
      try {
        const profRes = await fetch(
          `${supabaseUrl}/rest/v1/profiles?id=eq.${subjectUserId}&select=partner_profile_id`,
          { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } }
        );
        const profRows = profRes.ok ? await profRes.json() : [];
        const partnerId = Array.isArray(profRows) ? profRows[0]?.partner_profile_id : null;
        const ids = [subjectUserId, partnerId].filter(Boolean);
        const idFilter = ids.length > 1
          ? `id=in.(${ids.join(',')})`
          : `id=eq.${subjectUserId}`;
        await fetch(`${supabaseUrl}/rest/v1/profiles?${idFilter}`, {
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
            workbook_generated_at: new Date().toISOString(),
          }),
        });
      } catch (e) {
        console.warn('[store-workbook-pdf] profile persist failed:', e?.message || e);
      }
    }

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

    /**
     * Tell both of them it exists.
     *
     * Ellie's wording: "Your personalized workbook is ready for you to explore
     * in your learn tab". Both partners, because it is one document about the
     * two of them and either can open it.
     *
     * Only when this build was not asked for by a reader standing in front of
     * the tile: `isAdminCall` is the automatic trigger, and a push saying your
     * workbook is ready, to someone who pressed download twenty seconds ago,
     * is the product talking over itself.
     *
     * Never fails the response. The file is built and stored; an alert is the
     * courtesy on the side of that.
     */
    if (isAdminCall && subjectUserId && downloadUrl) {
      try {
        const { recordNotification } = await import('./_lib/notifications.js');
        const profRes = await fetch(
          `${supabaseUrl}/rest/v1/profiles?id=eq.${subjectUserId}&select=partner_profile_id`,
          { headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` } },
        );
        const rows = profRes.ok ? await profRes.json() : [];
        const partnerId = Array.isArray(rows) ? rows[0]?.partner_profile_id : null;
        for (const who of [subjectUserId, partnerId].filter(Boolean)) {
          await recordNotification({ ownerId: who, kind: 'workbook_ready' });
        }
      } catch (e) {
        console.warn('[store-workbook-pdf] workbook_ready alert failed:', e?.message || e);
      }
    }

    return res.status(200).json({ ok: true, url: downloadUrl, filename });
  } catch (e) {
    console.error('[store-workbook-pdf] storage error:', e);
    return res.status(500).json({ error: safeError('store-workbook-pdf', e, 'Storage upload failed.') });
  }
}
