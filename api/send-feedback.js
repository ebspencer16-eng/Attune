/**
 * Vercel Serverless Function: /api/send-feedback
 *
 * Receives feedback from:
 *   1. Footer "Love it / Pretty good / Suggest something" buttons (all pages)
 *   2. End-of-experience questionnaire in the app (App.jsx)
 *
 * Sends a formatted email to SUPPORT_EMAIL and stores in Vercel KV for analytics.
 *
 * Required env vars:
 *   RESEND_API_KEY
 *   FROM_EMAIL       — e.g. hello@attune-relationships.com
 *   SUPPORT_EMAIL    — where feedback lands
 *
 * Optional (for analytics storage):
 *   KV_REST_API_URL  — Vercel KV endpoint
 *   KV_REST_API_TOKEN — Vercel KV token
 */

export const config = { runtime: 'edge' };

// Also write to Supabase for richer analytics
async function supabaseStore(entry) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) return;
  try {
    await fetch(`${url}/rest/v1/feedback_submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        type: entry.type || 'quick',
        rating: entry.rating || null,
        text: entry.text || null,
        email: entry.email || null,
        couple_type: entry.coupleType || null,
        source: entry.source || null,
        submitted_at: new Date().toISOString(),
      }),
    });
  } catch(e) { console.warn('[feedback] supabase write failed:', e); }
}

async function kvStore(key, value) {
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  if (!url || !token) return;
  try {
    await fetch(`${url}/lpush/${key}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(value),
    });
  } catch (e) { console.warn('KV store failed:', e); }
}

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  let body;
  try { body = await req.json(); }
  catch { return new Response('Invalid JSON', { status: 400 }); }

  const {
    source,       // 'footer_quick' | 'app_experience'
    rating,       // 0-3 for quick, 0-3 for app
    message,      // free-text (suggestion or open answer)
    page,         // pathname for footer_quick
    pkgType,
    exercisesComplete,
    alignmentLevel,
    stage,
    howHeard,
    questionAnswers,
  } = body;

  const ts = new Date().toISOString();

  // Store in Vercel KV for analytics
  const record = { source, rating, message, page, pkgType, exercisesComplete,
    alignmentLevel, stage, howHeard, questionAnswers, ts };
  await kvStore('attune:feedback', JSON.stringify(record));

  // Also track quick-feedback counts separately for easy retrieval
  if (source === 'footer_quick') {
    const ratingKey = rating === 3 ? 'love' : rating === 2 ? 'good' : 'suggest';
    await kvStore(`attune:feedback:${ratingKey}`, JSON.stringify({ page, message, ts }));
    const url = process.env.KV_REST_API_URL;
    const token = process.env.KV_REST_API_TOKEN;
    if (url && token) {
      try {
        await fetch(`${url}/incr/attune:count:${ratingKey}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        await fetch(`${url}/incr/attune:count:total`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch(e) {}
    }
  }

  const apiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.SUPPORT_EMAIL || process.env.FROM_EMAIL || 'hello@attune-relationships.com';
  const fromEmail = process.env.FROM_EMAIL || 'hello@attune-relationships.com';

  if (!apiKey) {
    console.log('Feedback (no email service):', body);
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  }

  const ratingLabels = ['Not great', 'It was okay', 'Pretty good', 'Loved it'];
  const ratingLabel = typeof rating === 'number' ? (ratingLabels[rating] || 'N/A') : rating || 'N/A';
  const subject = source === 'footer_quick'
    ? `Attune quick feedback: ${ratingLabel}${page ? ` · ${page}` : ''}`
    : `Attune experience feedback: ${ratingLabel}${pkgType ? ` · ${pkgType}` : ''}`;

  const contextRows = [
    source === 'footer_quick' && page && `<tr><td>Page</td><td>${page}</td></tr>`,
    pkgType           && `<tr><td>Package</td><td>${pkgType}</td></tr>`,
    exercisesComplete !== undefined && `<tr><td>Exercises complete</td><td>${exercisesComplete} of 3</td></tr>`,
    alignmentLevel    && `<tr><td>Alignment level</td><td>${alignmentLevel}</td></tr>`,
    stage             && `<tr><td>Relationship stage</td><td>${stage}</td></tr>`,
    howHeard          && `<tr><td>How they heard</td><td>${howHeard}</td></tr>`,
  ].filter(Boolean).join('');

  const qRows = questionAnswers
    ? Object.entries(questionAnswers).map(([k,v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('')
    : '';

  const tdStyle = 'padding:.6rem .85rem;border:1px solid #E8DDD0;';
  const thStyle = tdStyle + 'font-weight:700;width:160px;';

  const html = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:1.5rem;color:#1E1610">
    <h2 style="color:#E8673A;margin-bottom:1rem">Attune Feedback</h2>
    <table style="border-collapse:collapse;width:100%;margin-bottom:1.5rem">
      <tr style="background:#FBF8F3"><td style="${thStyle}">Source</td><td style="${tdStyle}">${source}</td></tr>
      <tr><td style="${thStyle}">Rating</td><td style="${tdStyle}">${ratingLabel}</td></tr>
      ${message ? `<tr style="background:#FBF8F3"><td style="${thStyle}">Message</td><td style="${tdStyle}">${message}</td></tr>` : ''}
    </table>
    ${contextRows ? `<h3 style="color:#8C7A68;font-size:.85rem;letter-spacing:.1em;text-transform:uppercase;margin-bottom:.75rem">Context</h3>
    <table style="border-collapse:collapse;width:100%;margin-bottom:1.5rem">
      ${contextRows.replace(/<tr>/g,'<tr style="background:#FBF8F3">').replace(/<td>/g,`<td style="${tdStyle}">`)}
    </table>` : ''}
    ${qRows ? `<h3 style="color:#8C7A68;font-size:.85rem;letter-spacing:.1em;text-transform:uppercase;margin-bottom:.75rem">Questionnaire</h3>
    <table style="border-collapse:collapse;width:100%">
      ${qRows.replace(/<td>/g,`<td style="${tdStyle}">`)}
    </table>` : ''}
    <p style="color:#C17F47;font-size:.75rem;margin-top:1.5rem">Submitted at ${ts}</p>
  </body></html>`;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: `Attune Feedback <${fromEmail}>`, to: [toEmail], subject, html }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data));
  } catch (err) {
    console.error('Feedback email failed:', err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 500 });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
