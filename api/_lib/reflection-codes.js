/**
 * A code frame for the Relationship Reflection written answers.
 *
 * ── WHY IT EXISTS ─────────────────────────────────────────────────────────
 * Ellie asked for "a postcoded column chart showing moments that matter" and
 * another "for all text-entry questions to show what evokes pride". Eight of
 * the reflection questions are free text, and nothing turned an answer into
 * anything countable.
 *
 * I asked her for the categories because the list is an editorial decision.
 * She handed it back: "You build the code frame, I will adjust if needed." So
 * this is a first draft to be read and moved, not a finished taxonomy, and it
 * is in one file so moving it is one edit.
 *
 * ── ONE FRAME, NOT EIGHT ──────────────────────────────────────────────────
 * Every one of these questions is about the same thing from a different angle:
 * what was hard, what you are proud of, what you are grateful for, what you
 * want more of. A frame per question would make them impossible to compare,
 * and the comparison is the interesting part. "Getting through something hard"
 * being the top answer for pride AND for regret says something that two
 * separate charts cannot.
 *
 * ── WHAT A CODE IS AND IS NOT ─────────────────────────────────────────────
 * A code is a theme, not a phrase. Nothing here returns, stores or logs a word
 * anybody wrote: the output is a count per code, and the admin's promise that
 * it holds no individual responses is the reason this is a frame rather than a
 * word cloud.
 *
 * An answer can carry more than one code, because people write sentences:
 * "we got through my mum being ill and talked about it properly" is both
 * HARD_TIMES and COMMUNICATION, and forcing a single winner would throw away
 * the half that happened to match second.
 *
 * ── MATCHING IS DELIBERATELY SHALLOW ──────────────────────────────────────
 * Word-stem matching, case-insensitive, on whole words. It is not language
 * understanding and does not pretend to be. The honest consequence is that
 * some answers match nothing, and those are counted and reported as uncoded
 * rather than quietly dropped: a frame that codes 40 per cent of answers and
 * says so is useful, and one that codes 40 per cent and reports percentages of
 * the 40 is not.
 */

/**
 * The frame. Each code has a label for the chart and the words that assign it.
 *
 * Terms are matched as whole words after a light stem, so "argued" matches
 * "argue" and "kids" matches "kid". Keep them to stems rather than phrases:
 * a phrase matches almost nothing in free text written by a person.
 */
/* ── TERMS THAT HAD TO COME OUT ──────────────────────────────────────────
   "together" was in Time together, and it matched nearly every answer anybody
   writes about a couple: "saving for the deposit together" coded as fun. The
   same for "back", which matches "back then", and "buy", which matches buying
   anything at all. A term common to the whole subject matter codes everything
   and therefore says nothing, and it is the hardest kind of mistake to notice
   because the chart still looks full. */
export const REFLECTION_CODES = [
  { id: 'hard_times', label: 'Getting through something hard',
    terms: ['hard', 'tough', 'difficult', 'struggle', 'crisis', 'illness', 'ill', 'sick', 'loss', 'lost', 'grief', 'died', 'death', 'surgery', 'diagnosis', 'unemployed', 'redundan', 'miscarriage', 'challenge', 'survive', 'got through', 'through it'] },
  { id: 'everyday_care', label: 'Everyday care and small acts',
    terms: ['small', 'little', 'coffee', 'tea', 'breakfast', 'dinner', 'cook', 'note', 'text', 'flower', 'surprise', 'thoughtful', 'kind', 'look after', 'took care', 'takes care', 'show up', 'showed up', 'remember'] },
  { id: 'communication', label: 'Talking and being heard',
    terms: ['talk', 'listen', 'heard', 'said', 'conversation', 'honest', 'open', 'tell', 'told', 'communicat', 'argu', 'fight', 'fought', 'apolog', 'repair', 'understood', 'understand'] },
  { id: 'time_together', label: 'Time together and fun',
    terms: ['fun', 'laugh', 'date', 'holiday', 'vacation', 'travel', 'trip', 'weekend', 'adventure', 'play', 'walk', 'dance', 'game', 'hobby'] },
  { id: 'family', label: 'Family and children',
    terms: ['kid', 'child', 'baby', 'son', 'daughter', 'pregnan', 'parent', 'mum', 'mom', 'dad', 'family', 'in-law', 'inlaw', 'sibling', 'brother', 'sister'] },
  { id: 'money_work', label: 'Money and work',
    terms: ['money', 'financ', 'budget', 'save', 'saving', 'debt', 'bill', 'job', 'work', 'career', 'promotion', 'business', 'income', 'afford'] },
  { id: 'home', label: 'Home and where we live',
    terms: ['house', 'home', 'move', 'moving', 'moved', 'flat', 'apartment', 'city', 'renovat', 'mortgage'] },
  { id: 'growth', label: 'Growth and change',
    terms: ['grow', 'grew', 'change', 'changed', 'learn', 'better', 'improve', 'therapy', 'counsel', 'work on', 'progress', 'patient', 'patience'] },
  { id: 'closeness', label: 'Closeness and affection',
    terms: ['close', 'intimacy', 'intimate', 'affection', 'touch', 'hug', 'kiss', 'love', 'loved', 'connect', 'connection', 'romance', 'romantic'] },
  { id: 'support', label: 'Backing each other',
    terms: ['support', 'supported', 'there for', 'stood by', 'encourag', 'believe', 'believed', 'trust', 'team', 'partnership', 'rely'] },
];

/* No two codes share an id, and every code has at least one term. A code with
   no terms matches nothing and would sit at zero for ever, reading as a theme
   nobody mentioned rather than as a rule that was never written. */
{
  const seen = new Set();
  for (const c of REFLECTION_CODES) {
    if (seen.has(c.id)) throw new Error(`REFLECTION_CODES has two codes called "${c.id}".`);
    seen.add(c.id);
    if (!c.terms || !c.terms.length) throw new Error(`REFLECTION_CODES.${c.id} has no terms, so it can never be assigned.`);
    if (!c.label) throw new Error(`REFLECTION_CODES.${c.id} has no label.`);
  }
}

/** Lower-cased, punctuation flattened to spaces, so terms can match on words. */
function normalise(text) {
  return ' ' + String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim() + ' ';
}

/**
 * Which codes one answer carries.
 *
 * @returns an array of code ids, possibly empty. Empty is a real answer about
 *          the frame, not a failure: it means this person wrote something the
 *          frame has no theme for, which is how the frame gets improved.
 */
export function codesFor(text, frame = REFLECTION_CODES) {
  const t = normalise(text);
  if (t.trim().length < 3) return [];
  const out = [];
  for (const c of frame) {
    /* A term matches at a word boundary, so "ill" does not match "will" and
       "back" does not match "background". A term ending mid-stem like
       "communicat" matches any continuation, which is the point of writing it
       that way. */
    if (c.terms.some((term) => new RegExp('(^|\\s)' + term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[a-z]*(\\s|$)').test(t))) {
      out.push(c.id);
    }
  }
  return out;
}

/**
 * Count codes across many answers.
 *
 * Returns a count per code, how many answers carried at least one, and how
 * many carried none. The last two are what make the first honest: a bar of 12
 * means something different out of 20 answers than out of 200.
 */
export function tallyCodes(answers, frame = REFLECTION_CODES) {
  /* ── ONE MATCHER, MORE THAN ONE FRAME ─────────────────────────────────
     The conflict answers have frames of their own now, because a theme has
     to be an answer to ITS question and "Getting through something hard"
     is not an answer to what made a disagreement go well. What they share
     is the MATCHING: whole words, light stems, an answer can carry several
     codes, and anything matching nothing is counted rather than dropped.
     That rule stays here, in one place, and the frame is an argument. */
  const counts = Object.fromEntries(frame.map((c) => [c.id, 0]));
  let coded = 0, uncoded = 0, total = 0;
  for (const a of answers || []) {
    const text = String(a == null ? '' : a).trim();
    if (!text) continue;
    total++;
    const codes = codesFor(text, frame);
    if (!codes.length) { uncoded++; continue; }
    coded++;
    for (const id of codes) counts[id]++;
  }
  return { counts, coded, uncoded, total };
}
