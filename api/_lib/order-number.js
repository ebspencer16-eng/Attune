/**
 * The one place an order number is made.
 *
 * ── WHY ───────────────────────────────────────────────────────────────────
 * A paid order was numbered twice. Checkout showed the customer, emailed them
 * and put in their setup link `ATT-<date>-<last four of the payment id>`; the
 * Stripe webhook, given no number in the metadata, stored the row under
 * `ATT-<date>-<four random characters>`. So the number a customer held matched
 * no order: /api/claim-order answered "order not found" for every card
 * purchase, and the account was linked only if the email matched exactly,
 * which an Apple relay address never does (A202). The free-promo path had
 * already been fixed this way, by returning the numbers it wrote; the paid
 * path never was.
 *
 * Now /api/create-payment-intent mints the number before the payment exists,
 * puts it in the payment's metadata, and returns it. Checkout shows what it
 * was given and the webhook stores what the metadata says, so the two are one
 * value. And a retried webhook delivery carries the same number, so the order
 * row's unique number refuses the second insert instead of the random one
 * letting it through.
 *
 * Six characters from a 32-letter alphabet with no 0/O or 1/I, so a number
 * read aloud over email survives: about a billion per day.
 */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** `ATT-YYYYMMDD-XXXXXX`, the date in UTC. */
export function mintOrderNumber(now = new Date()) {
  const d = now.toISOString().slice(0, 10).replace(/-/g, '');
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  let tail = '';
  for (const b of bytes) tail += ALPHABET[b % ALPHABET.length];
  return `ATT-${d}-${tail}`;
}

/**
 * The number for a payment created before this module existed, so it has no
 * number in its metadata. The same derivation checkout used to show the
 * customer, from the payment itself rather than from the clock at delivery:
 * a retry of that delivery gets the same answer.
 */
export function legacyOrderNumber(intent) {
  const at = Number.isFinite(intent?.created) ? new Date(intent.created * 1000) : new Date();
  return `ATT-${at.toISOString().slice(0, 10).replace(/-/g, '')}-${String(intent?.id || '').slice(-4).toUpperCase()}`;
}
