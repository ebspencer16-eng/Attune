/**
 * POST /api/calendly-webhook
 *
 * Receives Calendly webhook events for the LMFT scheduling flow.
 * Configure in Calendly admin → Webhook subscriptions:
 *   URL:    https://attune-relationships.com/api/calendly-webhook
 *   Events: invitee.created, invitee.canceled
 *
 * On invitee.created:
 *   - Write/update lmft_requests row with full Calendly metadata
 *   - Send our branded confirmation email (Calendly's user email is OFF — see LMFT_SETUP.md)
 *
 * On invitee.canceled:
 *   - Mark row cancelled, store reason
 *
 * Required env vars:
 *   CALENDLY_WEBHOOK_SECRET — signing key from Calendly webhook setup (used to verify req signature)
 *   SUPABASE_URL, SUPABASE_SERVICE_KEY
 *   RESEND_API_KEY, FROM_EMAIL
 */
export const config = { runtime: 'edge' };

// ── Calendly signature verification ──────────────────────────────────────────
// Calendly sends a signature header: t=TIMESTAMP,v1=HMAC_SHA256_SIGNATURE
// Signed payload is "TIMESTAMP.RAW_BODY". We verify with the webhook signing key.
async function verifyCalendlySignature(rawBody, signatureHeader, signingKey) {
  if (!signatureHeader || !signingKey) return false;
  const parts = Object.fromEntries(signatureHeader.split(',').map(p => p.split('=')));
  const timestamp = parts.t;
  const sentSig = parts.v1;
  if (!timestamp || !sentSig) return false;

  // Reject if timestamp is older than 5 minutes (replay protection)
  const ageSec = Math.abs(Math.floor(Date.now() / 1000) - parseInt(timestamp, 10));
  if (Number.isNaN(ageSec) || ageSec > 300) return false;

  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(signingKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign']
  );
  const signed = await crypto.subtle.sign('HMAC', key, enc.encode(`${timestamp}.${rawBody}`));
  const expected = Array.from(new Uint8Array(signed)).map(b => b.toString(16).padStart(2, '0')).join('');

  // Constant-time compare (length must match, then XOR all bytes)
  if (expected.length !== sentSig.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) mismatch |= expected.charCodeAt(i) ^ sentSig.charCodeAt(i);
  return mismatch === 0;
}

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const rawBody = await req.text();
  const signature = req.headers.get('calendly-webhook-signature');
  const signingKey = process.env.CALENDLY_WEBHOOK_SECRET;

  // In dev (no signing key set) we accept all requests so the endpoint is testable.
  // In prod the signing key is required.
  if (signingKey) {
    const ok = await verifyCalendlySignature(rawBody, signature, signingKey);
    if (!ok) {
      console.warn('[calendly-webhook] invalid signature');
      return new Response('Invalid signature', { status: 401 });
    }
  } else {
    console.warn('[calendly-webhook] CALENDLY_WEBHOOK_SECRET not set — accepting unsigned request');
  }

  let event;
  try { event = JSON.parse(rawBody); }
  catch { return new Response('Invalid JSON', { status: 400 }); }

  const eventType = event.event;
  const payload = event.payload || {};

  if (eventType === 'invitee.created') {
    await handleBookingCreated(payload);
  } else if (eventType === 'invitee.canceled') {
    await handleBookingCancelled(payload);
  } else {
    console.log('[calendly-webhook] ignoring event type:', eventType);
  }

  // Always 200 so Calendly doesn't retry — we log errors internally
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

// ── invitee.created → write row + send branded email ────────────────────────
async function handleBookingCreated(payload) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !serviceKey) {
    console.warn('[calendly-webhook] Supabase env missing; skipping insert');
    return;
  }

  // Calendly puts the booking in payload.scheduled_event, the invitee in payload itself
  const scheduledEvent = payload.scheduled_event || {};
  const eventUri        = scheduledEvent.uri || null;
  const inviteeUri      = payload.uri || null;
  const eventTypeUri    = scheduledEvent.event_type || null;
  const scheduledStart  = scheduledEvent.start_time || null;
  const scheduledEnd    = scheduledEvent.end_time || null;
  const videoUrl        = scheduledEvent.location?.join_url
                       || scheduledEvent.location?.location
                       || null;
  const rescheduleUrl   = payload.reschedule_url || null;
  const cancelUrl       = payload.cancel_url || null;

  // Therapist info — Calendly provides event_memberships array (the host(s))
  const therapist       = (scheduledEvent.event_memberships || [])[0] || {};
  const therapistName   = therapist.user_name || null;
  const therapistEmail  = therapist.user_email || null;

  // Invitee info — name parsing
  const inviteeName    = payload.name || '';
  const inviteeEmail   = payload.email || '';
  const timezone       = payload.timezone || null;

  // Custom questions — we configure Calendly to ask "Partner's name" and pass orderId via tracking
  // tracking.utm_source carries the order number (we set it in the embed URL on /lmft-booking)
  let p2Name = '';
  let orderId = null;
  if (Array.isArray(payload.questions_and_answers)) {
    for (const qa of payload.questions_and_answers) {
      const q = (qa.question || '').toLowerCase();
      if (q.includes('partner') && q.includes('name')) p2Name = qa.answer || '';
    }
  }
  // utm_source carries the order id — set when we render the embed
  orderId = payload.tracking?.utm_source || null;

  // Split the buyer's full name into first-name-only for our internal record
  const p1Name = inviteeName.split(' ')[0] || inviteeName || 'Guest';

  const row = {
    p1_name:          p1Name,
    p2_name:          p2Name || null,
    email:            inviteeEmail,
    timezone,
    order_id:         orderId,
    status:           'scheduled',
    scheduled_at:     scheduledStart,        // legacy column — keep populated for old admin code
    event_uri:        eventUri,
    invitee_uri:      inviteeUri,
    event_type_uri:   eventTypeUri,
    scheduled_start:  scheduledStart,
    scheduled_end:    scheduledEnd,
    video_url:        videoUrl,
    reschedule_url:   rescheduleUrl,
    cancel_url:       cancelUrl,
    therapist_name:   therapistName,
    therapist_email:  therapistEmail,
    calendly_payload: payload,
  };

  // Upsert on event_uri so Calendly retries don't create dupes
  const upsertRes = await fetch(`${supabaseUrl}/rest/v1/lmft_requests?on_conflict=event_uri`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Prefer': 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(row),
  }).catch(e => { console.error('[calendly-webhook] supabase upsert failed:', e); return null; });

  if (upsertRes && !upsertRes.ok) {
    const txt = await upsertRes.text().catch(() => '');
    console.error('[calendly-webhook] supabase upsert non-200:', upsertRes.status, txt);
  }

  // Send our branded confirmation email — replaces Calendly's default user email
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey && inviteeEmail) {
    const baseUrl = process.env.PUBLIC_BASE_URL || 'https://attune-relationships.com';
    await fetch(`${baseUrl}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'lmft_confirmed',
        toEmail: inviteeEmail,
        toName: p1Name,
        partnerName: p2Name || null,
        scheduledStart,
        timezone,
        videoUrl,
        rescheduleUrl,
        cancelUrl,
        therapistName,
        orderId,
      }),
    }).catch(e => console.warn('[calendly-webhook] confirmation email failed:', e));
  }
}

// ── invitee.canceled → mark row cancelled ────────────────────────────────────
async function handleBookingCancelled(payload) {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !serviceKey) return;

  const scheduledEvent = payload.scheduled_event || {};
  const eventUri = scheduledEvent.uri;
  if (!eventUri) {
    console.warn('[calendly-webhook] cancelled event missing event_uri');
    return;
  }

  const cancellation = payload.cancellation || {};
  const reason = cancellation.reason || null;

  const patchRes = await fetch(
    `${supabaseUrl}/rest/v1/lmft_requests?event_uri=eq.${encodeURIComponent(eventUri)}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason,
      }),
    }
  ).catch(e => { console.error('[calendly-webhook] supabase patch failed:', e); return null; });

  if (patchRes && !patchRes.ok) {
    const txt = await patchRes.text().catch(() => '');
    console.error('[calendly-webhook] supabase patch non-200:', patchRes.status, txt);
  }
}
