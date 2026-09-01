// Single source of truth for the Exercise 1 (Communication) questions.
// Imported by src/App.jsx (assessment UI) and api/admin-explore.js (analytics),
// so question text and a/b options never drift between the two.
// 26 questions across 10 dimensions, in the order they are asked. Grouped by
// results domain: internal processing, how you connect, when things get hard.
// Part 2 re-asks all of them about the partner (see PARTNER_VIEW_TEXT).
export const PERSONALITY_QUESTIONS = [
  // ── Internal processing: energy, expression, reassurance ──────────────────
  { id:"en6", dimension:"energy",      text:"When it comes to your social lives, you lean toward:", a:"Independent. Your own friendships and plans are part of how you stay yourself.", b:"Shared. Doing things together is how you most want to spend your time." },
  { id:"en4", dimension:"energy",      text:"When your partner needs alone time, your instinct is:", a:"Respect it immediately.", b:"Check in. Silence can feel like something's wrong." },
  { id:"ex6", dimension:"expression",  text:"When you're going through something, you tend to:", a:"Keep it mostly to yourself until you've worked through it.", b:"Let your partner in as it's happening, even before you have answers." },
  // ex7 poles are ordered guarded -> external for scoring consistency with the
  // other expression items.
  { id:"ex7", dimension:"expression",  text:"You feel most understood by your partner when:", a:"They pick up on something without you having to say it", b:"They give you time to explain yourself fully" },
  { id:"ex8", dimension:"expression",  text:"When your partner does something you appreciate, you tend to:", a:"Feel it more than say it.", b:"Say it. You name the small things, not just the big ones." },
  { id:"rs3", dimension:"reassurance", text:"When you're upset and your partner responds, you feel most heard when:", a:"They show they get why you feel that way, even if they see it differently.", b:"They move toward fixing or figuring out the issue itself." },
  { id:"rs1", dimension:"reassurance", text:"When it comes to feeling secure in the relationship, you'd rather:", a:"Have it reaffirmed. Hearing where you stand keeps you close.", b:"Take it as given. You don't need it confirmed to feel steady." },

  // ── How you connect: love, needs, bids, listening ─────────────────────────
  { id:"lv1", dimension:"love",        text:"You feel most loved when your partner:", a:"Tells you. Words, spoken or written, specific and sincere, land most deeply.", b:"Shows you. Presence, touch, acts of care, and shared time speak louder than words." },
  { id:"lv2", dimension:"love",        text:"You show love primarily by:", a:"Expressing it, verbally and explicitly.", b:"Doing things. Showing up, making things easier, creating moments of closeness." },
  { id:"nd5", dimension:"needs",       text:"Articulating what you need from a partner feels:", a:"Straightforward. You can usually name it.", b:"Hard to name, even when you know something is missing." },
  { id:"nd1", dimension:"needs",       text:"It's the end of a hard day and something feels off for you, but you haven't said anything. You expect your partner to:", a:"Wait until you bring it up. It's on you to say something when you're ready.", b:"Notice and check in. Someone who knows you well should be able to tell when something's wrong." },
  { id:"bd1", dimension:"bids",        text:"Small everyday moments of connection, a squeeze of the hand, a brief check-in, a shared look:", a:"Are nice but not something you track or depend on.", b:"Matter a lot. They're how you feel close day to day." },
  { id:"bd3", dimension:"bids",        text:"In your relationship, you tend to:", a:"Wait for your partner to initiate small moments of connection.", b:"Reach for connection often, through small gestures, check-ins, or brief touches." },
  { id:"bd4", dimension:"bids",        text:"When you reach for a small moment of connection and your partner doesn't respond:", a:"You let it go easily. It doesn't stay with you.", b:"You notice. It can leave you feeling a little distant or unseen." },
  { id:"ls1", dimension:"listening",   text:"When your partner is talking through something that matters to them, you tend to:", a:"Listen and sit with it. You don't need to fix it or fill the silence.", b:"Respond, reflect back, ask questions. Engagement is how you show you care." },
  { id:"ls3", dimension:"listening",   text:"A lull in conversation usually feels:", a:"Comfortable. You don't need to fill it.", b:"Like a cue to check in or say something." },

  // ── When things get hard: conflict, repair, feedback ──────────────────────
  { id:"cf1", dimension:"conflict",    text:"When something feels off between you, you:", a:"Want to address it as soon as possible. Leaving things unsaid sits heavily with you.", b:"Need time before you can engage. Space first, conversation later." },
  { id:"cf2", dimension:"conflict",    text:"When you're in the middle of a difficult conversation with your partner, what matters most is:", a:"That they stay present and keep engaging, even if it's uncomfortable.", b:"That they give you room to step back if you need it, without taking it personally." },
  { id:"cf3", dimension:"conflict",    text:"When something small bothers you about the relationship, you tend to:", a:"Bring it up. You'd rather clear the air than let it build.", b:"Let it go. Not everything needs a conversation." },
  // st1's options run withdraw -> seek, the opposite of the other conflict
  // items, so it is in FLIPPED_QUESTIONS in both scorers.
  { id:"st1", dimension:"conflict",    text:"When you're going through a hard stretch, you tend to:", a:"Pull inward. You need to get through it yourself before you can really be present with your partner.", b:"Lean in. Being close to your partner is part of how you get through hard things." },
  { id:"rp3", dimension:"repair",      text:"After a conflict, you need repair to happen:", a:"Relatively quickly. Unresolved tension sitting overnight or longer is hard for you.", b:"When it's ready. You can hold unresolved tension without it consuming you." },
  { id:"rp2", dimension:"repair",      text:"When you've been hurt, you feel ready to move forward when:", a:"Your partner has named what happened and shown they understand.", b:"The tension has lifted and things feel okay between you again." },
  { id:"rp6", dimension:"repair",      text:"After a conflict, when you want to repair things, it feels natural to:", a:"Initiate a conversation to resolve the issue", b:"Wait until your partner brings it up" },
  { id:"fb5", dimension:"feedback",    text:"When receiving feedback from your partner, it matters most to you that:", a:"The tone is calm and the timing feels considered. Approach makes all the difference for you.", b:"It's direct and specific. You'd rather have it straight than carefully managed." },
  { id:"fb2", dimension:"feedback",    text:"When you have feedback for your partner, you tend to:", a:"Soften it and choose the moment carefully.", b:"Say it plainly, close to when it comes up." },
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



// Part 2 of the comms exercise: the same 27 questions re-asked about the
// partner. Keyed by self-question id. Reviewed copy.
export const PARTNER_VIEW_TEXT = {
  lv1: { text: "Your partner feels most loved when you:", a: "Tell them. Words land most deeply.", b: "Show them. Presence, touch, and acts of care speak loudest." },
  lv2: { text: "Your partner shows love primarily by:", a: "Expressing it, verbally and explicitly.", b: "Doing things. Showing up and making life easier." },
  ex6: { text: "When your partner is going through something, they tend to:", a: "Keep it mostly to themselves until they've worked through it.", b: "Let you in as it's happening." },
  en4: { text: "When you need alone time, your partner's instinct is to:", a: "Respect it right away.", b: "Check in. Silence can feel like something's wrong to them." },
  ex7: { text: "Your partner feels most understood when:", a: "You pick up on something without them having to say it.", b: "They're able to explain themselves clearly." },
  bd1: { text: "For your partner, small everyday moments of connection:", a: "Are nice but not something they track or depend on.", b: "Matter a lot. They're how they feel close day to day." },
  bd3: { text: "In your relationship, your partner tends to:", a: "Wait for you to initiate small moments of connection.", b: "Reach for connection often, through small gestures or check-ins." },
  bd4: { text: "When your partner reaches for connection and you don't respond:", a: "They let it go easily.", b: "They notice. It can leave them feeling a little distant or unseen." },
  nd5: { text: "For your partner, articulating what they need feels:", a: "Straightforward. They can usually name it.", b: "Hard to name, even when they know something's missing." },
  nd1: { text: "When something feels off for your partner but they haven't said anything, they expect you to:", a: "Wait until they bring it up.", b: "Notice and check in." },
  st1: { text: "When your partner is going through a hard stretch, they tend to:", a: "Pull inward. They get through it themselves before they can be present.", b: "Lean in. Closeness is part of how they cope." },
  cf1: { text: "When something feels off between you, your partner tends to:", a: "Address it as soon as possible.", b: "Need time and space before engaging." },
  cf2: { text: "In a difficult conversation, what matters most to your partner is:", a: "That you stay present and keep engaging.", b: "That you give them room to step back if they need it." },
  ls1: { text: "When you're talking through something that matters to you, your partner tends to:", a: "Listen and sit with it. They don't need to fix it or fill the silence.", b: "Respond, reflect back, ask questions." },
  rp3: { text: "After a conflict, your partner needs repair to happen:", a: "Relatively quickly. Unresolved tension is hard for them.", b: "When it's ready. They can hold it without it consuming them." },
  rp2: { text: "When your partner has been hurt, they feel ready to move forward when:", a: "You've named what happened and shown you understand.", b: "The tension has lifted and things feel okay again." },
  rp6: { text: "After a conflict, the move toward repair usually comes from your partner:", a: "Relatively quickly. They tend to reach out first.", b: "Only once they're ready. They wait it out." },
  fb5: { text: "When you raise something that bothers you, your partner:", a: "Needs a calm tone and careful timing to take it in.", b: "Takes it straight. Direct and specific lands best." },
  en6: { text: "When it comes to your social lives, your partner leans toward:", a: "Independent. Their own friendships and plans keep them themselves.", b: "Shared. Doing things together is how they most want to spend time." },
  ex8: { text: "When you do something your partner appreciates, they tend to:", a: "Feel it more than say it.", b: "Say it. They name the small things, not just the big ones." },
  cf3: { text: "When something small bothers your partner, they tend to:", a: "Bring it up. They'd rather clear the air.", b: "Let it go. Not everything needs a conversation." },
  fb2: { text: "When your partner has feedback for you, they tend to:", a: "Soften it and choose the moment carefully.", b: "Say it plainly, close to when it comes up." },
  rs3: { text: "When your partner is upset and you respond, they feel most heard when:", a: "You show you get why they feel that way, even if you see it differently.", b: "You move toward fixing or figuring out the issue itself." },
  ls3: { text: "A lull in conversation usually feels, to your partner:", a: "Comfortable. They don't need to fill it.", b: "Like a cue to check in or say something." },
  rs1: { text: "When it comes to feeling secure, your partner would rather:", a: "Have it reaffirmed. Hearing where they stand keeps them close.", b: "Take it as given. They don't need it confirmed to feel steady." },
};
