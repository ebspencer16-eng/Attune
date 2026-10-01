#!/usr/bin/env node
/**
 * api/_lib/env-inventory.js: every environment variable the server reads.
 *
 * ── WHY ───────────────────────────────────────────────────────────────────
 * Ellie, after setting WORKBOOK_SERVICE_URL: "when I clicked to edit, it did
 * not show that there was a value I was replacing, just an empty value box...
 * I want to make sure there aren't other empty en vars in my vercel."
 *
 * There is no way to answer that by reading Vercel's screen, because a variable
 * marked Sensitive shows an empty box whether or not it has a value. The only
 * place that can tell the difference is the running server. So the server
 * answers it, through /api/admin-env, and this is the list it checks against.
 *
 * Generated rather than typed, because a hand-written list of variables is the
 * list that goes stale the first time someone adds one, and a missing variable
 * that nothing asks about is exactly the failure being chased here.
 *
 * ── WHAT COUNTS AS REQUIRED ───────────────────────────────────────────────
 * Not decided here. A variable is required if the code refuses to work without
 * it, and that is a judgement, so REQUIRED below is a hand-kept list of the ones
 * whose absence breaks a feature outright. Everything else is reported as
 * optional, which is honest: "unset" on an optional variable is information,
 * not an alarm.
 *
 * Run: node scripts/build-env-inventory.mjs
 * Held current by: check-env-inventory.mjs
 */

import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const OUT = `${ROOT}api/_lib/env-inventory.js`;

/**
 * Variables whose absence breaks something a customer would notice.
 *
 * Kept by hand because "required" is a judgement about behaviour, not something
 * a scanner can see. A name here that the scan does not find fails the build:
 * that is a variable nothing reads any more, and it would sit on this list
 * telling Ellie to go and set something pointless.
 */
const REQUIRED = new Set([
  'SUPABASE_URL',
  'SUPABASE_SERVICE_KEY',
  'SUPABASE_ANON_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'RESEND_API_KEY',
  'WORKBOOK_SERVICE_URL',
  'WORKBOOK_SERVICE_SECRET',
  'ADMIN_SECRET',
]);

/**
 * Names that are alternatives for one another, not separate settings.
 *
 * `process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY ||
 * process.env.SUPABASE_SERVICE_ROLE` is one credential written three ways, and
 * fifty files read it through that chain. Listed flat, two of the three would
 * show as unset on a perfectly healthy deployment, which is worse than not
 * reporting them: it sends Ellie to set a variable that must not be set twice.
 *
 * So the group is one row, satisfied by any member.
 */
const ALIASES = {
  SUPABASE_SERVICE_KEY: ['SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_ROLE'],
};
const ALIAS_OF = new Map();
for (const [canon, alts] of Object.entries(ALIASES)) {
  for (const a of alts) ALIAS_OF.set(a, canon);
}

/** What a reader should be told a variable is for, where it is not obvious. */
const NOTE = {
  WORKBOOK_SERVICE_URL: 'The PDF builder on Render. Without it the workbook fails instantly.',
  WORKBOOK_SERVICE_SECRET: 'The password that service asks for.',
  STRIPE_WEBHOOK_SECRET: 'Without it, paid orders are never recorded.',
  RESEND_API_KEY: 'Without it, no email is sent at all.',
  SUPABASE_SERVICE_KEY: 'The server\'s own database key. Everything needs it.',
  ADMIN_SECRET: 'The admin sign-in.',
  BROWSERLESS_TOKEN: 'Optional. Without it the workbook prints in the browser instead.',
  GOOGLE_BOOKS_KEY: 'Optional. Only the quotation check uses it, and only here.',
};

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(js|mjs)$/.test(name)) out.push(p);
  }
  return out;
}

/**
 * Both spellings. `process.env.NAME` is the common one; `process.env['NAME']`
 * and a destructured `const { NAME } = process.env` are the two a scan written
 * against the first would miss, and this file exists because a missing variable
 * went unnoticed.
 */
const found = new Map();
const files = walk(join(ROOT, 'api'));
for (const file of files) {
  const src = readFileSync(file, 'utf8');
  const rel = file.slice(ROOT.length);
  const add = (name) => {
    if (!/^[A-Z][A-Z0-9_]*$/.test(name)) return;
    if (name === 'NODE_ENV' || name === 'VERCEL_ENV' || name === 'VERCEL_URL') return;
    if (!found.has(name)) found.set(name, new Set());
    found.get(name).add(rel);
  };
  for (const m of src.matchAll(/process\.env\.([A-Za-z_][A-Za-z0-9_]*)/g)) add(m[1]);
  for (const m of src.matchAll(/process\.env\[\s*['"]([^'"]+)['"]\s*\]/g)) add(m[1]);
  for (const m of src.matchAll(/const\s*\{([^}]+)\}\s*=\s*process\.env/g)) {
    for (const part of m[1].split(',')) add(part.split(':')[0].trim());
  }
}

const missingRequired = [...REQUIRED].filter((n) => !found.has(n));
if (missingRequired.length) {
  console.error(`[build-env-inventory] REQUIRED names that nothing under api/ reads:`
    + ` ${missingRequired.join(', ')}.\n  Either the code stopped using them or the list is`
    + ' stale. Refusing to write a list that tells Ellie to set something pointless.');
  process.exit(1);
}

const names = [...found.keys()].filter((n) => !ALIAS_OF.has(n)).sort();
const rows = names.map((name) => {
  const readers = [...found.get(name)].sort();
  const note = NOTE[name] ? `, note: ${JSON.stringify(NOTE[name])}` : '';
  const alts = (ALIASES[name] || []).filter((a) => found.has(a));
  const also = alts.length ? `, alsoAccepts: ${JSON.stringify(alts)}` : '';
  return `  { name: ${JSON.stringify(name)}, required: ${REQUIRED.has(name)},`
    + ` readBy: ${JSON.stringify(readers.slice(0, 4))}${also}${note} },`;
});

const doc = `/**
 * Every environment variable the server reads. GENERATED: do not edit.
 *
 * Written by scripts/build-env-inventory.mjs, held current by
 * check-env-inventory.mjs. /api/admin-env reports which of these have a value
 * in the running deployment, and never reports a value.
 *
 * Ellie: "I want to make sure there aren't other empty en vars in my vercel."
 * Vercel shows an empty box for any variable marked Sensitive, whether or not
 * it has a value, so the screen cannot answer that question and the server can.
 */

export const ENV_VARS = [
${rows.join('\n')}
];

export const REQUIRED_ENV = ENV_VARS.filter((v) => v.required).map((v) => v.name);
`;

if (doc.length < 500) {
  console.error('[build-env-inventory] refusing to write a list this short.');
  process.exit(1);
}
const before = (() => { try { return readFileSync(OUT, 'utf8'); } catch { return null; } })();
writeFileSync(OUT, doc);
console.log(`[build-env-inventory] ${names.length} variables across ${files.length} files`
  + ` (${REQUIRED.size} required)${before === doc ? ' (unchanged)' : ''}`);
