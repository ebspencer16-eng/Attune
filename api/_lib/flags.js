/**
 * Launch flags. One copy, read by everything.
 *
 * ── WHY THIS FILE EXISTS ──────────────────────────────────────────────────
 * These three facts lived in four places, all maintained by hand:
 *
 *   public/_flags.js          window.ATTUNE_FLAGS, for the static pages
 *   src/App.jsx               APP_BANNER_ENABLED, APP_STORE_URL, PHYSICAL_ENABLED
 *   api/send-order-email.js   APP_LIVE, the same fact under a third name
 *   api/create-payment-intent.js  PHYSICAL_ENABLED, from an env var
 *
 * Every one of them carried a comment telling the next person to keep it in
 * sync with the others, which is the shape CLAUDE.md names as the most common
 * bug in this codebase. src/App.jsx went further and said "Nothing else needs
 * changing", with three other copies in the tree.
 *
 * It has not bitten yet because every flag is false. It was going to bite on
 * the day the app reaches the App Store, when four files and an environment
 * variable have to change together and one of them is an email template
 * nobody looks at until a customer says the link is dead.
 *
 * ── HOW EACH SURFACE READS IT ─────────────────────────────────────────────
 * src/App.jsx and the api/ handlers import this module directly. The static
 * pages cannot import anything, so scripts/build-flags.mjs writes the values
 * into public/_flags.js and check-flags.mjs fails the build if that file or
 * any other copy has drifted. Same pattern as PKG_CAPS to public/_pkg-rules.js.
 */

/**
 * Is the app in the App Store?
 *
 * One fact, three former names. It gates the portal banner, the static-site
 * banner, and the download line in the order email. Off until the listing is
 * real: a banner promising an app that does not exist is worse than no banner,
 * and a store link that 404s reads as a broken product.
 *
 * When it ships, this line and APP_STORE_URL below are the whole change.
 */
export const APP_LIVE = false;

/** The listing. Ends in idPENDING until there is one. */
export const APP_STORE_URL = 'https://apps.apple.com/app/attune-relationships/idPENDING';

/**
 * Printed and shipped package variants.
 *
 * Phase 1 launches digital-only. Off hides the digital/physical toggle,
 * shipping and physical pricing everywhere, and forces every order to the
 * digital variant. Nothing physical is deleted, so phase 2 is this line.
 *
 * api/create-payment-intent.js enforces it server-side as well, so a crafted
 * or stale request cannot bill for a disabled offering, and accepts
 * ATTUNE_PHYSICAL_ENABLED=1 as an override that can be flipped without a
 * deploy. The override can only turn it on.
 */
export const PHYSICAL_ENABLED = false;

/**
 * The shape the static pages read, as window.ATTUNE_FLAGS.
 *
 * APP_BANNER_ENABLED is APP_LIVE under the name those pages already use. The
 * key is kept so this is a change of source, not a change of contract.
 */
export const ATTUNE_FLAGS = {
  PHYSICAL_ENABLED,
  APP_BANNER_ENABLED: APP_LIVE,
  APP_STORE_URL,
};
