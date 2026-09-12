// Fails the build when the app grows a way to buy something.
//
// ── THE RULE, AND WHY IT IS NOT NEGOTIABLE ─────────────────────────────────
// CLAUDE.md: "The app does not sell. Get Started opens the website in the
// system browser. An app that builds a cart and hands it to external payment
// is what Apple rejects for."
//
// The rule was easy to keep while the app had no tools. It gets harder now
// that it has two, because the third thing on that tab is the workbook, and
// the website's page for the workbook is the page that sells it. Sending
// someone there from a tile they tapped is one line, and it is the line that
// fails review.
//
// ── WHAT THIS CHECKS ───────────────────────────────────────────────────────
// No app source names a price, a checkout route, or the add-on purchase view.
// The "Explore more" row is allowed to open /offerings, because that is the
// website's own marketing page opened in the system browser, which is exactly
// what the rule permits and what Get Started already does.

import { readFileSync, readdirSync, statSync } from 'fs';

const ROOT = new URL('..', import.meta.url).pathname;
const DIR = `${ROOT}attune-app/src`;

const files = [];
(function walk(d) {
  for (const e of readdirSync(d)) {
    const p = `${d}/${e}`;
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.tsx?$/.test(p)) files.push(p);
  }
})(DIR);

/** Ways to start a purchase, as this codebase writes them. */
const SELLING = [
  [/\/checkout/, 'links to the checkout'],
  [/view=workbook/, 'opens the website page that sells the workbook'],
  [/\bAdd to cart\b/i, 'offers a cart'],
  [/\$\d+(\.\d\d)?\b/, 'names a price'],
  // `stripe` on its own matched a gradient stripe in three files. A payment
  // provider is named as a package, a host, or an API, not as a noun.
  [/createPaymentIntent|payment_intent|@stripe\/|js\.stripe\.com|loadStripe/i, 'touches payment'],
];

const problems = [];
for (const f of files) {
  const rel = f.replace(ROOT, '');
  const text = readFileSync(f, 'utf8')
    .replace(/\/\*[^]*?\*\//g, ' ')
    .replace(/^\s*\/\/[^\n]*/gm, ' ');
  for (const [re, why] of SELLING) {
    if (!re.test(text)) continue;
    problems.push(`${rel} ${why}.`);
  }
}

if (problems.length) {
  console.error('[check-app-does-not-sell] the app has grown a way to buy something:');
  for (const p of problems) console.error(`  ${p}`);
  console.error('');
  console.error('An app that builds a cart and hands it to external payment is what');
  console.error('Apple rejects for. Opening /offerings in the system browser is fine.');
  process.exit(1);
}

console.log(`[check-app-does-not-sell] ${files.length} app files; none of them sells anything.`);
