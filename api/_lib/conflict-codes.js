/**
 * Two code frames for the two written conflict answers, one per question.
 *
 * ── WHY NOT THE REFLECTION FRAME ──────────────────────────────────────────
 * These two charts used REFLECTION_CODES, which is a frame about a
 * relationship: Getting through something hard, Family and children, Money
 * and work. Ellie, reading the result: "'getting through something hard'
 * doesn't tell me anything."
 *
 * She is right, and the fault is not the words. A code frame has to be an
 * answer to ITS question. "Getting through something hard" is a fine theme
 * for what a couple is proud of and a non-answer to "what made that
 * disagreement go better than you expected" — it restates that there was a
 * disagreement. The argument for one shared frame was that the themes could
 * be compared across questions, which is true and is worth less than each
 * chart being readable.
 *
 * So: two frames, each written so that every column reads as a sentence
 * somebody could have said. "One of us apologised first." "Nobody raised
 * their voice."
 *
 * ── THE TWO QUESTIONS ARE DIFFERENT QUESTIONS ─────────────────────────────
 * c9 asks what MADE a particular disagreement go better than expected, which
 * is about an action somebody took. c_grat asks what somebody APPRECIATES
 * about how the two of them handle conflict in general, which is about a
 * standing habit. An action and a habit are not the same list: "we took a
 * break" is a thing that happened, "we never go to bed angry" is a rule they
 * keep.
 *
 * ── WHAT A CODE IS, AND THE SHALLOWNESS ───────────────────────────────────
 * The same as the reflection frame, deliberately: a theme and the word stems
 * that assign it, matched on whole words, no language understanding, an
 * answer can carry more than one code, and anything matching nothing is
 * counted as uncoded rather than dropped. Nothing anybody wrote leaves this
 * file; the output is a count per code.
 *
 * Ellie: "You build the code frame, I will adjust if needed." Still true of
 * these, which is why they are a list in one file rather than logic.
 */

/** What made one disagreement go better than expected. An action. */
export const CONFLICT_BETTER_CODES = [
  { id: 'apology', label: 'One of us apologised first',
    terms: ['apolog', 'sorry', 'owned', 'own it', 'admitted', 'admit', 'took responsibility', 'my fault', 'fault'] },
  { id: 'listened', label: 'One of us actually listened',
    terms: ['listen', 'heard', 'hear', 'let me finish', 'let him', 'let her', 'let them', 'without interrupt', 'paid attention'] },
  { id: 'paused', label: 'We took a break and came back',
    terms: ['break', 'pause', 'paused', 'walk', 'walked', 'step away', 'stepped away', 'cool', 'cooled', 'later', 'next day', 'morning', 'slept'] },
  { id: 'named_it', label: 'We named what was really going on',
    terms: ['pattern', 'named', 'naming', 'underneath', 'really about', 'root', 'the real', 'honest', 'honestly', 'said what'] },
  { id: 'stayed_on_topic', label: 'We stayed on one thing',
    terms: ['one thing', 'topic', 'off track', 'bring up', 'brought up', 'stayed on', 'focus', 'focused', 'specific'] },
  { id: 'softened', label: 'Somebody softened how they said it',
    terms: ['calm', 'calmly', 'gentle', 'softer', 'soft', 'quiet', 'tone', 'kind', 'kindly', 'nicer', 'patient'] },
  { id: 'humour', label: 'One of us made the other laugh',
    terms: ['laugh', 'joke', 'humor', 'humour', 'funny', 'silly', 'lighten'] },
  { id: 'touch', label: 'We touched, held or hugged',
    terms: ['hug', 'hugged', 'hold', 'held', 'touch', 'hand', 'kiss', 'cuddle', 'sat next'] },
  { id: 'understood_them', label: 'One of us saw it from the other side',
    terms: ['perspective', 'their side', 'his side', 'her side', 'point of view', 'where they were', 'where he', 'where she', 'understood', 'understand', 'empath'] },
  { id: 'agreed_plan', label: 'We agreed what to do next',
    terms: ['agreed', 'agree', 'plan', 'decided', 'decide', 'compromise', 'solution', 'solved', 'resolve', 'resolved', 'sort', 'sorted'] },
];

/** What somebody appreciates about how the two of them handle conflict. A habit. */
export const CONFLICT_APPRECIATE_CODES = [
  { id: 'repairs_fast', label: 'We do not let it drag on',
    terms: ['quick', 'quickly', 'fast', 'move on', 'moves on', 'let it go', 'drag', 'linger', 'bed angry', 'same day', 'short'] },
  { id: 'no_shouting', label: 'Nobody raises their voice',
    terms: ['shout', 'shouting', 'yell', 'yelling', 'scream', 'raise', 'raised', 'voice', 'never loud', 'calm', 'respectful', 'respect'] },
  { id: 'no_low_blows', label: 'Nobody says the unforgivable thing',
    terms: ['low blow', 'below the belt', 'cruel', 'mean', 'name call', 'names', 'nasty', 'personal', 'never bring', 'past', 'throw'] },
  { id: 'comes_back', label: 'We always come back to it',
    terms: ['come back', 'comes back', 'return', 'revisit', 'finish', 'finishes', 'never leave', 'unfinished', 'follow up'] },
  { id: 'they_listen', label: 'They let me finish',
    terms: ['listen', 'listens', 'hears', 'heard', 'let me', 'interrupt', 'space', 'room', 'attention'] },
  { id: 'takes_responsibility', label: 'They own their part',
    terms: ['own', 'owns', 'responsibility', 'accountab', 'apolog', 'sorry', 'admit', 'admits', 'defensive'] },
  { id: 'no_grudge', label: 'Neither of us keeps score',
    terms: ['grudge', 'score', 'hold it', 'holds it', 'bring it up', 'resent', 'forgiv', 'forget', 'clean slate'] },
  { id: 'stays_kind', label: 'We stay on the same side',
    terms: ['team', 'same side', 'together', 'against the problem', 'us', 'partner', 'kind', 'gentle', 'love', 'loving', 'care'] },
  { id: 'gives_space', label: 'We give each other time to think',
    terms: ['space', 'time', 'pause', 'break', 'think', 'process', 'cool', 'wait', 'patient', 'patience'] },
  { id: 'says_it_early', label: 'Things get said before they build up',
    terms: ['early', 'straight', 'right away', 'honest', 'upfront', 'up front', 'build', 'bottle', 'sit on', 'simmer', 'small'] },
];

/** The frame for one question id, or null for a question with no frame. */
export function conflictFrameFor(questionId) {
  if (questionId === 'c9') return CONFLICT_BETTER_CODES;
  if (questionId === 'c_grat') return CONFLICT_APPRECIATE_CODES;
  return null;
}

/* Every code is usable: a unique id, a label, and at least one term. A code
   with no terms sits at zero for ever and reads as a theme nobody mentioned
   rather than as a rule nobody wrote. */
for (const [name, frame] of [['CONFLICT_BETTER_CODES', CONFLICT_BETTER_CODES], ['CONFLICT_APPRECIATE_CODES', CONFLICT_APPRECIATE_CODES]]) {
  const seen = new Set();
  for (const c of frame) {
    if (seen.has(c.id)) throw new Error(`${name} has two codes called "${c.id}".`);
    seen.add(c.id);
    if (!c.label) throw new Error(`${name}.${c.id} has no label.`);
    if (!c.terms || !c.terms.length) throw new Error(`${name}.${c.id} has no terms, so it can never be assigned.`);
  }
}
