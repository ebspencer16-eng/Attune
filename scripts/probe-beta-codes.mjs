#!/usr/bin/env node
/**
 * A beta code on a bare cart skips Stripe, writes an order, and issues a
 * number.
 *
 * This is the path a demo walks instead of typing a card, and if it breaks the
 * person demoing is asked to pay. Measured by counting Stripe calls, because a
 * clientSecret coming back IS the symptom.
 *
 *   node scripts/probe-beta-codes.mjs
 *
 * All five codes take the free path; a paid add-on beside one correctly
 * charges for the add-on alone.
 *
 * It also counts the emails the ENDPOINT sends, which is zero, and that is
 * right: the confirmation is fired by public/checkout.html after the order
 * lands, one request per item, on the free path as well as the paid one. The
 * first run of this probe reported five broken orders on the strength of
 * looking in the wrong place.
 */

process.env.SUPABASE_URL = 'https://example.invalid';
process.env.SUPABASE_SERVICE_KEY = 'k';
process.env.SUPABASE_SERVICE_ROLE = 'k';
process.env.STRIPE_SECRET_KEY = 'sk_test_not_real';
process.env.RESEND_API_KEY = 're_not_real';

const ROOT = '/Users/Ellie/Projects/unison/';
let stripeCalls = 0;
let orderWrites = 0;
/* The step a demo cannot do without: the email carrying the link to set the
   account up. A free order that writes a row and sends nothing leaves the
   buyer with an order and no way in. */
let emails = [];
globalThis.fetch = async (u, init) => {
  const url = String(u && u.url ? u.url : u);
  const method = (init && init.method) || 'GET';
  const j = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'content-type': 'application/json' } });
  if (/stripe\.com/.test(url)) {
    stripeCalls += 1;
    if (/tax\/calculations/.test(url)) return j({ id: 'taxcalc_1', tax_amount_exclusive: 0, amount_total: 0 });
    return j({ id: 'pi_1', client_secret: 'pi_1_secret', amount: 0 });
  }
  if (/resend/.test(url)) {
    let to = '', subject = '';
    try { const b2 = JSON.parse(init.body || '{}'); to = b2.to; subject = b2.subject || ''; } catch {}
    emails.push(`${to} :: ${subject}`);
    return j({ id: 'e1' });
  }
  if (/\/rest\/v1\/orders/.test(url) && (method === 'POST' || method === 'PATCH')) { orderWrites += 1; return j([{ id: 'o1', order_number: 'ATN-1' }]); }
  if (/\/rest\/v1\//.test(url)) return j([]);
  return j({});
};

const mod = await import(ROOT + 'api/create-payment-intent.js');
const run = async (label, body) => {
  stripeCalls = 0; orderWrites = 0; emails = [];
  const res = await mod.default(new Request('https://www.attune-relationships.com/api/create-payment-intent', {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  }));
  const text = await res.text();
  let p = null; try { p = JSON.parse(text); } catch {}
  const free = !!(p && (p.free || p.noCharge || p.orderNumber) && !p.clientSecret);
  const emailCount = emails.length;
  console.log(`${label.padEnd(44)} HTTP ${res.status}  stripe ${stripeCalls}  orders ${orderWrites}  emails ${emails.length}`);
  for (const e of emails) console.log(`             sent: ${e}`);
  console.log(`  ${free ? 'FREE PATH' : 'CHARGED  '}  ${text.slice(0, 150)}`);
  return { free, stripeCalls, emails: emailCount, p };
};

const CODES = ['BETA-CORE', 'BETA-NEWLYWED', 'BETA-ANNIVERSARY', 'BETA-PREMIUM', 'ATTUNE-BETA-FEEDBACK'];
const bad = [];
for (const code of CODES) {
  const pkg = code === 'ATTUNE-BETA-FEEDBACK' ? 'core' : code.replace('BETA-', '').toLowerCase();
  const out = await run(`${code} on a bare ${pkg} cart`, {
    promoCode: code, buyerEmail: 'designer@example.com',
    items: [{ pkgKey: pkg, partner1Name: 'Designer', partner2Name: 'Partner' }],
  });
  if (out.stripeCalls > 0) bad.push(`${code} on a bare cart still called Stripe ${out.stripeCalls} time(s)`);
  /* NOT an assertion about email. The endpoint sends none and that is right:
     public/checkout.html fires /api/send-order-email once per item after the
     order lands, on the free path as well as the paid one, unguarded. This
     probe reported five broken orders until that was traced. */
  if (out.emails > 0) bad.push(`${code} sent ${out.emails} email(s) from the endpoint, which is a second sender`);
}
console.log('\nwith a paid add-on beside it, a charge is correct:');
const paid = await run('BETA-CORE + checklist', {
  promoCode: 'BETA-CORE', buyerEmail: 'designer@example.com',
  items: [{ pkgKey: 'core', addonChecklist: true }],
});
if (paid.stripeCalls === 0) bad.push('a cart with a paid add-on took the free path');

console.log('\nthe confirmation email is fired by public/checkout.html after the order,');
console.log('one request per item, on the free path too. This probe only checks that the');
console.log('endpoint is not a second sender.');
console.log(bad.length ? `\n${bad.length} problem(s):` : '\nno problems');
for (const b of bad) console.log('  ', b);
