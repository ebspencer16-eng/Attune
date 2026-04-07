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
      'Is there anything you\'ve been asking of {P} that runs against their recharge style?',
    ],
    thisWeek: 'Pick one upcoming situation likely to produce different energy states, a party, a family visit, a busy week. Before it happens, name what you\'ll each need afterward. Then check in.',
  },
  expression: {
    measures: 'How freely each of you shares what\'s going on internally, not the content of feelings, but how naturally they surface. Expressive partners wear their emotional state; guarded partners process privately and share selectively.',
    closeText: '{U} and {P} are operating in the same register. Neither tends to feel overwhelmed by too much sharing or starved by too little.',
    gapText: 'One of you shares as feelings arise; the other waits until they\'ve processed. The expressive partner may experience the guarded one\'s silence as emotional unavailability. The guarded partner may experience the expressive one\'s openness as pressure.',
    prompts: [
      'When something bothers you, at what point do you typically share it, immediately, after processing, or only when asked?',
      'Does {P} know when you\'re struggling, or is that something you carry privately?',
      'Is there a version of your emotional experience you share, and a version you hold back?',
      'What would feel different if {P} shared more, or less?',
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
      'Do you know what {P} needs right now? Have they told you, or are you guessing?',
      'What would make it easier for each of you to ask more directly?',
    ],
    thisWeek: 'Each of you names one thing you need from the other this week, specifically, without softening. "I need you to ___." Notice what it feels like to ask that clearly.',
  },
  bids: {
    measures: 'How reliably each partner notices and responds to small, everyday bids for connection, a comment, a gesture, a look. These micro-moments are the primary currency of sustained intimacy in long-term relationships.',
    closeText: '{U} and {P} both notice and respond naturally to each other\'s small bids. This is one of the strongest predictors of relationship satisfaction over time.',
    gapText: 'One partner tends to miss bids, absorbed in tasks, not naturally tracking the relational current. The other tracks them instinctively. Repeated missed bids can feel like dismissal even when none is intended.',
    prompts: [
      'Can you think of a recent moment when {P} reached for connection and you weren\'t available?',
      'Are there ways {P} reaches for you that you regularly miss, not out of rejection, but out of being absorbed?',
      'What\'s the smallest thing {P} does that signals they want your attention?',
      'What would it look like to be slightly more tuned in, without it feeling performative?',
    ],
    thisWeek: 'Once a day this week, when {P} makes a small bid, says something minor, reaches out physically, checks in, stop what you\'re doing and acknowledge it specifically. Actually engage for 30 seconds.',
  },
  conflict: {
    measures: 'How each partner responds when something feels wrong, whether the instinct is to engage immediately or need space first. This is about timing, not care. Both instincts are legitimate; misread, they create one of the most persistent loops in relationships.',
    closeText: '{U} and {P} move toward resolution with similar timing. This symmetry removes the most common friction point in conflict, the pursuer-withdrawer dynamic.',
    gapText: 'One of you needs to address things immediately; the other needs space first. Without a framework, the person who needs resolution reads the other\'s silence as avoidance. The person who needs space reads the other\'s urgency as pressure. Both are behaving in ways that feel self-evidently correct, which is why this pattern is so persistent without an explicit agreement.',
    prompts: [
      'When something is bothering you, what does your ideal next few hours look like?',
      'When {P} is clearly upset and pulls back, what does that feel like? What do you do?',
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
      'When did you last feel genuinely loved by {P}? What was happening?',
      'What does {P} do that makes you feel most cared for, even if it\'s something small?',
      'Is there something you\'d like more of that you haven\'t said clearly?',
      'Does {P} know specifically how to make you feel appreciated?',
    ],
    thisWeek: 'Ask {P}: "What\'s one thing I do that makes you feel really loved that I might not realize has that effect?" Then do more of it.',
  },
  stress: {
    measures: 'How each partner\'s communication style shifts when they\'re overwhelmed, anxious, or depleted. Some people shut down; others become more urgent and seek reassurance. Neither is a statement about the relationship, it\'s a stress response.',
    closeText: '{U} and {P} respond to stress in similar ways. This symmetry means neither partner is likely to be left alone in the way that matters most when pressure builds.',
    gapText: 'Under pressure, one of you shuts down; the other becomes more urgent and reaches for closeness. Without language for this, the seeking partner reads withdrawal as rejection; the withdrawing partner reads urgency as escalation. Both are in stress response, and making each other worse.',
    prompts: [
      'When you\'re really under pressure, what do you need from {P}? Does {P} know?',
      'How do you know when {P} is struggling, even when they\'re not saying so?',
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
      'Is there something {P} does regularly that bothers you that you haven\'t said clearly? What\'s the barrier?',
      'When {P} offers a critical observation, what\'s your first instinct?',
      'Can you tell {P} when something isn\'t working without it becoming a bigger thing than it needs to be?',
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
    thisWeek: 'Separately, list the household tasks you currently own, the ones you think {P} owns, and the ones falling through the cracks. Compare the lists without judgment.',
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
    thisWeek: 'Write down, separately, then share, one sentence about what you want your family life to look like in five years. Don\'t edit for what you think {P} wants to hear.',
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
    thisWeek: 'Share one value or belief that feels central to how you live, but that you\'re not sure {P} fully knows about. Don\'t ask them to share it, just offer it.',
  },
];
