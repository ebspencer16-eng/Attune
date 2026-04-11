/**
 * POST /api/generate-pdf
 *
 * Renders the Attune workbook as a PDF via Browserless.
 * Falls back to redirecting to the .docx generator if BROWSERLESS_TOKEN is not set.
 *
 * Body: same shape as /api/generate-workbook
 *   { userName, partnerName, scores, partnerScores, coupleType, expGaps }
 *
 * Required env vars:
 *   BROWSERLESS_TOKEN  — from app.browserless.io
 *   SITE_URL           — https://attune-relationships.com
 *
 * Optional:
 *   SUPABASE_URL + SUPABASE_SERVICE_KEY — if set, uploads PDF to storage
 *   and returns a signed URL instead of streaming the bytes
 */

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
  catch { return res.status(400).json({ error: 'Invalid JSON' }); }

  const token = process.env.BROWSERLESS_TOKEN;
  const siteUrl = process.env.SITE_URL || 'https://attune-relationships.com';

  if (!token) {
    // No renderer configured — tell the client to fall back to docx
    return res.status(503).json({ error: 'PDF renderer not configured', fallback: 'docx' });
  }

  // Build the render URL with workbook data encoded as a query param
  const payload = encodeURIComponent(JSON.stringify({
    p1: body.userName || 'Partner A',
    p2: body.partnerName || 'Partner B',
    ct: body.coupleType?.name || '',
    ctTagline: body.coupleType?.tagline || '',
    ctColor: body.coupleType?.color || '#E8673A',
    scores: body.scores || {},
    partnerScores: body.partnerScores || {},
    expGaps: body.expGaps || [],
  }));

  const renderUrl = `${siteUrl}/workbook-render?data=${payload}`;

  try {
    const pdfRes = await fetch(
      `https://chrome.browserless.io/pdf?token=${token}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: renderUrl,
          options: {
            format: 'A4',
            printBackground: true,
            margin: { top: '0.75in', bottom: '0.75in', left: '0.75in', right: '0.75in' },
          },
          waitForSelector: '.workbook-ready',
          waitForTimeout: 8000,
        }),
      }
    );

    if (!pdfRes.ok) {
      const err = await pdfRes.text();
      console.error('[generate-pdf] Browserless error:', err);
      return res.status(502).json({ error: 'PDF render failed', detail: err });
    }

    const pdfBuffer = Buffer.from(await pdfRes.arrayBuffer());
    const p1 = (body.userName || 'Partner_A').replace(/\s+/g, '_');
    const p2 = (body.partnerName || 'Partner_B').replace(/\s+/g, '_');
    const filename = `Attune_Workbook_${p1}_and_${p2}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.status(200).send(pdfBuffer);
  } catch (e) {
    console.error('[generate-pdf] fetch error:', e);
    res.status(500).json({ error: 'PDF generation failed' });
  }
}
