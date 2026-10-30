// Physical Intimacy Expectations — results interpretation prose.
//
// Single source of truth for the per-dimension results copy. Imported by the
// results section (App.jsx) and the review-doc generator. SCAFFOLD COPY pending
// Carolina review.
//
// For each dimension:
//   intro    — one line on what this dimension covers (neutral)
//   aligned  — "what this means" when partners' answers are close
//   discuss  — "what this means" when there's a moderate gap
//   different— "what this means" when answers diverge
//   unspoken — "what this means" when both chose "prefer not to say"
//   prompt   — a question one partner can read aloud to the other ("Ask each other:")
//   oneSkipped — { lead, question } shown when ONE partner skipped the whole
//                dimension (the other answered). {SKIPPER} = the partner who
//                skipped. For these couples the separate prompt tile is hidden.
//
// {U} = current user's name, {P} = partner's name. Neither end of any
// dimension is better; the difference is what's worth talking through.

/**
 * The label above a dimension's prompt.
 *
 * Typed inline in src/App.jsx, three times, and nowhere the app could read it.
 * So the website wrapped each prompt in a tile headed "Ask each other" and the
 * app printed the same sentence as a bare heading with nothing naming it: the
 * reader was given a question with no indication it was a question to ask.
 */
export const TALK_ABOUT_IT = 'Ask each other';

/**
 * The line under the two names on Physical Intimacy at a glance.
 *
 * One of two, by which version of the exercise the couple answered. Typed as a
 * ternary inside src/App.jsx, so the app had neither and opened the page with
 * no line at all.
 */
/**
 * The line under "Conversations worth having" when a couple lines up on every
 * dimension.
 *
 * The list is still shown in that case, because agreeing is not the same as
 * having said it out loud, and this is the sentence that explains why the page
 * is not empty. It was typed inside src/App.jsx, so the app had no way to
 * explain it and simply showed the list.
 */
export const INTIMACY_ALL_ALIGNED = 'You line up on all six aspects. The conversations below are still worth having out loud.';

export const INTIMACY_LEAD = {
  married: 'Based on how things are now.',
  premarital: 'Based on what you each expect.',
};

export const INTIMACY_RESULTS_PROSE = {
  frequency: {
    intro: "How often each of you wants physical intimacy.",
    aligned: "You want intimacy about as often as each other, so frequency is one less thing to negotiate. Try to keep telling each other how often you want intimacy anyway, because frequency that goes unspoken tends to drift.",
    discuss: "When it comes to wanting intimacy more often or less often, you have slightly different needs. This is the most common difference couples have. Try to tell each other early how often you each want intimacy, before it turns into keeping score.",
    different: "You want intimacy at different rates. Neither rate is the correct one. The point is not to land on a number. It is to understand what intimacy gives each of you.",
    unspoken: "Neither of you put a number to how often you want intimacy, and that is fine. Frequency is the easiest of the six aspects to talk about, because it is concrete.",
    oneSkipped: { lead: "{SKIPPER} chose to skip the questions about how often you want intimacy. Here is a question you can ask each other when the time feels right.", question: "How often feels right to each of us, and what do we want to do on the nights we want different things?" },
    prompt: "How often feels right to you, and what do you want us to do on the nights we want different things?",
  },
  initiating: {
    intro: "Who reaches for who, and how that sits with each of you.",
    aligned: "You agree on how initiating works between you. That agreement does quiet, steady good. Mismatched initiating is one of the things that wears couples down without either of them noticing.",
    discuss: "When it comes to leading or being pursued, you have slightly different views. One of you may assume a balance your partner does not. Try to tell each other who you expect to initiate, before the mismatch becomes a pattern.",
    different: "You see initiating differently. If you both expect to be pursued, or you both expect to lead, the mismatch can show up quickly. Try to talk about who reaches for whom, and how it feels to give and to get a no.",
    unspoken: "Neither of you said who initiates. The person who reaches and the person who waits can have very different feelings about the same moment. Try to talk about who initiates when you can.",
    oneSkipped: { lead: "{SKIPPER} chose to skip the questions about how often you want intimacy. Here is a question you can ask each other when the time feels right.", question: "How does it feel to be the one who reaches, and what should a no sound like so it does not feel like rejection?" },
    prompt: "How does it feel when you are the one to reach for me, and what do you want a no to sound like so it does not feel like rejection?",
  },
  comfort: {
    intro: "How safe and at ease each of you feels being physically close.",
    aligned: "You are at a similar place with regards to feeling safe, and you ask for similar things to get there. That shared starting point supports everything else. Try to keep asking each other what helps you feel safe, because comfort can change with stress and time.",
    discuss: "When it comes to needing time or feeling at ease quickly, you have slightly different comfort levels. One of you may need more to feel safe than your partner expects. That difference is not a problem to fix, but something useful to know about each other.",
    different: "You get comfortable at different speeds. One of you settles fast. The other needs time or the right conditions. Both reach the same closeness. Talk about what each of you needs to get there.",
    unspoken: "Neither of you answered the questions about comfort and safety. Comfort is the most personal of the six aspects. When you are ready, try to start with what helps each of you feel safe, rather than what does not.",
    oneSkipped: { lead: "{SKIPPER} chose to skip the questions about how often you want intimacy. Here is a question you can ask each other when the time feels right.", question: "What helps each of us feel safe enough to be open, and what makes us pull back?" },
    prompt: "What helps you feel safe enough to be open with me, and what makes you pull back?",
  },
  communication: {
    intro: "How openly you can talk about intimacy, during and after.",
    aligned: "You talk about intimacy in ways that fit together. Neither of you is left guessing. That is rarer than it sounds, and it is worth protecting.",
    discuss: "When it comes to talking intimacy through or showing what you want, you have slightly different views. One of you wants to talk it through, and the other would rather not analyze it. Both work. The difference only hurts when neither of you mentions it.",
    different: "You talk about intimacy in different ways. If one of you needs to say what you want out loud and the other would rather not, you can miss each other completely. Try to agree on how you will signal what you want when words are hard.",
    unspoken: "Neither of you answered the questions about talking about intimacy, and that can say something too. Try to start small by agreeing on how you will tell each other when something is or is not working.",
    oneSkipped: { lead: "{SKIPPER} chose to skip the questions about how often you want intimacy. Here is a question you can ask each other when the time feels right.", question: "How do we each want to say what we want in the moment, and does talking about it afterward help or feel like a review?" },
    prompt: "How do you want me to tell you what I want in the moment, and does talking about it afterward help you or feel like a review?",
  },
  adventure: {
    intro: "How much each of you wants novelty versus the familiar.",
    aligned: "You want a similar mix of new and familiar. You are pulling the same direction, so neither of you feels pushed or held back.",
    discuss: "When it comes to the familiar or something new, you have slightly different views. One of you leans toward trying new things, and the other leans toward what already works. That difference is easy to handle once you say it out loud, but it can be misread as rejection.",
    different: "You want very different amounts of novelty. The more adventurous one of you can read caution as disinterest, and the one who likes the familiar can read interest as pressure. Both readings may be wrong. Try to talk about why each of you wants what you want.",
    unspoken: "Neither of you answered the questions about trying new things. This topic may be lighter than it looks, and mostly comes down to how much each of you wants to be asked first.",
    oneSkipped: { lead: "{SKIPPER} chose to skip the questions about how often you want intimacy. Here is a question you can ask each other when the time feels right.", question: "How much do we each want to try new things, and how should a new idea get raised so it feels like an invitation?" },
    prompt: "How much do you want us to try new things, and how do you want me to bring up an idea so it feels like an invitation?",
  },
  meaning: {
    intro: "What physical intimacy is mostly about for each of you.",
    aligned: "Intimacy means close to the same thing to both of you. You reach for each other for the same reasons, so you tend to walk away feeling met. That is quietly powerful.",
    discuss: "You have slightly different perspectives of what intimacy is for. One of you leans toward closeness, and the other leans toward play or release. Neither is the right reason. Knowing the difference can keep you from misreading each other.",
    different: "Intimacy means different things to each of you. This difference tends to cause the most quiet friction, because you can be close and still feel like you missed each other. Telling each other what intimacy is for can change how those moments feel.",
    unspoken: "Neither of you said what intimacy is for you. That question is the deepest of the six, and often the most clarifying, because the answer may not be what either of you assumes.",
    oneSkipped: { lead: "{SKIPPER} chose to skip the questions about how often you want intimacy. Here is a question you can ask each other when the time feels right.", question: "What is intimacy mostly about for each of us, and what do we want it to mean for us?" },
    prompt: "What is intimacy mostly about for you, and what do you want it to mean for us?",
  },
};
