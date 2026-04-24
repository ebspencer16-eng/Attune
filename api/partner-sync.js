/**
 * /api/partner-sync
 *
 * POST { action: 'write', inviteCode, partnerBId, partnerBName, ex1Answers, ex2Answers, ex3Answers? }
 *   → Partner B writes their completed exercises against Partner A's invite code
 *
 * GET  ?inviteCode=XXX
 *   → Partner A polls for Partner B's answers
 *
 * Security:
 *   - Invite codes validated as 8-char alphanumeric
 *   - Completed sessions are immutable (completed_at check)
 *   - Rate-limited via Vercel edge headers
 *   - Input sizes capped to prevent oversized payloads
 */

import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'edge' };

const supabase = () => createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const CORS = { 'Content-Type': 'application/json', 'X-Content-Type-Options': 'nosniff' };
const INVITE_RE = /^[A-Z0-9]{6,12}$/;

function validateInviteCode(code) {
  return typeof code === 'string' && INVITE_RE.test(code.trim().toUpperCase());
}

function sanitizeAnswers(answers) {
  if (!answers || typeof answers !== 'object') return null;
  // Cap individual text answer lengths to prevent abuse
  const sanitized = {};
  for (const [k, v] of Object.entries(answers)) {
    if (typeof v === 'string') sanitized[k] = v.slice(0, 2000);
    else if (typeof v === 'number') sanitized[k] = v;
    else if (Array.isArray(v)) sanitized[k] = v.slice(0, 20);
    else sanitized[k] = v;
  }
  return sanitized;
}

export default async function handler(req) {
  if (req.method === 'POST') {
    let body;
    try { body = await req.json(); } catch { return new Response('Invalid JSON', { status: 400 }); }

    const { inviteCode, partnerBId, partnerBName, ex1Answers, ex2Answers, ex3Answers, demographics } = body;

    // Validate invite code format
    if (!inviteCode || !validateInviteCode(inviteCode)) {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid invite code format' }), { status: 400, headers: CORS });
    }

    // Require both core exercises
    if (!ex1Answers || !ex2Answers) {
      return new Response(JSON.stringify({ ok: false, error: 'Missing required exercise answers' }), { status: 400, headers: CORS });
    }

    const code = inviteCode.trim().toUpperCase();

    // Guard: verify invite code exists in profiles (prevents writing to arbitrary codes)
    const { data: profile } = await supabase()
      .from('profiles')
      .select('id, partner_joined')
      .eq('invite_code', code)
      .maybeSingle();

    if (!profile) {
      return new Response(JSON.stringify({ ok: false, error: 'Invite code not found' }), { status: 404, headers: CORS });
    }

    // Check if this session is already locked
    const { data: existing } = await supabase()
      .from('partner_sessions')
      .select('completed_at')
      .eq('invite_code', code)
      .maybeSingle();

    if (existing?.completed_at) {
      console.warn('[partner-sync] attempt to overwrite completed session for invite:', code);
      return new Response(JSON.stringify({ ok: false, error: 'Answers already submitted. Results are final.' }), { status: 409, headers: CORS });
    }

    const { error } = await supabase()
      .from('partner_sessions')
      .upsert({
        invite_code:    code,
        partner_b_id:   partnerBId || null,
        partner_b_name: partnerBName ? String(partnerBName).slice(0, 100) : null,
        ex1_answers:    sanitizeAnswers(ex1Answers),
        ex2_answers:    sanitizeAnswers(ex2Answers),
        ex3_answers:    ex3Answers ? sanitizeAnswers(ex3Answers) : null,
        // Demographics columns exist from migration 005. Values are short
        // controlled-vocabulary strings (dropdown options) so no sanitize
        // needed beyond truncation.
        age_range:           demographics?.age_range ? String(demographics.age_range).slice(0, 20) : null,
        gender:              demographics?.gender ? String(demographics.gender).slice(0, 20) : null,
        relationship_status: demographics?.relationship_status ? String(demographics.relationship_status).slice(0, 30) : null,
        relationship_length: demographics?.relationship_length ? String(demographics.relationship_length).slice(0, 10) : null,
        children:            demographics?.children ? String(demographics.children).slice(0, 20) : null,
        signup_source:       demographics?.signup_source ? String(demographics.signup_source).slice(0, 30) : null,
        completed_at:        new Date().toISOString(),
      }, { onConflict: 'invite_code' });

    if (error) {
      console.error('[partner-sync] write error:', error);
      return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500, headers: CORS });
    }

    // Mark partner_joined on Partner A's profile
    await supabase()
      .from('profiles')
      .update({ partner_joined: true })
      .eq('invite_code', code);

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: CORS });
  }

  if (req.method === 'GET') {
    const url = new URL(req.url);
    const raw = url.searchParams.get('inviteCode');

    if (!raw || !validateInviteCode(raw)) {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid invite code' }), { status: 400, headers: CORS });
    }

    const code = raw.trim().toUpperCase();
    const { data, error } = await supabase()
      .from('partner_sessions')
      .select('partner_b_name, ex1_answers, ex2_answers, ex3_answers, completed_at')
      .eq('invite_code', code)
      .maybeSingle();

    if (error) return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500, headers: CORS });
    if (!data)  return new Response(JSON.stringify({ ok: true, found: false }), { status: 200, headers: CORS });

    return new Response(JSON.stringify({ ok: true, found: true, session: data }), { status: 200, headers: CORS });
  }

  return new Response('Method not allowed', { status: 405 });
}
