#!/usr/bin/env node
/**
 * check-promo-claim: a promo code's use is claimed, and not knowing is refused.
 *
 * Two bugs in api/create-payment-intent.js, found together (A202):
 *
 *   1. The code's record was read inside a try that swallowed a timeout or an
 *      error reply, so a failed read left no row, and every guard the row
 *      carries (uses so far, deactivated, expired, bound to an address) was
 *      skipped. A named code already redeemed redeemed again for free.
 *   2. The use was counted by reading uses_count and writing it back plus
 *      one. Two redemptions at once both passed the single-use check.
 *
 * It RUNS the handler against a stubbed database rather than reading it, over
 * seven outcomes, and asserts the answer to each. The stub answers what
 * PostgREST answers: an array, a 409 on a duplicate insert, an empty array
 * from a PATCH whose filter no longer matches.
 *
 * Planted: the lookup's refusal removed (the failed read falls through), the
 * claim's `uses_count=eq.` filter removed, and the refusal after a lost
 * claim removed. All three fail it.
 */
import { SITE_URL } from '../api/_lib/site.js';
process.env.SUPABASE_URL = 'https://db.test';
process.env.SUPABASE_SERVICE_KEY = 'k';
process.env.STRIPE_SECRET_KEY = 'sk_test_x';
const { default: handler } = await import('../api/create-payment-intent.js');

const req = (code) => new Request(`${SITE_URL}/api/create-payment-intent`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', origin: `${SITE_URL}` },
  body: JSON.stringify({
    items: [{ pkgKey: 'core', partner1Name: 'A', partner2Name: 'B' }],
    buyerEmail: 'buyer@example.com', promoCode: code,
    customerAddress: { country: 'US', postal_code: '10001', state: 'NY', city: 'NY', line1: '1 St' },
  }),
});
const quiet = console.warn; const quietErr = console.error; const quietLog = console.log;
async function run(code, db) {
  const calls = [];
  globalThis.fetch = async (url, init = {}) => {
    const u = String(url);
    if (u.startsWith('https://db.test/rest/v1/beta_codes')) { calls.push({ method: init.method || 'GET', url: u }); return db(u, init); }
    if (u.includes('/rest/v1/orders')) return new Response('[]', { status: 201 });
    return new Response('{}', { status: 200 });
  };
  console.warn = () => {}; console.error = () => {}; console.log = () => {};
  try {
    const r = await handler(req(code));
    return { status: r.status, body: await r.json().catch(() => ({})), calls };
  } finally { console.warn = quiet; console.error = quietErr; console.log = quietLog; }
}
const ok = (rows) => new Response(JSON.stringify(rows), { status: 200 });
const row = { code: 'FLASH1', package_key: 'core', discount_mode: 'free', uses_count: 0, max_uses: 1, active: true };

const cases = [
  // A code that lives only in the table: a failed lookup must not tell the
  // customer their valid code is invalid. (A named code is also covered by
  // the claim, which a database that cannot be read cannot win.)
  ['a failed lookup is refused, not read as "no record"', 'FLASH1', () => new Response('boom', { status: 500 }), (r) => r.status === 503 && r.body.unavailable === true],
  ['a lookup that throws is refused', 'FLASH1', () => { throw new Error('net'); }, (r) => r.status === 503 && r.body.unavailable === true],
  ['a claim that wins grants the order', 'FLASH1', (u, i) => (i.method === 'PATCH' ? ok([{ ...row, uses_count: 1 }]) : ok([row])),
    (r) => r.status === 200 && r.body.free === true && r.calls.some((c) => c.method === 'PATCH' && /uses_count=eq\.0(&|$)/.test(c.url))],
  ['a claim somebody else won is refused', 'FLASH1', (u, i) => (i.method === 'PATCH' ? ok([]) : ok([row])), (r) => r.status === 503 && r.body.unavailable === true],
  ['a used code is refused before any claim', 'FLASH1', () => ok([{ ...row, uses_count: 1 }]),
    (r) => r.status === 400 && !r.calls.some((c) => c.method !== 'GET')],
  ['a first use that loses the insert is refused', 'BETA-CORE', (u, i) => (i.method === 'POST' ? new Response('dup', { status: 409 }) : ok([])), (r) => r.status === 503],
  ['a first use that wins the insert grants the order', 'BETA-CORE', (u, i) => (i.method === 'POST' ? ok([{ code: 'BETA-CORE', uses_count: 1 }]) : ok([])), (r) => r.status === 200 && r.body.free === true],
];
const fails = [];
for (const [what, code, db, pass] of cases) {
  const r = await run(code, db);
  if (!pass(r)) fails.push(`${what}: got ${r.status} ${JSON.stringify(r.body).slice(0, 100)}; requests ${r.calls.map((c) => c.method + ' ' + c.url.replace('https://db.test/rest/v1/', '')).join(', ')}`);
}
if (fails.length) {
  console.error('[check-promo-claim] ' + fails.length + ' of ' + cases.length + ' outcomes wrong:');
  for (const x of fails) console.error('  ' + x);
  process.exit(1);
}
console.log(`[check-promo-claim] ${cases.length} database outcomes driven through the payment endpoint: a promo use is claimed by compare and swap, and a record that cannot be read is refused rather than read as unused.`);
