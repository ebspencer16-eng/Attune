/**
 * The questions Attune asks about itself.
 *
 * ── WHERE THESE WORDS COME FROM ───────────────────────────────────────────
 * Ellie's, recovered from git rather than rewritten. They were the
 * ExperienceFeedback component in src/App.jsx, removed in d54d7c2 as part of
 * "Remove 990 lines of dead code": it had already been disconnected from the
 * product, so it was deleted as unreferenced.
 *
 * The consequence was quiet and complete. Nothing in the website, the app or
 * the static pages posts to /api/send-feedback any more. /api/get-feedback
 * still reads what it stores, and the admin still draws a Feedback Overview
 * and a "Love it clicks · Footer reaction strip" tile from it. So three
 * surfaces report on a question nobody is asked.
 *
 * ── WHY A MODULE ──────────────────────────────────────────────────────────
 * So the next surface to ask does not write a second version of the question.
 * The app reads it from the server; the website can import it directly when
 * its own questionnaire comes back.
 *
 * Edit here. Nothing else should hold these sentences.
 */

export const FEEDBACK_COPY = {
  title: 'How was your experience?',
  // The longer invitation, from the card that opened the questionnaire on the
  // website. The app shows `reassurance` instead, because a phone screen has
  // no room for both.
  invitation: 'Tell us how it went, it takes 2 minutes and helps us make Attune better for every couple after you.',
  cta: 'Tell us how it was',
  skip: 'Skip rating and give detailed feedback',
  reassurance: 'Anonymous · 2 minutes · helps us improve Attune for everyone',
  scaleHeading: 'Rate each statement',
  submit: 'Submit feedback',
  submitting: 'Sending',
  privacy: 'Your feedback is anonymous and never linked to your name or email.',
  thanksTitle: 'Thank you',
  thanks: 'Your feedback goes directly to the people building Attune. It genuinely matters.',
};

/**
 * The first question, which is the whole question for most people.
 *
 * Four buttons on the card, and the index is the `rating` the endpoint stores:
 * 0 to 3, low to high. api/send-feedback.js has read it that way since before
 * any of this was deleted, so the order is not cosmetic.
 */
export const FEEDBACK_RATINGS = [
  '😕 Not great',
  '😐 It was okay',
  '🙂 Pretty good',
  '😍 Loved it',
];

/** The five-point scale, low to high. */
export const FEEDBACK_SCALE = [
  'Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree',
];

/**
 * The seven questions, in order.
 *
 * `id` is what /api/send-feedback stores under questionAnswers, so these are
 * the names every answer already recorded is filed under. Renaming one orphans
 * the answers that came before it.
 */
export const FEEDBACK_QUESTIONS = [
  { id: 'q_clear', type: 'scale', label: 'The results felt clear and easy to understand' },
  { id: 'q_accurate', type: 'scale', label: 'The results felt accurate for me personally' },
  { id: 'q_useful', type: 'scale', label: 'I learned something useful about myself or my partner' },
  { id: 'q_conv', type: 'scale', label: 'This made me want to have a real conversation with my partner' },
  {
    id: 'q_stage', type: 'choice', label: 'Where are you in your relationship?',
    options: ['Just started dating', 'In a relationship (1–3 yrs)', 'Long-term (3+ yrs)', 'Engaged', 'Married'],
  },
  {
    id: 'q_source', type: 'choice', label: 'How did you hear about Attune?',
    options: ['Friend or partner', 'Social media', 'Google / search', 'Gift', 'Other'],
  },
  { id: 'q_open', type: 'text', label: "Anything else you'd like us to know?" },
];
