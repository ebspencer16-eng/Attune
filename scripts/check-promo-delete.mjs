#!/usr/bin/env node
/**
 * check-promo-delete: deleting a promo code takes nothing from anyone who
 * used it (A208f).
 *
 * Ellie: the bin "should delete the promo code row from the table, but should
 * not revoke access from the users who used that code". That is true only
 * while nothing that decides what somebody owns reads the codes table: access
 * is computed from orders, which keep the code's name in promo_code. So:
 *   1. no module that grants access reads beta_codes;
 *   2. the delete action touches beta_codes and nothing else.
 * Planted: entitlements.js reading beta_codes, and the delete also clearing
 * orders.promo_code. Both fail it.
 */
import { readFileSync } from 'node:fs';
const ROOT = new URL('..', import.meta.url).pathname;
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const fails = [];
const GRANTERS = ['api/_lib/entitlements.js', 'api/_lib/ownership.js', 'api/_lib/purchase-gate.js', 'api/_lib/results-gate.js', 'api/_lib/owns-core.js', 'api/_lib/refund-order.js'];
for (const f of GRANTERS) {
  if (/beta_codes/.test(strip(readFileSync(ROOT + f, 'utf8')))) fails.push(`${f} reads beta_codes, so deleting a code could change what somebody owns`);
}
const src = strip(readFileSync(ROOT + 'api/admin-actions.js', 'utf8'));
const block = (src.match(/if \(body\.action === 'beta_delete'\) \{([\s\S]*?)\n    \}/) || [])[1];
if (!block) fails.push('could not find the beta_delete action in api/admin-actions.js; the gate has lost its subject');
else {
  const tables = [...block.matchAll(/\.from\('([a-z_]+)'\)/g)].map((m) => m[1]);
  if (tables.join() !== 'beta_codes') fails.push(`deleting a code touches ${tables.join(', ') || 'nothing'}; it should touch beta_codes alone`);
  if (!/\.delete\(\)\.eq\('code', code\)/.test(block)) fails.push('the delete is not limited to the one code');
}
if (fails.length) { console.error('[check-promo-delete] ' + fails.length + ' problem(s):'); for (const f of fails) console.error('  ' + f); process.exit(1); }
console.log(`[check-promo-delete] deleting a code touches beta_codes alone, and none of the ${GRANTERS.length} modules that decide access reads that table.`);
