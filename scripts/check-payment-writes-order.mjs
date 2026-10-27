/**
 * A paid Stripe webhook writes an order row, and an unsigned one writes nothing.
 *
 * ── WHY THIS EXISTS ───────────────────────────────────────────────────────
 * The payment path has never once run in production. Everything downstream of
 * it is covered: entitlements, the cart price, what each package includes, the
 * emails. The one step nobody had executed is the step where money becomes a
 * row, and a product whose checkout quietly fails to record a sale has no
 * symptom until somebody asks why they cannot see their results.
 *
 * ── WHY IT DRIVES RATHER THAN READS ───────────────────────────────────────
 * Reading api/stripe-webhook.js finds a plausible insert. So did reading
 * api/admin-posts.js, which had never worked, and api/_lib/feedback's
 * supabaseStore, which was correct and called by nothing. A definition without
 * a call is not a feature and it reads like one. This signs an event the way
 * Stripe signs one, calls the handler, and counts what reached the database.
 *
 * ── THE TWO HALVES ────────────────────────────────────────────────────────
 * A signed event must write exactly one order carrying the package, the
 * amount and the add-ons. An event with a bad signature, and one signed
 * outside the tolerance window, must write nothing: that guard was added after
 * a period when anyone could POST a forged payment_intent.succeeded and mint a
 * paid order, and a guard nobody executes is a guard nobody knows still works.
 *
 * The write has to be able to HAPPEN for the ordering to be visible, which is
 * why the environment gets credentials that reach a stubbed fetch rather than
 * none at all. check-open-writes learned that the hard way: with no
 * credentials the write is skipped, so moving the guard below it changed
 * nothing and the plant walked through.
 */
import { createHmac } from 'node:crypto';

const fail = [];
const ENV = {
  STRIPE_WEBHOOK_SECRET: 'whsec_test_000',
  SUPABASE_URL: 'https://stub.supabase.test',
  SUPABASE_SERVICE_ROLE: 'service_test_key',
};
for (const [k, v] of Object.entries(ENV)) process.env[k] = v;
/* The handler reaches for Stripe's tax API when this is set, which is a
   different endpoint and not what is under test. */
delete process.env.STRIPE_SECRET_KEY;

const META = {
  pkgKey: 'premium', buyerName: 'Buyer', partner1Name: 'A', partner2Name: 'B',
  isGift: '', isPhysical: '', addonWorkbook: 'digital', addonReflection: '1',
  addonBudget: '', addonChecklist: '', addonIntimacy: '', addonConflict: '1',
};
const AMOUNT = 29500;

const event = (over = {}) => ({
  id: 'evt_test', type: 'payment_intent.succeeded',
  data: { object: {
    id: 'pi_test_123', amount: AMOUNT, currency: 'usd',
    receipt_email: 'buyer@example.test', metadata: { ...META }, ...over,
  } },
});

const sign = (body, { secret = ENV.STRIPE_WEBHOOK_SECRET, skewSec = 0 } = {}) => {
  const t = Math.floor(Date.now() / 1000) - skewSec;
  const v1 = createHmac('sha256', secret).update(`${t}.${body}`).digest('hex');
  return `t=${t},v1=${v1}`;
};

/** Run the handler with fetch stubbed, and report what it tried to send. */
async function drive(body, signature) {
  const calls = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), method: (init.method || 'GET').toUpperCase(), body: init.body });
    /* Plausible answers, so a failure downstream is the handler's doing and
       not the stub refusing to play. */
    return new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } });
  };
  let res, threw = null;
  try {
    const mod = await import('../api/stripe-webhook.js?t=' + Math.random());
    res = await mod.default(new Request('https://attune.test/api/stripe-webhook', {
      method: 'POST', body, headers: { 'stripe-signature': signature, 'Content-Type': 'application/json' },
    }));
  } catch (e) { threw = e; }
  globalThis.fetch = realFetch;
  const orderWrites = calls.filter((c) => c.method === 'POST' && /\/rest\/v1\/orders(\?|$)/.test(c.url));
  return { calls, orderWrites, status: res ? res.status : null, threw };
}

/* ── A SIGNED EVENT WRITES ONE ORDER ───────────────────────────────────── */
{
  const body = JSON.stringify(event());
  const r = await drive(body, sign(body));
  if (r.threw) fail.push('the handler threw on a signed event: ' + r.threw.message);
  if (r.status !== 200) fail.push(`a signed event answered ${r.status}, not 200`);
  if (r.orderWrites.length !== 1) {
    fail.push(`a signed payment wrote ${r.orderWrites.length} order rows, not 1.`
      + ` It reached ${r.calls.length} url(s): ${[...new Set(r.calls.map((c) => c.url.replace(/\?.*/, '')))].join(', ') || 'none'}`);
  } else {
    let row;
    try { row = JSON.parse(r.orderWrites[0].body); } catch { row = null; }
    if (!row || typeof row !== 'object') fail.push('the order insert body is not an object');
    else {
      /* The things that decide what the couple gets. A row written without
         them is a sale recorded as something else. */
      if (row.pkg_key !== META.pkgKey) fail.push(`the order was written with pkg_key ${JSON.stringify(row.pkg_key)}, not ${META.pkgKey}`);
      if (Number(row.total) !== AMOUNT / 100) fail.push(`the order total is ${row.total}, not ${AMOUNT / 100}`);
      if (!row.order_num) fail.push('the order has no order_num, which is what makes the insert idempotent on a Stripe retry');
      if (row.addon_reflection !== true) fail.push('addon_reflection was paid for and the row does not carry it');
      if (row.addon_conflict !== true) fail.push('addon_conflict was paid for and the row does not carry it');
      if (!row.addon_workbook) fail.push('addon_workbook was paid for and the row does not carry it');
    }
  }
}

/* ── AN UNSIGNED OR STALE EVENT WRITES NOTHING ─────────────────────────── */
for (const [label, signature] of [
  ['no signature header at all', ''],
  ['a signature from the wrong secret', null],
  ['a correctly signed event from six minutes ago', null],
]) {
  const body = JSON.stringify(event());
  const sig = signature !== null ? signature
    : label.includes('wrong secret') ? sign(body, { secret: 'whsec_not_ours' })
    : sign(body, { skewSec: 360 });
  const r = await drive(body, sig);
  if (r.orderWrites.length) fail.push(`${label}: wrote ${r.orderWrites.length} order row(s). This path mints a paid order from a forged request.`);
  if (r.status === 200) fail.push(`${label}: answered 200, which tells a forger the request was accepted`);
}

if (fail.length) {
  console.error('check-payment-writes-order FAILED');
  for (const f of fail) console.error('  - ' + f);
  process.exit(1);
}
console.log('[check-payment-writes-order] a signed payment_intent.succeeded writes exactly one order row carrying its package, '
  + 'total and three add-ons; an unsigned one, one signed with the wrong secret, and one signed six minutes ago each write none.');
