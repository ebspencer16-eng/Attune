// api/_workbook-content.js
// Shared content for the personalized workbook generator.
// Underscore prefix = not an API route (Vercel ignores it).

export const DIMS = ['energy','expression','needs','bids','conflict','repair','closeness','love','stress','feedback'];

export const DIM_META = {
  energy:     { label: 'Energy & Recharge',           left: 'Inward',         right: 'Outward',          color: '9B5DE5' },
  expression: { label: 'Emotional Expression',         left: 'Guarded',        right: 'Expressive',       color: 'E8673A' },
  needs:      { label: 'How You Ask for Needs',        left: 'Direct',         right: 'Indirect',         color: '1B5FE8' },
  bids:       { label: 'Responding to Bids',           left: 'Reserved',       right: 'Attuned',          color: '10B981' },
  conflict:   { label: 'Conflict Style',               left: 'Engage quickly', right: 'Needs space first', color: '1B5FE8' },
  repair:     { label: 'How You Repair',               left: 'Formal / verbal', right: 'Informal / warmth', color: 'E8673A' },
  closeness:  { label: 'Closeness & Independence',     left: 'Autonomous',     right: 'Close-seeking',    color: '9B5DE5' },
  love:       { label: 'How Love Lands',               left: 'Words',          right: 'Actions & Presence', color: '10B981' },
  stress:     { label: 'Communication Under Stress',   left: 'Withdraw',       right: 'Seek connection',  color: '1B5FE8' },
  feedback:   { label: 'Giving & Receiving Feedback',  left: 'Guarded',        right: 'Open',             color: 'E8673A' },
};

// Returns dimension-level close/gap text and a weekly practice.
// All strings support {U} and {P} substitution (caller handles).
export const DIM_CONTENT = {
  energy: {
    measures: 'How each of you recovers, socially, emotionally, physically. Inward: solitude recharges. Outward: connection recharges. This shapes your weekend default, how you decompress, and what a good evening looks like.',
    closeText: '{U} and {P} recover in similar ways. This quietly removes friction, you\'re rarely on opposite ends after a hard week.',
    gapText: 'One of you recharges through solitude; the other through connection. After a long week, you\'re in very different places. Without a framework, the inward partner\'s need for quiet can read as withdrawal, and the outward partner\'s reach for people can feel exhausting.',
    prompts: [
      'After a big social event, what does each of you need in the next 24 hours?',
      'When does one of you feel most energized, and when does the other feel most depleted?',
      'Is your current daily rhythm giving each person the kind of recovery they need?',
      'Is there anything either of you has been asking of the other that runs against their recharge style?',
    ],
    thisWeek: 'Pick one upcoming situation likely to produce different energy states, a party, a family visit, a busy week. Before it happens, name what you\'ll each need afterward. Then check in.',
  },
  expression: {
    measures: 'How freely each of you shares what\'s going on internally, not the content of feelings, but how naturally they surface. Expressive partners wear their emotional state; guarded partners process privately and share selectively.',
    closeText: '{U} and {P} are operating in the same register. Neither tends to feel overwhelmed by too much sharing or starved by too little.',
    gapText: 'One of you shares as feelings arise; the other waits until they\'ve processed. The expressive partner may experience the guarded one\'s silence as emotional unavailability. The guarded partner may experience the expressive one\'s openness as pressure.',
    prompts: [
      'When something bothers you, at what point do you typically share it, immediately, after processing, or only when asked?',
      'When one of you is struggling, does the other know? Or is it usually carried privately?',
      'Is there a version of your emotional experience you share, and a version you hold back?',
      'What would feel different if either of you shared more, or less?',
    ],
    thisWeek: 'Each of you shares one thing you\'d normally hold back or let pass, not something big, just something that\'s been sitting there. Notice what happens.',
  },
  needs: {
    measures: 'How directly each partner communicates needs, whether they ask outright or signal indirectly. Direct communicators state needs explicitly. Indirect communicators hint, hope to be noticed, or pull back.',
    closeText: '{U} and {P} communicate needs with similar directness. There are fewer unspoken expectations, and less of the resentment that builds when needs go unnamed.',
    gapText: 'One of you asks directly; the other signals. The direct partner may feel set up to fail, they can\'t respond to what they can\'t see. The indirect partner may feel chronically unseen. This is one of the most common sources of quiet resentment in long-term relationships.',
    prompts: [
      'Think of the last time you needed something and didn\'t get it. Did you ask directly, or did you signal?',
      'Is there something you\'ve needed for a while that you haven\'t said clearly? What\'s the barrier?',
      'Do you each know what the other needs right now? Has it been said, or are you guessing?',
      'What would make it easier for each of you to ask more directly?',
    ],
    thisWeek: 'Each of you names one thing you need from the other this week, specifically, without softening. "I need you to ___." Notice what it feels like to ask that clearly.',
  },
  bids: {
    measures: 'How reliably each partner notices and responds to small, everyday bids for connection, a comment, a gesture, a look. These micro-moments are the primary currency of sustained intimacy in long-term relationships.',
    closeText: '{U} and {P} both notice and respond naturally to each other\'s small bids. This is one of the strongest predictors of relationship satisfaction over time.',
    gapText: 'One partner tends to miss bids, absorbed in tasks, not naturally tracking the relational current. The other tracks them instinctively. Repeated missed bids can feel like dismissal even when none is intended.',
    prompts: [
      'Can you think of a recent moment when one of you reached for connection and the other wasn\'t available?',
      'Are there ways either of you reaches for the other that get regularly missed, not out of rejection, but out of being absorbed?',
      'What\'s the smallest thing each of you does that signals you want the other\'s attention?',
      'What would it look like to be slightly more tuned in, without it feeling performative?',
    ],
    thisWeek: 'Once a day this week, when one of you makes a small bid, says something minor, reaches out physically, checks in, the other stops what they\'re doing and acknowledges it specifically. Actually engage for 30 seconds.',
  },
  conflict: {
    measures: 'How each partner responds when something feels wrong, whether the instinct is to engage immediately or need space first. This is about timing, not care. Both instincts are legitimate; misread, they create one of the most persistent loops in relationships.',
    closeText: '{U} and {P} move toward resolution with similar timing. This symmetry removes the most common friction point in conflict, the pursuer-withdrawer dynamic.',
    gapText: 'One of you needs to address things immediately; the other needs space first. Without a framework, the person who needs resolution reads the other\'s silence as avoidance. The person who needs space reads the other\'s urgency as pressure. Both are behaving in ways that feel self-evidently correct, which is why this pattern is so persistent without an explicit agreement.',
    prompts: [
      'When something is bothering you, what does your ideal next few hours look like?',
      'When one of you is clearly upset and pulls back, what does that feel like for the other? What does the other do?',
      'Is there a version of "I need space" that lands differently than open-ended silence?',
      'What agreement would make the next hard moment go better than the last?',
    ],
    thisWeek: 'When things are calm, not during conflict, tell each other: "When I\'m upset, what I need first is ___." Write it down. Refer to it next time.',
  },
  repair: {
    measures: 'What each partner needs to feel genuinely repaired after conflict. One end needs explicit verbal acknowledgment, the words, the conversation, the closure. The other can move forward once the warmth is back, without needing the formal exchange.',
    closeText: '{U} and {P} both know what "okay again" feels like and reach it in similar ways. This shortens the distance between conflict and repair.',
    gapText: 'One of you considers things resolved when warmth returns. The other isn\'t repaired until there\'s been an explicit conversation. The informal partner often considers things over before the formal partner is ready, which means the formal partner is repeatedly left unrepaired, while the informal one is confused by what still feels open.',
    prompts: [
      'After a hard argument, what does "okay again" actually feel like for you? How do you know when you\'re there?',
      'Is there a version of your last unresolved argument where one of you thought it was resolved and the other didn\'t?',
      'What would a repair conversation look like that actually works for both of you?',
      'Is there a past disagreement that never fully closed? What would it take to finish it?',
    ],
    thisWeek: 'After the next friction moment, however small, check in explicitly: "Are we actually okay, or are we both just ready to be done?" Name the difference out loud.',
  },
  closeness: {
    measures: 'How much independent structure each partner needs within the relationship, separate pursuits, solo time, individual social lives. One end values deep togetherness; the other values a strong sense of self within the partnership.',
    closeText: '{U} and {P} want a similar balance of togetherness and independence. This prevents the slow accumulation of resentment that mismatched closeness needs create.',
    gapText: 'One of you gravitates toward maximum togetherness as the foundation of closeness. The other needs a strong independent life within the relationship. The autonomous partner may feel crowded; the close-seeking partner may feel lonely. Neither is making a statement about the relationship, they\'re operating from different blueprints for what closeness looks like.',
    prompts: [
      'On a typical week, is each of you getting the amount of alone time and together time you need?',
      'Are there independent pursuits, hobbies, friendships, routines, that feel important to each of you? Are they supported?',
      'When one of you wants more space, how do you navigate that without it feeling like rejection?',
      'What would your ideal weekly rhythm look like if you designed it intentionally?',
    ],
    thisWeek: 'Each of you writes down your ideal week, how much time together, how much apart. Compare them without judgment. Look for the gap and the overlap.',
  },
  love: {
    measures: 'How each partner most naturally gives and receives affection. Specifically: does verbal expression land most deeply, or does love register more through presence, action, and shared experience?',
    closeText: '{U} and {P} express and receive love through compatible channels. When care is expressed in a language the other naturally receives, the signal lands without translation.',
    gapText: 'One of you feels most loved through verbal affirmation; the other through presence, touch, or shared activity. Both may be genuinely expressing love, but in a language the other doesn\'t fully receive. Care is being offered but not landing, and both people can feel quietly undersatisfied without knowing why.',
    prompts: [
      'When did each of you last feel genuinely loved by the other? What was happening?',
      'What does each of you do that makes the other feel most cared for, even if it\'s something small?',
      'Is there something you\'d like more of that you haven\'t said clearly?',
      'Do you each know specifically how to make the other feel appreciated?',
    ],
    thisWeek: 'Each of you asks the other: "What\'s one thing I do that makes you feel really loved that I might not realize has that effect?" Then do more of it.',
  },
  stress: {
    measures: 'How each partner\'s communication style shifts when they\'re overwhelmed, anxious, or depleted. Some people shut down; others become more urgent and seek reassurance. Neither is a statement about the relationship, it\'s a stress response.',
    closeText: '{U} and {P} respond to stress in similar ways. This symmetry means neither partner is likely to be left alone in the way that matters most when pressure builds.',
    gapText: 'Under pressure, one of you shuts down; the other becomes more urgent and reaches for closeness. Without language for this, the seeking partner reads withdrawal as rejection; the withdrawing partner reads urgency as escalation. Both are in stress response, and making each other worse.',
    prompts: [
      'When either of you is really under pressure, what do you need from the other? Does the other know?',
      'How does each of you know when the other is struggling, even when they\'re not saying so?',
      'Have you ever been in a moment where you were both stressed and made it worse for each other?',
      'What\'s the most helpful thing someone can do when you\'re at your worst?',
    ],
    thisWeek: 'Next time one of you is clearly under pressure, the other asks: "Do you need me to help fix something, or do you just need me to be here?" Notice which answer comes back. Do that.',
  },
  feedback: {
    measures: 'How comfortably each partner gives and receives direct, honest feedback. Guarded partners tend toward defensiveness. Open partners can engage with critical input without feeling attacked, and tend to surface concerns more readily.',
    closeText: '{U} and {P} are in a similar place on feedback. This creates a low-friction environment for honest conversations, things that need to be said, get said.',
    gapText: 'One of you avoids direct feedback; the other can engage with it. The open partner may feel like things go unsaid for too long. The guarded partner may feel like honest observations come as attacks, even when not intended that way. Important things compound in silence.',
    prompts: [
      'Is there something either of you does regularly that bothers the other that hasn\'t been said clearly? What\'s the barrier?',
      'When one of you offers a critical observation, what\'s the other\'s first instinct?',
      'Can each of you tell the other when something isn\'t working without it becoming a bigger thing than it needs to be?',
      'What would make honest feedback easier in both directions?',
    ],
    thisWeek: 'Identify one small thing that bothered you recently that you let go without saying anything. Bring it up briefly, specifically: "Hey, this thing last week, can I mention it?" Notice what happens.',
  },
};

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
  {
    key: 'operate', label: 'How We Operate', color: 'purple',
    compatibleText: "You have similar instincts about conflict, repair, and closeness. The mechanics of getting back to each other tend to come without much translation.",
    discussText:    "Your instincts on friction and closeness diverge in places. These are the differences that matter most in the moments when one of you is already at capacity.",
    differentText:  "You operate from significantly different defaults around conflict and connection. The translation gap is widest exactly when the relationship needs it least.",
    thisWeek:       "Each of you describes what you most need from the other when you are at your worst. Compare them. The mismatch is the conversation.",
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
    'Maintaining closeness',
    'Hard conversations',
    'Repair after friction',
  ],
  extended_family: [
    "Visits with {U}'s family",
    "Visits with {P}'s family",
    "Staying in touch with {U}'s family",
    "Staying in touch with {P}'s family",
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
  operate: [
    'When to address conflict',
    'Conflict resolution time',
    'What repair looks like',
    'Physical affection',
    'Closeness during hard times',
    'Independence',
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
  lq_inperson_user:   ['Rarely, by design', 'A few times a year', 'Several times a year', 'Often, regular visits', 'Very often, deeply integrated'],
  lq_contact_user:    ['Minimal contact', 'Occasional check-ins', 'Regular contact', 'Daily or near-daily', 'Closely involved in our lives'],
  lq_inperson_partner:['Rarely, by design', 'A few times a year', 'Several times a year', 'Often, regular visits', 'Very often, deeply integrated'],
  lq_contact_partner: ['Minimal contact', 'Occasional check-ins', 'Regular contact', 'Daily or near-daily', 'Closely involved in our lives'],
  lq_family_conf:     ['Side with partner', 'Mediate fairly', 'Defend family if right', 'Keep the peace'],
  lq_location:        ['Rooted where I am', 'Strong preference, open to discussion', 'Wherever makes sense for both', 'Genuinely open'],
  lq_social:          ['Mostly just us', 'Quiet default', 'Healthy balance', 'Pretty social', 'Very social'],
  lq_routine:         ['Need a lot of structure', 'Prefer loose rhythm', 'Adapt easily', 'Prefer open', 'Resist routine'],
  lq_faith:           ['Plays no role', "Personal, wouldn't shape shared life", 'Present but not imposed', 'Meaningful role', 'Central'],
  lq_values:          ["Simply respect each other's views", 'Share broadly similar values', 'Be closely aligned', 'Be deeply aligned'],
  lq_finances:        ['Fully separate', 'Mostly separate, shared account for shared expenses', 'Mostly combined', 'Fully combined'],
  lq_money_lean:      ['Strongly saving', 'Lean toward saving', 'Neither', 'Lean toward spending', 'Fully in the present'],
  lq_money_risk:      ['Very conservative', 'Cautious but open', 'Comfortable with thought-through risk', 'Lean toward risk', 'Drawn to bold moves'],
  lq_conflict_when:   ['Address immediately', 'Bring up soon', 'Wait for right moment', 'Take significant space', 'Let things go'],
  lq_conflict_after:  ['Air clears quickly', 'Little space, same day', 'Need a night or two', 'Need several days', 'Varies a lot'],
  lq_conflict_repair: ['Direct explicit apology', 'Partner understands what happened', 'Warmth returns', 'Moving forward together'],
  lq_affection:       ['Essential', 'Very important', 'Nice but not needed consistently', 'Comfortable with less', 'Reserved'],
  lq_closeness:       ['Need more closeness', 'Steady need', 'Pull back and need space', 'Varies a lot'],
  lq_independence:    ['Matters enormously', 'Important but flexible', "Don't think about it much", 'Want less, prefer shared life'],
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
// NOT from the overall composite — the composite adds stress and needs in the
// reverse direction from their spectrum meaning, so trusting it here would
// pull the wrong blurb. Verified against blurb text per dimension.
//   E/W engage end: conflict=low(Engage quickly), repair=low(Formal/verbal),
//     stress=high(Seek connection), energy=high(Outward), closeness=high(Close-seeking)
//   O/G open end: expression=high(Expressive), feedback=high(Open),
//     bids=high(Attuned), needs=low(Direct), love=low(Words)
export const DIM_AXIS = {
  conflict:   { axis: 'EW', engageWhen: 'low'  },
  repair:     { axis: 'EW', engageWhen: 'low'  },
  stress:     { axis: 'EW', engageWhen: 'high' },
  energy:     { axis: 'EW', engageWhen: 'high' },
  closeness:  { axis: 'EW', engageWhen: 'high' },
  expression: { axis: 'OG', openWhen:   'high' },
  feedback:   { axis: 'OG', openWhen:   'high' },
  bids:       { axis: 'OG', openWhen:   'high' },
  needs:      { axis: 'OG', openWhen:   'low'  },
  love:       { axis: 'OG', openWhen:   'low'  },
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
  if (!cfg) return overallCode; // unknown dim — no change
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
    some_gap:    "You express emotion at slightly different levels. On hard days, the gap shows up as 'why aren\'t you saying anything.'",
    notable_gap: "You express at very different levels. One wears it; the other holds it. The balance is found once you learn each other\'s signals.",
  },
  needs: {
    aligned:     "You ask for needs in similar ways. Whether direct or indirect, you share a protocol, which keeps small things from accumulating.",
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
  closeness: {
    aligned:     "You want similar amounts of closeness and independence. The balance of together-time and alone-time tends to feel right to both of you.",
    some_gap:    "You want slightly different amounts of closeness. Small mismatches in how often you reach for each other can add up.",
    notable_gap: "You want notably different amounts of closeness. One tends to reach more, while the other defaults to space. Intentional communication can keep this balance in check.",
  },
  love: {
    aligned:     "You tend to give and receive love in compatible ways. What works for one tends to work for the other. Less translation needed.",
    some_gap:    "You give and receive love slightly differently. In busy stretches, the version sent isn\'t always the version the other needs.",
    notable_gap: "You give and receive love in very different ways. One often needs words while the other needs presence and action. Both are real, and neither replaces the other.",
  },
  stress: {
    aligned:     "You tend to handle stress in similar ways. Either you both reach out or both pull in. Matching stress responses means that the stress is not compounded.",
    some_gap:    "You handle stress slightly differently. The gap can show up exactly when one of you has the least bandwidth to translate.",
    notable_gap: "You handle stress in opposite directions. One often needs a listener, while the other often needs the room cleared. The wrong response can make it worse.",
  },
  feedback: {
    aligned:     "You give and receive feedback at similar comfort levels. Honest things tend to get said without much warm-up.",
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
    YZ: "Both go quiet after a hard stretch and neither moves first. Both need space, both can wait the other out. Agree in advance who comes back first after conflict.",
  },
  expression: {
    WW: "You\'re both expressive, so silence between you is information. When one of you has been quieter than usual, name it out loud instead of waiting to see if it clears.",
    XX: "Both of you process internally. A lot can accumulate before anything gets said. Set a casual weekly check-in. Each names one thing they\'ve been carrying with no solution required.",
    YY: "Both of you share once you\'ve had time to reflect, so jumping to \'what\'s wrong\' can go poorly. A walk or a car ride can provide a structured opportunity to share thoughts and feelings.",
    ZZ: "Both of you hold things privately. Once a week, one should ask a direct question that will require a direct answer: \'What\'s the thing you haven\'t told me yet?\' It will feel clunky. Do it anyway.",
    WX: "[W partner name] needs to externalize emotion, but [X partner name] needs to process privately first. Give [W partner name] a short window to share. Give [X partner name] room to respond later.",
    WY: "[W partner name] is ready to share in the moment; [Y partner name] needs more time. [W partner name] can keep the instinct to name things, but should add \'no need to respond right now.\'",
    WZ: "Sometimes [W partner name] will feel something strongly and [Z partner name] will have gone quiet. [W partner name] may read that quiet as distance, but [Z partner name] is processing. Name it: \'I know you\'re with me. I need to hear it sometimes.\'",
    XY: "[X partner name] is ready to name things concretely, while [Y partner name] needs emotional space to surface first. Name the observation, not the feeling. \'You\'ve been quiet since Tuesday\' can land better than \'what\'s wrong.\'",
    XZ: "Both of you default to holding. Schedule a specific time, not \'we should talk soon\' but \'Sunday at 4.\' The structure can make the conversation possible when nothing else does.",
    YZ: "Both of you need time to surface. Assume nothing is wrong unless someone says otherwise. If the quiet doesn\'t break on its own after two days, check in.",
  },
  needs: {
    WW: "Both of you can default to hoping the other will notice, then feeling let down when they don\'t. Ask directly even when it feels clunky.",
    XX: "Both of you can tend to try to avoid adding to the other\'s load. Generous, but also how you can both end up depleted. Ask for small things before they become big things.",
    YY: "Both of you take time to understand what you want before asking, which can delay sharing your needs. Trust that \'I think I need X, not sure yet\' is a valid way to start.",
    ZZ: "Neither of you broadcasts needs openly, which means you may benefit from asking a weekly question: \'Is there anything you need that I\'m not giving you?\' The answer may take time, but ask anyway.",
    WX: "[W partner name] is comfortable asking directly, while [X partner name] often won\'t return the question. [W partner name] can ask: \'Is there anything you need that you haven\'t named?\' Watch for the pause before the answer.",
    WY: "[W partner name] tends to ask for what they need while [Y partner name] may quietly set needs aside. Try to ask \'what do you need this week?\' before [Y partner name] mentions it.",
    WZ: "[W partner name] tends to ask directly, while [Z partner name] usually won\'t. Create a reliable moment, Sunday dinner or a weeknight ritual, where [Z partner name] is explicitly asked what they need for the week.",
    XY: "[X partner name] names needs practically, while [Y partner name] often has needs not yet shared. [X partner name] may interpret [Y partner name]\'s hesitation as \'no real need,\' but that is not always the case. Give [Y partner name] 24 hours to come back and follow up.",
    XZ: "Both of you hold needs back. The fix is explicit: a scheduled check-in where each names one thing, even small things like \'I\'d like a quiet night Thursday.\' This can help you two normalize casual requests.",
    YZ: "Both of you wait until the need is obvious. Ask before it\'s obvious: \'How\'s your tank this week?\' as a standing question. [Z partner name] may need a moment to answer, and that\'s fine.",
  },
  bids: {
    WW: "Both of you are usually good at catching bids, but a missed one stings more when it comes from someone who usually catches them. When you notice, address it. Don\'t let misses quietly stack.",
    XX: "Both of you express bids through action more than words. It will be helpful to understand each others\' methods of communicating, perhaps a shared task or a look across the room.",
    YY: "Your bids tend to be gentle, a song they liked, a comment about the weekend. They can be easy to miss, but important to recognize and respond to in the appropriate manner. A soft return is the right answer to a soft bid.",
    ZZ: "Your bids may be the quietest of any pairing. A hand brushed, a book left on the counter. If one is missed, you may not either try again that day. Watch for the small things.",
    WX: "[W partner name] makes a warm bid; [X partner name] tends to respond practically. Both are real. They simply land differently. [W partner name] can name the response they\'d like. [X partner name] holds for a moment on warmth before moving to logistics.",
    WY: "[W partner name] reaches warmly; [Y partner name] receives it but takes a moment to return. It is important to know that this delay is recovery time, not distance. [Y partner name] can offer a small nod or look to show that the bid landed.",
    WZ: "[W partner name] bids bigger and more often; [Z partner name] bids rarely but meaningfully. Don\'t measure by frequency. Measure by weight. [Z partner name]\'s one bid can carry as much intention as five of [W partner name]\'s.",
    XY: "[X partner name] bids practically; [Y partner name] bids emotionally. Identify how each of you bids and how each of you responds. [Y partner name]\'s emotional check-in could be the bid. [X partner name]\'s offer to help could be the bid.",
    XZ: "Both of you take quiet bids at face value without naming them. That works most of the time. Every so often, mark it out loud. \'Thanks for bringing me coffee\' reinforces the pattern.",
    YZ: "[Y partner name] extends a soft bid; [Z partner name] may take time processing. Neither of you is pushy, so bids can disappear silently. Build a small daily ritual, dinner or a walk, where bids can land.",
  },
  conflict: {
    WW: "Both of you want to address tension relatively quickly. This is mostly a strength, except when \'now\' means neither of you is regulated. It may prove productive for you to each recognize your temperature: \'I\'m heated, give me ten minutes.\'",
    XX: "Both of you want to resolve conflict efficiently, which works for most things. For the harder stuff, one of you should name the emotional layer explicitly: \'this one\'s not just logistics for me.\'",
    YY: "Neither of you want to engage in heated conflict, and will often choose distance first. This approach is valid but benefits from a structured plan of return. Agree in advance: 24 hours max before one of you reopens the discussion.",
    ZZ: "Both of you would rather let conflict sit than press, which works fine until it doesn\'t. It may be helpful to schedule a time to revisit. Not \'is there an issue,\' but \'here\'s the thing I noticed.\'",
    WX: "[W partner name] wants to surface feelings in the heat of emotion, while [X partner name] wants to solve the problem logically. Split it. Name the feeling first, then the thing to solve so that neither gets skipped.",
    WY: "When [W partner name] is ready to engage, [Y partner name] may already be at capacity. Agree on a pause protocol ahead of time. When one needs space, the pause has a scheduled end. Build trust by coming back when you said you would.",
    WZ: "When [W partner name] wants to talk it through, [Z partner name] may have gone quiet. Slow [W partner name] down and give [Z partner name] a specific return time. Build trust by coming back when you said you would.",
    XY: "When [X partner name] wants to resolve, [Y partner name] may still need to process. This hesitation isn\'t avoidance, and efficiency isn\'t \'not caring.\' Name it: \'I need to sort this tonight; you need tomorrow.\' Then discuss.",
    XZ: "Both of you want to let conflict go, but both of you carry the residue. Make a specific time each week to revisit anything unsaid. It may feel clunky, but do it anyway.",
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
  closeness: {
    WW: "Both of you want closeness, and both may also expect it to happen on its own. It can help to build one small ritual that doesn\'t require organizing, like a ten-minute talk or a shared morning routine.",
    XX: "Both of you tend to value shared activity over shared conversation, which can make closeness feel procedural. Schedule one casual thing that isn\'t about logistics: a walk, a show, dinner without phones.",
    YY: "Both of you value independence, which can sometimes tip into parallel lives. One small weekly overlap, a meal or a walk, can anchor the closeness.",
    ZZ: "Both of you default to independent rhythms. It can help to build a specific shared time, not optional, not moveable, where the expectation is being together without needing to produce anything.",
    WX: "[W partner name] tends to want a lot of connection, while [X partner name] wants side-by-side presence. Both are valid forms of closeness, they simply look different. Try alternating: one night [W partner name]\'s way, one [X partner name]\'s. Both count.",
    WY: "[W partner name] tends to want a bigger version of closeness, while [Y partner name] needs it quieter. Different channels. [W partner name] can turn the volume down without turning the signal off, and [Y partner name] can turn it up slightly on purpose.",
    WZ: "[W partner name] tends to bid frequently, while [Z partner name] may respond rarely but deeply. [W partner name] can feel unmet, and [Z partner name] can feel crowded. Lower the frequency, raise the intention. One thing a week with [Z partner name]\'s full attention.",
    XY: "[X partner name] tends to offer closeness practically, while [Y partner name] offers it emotionally. Identify the translation. Shared logistics can be closeness for [X partner name], and being seen can be closeness for [Y partner name]. Both can happen in the same week.",
    XZ: "Both of you are comfortable with independence, and may also drift over time. Anchor with a ritual that isn\'t about talking: cooking, a show, a walk. Closeness doesn\'t always require conversation.",
    YZ: "Both of you may wait the other out. Decide in advance what \'too much space\' looks like (a week, three days, whatever you agree on) and reengage before that threshold.",
  },
  love: {
    WW: "Both of you tend to be actively loving, which can make the misses feel especially strange. Tell each other plainly: \'this is what works for me.\' Specific and concrete, not abstract.",
    XX: "Both of you tend to show love by doing, which can underweight how much the other wants to hear it. Say it out loud, even when you think it\'s obvious.",
    YY: "Both of you tend to express love gently, and may wonder if the other still feels it. Ask directly: \'Do you feel loved by me right now?\' Don\'t assume, ask.",
    ZZ: "Love is real, but it\'s often almost entirely non-verbal. Every so often, add the sentence out loud. Don\'t wait for a big occasion, a simple Tuesday works.",
    WX: "[W partner name] tends to express love verbally, while [X partner name] expresses it through care and effort. Both are real. [W partner name] needs to hear it, and [X partner name] needs to see it. Say it out loud and show up consistently.",
    WY: "[W partner name] tends to be expressive, while [Y partner name] returns it more softly. Not less, just softly. [W partner name] can match [Y partner name]\'s pace sometimes, and [Y partner name] can push past the quieter default once in a while.",
    WZ: "[W partner name] is openly loving, while [Z partner name] tends to show love through presence and reliability. [W partner name] may feel that [Z partner name] holds back, while [Z partner name] may feel that [W partner name] performs. Try matching the other\'s method once a week.",
    XY: "[X partner name] tends to love practically, while [Y partner name] loves emotionally. [X partner name] can add a word about the feeling, not just the task. [Y partner name] can acknowledge the task, not just the feeling. Both stretch a little.",
    XZ: "Both of you tend to prefer love expressed through reliable action, and may miss the words. Add them occasionally, without ceremony. \'I\'m glad it\'s you.\' That\'s enough.",
    YZ: "Love is quiet and steady, and both of you may sometimes wonder if it\'s still there. It is. Once in a while, mark it explicitly. A Tuesday text, a specific sentence. Unnecessary by design, and worth it.",
  },
  stress: {
    WW: "Both of you tend to reach toward each other under stress, which is mostly good. The risk is that you can both lean on someone equally depleted. It can help when one of you names the load first, and the other takes one thing off their plate.",
    XX: "Both of you tend to compartmentalize and assume the other is handling it. Ask directly, not generally: \'What\'s on your plate this week that I don\'t know about?\'",
    YY: "Both of you tend to withdraw under pressure. The repair is a specific ritual: weekly, name one thing each of you is carrying. No solution required, just put it in the room.",
    ZZ: "Both of you tend to hold. The ask is direct: once a week, each of you names one thing that\'s been weighing on you. Brief is fine, but silence is not.",
    WX: "[W partner name] tends to talk through stress, while [X partner name] keeps theirs internal. [W partner name] needs a listener, and [X partner name] needs their plate cleared without a conversation. Do both, in the right direction.",
    WY: "When [W partner name] reaches for connection under stress, [Y partner name] may need to retreat. [W partner name] gives [Y partner name] space first, and [Y partner name] can come back with a specific \'I\'m ready now\' signal. Both trust the return.",
    WZ: "[W partner name] wants to share the stress, while [Z partner name] tends to handle it alone. [W partner name] can offer support without requiring a conversation, and [Z partner name] can name the stress once, briefly. A single sentence is enough.",
    XY: "[X partner name] tends to manage stress practically, while [Y partner name] manages it through processing. [X partner name] can take things off [Y partner name]\'s plate, and [Y partner name] can help [X partner name] slow down when they\'re overfunctioning.",
    XZ: "Both of you tend to handle stress internally. Try one direct question a week: \'What\'s heaviest right now?\' Expect a short answer, sometimes that\'s the whole point.",
    YZ: "Both of you may wait for the other to notice, and you usually won\'t. Name it plainly, even when it feels like a burden to say. \'I\'m running low this week\' is enough. No elaboration required.",
  },
  feedback: {
    WW: "Both of you tend to prefer honest conversation to held resentment, but avoidance can still happen around topics that feel risky. Name the topic first, then the feedback. \'I want to talk about X\' can lower the stakes.",
    XX: "Both of you tend to handle direct feedback well, but it isn\'t always easy. Pre-frame it: \'this isn\'t a big thing, and I want to mention it.\' This takes the edge off without softening the content.",
    YY: "Both of you may wait for the right moment, but the right moment rarely arrives on its own. Build a weekly check-in where each offers one small piece of feedback. Normal volume, normal tone.",
    ZZ: "Both of you tend to hold feedback back, not from avoidance, but because you want to be sure first. Lowering the threshold can help: \'I noticed this. I don\'t have a full read yet, just wanted to put it in the room.\'",
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
export const SCENE_DRAFTS = {
  // ── Type W — Open + Engages quickly ────────────────────────────────────
  W: {
    hard_workday: {
      happening: 'A hard day shows on them. They want it out, to vent, to process aloud, to hear that someone gets it. Holding it alone feels heavier than the day itself.',
      notTo: 'Don\'t jump straight to fixing. They\'re not asking for a solution, they\'re asking to be joined.',
      works: 'Sit down, ask what kind of day it was, and let them talk with no interruption. The work is being a witness, not a helper.',
      phrase: '"Tell me the whole story. I\'ve got time."',
    },
    quiet_worry: {
      happening: 'They usually say what\'s on their mind, so unspoken quiet is often information. The worry has probably grown from small to medium because they haven\'t gotten to externalize it yet.',
      notTo: 'Don\'t ignore the quiet. For them, silence for more than a day usually means something\'s there.',
      works: 'Name what you\'re noticing. Make it easy for them to start talking: a short walk, a casual moment, no big setup.',
      phrase: '"You\'ve been quieter than usual. What\'s sitting with you?"',
    },
    during_conflict: {
      happening: 'They\'re in it. Feelings online, words coming fast. They want to solve it now, in this conversation, while the heat is useful.',
      notTo: 'Don\'t shut down or withdraw. Withdrawal can read as \'you don\'t care\' and may make them press harder.',
      works: 'Stay in the room. Slow the pace. The goal is to add air, not match the speed. Name what you\'re hearing before you respond.',
      phrase: '"I\'m here. Say more before I respond."',
    },
    after_conflict: {
      happening: 'They want the closing to happen cleanly. Unresolved residue sits badly with them. If they sense the conversation was swept rather than closed, they\'ll often loop back to it.',
      notTo: 'Don\'t leave it implicit. They tend to read \'we moved on\' as \'we haven\'t actually handled this.\'',
      works: 'Say out loud that you\'re good. Name what you understood and what you\'re taking from it. Physical reconnection helps: a hug, touch, sitting close.',
      phrase: '"I heard you. I\'m sorry for my part. We\'re good."',
    },
    wanting_closeness: {
      happening: 'They\'re reaching, warm, wanting attention, wanting to be seen. The bid is often obvious: a hand, a story, a little mischief. It\'s a bid, not a demand.',
      notTo: 'Don\'t brush past it because you\'re mid-task. Missed bids accumulate and can create the \'you don\'t want me\' story.',
      works: 'Stop what you\'re doing for thirty seconds. Turn toward them. The energy you give often matters more than the duration.',
      phrase: '"Hi. I see you. Come here."',
    },
    external_stress: {
      happening: 'Something outside the relationship (work, family, health) is pressing on them. The stress usually surfaces in them: irritable, more physical, wanting to talk it through.',
      notTo: 'Don\'t take the irritability personally. It\'s rarely about you, even when it lands on you.',
      works: 'Name that you see the load. Ask what would actually help: a vent session, a quiet night, a plan. Don\'t assume.',
      phrase: '"You\'re carrying a lot right now. What do you need from me this week?"',
    },
  },

  // ── Type X — Guarded + Engages quickly ─────────────────────────────────
  X: {
    hard_workday: {
      happening: 'They turn inward after a rough day. Once they\'ve processed internally they could bring feelings to the surface but may not want to relive the feelings aloud. They probably want to move past it.',
      notTo: 'Don\'t push them to talk about feelings while they\'re still sorting. It may feel like prodding and shut them down further.',
      works: 'Ease. Hand them a drink, start dinner, make the environment low-demand. They\'ll come up for air when they\'re ready.',
      phrase: '"No need to talk. I\'ll start something for dinner."',
    },
    quiet_worry: {
      happening: 'They don\'t always surface worry voluntarily. They tend to process internally and bring only what\'s resolved, so if it shows, it\'s likely been there for a while.',
      notTo: 'Don\'t press for a feelings-first conversation. Start from facts and intent.',
      works: 'Ask what they\'re thinking about, not how they\'re feeling. Let them lead into the emotional layer if they want to.',
      phrase: '"What\'s been on your mind lately?"',
    },
    during_conflict: {
      happening: 'They want to resolve it, but calmly. The emotional heat of a conversation can feel counterproductive to them, even when it\'s productive to you.',
      notTo: 'Don\'t read their composure as \'not caring.\' And don\'t push for a big emotional moment during the conflict itself.',
      works: 'Match their register. Use specific, concrete language. The resolution you\'re both after is often more available in the logic than the intensity.',
      phrase: '"Let\'s find the thing we actually disagree on and stay there."',
    },
    after_conflict: {
      happening: 'Once it\'s logically resolved, they tend to move on. They\'re usually not looking for a long reconciliation debrief. The hug is nice, but the repair was in the agreement.',
      notTo: 'Don\'t relitigate what you already settled. Don\'t require emotional processing beyond what they volunteer.',
      works: 'Confirm the agreement plainly, then move forward. Warmth matters, but it doesn\'t need a long performance.',
      phrase: '"Good talk. We\'re aligned. Onward."',
    },
    wanting_closeness: {
      happening: 'Their bid is often practical rather than verbal: being physically nearby, watching something together, doing a shared task. Closeness can come through proximity and parallel activity.',
      notTo: 'Don\'t demand more emotional articulation than they\'re offering. \'Why are you being weird\' is the wrong framing.',
      works: 'Join the activity. Sit on the same couch. Let closeness build through presence, not through a conversation about it.',
      phrase: '"Come sit over here while I do this."',
    },
    external_stress: {
      happening: 'External stress tends to get compartmentalized. They may seem fine until they\'re not, and they usually don\'t broadcast the load.',
      notTo: 'Don\'t wait for them to name it. They often won\'t.',
      works: 'Take something off their plate without asking permission. Small, specific, practical. Logistics before emotions.',
      phrase: '"I\'ve got dinner and the kids tonight. Go do what you need to do."',
    },
  },

  // ── Type Y — Open + Needs space ────────────────────────────────────────
  Y: {
    hard_workday: {
      happening: 'They\'re fried. They\'ll process feelings eventually, but first they probably need decompression time alone to reset.',
      notTo: 'Don\'t meet them at the door with questions. Arrival is the worst time to talk about it.',
      works: 'A soft landing. A quiet welcome, maybe a drink or a shower, and the clear signal that they can take a beat. The conversation will be more productive later.',
      phrase: '"Take a bit. I\'m here when you\'re ready."',
    },
    quiet_worry: {
      happening: 'They will usually share worries, but only after they\'ve had enough space to sit with them privately first. Prolonged quiet often means the sitting-with hasn\'t finished yet.',
      notTo: 'Don\'t push for the conversation before they\'ve had time with it alone. You\'ll likely get a surface version and they may resent the interruption.',
      works: 'Make a window later in the day. A shared activity that invites talking without requiring it, like a walk or a drive. They\'ll talk when the moment feels right.',
      phrase: '"Want to go on a walk after dinner?"',
    },
    during_conflict: {
      happening: 'They\'re expressive but can get overwhelmed mid-conflict. When the overwhelm hits, their ability to form words drops, even though they have plenty to say.',
      notTo: 'Don\'t flood them with more input when they\'re at capacity. \'Answer me\' is exactly wrong.',
      works: 'Offer a pause. Not an escape, a pause with a return time. Say when you\'ll come back to it, and mean it.',
      phrase: '"Let\'s take twenty minutes and come back. I\'m not dropping this."',
    },
    after_conflict: {
      happening: 'They need time to feel settled before they know if things are actually okay. They\'ll often come back to it, maybe hours later, maybe the next morning, with the final piece to add.',
      notTo: 'Don\'t declare it done before they\'re ready. And don\'t be surprised when they bring it back up after it seemed closed.',
      works: 'Leave the door open. Check in the next day with no agenda. Let them finish processing in their own rhythm.',
      phrase: '"Still thinking about yesterday? Anything else you wanted to say?"',
    },
    wanting_closeness: {
      happening: 'Their bid for closeness is often tentative, a little shy, a little soft. They want to be met, but they likely won\'t chase if you miss the first one or two.',
      notTo: 'Don\'t miss the quiet version. Their bid is gentle by design.',
      works: 'Match their energy with warmth but not intensity. Soft attention. A slow turning toward rather than a big dramatic response.',
      phrase: '"I was just thinking about you. Come here."',
    },
    external_stress: {
      happening: 'External stress often shows up as withdrawal: less energy for the relationship, earlier bedtimes, a kind of muted version of them.',
      notTo: 'Don\'t interpret the withdrawal as being about you. And don\'t try to jolly them out of it.',
      works: 'Protect their rest. Lower the relational demand for the week. Trust that they\'ll come back when the load lifts.',
      phrase: '"This week can be low-key. I\'ve got the logistics."',
    },
  },

  // ── Type Z — Guarded + Needs space ─────────────────────────────────────
  Z: {
    hard_workday: {
      happening: 'They come home and go quiet. Hard days don\'t spill, they get shelved. Setting the feelings aside is the recovery.',
      notTo: 'Don\'t ask how their day was and expect a real answer right away. Don\'t read the silence as distance from you.',
      works: 'Give them an hour or two and don\'t hover. Your partner processes best in solitude, and you\'ll get more of them later if you give space now.',
      phrase: '"I\'ll be in the living room whenever."',
    },
    quiet_worry: {
      happening: 'Their worry rarely surfaces on its own. They hold it, sort it, and may decide it\'s not worth bringing up. By the time you notice, it\'s often been there a while.',
      notTo: 'Don\'t corner them about it. A direct \'what\'s wrong\' almost always gets a \'nothing.\'',
      works: 'Mention a specific, concrete observation. Then give them room to respond in their own time, even a day later. The window stays open longer than you think.',
      phrase: '"You seemed off at dinner. I\'m here if you want to talk."',
    },
    during_conflict: {
      happening: 'They may go quiet or flat mid-conflict. It\'s not stonewalling. Their internal processor is struggling to keep up with the input while also managing the feelings.',
      notTo: 'Don\'t keep talking at them when they\'ve gone quiet. More words is the opposite of what helps.',
      works: 'Stop. Say you\'re willing to pick this up later. Give them a clear return time and then honor it. They\'ll likely come back with more to say than they had in the moment.',
      phrase: '"I want to hear you. Let\'s come back to this tomorrow."',
    },
    after_conflict: {
      happening: 'They often go even quieter after conflict than during. They\'re rebuilding the relationship internally and it can take time. They\'re not holding a grudge.',
      notTo: 'Don\'t require them to perform repair on your timeline. Don\'t read their quiet as punishment.',
      works: 'Low-key presence. Don\'t pretend nothing happened, but don\'t require processing either. Normal kindness, normal routines, and patience.',
      phrase: '"No pressure to talk about it. Just glad you\'re here."',
    },
    wanting_closeness: {
      happening: 'Their closeness bids may be the subtlest you\'ll see: a touch on the arm, sitting closer than usual, a small act of care. If you miss it, they often won\'t try again that day.',
      notTo: 'Don\'t be skeptical of the bid because it\'s quiet. Don\'t need them to explain or repeat it.',
      works: 'Receive it. Match the register. A hand back, a leaning in, a small acknowledgement that you noticed. Nothing big.',
      phrase: '"I like when you do that."',
    },
    external_stress: {
      happening: 'External stress can make them even more internal. They\'ll handle it alone unless explicitly invited not to, and even then the invitation may take time to sink in.',
      notTo: 'Don\'t wait for a crisis signal. You\'ll often miss the chance if you do.',
      works: 'Name what you\'re seeing. Offer specific help, not a general \'let me know.\' Then let them choose when to take you up on it.',
      phrase: '"I\'m taking dinner off your list this week. Whatever else is helpful, tell me."',
    },
  },
};
