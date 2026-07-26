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
      'Whose career shapes major family decisions, where you live, your schedule, your lifestyle',
      'Who makes career sacrifices when the family needs it',
    ],
  },
  {
    id: 'extended_family', label: 'Extended Family',
    // Each item uses {userName} and {partnerName} placeholders that resolve
    // at render time from the partner names captured in the exercise. This
    // makes each row a name-specific question (e.g. "Visits with Maya's
    // family") rather than a generic abstract item.
    items: [
      "Planning visits with {userName}'s family",
      "Gifting for {userName}'s family",
      "Planning visits with {partnerName}'s family",
      "Gifting for {partnerName}'s family",
    ],
  },
  {
    id: 'emotional', label: 'Emotional Labor',
    items: [
      'Carrying the mental load, remembering, anticipating, planning ahead',
      'Tracking the emotional wellbeing of the household',
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

// Answer options for responsibility items (same across all categories, including Career)
export const RESPONSIBILITY_OPTIONS = '[Partner A name] · [Partner B name] · Both of us · Doesn\'t apply to us';

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
    core:        'Do you want them, and how many?',
    anniversary: 'How do your plans and feelings align now?',
    revisiting:  'Where are you on this today?',
    options: ['Not part of my future', 'Uncertain', 'Open to it', 'Important to me, I want at least one', 'Central to my future'],
  },
  {
    id: 'lq_involve_user', category: 'Family', topic: "Involvement with {userName}'s family",
    core:        'Thinking about in-person visits and digital contact, what level of involvement feels right?',
    anniversary: 'Is the current level of involvement working for you?',
    revisiting:  'Where do you want this to settle?',
    options: ['Very little, if any', 'Minimal, by design', 'Casual relationship', 'Consistent contact', 'Frequent, deeply integrated'],
  },
  {
    id: 'lq_involve_partner', category: 'Family', topic: "Involvement with {partnerName}'s family",
    core:        'Thinking about in-person visits and digital contact, what level of involvement feels right?',
    anniversary: 'Is the current level of involvement working for you?',
    revisiting:  'Where do you want this to settle?',
    options: ['Very little, if any', 'Minimal, by design', 'Casual relationship', 'Consistent contact', 'Frequent, deeply integrated'],
  },
  {
    id: 'lq_family_conf', category: 'Family', topic: 'When family and partner conflict',
    core:        'Whose needs take priority for you?',
    anniversary: 'How do you tend to navigate this now?',
    revisiting:  'How do you handle this tension today?',
    options: ['Side with partner', 'Mediate fairly', 'Defend family if right', 'Keep the peace'],
  },

  // ── Lifestyle ────────────────────────────────────────────────────────
  {
    id: 'lq_location', category: 'Lifestyle', topic: 'Where we live',
    core:        'City, suburb, or rural?',
    anniversary: 'Are you where you want to be long-term?',
    revisiting:  'Where do you want to be from here?',
    options: ['Rooted where I am', 'Strong preference, open to discussion', 'Wherever makes sense for both', 'Genuinely open'],
  },
  {
    id: 'lq_social', category: 'Lifestyle', topic: 'Social life and friendships',
    core:        'What do you expect from your joint social world?',
    anniversary: 'What do you expect from your joint social world?',
    revisiting:  'What do you want your social life to look like now?',
    options: ['Mostly just us', 'Pretty quiet', 'Healthy balance', 'Pretty social', 'Very social'],
  },
  {
    id: 'lq_routine', category: 'Lifestyle', topic: 'Day-to-day rhythms and routines',
    core:        'Structured or spontaneous?',
    anniversary: 'Does your daily rhythm work for both of you?',
    revisiting:  'What rhythm do you want from here?',
    options: ['Need a lot of structure', 'Prefer loose rhythm', 'Adapt easily', 'Prefer open', 'Resist routine'],
  },

  // ── Values ───────────────────────────────────────────────────────────
  {
    id: 'lq_faith', category: 'Values', topic: 'Faith and spirituality',
    core:        'What role does it play for you?',
    anniversary: 'How does it shape your shared life now?',
    revisiting:  'Where does it sit for you today?',
    options: ['Plays no role', 'Personal, wouldn\'t shape shared life', 'Present but not imposed', 'Meaningful role', 'Central'],
  },
  {
    id: 'lq_values', category: 'Values', topic: 'Core values and beliefs',
    core:        'How aligned do you need to be?',
    anniversary: 'How aligned do you find you are now?',
    revisiting:  'How aligned do you want to be from here?',
    options: ['Simply respect each other\'s views', 'Share broadly similar values', 'Be closely aligned', 'Be deeply aligned'],
  },

  // ── Money ────────────────────────────────────────────────────────────
  {
    id: 'lq_finances', category: 'Money', topic: 'How we manage money',
    core:        'Separate, combined, or somewhere between?',
    anniversary: 'Is your current setup working for you?',
    revisiting:  'How do you want to handle money from here?',
    options: ['Fully separate', 'Mostly separate, shared account for shared expenses', 'Mostly combined', 'Fully combined'],
  },
  {
    id: 'lq_money_lean', category: 'Money', topic: 'Saving vs. spending orientation',
    core:        'Where do you naturally lean?',
    anniversary: "How does your approach compare to your partner's now?",
    revisiting:  'Where do you lean today?',
    options: ['Strongly saving', 'Lean toward saving', 'Neither', 'Lean toward spending', 'Fully in the present'],
  },
  {
    id: 'lq_money_risk', category: 'Money', topic: 'Financial risk tolerance',
    core:        'Conservative or growth-oriented?',
    anniversary: "Does your approach to risk match your partner's?",
    revisiting:  'Where are you on risk today?',
    options: ['Very conservative', 'Cautious but open', 'Comfortable with thought-through risk', 'Lean toward risk', 'Drawn to bold moves'],
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
