// Single source of truth for the Exercise 1 (Communication) questions.
// Imported by src/App.jsx (assessment UI) and api/admin-explore.js (analytics),
// so question text and a/b options never drift between the two.
export const PERSONALITY_QUESTIONS = [
  // ── Chapter 1: How You're Wired (9) — energy, expression, love, closeness ──
  { id:"en1", dimension:"energy",     text:"After a long week, you reset by:", a:"Time alone. Quiet is what restores you.", b:"Being with people you love. Connection is what recharges you." },
  { id:"ex1", dimension:"expression", text:"When you're upset, you tend to:", a:"Go quiet. You process internally before you're ready to share.", b:"Let it show. Your partner usually knows exactly how you're feeling." },
  { id:"lv1", dimension:"love",       text:"You feel most loved when your partner:", a:"Tells you. Words, spoken or written, specific and sincere, land most deeply.", b:"Shows you. Presence, touch, acts of care, and shared time speak louder than words." },
  { id:"lv2", dimension:"love",       text:"You show love primarily by:", a:"Expressing it, verbally and explicitly.", b:"Doing things. Showing up, making things easier, creating moments of closeness." },
  { id:"cl2", dimension:"closeness",  text:"When it comes to friendships and social lives, you:", a:"Need your own. Separate friendships and pursuits are part of how you stay yourself.", b:"Prefer mostly shared. Doing things together is how you want to spend your time." },
  { id:"ex2", dimension:"expression", text:"Emotional openness in a relationship means:", a:"Sharing thoughtfully. Not everything needs to be said, just the things that matter.", b:"Your partner having access to what's going on inside you, in real time." },
  { id:"en2", dimension:"energy",     text:"When working through something hard, you tend to:", a:"Think it through privately first, then share once you've landed somewhere.", b:"Talk it out. Saying it aloud is how you figure out what you think." },
  { id:"en4", dimension:"energy",     text:"When your partner needs alone time, your instinct is:", a:"Respect it immediately.", b:"Check in. Silence can feel like something's wrong." },
  { id:"ex4", dimension:"expression", text:"Your partner being able to read your mood:", a:"Isn't something you expect. You'd rather just say what you need directly.", b:"Matters to you. Being seen without having to explain feels like closeness." },

  // ── Chapter 2: How You Connect (7) — bids, love, needs ──
  { id:"bd1", dimension:"bids",       text:"Small everyday moments of connection, a squeeze of the hand, a brief check-in, a shared look:", a:"Are nice but not something you track or depend on.", b:"Matter a lot. They're how you feel close day to day." },
  { id:"lv5", dimension:"love",       text:"In ordinary day-to-day life, you feel closest to your partner when:", a:"You're talking. Conversation is the thread that keeps you close.", b:"You're simply together. Shared presence, physical closeness, doing life side by side." },
  { id:"bd3", dimension:"bids",       text:"In your relationship, you tend to:", a:"Wait for your partner to initiate small moments of connection.", b:"Reach for connection often, through small gestures, check-ins, or brief touches." },
  { id:"nd5", dimension:"needs",      text:"Articulating what you need from a partner feels:", a:"Straightforward. You can usually name it.", b:"Harder than it should be, even when you know something's missing." },
  { id:"bd4", dimension:"bids",       text:"When you reach for a small moment of connection and your partner doesn't respond:", a:"You let it go easily. It doesn't stay with you.", b:"You notice. It can leave you feeling a little distant or unseen." },
  { id:"nd3", dimension:"needs",      text:"Going without something you need rather than asking for it:", a:"Rarely happens. Asking feels natural to you.", b:"Is something you do more than you'd like." },
  { id:"nd1", dimension:"needs",      text:"It's the end of a hard day and something feels off for you, but you haven't said anything. You expect your partner to:", a:"Wait until you bring it up. It's on you to say something when you're ready.", b:"Notice and check in. Someone who knows you well should be able to tell when something's wrong." },

  // ── Chapter 3: When Things Get Hard (6) — conflict, stress ──
  { id:"cf1", dimension:"conflict",   text:"When something feels off between you, you:", a:"Want to address it as soon as possible. Leaving things unresolved sits heavily with you.", b:"Need time before you can engage. Space first, conversation later." },
  { id:"st1", dimension:"stress",     text:"When you're overwhelmed or under real pressure, you:", a:"Go quiet and withdraw. You need space before you can engage with anyone, including your partner.", b:"Reach outward. You become more communicative and need reassurance and contact to regulate." },
  { id:"cf5", dimension:"conflict",   text:"You can engage productively in conflict when:", a:"You feel emotionally safe enough to stay in it. Tone and approach matter a lot to you.", b:"The issue is on the table. You can work through discomfort to get to resolution." },
  { id:"st2", dimension:"stress",     text:"When you're stressed, what you need most from your partner is:", a:"Space and no pressure to talk. Being left alone to recover is what actually helps.", b:"Presence and acknowledgment. Knowing they're there and that they see it is what helps most." },
  { id:"st5", dimension:"stress",     text:"Imagine you're already stretched thin, work is hard, you're behind on everything. Your partner wants to talk through something between you. You:", a:"Need to postpone it. You genuinely can't show up well right now.", b:"Find that talking it through actually helps. Connection is part of how you recover." },
  { id:"cf2", dimension:"conflict",   text:"When you're in the middle of a difficult conversation with your partner, what matters most is:", a:"That they stay present and keep engaging, even if it's uncomfortable.", b:"That they give you room to step back if you need it, without taking it personally." },

  // ── Chapter 4: Making Things Right (6) — repair, feedback ──
  { id:"rp1", dimension:"repair",     text:"When you've upset your partner, your instinct is to:", a:"Address it explicitly. Name what happened and apologize directly.", b:"Show it through actions. Come back with warmth and let that speak." },
  { id:"fb1", dimension:"feedback",   text:"When your partner does something that bothers you, you:", a:"Tend to let it go or hint at it. Direct feedback feels risky or unkind.", b:"Usually say something. You'd rather address it than carry it." },
  { id:"rp3", dimension:"repair",     text:"After a conflict, you need repair to happen:", a:"Relatively quickly. Unresolved tension sitting overnight or longer is hard for you.", b:"When it's ready. You can hold unresolved tension without it consuming you." },
  { id:"fb2", dimension:"feedback",   text:"When your partner gives you honest critical feedback, your immediate reaction is:", a:"Defensive. Even when you know they mean well, your first instinct is to push back.", b:"Relatively open. You can usually hear it without feeling attacked, at least initially." },
  { id:"rp2", dimension:"repair",     text:"When you've been hurt, you feel ready to move forward when:", a:"Your partner has named what happened and shown they understand.", b:"The tension has lifted and things feel okay between you again." },
  { id:"fb5", dimension:"feedback",   text:"You can receive feedback from your partner most easily when:", a:"The tone is calm and the timing feels considered. Approach makes all the difference for you.", b:"It's direct and specific. You'd rather have it straight than carefully managed." },
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
      "Maintaining closeness and emotional intimacy over time",
      "Initiating difficult conversations",
      "Being the first to reach out after conflict",
    ],
  },
  {
    id: "extended_family", label: "Extended Family",
    items: [
      "Planning visits with {userName}'s family",
      "Gifting for {userName}'s family",
      "Staying in touch with {userName}'s family",
      "Planning visits with {partnerName}'s family",
      "Gifting for {partnerName}'s family",
      "Staying in touch with {partnerName}'s family",
    ],
  },
];

export const LIFE_QUESTIONS = [
  { id: "lq_children",     category: "Family", text: "Children",
    options: ["Not part of my future", "Uncertain", "Open to it", "Important to me, I want at least one", "Central to my future"] },
  { id: "lq_inperson_user", category: "Family", text: "Time we spend in person with {userName}'s family",
    options: ["Rarely, by design", "A few times a year", "Several times a year", "Often, regular visits", "Very often, deeply integrated"] },
  { id: "lq_contact_user",  category: "Family", text: "Day-to-day contact and involvement with {userName}'s family",
    options: ["Minimal contact", "Occasional check-ins", "Regular contact", "Daily or near-daily", "Closely involved in our lives"] },
  { id: "lq_inperson_partner", category: "Family", text: "Time we spend in person with {partnerName}'s family",
    options: ["Rarely, by design", "A few times a year", "Several times a year", "Often, regular visits", "Very often, deeply integrated"] },
  { id: "lq_contact_partner",  category: "Family", text: "Day-to-day contact and involvement with {partnerName}'s family",
    options: ["Minimal contact", "Occasional check-ins", "Regular contact", "Daily or near-daily", "Closely involved in our lives"] },
  { id: "lq_family_conf",  category: "Family", text: "When family and partner conflict",
    options: ["Side with partner", "Mediate fairly", "Defend family if right", "Keep the peace"] },
  { id: "lq_location",     category: "Lifestyle", text: "Where we live",
    options: ["Rooted where I am", "Strong preference, open to discussion", "Wherever makes sense for both", "Genuinely open"] },
  { id: "lq_social",       category: "Lifestyle", text: "Social life and friendships",
    options: ["Mostly just us", "Quiet default", "Healthy balance", "Pretty social", "Very social"] },
  { id: "lq_routine",      category: "Lifestyle", text: "Day-to-day rhythms and routines",
    options: ["Need a lot of structure", "Prefer loose rhythm", "Adapt easily", "Prefer open", "Resist routine"] },
  { id: "lq_faith",        category: "Values", text: "Faith and spirituality",
    options: ["Plays no role", "Personal, wouldn't shape shared life", "Present but not imposed", "Meaningful role", "Central"] },
  { id: "lq_values",       category: "Values", text: "Core values and beliefs",
    options: ["Simply respect each other's views", "Share broadly similar values", "Be closely aligned", "Be deeply aligned"] },
  { id: "lq_finances",     category: "Money", text: "How we manage money",
    options: ["Fully separate", "Mostly separate, shared account for shared expenses", "Mostly combined", "Fully combined"] },
  { id: "lq_money_lean",   category: "Money", text: "Saving vs. spending orientation",
    options: ["Strongly saving", "Lean toward saving", "Neither", "Lean toward spending", "Fully in the present"] },
  { id: "lq_money_risk",   category: "Money", text: "Financial risk tolerance",
    options: ["Very conservative", "Cautious but open", "Comfortable with thought-through risk", "Lean toward risk", "Drawn to bold moves"] },
  { id: "lq_conflict_when",  category: "Conflict", text: "When to address conflict",
    options: ["Address immediately", "Bring up soon", "Wait for right moment", "Take significant space", "Let things go"] },
  { id: "lq_conflict_after", category: "Conflict", text: "How long conflict resolution takes",
    options: ["Air clears quickly", "Little space, same day", "Need a night or two", "Need several days", "Varies a lot"] },
  { id: "lq_conflict_repair",category: "Conflict", text: "What repair looks like",
    options: ["Direct explicit apology", "Partner understands what happened", "Warmth returns", "Moving forward together"] },
  { id: "lq_affection",    category: "Connection", text: "Physical affection and touch",
    options: ["Essential", "Very important", "Nice but not needed consistently", "Comfortable with less", "Reserved"] },
  { id: "lq_closeness",    category: "Connection", text: "Closeness during hard times",
    options: ["Need more closeness", "Steady need", "Pull back and need space", "Varies a lot"] },
  { id: "lq_independence", category: "Connection", text: "Individual independence",
    options: ["Matters enormously", "Important but flexible", "Don't think about it much", "Want less, prefer shared life"] },
];
