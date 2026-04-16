/**
 * GET /api/generate-card
 * Generates a QR card redirect for a given order.
 *
 * Required: orderId, pkg, p1
 * Optional: p2, version, note, from, secret
 *
 * Security: if CARD_SECRET env var is set, ?secret must match.
 */

export const config = { runtime: 'edge' };

const VALID_PKGS = new Set(['core', 'newlywed', 'anniversary', 'premium']);
const VALID_VERSIONS = new Set(['standard', 'gift_printed', 'gift_blank']);

function clean(s, max = 100) {
  return (s && typeof s === 'string') ? s.trim().slice(0, max) : '';
}

export default async function handler(req) {
  try {
    if (req.method !== 'GET') {
      return new Response('Method not allowed', { status: 405 });
    }

    const { searchParams } = new URL(req.url);

    // Secret gate
    const secret = process.env.CARD_SECRET;
    if (secret && searchParams.get('secret') !== secret) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Parse params
    const orderId = clean(searchParams.get('orderId') || searchParams.get('order'), 50);
    const pkg     = clean(searchParams.get('pkg'), 20).toLowerCase();
    const p1      = clean(searchParams.get('p1'), 80);
    const p2      = clean(searchParams.get('p2'), 80);
    const version = VALID_VERSIONS.has(searchParams.get('version'))
                      ? searchParams.get('version') : 'standard';
    const note    = clean(searchParams.get('note'), 500);
    const from    = clean(searchParams.get('from'), 80);

    // Validate
    if (!orderId) return new Response('Missing orderId', { status: 400 });
    if (!VALID_PKGS.has(pkg)) return new Response('Invalid pkg', { status: 400 });
    if (!p1) return new Response('Missing p1', { status: 400 });

    const base = process.env.SITE_URL || 'https://attune-relationships.com';
    const names = p2 ? `${p1} & ${p2}` : p1;
    const appUrl = version.startsWith('gift')
      ? `${base}/app?gift=1&p1=${encodeURIComponent(p1)}&p2=${encodeURIComponent(p2)}&order=${encodeURIComponent(orderId)}`
      : base;

    const qs = new URLSearchParams({ pkg, names, token: appUrl, version, orderId });
    if (note) qs.set('note', note);
    if (from) qs.set('from', from);

    const cardUrl = `${base}/qr-card-v5?${qs.toString()}`;

    // Production: render as PDF if PDF_SERVICE_URL is configured
    const pdfService = process.env.PDF_SERVICE_URL;
    if (pdfService) {
      const renderUrl = `${pdfService}/render?url=${encodeURIComponent(cardUrl)}&format=pdf&width=700&height=500&waitFor=.card-ready`;
      const pdfRes = await fetch(renderUrl, {
        headers: { 'Authorization': `Bearer ${process.env.PDF_SERVICE_KEY || ''}` },
      });
      if (pdfRes.ok) {
        const buf = await pdfRes.arrayBuffer();
        return new Response(buf, {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="attune-card-${orderId}.pdf"`,
            'Cache-Control': 'no-store',
          },
        });
      }
    }

    // Fallback: redirect to card HTML
    return new Response(null, {
      status: 302,
      headers: { Location: cardUrl },
    });

  } catch (err) {
    console.error('[generate-card] error:', err);
    return new Response('Internal error: ' + err.message, { status: 500 });
  }
}
