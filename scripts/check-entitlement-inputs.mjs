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
// This checks the fields that grant: the package and every add-on column, and
// it checks four ways of reading one, because for a long time it checked one.
//
//   body.pkg                                  named outright
//   const { pkg } = body                      destructured
//   const b = await req.json(); b.pkg         the body under another name
//   for (const f of ADDONS) row[f] = body[f]  through a list, naming none
//
// Only the first was implemented. The second was named in a comment here as
// though it were covered and never was, which is worse than not mentioning it:
// the comment is what anyone reads to decide the gate is thorough.

import { readFileSync, readdirSync } from 'fs';

const apiDir = new URL('../api/', import.meta.url);

// The columns that decide what someone owns.
const GRANTING = ['pkg', 'pkg_key', 'is_comp', 'entitlements',
  'addon_reflection', 'addon_budget', 'addon_checklist',
  'addon_intimacy', 'addon_conflict', 'addon_workbook'];

// Where a request's own values live.
const FROM_REQUEST = String.raw`(?:body|payload|params|searchParams|req\.body|url\.searchParams\.get)`;

/**
 * Names bound to the request body in this file.
 *
 * `body` is the convention here, but it is a convention and not a rule, and a
 * gate that only knows the convention only catches code that followed it.
 * `const b = await req.json()` then `b.pkg` read the same value.
 */
function requestNames(text) {
  const names = new Set(['body', 'payload', 'params', 'searchParams']);
  for (const m of text.matchAll(/\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:await\s+)?(?:req|request)\.(?:json\(\)|body)/g)) {
    names.add(m[1]);
  }
  return names;
}

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
    const names = [...requestNames(text)].join('|');
    const FROM = `(?:${names}|req\\.body|url\\.searchParams\\.get)`;

    /**
     * Does this file keep a list of granting columns?
     *
     * `for (const f of ADDONS) row[f] = body[f]` grants every add-on in the
     * list and writes none of their names down. The read is invisible to any
     * pattern looking for `body.addon_intimacy`, which is the same blind spot
     * the privacy gates had. What gives it away is the list: a file that names
     * granting columns in an array literal and then indexes the request by a
     * variable is doing exactly this.
     *
     * Scoped to files carrying such a list on purpose. api/send-email.js reads
     * `body[f]` over a list of URL fields, which is fine and must stay quiet.
     */
    const listsGrants = GRANTING.some(
      (f) => new RegExp(`\\[[^\\]]*['"]${f}['"]`).test(text) || new RegExp(`['"]${f}['"][^\\]]*\\]`).test(text),
    );

    text.split('\n').forEach((line, i) => {
      if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;

      // A granting column pulled out of the request by a computed key.
      if (listsGrants && new RegExp(`\\b${FROM}\\s*\\??\\.?\\[\\s*[A-Za-z_$]`).test(line)) {
        problems.push({
          at: `api/${rel}:${i + 1}`,
          field: 'a granting column, by computed key',
          line: line.trim().slice(0, 90),
        });
        return;
      }

      for (const field of GRANTING) {
        // body.pkg, body['pkg'], or a query param.
        const patterns = [
          new RegExp(`${FROM}\\??\\.${field}\\b`),
          new RegExp(`${FROM}\\[['"]${field}['"]\\]`),
          new RegExp(`get\\(['"]${field}['"]\\)`),
        ];
        // Destructured straight off it: const { pkg, ... } = body.
        // The old rule named this case in a comment and implemented none of it,
        // so `const { pkg } = body` granted a package past the gate written to
        // stop exactly that.
        const destructured = new RegExp(
          `\\{[^}]*\\b${field}\\b[^}]*\\}\\s*=\\s*${FROM}\\b`,
        );
        if (patterns.some((re) => re.test(line)) || destructured.test(line)) {
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
