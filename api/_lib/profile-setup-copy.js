/**
 * The words on profile setup.
 *
 * ── WHY THIS IS A MODULE ──────────────────────────────────────────────────
 * Ellie: "Users should be encouraged to set up their account in the app."
 *
 * Setup only existed on the website, so the app's answer to a signed-in
 * person with no profile was "Finish setting up on the website and this will
 * fill in." Building the screen means the same four labels and the same
 * explanation exist twice, unless they live here.
 *
 * Ellie's, verbatim from the website's panel.
 *
 * ── WHY IT IS SERVED RATHER THAN BUNDLED ──────────────────────────────────
 * The app reaches this screen precisely when /api/home has answered 404, so
 * it cannot carry the copy. GET /api/create-profile returns it, which needs no
 * session and gives nothing away: it is four field labels.
 */
export const PROFILE_SETUP_COPY = {
  title: 'Your profile',
  why: 'Attune uses names and pronouns to personalize your results, making insights feel specific to you two.',
  yourName: 'Your name',
  yourNamePlaceholder: 'Your first name',
  partnerName: "Partner's name",
  partnerNamePlaceholder: "Partner's first name",
  partnerEmailPlaceholder: "Partner's email (for invite)",
};
