import { MOMENTS_W, MOMENTS_X, MOMENTS_Y, MOMENTS_Z } from './_workbook-prose.js';

// api/_workbook-content.js
// Shared content for the personalized workbook generator.
// Underscore prefix = not an API route (Vercel ignores it).

export const DIMS = ['energy','expression','reassurance','needs','bids','conflict','repair','listening','love','feedback'];

export const DIM_META = {
  energy:      { label: 'Energy & Recharge',              left: 'Inward',     right: 'Outward',    color: '9B5DE5' },
  expression:  { label: 'Emotional Expression',           left: 'Internal',   right: 'External',   color: '9B5DE5' },
  reassurance: { label: 'Reassurance',                    left: 'Voiced',     right: 'Assumed',    color: '9B5DE5' },
  needs:       { label: 'Communicating Needs',            left: 'Direct',     right: 'Indirect',   color: 'E8673A' },
  bids:        { label: 'Bids for Connection',            left: 'Subtle',     right: 'Expressive', color: 'E8673A' },
  conflict:    { label: 'Conflict Style',                 left: 'Engage',     right: 'Withdraw',   color: '1B5FE8' },
  repair:      { label: 'Repairing',                      left: 'Formal',     right: 'Informal',   color: '1B5FE8' },
  listening:   { label: 'Listening',                      left: 'Reflective', right: 'Responsive', color: 'E8673A' },
  love:        { label: 'Emotional Intimacy',             left: 'Words',      right: 'Actions',    color: 'E8673A' },
  feedback:    { label: 'Feedback',  left: 'Guarded',    right: 'Open',       color: '1B5FE8' },
};

// Returns dimension-level close/gap text and a weekly practice.
// All strings support {U} and {P} substitution (caller handles).
// NOTE: the reassurance entries below are a first draft pending Carolina's
// clinical pass. Everything else here has been through review.
/**
 * What each dimension measures, and what to do about a gap in it.
 *
 * ── IT LIVES IN api/_workbook-prose.js NOW ────────────────────────────────
 * There were two versions of this: one here for the .docx and one in the PDF
 * builder, identical in 26 of 40 fields and different in the other 14. Ellie,
 * 13 Sep: "Use the PDF's personalized text."
 *
 * So the PDF's wording won every field, and the prompt lists were merged
 * rather than replaced: the .docx list already contained every prompt the PDF
 * had, sometimes one more, so taking the longer one keeps the PDF's questions
 * and loses none. Forty prompts kept, none dropped.
 */
export { DIM_CONTENT } from './_workbook-prose.js';

// Expectations domain definitions — 6-domain Phase 3 model.
// Each domain has three alignment-state texts (compatible/discuss/different),
// keyed to a percentage threshold (75+ / 40-74 / <40), plus a "Try this week"
// prompt. Source of truth is scripts/build_workbook.py EXP_DOMAINS.
export const EXP_DOMAINS = [
  {
    key: 'household', label: 'Visible Household Labor', color: 'gold',
    compatibleText: "Your expectations about who runs the household are broadly aligned. The division of labor probably feels chosen, not negotiated each week.",
    discussText:    "You see the household differently in places. Some of these gaps are probably running in the background, costing more than you realize.",
    differentText:  "You hold significantly different pictures of how the household runs. This is where most slow-build resentment in long relationships originates.",
    thisWeek:       "Separately, list the household tasks you currently own, the ones you think the other owns, and the ones falling through the cracks. Compare the lists without judgment.",
  },
  {
    key: 'emotional', label: 'Emotional & Invisible Labor', color: 'coral',
    compatibleText: "You see the invisible work of the relationship in similar terms. The mental load, the remembering, the repair, you both clock it.",
    discussText:    "Some of the invisible labor is being carried unevenly, and at least one of you may not fully see it. Worth surfacing before it accumulates.",
    differentText:  "One of you is carrying significantly more of the invisible labor. This work is usually unacknowledged and unreciprocated, not from malice but from genuine unawareness.",
    thisWeek:       "For one week, the partner who typically carries more mental load keeps a simple log, every act of invisible labor they perform. At the end of the week, share it. Don't frame it as an accusation. Just show what's there.",
  },
  {
    key: 'extended_family', label: 'Extended Family', color: 'plum',
    compatibleText: "You see the work of family across both sides as broadly shared. Visits, contact, gifts, neither of you is doing a job the other doesn't notice.",
    discussText:    "You see the family-side work differently in places. Some of it is quietly carried by one of you, often along the lines of whose family it is. Worth saying out loud.",
    differentText:  "You hold significantly different pictures of who's doing the family work. The unevenness usually surfaces as the holiday conversation that takes a year to actually have.",
    thisWeek:       "Pick one upcoming family event, a visit, a holiday, a check-in call. Each of you names what you'd like the other to do, before the week of arrives.",
  },
  {
    key: 'money', label: 'Money, Work & Career', color: 'indigo',
    compatibleText: "Your orientations on money and career are broadly compatible. You probably move through major financial decisions without much friction.",
    discussText:    "You diverge in places on how money should be held or whose work leads. These are the questions that compound, worth talking through with specifics.",
    differentText:  "You hold significantly different views on money or career priority. Differences here tend to surface during big decisions, often when there is least time to discuss them.",
    thisWeek:       "Each of you answers: \"The financial situation that would make me feel most secure is ___.\" Share them. Don't solve, just understand where each person's sense of security lives.",
  },
  {
    key: 'life', label: 'Life Together', color: 'green',
    compatibleText: "You picture the bigger questions of your life together in similar terms. Family, where you live, what matters, you are pointed in compatible directions.",
    discussText:    "You picture some of the foundational pieces of your shared life differently. These are the assumptions worth saying out loud before time makes them harder to revisit.",
    differentText:  "You hold significantly different pictures of the life you are building. Differences this large tend to compound, but only if they stay unspoken.",
    thisWeek:       "Write down, separately, then share, one sentence about what you want your shared life to look like in five years. Don't edit for what you think the other wants to hear.",
  },
];

// Universal row labels per domain. Names get substituted in extended_family
// at render time ({U} = user, {P} = partner). Tied to the responsibility-item
// keys in App.jsx RESPONSIBILITY_CATEGORIES.
export const DOMAIN_ROWS = {
  household: [
    'Cooking weeknights',
    'Grocery & meal planning',
    'Day-to-day tidying',
    'Home repairs & maintenance',
    'Family calendar',
    'Hosting & holidays',
    'Vacation planning',
  ],
  emotional: [
    'Mental load',
    'Tracking how everyone is',
  ],
  extended_family: [
    "Visits with {U}'s family",
    "Visits with {P}'s family",
    "Gifting for {U}'s family",
    "Gifting for {P}'s family",
  ],
  money: [
    'Day-to-day finances',
    'Long-term financial decisions',
    'Whose career is prioritized',
    'How we hold money',
    'Saving v spending',
    'Risk tolerance',
  ],
  life: [
    'Children',
    'When family & partner conflict',
    'Where we live',
    'Social life',
    'Daily rhythm',
    'Faith & spirituality',
    'Core values & beliefs',
  ],
};

// Threshold helper for alignment percentages.
// Returns 'compatible' | 'discuss' | 'different'.
export function alignmentState(pct) {
  if (pct >= 75) return 'compatible';
  if (pct >= 40) return 'discuss';
  return 'different';
}

// Returns the right state-prose blurb from a domain object given a percent.
export function alignmentText(domain, pct) {
  const state = alignmentState(pct);
  if (state === 'compatible') return domain.compatibleText;
  if (state === 'discuss')    return domain.discussText;
  return domain.differentText;
}

// ── Expectations similarity scoring ──────────────────────────────────────
// Replaces the previous binary "match / no-match" alignment with a
// continuous similarity score per item, based on the distance between the
// two partners' chosen options on the question's ordered scale.
//
// Spec (from Ellie, May 2026):
//   - Each item gets a similarity score in [0, 1] based on option-position
//     distance. Same answer → 1.0. Opposite ends → 0.0. In between, linear.
//   - Domain score = mean of item scores within that domain
//   - Overall score = mean of the 6 domain scores (each weighted equally)
//
// Display:
//   - Overall % shows on the click-through results experience
//   - 6 per-domain %s show on the workbook Snapshot
//   - Domain pages show only the tagline (compatible / discuss / different),
//     no percentage callout
//
// Caveat on linear-distance assumption: the algorithm trusts the option
// array's order as a linear scale. For the ~3 life questions whose options
// aren't actually linear (e.g. lq_family_conf, lq_routine, lq_conflict_repair),
// the score is an approximation, not a true semantic similarity. If that
// matters, reorder the options array so adjacent values are most-similar.

// Responsibility option sets. The first three options are an ordered axis
// (user-pole / middle / partner-pole) and the fourth is an off-scale "doesn't
// apply" marker. Two flavors:
//   - "future" set uses live names: [userName, partnerName, "Both of us", "Doesn't apply to us"]
//   - "career" set is name-free:    ["Primarily mine", "Balanced", "Primarily my partner's", "Doesn't apply"]
//
// The middleValue and offscaleValue are the only strings the scorer needs to
// identify by literal. User/partner poles are identified by the names passed
// in at score time.
export const RESPONSIBILITY_OPTION_SHAPES = {
  future: { middle: 'Both of us', offscale: "Doesn't apply to us" },
  career: { middle: 'Balanced',   offscale: 'Doesn\'t apply',
            userPole: 'Primarily mine', partnerPole: "Primarily my partner's" },
};

// Score a single responsibility answer pair.
// userValue / partnerValue: the saved strings (after name substitution)
// userName / partnerName: the live names this couple sees
// Returns: number in [0, 1] or null if the values can't be parsed.
export function scoreResponsibilityPair(userValue, partnerValue, userName, partnerName) {
  const rankOf = (val) => {
    if (val == null || val === '') return { rank: null, offscale: null };
    // Career-set
    if (val === RESPONSIBILITY_OPTION_SHAPES.career.userPole)    return { rank: 0, offscale: false };
    if (val === RESPONSIBILITY_OPTION_SHAPES.career.middle)      return { rank: 1, offscale: false };
    if (val === RESPONSIBILITY_OPTION_SHAPES.career.partnerPole) return { rank: 2, offscale: false };
    if (val === RESPONSIBILITY_OPTION_SHAPES.career.offscale)    return { rank: null, offscale: true };
    // Future-set (name-based)
    if (val === userName)    return { rank: 0, offscale: false };
    if (val === RESPONSIBILITY_OPTION_SHAPES.future.middle)   return { rank: 1, offscale: false };
    if (val === partnerName) return { rank: 2, offscale: false };
    if (val === RESPONSIBILITY_OPTION_SHAPES.future.offscale) return { rank: null, offscale: true };
    return { rank: null, offscale: null }; // unrecognized
  };
  const a = rankOf(userValue);
  const b = rankOf(partnerValue);
  if (a.rank === null && a.offscale === null) return null;
  if (b.rank === null && b.offscale === null) return null;
  // Off-scale handling: both off-scale → match (1.0); mismatched → 0.0.
  if (a.offscale && b.offscale) return 1.0;
  if (a.offscale || b.offscale) return 0.0;
  // Both ranked: linear distance on 3-point scale.
  const dist = Math.abs(a.rank - b.rank);
  return (2 - dist) / 2; // 0 → 1.0, 1 → 0.5, 2 → 0.0
}

// Score a single life-question answer pair.
// options: the ordered options array for this question
// Returns: number in [0, 1] or null if either answer is missing/unknown.
export function scoreLifeQuestionPair(userValue, partnerValue, options) {
  if (!options || options.length < 2) return null;
  if (userValue == null || partnerValue == null) return null;
  const a = options.indexOf(userValue);
  const b = options.indexOf(partnerValue);
  if (a === -1 || b === -1) return null;
  const max = options.length - 1;
  const dist = Math.abs(a - b);
  return (max - dist) / max;
}

// Ordered option lists for life-question scoring. Mirrors LIFE_QUESTIONS in
// src/App.jsx — source of truth for the scoring scale per question. Note:
// some questions are categorical rather than truly linear (lq_family_conf,
// lq_routine, lq_conflict_repair, lq_closeness); for these the score is a
// reasonable approximation but not a true semantic similarity.
export const LIFE_QUESTION_OPTIONS = {
  lq_children:        ['Not part of my future', 'Uncertain', 'Open to it', 'Important to me, I want at least one', 'Central to my future'],
  lq_involve_user:    ['Very little, if any', 'Minimal, by design', 'Casual relationship', 'Consistent contact', 'Frequent, deeply integrated'],
  lq_involve_partner: ['Very little, if any', 'Minimal, by design', 'Casual relationship', 'Consistent contact', 'Frequent, deeply integrated'],
  lq_family_conf:     ['Side with partner', 'Mediate fairly', 'Defend family if right', 'Keep the peace'],
  lq_location:        ['Rooted where I am', 'Strong preference, open to discussion', 'Wherever makes sense for both', 'Genuinely open'],
  lq_social:          ['Mostly just us', 'Quiet default', 'Healthy balance', 'Pretty social', 'Very social'],
  lq_routine:         ['Need a lot of structure', 'Prefer loose rhythm', 'Adapt easily', 'Prefer open', 'Resist routine'],
  lq_faith:           ['Plays no role', "Personal, wouldn't shape shared life", 'Present but not imposed', 'Meaningful role', 'Central'],
  lq_values:          ["Simply respect each other's views", 'Share broadly similar values', 'Be closely aligned', 'Be deeply aligned'],
  lq_finances:        ['Fully separate', 'Mostly separate, shared account for shared expenses', 'Mostly combined', 'Fully combined'],
  lq_money_lean:      ['Strongly saving', 'Lean toward saving', 'Neither', 'Lean toward spending', 'Fully in the present'],
  lq_money_risk:      ['Very conservative', 'Cautious but open', 'Comfortable with thought-through risk', 'Lean toward risk', 'Drawn to bold moves'],
};

// ── Gap blurbs ────────────────────────────────────────────────────────────
// Per-dimension prose for each gap state. 10 dimensions × 3 states (aligned /
// some_gap / notable_gap) = 30 blurbs. Universal across couple types — these
// describe the gap mechanic itself, not who you are.
//
// Rendered as the first paragraph of the dimension callout. The second
// paragraph is the couple-type blurb from WHEN_THIS_SHOWS_UP.
//
// Voice rules: short declarative, no em dashes, no hedging, neither end of
// any dimension framed as better.
// ── Per-dimension couple type selection ───────────────────────────────────
// The dimension-page blurb (WHEN_THIS_SHOWS_UP[dim][coupleType]) is normally
// keyed to the couple's OVERALL type. But the overall type is a composite, so
// a couple can have a single dimension where one partner answered against
// type. On that page, the overall-type blurb can describe a dynamic that
// doesn't match what they actually answered there.
//
// Fix: for each dimension, re-derive the couple type FROM THAT DIMENSION, then
// pull the matching blurb. Mechanic (confirmed with Ellie):
//   - Each dimension belongs to one type axis (Engage/Withdraw or Open/Guarded).
//   - For that dimension, recompute the partner's reading on that axis from the
//     single dimension score (same 3.0 boundary the overall engine uses).
//   - Hold the OTHER axis from the partner's overall type.
//   - Recombine into a per-dimension individual type per partner, pair them.
// Name references on the page then track the per-dimension classification.
//
// Axis assignment + orientation. Orientation is derived from each dimension's
// SPECTRUM/blurb semantics (which score end the blurbs treat as engage/open),
// NOT from the overall composite. The composite adds reassurance and needs in the
// reverse direction from their spectrum meaning, so trusting it here would
// pull the wrong blurb. Verified against blurb text per dimension.
//   E/W engage end: conflict=low(Engage quickly), repair=low(Formal/verbal),
//     energy=high(Outward), listening=high(Responsive)
//   O/G open end: expression=high(External), feedback=high(Open),
//     bids=high(Expressive), needs=low(Direct), love=low(Words),
//     reassurance=low(Voiced)
export const DIM_AXIS = {
  conflict:    { axis: 'EW', engageWhen: 'low'  },
  repair:      { axis: 'EW', engageWhen: 'low'  },
  energy:      { axis: 'EW', engageWhen: 'high' },
  listening:   { axis: 'EW', engageWhen: 'high' },
  expression:  { axis: 'OG', openWhen:   'high' },
  feedback:    { axis: 'OG', openWhen:   'high' },
  bids:        { axis: 'OG', openWhen:   'high' },
  needs:       { axis: 'OG', openWhen:   'low'  },
  love:        { axis: 'OG', openWhen:   'low'  },
  reassurance: { axis: 'OG', openWhen:   'low'  },
};

// Decompose a type letter into its two axis readings.
//   W = engage + open · X = engage + guarded · Y = withdraw + open · Z = withdraw + guarded
function _typeAxes(code) {
  return {
    engage: code === 'W' || code === 'X',
    open:   code === 'W' || code === 'Y',
  };
}
function _axesToType(engage, open) {
  if (engage && open)  return 'W';
  if (engage && !open) return 'X';
  if (!engage && open) return 'Y';
  return 'Z';
}

// Overall individual type code now comes from the shared type engine (single
// source of truth, used by the frontend too). Re-exported so existing importers
// (generate-workbook.js) keep working unchanged.
export { computeIndividualTypeCode } from './_type-engine.js';

// Per-partner type code for ONE dimension: override the dimension's own axis
// from its single score, hold the other axis from the overall type.
function _perDimensionTypeCode(overallCode, dim, score) {
  const cfg = DIM_AXIS[dim];
  if (!cfg) return overallCode; // unknown dim, no change
  const s = (score == null || isNaN(score)) ? 3 : Number(score);
  const overall = _typeAxes(overallCode);
  if (cfg.axis === 'EW') {
    const engage = cfg.engageWhen === 'low' ? s <= 3.0 : s >= 3.0;
    return _axesToType(engage, overall.open);
  }
  // OG axis
  const open = cfg.openWhen === 'low' ? s <= 3.0 : s >= 3.0;
  return _axesToType(overall.engage, open);
}

// Per-dimension couple type for blurb selection + name mapping.
//   userType / partnerType: overall individual type codes
//   userScore / partnerScore: this dimension's scores (user first, partner second)
// Returns:
//   lookupKey  — alphabetically sorted 2-letter key for WHEN_THIS_SHOWS_UP
//   nameMapId  — user-first 2-letter id for personalizeTypeRefs (so name
//                references resolve to the correct partner regardless of sort)
//   userLetter / partnerLetter — per-dimension codes
export function perDimensionCoupleType(userType, partnerType, dim, userScore, partnerScore) {
  const userLetter    = _perDimensionTypeCode(userType,    dim, userScore);
  const partnerLetter = _perDimensionTypeCode(partnerType, dim, partnerScore);
  return {
    lookupKey: [userLetter, partnerLetter].sort().join(''),
    nameMapId: userLetter + partnerLetter,
    userLetter,
    partnerLetter,
  };
}

export const GAP_BLURBS = {
  energy: {
    aligned:     "You recharge in similar ways. You move together in this sense and the rhythm feels right to both of you without negotiation.",
    some_gap:    "You recharge slightly differently. Mostly invisible, but on long weekends or after social stretches the mismatch may surface.",
    notable_gap: "You recharge in opposite directions. One refills inward, the other reaches outward. Understanding what you each need is crucial.",
  },
  expression: {
    aligned:     "You wear emotion and process situations similarly. This often means that neither has to translate what the other feels.",
    some_gap:    "You express emotion at slightly different levels.",
    notable_gap: "You express at very different levels. One wears it; the other holds it. The balance is found once you learn each other\'s signals.",
  },
  reassurance: {
    aligned:     "You need reassurance in similar amounts. Whether it gets said often or rarely, you share a baseline, so a quiet stretch tends to mean the same thing to both of you.",
    some_gap:    "You need reassurance in slightly different amounts. One of you may want it said a little more often than the other thinks to say it.",
    notable_gap: "You need reassurance in very different amounts. One of you wants where you stand said out loud. The other treats it as settled. Unnamed, the quiet reads as distance to one of you and as ordinary to the other.",
  },
  needs: {
    aligned:     "You ask for needs in similar ways. Whether direct or indirect, you share a protocol, which keeps small things from accumulating. Consider checking in with your partner on if the current state is still serving you both.",
    some_gap:    "You ask for needs at slightly different directness levels. One of you may be hinting while the other misses it.",
    notable_gap: "You ask for needs in very different ways. One names them outright while the other waits to be noticed. Unspoken, this is the gap where needs go unmet.",
  },
  bids: {
    aligned:     "You catch each other\'s bids at similar rates. Everyday gestures land. The quiet communication of the relationship is working.",
    some_gap:    "You respond to bids slightly differently. One of you may reach more than the other notices, or in a method the other isn\'t looking for.",
    notable_gap: "You respond to bids at very different rates. Missed efforts accumulate, even when neither of you intends them to.",
  },
  conflict: {
    aligned:     "You handle conflict at similar speeds. You usually are aligned in readiness to address conflict. The timing itself isn\'t the fight.",
    some_gap:    "You handle conflict at slightly different speeds. When one wants to address and the other wants to wait, friction can show up.",
    notable_gap: "You handle conflict at very different speeds. One often needs to engage now while the other tends to need space first. Without an agreement, conflicts can compound.",
  },
  repair: {
    aligned:     "You repair in similar ways. Both of you need the same kind of closure, whether verbal or through warmth. Hard moments typically end cleanly for both of you.",
    some_gap:    "You repair slightly differently. The risk is that one of you may consider a situation resolved while the other is still processing.",
    notable_gap: "You repair in very different ways. One needs verbal closure while the other tends to move on once warmth returns. If feelings go unshared, the same conflict can repeat.",
  },
  listening: {
    aligned:     "You listen in similar ways. When one of you brings something up, the attention the other offers tends to match what the speaker wanted.",
    some_gap:    "You listen a little differently. One of you leans toward quiet receiving, the other toward active response. Small mismatches in what being heard looks like can add up.",
    notable_gap: "You listen in notably different ways. One receives in silence; the other engages, asks, reflects back. Name which one you need in a given moment, so quiet doesn't read as distance and questions don't read as pressure.",
  },
  love: {
    aligned:     "You tend to give and receive love in compatible ways. What works for one tends to work for the other. Less translation needed.",
    some_gap:    "You give and receive love slightly differently. In busy stretches, the version sent isn\'t always the version the other needs.",
    notable_gap: "You give and receive love in very different ways. One often needs words while the other needs presence and action. Both are real, and neither replaces the other.",
  },
  feedback: {
    aligned:     "You give and receive feedback at similar comfort levels.",
    some_gap:    "You give and receive feedback at slightly different comfort levels. One of you may hold back things the other would want to hear.",
    notable_gap: "You give and receive feedback in very different ways. One tends to bring it directly, while the other softens or holds back. Useful conversations may need both of you to stretch.",
  },
};

// ── "When this shows up" — couple-type-specific prose ─────────────────────
// Shown on each communication dimension page, above the commitment write-in.
// Present-tense, second-person, 2-3 sentences. Written as advice you'd flip
// to during a real moment — no hedging, no clinical framing.
//
// Structure: WHEN_THIS_SHOWS_UP[dim][coupleTypeId] = prose string
//
// If a specific couple-type entry is missing, the generator falls back to
// the WW entry for that dimension. Energy & Recharge is fully drafted
// across all 10 types as the reference example; other dimensions currently
// use the WW version as placeholder and need per-type prose written.
export const WHEN_THIS_SHOWS_UP = {
  energy: {
    WW: "You\'ll feel it after social weekends. Both of you refill through connection, so you can miss when one of you is drained. After full days, check in before making more plans.",
    XX: "You\'ll feel it after busy stretches when neither has named being tired. Both of you recover by doing, not talking, so exhaustion builds quietly. Name the feeling before it turns into irritability.",
    YY: "You\'ll feel it after dinners, family visits, work events. Both need real recovery time. Protect the next morning, don\'t pack it with anything that asks more of you.",
    ZZ: "You\'ll feel it when one of you is depleted and the other can\'t tell. Neither broadcasts the drain. Consider naming the feeling: \'I\'m running low today.\'",
    WX: "You\'ll feel it when one wants to debrief and the other is done talking. One recharges out loud, the other in quiet. Allow for a 10-minute recharge before the conversation starts.",
    WY: "You\'ll feel it on the way home from anything social. [W partner name] is warmed up; [Y partner name] could be nearing their limit. Quiet first, then reconnection.",
    WZ: "You\'ll feel it after social events. [W partner name] wants to talk, [Z partner name] wants silence. [W partner name] shares one highlight and stops. [Z partner name] could contribute later, after real quiet.",
    XY: "[X partner name] can be ready to move on when [Y partner name] is still processing. Having different recovery timelines does not mean avoidance. Name what you both need.",
    XZ: "Both of you recover internally. Efficient, but it can tip into isolation. Once a week, ask the specific question: \'how are you, actually?\'",
    YZ: "Both go quiet after a busy stretch and neither moves first. Since both need space, consider agreeing in advance a time to reconnect. Recharge how you need, but make space for connection, too.",
  },
  expression: {
    WW: "You\'re both expressive, so silence between you is information. When one of you has been quieter than usual, name it out loud instead of waiting to see if it clears.",
    XX: "Both of you process internally. A lot can accumulate before anything gets said. Set a casual weekly check-in. Each names one thing they\'ve been carrying with no solution required.",
    YY: "Both of you share once you\'ve had time to reflect, so jumping to \'what\'s wrong\' can go poorly. A walk or a car ride can provide a structured opportunity to share thoughts and feelings.",
    ZZ: "Both of you hold things privately. Once a week, one should ask a direct question that will require a direct answer: \'What\'s the thing you haven\'t told me yet?\' It will feel clunky at first, but try it anyway.",
    WX: "[W partner name] needs to externalize emotion, but [X partner name] needs to process privately first. Give [W partner name] a short window to share. Give [X partner name] room to respond later.",
    WY: "[W partner name] is ready to share in the moment; [Y partner name] needs more time. [W partner name] can keep the instinct to name things, but should add \'no need to respond right now\' to be responsive to [Y partner name]\'s needs.",
    WZ: "Sometimes [W partner name] will feel something strongly and [Z partner name] will have gone quiet. [W partner name] may read that quiet as distance, but [Z partner name] is processing. When [W partner name] feels a gap, name it: \'I know you\'re with me. I need to hear it sometimes.\'",
    XY: "[X partner name] is ready to name things concretely, while [Y partner name] needs emotional space to surface first. Name the observation, not the feeling. \'You\'ve been quiet since Tuesday\' can land better than \'what\'s wrong?\'",
    XZ: "Both of you default to holding. Schedule a specific time, not \'we should talk soon\' but \'Sunday at 4.\' The structure can make the conversation possible when nothing else does.",
    YZ: "Both of you need time to surface. If the quiet doesn\'t break on its own after two days, check in. Consider scheduling a specific time to check in.",
  },
  reassurance: {
    WW: "Both of you say where you stand readily, so it rarely goes unsaid. The risk is that it turns into a routine and stops carrying weight. Make it specific. Name the thing, not the category.",
    XX: "Neither of you says it much, and both of you assume it is understood. That holds until a hard stretch, when neither of you thinks to check. Say it plainly once a month anyway.",
    YY: "Both of you feel the quiet. Under pressure you each go inward and wait for the other to reach first. Whoever notices the gap says it first.",
    ZZ: "Both of you treat it as settled, and mostly it is. The gap shows up after a rough patch, when neither of you names that you are okay. Say it once out loud. Short is fine.",
    WX: "[W partner name] wants where they stand said out loud. [X partner name] treats it as given and does not think to say it. [X partner name] can offer it without being asked, and [W partner name] can read the steadiness in the quiet.",
    WY: "Both of you want it said. [W partner name] asks in the moment; [Y partner name] waits. When [Y partner name] goes quiet is usually when it matters most, so [W partner name] can offer it first.",
    WZ: "[W partner name] checks in to feel close. [Z partner name] holds it as obvious and stays quiet. When [W partner name] asks, they are not doubting the relationship. When [Z partner name] does not say it, they are not withholding.",
    XY: "[Y partner name] feels a long quiet and starts to wonder about it. [X partner name] does not register the gap at all. One unprompted sentence from [X partner name] closes it.",
    XZ: "Neither of you asks for it and neither of you offers it. That is comfortable right up until something is actually off and there is no signal either way. Build one small check-in you both do on purpose.",
    YZ: "Both of you wait rather than ask. [Y partner name] feels the distance. [Z partner name] does not read the silence as anything. Whoever notices the gap names it, even briefly.",
  },
  needs: {
    WW: "Both of you tend to hope the other will notice, then feel let down when they don\'t. Ask directly even when it feels clunky.",
    XX: "Both of you can tend to try to avoid adding to the other\'s load. Generous, but also how you can both end up depleted. Ask for small things before they become big things.",
    YY: "Both of you take time to understand what you want before asking, which can delay sharing your needs. Trust that \'I think I need X, not sure yet\' is a valid way to start.",
    ZZ: "Neither of you broadcasts needs openly, which means you may benefit from asking a weekly question: \'Is there anything you need that I\'m not giving you?\' The answer may take time, but ask anyway.",
    WX: "[W partner name] is comfortable asking directly, while [X partner name] often won\'t return the question. [W partner name] can ask: \'Is there anything you need that you haven\'t asked for?\' Watch for the pause before the answer.",
    WY: "[W partner name] tends to ask for what they need while [Y partner name] may quietly set needs aside. Try to ask \'what do you need this week?\' before [Y partner name] mentions it.",
    WZ: "[W partner name] tends to ask directly, while [Z partner name] usually won\'t. Create a reliable moment or weekly ritual where [Z partner name] is explicitly asked what they need for the week.",
    XY: "[X partner name] names needs practically, while [Y partner name] often has needs not yet shared. [X partner name] may interpret [Y partner name]\'s hesitation as \'no real need,\' but that is not always the case. Give [Y partner name] 24 hours to come back and follow up.",
    XZ: "Both of you hold needs back. The fix is explicit: a scheduled check-in where each names one thing, even small things like \'I\'d like a quiet night Thursday.\' This can help you two normalize casual requests.",
    YZ: "Both of you wait until the need is obvious. Try to ask before it\'s obvious: \'How\'s your tank this week?\' as a standing question. [Z partner name] may need a moment to answer, and that\'s fine.",
  },
  bids: {
    WW: "Both of you are usually good at catching bids, but a missed one stings more when it comes from someone who usually catches them. When you notice, address it kindly. Don\'t keep a quiet score of misses.",
    XX: "Both of you respond to bids through action more than words. It will be helpful to understand each others\' methods of communicating to ensure it still works.",
    YY: "Your bids tend to be gentle, a song they liked, a comment about the weekend. They can be easy to miss, but important to recognize and respond to in the appropriate manner. A soft return is the right answer to a soft bid.",
    ZZ: "Your bids may be the quietest of any pairing. A hand brushed, a book left on the counter. If one is missed, you may not either try again that day. Watch for the small things.",
    WX: "[W partner name] makes a warm bid; [X partner name] tends to respond practically. Both are real. They simply land differently. [W partner name] can name the response they\'d like. [X partner name] holds for a moment on warmth before moving to logistics.",
    WY: "[W partner name] reaches warmly; [Y partner name] receives it but takes a moment to return. It is important to know that this delay is processing time, not distance. [Y partner name] can offer a small nod or look to show that the bid landed.",
    WZ: "[W partner name] bids bigger and more often; [Z partner name] bids rarely but meaningfully. Don\'t measure by frequency; measure by weight. [Z partner name]\'s one bid can carry as much intention as five of [W partner name]\'s.",
    XY: "[X partner name] bids practically; [Y partner name] bids emotionally. Identify how each of you bids and how each of you responds. [Y partner name]\'s emotional check-in could be the bid. [X partner name]\'s offer to help could be the bid.",
    XZ: "Both of you take quiet bids at face value without naming them. That works most of the time. Every so often, mark appreciation out loud to reinforce the pattern.",
    YZ: "[Y partner name] extends a soft bid; [Z partner name] may take time processing. Neither of you is pushy, so bids can disappear silently. Build a small daily ritual to foster meaningful connection.",
  },
  conflict: {
    WW: "Both of you want to address tension relatively quickly. This is mostly a strength, except when \'now\' means neither of you is regulated. It may prove productive for you to each recognize your temperature: \'I\'m heated, give me ten minutes.\'",
    XX: "Both of you want to resolve conflict efficiently, which works for most things. For the harder stuff, one of you should name the emotional layer explicitly: \'this one\'s not just logistics for me.\'",
    YY: "Neither of you want to engage in heated conflict, and will often choose distance first. This approach is valid but benefits from a structured plan of return. Agree in advance: 24 hours max before one of you reopens the discussion.",
    ZZ: "Both of you would rather let conflict sit than press, which works fine until it doesn\'t. It may be helpful to schedule a time to revisit. Not \'is there an issue,\' but \'here\'s the thing I noticed.\'",
    WX: "[W partner name] wants to surface feelings in the heat of emotion, while [X partner name] wants to solve the problem logically. Try splitting it. Name the feeling first, then the thing to solve so that neither gets skipped.",
    WY: "When [W partner name] is ready to engage, [Y partner name] may already be at capacity. Agree on a pause protocol ahead of time. When one needs space, the pause has a scheduled end. Build trust by coming back when you said you would.",
    WZ: "When [W partner name] wants to talk it through, [Z partner name] may have gone quiet. Slow [W partner name] down and give [Z partner name] a specific return time. Build trust by coming back when you said you would.",
    XY: "When [X partner name] wants to resolve, [Y partner name] may still need to process. This hesitation isn\'t avoidance, and efficiency isn\'t \'not caring.\' Try naming it: \'I need to sort this tonight; you need tomorrow.\' Then discuss.",
    XZ: "Both of you want to let conflict go, but both of you carry the residue. Make a specific time each week to revisit anything unsaid. It may feel clunky, but try it anyway.",
    YZ: "Both of you need space, and both of you wait to discuss conflict. Decide in advance who comes back first. The other won\'t feel pressed.",
  },
  repair: {
    WW: "Both of you lean towards verbal closure, but you may be on different timelines. The repair often isn\'t complete until both have said so out loud. Don\'t assume warmth means resolved.",
    XX: "Both of you move on efficiently, and repair can stay implicit. Every few times, make it explicit. \'We\'re good\' can be worth saying even when it feels unnecessary.",
    YY: "Both of you repair slowly, and may underestimate how much time the other needs. Assume 48 hours before you call it done. Check in on day three if either of you is still sitting with something.",
    ZZ: "After a disagreement, both of you tend to go quiet, and neither may be sure if things are repaired or just paused. A specific question can offer a productive path forward: \'Are we good?\' Not rhetorical, wait for a real answer.",
    WX: "[W partner name] tends to need to hear \'we\'re good\' out loud to feel resolved. [X partner name] may feel done once the issue is sorted. Stating the closure anyway can help both of you move forward even if it feels unnecessary.",
    WY: "When [W partner name] wants to continue the discussion, [Y partner name] may still need to process. [W partner name] can say \'no rush, we\'ll come back.\' [Y partner name] can mark progress with a hand or a look so the silence doesn\'t read as distance.",
    WZ: "When [W partner name] wants to verbally repair, [Z partner name] may have gone inward. [Z partner name] isn\'t refusing repair, just processing. Give it a full day and watch for one clear signal that [Z partner name] is ready.",
    XY: "[X partner name] tends to confirm the logical resolution, while [Y partner name] may still sit with the emotional layer. Both are valid, two sentences may help: \'Here\'s what we agreed\' and \'I know this one took a moment for you.\'",
    XZ: "Both of you move on quietly, which works for most things. For the bigger ones, one of you should say out loud: \'I want to make sure we\'re actually repaired here.\'",
    YZ: "Both of you need time, and may leave the final check unspoken. A one-liner 48 hours later can be enough: \'Are we good after Monday?\'",
  },
  listening: {
    WW: "Both of you listen by engaging, asking, responding. Conversations move fast. Build in a beat where one of you just receives before the other jumps in, so the listening doesn't get crowded out by the responding.",
    XX: "Both of you respond and stay in it, but you process before you say much back. Say the small acknowledgment out loud, an 'I hear you,' so the other knows they've landed while you're still thinking.",
    YY: "Both of you take things in quietly before you respond. That's deep listening, but in a hard moment two quiet listeners can each wait for the other to engage. Agree on who reflects back first.",
    ZZ: "Both of you listen by going quiet and sitting with it. Real attention, easy to miss. Build a small signal, a word or a touch, so the other knows the silence is full, not empty.",
    WX: "[W partner name] responds quickly and out loud, while [X partner name] takes it in before answering. [W partner name] can leave a beat after [X partner name] speaks. [X partner name] can offer a quick 'still with you' so the quiet doesn't read as distance.",
    WY: "[W partner name] listens by engaging and asking, while [Y partner name] needs to receive quietly first. [W partner name] can hold the questions a moment. [Y partner name] can name 'I'm taking this in' so the quiet isn't mistaken for pulling away.",
    WZ: "[W partner name] responds and asks; [Z partner name] receives quietly and says little back. [W partner name] can read the quiet as attention, not absence. [Z partner name] can offer one small signal so [W partner name] knows it landed.",
    XY: "[X partner name] responds once they've processed; [Y partner name] takes it in and surfaces it later. Both of you listen deeply, neither shows it in the moment. Say the small acknowledgment out loud so each of you knows the other is there.",
    XZ: "Both of you receive quietly and respond sparingly. Genuine attention, low signal. Build a habit of one verbal acknowledgment when the other brings something, so being heard is visible.",
    YZ: "Both of you go quiet to listen, and both surface things slowly. In a hard moment, decide who reflects back first so a real exchange doesn't stall in two kinds of silence.",
  },
  love: {
    WW: "Both of you tend to be actively loving, which can make the misses feel especially strange. Tell each other plainly: \'this is what works for me.\' Specific and concrete, not abstract.",
    XX: "Both of you tend to show love by doing, which can underweight how much the other wants to hear it. Say it out loud, even when you think it\'s obvious.",
    YY: "Both of you tend to express love gently, and may wonder if the other still feels it. Ask directly: \'Do you feel loved by me right now?\' Don\'t assume, ask.",
    ZZ: "Love is real, but it\'s often almost entirely non-verbal. Every so often, add the sentence out loud. Don\'t wait for a big occasion, a simple Tuesday works.",
    WX: "[W partner name] tends to express love verbally, while [X partner name] expresses it through care and effort. Both are real. [W partner name] needs to hear it, and [X partner name] needs to see it. Say it out loud and show up consistently.",
    WY: "[W partner name] tends to be expressive, while [Y partner name] returns it more softly. Not less, just softly. [W partner name] can match [Y partner name]\'s pace sometimes, and [Y partner name] can push past the quieter default once in a while.",
    WZ: "[W partner name] is openly loving, while [Z partner name] tends to show love through presence and reliability. [W partner name] may feel that [Z partner name] holds back, while [Z partner name] may feel that [W partner name] performs. Try matching the other\'s method once a week.",
    XY: "[X partner name] tends to love practically, while [Y partner name] loves emotionally. [X partner name] can add a word about the feeling, alongside the task. [Y partner name] can acknowledge the task, alongside the feeling. Both stretch a little.",
    XZ: "Both of you tend to prefer love expressed through reliable action, and may miss the words. Add them occasionally, without ceremony. \'I\'m glad it\'s you.\' That\'s enough.",
    YZ: "Love is quiet and steady, and both of you may sometimes wonder if it\'s still there. It is. Once in a while, mark it explicitly. A Tuesday text, a specific sentence. Unnecessary by design, and worth it.",
  },
  feedback: {
    WW: "Both of you tend to prefer honest conversation to resentment, but avoidance can still happen around topics that feel risky. Name the topic first, then the feedback. \'I want to talk about X\' can lower the stakes.",
    XX: "Both of you tend to handle direct feedback well, but it isn\'t always easy. Frame it: \'this isn\'t a big thing, and I want to mention it.\' This takes the edge off without softening the content.",
    YY: "Both of you may wait for the right moment, but the right moment rarely arrives on its own. Build a weekly check-in where each offers one small piece of feedback. Normal volume, normal tone.",
    ZZ: "Both of you tend to hold feedback back, not from avoidance, but because you want to be sure first. Lowering the threshold can help: \'I noticed this. I don\'t have a full read yet, just wanted to say it out loud.\'",
    WX: "[W partner name] tends to give feedback with emotion attached, while [X partner name] wants it delivered as logic. [W partner name] can strip the edge, and [X partner name] can absorb the emotional layer without requiring it to be removed. Both are a stretch.",
    WY: "[W partner name] tends to raise feedback in real time, while [Y partner name] needs more warning. Heads-up first: \'I have something I want to mention, when\'s good?\' [W partner name] gets to say it, and [Y partner name] gets to receive it well.",
    WZ: "[W partner name] tends to deliver feedback openly, while [Z partner name] processes it internally and slowly. [W partner name] may want an immediate response. Don\'t push for one. Give [Z partner name] time, even a full day. The response will be better.",
    XY: "[X partner name] tends to give feedback concisely, while [Y partner name] needs more relational framing. [X partner name] can add one line of context (\'this matters because...\') without changing the substance. [Y partner name] can hold the feedback without requiring the context to expand.",
    XZ: "Both of you tend to prefer precision over speed, which can mean the feedback never lands. Schedule it. Monthly, each of you names one thing. Not as an event, but as a habit.",
    YZ: "Both of you want to deliver it well, but may overwait. Set a shorter threshold (within a week) for anything worth saying.",
  },
};


// ── Six Moments Library scenes ──────────────────────────────────────────
// 6 moments × 4 individual types = 24 scenes. Each scene has 4 blocks.
// The subject partner is referred to as "they" throughout.
/**
 * The six moments, per individual type, as the .docx has always named them.
 *
 * ── THE WORDS ARE THE PDF'S NOW ───────────────────────────────────────────
 * Every one of the 96 fields here differed from the PDF builder's version of
 * the same six moments, and the PDF's is written with {U} and {P} so it names
 * the two people. Ellie chose that one.
 *
 * Derived from MOMENTS_W/X/Y/Z rather than copied, so there is one place to
 * edit. The field names are kept as they were, because scripts/_shared_drafts
 * and the review-document generator read them: `notTo` is the PDF's `not`.
 *
 * `moment`, the line that sets the scene, has no counterpart in the old .docx
 * version. It is carried through, and the moment card draws it.
 */
export const SCENE_DRAFTS = Object.fromEntries(
  Object.entries({ W: MOMENTS_W, X: MOMENTS_X, Y: MOMENTS_Y, Z: MOMENTS_Z })
    .map(([letter, moments]) => [
      letter,
      Object.fromEntries(Object.entries(moments).map(([key, m]) => [key, {
        moment: m.moment,
        happening: m.happening,
        notTo: m.not,
        works: m.works,
        phrase: m.phrase,
      }])),
    ]),
);
