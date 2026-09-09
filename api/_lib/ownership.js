/**
 * What a couple owns, from their profile row.
 *
 * ── WHY THIS FILE ─────────────────────────────────────────────────────────
 * The rule lived in /api/home. Results needed the same answer to decide which
 * sections exist, and the obvious move was to write it out again there. That
 * is how this codebase gets its bugs: /api/home already had a stale copy once,
 * telling a premium buyer they owned Physical Intimacy and never telling them
 * they owned Conflict Patterns, because premium bundles conflict and not
 * intimacy and one of the two copies had not been told.
 *
 * Packages and add-ons both grant. An add-on column grants on any package, and
 * a package grants what it bundles, so every question here is an OR.
 */

import { PKG_CAPS } from './entitlements.js';

/**
 * What a package includes on its own, before any add-on.
 *
 * Read straight off PKG_CAPS, which is already the one place that says what
 * each package contains and is already gated against pkgConfig on the website.
 * The admin export needs this separately from capabilitiesFor because its
 * whole job is telling the two apart: what someone got in the box, and what
 * they paid extra for afterwards.
 */
export function packageIncludes(pkgKey) {
  const cap = PKG_CAPS[pkgKey || 'core'] || PKG_CAPS.core;
  return {
    checklist: !!cap.hasChecklist,
    budget: !!cap.hasBudget,
    reflection: !!cap.hasReflection,
    conflict: !!cap.hasConflict,
    workbook: !!cap.hasWorkbook,
  };
}

/** Every capability, keyed the way the exercise registry names them. */
export function capabilitiesFor(profile) {
  const p = profile || {};
  // A profile names its package `pkg` and an order row names it `pkg_key`.
  // Both carry the same addon_ columns, so both can be answered here, and the
  // workbook and admin code that works from orders does not need its own copy.
  const pkg = p.pkg || p.pkg_key || 'core';

  // ── WHAT EACH PACKAGE BUNDLES COMES FROM PKG_CAPS ────────────────────────
  // These lines used to name the packages themselves: `pkg === 'premium' ||
  // pkg === 'newlywed'`. That is package inclusion, written out a second time,
  // in a file that is not PKG_CAPS. It happened to agree, and nothing checked
  // that it did. Package inclusion living in four places is the bug CLAUDE.md
  // opens with, and this was the fourth place.
  //
  // Change what a package includes in PKG_CAPS and this follows. An add-on
  // flag on the profile grants on top, as it always did.
  const caps = PKG_CAPS[pkg] || PKG_CAPS.core;
  const ownsReflection = !!caps.hasReflection || !!p.addon_reflection;
  // Intimacy is add-on only on every package, so no capability bundles it.
  const ownsIntimacy = !!caps.hasIntimacy || !!p.addon_intimacy;
  const ownsConflict = !!caps.hasConflict || !!p.addon_conflict;
  const ownsBudget = !!caps.hasBudget || !!p.addon_budget;
  const ownsChecklist = !!caps.hasChecklist || !!p.addon_checklist;
  const ownsWorkbook = !!caps.hasWorkbook || !!p.addon_workbook;

  return {
    pkg,
    ownsReflection, ownsIntimacy, ownsConflict,
    ownsBudget, ownsChecklist, ownsWorkbook,

    // Keyed by the `capability` field in api/_exercises.js, so ownership is a
    // lookup rather than a branch per exercise.
    caps: {
      hasAnniversary: ownsReflection,
      hasIntimacy: ownsIntimacy,
      hasConflict: ownsConflict,
    },

    // Flat, for surfaces asking "what do they have" rather than "how far
    // through are they".
    owned: [
      ownsReflection && 'reflection',
      ownsIntimacy && 'intimacy',
      ownsConflict && 'conflict',
      ownsBudget && 'budget',
      ownsChecklist && 'checklist',
      ownsWorkbook && 'workbook',
    ].filter(Boolean),
  };
}

/** The columns any caller must select for capabilitiesFor to be truthful. */
export const OWNERSHIP_COLUMNS = [
  'pkg',
  'addon_reflection', 'addon_intimacy', 'addon_conflict',
  'addon_budget', 'addon_checklist', 'addon_workbook',
];
