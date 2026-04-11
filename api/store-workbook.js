/**
 * POST /api/store-workbook
 *
 * Generates the personalized workbook as a .docx, uploads it to
 * Supabase Storage, and returns a signed download URL valid for 7 days.
 *
 * Called automatically when both partners complete exercises.
 * Also callable from the admin dashboard to regenerate.
 *
 * Body: { userName, partnerName, scores, partnerScores, coupleType, expGaps, orderId? }
 *
 * Returns: { ok, url, filename }
 */

import fetch from 'node-fetch';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
  catch { return res.status(400).json({ error: 'Invalid JSON' }); }

  const supabaseUrl  = process.env.SUPABASE_URL;
  const serviceKey   = process.env.SUPABASE_SERVICE_KEY;

  // Generate the docx by calling the existing workbook generator
  let docxBuffer;
  const siteUrl = process.env.SITE_URL || 'https://attune-relationships.com';
  try {
    const genRes = await fetch(`${siteUrl}/api/generate-workbook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!genRes.ok) throw new Error(`Workbook generation failed: ${genRes.status}`);
    const arrayBuf = await genRes.arrayBuffer();
    docxBuffer = Buffer.from(arrayBuf);
  } catch (e) {
    console.error('[store-workbook] generation error:', e);
    return res.status(502).json({ error: 'Workbook generation failed', detail: e.message });
  }

  const p1 = (body.userName || 'PartnerA').replace(/\s+/g, '_');
  const p2 = (body.partnerName || 'PartnerB').replace(/\s+/g, '_');
  const orderId = body.orderId || `${p1}_${p2}_${Date.now()}`;
  const filename = `Attune_Workbook_${p1}_and_${p2}.docx`;
  const storagePath = `workbooks/${orderId}/${filename}`;

  if (!supabaseUrl || !serviceKey) {
    // No Supabase — return the docx directly as base64 with a data URL
    console.warn('[store-workbook] No Supabase configured — returning base64');
    return res.status(200).json({
      ok: true,
      filename,
      base64: docxBuffer.toString('base64'),
      contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
  }

  // Upload to Supabase Storage
  try {
    const uploadRes = await fetch(
      `${supabaseUrl}/storage/v1/object/workbooks/${orderId}/${encodeURIComponent(filename)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
          'x-upsert': 'true',
        },
        body: docxBuffer,
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
    return res.status(500).json({ error: 'Storage upload failed', detail: e.message });
  }
}
