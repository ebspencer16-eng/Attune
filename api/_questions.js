// Single source of truth for the Exercise 1 (Communication) questions.
// Imported by src/App.jsx (assessment UI) and api/admin-explore.js (analytics),
// so question text and a/b options never drift between the two.
export const PERSONALITY_QUESTIONS = [
  // ── Chapter 1: How You're Wired (5) — love, expression, energy ──
  { id:"lv1", dimension:"love",       text:"You feel most loved when your partner:", a:"Tells you. Words, spoken or written, specific and sincere, land most deeply.", b:"Shows you. Presence, touch, acts of care, and shared time speak louder than words." },
  { id:"lv2", dimension:"love",       text:"You show love primarily by:", a:"Expressing it, verbally and explicitly.", b:"Doing things. Showing up, making things easier, creating moments of closeness." },
  { id:"ex6", dimension:"expression", text:"When you're going through something, you tend to:", a:"Keep it mostly to yourself until you've worked through it.", b:"Let your partner in as it's happening, even before you have answers." },
  { id:"en4", dimension:"energy",     text:"When your partner needs alone time, your instinct is:", a:"Respect it immediately.", b:"Check in. Silence can feel like something's wrong." },
  // ex7 poles ordered guarded→external for scoring consistency with the other expression items (see handoff note).
  { id:"ex7", dimension:"expression", text:"You feel most understood by your partner when:", a:"They pick up on something without you having to say it.", b:"You're able to explain yourself clearly." },

  // ── Chapter 2: How You Connect (6) — love, bids, needs ──
  // lv5 poles ordered physical(a)->verbal(b) for display; scoring inverts lv5
  // (see FLIPPED_QUESTIONS) so the love dimension stays oriented verbal->physical
  // consistent with lv1/lv2.
  { id:"lv5", dimension:"love",       text:"In ordinary day-to-day life, you feel closest to your partner when:", a:"You're simply together. Shared presence, physical closeness, doing life side by side.", b:"You're talking. Conversation keeps you close." },
  { id:"bd1", dimension:"bids",       text:"Small everyday moments of connection, a squeeze of the hand, a brief check-in, a shared look:", a:"Are nice but not something you track or depend on.", b:"Matter a lot. They're how you feel close day to day." },
  { id:"bd3", dimension:"bids",       text:"In your relationship, you tend to:", a:"Wait for your partner to initiate small moments of connection.", b:"Reach for connection often, through small gestures, check-ins, or brief touches." },
  { id:"bd4", dimension:"bids",       text:"When you reach for a small moment of connection and your partner doesn't respond:", a:"You let it go easily. It doesn't stay with you.", b:"You notice. It can leave you feeling a little distant or unseen." },
  { id:"nd5", dimension:"needs",      text:"Articulating what you need from a partner feels:", a:"Straightforward. You can usually name it.", b:"Hard to name, even when you know something is missing." },
  { id:"nd1", dimension:"needs",      text:"It's the end of a hard day and something feels off for you, but you haven't said anything. You expect your partner to:", a:"Wait until you bring it up. It's on you to say something when you're ready.", b:"Notice and check in. Someone who knows you well should be able to tell when something's wrong." },

  // ── Chapter 3: When Things Get Hard (4) — stress, conflict, listening ──
  { id:"st1", dimension:"conflict",   text:"When you're going through a hard stretch, you tend to:", a:"Pull inward. You need to get through it yourself before you can really be present with your partner.", b:"Lean in. Being close to your partner is part of how you get through hard things." },
  { id:"cf1", dimension:"conflict",   text:"When something feels off between you, you:", a:"Want to address it as soon as possible. Leaving things unresolved sits heavily with you.", b:"Need time before you can engage. Space first, conversation later." },
  { id:"cf2", dimension:"conflict",   text:"When you're in the middle of a difficult conversation with your partner, what matters most is:", a:"That they stay present and keep engaging, even if it's uncomfortable.", b:"That they give you room to step back if you need it, without taking it personally." },
  { id:"ls1", dimension:"listening",  text:"When your partner is talking through something that matters to them, you tend to:", a:"Listen and sit with it. You don't need to fix it or fill the silence.", b:"Respond, reflect back, ask questions. Engagement is how you show you care." },

  // ── Chapter 4: Making Things Right (4) — repair, feedback ──
  { id:"rp3", dimension:"repair",     text:"After a conflict, you need repair to happen:", a:"Relatively quickly. Unresolved tension sitting overnight or longer is hard for you.", b:"When it's ready. You can hold unresolved tension without it consuming you." },
  { id:"rp2", dimension:"repair",     text:"When you've been hurt, you feel ready to move forward when:", a:"Your partner has named what happened and shown they understand.", b:"The tension has lifted and things feel okay between you again." },
  { id:"rp6", dimension:"repair",     text:"After a conflict, the move toward repair usually comes from:", a:"Whoever feels ready first, often you.", b:"Waiting to see if your partner reaches out first." },
  { id:"fb5", dimension:"feedback",   text:"You can receive feedback from your partner most easily when:", a:"The tone is calm and the timing feels considered. Approach makes all the difference for you.", b:"It's direct and specific. You'd rather have it straight than carefully managed." },

  // ── Chapter 5: Everyday Life Together (4) — energy, expression ──
  { id:"en6", dimension:"energy",     text:"When it comes to your social lives, you lean toward:", a:"Independent. Your own friendships and plans are part of how you stay yourself.", b:"Shared. Doing things together is how you most want to spend your time." },
  { id:"ex8", dimension:"expression", text:"When your partner does something you appreciate, you tend to:", a:"Feel it more than say it.", b:"Say it. You name the small things, not just the big ones." },
  { id:"ex9", dimension:"expression", text:"When something good happens to you, your first instinct is:", a:"Sit with it for a bit before sharing.", b:"Tell your partner immediately. Sharing it is part of enjoying it." },
  { id:"ex10", dimension:"expression", text:"When your partner shares exciting news, you tend to:", a:"Respond genuinely but quietly. You're present without necessarily amplifying.", b:"Match their energy. You light up with them." },
  { id:"cf3", dimension:"conflict",   text:"When something small bothers you about the relationship, you tend to:", a:"Bring it up. You'd rather clear the air than let it build.", b:"Let it go. Not everything needs a conversation." },
  { id:"fb2", dimension:"feedback",   text:"When you have feedback for your partner, you tend to:", a:"Soften it and choose the moment carefully.", b:"Say it plainly, close to when it comes up." },
];

// Exercise 2 (Expectations) source of truth, shared with api/admin-explore.js.
export const RESPONSIBILITY_CATEGORIES = [
  {
    id: "household", label: "Household",
    items: [
      "Cooking meals",
      "Grocery shopping and meal planning",
      "Keeping the home tidy day-to-day",
      "Managing home repairs and maintenance",
      "Managing the family calendar",
      "Planning and organizing social events, holidays, and gatherings",
      "Planning and booking vacations",
    ],
  },
  {
    id: "financial", label: "Financial",
    items: [
      "Paying bills and managing day-to-day finances",
      "Making major financial decisions",
      "Managing savings and investments",
      "Filing taxes",
    ],
  },
  {
    id: "career", label: "Career & Work",
    items: [
      "Being the primary income earner",
      "Whose career shapes major family decisions, where you live, your schedule, your lifestyle",
      "Who makes career sacrifices when the family needs it",
    ],
  },
  {
    id: "emotional", label: "Emotional Labor",
    items: [
      "Carrying the mental load, remembering, anticipating, planning ahead",
      "Tracking the emotional wellbeing of the household",
    ],
  },
  {
    id: "extended_family", label: "Extended Family",
    items: [
      "Planning visits with {userName}'s family",
      "Gifting for {userName}'s family",
      "Planning visits with {partnerName}'s family",
      "Gifting for {partnerName}'s family",
    ],
  },
];

export const LIFE_QUESTIONS = [
  { id: "lq_children", category: "Family", topic: "Children", text: "Children",
    core: "Do you want them?", anniversary: "How do your plans and feelings align now?", revisiting: "Where are you on this today?",
    options: ["Not part of my future", "Uncertain", "Open to it", "Important to me, I want at least one", "Central to my future"] },
  { id: "lq_involve_user", category: "Family", topic: "Involvement with {userName}'s family", text: "Involvement with {userName}'s family",
    core: "Thinking about in-person visits and digital contact, what level of involvement feels right?", anniversary: "Is the current level of involvement working for you?", revisiting: "Where do you want this to settle?",
    options: ["Very little, if any", "Minimal, by design", "Casual relationship", "Consistent contact", "Frequent, deeply integrated"] },
  { id: "lq_involve_partner", category: "Family", topic: "Involvement with {partnerName}'s family", text: "Involvement with {partnerName}'s family",
    core: "Thinking about in-person visits and digital contact, what level of involvement feels right?", anniversary: "Is the current level of involvement working for you?", revisiting: "Where do you want this to settle?",
    options: ["Very little, if any", "Minimal, by design", "Casual relationship", "Consistent contact", "Frequent, deeply integrated"] },
  { id: "lq_family_conf", category: "Family", topic: "When family and partner conflict", text: "When family and partner conflict",
    core: "Whose needs take priority for you?", anniversary: "How do you tend to navigate this now?", revisiting: "How do you handle this tension today?",
    options: ["Side with partner", "Mediate fairly", "Defend family if right", "Keep the peace"] },
  { id: "lq_location", category: "Lifestyle", topic: "Where we live", text: "Where we live",
    core: "City, suburb, or rural?", anniversary: "Are you where you want to be long-term?", revisiting: "Where do you want to be from here?",
    options: ["Rooted where I am", "Strong preference, open to discussion", "Wherever makes sense for both", "Genuinely open"] },
  { id: "lq_social", category: "Lifestyle", topic: "Social life and friendships", text: "Social life and friendships",
    core: "What do you expect from your joint social world?", anniversary: "What do you expect from your joint social world?", revisiting: "What do you want your social life to look like now?",
    options: ["Mostly just us", "Pretty quiet", "Healthy balance", "Pretty social", "Very social"] },
  { id: "lq_routine", category: "Lifestyle", topic: "Day-to-day rhythms and routines", text: "Day-to-day rhythms and routines",
    core: "Structured or spontaneous?", anniversary: "Does your daily rhythm work for both of you?", revisiting: "What rhythm do you want from here?",
    options: ["Need a lot of structure", "Prefer loose rhythm", "Adapt easily", "Prefer open", "Resist routine"] },
  { id: "lq_faith", category: "Values", topic: "Faith and spirituality", text: "Faith and spirituality",
    core: "What role does it play for you?", anniversary: "How does it shape your shared life now?", revisiting: "Where does it sit for you today?",
    options: ["Plays no role", "Personal, wouldn't shape shared life", "Present but not imposed", "Meaningful role", "Central"] },
  { id: "lq_values", category: "Values", topic: "Core values and beliefs", text: "Core values and beliefs",
    core: "How aligned do you need to be?", anniversary: "How aligned do you find you are now?", revisiting: "How aligned do you want to be from here?",
    options: ["Simply respect each other's views", "Share broadly similar values", "Be closely aligned", "Be deeply aligned"] },
  { id: "lq_finances", category: "Money", topic: "How we manage money", text: "How we manage money",
    core: "Separate, combined, or somewhere between?", anniversary: "Is your current setup working for you?", revisiting: "How do you want to handle money from here?",
    options: ["Fully separate", "Mostly separate, shared account for shared expenses", "Mostly combined", "Fully combined"] },
  { id: "lq_money_lean", category: "Money", topic: "Saving vs. spending orientation", text: "Saving vs. spending orientation",
    core: "Where do you naturally lean?", anniversary: "How does your approach compare to your partner's now?", revisiting: "Where do you lean today?",
    options: ["Strongly saving", "Lean toward saving", "Neither", "Lean toward spending", "Fully in the present"] },
  { id: "lq_money_risk", category: "Money", topic: "Financial risk tolerance", text: "Financial risk tolerance",
    core: "Conservative or growth-oriented?", anniversary: "Does your approach to risk match your partner's?", revisiting: "Where are you on risk today?",
    options: ["Very conservative", "Cautious but open", "Comfortable with thought-through risk", "Lean toward risk", "Drawn to bold moves"] },
];


// ─────────────────────────────────────────────────────────────────────────────
// PARTNER-VIEW ITEMS (Proposal B). Dimension-level summary questions the user
// answers ABOUT their partner, on the SAME 1-5 A->B scale and orientation as the
// dimension's self items (a=1, b=5). `after` places each one right after that
// self item in the exercise flow. Scored via a self/partner blend
// (blendedDimScores in _type-engine.js); NOT in DIM_KEYS, so self dimension
// scores are never affected by them.
// ─────────────────────────────────────────────────────────────────────────────
export const PARTNER_VIEW_ITEMS = [
  { id: "pv_conflict", dimension: "conflict", partnerView: true, after: "cf1",
    text: "When something feels off between you, your partner tends to:",
    a: "Address it as soon as possible.", b: "Need time and space before engaging." },
  { id: "pv_stress", dimension: "stress", partnerView: true, after: "st1",
    text: "When your partner is going through a hard stretch, they tend to:",
    a: "Pull inward and get through it on their own.", b: "Lean on you. Closeness is part of how they cope." },
  { id: "pv_repair", dimension: "repair", partnerView: true, after: "rp6",
    text: "After a conflict, the move toward repair usually comes from your partner:",
    a: "Relatively quickly. They tend to reach out first.", b: "Only once they're ready. They wait it out." },
  { id: "pv_expression", dimension: "expression", partnerView: true, after: "ex6",
    text: "When your partner is going through something, they tend to:",
    a: "Keep it mostly to themselves until they've worked through it.", b: "Let you in as it's happening." },
  { id: "pv_feedback", dimension: "feedback", partnerView: true, after: "fb5",
    text: "When you raise something that bothers you, your partner:",
    a: "Needs a calm tone and careful timing to take it in.", b: "Takes it straight. Direct and specific lands best." },
  { id:"rs1", dimension:"reassurance", text:"When it comes to feeling secure in the relationship, you'd rather:", a:"Have it reaffirmed. Hearing where you stand keeps you close.", b:"Take it as given. You don't need it confirmed to feel steady." },
  { id:"rs2", dimension:"reassurance", text:"If a while goes by with no 'we're okay' between you, you:", a:"Feel the gap and want to check in.", b:"Don't think twice. Silence isn't a signal to you." },
];
