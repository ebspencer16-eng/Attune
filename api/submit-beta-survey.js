/**
 * POST /api/submit-beta-survey
 *
 * Receives beta survey submissions from /feedback.html.
 * Stores in Supabase feedback_submissions and emails admin.
 */
export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  let body;
  try { body = await req.json(); } catch { return new Response('Invalid JSON', { status: 400 }); }

  // Store in Supabase
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (supabaseUrl && serviceKey) {
    await fetch(`${supabaseUrl}/rest/v1/feedback_submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        type: 'beta_survey',
        text: JSON.stringify(body),
        email: body.email || null,
        couple_type: body.coupleType || null,
        source: 'feedback_page',
        submitted_at: new Date().toISOString(),
      }),
    }).catch(e => console.warn('[survey] supabase write failed:', e));
  }

  // Email admin summary
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.FROM_EMAIL || 'hello@attune-relationships.com';
  if (apiKey) {
    const rows = Object.entries(body)
      .filter(([k]) => !['email','coupleType'].includes(k))
      .map(([k, v]) => `<tr><td style="padding:.5rem .75rem;font-weight:600;background:#F5F0EC;border-bottom:1px solid #E8DDD0;font-family:Arial,sans-serif;font-size:.82rem;white-space:nowrap">${k}</td><td style="padding:.5rem .75rem;font-family:Arial,sans-serif;font-size:.82rem;border-bottom:1px solid #E8DDD0">${Array.isArray(v) ? v.join(', ') : v}</td></tr>`)
      .join('');
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: `Attune <${fromEmail}>`,
        to: [fromEmail],
        subject: `Beta survey response${body.coupleType ? ` — ${body.coupleType}` : ''}`,
        html: `<div style="font-family:Arial,sans-serif;max-width:520px;padding:1.5rem"><h2 style="color:#E8673A;margin:0 0 1rem">Beta survey response</h2><table style="width:100%;border-collapse:collapse">${rows}</table></div>`,
      }),
    }).catch(e => console.warn('[survey] admin email failed:', e));
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200, headers: { 'Content-Type': 'application/json' }
  });
}
