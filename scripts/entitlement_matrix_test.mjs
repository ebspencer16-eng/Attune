/**
 * Entitlement matrix test.
 *
 * Runs every package / add-on / device scenario through the real entitlement
 * pipeline (api/_lib/entitlements.js) and the real dashboard gate logic, and
 * asserts the user sees exactly what they bought.
 *
 * Run: node scripts/entitlement_matrix_test.mjs
 */

import { computeEntitlements, mergeEntitlementsGrantOnly, PKG_CAPS } from '../api/_lib/entitlements.js';

// Mirror of pkgConfig in src/App.jsx (verified against source).
const pkgConfig = {
  core:        { hasChecklist: false, hasAnniversary: false, hasBudget: false, hasLMFT: false },
  newlywed:    { hasChecklist: true,  hasAnniversary: false, hasBudget: true,  hasLMFT: false },
  anniversary: { hasChecklist: false, hasAnniversary: true,  hasBudget: false, hasLMFT: false },
  premium:     { hasChecklist: false, hasAnniversary: false, hasBudget: false, hasLMFT: true  },
};

// Mirror of the dashboard's `pkg` object construction.
function gates(order) {
  const base = pkgConfig[order.pkgKey] || pkgConfig.core;
  return {
    checklist:   base.hasChecklist   || !!order.addonChecklist,
    lmft:        base.hasLMFT        || !!order.addonLmft,
    reflection:  base.hasAnniversary || !!order.addonReflection,
    budget:      base.hasBudget      || !!order.addonBudget,
    workbook:    order.pkgKey === 'premium' || !!order.addonWorkbook,
    intimacy:    !!order.addonIntimacy,
  };
}

const toOrder = (ent) => ({
  pkgKey: ent.pkg, addonLmft: ent.addonLmft, addonReflection: ent.addonReflection,
  addonBudget: ent.addonBudget, addonChecklist: ent.addonChecklist,
  addonIntimacy: ent.addonIntimacy, addonWorkbook: ent.addonWorkbook,
});

let pass = 0, fail = 0;
function check(name, got, want) {
  const keys = Object.keys(want);
  const bad = keys.filter(k => got[k] !== want[k]);
  if (bad.length === 0) { pass++; console.log(`  PASS  ${name}`); }
  else {
    fail++;
    console.log(`  FAIL  ${name}`);
    for (const k of bad) console.log(`          ${k}: got ${got[k]}, want ${want[k]}`);
  }
}

const F = { checklist:false, lmft:false, reflection:false, budget:false, workbook:false, intimacy:false };

console.log('\n— Fresh device (no localStorage): entitlements from DB only —');

// 1. Ellie's real row.
check('premium + refl/budget/checklist add-ons',
  gates(toOrder(computeEntitlements([
    { order_num:'ATT-1', pkg_key:'premium', addon_reflection:true, addon_budget:true, addon_checklist:true, created_at:'2026-06-24' },
  ], {}))),
  { ...F, reflection:true, budget:true, checklist:true, lmft:true, workbook:true });

// 2. Bare core.
check('core, no add-ons',
  gates(toOrder(computeEntitlements([{ order_num:'C1', pkg_key:'core', created_at:'2026-01-01' }], {}))),
  { ...F });

// 3. Package-inherent capabilities.
check('newlywed (checklist + budget inherent)',
  gates(toOrder(computeEntitlements([{ order_num:'N1', pkg_key:'newlywed', created_at:'2026-01-01' }], {}))),
  { ...F, checklist:true, budget:true });

check('anniversary (reflection inherent)',
  gates(toOrder(computeEntitlements([{ order_num:'A1', pkg_key:'anniversary', created_at:'2026-01-01' }], {}))),
  { ...F, reflection:true });

check('premium alone (lmft + workbook only)',
  gates(toOrder(computeEntitlements([{ order_num:'P1', pkg_key:'premium', created_at:'2026-01-01' }], {}))),
  { ...F, lmft:true, workbook:true });

// 4. Every single add-on on top of core.
for (const [flag, gate] of [
  ['addon_reflection','reflection'], ['addon_budget','budget'],
  ['addon_checklist','checklist'], ['addon_lmft','lmft'], ['addon_intimacy','intimacy'],
]) {
  check(`core + ${flag}`,
    gates(toOrder(computeEntitlements([{ order_num:'X', pkg_key:'core', [flag]:true, created_at:'2026-01-01' }], {}))),
    { ...F, [gate]:true });
}

check('core + workbook add-on',
  gates(toOrder(computeEntitlements([{ order_num:'W', pkg_key:'core', addon_workbook:'digital', created_at:'2026-01-01' }], {}))),
  { ...F, workbook:true });

console.log('\n— Multiple orders: union, never newest-wins —');

check('premium+addons (old) + core test order (new)',
  gates(toOrder(computeEntitlements([
    { order_num:'REAL', pkg_key:'premium', addon_reflection:true, addon_budget:true, addon_checklist:true, created_at:'2026-05-01' },
    { order_num:'TEST', pkg_key:'core', created_at:'2026-06-30' },
  ], {}))),
  { ...F, reflection:true, budget:true, checklist:true, lmft:true, workbook:true });

check('two separate add-on purchases accumulate',
  gates(toOrder(computeEntitlements([
    { order_num:'B1', pkg_key:'core', addon_budget:true, created_at:'2026-01-01' },
    { order_num:'B2', pkg_key:'core', addon_checklist:true, created_at:'2026-02-01' },
  ], {}))),
  { ...F, budget:true, checklist:true });

console.log('\n— Comp accounts (no order rows at all) —');

check('comp grants everything',
  gates(toOrder(computeEntitlements([], { is_comp:true }))),
  { checklist:true, lmft:true, reflection:true, budget:true, workbook:true, intimacy:true });

console.log('\n— Invitee (Partner B) inherits Partner A\'s orders —');

check('invitee inherits premium + add-ons via partner link',
  gates(toOrder(computeEntitlements([
    { order_num:null, pkg_key:null, created_at:null },                       // invitee profile row: no grants
    { order_num:'ATT-1', pkg_key:'premium', addon_reflection:true, addon_budget:true, addon_checklist:true, created_at:'2026-06-24' }, // Partner A's order
  ], {}))),
  { ...F, reflection:true, budget:true, checklist:true, lmft:true, workbook:true });

console.log('\n— Returning device: resync must never strip local grants —');

const localAcct = { pkg:'premium', addonReflection:true, addonBudget:true, addonChecklist:true, addonLmft:true };
const dbSaysCore = computeEntitlements([{ order_num:'C1', pkg_key:'core', created_at:'2026-06-01' }], {});
check('local premium+addons vs DB core → keeps grants',
  gates(toOrder(mergeEntitlementsGrantOnly(localAcct, dbSaysCore))),
  { ...F, reflection:true, budget:true, checklist:true, lmft:true, workbook:true });

console.log('\n— PKG_CAPS must mirror pkgConfig —');
for (const key of Object.keys(pkgConfig)) {
  const c = PKG_CAPS[key], p = pkgConfig[key];
  check(`PKG_CAPS.${key} matches pkgConfig.${key}`,
    { checklist:c.hasChecklist, reflection:c.hasReflection, budget:c.hasBudget, lmft:c.hasLmft },
    { checklist:p.hasChecklist, reflection:p.hasAnniversary, budget:p.hasBudget, lmft:p.hasLMFT });
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
