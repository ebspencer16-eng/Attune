/**
 * GET /api/cron-checkin
 *
 * Vercel Cron Job — runs daily at 09:00 UTC.
 * Finds users who:
 *   • Created their account 6 months ago (±7-day window)
 *   • Have email_opt_in = true
 *   • Have not yet received a check-in (checkin_sent_at IS NULL)
 * Sends the 6-month check-in email to each.
 *
 * Secured with CRON_SECRET env var — Vercel sets the Authorization header automatically.
 * Required env vars: SUPABASE_URL, SUPABASE_SERVICE_KEY, RESEND_API_KEY, FROM_EMAIL, CRON_SECRET
 */
export const config = { runtime: 'edge' };

export default async function handler(req) {
  // Verify this is a legitimate Vercel Cron call
  const auth = req.headers.get('authorization');
  const secret = process.env.CRON_SECRET;
  if (secret && auth !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey  = process.env.SUPABASE_SERVICE_KEY;
  const resendKey   = process.env.RESEND_API_KEY;
  const fromEmail   = process.env.FROM_EMAIL || 'hello@attune-relationships.com';

  if (!supabaseUrl || !serviceKey || !resendKey) {
    return new Response(JSON.stringify({ error: 'Missing env vars' }), { status: 500 });
  }

  const now = new Date();
  // 6-month window: users who signed up 6 months ago ± 7 days
  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const windowStart = new Date(sixMonthsAgo);
  const windowEnd   = new Date(sixMonthsAgo);
  windowStart.setDate(windowStart.getDate() - 7);
  windowEnd.setDate(windowEnd.getDate() + 7);

  // Fetch eligible users
  const res = await fetch(
    `${supabaseUrl}/rest/v1/profiles?select=id,email,name,partner_name,created_at` +
    `&email_opt_in=eq.true` +
    `&checkin_sent_at=is.null` +
    `&created_at=gte.${windowStart.toISOString()}` +
    `&created_at=lte.${windowEnd.toISOString()}`,
    {
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
      },
    }
  );

  if (!res.ok) {
    const err = await res.text();
    console.error('[cron-checkin] Supabase query failed:', err);
    return new Response(JSON.stringify({ error: err }), { status: 500 });
  }

  const users = await res.json();
  let sent = 0, failed = 0;

  for (const user of users) {
    if (!user.email) continue;

    const retakeUrl = `https://attune-relationships.com/app`;

    // Send email
    const emailRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: `Attune <${fromEmail}>`,
        to: [user.email],
        subject: `How are you and ${user.partner_name || 'your partner'} doing?`,
        html: checkinHtml({ toName: user.name || 'there', partnerName: user.partner_name || 'your partner', retakeUrl }),
      }),
    });

    if (emailRes.ok) {
      // Mark as sent so we don't re-send
      await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${user.id}`, {
        method: 'PATCH',
        headers: {
          'apikey': serviceKey,
          'Authorization': `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({ checkin_sent_at: now.toISOString() }),
      });
      sent++;
    } else {
      console.error('[cron-checkin] Email failed for', user.email);
      failed++;
    }
  }

  console.log(`[cron-checkin] Processed ${users.length} users — sent: ${sent}, failed: ${failed}`);
  return new Response(JSON.stringify({ processed: users.length, sent, failed }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function checkinHtml({ toName, partnerName, retakeUrl }) {
  return `<!DOCTYPE html><html><body style="font-family:'DM Sans',Arial,sans-serif;background:#FFFDF9;color:#1E1610;max-width:560px;margin:0 auto;padding:2rem">
    <div style="text-align:center;margin-bottom:2rem">
      <div style="font-family:Georgia,serif;font-size:1.4rem;font-weight:700;color:#0E0B07">Attune</div>
    </div>
    <div style="background:white;border:1.5px solid #E8DDD0;border-radius:16px;padding:2rem">
      <p style="font-size:1rem;font-weight:700;color:#0E0B07;margin-bottom:.5rem">Six months in.</p>
      <p style="color:#8C7A68;font-size:.88rem;line-height:1.7;margin-bottom:1.5rem">Hi ${toName}, six months ago you and ${partnerName} took Attune together. Most couples find their results have shifted by now — in ways that reflect real changes in how they're relating.</p>
      <p style="color:#8C7A68;font-size:.88rem;line-height:1.7;margin-bottom:1.5rem">The retake is the same exercises, answered independently again. The new results sit alongside your original ones so you can see what's changed.</p>
      <div style="text-align:center;margin-bottom:1.5rem">
        <a href="${retakeUrl}" style="display:inline-block;background:linear-gradient(135deg,#E8673A,#1B5FE8);color:white;padding:.85rem 2rem;border-radius:12px;font-size:.85rem;font-weight:700;text-decoration:none;letter-spacing:.04em">Retake Attune →</a>
      </div>
      <p style="font-size:.75rem;color:#8C7A68;line-height:1.6">Each of you retakes independently. Results compare automatically once you're both done.</p>
    </div>
    <p style="text-align:center;font-size:.72rem;color:#C17F47;margin-top:1.5rem">Attune · hello@attune-relationships.com</p>
  </body></html>`;
}
