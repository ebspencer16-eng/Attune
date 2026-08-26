// Fails the build if the add-on params src/App.jsx sends to checkout are not
// the ones public/checkout.html actually reads.
//
// This exists because a mismatch here is silent and costs money. UPSELL_PRODUCTS
// carried a cartParam field whose values ("anniversary" for reflection,
// "newlywed" for checklist) were not params checkout accepts. It was unused, but
// it looked exactly like the field the URL should be built from, and had anyone
// switched to it the customer would have paid the package price, seen no error,
// and never received the add-on they clicked.
//
// Both sides are read from source rather than restated here, so this cannot
// drift on its own.

import { readFileSync } from 'fs';

const app = readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8');
const checkout = readFileSync(new URL('../public/checkout.html', import.meta.url), 'utf8');

// What App claims checkout accepts.
const listMatch = app.match(/const CHECKOUT_ADDON_PARAMS = \[([^\]]*)\]/);
if (!listMatch) {
  console.error('[check-addon-params] CHECKOUT_ADDON_PARAMS not found in src/App.jsx');
  process.exit(1);
}
const claimed = [...listMatch[1].matchAll(/["']([a-z_]+)["']/g)].map(m => m[1]).sort();

// What checkout actually reads.
const accepted = [...new Set(
  [...checkout.matchAll(/params\.get\(\s*['"]addon_([a-z_]+)['"]\s*\)/g)].map(m => m[1]),
)].sort();

// Every product the upsell modal can open.
const upsellStart = app.indexOf('const UPSELL_PRODUCTS = {');
const upsellEnd = app.indexOf('\n};', upsellStart);
const products = [...app.slice(upsellStart, upsellEnd).matchAll(/^  ([a-z]+): \{/gm)].map(m => m[1]).sort();

let failed = false;
const report = (label, missing) => {
  if (!missing.length) return;
  failed = true;
  console.error(`[check-addon-params] ${label}: ${missing.join(', ')}`);
};

report('App claims params checkout does not read', claimed.filter(p => !accepted.includes(p)));
report('checkout reads params App does not list', accepted.filter(p => !claimed.includes(p)));
report('upsell products with no matching checkout param', products.filter(p => !accepted.includes(p)));

// A leftover field that looks like the one the URL should be built from.
if (/cartParam\s*:/.test(app)) {
  failed = true;
  console.error('[check-addon-params] cartParam is back in UPSELL_PRODUCTS. Its values are not checkout params; building a URL from it drops the add-on silently.');
}

if (failed) {
  console.error(`  App lists:      ${claimed.join(', ')}`);
  console.error(`  checkout reads: ${accepted.join(', ')}`);
  console.error(`  upsell products: ${products.join(', ')}`);
  process.exit(1);
}
console.log(`[check-addon-params] ${accepted.length} add-on params match across App and checkout; ${products.length} upsell products covered.`);
