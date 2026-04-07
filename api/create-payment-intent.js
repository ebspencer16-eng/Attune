/**
 * POST /api/create-payment-intent
 *
 * Creates a Stripe PaymentIntent for the given package + addon.
 * Returns { clientSecret } to the frontend.
 *
 * Required env vars:
 *   STRIPE_SECRET_KEY  — sk_live_... or sk_test_...
 */

export const config = { runtime: 'edge' };

const PRICES = {
  core:        89,
  newlywed:   154,
  anniversary: 174,
  premium:    350,
};

const ADDON_PRICES = {
  digital: 19,
  print:   39,
  lmft:   150,  // LMFT session add-on
};

// Digital-only prices for newlywed and anniversary
const DIGITAL_PRICES = {
  newlywed:   109,
  anniversary: 129,
};

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return new Response(JSON.stringify({ error: 'Stripe not configured' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }

  let body;
  try { body = await req.json(); }
  catch { return new Response('Invalid JSON', { status: 400 }); }

  // Support both field naming conventions
  const pkgKey       = body.pkgKey || body.pkg;
  const addonWorkbook = body.addonWorkbook || null;
  const addonLmft    = body.addonLmft || false;
  const buyerEmail   = body.buyerEmail || body.email || null;
  const buyerName    = body.buyerName || body.partner1Name || null;
  const partner1Name = body.partner1Name || null;
  const partner2Name = body.partner2Name || null;
  const giftNote     = body.giftNote || null;
  const isGift       = body.isGift || false;
  const isPhysical   = body.isPhysical || false;
  const orderNum     = body.orderNum || null;
  const promoCode    = body.promoCode || null;

  // Valid promo codes — promo orders bypass Stripe
  const DEMO_CODES = ['ATTUNE-BETA-FEEDBACK'];
  if (promoCode && DEMO_CODES.includes(promoCode.toUpperCase())) {
    return new Response(JSON.stringify({ free: true, promoCode }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });
  }

  const basePrice = PRICES[pkgKey];
  if (!basePrice) {
    return new Response(JSON.stringify({ error: 'Invalid package' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    });
  }

  // Use digital price for newlywed/anniversary when not physical
  const effectiveBase = (!isPhysical && DIGITAL_PRICES[pkgKey])
    ? DIGITAL_PRICES[pkgKey]
    : basePrice;

  const addonWorkbookPrice = ADDON_PRICES[addonWorkbook] || 0;
  const addonLmftPrice     = addonLmft ? ADDON_PRICES.lmft : 0;
  const totalCents  = (effectiveBase + addonWorkbookPrice + addonLmftPrice) * 100; // Stripe uses cents

  const payload = new URLSearchParams({
    amount:   totalCents,
    currency: 'usd',
    'automatic_payment_methods[enabled]': 'true',
    'metadata[pkgKey]':       pkgKey,
    'metadata[orderNum]':     orderNum || '',
    'metadata[buyerName]':    buyerName || '',
    'metadata[partner1Name]': partner1Name || '',
    'metadata[partner2Name]': partner2Name || '',
    'metadata[addonWorkbook]': addonWorkbook || '',
    'metadata[addonLmft]':    addonLmft ? '1' : '',
    'metadata[isGift]':       isGift ? '1' : '',
    'metadata[isPhysical]':   isPhysical ? '1' : '',
    'metadata[giftNote]':     (giftNote || '').slice(0, 500),
  });

  if (buyerEmail) {
    payload.append('receipt_email', buyerEmail);
  }

  try {
    const res = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: payload.toString(),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('Stripe error:', data);
      return new Response(JSON.stringify({ error: data.error?.message || 'Stripe error' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ clientSecret: data.client_secret }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('Payment intent creation failed:', err);
    return new Response(JSON.stringify({ error: 'Payment service unavailable' }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}
