// Expectations exercise — shared data for all 3 variants.
//
// Variant differences:
//   - Core:        future-facing ("what you want going forward")
//   - Anniversary: present-tense, about the relationship as it is now
//   - Revisiting:  reflective present ("where do you stand now")
//
// Responsibility items are identical across variants; only the framing
// question ("who should handle this" vs "who actually handles this") differs.
//
// Life & Values topics (the bold lead-in) are identical across variants;
// the expanding phrase after the em-dash differs per variant.
//
// Answer options are identical per question ID across variants.

export const RESPONSIBILITY_CATEGORIES = [
  {
    id: 'household', label: 'Household',
    items: [
      'Cooking meals',
      'Grocery shopping and meal planning',
      'Keeping the home tidy day-to-day',
      'Managing home repairs and maintenance',
      'Managing the family calendar',
      'Planning and organizing social events, holidays, and gatherings',
      'Planning and booking vacations',
    ],
  },
  {
    id: 'financial', label: 'Financial',
    items: [
      'Paying bills and managing day-to-day finances',
      'Making major financial decisions',
      'Managing savings and investments',
      'Filing taxes',
    ],
  },
  {
    id: 'career', label: 'Career & Work',
    items: [
      'Being the primary income earner',
      'Whose career shapes major family decisions — where you live, your schedule, your lifestyle',
      'Who makes career sacrifices when the family needs it',
    ],
  },
  {
    id: 'emotional', label: 'Emotional Labor',
    items: [
      'Carrying the mental load — remembering, anticipating, planning ahead',
      'Tracking the emotional wellbeing of the household',
      'Maintaining closeness and emotional intimacy over time',
      'Initiating difficult conversations',
      'Being the first to reach out after conflict',
      'Maintaining relationships with extended family and in-laws',
    ],
  },
];

// Responsibilities framing per variant — the lead-in question that gets
// asked before the 20-item list.
export const RESPONSIBILITY_FRAMING = {
  core: 'For each item below, who do you expect will typically handle this in your life together?',
  anniversary: 'For each item below, who actually handles this in your life right now?',
  revisiting: 'Looking at your life today, who handles each of these now?',
};

// Answer options for responsibility items (same across variants)
export const RESPONSIBILITY_OPTIONS = '[Partner A name] · [Partner B name] · Both of us · Doesn\'t apply to us';
export const CAREER_OPTIONS = 'Primarily mine · Balanced · Primarily my partner\'s · Doesn\'t apply';

// Childhood structure question (identical across variants)
export const CHILDHOOD_QUESTION = {
  text: 'The household I grew up in was primarily:',
  options: [
    'A mom and a dad',
    'Two moms',
    'Two dads',
    'Mostly my mom',
    'Mostly my dad',
    'Other caregivers / guardians',
    'Prefer not to say',
  ],
};

// The 17 Life & Values questions. Each has:
//   - id:       stable question ID (matches App.jsx LIFE_QUESTIONS)
//   - category: display category (Family / Lifestyle / Values / Money / Conflict / Connection)
//   - topic:    short topic label (identical across variants)
//   - core/anniversary/revisiting: expanding phrase per variant
//   - options:  answer choices (identical across variants)
export const LIFE_QUESTIONS = [
  // ── Family ───────────────────────────────────────────────────────────
  {
    id: 'lq_children', category: 'Family', topic: 'Children',
    core:        'do you want them, and how many?',
    anniversary: 'how do your plans and feelings align now?',
    revisiting:  'where are you on this today?',
    options: ['Not part of my future', 'Uncertain', 'Open to it', 'Important to me, I want at least one', 'Central to my future'],
  },
  {
    id: 'lq_parents', category: 'Family', topic: 'Aging parents and family obligations',
    core:        'what kind of involvement do you want to have?',
    anniversary: 'how are you handling this now, and is it sustainable?',
    revisiting:  'how are you thinking about this these days?',
    options: ['Help in crisis only', 'Meaningful support', 'Significantly involved', 'Part of household if needed'],
  },
  {
    id: 'lq_family_conf', category: 'Family', topic: 'When family and partner conflict',
    core:        'whose needs take priority for you?',
    anniversary: 'how do you tend to navigate this now?',
    revisiting:  'how do you handle this tension today?',
    options: ['Side with partner', 'Mediate fairly', 'Defend family if right', 'Keep the peace'],
  },

  // ── Lifestyle ────────────────────────────────────────────────────────
  {
    id: 'lq_location', category: 'Lifestyle', topic: 'Where we live',
    core:        'city, suburb, or rural?',
    anniversary: 'are you where you want to be long-term?',
    revisiting:  'where do you want to be from here?',
    options: ['Rooted where I am', 'Strong preference, open to discussion', 'Wherever makes sense for both', 'Genuinely open'],
  },
  {
    id: 'lq_social', category: 'Lifestyle', topic: 'Social life and friendships',
    core:        'how important is your own social world?',
    anniversary: 'does your shared social rhythm work for you?',
    revisiting:  'what do you want your social life to look like now?',
    options: ['Mostly just us', 'Quiet default', 'Healthy balance', 'Pretty social', 'Very social'],
  },
  {
    id: 'lq_routine', category: 'Lifestyle', topic: 'Day-to-day rhythms and routines',
    core:        'how much structure do you need?',
    anniversary: 'is your current rhythm working for you?',
    revisiting:  'what balance of structure and flexibility fits you now?',
    options: ['Need a lot of structure', 'Prefer loose rhythm', 'Adapt easily', 'Prefer open', 'Resist routine'],
  },

  // ── Values ───────────────────────────────────────────────────────────
  {
    id: 'lq_faith', category: 'Values', topic: 'Faith and spirituality',
    core:        'how central is it to your life?',
    anniversary: 'how present is it in your life together?',
    revisiting:  'where does faith sit in your life currently?',
    options: ['Plays no role', 'Personal, wouldn\'t shape shared life', 'Present but not imposed', 'Meaningful role', 'Central'],
  },
  {
    id: 'lq_values', category: 'Values', topic: 'Core values and beliefs',
    core:        'how much alignment matters to you?',
    anniversary: 'are you aligned where it matters most?',
    revisiting:  'what do you need from your partner on values now?',
    options: ['Simply respect each other\'s views', 'Share broadly similar values', 'Be closely aligned', 'Be deeply aligned'],
  },

  // ── Money ────────────────────────────────────────────────────────────
  {
    id: 'lq_finances', category: 'Money', topic: 'How we manage money',
    core:        'joint, separate, or hybrid?',
    anniversary: 'is your current setup working for both of you?',
    revisiting:  'how would you structure finances going forward?',
    options: ['Fully separate', 'Mostly separate, shared account for shared expenses', 'Mostly combined', 'Fully combined'],
  },
  {
    id: 'lq_money_lean', category: 'Money', topic: 'Saving vs. spending orientation',
    core:        'where do you naturally land?',
    anniversary: 'how does your instinct show up day-to-day?',
    revisiting:  'where does your money instinct sit right now?',
    options: ['Strongly saving', 'Lean toward saving', 'Neither', 'Lean toward spending', 'Fully in the present'],
  },
  {
    id: 'lq_money_risk', category: 'Money', topic: 'Financial risk tolerance',
    core:        'conservative or growth-oriented?',
    anniversary: 'does your approach to risk match your partner\'s?',
    revisiting:  'where are you on risk today?',
    options: ['Very conservative', 'Cautious but open', 'Comfortable with thought-through risk', 'Lean toward risk', 'Drawn to bold moves'],
  },

  // ── Conflict ─────────────────────────────────────────────────────────
  {
    id: 'lq_conflict_when', category: 'Conflict', topic: 'When to address conflict',
    core:        'immediately or after time to cool down?',
    anniversary: 'does your timing around conflict work for both of you?',
    revisiting:  'how do you handle "something\'s wrong" now?',
    options: ['Address immediately', 'Bring up soon', 'Wait for right moment', 'Take significant space', 'Let things go'],
  },
  {
    id: 'lq_conflict_after', category: 'Conflict', topic: 'How long conflict resolution typically takes',
    core:        'how fast do you need repair?',
    anniversary: 'how well do you return to warmth together?',
    revisiting:  'what does readiness to move forward look like for you now?',
    options: ['Air clears quickly', 'Little space, same day', 'Need a night or two', 'Need several days', 'Varies a lot'],
  },
  {
    id: 'lq_conflict_repair', category: 'Conflict', topic: 'What repair looks like',
    core:        'what do you need to feel okay again?',
    anniversary: 'what actually signals repair for you?',
    revisiting:  'what do you need after conflict today?',
    options: ['Direct explicit apology', 'Partner understands what happened', 'Warmth returns', 'Moving forward together'],
  },

  // ── Connection ───────────────────────────────────────────────────────
  {
    id: 'lq_affection', category: 'Connection', topic: 'Physical affection and touch',
    core:        'how important is it to you?',
    anniversary: 'does the current level feel right?',
    revisiting:  'where is your need for affection now?',
    options: ['Essential', 'Very important', 'Nice but not needed consistently', 'Comfortable with less', 'Reserved'],
  },
  {
    id: 'lq_closeness', category: 'Connection', topic: 'Closeness during hard times',
    core:        'do you reach toward or pull back?',
    anniversary: 'how does difficulty affect your need for closeness with your partner?',
    revisiting:  'how does hard stuff affect your need for closeness now?',
    options: ['Need more closeness', 'Steady need', 'Pull back and need space', 'Varies a lot'],
  },
  {
    id: 'lq_independence', category: 'Connection', topic: 'Individual independence within the relationship',
    core:        'how much space do you need?',
    anniversary: 'is the current level of independence working?',
    revisiting:  'how much independent space do you want from here?',
    options: ['Matters enormously', 'Important but flexible', 'Don\'t think about it much', 'Want less, prefer shared life'],
  },
];

// Variant metadata
export const VARIANTS = {
  core: {
    id: 'core',
    label: 'Core',
    flag: 'no flag (default)',
    audience: 'New, engaged, or dating couples',
    packages: 'The Attune Assessment · Starting Out · Attune Premium',
    entryPoint: 'Exercise 02 card on profile dashboard',
    framingNote: 'Future-facing. Questions ask what each partner wants, expects, or imagines going forward.',
    color: '1B5FE8',  // blue
  },
  anniversary: {
    id: 'anniversary',
    label: 'Anniversary (Already Married)',
    flag: 'isAnniversary = true',
    audience: 'Married / established couples',
    packages: 'Anniversary Collection',
    entryPoint: 'Exercise 02 card on profile dashboard',
    framingNote: 'Present-tense, grounded in current reality. Questions ask how things are NOW in the relationship.',
    color: '9B5DE5',  // purple
  },
  revisiting: {
    id: 'revisiting',
    label: 'Revisiting',
    flag: 'isRevisited = true',
    audience: 'Returning users retaking the exercise',
    packages: 'Any package, on retake',
    entryPoint: 'Retake option on profile dashboard',
    framingNote: 'Reflective present. Questions ask where each partner stands today — designed to surface what has shifted.',
    color: 'E8673A',  // orange
  },
};

// Pre-launch note: revisit results experience
export const PENDING_NOTE = `
PENDING: Results experience for users who retake (revisit) the expectations exercise is NOT YET BUILT. The three variants above differ only in question framing; the results page is currently the same for all three. Before launch, we need a comparison view that shows: what stayed the same between the old and new answers, what changed, what new gaps opened, what old gaps closed. This is tracked in the pre-launch checklist.
`.trim();
