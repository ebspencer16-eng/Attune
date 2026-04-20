/**
 * POST /api/create-payment-intent
 *
 * Creates a Stripe PaymentIntent for the given cart. Supports both the
 * legacy single-item payload and the new multi-item payload (body.items[]).
 *
 * For promo-code free checkouts, skips Stripe and writes orders directly
 * to Supabase (one row per cart item, each with its own qr_token).
 *
 * Required env vars:
 *   STRIPE_SECRET_KEY        — sk_live_... or sk_test_...
 *   SUPABASE_URL             — for promo order writes + code validation
 *   SUPABASE_SERVICE_ROLE    — service-role secret for Supabase writes
 */

export const config = { runtime: 'edge' };

// Canonical pricing — kept in sync with checkout.html PACKAGES.
const DIGITAL_PRICES  = { core: 89,  newlywed: 139, anniversary: 139, premium: 295 };
const PHYSICAL_PRICES = { core: 124, newlywed: 174, anniversary: 174, premium: 330 };

const ADDON_PRICES = {
  workbookDigital: 19,
  workbookPrint:   39,
  lmft:           150,
  reflection:      40,
  budget:          20,
  checklist:       20,
};

function newQrToken() {
  // ATQR-<12 hex chars>, unguessable per-order token for physical QR card.
  return 'ATQR-' + Array.from(crypto.getRandomValues(new Uint8Array(6)))
    .map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
}

function itemSubtotal(item) {
  const base = item.isPhysical
    ? (PHYSICAL_PRICES[item.pkgKey] ?? 0)
    : (DIGITAL_PRICES[item.pkgKey]  ?? 0);
  let addons = 0;
  if (item.addonWorkbook === 'print')   addons += ADDON_PRICES.workbookPrint;
  if (item.addonWorkbook === 'digital') addons += ADDON_PRICES.workbookDigital;
  if (item.addonLmft)       addons += ADDON_PRICES.lmft;
  if (item.addonReflection) addons += ADDON_PRICES.reflection;
  if (item.addonBudget)     addons += ADDON_PRICES.budget;
  if (item.addonChecklist)  addons += ADDON_PRICES.checklist;
  return base + addons;
}

function normalizeItem(item) {
  return {
    pkgKey:          item.pkgKey || item.pkg,
    isPhysical:      !!item.isPhysical || item.format === 'physical',
    isGift:          !!item.isGift,
    partner1Name:    item.partner1Name || null,
    partner2Name:    item.partner2Name || null,
    giftNote:        item.giftNote || null,
    addonWorkbook:   item.addonWorkbook || null,     // 'digital' | 'print' | null
    addonLmft:       !!item.addonLmft,
    addonReflection: !!item.addonReflection,
    addonBudget:     !!item.addonBudget,
    addonChecklist:  !!item.addonChecklist,
    shipping:        item.shipping || null,
  };
}

async function writeOrderRow(supabaseUrl, serviceKey, row) {
  return fetch(`${supabaseUrl}/rest/v1/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(row),
  });
}

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

  // New payload shape: body.items = [{pkgKey, isPhysical, ...}, ...]
  // Legacy shape: top-level fields; wrap as [item].
  const rawItems = Array.isArray(body.items) && body.items.length
    ? body.items
    : [{
        pkgKey:          body.pkgKey || body.pkg,
        isPhysical:      !!body.isPhysical,
        isGift:          !!body.isGift,
        partner1Name:    body.partner1Name,
        partner2Name:    body.partner2Name,
        giftNote:        body.giftNote,
        addonWorkbook:   body.addonWorkbook,
        addonLmft:       body.addonLmft,
        addonReflection: body.addonReflection,
        addonBudget:     body.addonBudget,
        addonChecklist:  body.addonChecklist,
        shipping:        body.shipping,
      }];

  const items = rawItems.map(normalizeItem);

  // Validate every item has a valid package
  for (const it of items) {
    if (!DIGITAL_PRICES[it.pkgKey]) {
      return new Response(JSON.stringify({ error: `Invalid package: ${it.pkgKey}` }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  const buyerEmail = body.buyerEmail || body.email || null;
  const buyerName  = body.buyerName  || items[0]?.partner1Name || null;
  const promoCode  = body.promoCode || null;
  const orderNum   = body.orderNum  || null;

  const supabaseUrl        = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;

  // ── Promo code path ────────────────────────────────────────────────────
  const BETA_CODES = {
    'BETA-CORE':        'core',
    'BETA-NEWLYWED':    'newlywed',
    'BETA-ANNIVERSARY': 'anniversary',
    'BETA-PREMIUM':     'premium',
    'ATTUNE-BETA-FEEDBACK': '*',
  };

  if (promoCode) {
    const normalizedCode = promoCode.toUpperCase().trim();
    const codeUnlocks = BETA_CODES[normalizedCode];

    if (!codeUnlocks) {
      return new Response(JSON.stringify({ error: 'Invalid promo code' }), {
        status: 400, headers: { 'Content-Type': 'application/json' }
      });
    }

    // Every item in a multi-item cart must match the code (else reject — the
    // mixed free + paid flow is out of scope).
    if (codeUnlocks !== '*') {
      const mismatched = items.find(it => it.pkgKey !== codeUnlocks);
      if (mismatched) {
        const unlocksName = {
          core: 'The Attune Assessment',
          newlywed: 'Starting Out Collection',
          anniversary: 'Relationship Reflection',
          premium: 'Attune Premium',
        }[codeUnlocks] || codeUnlocks;
        return new Response(JSON.stringify({
          error: `This code only unlocks ${unlocksName}. Remove other packages from your cart or use a matching code.`
        }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }
    }

    if (supabaseUrl && supabaseServiceKey) {
      // Check code is active + increment uses
      try {
        const checkRes = await fetch(
          `${supabaseUrl}/rest/v1/beta_codes?code=eq.${encodeURIComponent(normalizedCode)}&select=active,uses_count`,
          { headers: { apikey: supabaseServiceKey, Authorization: `Bearer ${supabaseServiceKey}` } }
        );
        const rows = await checkRes.json();
        if (Array.isArray(rows) && rows.length > 0 && rows[0].active === false) {
          return new Response(JSON.stringify({ error: 'This promo code has been deactivated.' }), {
            status: 400, headers: { 'Content-Type': 'application/json' }
          });
        }
        const currentUses = rows[0]?.uses_count ?? 0;
        await fetch(
          `${supabaseUrl}/rest/v1/beta_codes?on_conflict=code`,
          {
            method: 'POST',
            headers: {
              apikey: supabaseServiceKey,
              Authorization: `Bearer ${supabaseServiceKey}`,
              'Content-Type': 'application/json',
              Prefer: 'resolution=merge-duplicates',
            },
            body: JSON.stringify({
              code: normalizedCode,
              package_key: codeUnlocks,
              uses_count: currentUses + items.length,
              active: true,
              last_used_at: new Date().toISOString(),
              last_used_by: buyerEmail || null,
            }),
          }
        );
      } catch (e) {
        console.warn('[promo] supabase tracking failed (non-blocking):', e);
      }

      // Write one order row per item. Free-promo orders skip Stripe's
      // webhook, so this is the only place they get recorded.
      try {
        const d = new Date();
        const dateStr = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const suffix = items.length > 1 ? `-${i+1}` : '';
          const generatedOrderNum = orderNum
            ? `${orderNum}${suffix}`
            : `ATT-${dateStr}-PR${Math.random().toString(36).substring(2,5).toUpperCase()}${suffix}`;
          await writeOrderRow(supabaseUrl, supabaseServiceKey, {
            order_num:         generatedOrderNum,
            buyer_name:        buyerName || item.partner1Name || null,
            buyer_email:       buyerEmail || null,
            partner1_name:     item.partner1Name || null,
            partner2_name:     item.partner2Name || null,
            pkg_key:           item.pkgKey || null,
            is_gift:           item.isGift,
            is_physical:       item.isPhysical,
            total:             0,
            addon_workbook:    item.addonWorkbook || null,
            addon_lmft:        item.addonLmft,
            addon_reflection:  item.addonReflection,
            addon_budget:      item.addonBudget,
            gift_note:         item.giftNote || null,
            stripe_payment_intent_id: `promo_${normalizedCode}_${Date.now()}_${i}`,
            promo_code:        normalizedCode,
            qr_token:          newQrToken(),
            shipping_name:     item.shipping?.name || null,
            shipping_address:  item.shipping?.address || null,
            shipping_city:     item.shipping?.city || null,
            shipping_state:    item.shipping?.state || null,
          });
        }
      } catch (e) {
        console.warn('[promo] order writes failed (non-blocking):', e);
      }
    }

    return new Response(JSON.stringify({
      free: true,
      promoCode: promoCode.toUpperCase().trim(),
      itemCount: items.length,
    }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });
  }

  // ── Paid checkout via Stripe ────────────────────────────────────────────
  const totalDollars = items.reduce((sum, it) => sum + itemSubtotal(it), 0);
  if (totalDollars <= 0) {
    return new Response(JSON.stringify({ error: 'Empty cart' }), {
      status: 400, headers: { 'Content-Type': 'application/json' }
    });
  }

  // Compact items metadata for the webhook. Each item is serialized as a
  // short object. Stripe caps metadata values at 500 chars per key, so we
  // chunk long payloads across numbered keys (items0, items1, ...).
  const compactItems = items.map(it => ({
    p:   it.pkgKey,
    ph:  it.isPhysical ? 1 : 0,
    g:   it.isGift ? 1 : 0,
    p1:  (it.partner1Name || '').slice(0, 40),
    p2:  (it.partner2Name || '').slice(0, 40),
    gn:  (it.giftNote || '').slice(0, 200),
    w:   it.addonWorkbook || '',
    l:   it.addonLmft ? 1 : 0,
    r:   it.addonReflection ? 1 : 0,
    b:   it.addonBudget ? 1 : 0,
    c:   it.addonChecklist ? 1 : 0,
    s:   it.shipping ? [it.shipping.name, it.shipping.address, it.shipping.city, it.shipping.state].join('|').slice(0, 200) : '',
  }));

  const itemsJson = JSON.stringify(compactItems);

  const payload = new URLSearchParams({
    amount:   String(totalDollars * 100),
    currency: 'usd',
    'automatic_payment_methods[enabled]': 'true',
    'metadata[itemCount]':    String(items.length),
    'metadata[orderNum]':     orderNum || '',
    'metadata[buyerName]':    buyerName || '',
    // First-item mirror for legacy webhook parsing
    'metadata[pkgKey]':       items[0].pkgKey,
    'metadata[partner1Name]': items[0].partner1Name || '',
    'metadata[partner2Name]': items[0].partner2Name || '',
    'metadata[isGift]':       items[0].isGift ? '1' : '',
    'metadata[isPhysical]':   items[0].isPhysical ? '1' : '',
    'metadata[addonWorkbook]':items[0].addonWorkbook || '',
    'metadata[addonLmft]':    items[0].addonLmft ? '1' : '',
    'metadata[addonReflection]':items[0].addonReflection ? '1' : '',
    'metadata[addonBudget]':  items[0].addonBudget ? '1' : '',
    'metadata[giftNote]':     (items[0].giftNote || '').slice(0, 500),
  });

  // Split items JSON across keys if needed
  const chunkSize = 480;
  if (itemsJson.length <= chunkSize) {
    payload.append('metadata[items]', itemsJson);
  } else {
    let idx = 0;
    for (let i = 0; i < itemsJson.length; i += chunkSize) {
      payload.append(`metadata[items${idx}]`, itemsJson.slice(i, i + chunkSize));
      idx++;
    }
    payload.append('metadata[itemsChunks]', String(idx));
  }

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
