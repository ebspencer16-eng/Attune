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
export const GAP_BLURBS = {
  energy: {
    aligned:     "You recharge in similar ways. Solo time or connection, the rhythm feels right to both of you without negotiation.",
    some_gap:    "You recharge slightly differently. Mostly invisible, but on long weekends or after social stretches the mismatch surfaces.",
    notable_gap: "You recharge in opposite directions. One refills inward, the other reaches outward. Costly if you don't plan around it.",
  },
  expression: {
    aligned:     "You wear emotion at similar registers. Neither has to translate what the other feels. The room reads the same to both.",
    some_gap:    "You express emotion at slightly different volumes. On hard days, the gap shows up as 'why aren't you saying anything.'",
    notable_gap: "You express at very different volumes. One wears it; the other holds it. The work is learning each other's signals.",
  },
  needs: {
    aligned:     "You ask for needs in similar ways. Direct or indirect, same protocol, which keeps small things from accumulating.",
    some_gap:    "You ask for needs at slightly different directness levels. One of you may be hinting while the other misses it.",
    notable_gap: "You ask for needs differently. One names them outright; the other waits to be noticed. The gap is where needs go unmet.",
  },
  bids: {
    aligned:     "You catch each other's bids at similar rates. Everyday gestures land. The quiet substrate of the relationship working.",
    some_gap:    "You respond to bids slightly differently. One reaches more than the other notices, or in a register the other isn't tuned to.",
    notable_gap: "You respond to bids at very different rates. Missed reaches accumulate, even when neither of you means anything by it.",
  },
  conflict: {
    aligned:     "You handle conflict at similar speeds. Either both engage now or both want space first. The timing isn't the fight.",
    some_gap:    "You handle conflict at slightly different speeds. Where one wants to address and the other wants to wait, the friction shows up.",
    notable_gap: "You handle conflict at very different speeds. One needs to engage now; the other needs space first. Without an agreement, conflicts compound.",
  },
  repair: {
    aligned:     "You repair similarly. Both need the same kind of close, verbal or through warmth. Hard moments end cleanly for both.",
    some_gap:    "You repair slightly differently. The risk is one of you thinks it's done while the other is still circling.",
    notable_gap: "You repair very differently. One needs verbal close; the other moves on once warmth returns. Unnamed, the same fight repeats.",
  },
  closeness: {
    aligned:     "You want similar amounts of closeness and independence. The rhythm of together-time and alone-time feels right to both of you.",
    some_gap:    "You want slightly different amounts of closeness. Small mismatches in how often you reach for each other can add up.",
    notable_gap: "You want notably different amounts of closeness. One reaches more; the other defaults to space. Unbalanced if not held intentionally.",
  },
  love: {
    aligned:     "You give and receive love in compatible ways. What lands for one tends to land for the other. Less translation required.",
    some_gap:    "You give and receive love slightly differently. In busy stretches, the version sent isn't always the version the other needs.",
    notable_gap: "You give and receive love very differently. One needs words; the other needs presence and action. Both real. Neither replaces the other.",
  },
  stress: {
    aligned:     "You handle stress in similar ways. Either you both reach out or both pull in. Two stress responses don't add to the stress.",
    some_gap:    "You handle stress slightly differently. The gap shows up exactly when one of you has the least bandwidth to translate.",
    notable_gap: "You handle stress in opposite directions. One needs a listener; the other needs the room cleared. The wrong answer makes it worse.",
  },
  feedback: {
    aligned:     "You give and receive feedback at similar comfort levels. Honest things get said without much warm-up.",
    some_gap:    "You give and receive feedback at slightly different comfort levels. One of you may hold back things the other would want to hear.",
    notable_gap: "You give and receive feedback differently. One brings it directly; the other softens or holds. Useful conversations need both of you stretching.",
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
    WW: "You'll feel it after social weekends. Both of you refill through connection, so you can miss when one of you is drained. After full days, check in before making more plans.",
    XX: "You'll feel it after busy stretches when neither has named being tired. Both of you recover by doing, not talking, so exhaustion builds quietly. Name the drain before it turns into irritability.",
    YY: "You'll feel it after dinners, family visits, work events. Both need real recovery time. Protect the next morning, don't pack it with anything that asks more of you.",
    ZZ: "You'll feel it when one of you is depleted and the other can't tell. Neither broadcasts the drain. The repair is literal: 'I'm running low today.' Take it at face value.",
    WX: "The W wants to debrief; the X is done talking. One recharges out loud, the other in quiet. Stagger the debrief. The W to a friend; the X gets an hour alone.",
    WY: "You'll feel it on the way home from anything social. The W is warmed up; the Y is about to crash. Protect the landing. Quiet first, then reconnection.",
    WZ: "You'll feel it after social events. The W wants to talk, the Z wants silence. The W shares one highlight and stops. The Z offers a sentence later, after real quiet.",
    XY: "The X is ready to move on; the Y is still processing. Different recovery clocks, not avoidance or dragging. Name the clock difference instead of assuming the other is being difficult.",
    XZ: "Both of you recover internally. Efficient, but it can tip into isolation. Once a week, ask the specific question: 'how are you, actually.' Just enough to stay connected.",
    YZ: "Both go quiet after a hard stretch and neither moves first. Both need space, both can wait the other out. Agree in advance who comes back first after conflict.",
  },

  // ── Placeholder: remaining 11 dimensions use WW-style prose as a
  // single generic block until per-couple-type prose is written.
  // When drafted, each should get a parallel 10-type object like energy above.
  expression: {
    WW: "You're both expressive, so silence between you is information. When one of you has been quieter than usual, name it out loud instead of waiting to see if it clears.",
    XX: "Both of you process internally. A lot can accumulate before anything gets said. Set a low-stakes weekly check-in. Each names one thing they've been carrying. No fix required.",
    YY: "Both of you share once you've had time, so jumping to 'what's wrong' lands badly. A walk or a car ride is the container; the conversation arrives inside it, not before.",
    ZZ: "Both of you hold things privately. Once a week, one asks a direct question that requires a direct answer: 'What's the thing you haven't told me yet?' It will feel clunky. Do it anyway.",
    WX: "The W needs to externalize; the X needs to process privately first. Give the W a short window to share. Give the X room to respond later.",
    WY: "The W is ready to share in the moment; the Y needs more time. The W keeps the instinct to name things, but adds 'no need to respond right now.'",
    WZ: "The W is feeling something strongly; the Z has gone quiet. The W reads quiet as distance, the Z is processing. Name the pattern: 'I know you're still with me. I need to hear it sometimes.'",
    XY: "The X wants to name it concretely; the Y wants emotional space to surface first. Name the observation, not the feeling. 'You've been quiet since Tuesday' lands better than 'what's wrong.'",
    XZ: "Both of you default to holding. Schedule a specific time, not 'we should talk soon' but 'Sunday at 4.' The structure makes the conversation possible when nothing else will.",
    YZ: "Both of you need time to surface. Assume nothing is wrong unless someone says so. Check in after two days if the quiet doesn't break on its own.",
  },
  needs: {
    WW: "You both default to hoping the other will notice, then resenting it when they don't. Ask directly, once, even when it feels clunky. Hints are not a contract.",
    XX: "You both handle it privately rather than add to the other's load. Generous, and how you both end up depleted. Ask for the small thing before it becomes a big thing.",
    YY: "Both of you need time to figure out what you want before asking, so the ask comes late. Trust that 'I think I need X, not sure yet' is a valid way to start.",
    ZZ: "Neither of you broadcasts. The repair is a weekly question: 'Is there anything you need that I'm not giving you?' Expect the answer to take time. Ask anyway.",
    WX: "The W gets direct asks; the X often doesn't get one in return. The W asks: 'Is there anything you need that you haven't named?' Watch for the pause before the answer.",
    WY: "The W asks for what they need; the Y quietly sets their own aside. Build a rule. Every ask gets a counter-check: 'What do you need this week?' before the Y mentions it.",
    WZ: "The W will ask directly; the Z usually won't. Create a reliable moment, Sunday dinner or a weeknight ritual, where the Z is explicitly asked what they need for the week.",
    XY: "The X names needs practically; the Y has needs not yet articulated. The X may read the Y's hesitation as 'no real need.' Wrong. Give the Y 24 hours to come back, and follow up.",
    XZ: "Both of you hold. The fix is explicit: a scheduled check-in where each names one thing, even small. 'I'd like a quiet night Thursday.' Normalize the low-stakes ask.",
    YZ: "Both of you wait until the need is obvious. Ask before it's obvious: 'How's your tank this week?' as a standing question. The Z may need a beat to answer. That's fine.",
  },
  bids: {
    WW: "You're both usually good at catching bids, but a missed one stings more when it comes from someone who usually catches them. When you notice, circle back. Don't let it quietly stack.",
    XX: "Both of you express bids through action rather than words. Learn each other's versions. A 'want help with this' is often the bid. So is a shared task or a look across the room.",
    YY: "Your bids tend to be gentle, a song they liked, a comment about the weekend. Easy to miss, easy to under-weight. Match the register. A soft return is the right answer to a soft bid.",
    ZZ: "Z-type bids are the quietest of any pairing. A hand brushed, a book left on the counter. If one is missed, they typically won't try again that day. Watch for the small things.",
    WX: "The W makes a big warm bid; the X responds practically. Both are real, they land differently. The W names the response they'd like. The X holds a beat on warmth before moving to logistics.",
    WY: "The W reaches warmly; the Y receives it but takes a beat to return. The delay is recovery time, not distance. The Y offers a small nod or look to mark the bid landed.",
    WZ: "The W bids bigger and more often; the Z bids rarely but meaningfully. Don't measure by frequency. Measure by weight. A Z's one bid carries as much intention as five of the W's.",
    XY: "The X bids practically; the Y bids emotionally. Different registers. Learn the translation. The Y's emotional check-in is the bid. The X's offer to help is the bid. Don't require them to match.",
    XZ: "Both of you take quiet bids at face value without naming them. That's fine most of the time. Every so often, mark it out loud. 'Thanks for bringing me coffee' reinforces the pattern.",
    YZ: "The Y extends a soft bid; the Z is still in their own processing. Neither is pushy, so bids can evaporate. Build a small daily ritual, dinner or a walk, where bids can land.",
  },
  conflict: {
    WW: "Both of you want to address tension now, mostly a strength, except when 'now' means neither of you is regulated. Before going in, name the temperature: 'I'm heated, give me ten minutes.' Then return on time.",
    XX: "Both of you want to resolve it efficiently, which works for most things. For the harder stuff, one of you names the emotional layer explicitly: 'this one's not just logistics for me.'",
    YY: "Neither of you wants to engage in the heat. Both need distance first. Valid, and it means someone has to come back. Agree in advance: 24 hours max before one of you re-opens it.",
    ZZ: "Both of you would rather let it sit than press. That works until it doesn't. Schedule a time to revisit. Not 'is there an issue,' but 'here's the thing I noticed.'",
    WX: "The W wants to surface feelings in the heat; the X wants to solve the problem logically. Split it. Name the feeling first, then the thing to solve. Neither gets skipped.",
    WY: "The W is ready to engage; the Y is already at capacity. Agree on a pause protocol ahead of time. When one needs space, the pause has a time-stamp. Come back when you said you would.",
    WZ: "The W wants to talk it through; the Z has gone completely quiet. Pursuer-withdrawer patterns live here. Slow the W down. Give the Z a specific return time. Build the script when things are calm.",
    XY: "The X wants to resolve; the Y still needs to process. Hesitation isn't avoidance, efficiency isn't not-caring. Name it: 'I need to sort this tonight; you need tomorrow.' Then negotiate.",
    XZ: "Both of you want to let it go; both of you carry the residue. Make a specific time each week to revisit anything unsaid. It'll feel clunky. Do it anyway.",
    YZ: "You both need space and you both wait. Decide in advance who comes back first. The other won't feel pressed. The first will know the ask is expected.",
  },
  repair: {
    WW: "Both of you tend to want verbal closure, but on different timelines. The repair isn't complete until both have said so out loud. Don't assume warmth means resolved.",
    XX: "Both of you move on efficiently. Repair can stay implicit. Every few times, make it explicit. 'We're good' is a sentence worth saying even when it feels unnecessary.",
    YY: "Both of you repair slowly; both can underestimate how much the other needs. Assume 48 hours before you call it done. Check in on day three if either of you is still sitting with something.",
    ZZ: "After a disagreement, both of you go quiet. Neither is sure if things are repaired or just paused. The fix is a specific question: 'Are we good?' Not rhetorical. An actual pause for the answer.",
    WX: "The W wants verbal closure: 'we're good, we worked it out.' The X considers it repaired once the logic is sorted. The W gets their sentence. The X holds space for one more beat than feels necessary.",
    WY: "The W wants to close the loop; the Y still needs to land somewhere. The W says 'no rush, we'll come back.' The Y marks progress with a hand or a look so the silence doesn't read as distance.",
    WZ: "The W wants to verbally repair; the Z has gone inward. The Z isn't refusing repair, they're processing. Give it a full day. Just a clear signal from the Z that they're back.",
    XY: "The X confirms the logical resolution; the Y still sits with the emotional layer. Mark both. Two sentences: 'Here's what we agreed' + 'I know this one took a beat for you.'",
    XZ: "Both of you move on quietly. Works for most things. For the bigger ones, one of you says out loud: 'I want to make sure we're actually repaired here.'",
    YZ: "Both need time; both leave the final check implicit. Build in a 48-hour follow-up. A one-liner is enough: 'We good after Monday?'",
  },
  closeness: {
    WW: "Both of you want closeness; both can also expect it to happen on its own. Build one small ritual that doesn't require organizing, a ten-minute talk, a shared morning routine.",
    XX: "Both of you value shared activity over shared conversation, which can make closeness feel procedural. Schedule one low-stakes thing that isn't about logistics, a walk, a show, dinner without phones.",
    YY: "Both of you value independence, and both of you can let that tip into parallel lives. One small weekly overlap, a meal or a walk, anchors the closeness.",
    ZZ: "Both of you default to independent rhythms. Build a specific shared time, not optional, not moveable, where the expectation is being together without needing to produce anything.",
    WX: "The W wants a lot of connection; the X wants side-by-side presence. Both are valid closeness, they look different. Alternate. One night her way, one his. Both count.",
    WY: "The W wants a bigger version of closeness; the Y needs it quieter. Different channels. The W turns the volume down without turning the signal off. The Y turns it up slightly on purpose.",
    WZ: "The W bids frequently; the Z responds rarely but deeply. The W can feel unmet, the Z can feel crowded. Lower frequency, raise intention. One thing a week with the Z's full attention.",
    XY: "The X offers closeness practically; the Y offers it emotionally. Learn the translation. Shared logistics is closeness for the X. Being seen is closeness for the Y. Both happen in the same week.",
    XZ: "Both of you are comfortable with independence and can also drift. Anchor with a ritual that isn't about talking, cooking, a show, a walk. Closeness doesn't always require a conversation.",
    YZ: "Both of you will wait the other out. Decide in advance what 'too much space' looks like, a week, three days, whatever you agree, and re-engage before that threshold.",
  },
  love: {
    WW: "You're both actively loving, which makes the misses feel especially strange. Tell each other plainly: 'this is what lands for me.' Specific and concrete, not abstract.",
    XX: "Both of you show love by doing, and can under-weight how much the other wants to hear it. Say the sentence, even when you think it's obvious.",
    YY: "Both express love gently; both can wonder if the other still feels it. Ask directly: 'do you feel loved by me right now?' Don't assume. Ask.",
    ZZ: "Love is real but almost entirely non-verbal. Every so often, add the sentence. Don't wait for a big occasion. A Tuesday works.",
    WX: "The W expresses love verbally; the X expresses it through care and effort. Both real. The W needs to hear it; the X needs to see it. Say it out loud AND show up consistently.",
    WY: "The W is expressive; the Y returns it more softly. Not less. Softly. The W matches the Y's register sometimes. The Y pushes past the quieter default once in a while.",
    WZ: "The W is openly loving; the Z shows love through presence and reliability. The W may feel the Z holds back. The Z may feel the W performs. Match the other's channel once a week.",
    XY: "The X loves practically; the Y loves emotionally. The X adds a word about the feeling, not just the task. The Y acknowledges the task, not just the feeling. Both stretch a little.",
    XZ: "Both prefer love expressed through reliable action; both can also miss the words. Add them occasionally, without ceremony. 'I'm glad it's you.' That's enough.",
    YZ: "Love is quiet, steady, and both of you sometimes wonder if it's still there. It is. Once in a while, mark it explicitly. A Tuesday text. A specific sentence. Unnecessary by design, and worth it.",
  },
  stress: {
    WW: "Both of you reach toward each other under stress, which is good, but you can both lean on someone equally depleted. One of you names the load first. The other takes one thing off their plate.",
    XX: "Both of you compartmentalize and assume the other is handling it. Ask directly, not generally. 'What's on your plate this week that I don't know about?'",
    YY: "Both of you withdraw under pressure. The repair is a specific ritual: weekly, name one thing each of you is carrying. No fix required, just put it in the room.",
    ZZ: "Both of you hold. The ask is direct: once a week, each of you says one thing that's been weighing on you. Brief is fine. Silence is not.",
    WX: "The W talks through stress; the X keeps theirs internal. The W needs a listener; the X needs their plate cleared without a conversation. Do both, in the right direction.",
    WY: "The W reaches for connection under stress; the Y needs to retreat. The W gives the Y space first. The Y comes back with a specific 'I'm ready now' signal. Both trust the return.",
    WZ: "The W wants to share the stress; the Z wants to handle it alone. The W offers support without requiring a conversation. The Z names the stress once, briefly. A single sentence is enough.",
    XY: "The X manages stress practically; the Y manages it through processing. The X takes things off the Y's plate. The Y helps the X slow down when they're over-functioning.",
    XZ: "Both of you handle stress internally. One direct question a week: 'What's heaviest right now?' Expect a short answer. That's the whole point.",
    YZ: "Both of you wait for the other to notice. You won't. Name it plainly, even when it feels like a burden to say. 'I'm running low this week' is enough. No elaboration required.",
  },
  feedback: {
    WW: "Both of you prefer honest conversation to held resentment, but avoidance still happens around topics that feel risky. Name the topic first, then the feedback. 'I want to talk about X' lowers the stakes.",
    XX: "Both of you handle direct feedback well, but it isn't always easy. Pre-frame it: 'this isn't a big thing, and I want to mention it.' Takes the edge off without softening the content.",
    YY: "Both of you wait for the right moment; the right moment rarely arrives on its own. Build a weekly check-in where each offers one small piece of feedback. Normal volume, normal tone.",
    ZZ: "Both of you hold feedback back, not from avoidance, but because you want to be sure first. Lower the threshold. 'I noticed this. I don't have a full read yet. Wanted to put it in the room.'",
    WX: "The W gives feedback with emotion attached; the X wants it delivered as logic. The W strips the edge. The X absorbs the emotional layer without requiring it to be removed. Both are a stretch.",
    WY: "The W raises feedback in real time; the Y needed more warning. Heads-up first: 'I have something I want to mention, when's good?' The W gets to say it; the Y gets to receive it well.",
    WZ: "The W delivers feedback openly; the Z processes it internally and slowly. The W may want an immediate response. Don't. Give the Z time, even a full day. The response will be better.",
    XY: "The X gives feedback concisely; the Y needs more relational framing. The X adds one line of context, 'this matters because...', without changing the content. The Y holds the feedback without requiring the context to expand.",
    XZ: "Both of you prefer precision over speed, which can mean the feedback never lands. Schedule it. Monthly, each of you names one thing. Not as an event. As a habit.",
    YZ: "Both of you want to deliver it well; both can also over-wait. Set a shorter threshold, within a week, for anything worth saying.",
  },
};

