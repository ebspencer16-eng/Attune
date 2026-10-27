/**
 * An order, with everything that names a person taken off it.
 *
 * ── WHY ───────────────────────────────────────────────────────────────────
 * Ellie, of the admin's banner: "To ship a box? What do you need?"
 *
 * The honest answer turned out to be nothing. The banner promises "No names,
 * email addresses, or personally identifiable information are present in any
 * dataset shown here", and api/admin-data.js reads the orders table with
 * `select('*')`, so buyer_name, buyer_email, both partner names and the full
 * shipping address crossed the wire into the browser on every admin load.
 *
 * Nothing drew them. The Fulfilment page was removed on purpose in 92b3e2fb,
 * and everything that read those columns went with it in all but name:
 * renderFulfillmentTable writes to a tbody that is not in the markup,
 * markStatus is called only from inside that table, and exportOrdersCSV and
 * exportFulfillmentCSV are each defined once and called by nothing. The
 * server-side CSV export has no identifying column at all.
 *
 * So the data was being sent for readers that no longer exist. Stripping it is
 * what makes the banner true as written, rather than asking Ellie to narrow a
 * sentence to fit code nobody runs.
 *
 * ── WHY A PATTERN AND NOT A LIST ──────────────────────────────────────────
 * A list of columns to remove is a list maintained by hand somewhere the
 * table cannot see, which is the failure this codebase is organised against:
 * add `recipient_phone` tomorrow and the list is quietly wrong. The rule is
 * stated instead, as what a column is ABOUT, and the named set below is there
 * to be checked against the pattern rather than to replace it.
 *
 * ── WHAT IT DELIBERATELY KEEPS ────────────────────────────────────────────
 * `user_id`, which is a random uuid and is how an order reaches its couple;
 * the state and country, which are a region rather than an address and are
 * what the geography tile draws; and `promo_code`, which names a code and not
 * a person. The banner's own words are "Records are identified by random UUID
 * only", which is exactly what is left.
 */

/** Column names that are about a person rather than about an order. */
export const IDENTIFYING = /(^|_)(name|email|phone|address|street|city|zip|postcode|postal|recipient|gift_message)($|_)/i;

/**
 * The columns this rule is known to remove today. Not the mechanism: the
 * pattern is. This exists so a reader can see what the rule catches, and so
 * check-admin-order-privacy can prove the pattern still catches them.
 */
export const KNOWN_IDENTIFYING = [
  'buyer_name', 'buyer_email', 'partner1_name', 'partner2_name',
  'shipping_address', 'shipping_city', 'shipping_zip',
  'billing_address', 'billing_city', 'billing_zip',
  'recipient_phone', 'gift_message',
];

/**
 * Columns that stay, and are about a place rather than a person.
 *
 * This was written as an exception list, with a Set the strip consulted
 * before the pattern. check-admin-order-privacy rejected it on the first run:
 * the pattern does not match `state` or `country`, so the Set was never
 * reached and the exception guarded nothing while reading as a safety
 * mechanism. A constant that exists is not a thing that runs.
 *
 * So it is a record rather than a mechanism now. The pattern draws the line,
 * `shipping_city` on one side of it and `shipping_state` on the other, and
 * the gate asserts both halves of that: these names must NOT match the
 * pattern, and these columns must still be in the answer.
 */
export const KEPT = ['shipping_state', 'shipping_country', 'billing_state', 'billing_country'];

/** One order row, stripped. Returns a new object; the input is untouched. */
export function withoutIdentifying(order) {
  if (!order || typeof order !== 'object') return order;
  const out = {};
  for (const [k, v] of Object.entries(order)) {
    if (IDENTIFYING.test(k)) continue;
    out[k] = v;
  }
  return out;
}

/** Every order in a list, stripped. */
export function ordersWithoutIdentifying(orders) {
  return (Array.isArray(orders) ? orders : []).map(withoutIdentifying);
}
