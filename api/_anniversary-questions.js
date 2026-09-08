/**
 * Relationship Reflection (Exercise 3), in one place.
 *
 * ── WHY THIS MOVED ────────────────────────────────────────────────────────
 * The real list lived in src/App.jsx, inside the website bundle, so the app
 * could not reach a word of it and the four Reflection sections were empty.
 * This file held a hand-copied subset of it for the admin charts, with its own
 * shortened wording, which is two lists that had to agree and nothing checking
 * that they did.
 *
 * Now there is one list. The admin subset derives from it below.
 *
 * Scale answers are stored in profiles.ex3_answers as the option INDEX (0-4).
 * Pick answers are stored as the chosen string. Rank answers are stored as an
 * ordered array. Text answers are stored as typed.
 */

export const ANNIVERSARY_QUESTIONS = [
  // Warm-up: light, accessible
  { id: "a0", category: "Getting Started", type: "scale", text: "Right now, how would you describe the overall feel of our relationship?", scaleLabels: ["Needs real work", "Going through a rough patch", "Solid and steady", "Really good", "Better than ever"], scaleColors: ["#ef4444","#f97316","#eab308","#22c55e","#10b981"] },
  { id: "a_memory", category: "Getting Started", type: "text", text: "Something small that happened recently that made me smile about us:", placeholder: "e.g. A quiet moment, something you said, something we laughed about..." },
  // Milestones
  { id: "a1", category: "Milestones", type: "text", text: "The moment I felt most proud of us as a couple:", placeholder: "e.g. When we navigated something hard together, or when we supported each other through..." },
  { id: "a2", category: "Milestones", type: "text", text: "A challenge we faced together that made our relationship stronger:", placeholder: "e.g. Moving cities, a hard year, a disagreement we worked through..." },
  // How we're doing — connection, communication, admiration, fun
  { id: "a_sat_conn", category: "How We're Doing", type: "scale", text: "How connected do I feel to you day-to-day right now?", scaleLabels: ["Not very connected", "A bit distant", "Somewhat connected", "Quite connected", "Very connected"], scaleColors: ["#ef4444","#f97316","#eab308","#22c55e","#10b981"] },
  { id: "a_sat_comm", category: "How We're Doing", type: "scale", text: "How well do I feel we communicate when something is bothering one of us?", scaleLabels: ["We avoid it", "It's hard", "We manage", "Pretty well", "Really well"], scaleColors: ["#ef4444","#f97316","#eab308","#22c55e","#10b981"] },
  { id: "a8", category: "How We're Doing", type: "pick", text: "The quality I most admire in my partner right now:", options: ["Patient","Funny","Supportive","Ambitious","Kind","Curious","Steady","Adventurous","Honest","Thoughtful"] },
  { id: "a_sat_fun", category: "How We're Doing", type: "scale", text: "How much do we prioritize fun and lightness together?", scaleLabels: ["Not enough", "Less than I'd like", "About right", "Quite a bit", "A lot"], scaleColors: ["#ef4444","#f97316","#eab308","#22c55e","#10b981"] },
  // Looking forward — priorities first, then 6mo, then honest reflection, then 5yr
  { id: "a_priority", category: "Looking Forward", type: "rank", text: "Rank these from most to least important to invest in together this year:", options: ["Quality time","Communication","Financial alignment","Physical intimacy","Shared adventures","Long-term planning"] },
  { id: "a6", category: "Looking Forward", type: "text", text: "One thing I want to work on, in the next 6 months, in how I show up for you:", placeholder: "e.g. Being more present, saying what I need directly, making more time for us..." },
  { id: "a7", category: "Looking Forward", type: "text", text: "Something I wish we'd approached differently:", placeholder: "e.g. A disagreement we got stuck on, a decision we made without fully talking it through..." },
  { id: "a5", category: "Looking Forward", type: "text", text: "Where I see us in 5 years, what matters most to me about that picture:", placeholder: "e.g. Financially stable and adventurous, close to family, in a home we love..." },
  // What matters — gratitude and intention, ends the exercise on a high note
  { id: "a3", category: "What Matters", type: "text", text: "The part of our relationship I'm most grateful for:", placeholder: "e.g. How you make me feel safe, the way we laugh together, the life we've built..." },
  { id: "a4", category: "What Matters", type: "text", text: "Something I want to do more of together in the next year:", placeholder: "e.g. Travel, slow weekends, have the big conversations, invest in our friendship..." },
];

/**
 * Bumped whenever the question set changes: added, removed or reworded.
 *
 * Stored on each completion as profiles.ex3_version, so answers can later be
 * segmented by which wording someone actually saw.
 */
export const ANNIVERSARY_VERSION = 1;

/**
 * The admired quality, as a noun.
 *
 * The exercise asks for an adjective. Results read better as a quality:
 * "Ellie is admired for steadiness", not "for steady". The question is
 * unchanged; this only affects how the answer is referred to.
 */
export const ADMIRED_NOUN = {
  Patient: 'Patience', Funny: 'Humor', Supportive: 'Support', Ambitious: 'Ambition',
  Kind: 'Kindness', Curious: 'Curiosity', Steady: 'Steadiness', Adventurous: 'Adventurousness',
  Honest: 'Honesty', Thoughtful: 'Thoughtfulness',
};

export const admiredNoun = (v) => (v ? (ADMIRED_NOUN[v] || v) : v);

/**
 * Free text that is not an answer.
 *
 * "nothing", "n/a", "nothing comes to mind". Treating those as content
 * produced insights asserting a problem the person never described, which is
 * worse than showing nothing.
 */
export const NON_ANSWER = /^(n\/?a|none|nothing|no|nope|idk|i don'?t know|not sure|nothing really|nothing comes to mind|nothing much|can'?t think of (one|any|anything)|nothing i can think of|-+|\.+)$/i;

export const isNonAnswer = (v) => {
  const t = String(v == null ? '' : v).trim();
  return !t || t.length < 3 || NON_ANSWER.test(t);
};

/**
 * The subset the admin charts aggregate, derived rather than restated.
 *
 * Scales and the one pick question. Free text and the ranking are left out
 * because neither aggregates into a distribution worth showing.
 *
 * The shorter wording below is for a chart axis, where the full question does
 * not fit. It is the only thing this file states twice, and it is keyed by id,
 * so a question that loses its id loses its label rather than silently
 * carrying the wrong one.
 */
const ANALYTICS_TEXT = {
  a0: 'Overall feel of the relationship right now',
  a_sat_conn: 'Day-to-day connection',
  a_sat_comm: 'Communication when something is bothering us',
  a_sat_fun: 'Prioritizing fun and lightness together',
  a8: 'Quality most admired in partner',
};

export const REFLECTION_QUESTIONS = Object.keys(ANALYTICS_TEXT)
  // Ordered by this map rather than by the exercise, because the charts read
  // in a different order from the one people answer in and always have.
  .map((id) => ANNIVERSARY_QUESTIONS.find((q) => q.id === id))
  .filter((q) => q && (q.type === 'scale' || q.type === 'pick'))
  .map((q) => ({
    id: q.id,
    topic: q.category,
    text: ANALYTICS_TEXT[q.id],
    kind: q.type,
    ...(q.type === 'scale' ? { labels: q.scaleLabels } : { options: q.options }),
  }));
