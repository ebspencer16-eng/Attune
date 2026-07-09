/**
 * GET /api/cron-feedback-synthesis
 *
 * Vercel Cron — weekly (Mondays 09:15 UTC). Pulls the last 7 days of
 * feedback_submissions (live, service-role) and emails a themed synthesis to
 * the team. When ANTHROPIC_API_KEY is set it clusters the free text into
 * ranked themes; without it, it falls back to a plain grouped list so the
 * email still goes out.
 *
 * Required env: SUPABASE_URL, SUPABASE_SERVICE_KEY, RESEND_API_KEY, CRON_SECRET
 * Optional env: ANTHROPIC_API_KEY (enables theme clustering),
 *               FROM_EMAIL (default hello@attune-relationships.com),
 *               DIGEST_TO  (default buildunison@gmail.com)
 */

export const config = { runtime: 'edge' };

import { createClient } from '@supabase/supabase-js';

const esc = (s) => String(s || '').replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));

// beta_survey rows store a JSON blob in `text`; flatten it to readable lines.
function extractText(row) {
  if (!row.text) return '';
  if (row.type === 'beta_survey') {
    try {
      const o = JSON.parse(row.text);
      return Object.entries(o)
        .filter(([k, v]) => v && typeof v === 'string' && k !== 'email' && v.length > 1)
        .map(([k, v]) => `${k}: ${v}`)
        .join(' | ');
    } catch { return row.text; }
  }
  return row.text;
}

export default async function handler(req) {
  const auth = req.headers.get('authorization');
  const secret = process.env.CRON_SECRET;
  // Fail closed (see cron-beta-digest).
  if (!secret) return new Response('Cron not configured', { status: 500 });
  if (auth !== `Bearer ${secret}`) return new Response('Unauthorized', { status: 401 });

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
  const resendKey = process.env.RESEND_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const fromEmail = process.env.FROM_EMAIL || 'hello@attune-relationships.com';
  const to = process.env.DIGEST_TO || 'buildunison@gmail.com';
  if (!SUPABASE_URL || !SUPABASE_KEY || !resendKey) {
    return new Response(JSON.stringify({ error: 'Missing env vars' }), { status: 500 });
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_KEY);
  const now = new Date();
  const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);

  try {
    const { data: rows, error } = await admin
      .from('feedback_submissions')
      .select('type, rating, text, couple_type, source, submitted_at')
      .gte('submitted_at', weekAgo.toISOString())
      .order('submitted_at', { ascending: false })
      .limit(500);
    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

    const items = (rows || [])
      .map(r => ({ rating: r.rating, coupleType: r.couple_type, source: r.source, text: extractText(r) }))
      .filter(i => i.text && i.text.trim().length > 1);

    const ratings = (rows || []).map(r => r.rating).filter(n => typeof n === 'number');
    const avgRating = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : null;

    let bodyHtml;
    const header = `<p style="color:#8a7e6c;font-size:12px;margin:0 0 16px">Week ending ${now.toISOString().slice(0, 10)} · ${rows?.length || 0} submissions${avgRating ? ` · avg rating ${avgRating}/5` : ''}</p>`;

    if (items.length === 0) {
      bodyHtml = header + `<p style="color:#6a6052">No new feedback this week.</p>`;
    } else if (anthropicKey) {
      const corpus = items.map((i, n) => `${n + 1}. ${i.rating ? `[${i.rating}/5] ` : ''}${i.text}`).join('\n').slice(0, 12000);
      const prompt = `You are summarizing a week of user feedback for a couples-assessment product's internal team. Below are ${items.length} feedback items. Cluster them into themes and output concise HTML only (no preamble, no markdown fences). Use this structure:\n<h3 style="font-size:13px;color:#B8431F;margin:14px 0 4px">What's working</h3><ul>...</ul>\n<h3 ...>Confusing or frustrating</h3><ul>...</ul>\n<h3 ...>Bugs / broken</h3><ul>...</ul>\n<h3 ...>Feature requests</h3><ul>...</ul>\nEach <li> is one theme in plain language with a rough count in parentheses, most frequent first. Omit any section with nothing in it. Keep it tight.\n\nFEEDBACK:\n${corpus}`;
      try {
        const resp = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01' },
          body: JSON.stringify({ model: 'claude-sonnet-5', max_tokens: 1500, messages: [{ role: 'user', content: prompt }] }),
        });
        const data = await resp.json();
        const out = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
        bodyHtml = header + (out || '<p>Synthesis returned empty; see raw items below.</p>');
        if (!out) bodyHtml += rawList(items);
      } catch (e) {
        bodyHtml = header + `<p style="color:#b45309">Theme clustering unavailable (${esc(e.message)}). Raw feedback below.</p>` + rawList(items);
      }
    } else {
      bodyHtml = header + `<p style="color:#8a7e6c;font-size:12px">Set ANTHROPIC_API_KEY to enable theme clustering. Raw feedback below.</p>` + rawList(items);
    }

    const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:600px;margin:0 auto;color:#191634">
      <h2 style="font-size:18px;margin:0 0 2px">Attune feedback synthesis</h2>${bodyHtml}</div>`;

    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: `Attune <${fromEmail}>`, to: [to], subject: `Attune feedback — week of ${now.toISOString().slice(0, 10)} (${items.length})`, html }),
    });
    if (!r.ok) return new Response(JSON.stringify({ error: 'Resend failed', detail: await r.text().catch(() => '') }), { status: 502 });
    return new Response(JSON.stringify({ ok: true, sentTo: to, items: items.length, clustered: !!anthropicKey }), { status: 200 });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e && e.message ? e.message : e) }), { status: 500 });
  }
}

function rawList(items) {
  return '<ul style="font-size:13px;color:#3a342c">' +
    items.slice(0, 60).map(i => `<li style="margin-bottom:6px">${i.rating ? `<b>[${i.rating}/5]</b> ` : ''}${esc(i.text).slice(0, 400)}</li>`).join('') +
    '</ul>';
}
