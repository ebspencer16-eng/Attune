// api/_workbook-content.js
// Shared content for the personalized workbook generator.
// Underscore prefix = not an API route (Vercel ignores it).

export const DIMS = ['energy','expression','needs','bids','conflict','repair','closeness','love','stress','feedback'];

export const DIM_META = {
  energy:     { label: 'Energy & Recharge',           left: 'Inward',         right: 'Outward',          color: '9B5DE5' },
  expression: { label: 'Emotional Expression',         left: 'Guarded',        right: 'Expressive',       color: 'E8673A' },
  needs:      { label: 'How You Ask for Needs',        left: 'Direct',         right: 'Indirect',         color: '1B5FE8' },
  bids:       { label: 'Responding to Bids',           left: 'Reserved',       right: 'Attuned',          color: '10B981' },
  conflict:   { label: 'Conflict Style',               left: 'Engage quickly', right: 'Needs space first', color: '1B5FE8' },
  repair:     { label: 'How You Repair',               left: 'Formal / verbal', right: 'Informal / warmth', color: 'E8673A' },
  closeness:  { label: 'Closeness & Independence',     left: 'Autonomous',     right: 'Close-seeking',    color: '9B5DE5' },
  love:       { label: 'How Love Lands',               left: 'Words',          right: 'Actions & Presence', color: '10B981' },
  stress:     { label: 'Communication Under Stress',   left: 'Withdraw',       right: 'Seek connection',  color: '1B5FE8' },
  feedback:   { label: 'Giving & Receiving Feedback',  left: 'Guarded',        right: 'Open',             color: 'E8673A' },
};

// Returns dimension-level close/gap text and a weekly practice.
// All strings support {U} and {P} substitution (caller handles).
export const DIM_CONTENT = {
  energy: {
    measures: 'How each of you recovers, socially, emotionally, physically. Inward: solitude recharges. Outward: connection recharges. This shapes your weekend default, how you decompress, and what a good evening looks like.',
    closeText: '{U} and {P} recover in similar ways. This quietly removes friction, you\'re rarely on opposite ends after a hard week.',
    gapText: 'One of you recharges through solitude; the other through connection. After a long week, you\'re in very different places. Without a framework, the inward partner\'s need for quiet can read as withdrawal, and the outward partner\'s reach for people can feel exhausting.',
    prompts: [
      'After a big social event, what does each of you need in the next 24 hours?',
      'When does one of you feel most energized, and when does the other feel most depleted?',
      'Is your current daily rhythm giving each person the kind of recovery they need?',
      'Is there anything either of you has been asking of the other that runs against their recharge style?',
    ],
    thisWeek: 'Pick one upcoming situation likely to produce different energy states, a party, a family visit, a busy week. Before it happens, name what you\'ll each need afterward. Then check in.',
  },
  expression: {
    measures: 'How freely each of you shares what\'s going on internally, not the content of feelings, but how naturally they surface. Expressive partners wear their emotional state; guarded partners process privately and share selectively.',
    closeText: '{U} and {P} are operating in the same register. Neither tends to feel overwhelmed by too much sharing or starved by too little.',
    gapText: 'One of you shares as feelings arise; the other waits until they\'ve processed. The expressive partner may experience the guarded one\'s silence as emotional unavailability. The guarded partner may experience the expressive one\'s openness as pressure.',
    prompts: [
      'When something bothers you, at what point do you typically share it, immediately, after processing, or only when asked?',
      'When one of you is struggling, does the other know? Or is it usually carried privately?',
      'Is there a version of your emotional experience you share, and a version you hold back?',
      'What would feel different if either of you shared more, or less?',
    ],
    thisWeek: 'Each of you shares one thing you\'d normally hold back or let pass, not something big, just something that\'s been sitting there. Notice what happens.',
  },
  needs: {
    measures: 'How directly each partner communicates needs, whether they ask outright or signal indirectly. Direct communicators state needs explicitly. Indirect communicators hint, hope to be noticed, or pull back.',
    closeText: '{U} and {P} communicate needs with similar directness. There are fewer unspoken expectations, and less of the resentment that builds when needs go unnamed.',
    gapText: 'One of you asks directly; the other signals. The direct partner may feel set up to fail, they can\'t respond to what they can\'t see. The indirect partner may feel chronically unseen. This is one of the most common sources of quiet resentment in long-term relationships.',
    prompts: [
      'Think of the last time you needed something and didn\'t get it. Did you ask directly, or did you signal?',
      'Is there something you\'ve needed for a while that you haven\'t said clearly? What\'s the barrier?',
      'Do you each know what the other needs right now? Has it been said, or are you guessing?',
      'What would make it easier for each of you to ask more directly?',
    ],
    thisWeek: 'Each of you names one thing you need from the other this week, specifically, without softening. "I need you to ___." Notice what it feels like to ask that clearly.',
  },
  bids: {
    measures: 'How reliably each partner notices and responds to small, everyday bids for connection, a comment, a gesture, a look. These micro-moments are the primary currency of sustained intimacy in long-term relationships.',
    closeText: '{U} and {P} both notice and respond naturally to each other\'s small bids. This is one of the strongest predictors of relationship satisfaction over time.',
    gapText: 'One partner tends to miss bids, absorbed in tasks, not naturally tracking the relational current. The other tracks them instinctively. Repeated missed bids can feel like dismissal even when none is intended.',
    prompts: [
      'Can you think of a recent moment when one of you reached for connection and the other wasn\'t available?',
      'Are there ways either of you reaches for the other that get regularly missed, not out of rejection, but out of being absorbed?',
      'What\'s the smallest thing each of you does that signals you want the other\'s attention?',
      'What would it look like to be slightly more tuned in, without it feeling performative?',
    ],
    thisWeek: 'Once a day this week, when one of you makes a small bid, says something minor, reaches out physically, checks in, the other stops what they\'re doing and acknowledges it specifically. Actually engage for 30 seconds.',
  },
  conflict: {
    measures: 'How each partner responds when something feels wrong, whether the instinct is to engage immediately or need space first. This is about timing, not care. Both instincts are legitimate; misread, they create one of the most persistent loops in relationships.',
    closeText: '{U} and {P} move toward resolution with similar timing. This symmetry removes the most common friction point in conflict, the pursuer-withdrawer dynamic.',
    gapText: 'One of you needs to address things immediately; the other needs space first. Without a framework, the person who needs resolution reads the other\'s silence as avoidance. The person who needs space reads the other\'s urgency as pressure. Both are behaving in ways that feel self-evidently correct, which is why this pattern is so persistent without an explicit agreement.',
    prompts: [
      'When something is bothering you, what does your ideal next few hours look like?',
      'When one of you is clearly upset and pulls back, what does that feel like for the other? What does the other do?',
      'Is there a version of "I need space" that lands differently than open-ended silence?',
      'What agreement would make the next hard moment go better than the last?',
    ],
    thisWeek: 'When things are calm, not during conflict, tell each other: "When I\'m upset, what I need first is ___." Write it down. Refer to it next time.',
  },
  repair: {
    measures: 'What each partner needs to feel genuinely repaired after conflict. One end needs explicit verbal acknowledgment, the words, the conversation, the closure. The other can move forward once the warmth is back, without needing the formal exchange.',
    closeText: '{U} and {P} both know what "okay again" feels like and reach it in similar ways. This shortens the distance between conflict and repair.',
    gapText: 'One of you considers things resolved when warmth returns. The other isn\'t repaired until there\'s been an explicit conversation. The informal partner often considers things over before the formal partner is ready, which means the formal partner is repeatedly left unrepaired, while the informal one is confused by what still feels open.',
    prompts: [
      'After a hard argument, what does "okay again" actually feel like for you? How do you know when you\'re there?',
      'Is there a version of your last unresolved argument where one of you thought it was resolved and the other didn\'t?',
      'What would a repair conversation look like that actually works for both of you?',
      'Is there a past disagreement that never fully closed? What would it take to finish it?',
    ],
    thisWeek: 'After the next friction moment, however small, check in explicitly: "Are we actually okay, or are we both just ready to be done?" Name the difference out loud.',
  },
  closeness: {
    measures: 'How much independent structure each partner needs within the relationship, separate pursuits, solo time, individual social lives. One end values deep togetherness; the other values a strong sense of self within the partnership.',
    closeText: '{U} and {P} want a similar balance of togetherness and independence. This prevents the slow accumulation of resentment that mismatched closeness needs create.',
    gapText: 'One of you gravitates toward maximum togetherness as the foundation of closeness. The other needs a strong independent life within the relationship. The autonomous partner may feel crowded; the close-seeking partner may feel lonely. Neither is making a statement about the relationship, they\'re operating from different blueprints for what closeness looks like.',
    prompts: [
      'On a typical week, is each of you getting the amount of alone time and together time you need?',
      'Are there independent pursuits, hobbies, friendships, routines, that feel important to each of you? Are they supported?',
      'When one of you wants more space, how do you navigate that without it feeling like rejection?',
      'What would your ideal weekly rhythm look like if you designed it intentionally?',
    ],
    thisWeek: 'Each of you writes down your ideal week, how much time together, how much apart. Compare them without judgment. Look for the gap and the overlap.',
  },
  love: {
    measures: 'How each partner most naturally gives and receives affection. Specifically: does verbal expression land most deeply, or does love register more through presence, action, and shared experience?',
    closeText: '{U} and {P} express and receive love through compatible channels. When care is expressed in a language the other naturally receives, the signal lands without translation.',
    gapText: 'One of you feels most loved through verbal affirmation; the other through presence, touch, or shared activity. Both may be genuinely expressing love, but in a language the other doesn\'t fully receive. Care is being offered but not landing, and both people can feel quietly undersatisfied without knowing why.',
    prompts: [
      'When did each of you last feel genuinely loved by the other? What was happening?',
      'What does each of you do that makes the other feel most cared for, even if it\'s something small?',
      'Is there something you\'d like more of that you haven\'t said clearly?',
      'Do you each know specifically how to make the other feel appreciated?',
    ],
    thisWeek: 'Each of you asks the other: "What\'s one thing I do that makes you feel really loved that I might not realize has that effect?" Then do more of it.',
  },
  stress: {
    measures: 'How each partner\'s communication style shifts when they\'re overwhelmed, anxious, or depleted. Some people shut down; others become more urgent and seek reassurance. Neither is a statement about the relationship, it\'s a stress response.',
    closeText: '{U} and {P} respond to stress in similar ways. This symmetry means neither partner is likely to be left alone in the way that matters most when pressure builds.',
    gapText: 'Under pressure, one of you shuts down; the other becomes more urgent and reaches for closeness. Without language for this, the seeking partner reads withdrawal as rejection; the withdrawing partner reads urgency as escalation. Both are in stress response, and making each other worse.',
    prompts: [
      'When either of you is really under pressure, what do you need from the other? Does the other know?',
      'How does each of you know when the other is struggling, even when they\'re not saying so?',
      'Have you ever been in a moment where you were both stressed and made it worse for each other?',
      'What\'s the most helpful thing someone can do when you\'re at your worst?',
    ],
    thisWeek: 'Next time one of you is clearly under pressure, the other asks: "Do you need me to help fix something, or do you just need me to be here?" Notice which answer comes back. Do that.',
  },
  feedback: {
    measures: 'How comfortably each partner gives and receives direct, honest feedback. Guarded partners tend toward defensiveness. Open partners can engage with critical input without feeling attacked, and tend to surface concerns more readily.',
    closeText: '{U} and {P} are in a similar place on feedback. This creates a low-friction environment for honest conversations, things that need to be said, get said.',
    gapText: 'One of you avoids direct feedback; the other can engage with it. The open partner may feel like things go unsaid for too long. The guarded partner may feel like honest observations come as attacks, even when not intended that way. Important things compound in silence.',
    prompts: [
      'Is there something either of you does regularly that bothers the other that hasn\'t been said clearly? What\'s the barrier?',
      'When one of you offers a critical observation, what\'s the other\'s first instinct?',
      'Can each of you tell the other when something isn\'t working without it becoming a bigger thing than it needs to be?',
      'What would make honest feedback easier in both directions?',
    ],
    thisWeek: 'Identify one small thing that bothered you recently that you let go without saying anything. Bring it up briefly, specifically: "Hey, this thing last week, can I mention it?" Notice what happens.',
  },
};

// Expectations domain definitions
export const EXP_DOMAINS = [
  {
    key: 'household',
    label: 'Visible Household Labor',
    left: 'Partner A handles more', right: 'Shared / Partner B handles more',
    closeText: 'Your expectations about household responsibility are broadly aligned. You\'ve probably arrived at a division of labor that feels fair and chosen.',
    gapText: 'Your expectations diverge on who should handle specific aspects of household life. These gaps tend to calcify into default roles, not because anyone chose them, but because one person stepped in and the other let them.',
    thisWeek: 'Separately, list the household tasks you currently own, the ones you think the other owns, and the ones falling through the cracks. Compare the lists without judgment.',
  },
  {
    key: 'emotional',
    label: 'Emotional & Invisible Labor',
    left: 'Partner A carries more', right: 'Shared / Partner B carries more',
    closeText: 'You have a relatively balanced distribution of the invisible work, the remembering, anticipating, tracking.',
    gapText: 'One of you is carrying significantly more of the invisible labor. This work tends to be both unacknowledged and unreciprocated, not out of malice but genuine unawareness.',
    thisWeek: 'For one week, the partner who typically carries more mental load keeps a simple log, every act of invisible labor they perform. At the end of the week, share it. Don\'t frame it as an accusation. Just show what\'s there.',
  },
  {
    key: 'financial',
    label: 'Financial & Money',
    left: 'Separate / save-first', right: 'Combined / spend-forward',
    closeText: 'Your financial orientations are broadly compatible. You\'re probably aligned on the big structural questions, how money is held, how decisions get made.',
    gapText: 'Your instincts about money, how to hold it, how to use it, how much risk to take, are in different places. Money fights are rarely about money; they\'re about values, security, freedom, and control.',
    thisWeek: 'Each of you answers: "The financial situation that would make me feel most secure is ___." Share them. Don\'t solve, just understand where each person\'s sense of security lives.',
  },
  {
    key: 'career',
    label: 'Career',
    left: 'Partner A\'s career leads', right: 'Balanced / Partner B leads',
    closeText: 'You have a broadly shared understanding of how career fits into your life together, who leads, who adjusts, what the arrangement costs each of you.',
    gapText: 'There\'s unclarity, spoken or unspoken, about whose career leads, who absorbs sacrifice when required, and what each person has traded for the other\'s professional life.',
    thisWeek: 'Each of you answers: "The career outcome I most want in the next five years is ___, and the cost I\'m willing to accept is ___." Share them.',
  },
  {
    key: 'children',
    label: 'Children & Family',
    left: 'Not central / uncertain', right: 'Important / central',
    closeText: 'You\'re broadly aligned on the role children and family play in your picture, whether eager, settled that they\'re not part of the plan, or genuinely open.',
    gapText: 'Your pictures diverge in some meaningful way on children or family. This can range from fundamental disagreement to meaningful difference in timing or approach. These conversations are among the most important, and most avoided.',
    thisWeek: 'Write down, separately, then share, one sentence about what you want your family life to look like in five years. Don\'t edit for what you think the other wants to hear.',
  },
  {
    key: 'lifestyle',
    label: 'Home & Lifestyle',
    left: 'Quiet / structured', right: 'Active / flexible',
    closeText: 'Your visions of home life are broadly aligned. You probably agree naturally on social calendar density, pace of life, and what the right week looks like.',
    gapText: 'You picture your shared life differently, how full the calendar is, how structured the day, how social the home. These differences rarely surface in early stages but accumulate once you\'re fully sharing space.',
    thisWeek: 'Each of you describes your ideal month in terms of pace, social load, and home feeling. Compare them. Where is there a gap that\'s been going unaddressed?',
  },
  {
    key: 'values',
    label: 'Faith & Values',
    left: 'Personal / private', right: 'Central / shared',
    closeText: 'You\'re broadly aligned on the role faith or values play in your shared life. This creates a quiet coherence in how you make decisions and mark milestones.',
    gapText: 'One partner\'s faith or values are more central to their daily life than the other\'s. This can surface unexpectedly: in raising children, marking milestones, what community you want around you.',
    thisWeek: 'Each of you shares one value or belief that feels central to how you live, but that you\'re not sure the other fully knows about. Don\'t ask the other to reciprocate, just offer it.',
  },
];

// ── "When this shows up" — couple-type-specific prose ─────────────────────
// Shown on each communication dimension page, above the commitment write-in.
// Present-tense, second-person, 2-3 sentences. Written as advice you'd flip
// to during a real moment — no hedging, no clinical framing.
//
// Structure: WHEN_THIS_SHOWS_UP[dim][coupleTypeId] = prose string
//
// If a specific couple-type entry is missing, the generator falls back to
// the WW entry for that dimension. Energy & Recharge is fully drafted
// across all 10 types as the reference example; other dimensions currently
// use the WW version as placeholder and need per-type prose written.
export const WHEN_THIS_SHOWS_UP = {
  energy: {
    WW: "You'll feel it on Sunday nights and after social weekends. You both want connection to refill the tank, which means you rarely need to decompress alone, but you can both miss the signal that one of you is actually drained. When the house has been full for days, check in before making more plans.",
    XX: "You'll feel it after busy stretches when neither of you has said anything about being tired. You both recover by doing, not talking, so exhaustion builds quietly. Name the drain before it turns into irritability. A protected evening, not a big conversation.",
    YY: "You'll feel it after anything that required social output, dinners with friends, family visits, work events. Both of you need real recovery time and neither should feel guilty taking it. Protect the next morning; don't pack it with anything that asks for more of you.",
    ZZ: "You'll feel it when one of you is internally depleted and the other can't tell. Neither of you broadcasts the drain easily. The repair is a literal statement: 'I'm running low today.' No elaboration required. The other person takes it at face value.",
    WX: "You'll feel it when the W wants to debrief the weekend and the X is done talking. One of you recharges by processing out loud; the other by going quiet. Both are valid recovery modes. Don't try to convert each other. Stagger the debrief: the W can talk to a friend; the X gets an hour alone.",
    WY: "You'll feel it on the way home from anything social. The W is warmed up; the Y is about to crash. The answer isn't to stop going places together, it's to protect the landing. Quiet first, then reconnection, then the recap if either of you wants one.",
    WZ: "You'll feel it most after social events. The W wants to talk about it; the Z wants total silence. This is the place where missed bids happen most often. The W can share the highlight and then stop. The Z can offer one sentence later, after real quiet.",
    XY: "You'll feel it when one of you is ready to move on and the other is still processing. The X is already past it; the Y still needs to let it settle. This isn't avoidance or dragging, it's different recovery clocks. Name the clock difference out loud instead of assuming the other is being difficult.",
    XZ: "You'll feel it when the house is quiet but neither of you knows how the other is doing. Both of you recover internally. That's efficient, but it can tip into isolation. Once a week, a specific question: 'how are you actually, underneath.' Not every day. Just enough to stay connected.",
    YZ: "You'll feel it when you both go quiet after a hard stretch and neither moves first. Both of you need space, and both of you can wait the other out. Agree in advance who comes back first after conflict or stress. The other person won't feel like they're being pursued.",
  },

  // ── Placeholder: remaining 11 dimensions use WW-style prose as a
  // single generic block until per-couple-type prose is written.
  // When drafted, each should get a parallel 10-type object like energy above.
  expression: {
    WW: "You'll feel it on Sunday evenings after a full week, or during a stretch where neither of you has quite enough bandwidth. You're both expressive, so silence between you is information. When one of you has been quieter than usual, name it out loud instead of waiting to see if it clears on its own.",
    XX: "You'll feel it when something's sitting with one of you and neither knows how to bring it up. You both process internally, which means a lot can accumulate before anything gets said. Set a low-stakes weekly check-in where each of you names one thing you've been carrying. No fix required, just put it in the room.",
    YY: "You'll feel it when one of you is processing something quietly and the other senses it but doesn't know where to begin. You both share once you've had time, so jumping to 'what's wrong' lands badly. A walk or a car ride is the container; the conversation arrives inside it, not before.",
    ZZ: "You'll feel it when neither of you has said anything real in days and it starts to feel like roommates. Both of you hold things privately; that's the default. Once a week, one of you asks a direct question that requires a direct answer. 'What's the thing you haven't told me yet?' Expect it to feel slightly clunky. Do it anyway.",
    WX: "You'll feel it when one of you wants to talk through feelings and the other is ready to move on. The W needs to externalize; the X needs to process privately first. Neither is wrong. Give the W a short window to share; give the X room to respond later if they need to.",
    WY: "You'll feel it when the W is ready to share in the moment and the Y needs more time. The W shouldn't pull back their instinct to name things, but they can add the phrase 'no need to respond right now', that gives the Y permission to receive without having to match the tempo.",
    WZ: "You'll feel it most when the W is feeling something strongly and the Z has gone quiet. The W reads the quiet as distance; the Z is just processing. Name the pattern out loud before it turns into a loop. 'I know you're still with me; I just need to hear it sometimes.'",
    XY: "You'll feel it when one of you is clearly sitting with something and the other is trying to figure out how to ask. The X wants to name it concretely; the Y wants emotional space to surface first. Try: name the observation, not the feeling. 'You've been quiet since Tuesday' lands better than 'what's wrong.'",
    XZ: "You'll feel it when something's off and neither of you is going to bring it up first. Both of you default to holding. The move is to schedule a specific time, not 'we should talk soon,' but 'Sunday at 4.' The structure makes the conversation possible when nothing else will.",
    YZ: "You'll feel it when both of you go quiet after a long week and neither is sure if something's actually wrong or you're just tired. Both of you need time to surface. Assume nothing is wrong unless someone says so; check in after two days if the quiet doesn't break on its own.",
  },
  needs: {
    WW: "You'll feel it when a need goes unsaid and surfaces later as frustration. You both default to hoping the other will notice, then resenting it when they don't. The move is to ask directly, once, even when it feels clunky. Hints are not a contract.",
    XX: "You'll feel it when both of you are stretched thin and neither is asking for help. You both tend to handle it privately rather than add to the other's load. That's generous, and it's also how you both end up depleted. Ask for the small thing before it becomes a big thing.",
    YY: "You'll feel it when a need has been there for days and neither of you has named it. You both need time to figure out what you actually want before asking, which means the ask often comes late. Trust that 'I think I need X, not sure yet' is a valid way to start the conversation.",
    ZZ: "You'll feel it when one of you is carrying a need silently and the other can't tell. Neither of you broadcasts. The repair is a specific weekly question from one partner to the other: 'Is there anything you need that I'm not giving you?' Expect the answer to take time. Ask anyway.",
    WX: "You'll feel it when the W asks clearly and the X responds efficiently, and then the X has a need they haven't mentioned. The W gets direct asks; the X often doesn't get one in return. The W can ask: 'Is there anything you need that you haven't named.' Watch for the pause before the answer.",
    WY: "You'll feel it when the W asks for what they need and the Y quietly sets their own needs aside. The Y tends to absorb. Build a rule: every ask gets a counter-check. 'What do you need this week' before the Y even mentions it.",
    WZ: "You'll feel it when the W asks for closeness or time and the Z hasn't yet realized they need the opposite. The W will ask directly; the Z usually won't. Create a reliable moment. Sunday dinner, a weeknight ritual, where the Z is explicitly asked what they need for the week ahead.",
    XY: "You'll feel it when the X names a need practically and the Y has a need they haven't fully articulated yet. The X may read the Y's hesitation as 'no real need'; that's often wrong. Give the Y 24 hours to come back with a clearer ask, and actually follow up.",
    XZ: "You'll feel it when neither of you is asking for anything and both of you have needs. You both hold. The fix is explicit: a scheduled check-in where each of you names one thing, even if it's small. 'I'd like a quiet night Thursday.' Normalize the low-stakes ask.",
    YZ: "You'll feel it when one of you is running low and neither has named it. Both of you tend to wait until the need is obvious. The move is to ask before it's obvious: 'How's your tank this week' as a standing question. The Z may need a beat to answer. That's fine.",
  },
  bids: {
    WW: "You'll feel it in small moments, a comment, a hand on the shoulder, someone reaching for attention. You're both usually good at catching these, but a missed bid stings more when it comes from someone who usually catches them. When you notice you've missed one, circle back. Don't let it quietly stack.",
    XX: "You'll feel it when one of you reaches with something small and practical, a shared task, a look across the room, and the other is head-down on something. You both express bids through action rather than words. Learn each other's versions. A 'want help with this' is often the bid.",
    YY: "You'll feel it when a soft bid goes unreceived and neither of you quite notices. Your bids tend to be gentle, a song they liked, a comment about the weekend. Easy to miss, easy to under-weight. Match the register. A soft return is the right answer to a soft bid.",
    ZZ: "You'll feel it when one of you extends the smallest possible gesture and the other misses it entirely. Z-type bids are the quietest of any pairing, a hand brushed, a book left on the counter. If you miss one, they typically won't try again that day. Watch for the small things.",
    WX: "You'll feel it when the W makes a big warm bid and the X responds practically instead of emotionally. Both are real responses; they land differently. The W can name what kind of response they'd like; the X can hold a beat longer on the warmth side before moving to logistics.",
    WY: "You'll feel it when the W reaches warmly and the Y receives it but takes a beat to return it. The delay is recovery time, not distance. The W can wait. The Y can offer a small nod, a squeeze, a look, to mark that the bid landed, even if the response comes later.",
    WZ: "You'll feel it when the W bids bigger and more often and the Z bids rarely but meaningfully. Both of you will feel out of sync if you measure by frequency. Measure by weight. A Z's one bid may carry as much intention as five of the W's.",
    XY: "You'll feel it when the X makes a practical bid and the Y receives it emotionally, or vice versa. Both of you are on different registers. Learn the translation, for the X, a Y's emotional check-in IS the bid; for the Y, the X's offer to help IS the bid. Don't require them to match.",
    XZ: "You'll feel it when one of you bids and the other receives it without acknowledging it. Both of you tend to take quiet bids at face value without naming them. That's fine most of the time. Every so often, mark it out loud. 'Thanks for bringing me coffee' reinforces the pattern.",
    YZ: "You'll feel it when the Y extends a soft bid and the Z is still in their own processing. Neither is pushy, which means bids can evaporate. Build a small daily ritual, a check-in at dinner, a walk, that creates a reliable window for bids to land.",
  },
  conflict: {
    WW: "You'll feel it the minute tension starts. Both of you want to address it now, which is mostly a strength, except when 'now' means neither of you is regulated. Before going into it, one of you names the temperature: 'I'm heated, give me ten minutes.' Then return on time.",
    XX: "You'll feel it when a disagreement stays logical even though the stakes are emotional. You both want to resolve it efficiently, which works for most things. For the harder stuff, one of you has to name the emotional layer explicitly, 'this one's not just logistics for me.'",
    YY: "You'll feel it when tension arrives and both of you move away from it. Neither of you wants to engage in the heat; you both need distance first. That's valid, and it means someone has to come back. Agree in advance: 24 hours max before one of you re-opens it.",
    ZZ: "You'll feel it when a disagreement has been unsaid for days because neither of you wanted to bring it up. Both of you would rather let it sit than press. That works until it doesn't. The fix is a scheduled time to revisit anything either of you noticed. Not 'is there an issue,' but 'here's the thing I noticed.'",
    WX: "You'll feel it when the W wants to surface feelings in the heat and the X wants to solve the problem logically. Both impulses are real. Split it: name the feeling first, then the thing to solve. Neither gets skipped, neither takes over the whole conversation.",
    WY: "You'll feel it when the W is ready to engage and the Y is already at capacity. 'Let's talk about it' reads very differently to each of you. Agree on a pause protocol ahead of time: when one of you needs space, the pause has a time-stamp. Come back when you said you would.",
    WZ: "You'll feel it when the W wants to talk it through and the Z has gone completely quiet. This is the place where pursuer-withdrawer patterns live. Slow the W down, give the Z a specific return time, and both of you honor the agreement. Build the script when things are calm.",
    XY: "You'll feel it when the X wants to resolve and the Y still needs to process. The X may read the Y's hesitation as avoidance. It isn't. The Y may read the X's efficiency as not caring. Also not true. Name it: 'I need to sort this tonight; you need tomorrow.' Then negotiate.",
    XZ: "You'll feel it when neither of you raises a disagreement and it quietly shapes the next week. Both of you want to let it go; both of you carry the residue. The move is a specific time each week to revisit anything unsaid. It'll feel clunky. Do it anyway.",
    YZ: "You'll feel it when something's clearly off and neither of you is going to start the conversation. You both need space and you both wait. Decide in advance who comes back first. The other person won't feel pressed; the first one will know the ask is expected.",
  },
  repair: {
    WW: "You'll feel it after a disagreement when one of you feels done and the other doesn't yet. You both tend to want verbal closure, but you may be on different timelines. The repair isn't complete until both of you have said so out loud. Don't assume warmth means resolved.",
    XX: "You'll feel it when a disagreement has technically ended but neither of you has named it. Both of you move on efficiently, which can mean the repair is implicit. Every few times, make it explicit. 'We're good' is a sentence worth saying even when it feels unnecessary.",
    YY: "You'll feel it when one of you needs more processing time and the other is ready to close it. Both of you repair slowly; you both also can underestimate how much the other needs. Assume 48 hours before you call it done. Check in on day three if either of you is still sitting with something.",
    ZZ: "You'll feel it when a disagreement ends and both of you go quiet afterward. Neither is sure if things are actually repaired or just paused. The fix is a specific question: 'Are we good?' Not a rhetorical one. An actual pause for the answer.",
    WX: "You'll feel it when the W wants verbal closure, 'we're good, we worked it out', and the X considers it repaired once the logic is sorted. The W should get their sentence. The X should hold space for one more beat than feels necessary. Both things make the repair stick.",
    WY: "You'll feel it when the W wants to close the loop and the Y still needs to land somewhere. The W can say 'no rush, we'll come back.' The Y can mark progress with a small gesture, a hand, a look, so the W doesn't think the silence means distance.",
    WZ: "You'll feel it when the W wants to verbally repair and the Z has gone inward. The Z isn't refusing repair; they're still processing. Give it a full day. Don't require a big conversation at the end, just a clear signal from the Z that they're back.",
    XY: "You'll feel it when the X confirms the logical resolution and the Y is still sitting with the emotional layer. Mark both. Two sentences, not one: 'Here's what we agreed' + 'I know this one took a beat for you.' Both partners feel accounted for.",
    XZ: "You'll feel it when a disagreement ends and neither of you explicitly names the repair. Both of you move on quietly. That works for most things; for the bigger ones, one of you needs to say out loud: 'I want to make sure we're actually repaired here.'",
    YZ: "You'll feel it when the conversation has ended but neither of you is sure if things are actually resolved. You both need time; you both also tend to leave the final check implicit. Build in a 48-hour follow-up. A one-liner is enough: 'We good after Monday?'",
  },
  closeness: {
    WW: "You'll feel it when life fills with logistics and neither of you has initiated the connection in a few days. Both of you want closeness; both of you can also expect it to happen on its own. Build one small ritual that doesn't require organizing, a weeknight ten-minute talk, a shared morning routine.",
    XX: "You'll feel it when both of you are heads-down and neither has reached across in a week. You both value shared activity over shared conversation, which can make closeness feel procedural. Schedule one low-stakes thing that isn't about logistics, a walk, a show, a dinner without phones.",
    YY: "You'll feel it when both of you are respecting each other's space so well that you've stopped reaching. You both value independence; both of you can also let that tip into parallel lives. One small weekly overlap, a meal, a walk, anchors the closeness.",
    ZZ: "You'll feel it when the house has been quiet for a week and neither of you knows how the other is doing. Both of you default to independent rhythms. Build a specific shared time, not optional, not moveable, where the expectation is being together without needing to produce anything.",
    WX: "You'll feel it when the W wants a lot of connection and the X wants side-by-side presence. Both are valid closeness; they look different. The X isn't refusing; they're participating in their own register. Alternate: one night her way, one his. Both count.",
    WY: "You'll feel it when the W wants a bigger version of closeness and the Y needs it quieter. Neither is wrong; they're different channels. The W can turn the volume down without turning the signal off. The Y can turn it up slightly on purpose, even when it feels like effort.",
    WZ: "You'll feel it when the W bids for closeness frequently and the Z responds rarely but deeply. Both are real; the W can feel unmet and the Z can feel crowded. Lower the frequency, raise the intention. One thing a week with the Z's full attention beats daily small asks.",
    XY: "You'll feel it when the X offers closeness practically and the Y offers it emotionally. Neither one is quite what the other is looking for. Learn the translation, for the X, shared logistics IS closeness; for the Y, being seen IS closeness. Both happen in the same week.",
    XZ: "You'll feel it when both of you are in the same house but barely overlap. Both of you are comfortable with independence; both of you can also drift. Anchor with a ritual that isn't about talking, cooking, a show, a walk. Closeness doesn't always require a conversation.",
    YZ: "You'll feel it when both of you need space at the same time and the distance stretches. Both of you will wait the other out. Decide in advance what 'too much space' looks like for you two, a week, three days, whatever you agree on, and commit to re-engaging before that threshold.",
  },
  love: {
    WW: "You'll feel it when one of you gives love in a specific way and the other doesn't fully receive it, or vice versa. You're both actively loving, which makes the misses feel especially strange. Tell each other plainly: 'this is what lands for me.' Specific and concrete, not abstract.",
    XX: "You'll feel it when both of you express love through action and neither of you has said anything about it in weeks. You both show love by doing; you both can also under-weight how much the other wants to hear it. Say the sentence, even when you think it's obvious.",
    YY: "You'll feel it when love is present but quiet and neither of you is sure if it's landing. Both of you express love gently; both of you can also wonder if the other still feels it. Ask directly: 'do you feel loved by me right now.' Don't assume. Ask.",
    ZZ: "You'll feel it when love is real but almost entirely non-verbal and both of you occasionally wonder if it's enough. Both of you express care quietly, by doing. Every so often, add the sentence. Don't wait for a big occasion. A Tuesday works.",
    WX: "You'll feel it when the W expresses love verbally and the X expresses it through care and effort. Both are real. The W needs to hear it; the X needs to see it. Learn both. Say it out loud AND show up consistently. Don't pick one.",
    WY: "You'll feel it when the W is expressive and the Y receives it but returns it more softly. Not less, softly. The W can match the Y's register sometimes; the Y can push past their quieter default once in a while. Both meet in the middle.",
    WZ: "You'll feel it when the W is openly loving and the Z shows love through presence and reliability. The W may feel the Z holds back; the Z may feel the W performs. Both readings are partial. Match the other's channel deliberately once a week.",
    XY: "You'll feel it when the X loves practically and the Y loves emotionally. Both are real. The X can add a word about the feeling, not just the task. The Y can acknowledge the task, not just the feeling. Neither channel disappears; both stretch a little.",
    XZ: "You'll feel it when love is expressed through reliable action and almost never verbalized. Both of you prefer it that way; both of you can also miss the words. Add them occasionally, without ceremony. 'I'm glad it's you.' That's enough.",
    YZ: "You'll feel it when love is quiet, steady, and both of you sometimes wonder if it's still there. It is. Both of you show love through presence, not expression. Once in a while, mark it explicitly. A Tuesday text. A specific sentence. Unnecessary by design, and worth it.",
  },
  stress: {
    WW: "You'll feel it during external pressure, work, family, health. You both tend to reach toward each other under stress, which is good, but it can mean you're both leaning on someone equally depleted. One of you names the load first. The other takes one thing off their plate.",
    XX: "You'll feel it when both of you are dealing with stress and neither is talking about it. You both compartmentalize; you both assume the other is handling it. Ask directly, not generally. 'What's on your plate this week that I don't know about.'",
    YY: "You'll feel it when both of you are overloaded and both of you are quiet about it. You both withdraw under pressure. The repair is a specific ritual: weekly, name one thing each of you is carrying. No fix required, just put it in the room.",
    ZZ: "You'll feel it when both of you are stressed and neither of you has said a word about it for days. You both hold. The ask is direct: once a week, each of you says one thing that's been weighing on you. Brief is fine. Silence is not.",
    WX: "You'll feel it when the W talks through their stress and the X keeps theirs internal. Both are real responses; they need different support. The W needs a listener; the X needs their plate cleared without a conversation. Do both, in the right direction.",
    WY: "You'll feel it when the W is reaching for connection under stress and the Y needs to retreat. Neither is wrong. The W can give the Y space first; the Y can come back with a specific 'I'm ready now' signal. Both trust the return.",
    WZ: "You'll feel it when the W wants to share the stress and the Z wants to handle it alone. The W can offer support without requiring a conversation; the Z can name the stress once, briefly. A single sentence is enough.",
    XY: "You'll feel it when the X manages stress practically and the Y manages it through processing. Different needs, same week. The X can take things off the Y's plate; the Y can help the X slow down when they're over-functioning.",
    XZ: "You'll feel it when both of you are stressed and neither of you is going to bring it up. Both of you handle it internally. The rule: one direct question a week. 'What's heaviest right now.' Expect a short answer. That's the whole point.",
    YZ: "You'll feel it when both of you are running low and both of you are waiting for the other to notice. You won't. The move is to name it plainly, even when it feels like a burden to say. 'I'm running low this week' is enough. No elaboration required.",
  },
  feedback: {
    WW: "You'll feel it when something needs to be said and neither of you wants to be the one to say it. You both prefer honest conversation to held resentment, but avoidance still happens around the specific topics that feel risky. Name the topic first, then the feedback. 'I want to talk about X' lowers the stakes.",
    XX: "You'll feel it when one of you has feedback that feels too direct to say casually. You both handle direct communication well, but that doesn't mean it's easy. Pre-frame it: 'this isn't a big thing, and I want to mention it.' Takes the edge off without softening the content.",
    YY: "You'll feel it when feedback has been present for a while and neither of you has raised it. You both wait for the right moment; the right moment rarely arrives on its own. Build a weekly check-in where each of you offers one small piece of feedback. Normal volume, normal tone.",
    ZZ: "You'll feel it when something's been off for weeks and neither of you has said anything. You both hold feedback back, not from avoidance, but because you want to be sure first. The fix is to lower the threshold: 'I noticed this, I don't have a full read yet, wanted to put it in the room.'",
    WX: "You'll feel it when the W gives feedback with emotion attached and the X wants it delivered as logic. Both of you can adjust. The W can strip the edge; the X can absorb the emotional layer without requiring it to be removed. Neither is right; both are a stretch.",
    WY: "You'll feel it when the W raises feedback in real time and the Y needed more warning. Give the Y a heads-up: 'I have something I want to mention, when's good.' Sets up the right container. The W gets to say it; the Y gets to receive it well.",
    WZ: "You'll feel it when the W delivers feedback openly and the Z processes it internally and slowly. The W may want an immediate response. Don't. Give the Z time, even a full day. The response will be better and more considered.",
    XY: "You'll feel it when the X gives feedback concisely and the Y needs more relational framing around it. The X can add one line of context, 'this matters because...', without changing the content. The Y can hold the feedback without requiring the context to be expanded.",
    XZ: "You'll feel it when both of you are holding feedback for each other and neither is going to raise it. You both prefer precision over speed, which can mean the feedback never lands. Schedule it: monthly, each of you names one thing. Not as an event, as a habit.",
    YZ: "You'll feel it when feedback has been sitting for a while because neither of you wanted to rush it. Both of you want to deliver it well; both of you can also over-wait. Set a shorter threshold, within a week, for anything worth saying.",
  },
};

