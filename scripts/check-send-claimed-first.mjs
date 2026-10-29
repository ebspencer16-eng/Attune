#!/usr/bin/env node
/**
 * Something sent to a person is recorded before it is sent, and only sent if
 * the record landed.
 *
 * ── THE BUG ───────────────────────────────────────────────────────────────
 * Found in the A170 sweep, twice, in the two places this product reaches out
 * to somebody on a schedule. The check-in email stamped `checkin_sent_at` AFTER
 * sending, without checking the stamp landed; the push log was written after
 * delivery with its failure dropped. Both stamps are what stops the next run
 * sending again, so a write that failed became the same email or the same
 * notification on every run. The one way a failure here turns into spam.
 *
 * ── WHAT IT RUNS ──────────────────────────────────────────────────────────
 * api/cron-checkin.js against a stubbed database and a stubbed Resend, with
 * one person due, three ways:
 *
 *   the stamp cannot be written      -> no email is sent
 *   the stamp lands, the email fails -> the stamp is given back, to retry
 *   both work                        -> one email, the stamp kept
 *
 * The push half is in check-push-reach, beside the cooldown it protects.
 */
const fails = [];
Object.assign(process.env, {
  SUPABASE_URL: 'https://example.invalid',
  SUPABASE_SERVICE_KEY: 'test-not-a-real-key',
  RESEND_API_KEY: 'test-not-a-real-key',
  CRON_SECRET: 'test-cron-secret',
});
const { default: cron } = await import('../api/cron-checkin.js');

const PERSON = { id: 'p-1', email: 'due@example.invalid', name: 'A', partner_name: 'B', created_at: '2026-04-28T00:00:00Z', ex3_completed: false };

const run = async ({ stamp, email }) => {
  const sent = [];
  const patches = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts = {}) => {
    const u = String(url);
    const method = opts.method || 'GET';
    if (/api\.resend\.com/.test(u)) { sent.push(u); return new Response('{}', { status: email }); }
    if (/\/rest\/v1\/profiles/.test(u) && method === 'PATCH') {
      patches.push({ u, body: opts.body });
      const claiming = /checkin(_1yr)?_sent_at=is\.null/.test(u);
      if (claiming) {
        return stamp < 300 ? new Response(JSON.stringify([{ id: PERSON.id }]), { status: stamp }) : new Response('{}', { status: stamp });
      }
      return new Response(null, { status: 204 });
    }
    /* Only the six-month window has anybody in it, so each case is one person. */
    if (/\/rest\/v1\/profiles/.test(u) && /checkin_sent_at=is\.null/.test(u)) return new Response(JSON.stringify([PERSON]), { status: 200 });
    return new Response('[]', { status: 200 });
  };
  const l = console.log; const e = console.error; console.log = () => {}; console.error = () => {};
  try {
    await cron(new Request('https://x.invalid/api/cron-checkin', { headers: { authorization: 'Bearer test-cron-secret' } }));
  } finally {
    globalThis.fetch = realFetch; console.log = l; console.error = e;
  }
  return { sent, patches };
};

const noStamp = await run({ stamp: 503, email: 200 });
if (noStamp.sent.length) {
  fails.push('the check-in email was sent when its stamp could not be written, so the next run sends it again.');
}
const badEmail = await run({ stamp: 200, email: 500 });
if (!badEmail.patches.some((p) => /"checkin_sent_at":null/.test(p.body || ''))) {
  fails.push('the email failed and its claimed stamp was not given back, so this person never gets their check-in.');
}
const fine = await run({ stamp: 200, email: 200 });
if (fine.sent.length !== 1) fails.push(`a due person with everything working got ${fine.sent.length} email(s), not one.`);
if (fine.patches.some((p) => /"checkin_sent_at":null/.test(p.body || ''))) fails.push('a sent email gave its stamp back.');

// ── the survey nudge, the same three ways ──────────────────────────────────
{
  const { default: nudge } = await import('../api/cron-survey-nudge.js');
  const DUE = { id: 'n-1', email: 'nudge@example.invalid', name: 'A' };
  const runNudge = async ({ stamp, email }) => {
    const sent = [];
    const patches = [];
    const realFetch = globalThis.fetch;
    globalThis.fetch = async (url, opts = {}) => {
      const u = String(url);
      const method = opts.method || 'GET';
      if (/api\.resend\.com/.test(u)) { sent.push(u); return new Response('{}', { status: email }); }
      if (/\/rest\/v1\/profiles/.test(u) && method === 'PATCH') {
        patches.push({ u, body: opts.body });
        if (/survey_nudge(2)?_sent_at=is\.null/.test(u)) {
          return stamp < 300 ? new Response(JSON.stringify([DUE]), { status: stamp }) : new Response('{}', { status: stamp });
        }
        return new Response(null, { status: 204 });
      }
      /* Only the first pass has anybody due. */
      if (/\/rest\/v1\/profiles/.test(u) && /survey_nudge_sent_at=is\.null/.test(u)) return new Response(JSON.stringify([DUE]), { status: 200 });
      return new Response('[]', { status: 200 });
    };
    const l = console.log; const e = console.error; console.log = () => {}; console.error = () => {};
    try {
      await nudge(new Request('https://x.invalid/api/cron-survey-nudge', { method: 'POST', headers: { authorization: 'Bearer test-cron-secret' } }));
    } finally {
      globalThis.fetch = realFetch; console.log = l; console.error = e;
    }
    return { sent, patches };
  };
  const noStamp = await runNudge({ stamp: 503, email: 200 });
  if (noStamp.sent.length) fails.push('the survey nudge was sent when its stamp could not be written, so the next run nudges again.');
  const badEmail = await runNudge({ stamp: 200, email: 500 });
  if (!badEmail.patches.some((p) => /"survey_nudge_sent_at":null/.test(p.body || ''))) {
    fails.push('a survey nudge that failed did not give its claimed stamp back, so this person is never nudged.');
  }
  const fine = await runNudge({ stamp: 200, email: 200 });
  if (fine.sent.length !== 1) fails.push(`a person due a survey nudge with everything working got ${fine.sent.length} email(s), not one.`);
}

if (fails.length) {
  console.error('check-send-claimed-first FAILED');
  for (const f of fails) console.error('  - ' + f);
  process.exit(1);
}
console.log('[check-send-claimed-first] the check-in email and the survey nudge are each stamped before they are sent and only sent if the stamp'
  + ' landed; a failed email gives the stamp back; one due person gets one email. The push log is held the same way'
  + ' in check-push-reach.');
