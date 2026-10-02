#!/usr/bin/env node
/**
 * A query that decides who to leave alone fails closed.
 *
 * ── THE BUG ───────────────────────────────────────────────────────────────
 * api/cron-survey-nudge.js builds two exclusion lists before it sends anything:
 * who has already answered a survey, and who is a beta tester. Both were built
 * inside `try { ... } catch {}` with an empty Set left behind on failure, and
 * the run carried on.
 *
 * So a rejected select did not stop the cron. It emptied the list of people who
 * must NOT be emailed, which means: everyone who had already answered gets
 * nudged to answer again, and every beta tester gets a survey they were
 * deliberately excluded from. Silently, and outward, to customers.
 *
 * The same shape CLAUDE.md records for the engagement page, pointed the other
 * way. There a failed select read as an empty table and drew a zero; here it
 * reads as an empty exclusion list and sends mail.
 *
 * ── HOW IT IS CHECKED ─────────────────────────────────────────────────────
 * By running the handler against a stubbed Supabase and counting the emails.
 * Reading the code cannot tell you what an empty Set does next; running it can.
 * Three passes: everything readable, the answered-already list rejected, and
 * the beta-code list rejected. The first must send and the other two must not.
 *
 * ── WHY IT HAS TO BE ABLE TO SEND ─────────────────────────────────────────
 * The happy pass exists so the other two mean something. A gate where nothing
 * can send mail would pass on a handler that never sends at all, which is this
 * bug's own opposite and just as silent. CLAUDE.md: if a gate is about when
 * something happens, the thing has to be able to happen.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * The other crons. Each decides who to contact in its own way and a shared
 * fixture over all of them would be a second version of each rule rather than
 * a second half of it. This one is here because its failure reaches customers.
 */

import { SITE_URL } from '../api/_lib/site.js';

const fails = [];

Object.assign(process.env, {
  CRON_SECRET: 'stub-cron-secret',
  SUPABASE_URL: 'https://stub.supabase.co',
  SUPABASE_SERVICE_KEY: 'stub-service-key',
  RESEND_API_KEY: 'stub-resend-key',
  FROM_EMAIL: 'hello@example.com',
});

const { default: handler } = await import('../api/cron-survey-nudge.js');

/** One person, finished Expectations two days ago, never nudged. */
const PROFILE = {
  id: 'user-1', email: 'someone@example.com', name: 'A',
};

/**
 * @param {string|null} reject which select answers 500, or null for none
 */
async function run(reject) {
  const emails = [];
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url);
    const bad = () => new Response('{"message":"boom"}', { status: 500 });
    const j = (v) => new Response(JSON.stringify(v), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });

    if (u.includes('api.resend.com')) { emails.push(u); return j({ id: 'mail-1' }); }
    if (u.includes('feedback_submissions')) return reject === 'answered' ? bad() : j([]);
    if (u.includes('beta_codes')) return reject === 'beta' ? bad() : j([]);
    if (u.includes('/orders')) return j([]);
    if (u.includes('/profiles')) {
      /* The PATCH that marks someone nudged. Only the select returns rows. */
      if ((init.method || 'GET').toUpperCase() !== 'GET') return j({});
      return j([PROFILE]);
    }
    return j([]);
  };

  const res = await handler(new Request(`${SITE_URL}/api/cron-survey-nudge`, {
    method: 'POST',
    headers: { authorization: 'Bearer stub-cron-secret' },
  }));
  let body = null;
  try { body = await res.json(); } catch { /* not json */ }
  return { status: res.status, body, emails: emails.length };
}

// ── 1. Everything readable: it sends. ───────────────────────────────────────
{
  const r = await run(null);
  if (!r.emails) {
    fails.push('with every list readable the cron sent no email at all, so the two checks below'
      + ' would pass whatever the handler did.\n'
      + `      Status ${r.status}, body ${JSON.stringify(r.body).slice(0, 120)}.\n`
      + '      Refusing to pass on a probe that proves nothing.');
  }
}

// ── 2 and 3. A list it cannot read: it sends nothing. ───────────────────────
for (const [which, what] of [
  ['answered', 'who has already answered the survey'],
  ['beta', 'who is a beta tester'],
]) {
  const r = await run(which);
  if (r.emails) {
    fails.push(`when the query for ${what} is rejected, the cron still sent ${r.emails} email(s).`
      + '\n      An exclusion list that fails open sends MORE mail, not less: everyone on that'
      + '\n      list gets a message the product had decided not to send them, and nothing'
      + '\n      anywhere says so.');
  }
  if (r.status < 400) {
    fails.push(`when the query for ${what} is rejected, the cron answered ${r.status}, which`
      + ' reads as a clean run.\n      A cron that could not do its job has to say so, or the'
      + ' next person to look sees a\n      green schedule and no emails and has nothing to'
      + ' chase.');
  }
}

if (fails.length) {
  console.error('\n check-nudge-fails-closed: the survey nudge can email people it was told not to.\n');
  for (const f of fails) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}

console.log('[check-nudge-fails-closed] the survey nudge sends when it can read both exclusion'
  + ' lists, and sends nothing and answers 503 when it cannot read either one.');
