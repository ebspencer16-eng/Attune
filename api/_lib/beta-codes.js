/**
 * The beta and named promo codes that are compiled in.
 *
 * ── WHY THIS IS A MODULE ──────────────────────────────────────────────────
 * It was written out twice, in api/create-payment-intent.js and in
 * api/calculate-tax.js, including the same `for (let i = 1; i <= 12; i++)`
 * loop that generates ATTUNE-BETA-01 to ATTUNE-BETA-12. Two copies of one
 * rule, agreeing by luck, in the two endpoints that decide what a cart costs
 * and what tax is owed on it. That is the 198-against-295 bug's exact shape:
 * one of them learning about a new code and the other not would quote one
 * amount and tax another.
 *
 * ── WHAT IS DELIBERATELY NOT HERE ─────────────────────────────────────────
 * The `beta_codes` TABLE, where every code issued since these twelve lives.
 * create-payment-intent reads it; calculate-tax does not and never has, so a
 * code that exists only in the table is unknown to the tax call. That is a
 * real gap and it is written down rather than quietly closed here, because
 * closing it means giving calculate-tax a database read and that is a change
 * to the money path, not a tidy-up.
 */

/** The twelve beta codes, and the named ones that predate them. */
export const COMPILED_BETA_CODES = (() => {
  const codes = {
    'BETA-CORE':            'core',
    'BETA-NEWLYWED':        'newlywed',
    'BETA-ANNIVERSARY':     'anniversary',
    'BETA-PREMIUM':         'premium',
    'ATTUNE-BETA-FEEDBACK': '*',
    'BETA-CORE-1':          { pkg: 'core', mode: 'fixed', amount: 1 },
  };
  /* Zero padded to two digits, so this set is ATTUNE-BETA-01 to
     ATTUNE-BETA-12 and nothing above twelve. A code like ATTUNE-BETA-14 is
     not in here and can only work if somebody added a row to `beta_codes`. */
  for (let i = 1; i <= 12; i++) {
    codes[`ATTUNE-BETA-${String(i).padStart(2, '0')}`] =
      { pkg: 'core', mode: 'free', amount: 0, includesWorkbook: true, workbookVariant: 'digital' };
  }
  return codes;
})();
