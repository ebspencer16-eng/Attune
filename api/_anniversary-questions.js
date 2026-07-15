// Aggregatable Relationship Reflection (Exercise 3) questions, for admin analytics.
// Mirrors the scale + pick questions in src/App.jsx ANNIVERSARY_QUESTIONS.
// Free-text and ranking questions are intentionally omitted (not meaningfully
// aggregatable into a distribution).
//
// Scale answers are stored in profiles.ex3_answers as the option INDEX (0-4),
// so `labels[index]` gives the readable value. Pick answers are stored as the
// chosen option string directly.
export const REFLECTION_QUESTIONS = [
  { id: 'a0',         topic: 'Overall feel',    text: 'Overall feel of the relationship right now', kind: 'scale',
    labels: ['Needs real work', 'Rough patch', 'Solid & steady', 'Really good', 'Better than ever'] },
  { id: 'a_sat_conn', topic: 'Connection',      text: 'Day-to-day connection', kind: 'scale',
    labels: ['Not very connected', 'A bit distant', 'Somewhat connected', 'Quite connected', 'Very connected'] },
  { id: 'a_sat_comm', topic: 'Communication',   text: 'Communication when something is bothering us', kind: 'scale',
    labels: ['We avoid it', "It's hard", 'We manage', 'Pretty well', 'Really well'] },
  { id: 'a_sat_fun',  topic: 'Fun & lightness', text: 'Prioritizing fun and lightness together', kind: 'scale',
    labels: ['Not enough', "Less than I'd like", 'About right', 'Quite a bit', 'A lot'] },
  { id: 'a8',         topic: 'Most admired',     text: 'Quality most admired in partner', kind: 'pick',
    options: ['Patient', 'Funny', 'Supportive', 'Ambitious', 'Kind', 'Curious', 'Steady', 'Adventurous', 'Honest', 'Thoughtful'] },
];
