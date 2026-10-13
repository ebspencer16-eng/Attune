/**
 * The one survey Attune asks, at the end of the experience.
 *
 * ── WHY THERE IS ONLY ONE NOW ─────────────────────────────────────────────
 * There were three. A 26-question beta survey on /feedback with four rating
 * grids in it; a six-question modal that opened over the results; and a
 * seven-question card at the end of What Comes Next. Three question sets,
 * three stores, and no way to compare an answer from one with an answer from
 * another.
 *
 * Ellie, having read a proposal for the replacement: "Please use this as the
 * regular survey for everyone at the end of their experience, not just beta
 * users."
 *
 * ── THE SHAPE ─────────────────────────────────────────────────────────────
 * Eight questions, three of them conditional, so most people answer six. Two
 * of the eight only appear for somebody with something to say: what they
 * talked about, and what felt wrong. The ranking is built from what this
 * particular couple actually did, because asking somebody to rank an exercise
 * they never bought is asking them to invent an opinion.
 *
 * ── WHAT IT DELIBERATELY DOES NOT ASK ─────────────────────────────────────
 * Per-exercise rating grids, how long each part took, what they expected
 * before buying, and how honestly they felt able to answer. All four were in
 * the old one; what we lose by cutting them is written out in TASKS.md rather
 * than left for someone to rediscover.
 *
 * Nothing here identifies anybody. There is no name field and no consent
 * checkbox, because a quotation we publish carries no name: see
 * `TESTIMONIAL_NOTICE`.
 */

/**
 * The version these answers were given under.
 *
 * Bumped when a question changes meaning, so two answers filed under one id
 * can still be told apart. The admin shows it beside the count.
 */
export const SURVEY_VERSION = '2026-10-13';

/** The sentence under the last question, which is what covers us for quoting. */
export const TESTIMONIAL_NOTICE =
  'We may quote what you write here on our website. We never publish your name, '
  + 'your email, or anything that could identify you or your partner.';

export const SURVEY_COPY = {
  title: 'How was your experience?',
  /* No count in it. A number in a sentence is a thing that goes stale the
     first time a question is added, and this one would be wrong twice: two of
     the questions only appear for some people. */
  intro: 'A few questions about how it went. Your answers are anonymous, they are '
    + 'never shown to your partner, and you can stop at any point.',
  submit: 'Send',
  submitting: 'Sending',
  thanksTitle: 'Thank you',
  thanks: 'This goes straight to the people building Attune. It is the main thing '
    + 'that decides what we change.',
  saved: 'Saved',
};

/** The five-point star question at the top. */
export const RATING_MAX = 5;

/**
 * Every question, in order.
 *
 * `showWhen` is DATA rather than a function, and that is the point. Three
 * surfaces draw this survey and two of them cannot import this file: the Expo
 * app and the static page under public/. A condition written as a closure here
 * means each of those re-types the condition, naming the question and the
 * answer it depends on, so adding a conditional question means editing three
 * files and a fourth one somewhere will keep asking the old set.
 *
 * Written as `{ field, startsWith }` or `{ field, atLeast, atMost }`, every
 * surface runs the same six-line matcher over whatever this file says, and a
 * new conditional question needs no surface change at all. check-survey lifts
 * each surface's matcher and runs it against `shouldShow` below.
 *
 * `options` is a list, except for the ranking, which is built per person by
 * rankOptionsFor.
 */
export const SURVEY_QUESTIONS = [
  {
    id: 'rating',
    kind: 'stars',
    label: 'How would you rate your Attune experience?',
    max: RATING_MAX,
  },
  {
    id: 'convo',
    kind: 'choice',
    label: 'Did Attune lead to a conversation you would not have had otherwise?',
    options: [
      'Yes, and we talked about something new',
      'Yes, but nothing we had not covered',
      'Not yet',
      'No',
    ],
  },
  {
    id: 'convo_what',
    kind: 'text',
    label: 'What did you end up talking about?',
    placeholder: 'As much or as little as you like.',
    showWhen: { field: 'convo', startsWith: 'Yes' },
  },
  {
    id: 'interest_rank',
    kind: 'rank',
    label: 'Please order the following aspects of your Attune experience from '
      + 'most to least interesting to you.',
    hint: 'Tap them in order, most interesting first. Tap one again to take it back.',
    /* Built per person: see rankOptionsFor. */
    options: [],
  },
  {
    id: 'surprise',
    kind: 'text',
    label: 'What did you learn that surprised you?',
    placeholder: 'One sentence is plenty.',
  },
  {
    id: 'accuracy',
    kind: 'scale',
    label: 'How accurate did your results feel?',
    scale: ['Not at all', 'A little', 'Fairly', 'Very', 'Completely'],
  },
  {
    id: 'accuracy_off',
    kind: 'text',
    label: 'What was off?',
    placeholder: 'The more specific the better.',
    /* Asked of the people who have something to say rather than of everyone.
       The scale is stored one-based, so three or less is the lower half. */
    showWhen: { field: 'accuracy', atLeast: 1, atMost: 3 },
  },
  {
    id: 'nps',
    kind: 'nps',
    label: 'How likely are you to recommend Attune to a couple you know?',
    min: 0,
    max: 10,
  },
  {
    id: 'nps_why',
    kind: 'text',
    label: 'What is behind that?',
    placeholder: 'Optional.',
  },
];

/** The ids whose answers are free text, which is what the admin codes. */
export const TEXT_QUESTIONS = SURVEY_QUESTIONS.filter((q) => q.kind === 'text').map((q) => q.id);

/**
 * What this person can be asked to rank.
 *
 * Ellie: "list highlights, couple type, [each exercise the person completed],
 * action plans, [each resource the person had access to] as option choices."
 *
 * So it is built from their own row rather than from a fixed list: the
 * exercises they finished, and the tools they own. Somebody asked to rank a
 * thing they never saw either invents an opinion or abandons the survey.
 *
 * @param done  key -> finished, from doneFromProfile
 * @param caps  what they own, from capabilitiesFor
 * @param exercises  the registry, passed in so this file imports nothing
 */
export function rankOptionsFor({ done = {}, caps = {}, exercises = [] } = {}) {
  const out = ['Highlights', 'Couple type'];
  for (const e of exercises) {
    const owned = !e.capability || !!caps[e.capability];
    /* The full name, which is what the nav and the results pages call it.
       `label` is the short form: "Communication" against "Communication
       Styles", and a list of things to rank is a place for the whole name. */
    if (owned && done[e.key]) out.push(e.fullLabel || e.label);
  }
  out.push('Action plans');
  if (caps.ownsWorkbook) out.push('The personalized workbook');
  if (caps.ownsBudget) out.push('The shared budget');
  if (caps.ownsChecklist) out.push('The merging lives checklist');
  return out;
}

/**
 * Should this question be asked, given what has been answered so far?
 *
 * The whole of the rule, in one place, over the `showWhen` data above. Every
 * surface runs its own six lines of this because two of them cannot import
 * this file; check-survey runs theirs against this one over a sweep of
 * answers, which is the only thing that keeps them honest.
 *
 * An unknown operator shows the question. A conditional nobody can evaluate
 * asked of everybody is a survey that is too long; the same thing hidden from
 * everybody is a question that silently stops being asked.
 */
export function shouldShow(q, answers = {}) {
  const w = q && q.showWhen;
  if (!w || !w.field) return true;
  const v = answers[w.field];
  if (typeof w.startsWith === 'string') {
    return typeof v === 'string' && v.startsWith(w.startsWith);
  }
  if (w.atLeast !== undefined || w.atMost !== undefined) {
    const n = Number(v);
    if (!Number.isFinite(n) || v === '' || v === null || v === undefined) return false;
    if (w.atLeast !== undefined && n < w.atLeast) return false;
    if (w.atMost !== undefined && n > w.atMost) return false;
    return true;
  }
  return true;
}

/**
 * The questions this person sees, given what they have answered so far.
 *
 * One function, used by the endpoint, by the website, and by the check, so
 * "which questions are showing" has one answer.
 */
export function visibleQuestions(answers = {}, rankOptions = []) {
  return SURVEY_QUESTIONS
    .filter((q) => shouldShow(q, answers))
    .map((q) => (q.kind === 'rank' ? { ...q, options: rankOptions } : q));
}

/**
 * Is there anything in this submission worth storing?
 *
 * Partial answers are kept on purpose, so this is deliberately generous: one
 * star, one choice, one word. What it refuses is an empty object, which is
 * what a page sends when it loads.
 */
export function hasAnswer(answers = {}) {
  return Object.entries(answers).some(([, v]) => {
    if (v == null || v === '') return false;
    if (Array.isArray(v)) return v.length > 0;
    return true;
  });
}

/** Every question that has been answered, for the progress line. */
export function answeredCount(answers = {}, rankOptions = []) {
  const shown = visibleQuestions(answers, rankOptions);
  return shown.filter((q) => {
    const v = answers[q.id];
    if (v == null || v === '') return false;
    return Array.isArray(v) ? v.length > 0 : true;
  }).length;
}
