/**
 * GET /api/unsubscribe?token=XXX
 *
 * Unsubscribe a user from Attune emails.
 * Token is the user's Supabase user ID (base64-encoded to obscure it).
 * 
 * On success: sets email_opt_in = false in profiles table, returns a
 * plain HTML confirmation page.
 */

export const config = { runtime: 'edge' };

export default async function handler(req) {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');

  const html = (msg, success = true) => new Response(
    `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Unsubscribe — Attune</title>
<style>body{font-family:'Helvetica Neue',Arial,sans-serif;background:#F3EDE6;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0}
.card{background:#FFFDF9;border-radius:20px;padding:2.5rem 2rem;max-width:420px;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.08)}
h2{font-size:1.25rem;color:#0E0B07;margin:0 0 .75rem}p{font-size:.9rem;color:#8C7A68;line-height:1.7;margin:0 0 1.25rem}
a{display:inline-block;padding:.65rem 1.5rem;border-radius:10px;background:${success?'#059669':'#E8673A'};color:white;text-decoration:none;font-size:.82rem;font-weight:700}</style>
</head><body><div class="card"><h2>${success?'You\'re unsubscribed.':'Something went wrong.'}</h2>
<p>${msg}</p><a href="https://attune-relationships.com/home">Back to Attune</a></div></body></html>`,
    { status: 200, headers: { 'Content-Type': 'text/html' } }
  );

  if (!token) return html("No unsubscribe token found. If you'd like to unsubscribe, reply to any Attune email and we'll remove you manually.", false);

  let userId;
  try {
    userId = atob(token);
    if (!userId || userId.length < 10) throw new Error('invalid');
  } catch {
    return html("This unsubscribe link is invalid or has expired. Reply to any Attune email to unsubscribe manually.", false);
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !serviceKey) {
    // Dev mode
    console.log('[unsubscribe] would opt-out user:', userId);
    return html("You've been removed from Attune emails. Your account and results are not affected.", true);
  }

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${encodeURIComponent(userId)}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ email_opt_in: false }),
    });
    if (!res.ok) throw new Error(`Supabase returned ${res.status}`);
    return html("You've been removed from Attune emails. Your account and results are not affected.", true);
  } catch (e) {
    console.error('[unsubscribe] error:', e);
    return html("Something went wrong — reply to any Attune email and we'll remove you manually.", false);
  }
}
