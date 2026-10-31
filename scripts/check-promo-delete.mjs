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
 *   2. the delete action touches beta_codes and nothing else, and switches
 *      the code off and marks it rather than removing the row (A213);
 *   3. a deleted code is refused by checkout's check and by payment.
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
  if ([...new Set(tables)].join() !== 'beta_codes') fails.push(`deleting a code touches ${tables.join(', ') || 'nothing'}; it should touch beta_codes alone`);
  if (!/\.update\(stamp\)\.eq\('code', code\)/.test(block)) fails.push('the delete is not limited to the one code');
  // A213: removing the row let a built-in copy of the code show through and
  // go on working. It has to be switched off and marked, not removed.
  if (/\.delete\(\)/.test(block)) fails.push('deleting a code removes its row, so a built-in copy of the same code takes its place and stays accepted');
  if (!/active: false, deleted_at/.test(block)) fails.push('a deleted code is not switched off and marked deleted_at');
}
const vp = strip(readFileSync(ROOT + 'api/validate-promo.js', 'utf8'));
if (!/row\?\.deleted_at\) return json\(\{ valid: false/.test(vp)) fails.push('checkout\'s code check accepts a deleted code');
const cpi = strip(readFileSync(ROOT + 'api/create-payment-intent.js', 'utf8'));
if (!/\|\| dbRow\?\.deleted_at\)/.test(cpi)) fails.push('payment accepts a deleted code');
/* 4. A deleted code can be added again (Ellie deleted CONGRATSMYA and the
   form said it already existed). The form refuses a name only when its row is
   live, and asks the server to revive a deleted one; the server clears the
   mark and the count only when asked. The page is read by what it compares,
   not by whether the words appear. */
{
  const page = readFileSync(ROOT + 'public/admin.html', 'utf8');
  if (!/const revive = !!\(existing && existing\.deleted_at\);\s*\n\s*if \(existing && !revive\) \{ err\.textContent/.test(page)) fails.push('the add-code form refuses a name whose row was deleted, so a deleted code can never be added back');
  if (!/\.\.\.\(revive \? \{ revive: true \} : \{\}\)/.test(page)) fails.push('the add-code form does not ask the server to revive a deleted code');
  const up = (src.match(/if \(body\.action === 'beta_upsert'\) \{([\s\S]*?)\n    \}/) || [])[1] || '';
  if (!/if \(row\.revive === true\) \{ clean\.deleted_at = null; clean\.uses_count = 0; \}/.test(up)) fails.push('beta_upsert does not clear a deleted code\'s mark and count when reviving it, so a re-added code stays deleted');
  if ((up.match(/deleted_at/g) || []).length !== 1) fails.push('beta_upsert touches deleted_at somewhere other than the revive line');
}
if (fails.length) { console.error('[check-promo-delete] ' + fails.length + ' problem(s):'); for (const f of fails) console.error('  ' + f); process.exit(1); }
console.log(`[check-promo-delete] deleting a code touches beta_codes alone, none of the ${GRANTERS.length} modules that decide access reads that table, and a deleted code can be added back.`);
