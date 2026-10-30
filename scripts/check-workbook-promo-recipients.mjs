#!/usr/bin/env node
/**
 * check-workbook-promo-recipients: the workbook discount goes to the couple,
 * and to nobody the request names.
 *
 * /api/generate-workbook-promo emailed whatever `partnerEmail` the browser
 * sent. The account address was checked against the sign-in; the partner's
 * was not, so any signed-in person could have us mail a code to any address,
 * as often as they liked. And that typed address went into a database filter
 * unquoted, where `},code.not.is.null,...` widened the duplicate check to any
 * code and handed the first one back (A205; api/_lib/filter-value.js).
 *
 * RUNS the endpoint with the network stubbed and a request naming a stranger:
 *   1. the email goes to the linked partner's own address, and the stranger
 *      gets nothing;
 *   2. before the partner has joined, it goes to the address this person
 *      invited;
 *   3. a couple that cannot be read sends nothing and answers 503;
 *   4. every value in the duplicate check is one quoted value, so a crafted
 *      or plus-addressed email cannot change what is matched.
 *
 * Planted: the body's partnerEmail restored, and filterValue removed from
 * the duplicate check. Both fail it.
 */
Object.assign(process.env, { SUPABASE_URL: 'https://db.test', SUPABASE_ANON_KEY: 'a', SUPABASE_SERVICE_KEY: 'k', INTERNAL_API_SECRET: 's' });
const { default: handler } = await import('../api/generate-workbook-promo.js');
const ME = '11111111-1111-4111-8111-111111111111';
const THEM = '22222222-2222-4222-8222-222222222222';

async function run({ linked = true, failProfile = false, account = 'maya+test@example.com' } = {}) {
  const sent = [], urls = [];
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url); urls.push(u);
    const j = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'content-type': 'application/json' } });
    if (u.includes('/auth/v1/user')) return j({ id: ME, email: account });
    if (u.includes('/api/send-email')) { sent.push(JSON.parse(init.body).toEmail); return j({ ok: true }); }
    if (u.includes(`profiles?id=eq.${ME}`)) return failProfile ? j({ message: 'x' }, 500) : j([{ partner_profile_id: linked ? THEM : null, partner_email: 'invited@example.com' }]);
    if (u.includes(`profiles?id=eq.${THEM}`)) return j([{ email: 'alex@example.com' }]);
    if (u.includes('beta_codes') && (init.method || 'GET') === 'POST') return new Response(null, { status: 201 });
    return j([]);
  };
  const quiet = console.warn; console.warn = () => {};
  const r = await handler(new Request('https://www.attune-relationships.com/api/generate-workbook-promo', {
    method: 'POST', headers: { authorization: 'Bearer t', 'content-type': 'application/json' },
    body: JSON.stringify({ accountEmail: account, partnerEmail: 'x@y.com},code.not.is.null,bound_emails.cs.{stranger@example.com', toName: 'Maya' }),
  }));
  console.warn = quiet;
  return { status: r.status, sent, urls };
}

const fails = [];
const a = await run();
if (a.sent.some((e) => /stranger|x@y/.test(e))) fails.push(`the code was emailed to an address the request named: ${a.sent.join(', ')}`);
if (!a.sent.includes('alex@example.com')) fails.push(`the linked partner did not get the code (sent to ${a.sent.join(', ') || 'nobody'})`);
const b = await run({ linked: false });
if (!b.sent.includes('invited@example.com')) fails.push(`before the partner joined, the code did not go to the invited address (sent to ${b.sent.join(', ') || 'nobody'})`);
const c = await run({ failProfile: true });
if (c.status !== 503 || c.sent.length) fails.push(`a couple that could not be read answered ${c.status} and sent ${c.sent.length}`);

const dedup = decodeURIComponent(a.urls.find((u) => u.includes('beta_codes?select=code')) || '');
const conds = (dedup.match(/or=\((.*)\)$/) || [])[1] || '';
if (!conds) fails.push('could not find the duplicate check; the gate has lost its subject');
else {
  const parts = conds.split(/,(?=bound_emails\.cs\.)/);
  if (!parts.every((p) => /^bound_emails\.cs\.\{"[^"]*"\}$/.test(p))) fails.push(`the duplicate check is not one quoted value per address: ${conds}`);
  if (!parts.some((p) => p.includes('"maya+test@example.com"'))) fails.push(`a plus address reached the duplicate check as ${conds}; a bare + reads as a space and the check never matches`);
}

if (fails.length) {
  console.error('[check-workbook-promo-recipients] ' + fails.length + ' problem(s):');
  for (const f of fails) console.error('  ' + f);
  process.exit(1);
}
console.log('[check-workbook-promo-recipients] the workbook code goes to the account and its partner as the database knows them, never to an address in the request; an unread couple sends nothing; the duplicate check quotes every address.');
