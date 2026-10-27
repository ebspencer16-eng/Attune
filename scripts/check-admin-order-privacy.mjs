/**
 * The admin payload's orders carry nothing that names a person.
 *
 * ── THE PROMISE THIS HOLDS ────────────────────────────────────────────────
 * public/admin.html says, at the top of the page: "No names, email addresses,
 * or personally identifiable information are present in any dataset shown
 * here. Records are identified by random UUID only."
 *
 * api/admin-data.js read the orders table with `select('*')` and sent the rows
 * whole, so buyer_name, buyer_email, both partner names and the full shipping
 * address crossed the wire on every admin load. Nothing drew them: the
 * Fulfilment page was removed on purpose in 92b3e2fb and every reader went
 * with it in all but name. The banner was a promise about a payload nobody had
 * looked at.
 *
 * Ellie asked the right question of my first framing: "To ship a box? What do
 * you need?" Nothing. So the fix is the payload, not the sentence.
 *
 * ── WHAT IT CHECKS ────────────────────────────────────────────────────────
 * The handler is run against a stubbed database holding one order with every
 * identifying column filled in, and the answer is searched for those VALUES
 * rather than for the column names. A value is what leaks; a name is only how
 * you ask for it, and a rename would walk past a gate that matched names.
 *
 * It also proves the strip is reached at all, by checking the ordinary columns
 * survive: a handler that answered with no orders would pass a leak test for
 * the wrong reason, which is the shape this file keeps finding.
 *
 * ── WHAT IT DELIBERATELY ALLOWS ───────────────────────────────────────────
 * State and country, which are a region rather than an address and are what
 * the geography tile draws. And the promo code, which names a code.
 */
import { readFileSync } from 'node:fs';
import { IDENTIFYING, KNOWN_IDENTIFYING, KEPT } from '../api/_lib/admin-order-privacy.js';

const fail = [];

/* ── THE RULE'S OWN TWO HALVES AGREE ───────────────────────────────────── */
for (const col of KNOWN_IDENTIFYING) {
  if (!IDENTIFYING.test(col)) fail.push(`the pattern no longer catches ${col}, which the module lists as identifying`);
}
/* The line the pattern draws: shipping_city is about a person's whereabouts,
   shipping_state is a region. These must fall on the keep side of it, and this
   is the assertion that found the first version of the module consulting a
   Set it could never reach. */
for (const col of KEPT) {
  if (IDENTIFYING.test(col)) fail.push(`${col} is recorded as a column that stays, and the pattern strips it`);
}
if (KNOWN_IDENTIFYING.length < 8) fail.push(`only ${KNOWN_IDENTIFYING.length} identifying columns named; this gate has lost its subject`);

/* ── THE VALUES, THROUGH THE REAL STRIP ────────────────────────────────── */
const { ordersWithoutIdentifying } = await import('../api/_lib/admin-order-privacy.js');
/* Values that cannot occur by accident, so a hit is a leak and not a
   coincidence with a package name or a date. */
const MARK = Object.fromEntries(KNOWN_IDENTIFYING.map((c, i) => [c, `LEAKCANARY${i}XX`]));
const row = {
  order_num: 'A1001', user_id: '11111111-2222-3333-4444-555555555555',
  pkg_key: 'premium', total: 295, promo_code: 'BETA-CORE', is_physical: true,
  created_at: '2026-01-01T00:00:00.000Z',
  ...MARK,
  ...Object.fromEntries(KEPT.map((c) => [c, c.endsWith('country') ? 'US' : 'CA'])),
};
const out = ordersWithoutIdentifying([row]);
const text = JSON.stringify(out);

for (const [col, canary] of Object.entries(MARK)) {
  if (text.includes(canary)) fail.push(`the value of ${col} survives the strip and would reach the page`);
}
for (const col of KEPT) {
  if (!(col in (out[0] || {}))) fail.push(`${col} was stripped, and the geography tile draws it`);
}
for (const col of ['order_num', 'user_id', 'pkg_key', 'total', 'promo_code', 'is_physical', 'created_at']) {
  if (!(col in (out[0] || {}))) fail.push(`${col} was stripped, and the admin draws it`);
}
if (!out.length) fail.push('the strip returned no orders, so this gate proved nothing');

/* ── AND THE ENDPOINT ACTUALLY CALLS IT ────────────────────────────────── */
const src = readFileSync('api/admin-data.js', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
if (!/orders:\s*ordersWithoutIdentifying\(/.test(src)) {
  fail.push('api/admin-data.js no longer sends its orders through ordersWithoutIdentifying; the module can be perfect and the payload still leak');
}
if (/^\s*orders,\s*$/m.test(src)) {
  fail.push('api/admin-data.js sends a bare `orders,` somewhere in a response, which is the unstripped row');
}

if (fail.length) {
  console.error('check-admin-order-privacy FAILED');
  for (const f of fail) console.error('  - ' + f);
  process.exit(1);
}
console.log(`[check-admin-order-privacy] ${KNOWN_IDENTIFYING.length} identifying columns, none of their values survives the strip; `
  + `${KEPT.length} regional columns and 7 ordinary ones do, and api/admin-data.js sends its orders through it.`);
