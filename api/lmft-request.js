/**
 * POST /api/lmft-request
 *
 * DEPRECATED: kept for backward compatibility. The current LMFT scheduling flow
 * uses Calendly via /api/calendly-webhook — see LMFT_SETUP.md.
 *
 * This endpoint receives requests from the *old* /lmft-booking form (which has
 * been replaced with the Calendly embed). Any request that lands here is from
 * a stale link or external integration. We still write the row so the admin
 * sees it as a legacy/pending request.
 */
export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  
  let body;
  try { body = await req.json(); } catch { return new Response('Invalid JSON', { status: 400 }); }

  const { p1name, p2name, email, tz, availability, notes, orderId, requestedAt } = body;
  if (!p1name || !email) return new Response('Missing required fields', { status: 400 });

  // Email notification to admin
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.FROM_EMAIL || 'hello@attune-relationships.com';

  if (apiKey) {
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:520px;padding:1.5rem;color:#0E0B07">
        <h2 style="color:#1B5FE8;margin:0 0 1rem">New LMFT session request</h2>
        <table style="width:100%;border-collapse:collapse;font-size:.88rem">
          ${[
            ['Partners', `${p1name}${p2name ? ` + ${p2name}` : ''}`],
            ['Email', email],
            ['Timezone', tz || '—'],
            ['Order', orderId || '—'],
            ['Requested at', requestedAt ? new Date(requestedAt).toLocaleString() : '—'],
          ].map(([k,v]) => `<tr><td style="padding:.5rem .75rem;background:#F5F0EC;font-weight:700;border-bottom:1px solid #E8DDD0;white-space:nowrap">${k}</td><td style="padding:.5rem .75rem;border-bottom:1px solid #E8DDD0">${v}</td></tr>`).join('')}
        </table>
        ${availability ? `<p style="margin:.75rem 0 .25rem;font-weight:700;font-size:.82rem">Availability:</p><p style="font-size:.82rem;color:#5C4D3C">${availability}</p>` : ''}
        ${notes ? `<p style="margin:.75rem 0 .25rem;font-weight:700;font-size:.82rem">Notes:</p><p style="font-size:.82rem;color:#5C4D3C">${notes}</p>` : ''}
      </div>`;

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: `Attune <${fromEmail}>`,
        to: [fromEmail],
        subject: `LMFT session request — ${p1name}${p2name ? ` + ${p2name}` : ''}`,
        html,
      }),
    }).catch(e => console.warn('[lmft-request] admin email failed:', e));
  }

  // Store in Supabase if available
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (supabaseUrl && serviceKey) {
    await fetch(`${supabaseUrl}/rest/v1/lmft_requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ p1_name: p1name, p2_name: p2name || null, email, timezone: tz || null, availability: availability || null, notes: notes || null, order_id: orderId || null }),
    }).catch(e => console.warn('[lmft-request] supabase write failed:', e));
  }

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}
