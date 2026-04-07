/**
 * /api/partner-sync
 *
 * POST { action: 'write', inviteCode, partnerBId, partnerBName, ex1Answers, ex2Answers }
 *   → Partner B writes their completed exercises against Partner A's invite code
 *
 * GET  ?inviteCode=XXX
 *   → Partner A polls for Partner B's answers
 *
 * Uses service role key so it can bypass RLS for the write path
 * (Partner B is authenticated on their own device, not Partner A's)
 */

import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'edge' };

const supabase = () => createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req) {
  const headers = { 'Content-Type': 'application/json' };

  if (req.method === 'POST') {
    let body;
    try { body = await req.json(); } catch { return new Response('Invalid JSON', { status: 400 }); }

    const { inviteCode, partnerBId, partnerBName, ex1Answers, ex2Answers } = body;
    if (!inviteCode || !ex1Answers || !ex2Answers) {
      return new Response(JSON.stringify({ ok: false, error: 'Missing required fields' }), { status: 400, headers });
    }

    // Check if this session is already locked (completed_at set means submission is final)
    const { data: existing } = await supabase()
      .from('partner_sessions')
      .select('completed_at')
      .eq('invite_code', inviteCode)
      .maybeSingle();

    if (existing?.completed_at) {
      console.warn('[partner-sync] attempt to overwrite completed session for invite:', inviteCode);
      return new Response(JSON.stringify({ ok: false, error: 'Answers already submitted. Results are final.' }), { status: 409, headers });
    }

    const { error } = await supabase()
      .from('partner_sessions')
      .upsert({
        invite_code:    inviteCode,
        partner_b_id:   partnerBId || null,
        partner_b_name: partnerBName || null,
        ex1_answers:    ex1Answers,
        ex2_answers:    ex2Answers,
        completed_at:   new Date().toISOString(),
      }, { onConflict: 'invite_code' });

    if (error) {
      console.error('[partner-sync] write error:', error);
      return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500, headers });
    }

    // Mark partner_joined on Partner A's profile
    await supabase()
      .from('profiles')
      .update({ partner_joined: true })
      .eq('invite_code', inviteCode);

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
  }

  if (req.method === 'GET') {
    const url = new URL(req.url);
    const inviteCode = url.searchParams.get('inviteCode');
    if (!inviteCode) return new Response(JSON.stringify({ ok: false, error: 'inviteCode required' }), { status: 400, headers });

    const { data, error } = await supabase()
      .from('partner_sessions')
      .select('partner_b_name, ex1_answers, ex2_answers, completed_at')
      .eq('invite_code', inviteCode)
      .maybeSingle();

    if (error) return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500, headers });
    if (!data)  return new Response(JSON.stringify({ ok: true, found: false }), { status: 200, headers });

    return new Response(JSON.stringify({ ok: true, found: true, session: data }), { status: 200, headers });
  }

  return new Response('Method not allowed', { status: 405 });
}
