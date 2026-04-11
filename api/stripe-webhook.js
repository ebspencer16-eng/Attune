/**
 * POST /api/stripe-webhook
 *
 * Receives Stripe event notifications. Verifies the signature,
 * then handles payment_intent.succeeded and payment_intent.payment_failed.
 *
 * Required env vars:
 *   STRIPE_SECRET_KEY
 *   STRIPE_WEBHOOK_SECRET  — whsec_... from Stripe dashboard
 *
 * Optional:
 *   RESEND_API_KEY + FROM_EMAIL  — to trigger confirmation emails on success
 */

export const config = { runtime: 'edge' };

async function verifyStripeSignature(body, signature, secret) {
  // Stripe webhook signature format: t=timestamp,v1=hash
  const parts = signature.split(',');
  const t     = parts.find(p => p.startsWith('t='))?.slice(2);
  const v1    = parts.find(p => p.startsWith('v1='))?.slice(3);
  if (!t || !v1) return false;

  const signedPayload = `${t}.${body}`;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(signedPayload));
  const computed = Array.from(new Uint8Array(sig))
    .map(b => b.toString(16).padStart(2, '0')).join('');

  return computed === v1;
}

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const secretKey     = process.env.STRIPE_SECRET_KEY;

  const rawBody  = await req.text();
  const sig      = req.headers.get('stripe-signature');

  // Verify signature if we have the secret
  if (webhookSecret && sig) {
    const valid = await verifyStripeSignature(rawBody, sig, webhookSecret);
    if (!valid) {
      console.error('Invalid Stripe webhook signature');
      return new Response('Invalid signature', { status: 400 });
    }
  }

  let event;
  try { event = JSON.parse(rawBody); }
  catch { return new Response('Invalid JSON', { status: 400 }); }

  const intent = event.data?.object;
  const meta   = intent?.metadata || {};

  // ── payment_intent.succeeded ───────────────────────────────────────────────
  if (event.type === 'payment_intent.succeeded') {
    console.log(`Payment succeeded: ${intent.id} — ${intent.amount / 100} ${intent.currency.toUpperCase()} — ${meta.pkgKey || '?'}`);

    // Create order record in Supabase
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey  = process.env.SUPABASE_SERVICE_KEY;
    if (supabaseUrl && serviceKey) {
      try {
        const d = new Date();
        const orderNum = meta.orderNum || `ATT-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}-${Math.random().toString(36).substring(2,6).toUpperCase()}`;
        await fetch(`${supabaseUrl}/rest/v1/orders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': serviceKey,
            'Authorization': `Bearer ${serviceKey}`,
            'Prefer': 'return=minimal',
          },
          body: JSON.stringify({
            order_num:               orderNum,
            buyer_name:              meta.buyerName || meta.partner1Name || null,
            buyer_email:             intent.receipt_email || null,
            partner1_name:           meta.partner1Name || null,
            partner2_name:           meta.partner2Name || null,
            pkg_key:                 meta.pkgKey || null,
            is_gift:                 meta.isGift === '1',
            is_physical:             meta.isPhysical === '1',
            total:                   (intent.amount / 100),
            addon_workbook:          meta.addonWorkbook || null,
            addon_lmft:              meta.addonLmft === '1',
            addon_reflection:        meta.addonReflection === '1',
            gift_note:               meta.giftNote || null,
            stripe_payment_intent_id: intent.id,
            workbook_status:         'pending',
          }),
        });
        console.log(`[webhook] order created: ${orderNum}`);
      } catch(e) {
        console.error('[webhook] order creation failed:', e);
      }
    }

    // Fire confirmation email if Resend is configured
    const apiKey    = process.env.RESEND_API_KEY;
    const fromEmail = process.env.FROM_EMAIL || 'hello@attune-relationships.com';
    const baseUrl   = process.env.SITE_URL || 'https://attune-relationships.com';

    if (apiKey && intent.receipt_email) {
      // Order confirmation
      const subject = `Order confirmed — ${meta.pkgKey || 'Attune'}`;
      const html = `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:2rem;color:#1E1610;">
          <h2 style="color:#E8673A;margin-bottom:1rem;">Your order is confirmed.</h2>
          <p style="margin-bottom:.75rem;">Hi ${meta.buyerName || 'there'},</p>
          <p style="margin-bottom:.75rem;">Your Attune order has been received and payment confirmed.</p>
          <table style="border-collapse:collapse;width:100%;margin:1.25rem 0;border:1px solid #E8DDD0;">
            <tr style="background:#FBF8F3;">
              <td style="padding:.65rem 1rem;font-weight:700;border-bottom:1px solid #E8DDD0;">Order</td>
              <td style="padding:.65rem 1rem;border-bottom:1px solid #E8DDD0;">${meta.orderNum || intent.id}</td>
            </tr>
            <tr>
              <td style="padding:.65rem 1rem;font-weight:700;">Package</td>
              <td style="padding:.65rem 1rem;">${meta.pkgKey || '—'}</td>
            </tr>
            <tr style="background:#FBF8F3;">
              <td style="padding:.65rem 1rem;font-weight:700;">Total</td>
              <td style="padding:.65rem 1rem;">$${(intent.amount / 100).toFixed(2)}</td>
            </tr>
          </table>
          <p style="margin-bottom:.75rem;">You'll receive a separate email with your account setup link. If you don't see it within a few minutes, check your spam folder.</p>
          ${meta.addonWorkbook ? `<p style="margin-bottom:.75rem;color:#5C4D3C;">Your personalized digital workbook will be available for download in your <a href="https://attune-relationships.com/app" style="color:#E8673A;font-weight:600;">Attune dashboard</a> once both partners complete their exercises. If you have any issues, contact us at hello@attune-relationships.com.</p>` : ''}
          <p style="color:#8C7A68;font-size:.82rem;margin-top:1.5rem;">Attune Relationships · hello@attune-relationships.com</p>
        </div>
      `;

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: `Attune <${fromEmail}>`, to: [intent.receipt_email], subject, html }),
      }).catch(err => console.warn('Confirmation email failed:', err));

      // LMFT scheduling email — fires for premium pkg or when addonLmft=1
      const needsLmft = meta.pkgKey === 'premium' || meta.addonLmft === '1';
      if (needsLmft) {
        await fetch(`${baseUrl}/api/send-email`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'lmft_scheduled',
            toEmail: intent.receipt_email,
            toName: meta.buyerName || meta.partner1Name || 'there',
            partnerName: meta.partner2Name || 'your partner',
            schedulingUrl: `${baseUrl}/lmft-booking?order=${meta.orderNum || intent.id}`,
            orderNum: meta.orderNum || intent.id,
          }),
        }).catch(err => console.warn('LMFT email failed:', err));
      }

      // Auto-generate QR card for physical orders — stores URL in order record
      if (meta.isPhysical === '1') {
        const p1 = encodeURIComponent(meta.partner1Name || meta.buyerName || '');
        const p2 = encodeURIComponent(meta.partner2Name || '');
        const pkg = encodeURIComponent(meta.pkgKey || 'core');
        const orderId = encodeURIComponent(meta.orderNum || intent.id);
        const isGift = meta.isGift === '1';
        const version = isGift ? (meta.giftNote ? 'gift_printed' : 'gift_blank') : 'standard';
        const cardUrl = `${baseUrl}/qr-card-v4?pkg=${pkg}&p1=${p1}&p2=${p2}&orderId=${orderId}&version=${encodeURIComponent(version)}`;
        // Store card URL in order record for admin fulfillment
        const supabaseUrl = process.env.SUPABASE_URL;
        const serviceKey = process.env.SUPABASE_SERVICE_KEY;
        if (supabaseUrl && serviceKey && (meta.orderNum || intent.id)) {
          await fetch(`${supabaseUrl}/rest/v1/orders?order_num=eq.${encodeURIComponent(meta.orderNum || intent.id)}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'apikey': serviceKey,
              'Authorization': `Bearer ${serviceKey}`,
              'Prefer': 'return=minimal',
            },
            body: JSON.stringify({ card_url: cardUrl, card_status: 'generated' }),
          }).catch(err => console.warn('[webhook] card URL save failed:', err));
        }
      }
    }
  }

  // ── payment_intent.payment_failed ──────────────────────────────────────────
  if (event.type === 'payment_intent.payment_failed') {
    const reason = intent.last_payment_error?.message || 'unknown';
    console.error(`Payment failed: ${intent.id} — ${reason}`);
    // Nothing further to do server-side — the frontend already handles
    // showing error messages to the user via the Stripe Elements error state.
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
