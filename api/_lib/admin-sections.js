/**
 * The admin's pages, once.
 *
 * ── WHY THIS EXISTS ───────────────────────────────────────────────────────
 * Ellie: "Build admin into Carolina's and my apps as a button in settings that
 * asks for our 4-digit pin... Build a home page that has the left nav (in an
 * insights menu style list)."
 *
 * That left nav is seventeen anchors written out in public/admin.html. The app
 * needs the same seventeen, and an Expo project cannot import from api/, so the
 * obvious move is to type them again in the app and let the two drift. This
 * repo has that bug in its bones: the exercise list lived in a dozen places, the
 * In Practice articles in two, and the shorter copy always wins.
 *
 * So the list is here, the app receives it on /api/home, and
 * check-admin-sections.mjs holds public/admin.html's nav to it. Add a page to
 * the admin and the app's menu has it without an app release.
 *
 * ── WHAT THE KEY IS ───────────────────────────────────────────────────────
 * The argument `showPage()` takes, which is also the hash the page is reachable
 * at. The app opens `/admin#<key>` in its in-app browser, so these are
 * addresses rather than labels: renaming one breaks a link.
 */

/** @type {{ key: string, label: string }[]} */
export const ADMIN_SECTIONS = [
  { key: 'overview', label: 'Dashboard' },
  { key: 'packages', label: 'Package Mix' },
  { key: 'promos', label: 'Promo Analytics' },
  { key: 'orders', label: 'Orders' },
  { key: 'responses', label: 'Responses' },
  { key: 'types', label: 'Type Analytics' },
  { key: 'explore', label: 'Explore' },
  { key: 'engagement', label: 'Engagement' },
  { key: 'demographics', label: 'Demographics' },
  { key: 'satisfaction', label: 'Feedback Overview' },
  { key: 'feedback-survey', label: 'Feedback Survey' },
  { key: 'feedback', label: 'Beta Feedback' },
  { key: 'testimonials', label: 'Testimonials' },
  { key: 'survey-explorer', label: 'Survey Explorer' },
  { key: 'posts', label: 'In Practice' },
  { key: 'ux-views', label: 'UX Views' },
  { key: 'env', label: 'Environment' },
];
