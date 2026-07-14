/* Attune launch flags — shared by every static page.
 *
 * Flip these to change what the site offers. Nothing physical or LMFT-related
 * is deleted; these flags gate it so it can be re-enabled in one place.
 *
 *   PHYSICAL_ENABLED  false = digital-only (phase 1). Hides the digital/physical
 *                     toggle, shipping, and physical pricing; forces every order
 *                     to the digital variant. Set true for phase 2.
 *   LMFT_ENABLED      false = the licensed-therapist session is discontinued.
 *                     Hides every LMFT surface site-wide.
 *
 * The React app (src/App.jsx) carries the same two flags; keep them in sync.
 */
window.ATTUNE_FLAGS = {
  PHYSICAL_ENABLED: false,
  LMFT_ENABLED: false,
};
