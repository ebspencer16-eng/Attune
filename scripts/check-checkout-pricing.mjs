// Fails the build if checkout's two price functions disagree about which
// add-ons exist.
//
// public/checkout.html carries two independent price calculations:
// itemPrice() inside renderSummary(), which drives what the customer sees, and
// cartItemPrice(), which drives the payment intent. They are near-identical
// copies of each other.
//
// When the How You Fight add-on was wired, cartItemPrice learned about it and
// itemPrice did not. Everything computed correctly while the button showed the
// wrong number, so a customer would have been quoted $89 and charged $129, or
// the reverse. Nothing failed. The build passed. The only symptom was a total
// that looked slightly off.
//
// The right fix is one function. Until then, this makes the two impossible to
// leave out of step.

import { readFileSync } from 'fs';

const src = readFileSync(new URL('../public/checkout.html', import.meta.url), 'utf8');

/** Add-on keys a price function charges for, from its `it.addons.X` reads. */
function addonsPriced(fnSource) {
  const keys = new Set(
    [...fnSource.matchAll(/it\.addons\.([a-zA-Z]+)/g)].map(m => m[1]).filter(k => k !== 'workbookVariant'),
  );
  // Both functions charge for the workbook, but by different routes: one reads
  // it.addons.workbook, the other calls wbCharge(it), which reads the same
  // field internally. Same outcome, different spelling, so normalise rather
  // than reporting a difference that is not one.
  if (/wbCharge\(/.test(fnSource)) keys.add('workbook');
  return [...keys].sort();
}

function extract(name) {
  const start = src.indexOf(`function ${name}(it)`);
  if (start < 0) return null;
  // Read to the function's closing return, which both of these end with.
  const end = src.indexOf('return base + add;', start);
  if (end < 0) return null;
  return src.slice(start, end);
}

const summary = extract('itemPrice');
const cart = extract('cartItemPrice');

if (!summary || !cart) {
  console.error('[check-checkout-pricing] could not find both price functions in checkout.html.');
  console.error('If one was removed in favour of a single shared function, delete this check.');
  process.exit(1);
}

const a = addonsPriced(summary);
const b = addonsPriced(cart);
const onlyDisplay = a.filter(k => !b.includes(k));
const onlyCharge = b.filter(k => !a.includes(k));

if (onlyDisplay.length || onlyCharge.length) {
  console.error('[check-checkout-pricing] the two price functions disagree:');
  if (onlyDisplay.length) console.error(`  shown to the customer but not charged: ${onlyDisplay.join(', ')}`);
  if (onlyCharge.length) console.error(`  charged but not shown to the customer: ${onlyCharge.join(', ')}`);
  console.error(`  itemPrice (display): ${a.join(', ')}`);
  console.error(`  cartItemPrice (charge): ${b.join(', ')}`);
  console.error('Add the missing add-on to both, or the quoted total will not match the charge.');
  process.exit(1);
}

console.log(`[check-checkout-pricing] both price functions charge for the same ${a.length} add-ons: ${a.join(', ')}.`);
