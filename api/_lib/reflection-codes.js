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

import { ANNIVERSARY_QUESTIONS } from '../_anniversary-questions.js';

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

/**
 * ── ONE FRAME PER WRITTEN QUESTION ─────────────────────────────────────────
 * Ellie, of the single written-answers tile with a question picker: "I want
 * each of these to be a separate chart, all of them should be vertically
 * stacked with slicers of their own, and unique categories built as answers
 * to the question the chart is asking. Title the chart the way we just
 * retitled the first one."
 *
 * The header above argues for one shared frame so the questions could be
 * compared. The conflict charts already lost that argument (api/_lib/
 * conflict-codes.js: "A code frame has to be an answer to ITS question"), and
 * this is the same call for the same reason. REFLECTION_CODES stays for the
 * survey's testimonial themes, which still use the default.
 *
 * Every label reads as something a person could have written in answer to
 * that question. Terms are stems matched on whole words after punctuation is
 * flattened, so a hyphenated term never matches: "in law", not "in-law".
 * Words common to every answer about a couple ("together", "time", "back",
 * "still", "need") are left out of every frame, for the reason given above
 * REFLECTION_CODES: a term that matches everything codes nothing.
 *
 * `title` is the chart's heading, in the shape she gave the first one:
 * "What recent memories evoke joy".
 *
 * Ellie: "You build the code frame, I will adjust if needed." Still true.
 */
export const REFLECTION_FRAMES = {
  a_memory: {
    title: 'What recent memories evoke joy',
    codes: [
      { id: 'laughed', label: 'We laughed together', terms: ['laugh', 'joke', 'funny', 'silly', 'giggl', 'humor', 'humour'] },
      { id: 'gesture', label: 'A small, thoughtful gesture', terms: ['coffee', 'tea', 'breakfast', 'note', 'flower', 'surprise', 'thoughtful', 'brought', 'gift', 'made me'] },
      { id: 'just_us', label: 'Time just the two of us', terms: ['date', 'dinner', 'walk', 'night out', 'weekend', 'evening', 'movie', 'film', 'cooked'] },
      { id: 'teamwork', label: 'Handling something as a team', terms: ['team', 'helped', 'figured', 'fixed', 'sorted', 'handled', 'teamwork'] },
      { id: 'affection', label: 'A moment of affection', terms: ['hug', 'kiss', 'cuddle', 'held', 'hand', 'touch', 'snuggl'] },
      { id: 'family_pets', label: 'With family, kids or pets', terms: ['kid', 'child', 'son', 'daughter', 'baby', 'dog', 'cat', 'puppy', 'pet', 'family'] },
      { id: 'noticed', label: 'Feeling noticed or understood', terms: ['noticed', 'remembered', 'listened', 'understood', 'checked in', 'asked how'] },
      { id: 'talk', label: 'A good conversation', terms: ['talk', 'conversation', 'chat', 'shared', 'deep'] },
    ],
  },
  a1: {
    title: 'What makes couples proudest of themselves',
    codes: [
      { id: 'hard_times', label: 'Getting through something hard', terms: ['hard', 'tough', 'difficult', 'struggle', 'crisis', 'illness', 'loss', 'grief', 'survive', 'got through'] },
      { id: 'milestone', label: 'A milestone we reached', terms: ['wedding', 'married', 'engaged', 'proposal', 'bought', 'born', 'graduat', 'anniversary', 'first home', 'our house'] },
      { id: 'repaired', label: 'Working through a disagreement well', terms: ['argu', 'fight', 'fought', 'disagree', 'conflict', 'apolog', 'repair', 'resolved', 'made up'] },
      { id: 'family', label: 'Raising or caring for family', terms: ['kid', 'child', 'parent', 'son', 'daughter', 'family', 'caring for', 'cared for'] },
      { id: 'their_goal', label: "Backing each other's goals", terms: ['career', 'job', 'promotion', 'degree', 'school', 'business', 'dream', 'goal', 'encourag', 'cheer'] },
      { id: 'built', label: 'Building something together', terms: ['built', 'renovat', 'saved', 'debt', 'paid off', 'budget', 'project', 'started'] },
      { id: 'for_others', label: 'How we showed up for others', terms: ['friend', 'guests', 'hosted', 'community', 'funeral', 'everyone', 'others'] },
      { id: 'grown', label: 'How much we have grown', terms: ['grow', 'grew', 'grown', 'changed', 'learn', 'therapy', 'counsel', 'improve'] },
    ],
  },
  a2: {
    title: 'What challenges made relationships stronger',
    codes: [
      { id: 'health', label: 'Illness or a health scare', terms: ['ill', 'illness', 'sick', 'hospital', 'surgery', 'diagnos', 'cancer', 'injur', 'health', 'depress', 'anxiety'] },
      { id: 'loss', label: 'A death or loss', terms: ['died', 'death', 'loss', 'lost', 'grief', 'passed away', 'funeral', 'miscarriage'] },
      { id: 'money_job', label: 'Money or job trouble', terms: ['laid off', 'redundan', 'unemployed', 'fired', 'money', 'financ', 'debt', 'bills', 'afford'] },
      { id: 'distance', label: 'Distance or time apart', terms: ['distance', 'apart', 'deploy', 'abroad', 'separated by'] },
      { id: 'move', label: 'A move or big change', terms: ['move', 'moved', 'moving', 'relocat', 'new city', 'new country'] },
      { id: 'family_tension', label: 'Tension with family', terms: ['in law', 'inlaw', 'parent', 'mother', 'father', 'mum', 'mom', 'dad', 'sibling'] },
      { id: 'babies', label: 'Fertility, pregnancy or a new baby', terms: ['fertil', 'ivf', 'pregnan', 'baby', 'newborn', 'birth'] },
      { id: 'trust', label: 'A breach of trust or a rough patch', terms: ['trust', 'cheat', 'affair', 'lied', 'betray', 'rough patch', 'broke up', 'break up', 'almost'] },
    ],
  },
  a6: {
    title: 'What people want to work on in themselves',
    codes: [
      { id: 'patience', label: 'Being more patient', terms: ['patient', 'patience', 'calm', 'temper', 'snap', 'react', 'irritab', 'frustrat'] },
      { id: 'listening', label: 'Listening better', terms: ['listen', 'interrupt', 'present', 'phone', 'attention'] },
      { id: 'saying_it', label: 'Saying what I need', terms: ['ask for', 'direct', 'hint', 'speak up', 'express', 'open up', 'say what', 'tell you'] },
      { id: 'appreciation', label: 'Showing more appreciation', terms: ['appreciat', 'thank', 'grateful', 'compliment', 'acknowledg'] },
      { id: 'priority', label: 'Making us more of a priority', terms: ['priorit', 'busy', 'work less', 'distract', 'quality', 'more time'] },
      { id: 'fighting_fair', label: 'Fighting fairer', terms: ['argu', 'fight', 'defensive', 'blame', 'critic', 'tone', 'raise my voice', 'shout', 'sulk', 'withdraw', 'shut down', 'go quiet', 'going quiet'] },
      { id: 'affection', label: 'More affection and closeness', terms: ['affection', 'hug', 'kiss', 'intimacy', 'intimate', 'physical', 'romantic', 'romance'] },
      { id: 'load', label: 'Carrying more of the load', terms: ['chore', 'housework', 'clean', 'dish', 'laundry', 'mental load', 'help more', 'cook more'] },
    ],
  },
  a7: {
    title: 'What people wish they had approached differently',
    codes: [
      { id: 'sooner', label: 'Talking about it sooner', terms: ['sooner', 'earlier', 'waited', 'avoid', 'put off', 'bottled', 'silent', 'said something'] },
      { id: 'money', label: 'A money decision', terms: ['money', 'financ', 'spend', 'spent', 'budget', 'debt', 'saving', 'purchase'] },
      { id: 'arguing', label: 'How we argued', terms: ['argu', 'fight', 'fought', 'yell', 'shout', 'blame', 'hurtful', 'tone', 'said things'] },
      { id: 'family', label: 'Family or in-laws', terms: ['in law', 'inlaw', 'family', 'parent', 'mother', 'father', 'mum', 'mom', 'dad'] },
      { id: 'big_decision', label: 'A move, a wedding or a big decision', terms: ['wedding', 'move', 'moved', 'house', 'decision', 'decided'] },
      { id: 'kids', label: 'Something about the kids', terms: ['kid', 'child', 'baby', 'parenting', 'son', 'daughter', 'pregnan'] },
      { id: 'priorities', label: 'How we spent our time and energy', terms: ['busy', 'priorit', 'overwork', 'weekend', 'vacation', 'holiday', 'schedule'] },
      { id: 'support', label: 'Being there through something hard', terms: ['support', 'there for', 'alone', 'lonely', 'hard time', 'grief', 'illness', 'sick'] },
    ],
  },
  a5: {
    title: 'What matters most in the five-year picture',
    codes: [
      { id: 'family', label: 'Children or a growing family', terms: ['kid', 'child', 'baby', 'family', 'son', 'daughter'] },
      { id: 'home', label: 'A home of our own', terms: ['house', 'home', 'garden', 'land', 'settle', 'mortgage', 'own place'] },
      { id: 'close', label: 'Still close and in love', terms: ['love', 'close', 'connect', 'happy', 'best friend', 'romance', 'intimacy'] },
      { id: 'security', label: 'Financial security', terms: ['money', 'financ', 'secure', 'security', 'stable', 'debt free', 'saving', 'retire'] },
      { id: 'career', label: 'Work and career', terms: ['career', 'job', 'business', 'promotion', 'degree', 'school'] },
      { id: 'adventure', label: 'Travel and adventure', terms: ['travel', 'trip', 'adventure', 'explore', 'abroad', 'world'] },
      { id: 'calm', label: 'A calmer, easier life', terms: ['calm', 'peace', 'slow', 'less stress', 'ease', 'easier', 'balance', 'relax', 'simple'] },
      { id: 'grown', label: 'Having grown as a couple', terms: ['grow', 'grown', 'grew', 'learn', 'mature', 'wiser'] },
    ],
  },
  a3: {
    title: 'What people are most grateful for',
    codes: [
      { id: 'friendship', label: 'Our friendship', terms: ['friend', 'friendship', 'companion'] },
      { id: 'laughter', label: 'Laughing together', terms: ['laugh', 'fun', 'funny', 'humor', 'humour', 'joke', 'silly', 'play'] },
      { id: 'backed', label: 'Being backed no matter what', terms: ['support', 'always there', 'there for', 'rely', 'count on', 'believe', 'encourag', 'team'] },
      { id: 'safe', label: 'Feeling safe to be myself', terms: ['safe', 'myself', 'accept', 'judg', 'comfortable', 'trust', 'honest'] },
      { id: 'talk', label: 'How we talk', terms: ['talk', 'communicat', 'listen', 'conversation', 'understand', 'heard'] },
      { id: 'care', label: 'Everyday care', terms: ['care', 'kind', 'thoughtful', 'look after', 'small things', 'little things'] },
      { id: 'family', label: 'The family we have made', terms: ['family', 'kid', 'child', 'son', 'daughter'] },
      { id: 'loved', label: 'Being loved', terms: ['love', 'loved', 'affection', 'adore', 'cherish', 'devot'] },
    ],
  },
  a4: {
    title: 'What couples want to do more of together',
    codes: [
      { id: 'dates', label: 'Date nights', terms: ['date', 'dinner', 'night out', 'restaurant', 'movie', 'film'] },
      { id: 'travel', label: 'Travel and trips', terms: ['travel', 'trip', 'vacation', 'holiday', 'getaway', 'weekends away', 'abroad', 'explore'] },
      { id: 'active', label: 'Getting outside or active', terms: ['hike', 'hiking', 'walk', 'run', 'gym', 'exercise', 'outdoor', 'outside', 'bike', 'swim', 'sport', 'yoga'] },
      { id: 'talk', label: 'Real conversations', terms: ['talk', 'conversation', 'check in', 'deep', 'communicat'] },
      { id: 'hobby', label: 'A shared hobby or project', terms: ['hobby', 'project', 'class', 'cook', 'garden', 'game', 'read', 'music', 'dance', 'paint'] },
      { id: 'people', label: 'Time with friends and family', terms: ['friend', 'family', 'host', 'social', 'visit'] },
      { id: 'rest', label: 'Slowing down and resting', terms: ['relax', 'rest', 'slow', 'quiet', 'lazy', 'cozy', 'cosy', 'unplug'] },
      { id: 'affection', label: 'More affection and intimacy', terms: ['affection', 'intimacy', 'intimate', 'sex', 'cuddle', 'touch', 'romance', 'romantic', 'kiss'] },
    ],
  },
};

/* Every written question has a frame and every frame belongs to a written
   question, checked where the frames are rather than described: a question
   added to the reflection with no frame would otherwise have no chart, and
   nobody would notice a chart that was never drawn. */
{
  const written = ANNIVERSARY_QUESTIONS.filter((q) => q.type === 'text').map((q) => q.id);
  for (const id of written) {
    if (!REFLECTION_FRAMES[id]) throw new Error(`Reflection question "${id}" is written but has no code frame in REFLECTION_FRAMES.`);
  }
  for (const id of Object.keys(REFLECTION_FRAMES)) {
    if (!written.includes(id)) throw new Error(`REFLECTION_FRAMES has a frame for "${id}", which is not a written reflection question.`);
    const f = REFLECTION_FRAMES[id];
    if (!f.title) throw new Error(`REFLECTION_FRAMES.${id} has no title.`);
    const seen = new Set();
    for (const c of f.codes) {
      if (seen.has(c.id)) throw new Error(`REFLECTION_FRAMES.${id} has two codes called "${c.id}".`);
      seen.add(c.id);
      if (!c.label || !c.terms || !c.terms.length) throw new Error(`REFLECTION_FRAMES.${id}.${c.id} needs a label and at least one term.`);
      for (const t of c.terms) if (/[^a-z0-9 ]/.test(t)) throw new Error(`REFLECTION_FRAMES.${id}.${c.id}: "${t}" can never match, because answers are flattened to letters, digits and spaces.`);
    }
  }
}

/**
 * The written reflection answers of a set of people, coded, one entry per
 * question in the order the reflection asks them. What /api/admin-data sends,
 * and what the admin probe's stub calls, so the two cannot disagree.
 *
 * `answersOf(q)` returns the strings written for question q.
 */
export function reflectionTallies(answersOf) {
  return ANNIVERSARY_QUESTIONS.filter((q) => q.type === 'text').map((q) => {
    const f = REFLECTION_FRAMES[q.id];
    return {
      id: q.id,
      /* The question as asked, which is copy and not an answer. */
      label: q.text,
      title: f.title,
      category: q.category || null,
      frame: f.codes.map((c) => ({ id: c.id, label: c.label })),
      ...tallyCodes(answersOf(q), f.codes),
    };
  });
}
