/**
 * The question under each pair of answers on Side by Side.
 *
 * ── WHY A PROMPT AND NOT A VERDICT ────────────────────────────────────────
 * Two people answered the same question in their own words. There is nothing
 * to score there, and a summary would only get in the way of reading what the
 * other person actually wrote. So each pair carries a question instead: the
 * thing to do with having read it.
 *
 * ── WHY IT LEFT src/App.jsx ───────────────────────────────────────────────
 * It was inline in the website's results component, so the app's Side by Side
 * page showed the two answers and nothing else, which is the half of that page
 * that does the work.
 */

export const REFLECTION_PROMPTS = {
        a1: "Read each other's answer, then say why that moment and not another one.",
        a2: "Ask what it was like from the inside. You were both there, but not in the same way.",
        a6: "Ask what would help. The person working on it rarely wants to be fixed, they want to be noticed trying.",
        a7: "Talk about the pattern, not the incident. What does each of you need in the first hour when it gets hard?",
        a5: "Find the overlap first. Then get concrete about the parts that differ: numbers, places, timelines.",
        a3: "Say it out loud to each other. Gratitude that stays unspoken does none of the work.",
        a4: "Pick one small version of each answer and try both this month.",
      };

/** The prompt for a question, or nothing when it has none. */
export function promptFor(questionId) {
  return REFLECTION_PROMPTS[questionId] || null;
}
