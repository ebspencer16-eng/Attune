/**
 * Exercise 5: How You Fight.
 *
 * A standalone add-on, not folded into Communication. Twelve questions across
 * six sections.
 *
 * ── WHY THIS ONE BREAKS A HOUSE RULE ──────────────────────────────────────
 * Every other Attune dimension is pole-neutral: neither end is better, and the
 * gap is the conversation. Section 3 is different. The four risk patterns are
 * evaluative, and one direction genuinely is worse. That is deliberate and it
 * changes how results must be written: no "neither of you is wrong here"
 * framing, and no couple-type-style labelling off these scores.
 *
 * The formats follow from that, and each is chosen rather than inherited:
 *   frequency  for the risk patterns, because a rate can be reported without
 *              labelling someone's identity, and forced-choice would either
 *              water the signal down or feel like a rigged pick
 *   forcedAB   only where both options are equally valid styles
 *   pickOne    and rank, for descriptive partner-facing content
 *   openText   for reflection, mirroring the Relationship Reflection close
 *
 * ── SELF-ONLY ─────────────────────────────────────────────────────────────
 * No partner-rated versions anywhere in this exercise. Asking someone to rate
 * how contemptuous their partner is would produce an accusation with a score
 * attached, and no amount of careful copy makes that land well.
 */

export const CONFLICT_SECTIONS = [
  { id: 'start',    label: 'Getting Started',        questions: ['c0'] },
  { id: 'openings', label: 'How Disagreements Start', questions: ['c1', 'c2'] },
  { id: 'risk',     label: 'The Risk Patterns',      questions: ['c_crit', 'c_cont', 'c_def', 'c_stone'] },
  { id: 'works',    label: 'What Already Works',     questions: ['c8', 'c9'] },
  { id: 'repair',   label: 'Repair and Fair Fighting', questions: ['c_repair', 'c_topic'] },
  { id: 'closing',  label: 'What Matters',           questions: ['c_grat'] },
];

/** Shown before the first question. Sets expectation: noticing, not verdict. */
export const CONFLICT_INTRO =
  "Conflict is part of every relationship. This exercise helps each of you identify "
  + "patterns linked to relationship strain so that you can approach conflict in a healthy way.";

/** Frequency options, shared by the four risk questions. Value is the rate. */
export const FREQUENCY_OPTIONS = [
  { value: 0, label: 'Never' },
  { value: 1, label: 'Rarely' },
  { value: 2, label: 'Sometimes' },
  { value: 3, label: 'Often' },
];

export const CONFLICT_QUESTIONS = [
  // ── 1. Getting Started ───────────────────────────────────────────────────
  {
    id: 'c0', section: 'start', kind: 'scale',
    text: 'How would you describe the way you two typically handle disagreements?',
    options: [
      { value: 0, label: 'Really rocky' },
      { value: 1, label: "We manage but it's hard" },
      { value: 2, label: "We're okay" },
      { value: 3, label: 'Pretty good' },
      { value: 4, label: 'We handle it well' },
    ],
  },

  // ── 2. How Disagreements Start. Both options equally valid. ──────────────
  {
    id: 'c1', section: 'openings', kind: 'forcedAB',
    text: "When a disagreement starts, you're more likely to:",
    a: "Say what's bothering me right away",
    b: 'Take some time before I bring it up',
  },
  {
    id: 'c2', section: 'openings', kind: 'forcedAB',
    text: 'In the middle of a disagreement, you tend to:',
    a: "Want to keep talking until we've resolved it",
    b: 'Need a pause before I can keep talking',
  },

  // ── 3. The Risk Patterns. Evaluative, self-only, frequency-rated. ────────
  // riskKey is the internal key; riskLabel is what the customer reads.
  //
  // The four pattern names are cleared for use. What is NOT cleared, pending
  // counsel via Carolina, is "Gottman", "Gottman Method" and "Four Horsemen":
  // the concepts are research findings and not protectable, but the branding
  // around them is a licensing business. check-copy-tokens fails the build if
  // any of those three reach customer copy, so the line holds without anyone
  // having to remember it.
  {
    id: 'c_crit', section: 'risk', kind: 'frequency', riskKey: 'criticism', riskLabel: 'Criticism',
    text: "When you're frustrated, you find yourself criticizing your partner's character rather than naming the specific issue.",
  },
  {
    id: 'c_cont', section: 'risk', kind: 'frequency', riskKey: 'contempt', riskLabel: 'Contempt',
    text: 'When you disagree, you catch yourself being sarcastic, dismissive, or rolling your eyes.',
  },
  {
    id: 'c_def', section: 'risk', kind: 'frequency', riskKey: 'defensiveness', riskLabel: 'Defensiveness',
    text: 'When your partner brings up a concern, you respond by defending yourself or pointing out what they do wrong.',
  },
  {
    id: 'c_stone', section: 'risk', kind: 'frequency', riskKey: 'stonewalling', riskLabel: 'Stonewalling',
    text: 'When things get tense, you shut down or withdraw instead of staying in the conversation.',
  },

  // ── 4. What Already Works. Balances the section above. ───────────────────
  {
    id: 'c8', section: 'works', kind: 'pickOne',
    text: 'The thing you do that most often helps you reset mid-conflict:',
    options: [
      'Taking a break', 'Using humor', 'Physical touch', 'Naming the pattern out loud',
      'Apologizing first', 'Listening without responding', 'Asking a clarifying question',
      'Suggesting a walk or change of scenery', 'Writing it down', 'Sleeping on it',
    ],
  },
  {
    id: 'c9', section: 'works', kind: 'openText',
    text: 'A disagreement that ended better than you expected. What made it work:',
    placeholder: 'Take as much space as you want.',
  },

  // ── 5. Repair and Fair Fighting ─────────────────────────────────────────
  {
    id: 'c_repair', section: 'repair', kind: 'rank',
    text: 'Rank these by how well they land for you when your partner tries them:',
    options: [
      'A genuine apology', 'Humor to break the tension', 'Physical affection (a hug, holding hands)',
      'Naming that they see it from my side', 'Suggesting a pause', 'Directly asking what I need',
    ],
  },
  {
    id: 'c_topic', section: 'repair', kind: 'forcedAB',
    text: 'When a disagreement touches on something old, you tend to:',
    a: "Stick to what's happening right now",
    b: 'Notice how it connects to a pattern we have had before',
  },

  // ── 6. What Matters ─────────────────────────────────────────────────────
  {
    id: 'c_grat', section: 'closing', kind: 'openText',
    text: 'One thing about how you two handle conflict that you actually appreciate:',
    placeholder: 'One sentence is plenty.',
  },
];

/**
 * Questions that must be answered before the exercise can complete.
 *
 * Every question, open text included. The two written answers are the warm
 * ones, a disagreement that went better than expected and something they
 * appreciate, and they are what the results close on. Skipped, the results end
 * on the risk patterns instead, which is the wrong note for this exercise to
 * leave someone on.
 */
export const CONFLICT_REQUIRED = CONFLICT_QUESTIONS.map(q => q.id);

export const RISK_QUESTIONS = CONFLICT_QUESTIONS.filter(q => q.kind === 'frequency');

/** Every question in display order, which is the order sections are listed. */
export function conflictQuestionsInOrder() {
  const byId = new Map(CONFLICT_QUESTIONS.map(q => [q.id, q]));
  return CONFLICT_SECTIONS.flatMap(s => s.questions.map(id => byId.get(id)).filter(Boolean));
}
