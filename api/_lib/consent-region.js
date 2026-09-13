/**
 * Where a visitor is, to the extent that decides which privacy rule applies.
 *
 * ── WHY ───────────────────────────────────────────────────────────────────
 * The published privacy policy says: "If you are accessing the Service from
 * the European Union or United Kingdom, a consent banner will be presented to
 * you upon first visit."
 *
 * What existed was a notice with no Accept button, shown to everyone, and its
 * own comment argued correctly that US state law is opt-out and a wall is the
 * wrong answer there. Both things are true. They are different jurisdictions
 * and the product only had one answer.
 *
 * ── THE LIST ──────────────────────────────────────────────────────────────
 * The 27 EU member states, the United Kingdom, and the three EEA countries
 * that apply the GDPR (Iceland, Liechtenstein, Norway). Switzerland is
 * included too: its revised FADP is close enough that treating a Swiss
 * visitor as a US one is the wrong way to be wrong.
 *
 * A country we cannot determine is treated as consent-required. Unknown is
 * not the same as the US, and the safer default costs an EU visitor one
 * banner and a US visitor nothing they were not already seeing.
 */

export const CONSENT_REQUIRED_COUNTRIES = new Set([
  // EU 27
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR',
  'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK',
  'SI', 'ES', 'SE',
  // United Kingdom
  'GB',
  // EEA, which applies the GDPR
  'IS', 'LI', 'NO',
  // Switzerland, under the revised FADP
  'CH',
]);

/**
 * Does this country need consent before anything optional runs?
 *
 * An empty or unknown country answers true. See above: unknown is not the US.
 */
export function consentRequired(country) {
  const code = String(country || '').trim().toUpperCase();
  if (!code || code === 'XX') return true;
  return CONSENT_REQUIRED_COUNTRIES.has(code);
}
