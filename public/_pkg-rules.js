/* GENERATED FILE. Do not edit.
 *
 * Source: api/_lib/entitlements.js PKG_CAPS, api/_catalogue.js SHOP_NAMES
 * Regenerate: node scripts/build-pkg-rules.mjs  (runs automatically on build)
 *
 * Which add-ons each package already includes. Every static page reads this
 * rather than restating it, because four hand-kept copies is how the start
 * flow ended up offering an add-on the package already bundled.
 */
window.ATTUNE_PKG_INCLUDED = {
  "core": {
    "reflection": false,
    "budget": false,
    "checklist": false,
    "intimacy": false,
    "conflict": false,
    "workbook": false
  },
  "newlywed": {
    "reflection": false,
    "budget": true,
    "checklist": true,
    "intimacy": false,
    "conflict": false,
    "workbook": false
  },
  "anniversary": {
    "reflection": true,
    "budget": false,
    "checklist": false,
    "intimacy": false,
    "conflict": false,
    "workbook": false
  },
  "premium": {
    "reflection": true,
    "budget": true,
    "checklist": false,
    "intimacy": false,
    "conflict": true,
    "workbook": true
  }
};

/* What each add-on is called where it is bought: api/_catalogue.js SHOP_NAMES.
   Checkout's summary reads these, so the receipt says what the shop said. */
window.ATTUNE_SHOP_NAMES = {
  "reflection": "Relationship Reflection",
  "intimacy": "Physical Intimacy Expectations",
  "conflict": "Conflict Patterns",
  "workbook": "Personalized Workbook",
  "budget": "Build a Budget",
  "checklist": "Merging Lives Checklist"
};

/** True when this package already includes that add-on. */
window.attuneIncludedInPkg = function (pkg, addon) {
  var r = window.ATTUNE_PKG_INCLUDED[pkg];
  return !!(r && r[addon]);
};
