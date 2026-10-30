#!/usr/bin/env node
/**
 * check-buyer-email-case: an order's buyer email is written in lower case.
 *
 * Sign-in stores addresses in lower case, and everything that finds a buyer's
 * order by address compares exactly: the orders row rule, the website's
 * restore, the purchase gate, entitlements, core ownership. Checkout and the
 * Stripe webhook wrote the address as typed, so "Jane@Example.com" bought an
 * order no lookup could find (A202, from the sweep of email values in
 * database URLs).
 *
 * Two halves. Every object property `buyer_email:` written on the server or
 * the website lower-cases its value, unless the value is null. And migration
 * 102's trigger, which holds the rule in the database whoever writes, is
 * still in the tree. The trigger is the guarantee once it has run; the code
 * half is what holds until it has, and for any other database.
 *
 * Planted: the toLowerCase removed from the checkout write, and from either
 * webhook write; the trigger statement removed. All fail it.
 *
 * WHAT IT CANNOT SEE: shorthand (`{ buyer_email }`) and a body built by
 * assigning `row.buyer_email = x`. Neither spelling exists here today; the
 * trigger covers both regardless once migration 102 has run.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const files = [];
const walk = (d) => { for (const e of readdirSync(d)) { const p = join(d, e); if (statSync(p).isDirectory()) { if (e !== 'node_modules') walk(p); } else if (/\.(m?js|jsx|html)$/.test(e)) files.push(p); } };
for (const d of ['api', 'src', 'public']) walk(join(ROOT, d));

const fails = [];
let writes = 0;
for (const f of files) {
  const src = readFileSync(f, 'utf8');
  // Blank comments so a sentence about the column is not read as a write.
  const code = src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')).replace(/(^|[^:'"`])\/\/[^\n]*/g, (m, p) => p + ' '.repeat(m.length - p.length));
  for (const m of code.matchAll(/['"]?buyer_email['"]?\s*:\s*([^\n]*)/g)) {
    const value = m[1].replace(/,\s*$/, '').trim();
    if (/^null\b/.test(value)) continue;
    writes++;
    if (!/toLowerCase\(\)|lower\(/.test(value)) {
      fails.push(`${f.replace(ROOT, '')}:${code.slice(0, m.index).split('\n').length} writes buyer_email as given: ${value.slice(0, 80)}`);
    }
  }
}

const mig = readFileSync(join(ROOT, 'supabase/migrations/102_buyer_email_lowercase.sql'), 'utf8');
if (!/create trigger orders_buyer_email_lower\s+before insert or update of buyer_email on public\.orders/i.test(mig)) {
  fails.push('supabase/migrations/102_buyer_email_lowercase.sql no longer creates the lower-casing trigger on orders.');
}
if (writes === 0) fails.push('Found no buyer_email writes at all. The scan has lost its subject; it must not report success.');

if (fails.length) {
  console.error('[check-buyer-email-case] ' + fails.length + ' problem(s):');
  for (const x of fails) console.error('  ' + x);
  process.exit(1);
}
console.log(`[check-buyer-email-case] ${writes} buyer_email writes, all lower case; the database trigger is in migration 102.`);
