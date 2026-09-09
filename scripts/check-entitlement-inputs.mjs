// Fails the build when an endpoint takes an entitlement from the request.
//
// /api/create-profile accepted `pkg` from the body, allowlisted to the four
// package names, and profiles.pkg is a grant source: api/_lib/entitlements.js
// folds it in alongside real orders and grant-only merging never removes it.
// The website passed the value through from the URL, so signing up at
// ?pkg=premium granted premium permanently. No payment, no order row.
//
// An entitlement is something a payment establishes. It can be read from an
// order, from a comp flag, or from a partner who has one. It can never be read
// from the caller, because the caller is the person who benefits.
//
// This checks the fields that grant: the package and every add-on column.

import { readFileSync, readdirSync } from 'fs';

const apiDir = new URL('../api/', import.meta.url);

// The columns that decide what someone owns.
const GRANTING = ['pkg', 'pkg_key', 'is_comp', 'entitlements',
  'addon_reflection', 'addon_budget', 'addon_checklist',
  'addon_intimacy', 'addon_conflict', 'addon_workbook'];

// Where a request's own values live.
const FROM_REQUEST = String.raw`(?:body|payload|params|searchParams|req\.body|url\.searchParams\.get)`;

const problems = [];

// Reads an order row, or Stripe's webhook payload, which is where entitlements
// legitimately come from. Both are named, not inferred.
const EXEMPT = new Set([
  // The webhook IS the payment. Its body is Stripe's, signature-verified.
  'stripe-webhook.js',
  // Builds a PaymentIntent from a cart before any entitlement exists.
  'create-payment-intent.js',
  // The engine itself: it reads pkg_key off order rows it was handed.
  '_lib/entitlements.js',
  // Admin tooling, behind ADMIN_SECRET, where granting is the job.
  'admin-actions.js', 'admin-csv.js', 'admin-data.js', 'admin-explore.js',
  // Renders a QR card's redirect URL and writes nothing. The pkg it reads
  // decides what the printed card says, not what anyone owns. Verified: the
  // file contains no database call at all.
  'generate-card.js',
]);

function scan(dir, prefix = '') {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) { scan(new URL(`${entry.name}/`, dir), `${prefix}${entry.name}/`); continue; }
    if (!entry.name.endsWith('.js')) continue;
    const rel = `${prefix}${entry.name}`;
    if (EXEMPT.has(rel)) continue;

    const text = readFileSync(new URL(entry.name, dir), 'utf8');
    text.split('\n').forEach((line, i) => {
      if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
      for (const field of GRANTING) {
        // body.pkg, body['pkg'], destructured { pkg } = body, or a query param.
        const patterns = [
          new RegExp(`${FROM_REQUEST}\\??\\.${field}\\b`),
          new RegExp(`${FROM_REQUEST}\\[['"]${field}['"]\\]`),
          new RegExp(`get\\(['"]${field}['"]\\)`),
        ];
        if (patterns.some((re) => re.test(line))) {
          problems.push({ at: `api/${rel}:${i + 1}`, field, line: line.trim().slice(0, 90) });
        }
      }
    });
  }
}
scan(apiDir);

if (problems.length) {
  console.error('[check-entitlement-inputs] entitlements taken from the caller:');
  for (const p of problems) console.error(`  ${p.at}  reads ${p.field}\n    ${p.line}`);
  console.error('');
  console.error('Derive it from an order, a comp flag, or a linked partner. The caller');
  console.error('is the person who benefits, so the caller cannot be the source.');
  process.exit(1);
}

console.log(`[check-entitlement-inputs] no endpoint reads an entitlement from the request (${GRANTING.length} fields checked).`);
