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

/**
 * One reading of a `beta_codes` row.
 *
 * ── WHY ──────────────────────────────────────────────────────────────────
 * Both endpoints read this table and they read DIFFERENT COLUMNS of it.
 * create-payment-intent took `includes_intimacy`, `includes_reflection`,
 * `includes_budget` and `includes_checklist`; calculate-tax took only
 * `includes_workbook`. So a code bundling Reflection free charged nothing for
 * it and taxed forty dollars of it: quoted one amount, charged another, which
 * is the 198-against-295 bug in the live money path.
 *
 * A row is turned into a code's terms here, once, and both endpoints read the
 * answer. The guard rails that only matter at purchase, `max_uses`,
 * `expires_at`, `bound_emails` and `active`, stay in create-payment-intent:
 * a tax preview does not refuse anything.
 */
export function codeMetaFromRow(row) {
  if (!row) return null;
  return {
    pkg: row.package_key || '*',
    mode: row.discount_mode || 'free',
    amount: Number(row.discount_value) || 0,
    appliesTo: row.applies_to || 'package',
    includesWorkbook: !!row.includes_workbook,
    workbookVariant: row.workbook_variant || 'digital',
    includesIntimacy: !!row.includes_intimacy,
    includesReflection: !!row.includes_reflection,
    includesBudget: !!row.includes_budget,
    includesChecklist: !!row.includes_checklist,
  };
}

/** The add-ons a code gives away, as the flags both endpoints use. */
export function bundledAddons(codeMeta) {
  const m = codeMeta || {};
  return {
    workbook: !!m.includesWorkbook,
    intimacy: !!m.includesIntimacy,
    reflection: !!m.includesReflection,
    budget: !!m.includesBudget,
    checklist: !!m.includesChecklist,
  };
}
