/**
 * Where the site lives. One copy.
 *
 * ── WHY ───────────────────────────────────────────────────────────────────
 * `process.env.SITE_URL || 'https://...'` was written out in five handlers and
 * the fallback did not agree with itself: stripe-webhook said www, while
 * generate-card, generate-pdf, store-workbook and generate-workbook-promo said
 * the apex. Two more modules kept their own constant (next-action's SITE,
 * email-footer's BASE), both www.
 *
 * So with SITE_URL unset, the same order produced a www link in the receipt
 * and an apex link on the QR card printed for the box.
 *
 * ── WHY IT MATTERS WHICH ──────────────────────────────────────────────────
 * The apex answers every request with a 307 to www. A browser follows that
 * without anyone noticing, which is why every apex link in the tree "works".
 *
 * CLAUDE.md carries the rule and the reason: "The API base URL is
 * https://www.attune-relationships.com. Keep the www." It was written after a
 * sign-in bug that cost four rounds of code reading, where the 307 from the
 * apex stripped the Authorization header. check-email-links.mjs already
 * enforces it for outbound mail, because an image proxy is not a browser and
 * may not follow a redirect at all. A QR code printed on a physical card is
 * the same bet, made permanent.
 *
 * SITE_URL still overrides, for previews and for any environment that is not
 * production. Only the fallback lives here.
 */
export const SITE_URL = process.env.SITE_URL || 'https://www.attune-relationships.com';
