// Intimacy Expectations — results interpretation prose.
//
// Single source of truth for the per-dimension results copy. Imported by the
// results section (App.jsx) and the review-doc generator. SCAFFOLD COPY pending
// Carolina review.
//
// For each dimension:
//   intro    — one line on what this dimension is about (neutral)
//   aligned  — shown when partners' answers are close
//   discuss  — shown when there's a moderate gap worth a conversation
//   different— shown when answers diverge meaningfully
//   unspoken — shown when both chose "prefer not to say" across the dimension
//   prompt   — the conversation this dimension points to (always shown in the action plan)
//
// {U} = current user's name, {P} = partner's name. No end of any dimension is
// framed as better. The gap is the conversation, not a verdict.

export const INTIMACY_RESULTS_PROSE = {
  frequency: {
    intro: "How often each of you wants physical intimacy, and what that frequency means to you.",
    aligned: "You want intimacy at a similar rhythm. That removes a friction point a lot of couples never resolve. The thing to protect is what you already have: keep naming it out loud, because a shared rhythm drifts when it goes unspoken.",
    discuss: "Your ideal frequencies are somewhat apart. This is the most common gap there is, and the size of it matters less than how you talk about it. The couple who names the gap early does better than the couple who waits for it to become a grievance.",
    different: "You want intimacy at noticeably different rates. Neither rate is the right one. The work is not meeting in some mathematical middle, it's understanding what frequency means to each of you, because for one of you it may be about connection and for the other about release or reassurance.",
    unspoken: "Neither of you put a number to this. That is allowed. When you're ready, frequency is the easiest of these to talk about because it's concrete, and naming it tends to lower the pressure rather than raise it.",
    prompt: "Talk about what frequency means to each of you, not just the number. One of you may read it as a measure of closeness. Decide what a normal week looks like, and what you each do when you want different things.",
  },
  initiating: {
    intro: "Who tends to initiate, and how each of you feels about that balance.",
    aligned: "You see initiating the same way. You either both expect a shared role or you agree on who leads, and you're both comfortable with it. That agreement is worth more than it looks, because mismatched initiating expectations quietly wear couples down.",
    discuss: "Your expectations about initiating are somewhat apart. Often one person assumes a balance the other doesn't. Worth surfacing before it becomes a pattern where one of you always reaches and the other never has to.",
    different: "You expect initiating to work differently. If you both expect to be pursued, or you both expect to lead, that collision shows up fast. Name it directly: decide what initiating looks like for you, and what a no feels like to give and to receive.",
    unspoken: "Neither of you named who initiates. When you're ready, this one is worth it, because the person who initiates and the person who waits often carry very different feelings about the same moments.",
    prompt: "Talk about who reaches for who, and how that feels from both sides. The one who initiates more may feel exposed. The one who initiates less may not know they're being waited on.",
  },
  comfort: {
    intro: "How safe and at ease each of you feels being physically vulnerable.",
    aligned: "You're at similar levels of comfort being vulnerable, and you ask for similar things to feel safe. That shared baseline is the foundation everything else sits on. Keep checking in, because comfort isn't fixed, it moves with stress and season.",
    discuss: "Your comfort levels are somewhat apart. One of you may need more to feel safe than the other expects to give. This isn't a problem to fix, it's information: knowing what helps each of you feel safe is most of the work.",
    different: "You approach physical vulnerability differently. One of you is at ease quickly, the other needs time or specific conditions. Neither is more or less capable of closeness. The gap is about pace and what safety requires, and it's worth real conversation.",
    unspoken: "Neither of you spoke to this. That's understandable, it's the most personal of the six. When you're ready, start with what helps each of you feel safe rather than what doesn't.",
    prompt: "Talk about what each of you needs to feel safe enough to be open, and what makes you pull back. Name the conditions, not just the feelings.",
  },
  communication: {
    intro: "How openly you can talk about intimacy, in the moment and afterward.",
    aligned: "You communicate about intimacy in compatible ways. Whether you both prefer words or both prefer to show rather than tell, you're not leaving the other guessing. That's rarer than it sounds, and it's a real asset.",
    discuss: "Your styles for talking about intimacy are somewhat apart. One of you may want to talk it through while the other would rather not analyze it. Both are workable, but the gap can leave one of you feeling unheard if it goes unnamed.",
    different: "You talk about intimacy very differently. If one of you needs to say it and the other needs to not, you can end up missing each other entirely. The fix is not making one of you change, it's agreeing on how you'll signal what you want when words are hard.",
    unspoken: "Neither of you answered here, which is its own quiet answer. When you're ready, the lowest-stakes start is agreeing on how you'll let each other know something is or isn't working, without it having to be a whole conversation.",
    prompt: "Talk about how you each prefer to communicate about intimacy. Decide on a low-pressure way to say what you want in the moment, and whether talking afterward helps or feels like a performance review.",
  },
  adventure: {
    intro: "How much each of you wants novelty versus the comfort of the familiar.",
    aligned: "You want a similar balance of novelty and routine. Whether you both crave variety or both prefer what works, you're pulling in the same direction, which means less negotiation and less of one of you feeling pushed or held back.",
    discuss: "Your appetites for novelty are somewhat apart. One of you leans toward trying new things, the other toward the familiar. This is easy to navigate once it's named, and easy to misread as rejection when it isn't.",
    different: "You want very different amounts of novelty. The adventurous one can read the other's caution as disinterest. The one who prefers the familiar can read the other's appetite as pressure. Both readings are usually wrong. Talk about the why under the preference.",
    unspoken: "Neither of you spoke to this. When you're ready, it's a lighter conversation than it seems: it's less about specific things and more about how much either of you wants to be asked.",
    prompt: "Talk about how much novelty each of you actually wants, and how a new idea should be raised so it lands as an invitation rather than a demand or a verdict.",
  },
  meaning: {
    intro: "What physical intimacy is primarily for, for each of you.",
    aligned: "Intimacy means similar things to both of you. When you reach for each other, you're reaching for the same thing, which means you tend to leave those moments feeling met rather than missing each other. That alignment is quietly powerful.",
    discuss: "What intimacy is for differs somewhat between you. One of you may lean toward emotional closeness, the other toward play or release. Neither is the right reason. Knowing the difference keeps you from misreading each other in the moments that matter most.",
    different: "Intimacy means notably different things to each of you. This is the gap that drives the most quiet friction, because you can be physically close and still feel like you missed each other. It's also the most worth talking about, since naming it changes how those moments land.",
    unspoken: "Neither of you named what intimacy is for you. When you're ready, this is the deepest of the six and often the most clarifying, because the answer is rarely what either partner assumes.",
    prompt: "Talk about what intimacy is mainly about for each of you, and what each of you wants it to mean in your marriage. Pay attention to where your two answers differ, that's where the real conversation is.",
  },
};
