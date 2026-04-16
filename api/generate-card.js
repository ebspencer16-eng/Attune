/**
 * GET /api/generate-card
 *
 * Generates a QR card for a given order. Returns a redirect to a
 * rendered card URL or, when a PDF service is available, a PDF blob.
 *
 * Query params:
 *   orderId   — order number (required)
 *   pkg       — package key: core | newlywed | anniversary | premium (required)
 *   p1        — Partner 1 name (required)
 *   p2        — Partner 2 name (optional)
 *   version   — card variant: standard | gift_printed | gift_blank (default: standard)
 *   note      — gift note text (optional, URL-encoded)
 *   from      — gift sender name (optional)
 *
 * Response:
 *   In preview mode (no PDF_SERVICE_URL env var): redirects to /qr-card-v5 with params
 *   In production (PDF_SERVICE_URL set): proxies the PDF from the configured renderer
 *
 * Security:
 *   - CARD_SECRET env var: if set, requires ?secret=XXX to match (admin-only endpoint)
 *   - orderId and pkg are validated against known formats
 */

export const config = { runtime: 'edge' };

const PKG_KEYS = new Set(['core', 'newlywed', 'anniversary', 'premium']);
const VERSION_KEYS = new Set(['standard', 'gift_printed', 'gift_blank']);

function sanitize(s, maxLen = 100) {
  if (!s || typeof s !== 'string') return '';
  return s.trim().slice(0, maxLen);
}

export default async function handler(req) {
  if (req.method !== 'GET') return new Response('Method not allowed', { status: 405 });

  const url = new URL(req.url);
  const p = url.searchParams;

  // Optional admin secret check
  const cardSecret = process.env.CARD_SECRET;
  if (cardSecret && p.get('secret') !== cardSecret) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Validate required params
  const orderId = sanitize(p.get('orderId') || p.get('order'), 50);
  const pkg = sanitize(p.get('pkg'), 20).toLowerCase();
  const p1 = sanitize(p.get('p1'), 80);

  if (!orderId) return new Response('Missing orderId', { status: 400 });
  if (!pkg || !PKG_KEYS.has(pkg)) return new Response(`Invalid pkg. Must be: ${[...PKG_KEYS].join(', ')}`, { status: 400 });
  if (!p1) return new Response('Missing p1 (Partner 1 name)', { status: 400 });

  const p2 = sanitize(p.get('p2'), 80);
  const version = VERSION_KEYS.has(p.get('version')) ? p.get('version') : 'standard';
  const note = sanitize(p.get('note') || '', 500);
  const from = sanitize(p.get('from'), 80);

  // Build card URL params — qr-card-v5.html reads 'names' and 'token'
  const baseUrl = process.env.SITE_URL || 'https://attune-relationships.com';
  const namesStr = p2 ? `${p1} & ${p2}` : p1;
  // QR code links to the app (gift flow if applicable)
  const appUrl = version.startsWith('gift')
    ? `${baseUrl}/app?gift=1&p1=${encodeURIComponent(p1)}&p2=${encodeURIComponent(p2 || '')}&order=${encodeURIComponent(orderId)}`
    : baseUrl;
  const cardParams = new URLSearchParams({ pkg, names: namesStr, token: appUrl, version });
  if (note) cardParams.set('note', note);
  if (from) cardParams.set('from', from);
  if (orderId) cardParams.set('orderId', orderId);

  const cardUrl = `${baseUrl}/qr-card-v5?${cardParams.toString()}`;

  // Production PDF generation — if a PDF render service is configured
  const pdfServiceUrl = process.env.PDF_SERVICE_URL;
  if (pdfServiceUrl) {
    try {
      const renderUrl = `${pdfServiceUrl}/render?url=${encodeURIComponent(cardUrl)}&format=pdf&width=700&height=500&waitFor=.card-ready`;
      const pdfRes = await fetch(renderUrl, {
        headers: { 'Authorization': `Bearer ${process.env.PDF_SERVICE_KEY || ''}` },
      });
      if (!pdfRes.ok) throw new Error(`PDF render failed: ${pdfRes.status}`);
      const pdfBuffer = await pdfRes.arrayBuffer();
      const filename = `attune-card-${orderId}-${pkg}.pdf`;
      return new Response(pdfBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Cache-Control': 'no-store',
        },
      });
    } catch (err) {
      console.error('[generate-card] PDF render error:', err);
      // Fall through to redirect on error
    }
  }

  // Preview / fallback: redirect to the card HTML directly
  return Response.redirect(cardUrl, 302);
}
