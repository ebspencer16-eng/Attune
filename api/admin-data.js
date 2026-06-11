/**
 * /api/admin-data
 *
 * GET ?secret=ADMIN_SECRET
 *
 * One service-role payload for every admin dashboard loader. The admin page
 * previously read orders/profiles/lmft_requests/feedback_submissions straight
 * from PostgREST with the anon key; migration 010 (correctly) locked anon out
 * of those tables, which silently broke every real-data section. Migration
 * 010's comments call for exactly this pattern: admin reads via service role
 * behind the ADMIN_SECRET gate.
 *
 * Returns:
 * {
 *   ok: true,
 *   orders:               [ full order rows, newest first, limit 1000 ],
 *   beta_codes:           [ full rows ],
 *   lmft_requests:        [ full rows, newest first, limit 200 ],
 *   feedback_submissions: [ full rows, newest first, limit 2000 ],
 *   profiles: {
 *     demographics:        [ {age_range, gender, relationship_status,
 *                             relationship_length, children, signup_source} ],
 *     started:             count with ex1 or ex2 answers,
 *     both_done_individuals: count with ex1+ex2 answers and a linked partner,
 *     invited_total:       count with an invite_code,
 *     completed_couples:   partner_sessions with ex1+ex2 answers
 *   }
 * }
 */

export const config = { runtime: 'edge' };

import { createClient } from '@supabase/supabase-js';

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  });
}

export default async function handler(req) {
  if (req.method !== 'GET') return json({ error: 'Method not allowed' }, 405);

  const url = new URL(req.url);
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret) return json({ error: 'Admin endpoint not configured' }, 503);
  if ((url.searchParams.get('secret') || '') !== adminSecret) return json({ error: 'Invalid or missing secret' }, 403);

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY
    || process.env.SUPABASE_SERVICE_ROLE_KEY
    || process.env.SUPABASE_SERVICE_ROLE;
  if (!SUPABASE_URL || !SUPABASE_KEY) return json({ error: 'Supabase env vars missing' }, 500);
  const admin = createClient(SUPABASE_URL, SUPABASE_KEY);

  try {
    const [ordersQ, codesQ, lmftQ, fbQ, profQ, psQ] = await Promise.all([
      admin.from('orders').select('*').order('created_at', { ascending: false }).limit(1000),
      admin.from('beta_codes').select('*').order('code', { ascending: true }),
      admin.from('lmft_requests').select('*').order('created_at', { ascending: false }).limit(200),
      admin.from('feedback_submissions').select('*').order('submitted_at', { ascending: false }).limit(2000),
      admin.from('profiles').select('id, partner_profile_id, invite_code, age_range, gender, relationship_status, relationship_length, children, signup_source, ex1_answers, ex2_answers'),
      admin.from('partner_sessions').select('invite_code, ex1_answers, ex2_answers'),
    ]);

    const firstErr = [ordersQ, codesQ, lmftQ, fbQ, profQ, psQ].find(q => q.error);
    if (firstErr) return json({ error: firstErr.error.message }, 500);

    const profiles = profQ.data || [];
    const hasAnswers = v => v && typeof v === 'object' && Object.keys(v).length > 0;
    const started = profiles.filter(p => hasAnswers(p.ex1_answers) || hasAnswers(p.ex2_answers)).length;
    const bothDoneIndividuals = profiles.filter(p => hasAnswers(p.ex1_answers) && hasAnswers(p.ex2_answers) && p.partner_profile_id).length;
    const invitedTotal = profiles.filter(p => p.invite_code).length;
    const completedCouples = (psQ.data || []).filter(s => hasAnswers(s.ex1_answers) && hasAnswers(s.ex2_answers)).length;

    return json({
      ok: true,
      orders: ordersQ.data || [],
      beta_codes: codesQ.data || [],
      lmft_requests: lmftQ.data || [],
      feedback_submissions: fbQ.data || [],
      profiles: {
        demographics: profiles.map(p => ({
          age_range: p.age_range, gender: p.gender,
          relationship_status: p.relationship_status,
          relationship_length: p.relationship_length,
          children: p.children, signup_source: p.signup_source,
        })),
        started,
        both_done_individuals: bothDoneIndividuals,
        invited_total: invitedTotal,
        completed_couples: completedCouples,
      },
    });
  } catch (e) {
    return json({ error: String(e?.message || e) }, 500);
  }
}
