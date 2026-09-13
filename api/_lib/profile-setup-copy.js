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


/**
 * "Tell us about yourselves", and the five questions under it.
 *
 * ── WHY IT MOVED HERE ─────────────────────────────────────────────────────
 * These were typed into src/App.jsx and nowhere else, so the website's signup
 * asked them and the app's profile setup did not. Ellie: "Users should be
 * encouraged to set up their account in the app", and "Ideally, a user
 * purchases online then downloads the app and only uses the app from that
 * point." Every person who takes that path answers none of these, and the
 * Demographics page is built on exactly these six columns.
 *
 * Gender is the sixth and is not asked. api/admin-explore.js and the admin's
 * own loader both derive it from the pronouns someone chose, and they say so
 * on the tile.
 *
 * The words are Ellie's, moved from src/App.jsx unchanged, and the website
 * imports them from here now.
 *
 * The keys are the body fields api/create-profile.js already accepts. It has
 * accepted all five since it was written; nothing was sending them.
 */
export const ABOUT_YOU = {
  title: 'Tell us about yourselves',
  why: 'Helps us understand who Attune serves. Responses are kept separately from names and emails, and only ever used in aggregate.',
  fields: [
    { key: 'ageRange', label: 'Your age range', options: [
      ['', 'Prefer not to say'], ['18-24', '18\u201324'], ['25-34', '25\u201334'],
      ['35-44', '35\u201344'], ['45-54', '45\u201354'], ['55+', '55 or older'],
    ] },
    { key: 'relationshipStatus', label: 'Relationship status', options: [
      ['', 'Prefer not to say'], ['dating', 'Dating / together'], ['engaged', 'Engaged'],
      ['married', 'Married'], ['remarried', 'Remarried'], ['partnership', 'Domestic partnership'],
    ] },
    { key: 'relationshipLength', label: 'How long together', options: [
      ['', 'Prefer not to say'], ['<1', 'Less than 1 year'], ['1-2', '1\u20132 years'],
      ['3-5', '3\u20135 years'], ['6-10', '6\u201310 years'], ['11-20', '11\u201320 years'],
      ['20+', '20+ years'],
    ] },
    { key: 'children', label: 'Children', options: [
      ['', 'Prefer not to say'], ['none', 'None'], ['1', '1'], ['2', '2'],
      ['3+', '3 or more'], ['expecting', 'Expecting'],
    ] },
    { key: 'signupSource', label: 'How did you hear about Attune?', options: [
      ['', 'Prefer not to say'], ['friend', 'Friend or family'], ['social', 'Social media'],
      ['search', 'Search'], ['gift', 'Received as a gift'],
      ['therapist', 'Therapist or counselor'], ['other', 'Other'],
    ] },
  ],
};
