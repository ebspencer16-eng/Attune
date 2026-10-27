/**
 * The one conversation each communication gap opens, keyed by dimension.
 *
 * ── WHY ITS OWN MODULE ────────────────────────────────────────────────────
 * These nine sentences were in api/_lib/highlight-cards.js AND typed out again
 * in src/App.jsx, where the website picks the same prompt from the same gap.
 * The comment above the server's copy said "Keyed by dimension, matching the
 * website exactly", which is an assertion about another file that nothing
 * checked. They did match, to the character, which is exactly why nobody had
 * looked: values that agree today are the ones nothing watches.
 *
 * The website can import from api/_lib, and already does in three other
 * places, so the fix is one import. This is a file of its own rather than an
 * export from highlight-cards.js because that module pulls in six others, and
 * putting six modules into the website's bundle to share nine sentences is the
 * trap this repo recorded when _workbook-content.js nearly went into the
 * workbook's container. No imports here, so there is nothing to drag along.
 *
 * Named -copy.js rather than -prompts.js on purpose. check-copy-has-one-home
 * finds the modules whose job is to hold words by that naming convention, and
 * says in writing that a copy module named any other way is not covered. These
 * nine sentences were duplicated for exactly as long as they sat in a file it
 * could not see, so the fix is to join the convention rather than to widen the
 * pattern: the convention is the mechanism.
 *
 * Every sentence is Ellie's copy.
 */
export const CONVO_PROMPTS = {
  energy: 'When one of us needs time alone and the other wants to connect, how do we handle that?',
  expression: "Is there something you've been sitting with that you haven't found the right moment to bring up?",
  needs: "What's something you need from me that you usually don't ask for directly?",
  bids: "What's something small I do that makes you feel noticed?",
  conflict: "After a disagreement, what does 'okay again' actually feel like for you?",
  repair: 'What do you need from me in the hours after a hard conversation?',
  listening: 'When you bring something to me, do you want me to listen, or do you want me to respond and ask questions?',
  love: "What's something I do that makes you feel genuinely loved?",
  feedback: "Is there something I do that bothers you that you haven't found the right way to bring up?",
};

/* When no gap is wide enough to single one dimension out. A real state, not an
   error: two people who are close on everything still get a question. It was
   typed out in src/App.jsx as well, one line below the nine. */
export const CONVO_FALLBACK = "What do you each need that you haven't fully said out loud yet?";
