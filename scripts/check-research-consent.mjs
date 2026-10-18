#!/usr/bin/env node
/**
 * What survives a deletion is what each person agreed could survive it.
 *
 * ── THE PROMISE ───────────────────────────────────────────────────────────
 * Published, on /privacy-choices:
 *
 *   "When an account is deleted we normally keep a de-identified copy of the
 *    exercise answers and profile details, with no name, email, or invite
 *    code attached. We use it to improve the exercises. Turn this off and
 *    nothing is kept when you delete your account."
 *
 * ── WHAT IT MISSED ────────────────────────────────────────────────────────
 * Two of the archived fields, couple_type and exp_gaps, carry the PARTNER's
 * raw answers, so a couple can be studied as a couple. The partner has not
 * deleted anything and has their own answer to that question, and it was
 * never read: one person's deletion could put the other person's answers into
 * the archive against their choice.
 *
 * ── HOW THIS CHECKS ───────────────────────────────────────────────────────
 * It runs the real endpoint with only the network stubbed, over every
 * combination of the two people's choices, and reads what the archive insert
 * actually contains. The preference is read fail-closed on both sides: a
 * preference that cannot be confirmed is an opt-out, because the other way
 * round keeps answers from somebody who may have asked us not to.
 */

process.env.SUPABASE_URL ||= 'https://stub.local';
process.env.SUPABASE_SERVICE_KEY ||= 'stub-service-key';
process.env.SUPABASE_SERVICE_ROLE ||= 'stub-service-key';
process.env.SUPABASE_ANON_KEY ||= 'stub-anon-key';

const ROOT = new URL('..', import.meta.url).pathname;
const ME = 'aaaaaaaa-0000-0000-0000-000000000001';
const PARTNER = 'aaaaaaaa-0000-0000-0000-000000000002';

const writes = [];
function stub({ mineOptOut, theirsOptOut, prefsFail = false }) {
  globalThis.fetch = async (url, opts = {}) => {
    const u = String(url);
    const method = (opts.method || 'GET').toUpperCase();
    if (method !== 'GET') {
      let body = null;
      try { body = JSON.parse(opts.body); } catch { /* not json */ }
      writes.push({ u: u.split('?')[0], body });
    }
    const reply = (b, s = 200) => new Response(JSON.stringify(b), {
      status: s, headers: { 'content-type': 'application/json' },
    });
    if (u.includes('/auth/v1/token')) return reply({ access_token: 'x', user: { id: ME } });
    if (u.includes('/auth/v1/user')) return reply({ id: ME, email: 'me@example.com' });
    if (u.includes('/auth/v1/admin/users')) return reply({});
    if (u.includes('privacy_preferences')) {
      if (prefsFail) return reply({ message: 'no such table' }, 500);
      return reply([{ opt_out_research: u.includes(PARTNER) ? theirsOptOut : mineOptOut }]);
    }
    if (u.includes('/rest/v1/profiles')) {
      const them = u.includes(PARTNER);
      return reply([{
        id: them ? PARTNER : ME, name: them ? 'Rio' : 'Dana',
        email: them ? 'rio@example.com' : 'me@example.com',
        pronouns: 'she/her', partner_pronouns: 'he/him',
        partner_profile_id: them ? ME : PARTNER,
        pkg: 'premium', created_at: '2026-01-01', age_range: '25-34',
        relationship_status: 'engaged', relationship_length: '1-2',
        children: 'none', signup_source: 'friend',
        ex1_answers: { en6: 3 }, ex2_answers: { life: { lq_faith: 2 } }, ex3_answers: { a8: 'Kind' },
        email_opt_in: true,
      }]);
    }
    if (u.includes('/rest/v1/orders')) return reply([{ order_num: 'ATT-1' }]);
    return reply([]);
  };
}

const handler = (await import(`${ROOT}api/delete-account.js`)).default;
const problems = [];

async function run(label, setup) {
  writes.length = 0;
  stub(setup);
  const res = await handler(new Request('https://local/api/delete-account', {
    method: 'POST',
    headers: { 'content-type': 'application/json', Authorization: 'Bearer stub' },
    body: JSON.stringify({ userId: ME, password: 'x' }),
  }));
  if (res.status !== 200) {
    problems.push(`${label}: the endpoint answered ${res.status}, so nothing was measured.`);
    return null;
  }
  const row = writes.find((w) => w.u.includes('deleted_user_archive'))?.body ?? null;
  return { row, label };
}

/* 1. Both agreed: the archive is written, with the couple context. */
{
  const r = await run('both agreed', { mineOptOut: false, theirsOptOut: false });
  if (r) {
    if (!r.row) problems.push('both agreed and nothing was archived at all.');
    else {
      if (!r.row.ex1_answers) problems.push('both agreed and the archive carries no answers.');
      if (!r.row.couple_type || !r.row.exp_gaps) {
        problems.push('both agreed and the couple context is missing, which is what the archive'
          + ' is for: a couple studied as a couple.');
      }
      for (const forbidden of ['name', 'email', 'invite_code', 'user_id', 'owner_id', 'id']) {
        if (r.row[forbidden] != null) {
          problems.push(`the archive row carries ${forbidden}, and the promise is "no name, email,`
            + ' or invite code attached".');
        }
      }
    }
  }
}

/* 2. The partner said no: their answers stay out, the deleter's own go in. */
{
  const r = await run('the partner opted out', { mineOptOut: false, theirsOptOut: true });
  if (r) {
    if (!r.row) problems.push('the partner opting out stopped the DELETER being archived, and it'
      + ' is not their choice to make.');
    else {
      if (r.row.couple_type || r.row.exp_gaps) {
        problems.push("the partner opted out of research use and their raw answers are in the"
          + ' archive anyway, inside couple_type or exp_gaps. They did not delete anything and'
          + ' they answered that question for themselves.');
      }
      if (!r.row.ex1_answers) problems.push('the deleter agreed and their own answers were dropped.');
    }
  }
}

/* 3. The deleter said no: nothing at all. */
{
  const r = await run('the deleter opted out', { mineOptOut: true, theirsOptOut: false });
  if (r && r.row) {
    problems.push('the person deleting their account had opted out of research use and an archive'
      + ' row was written anyway. "Turn this off and nothing is kept."');
  }
}

/* 4. The preference cannot be read: treated as no, on both sides. */
{
  const r = await run('the preference could not be read', { mineOptOut: false, theirsOptOut: false, prefsFail: true });
  if (r && r.row) {
    problems.push('the research preference could not be read and an archive row was written'
      + ' anyway. A preference we cannot confirm has to be an opt-out.');
  }
}

if (problems.length) {
  console.error('[check-research-consent] what survives a deletion is not what was agreed:');
  for (const p of problems) console.error(`  ✗ ${p}`);
  process.exit(1);
}

console.log('[check-research-consent] 4 runs of the real endpoint: both agreeing archives the'
  + " couple's answers with no name, email or id on the row; either person's opt-out removes"
  + ' their own half; and a preference that cannot be read is an opt-out.');
