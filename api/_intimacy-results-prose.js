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
//   prompt   — a question one partner can read aloud to the other ("Talk about it:")
//   oneSkipped — { lead, question } shown when ONE partner skipped the whole
//                dimension (the other answered). {SKIPPER} = the partner who
//                skipped. For these couples the separate prompt tile is hidden.
//
// {U} = current user's name, {P} = partner's name. Neither end of any
// dimension is better. The gap is the conversation.

export const INTIMACY_RESULTS_PROSE = {
  frequency: {
    intro: "How often each of you wants physical intimacy.",
    aligned: "You want intimacy about as often as each other. That is one less thing to negotiate. Keep saying it out loud anyway. Frequency that goes unspoken tends to drift.",
    discuss: "Your ideal frequencies sit a little apart. This is the most common gap there is. What matters is naming it early, before it turns into a tally.",
    different: "You want intimacy at different rates. Neither rate is the correct one. The point is not to land on a number. It is to understand what intimacy gives each of you.",
    unspoken: "Neither of you put a number to this. That is fine. Frequency is the easiest of these to talk about, because it is concrete.",
    oneSkipped: { lead: "{SKIPPER} chose to skip this one. Here is a way to come at it together when the time feels right.", question: "How often feels right to each of us, and what do we want to do on the nights we want different things?" },
    prompt: "How often feels right to you, and what do you want us to do on the nights we want different things?",
  },
  initiating: {
    intro: "Who reaches for who, and how that sits with each of you.",
    aligned: "You agree on how initiating works between you. That agreement does quiet, steady good. Mismatched initiating is one of the things that wears couples down without either of them noticing.",
    discuss: "Your expectations about initiating sit a little apart. Usually one person assumes a balance the other does not. Name it before it becomes a pattern.",
    different: "You see initiating differently. If you both expect to be pursued, or you both expect to lead, that shows up fast. Talk about who reaches, and what a no feels like to give and to get.",
    unspoken: "Neither of you said who initiates. The person who reaches and the person who waits often carry very different feelings about the same moment. Worth getting to when you can.",
    oneSkipped: { lead: "{SKIPPER} chose to skip this one. Here is a way to come at it together when the time feels right.", question: "How does it feel to be the one who reaches, and what should a no sound like so it does not feel like rejection?" },
    prompt: "How does it feel when you are the one to reach for me, and what do you want a no to sound like so it does not feel like rejection?",
  },
  comfort: {
    intro: "How safe and at ease each of you feels being physically close.",
    aligned: "You are at a similar place with feeling safe, and you ask for similar things to get there. That shared baseline holds everything else up. Keep checking in. Comfort moves with stress and time.",
    discuss: "Your comfort levels sit a little apart. One of you may need more to feel safe than the other expects. That is not a problem to fix. It is information to use.",
    different: "You get comfortable at different speeds. One of you settles fast. The other needs time or the right conditions. Both reach the same closeness. Talk about what each of you needs to get there.",
    unspoken: "Neither of you spoke to this. It is the most personal of the six. When you are ready, start with what helps each of you feel safe, not what does not.",
    oneSkipped: { lead: "{SKIPPER} chose to skip this one. Here is a way to come at it together when the time feels right.", question: "What helps each of us feel safe enough to be open, and what makes us pull back?" },
    prompt: "What helps you feel safe enough to be open with me, and what makes you pull back?",
  },
  communication: {
    intro: "How openly you can talk about intimacy, during and after.",
    aligned: "You talk about intimacy in ways that fit together. Neither of you is left guessing. That is rarer than it sounds, and it is worth protecting.",
    discuss: "Your styles sit a little apart. One of you wants to talk it through. The other would rather not pick it apart. Both work. The gap only hurts if it stays unnamed.",
    different: "You talk about intimacy in different ways. If one of you needs to say it and the other needs to not, you can miss each other completely. Agree on how you will signal what you want when words are hard.",
    unspoken: "Neither of you answered here. That is its own quiet answer. Start small: agree on how you will tell each other when something is or is not working.",
    oneSkipped: { lead: "{SKIPPER} chose to skip this one. Here is a way to come at it together when the time feels right.", question: "How do we each want to say what we want in the moment, and does talking about it afterward help or feel like a review?" },
    prompt: "How do you want me to tell you what I want in the moment, and does talking about it afterward help you or feel like a review?",
  },
  adventure: {
    intro: "How much each of you wants novelty versus the familiar.",
    aligned: "You want a similar mix of new and familiar. You are pulling the same direction, so neither of you feels pushed or held back.",
    discuss: "Your appetites for novelty sit a little apart. One of you leans toward trying things. The other leans toward what already works. Easy to handle once it is named. Easy to misread as rejection when it is not.",
    different: "You want very different amounts of novelty. The adventurous one can read caution as disinterest. The one who likes the familiar can read appetite as pressure. Both readings are usually wrong. Talk about the why under it.",
    unspoken: "Neither of you spoke to this. It is lighter than it looks. Most of it is about how much each of you wants to be asked.",
    oneSkipped: { lead: "{SKIPPER} chose to skip this one. Here is a way to come at it together when the time feels right.", question: "How much do we each want to try new things, and how should a new idea get raised so it feels like an invitation?" },
    prompt: "How much do you want us to try new things, and how do you want me to bring up an idea so it feels like an invitation?",
  },
  meaning: {
    intro: "What physical intimacy is mostly about for each of you.",
    aligned: "Intimacy means close to the same thing to both of you. You reach for each other for the same reasons, so you tend to walk away feeling met. That is quietly powerful.",
    discuss: "What intimacy is for sits a little apart between you. One of you leans toward closeness. The other toward play or release. Neither is the right reason. Knowing the difference keeps you from misreading each other.",
    different: "Intimacy means different things to each of you. This is the gap that drives the most quiet friction. You can be close and still feel like you missed each other. Naming it changes how those moments land.",
    unspoken: "Neither of you named what intimacy is for you. It is the deepest of the six, and often the most clarifying. The answer is rarely what either partner assumes.",
    oneSkipped: { lead: "{SKIPPER} chose to skip this one. Here is a way to come at it together when the time feels right.", question: "What is intimacy mostly about for each of us, and what do we want it to mean for us?" },
    prompt: "What is intimacy mostly about for you, and what do you want it to mean for us?",
  },
};
