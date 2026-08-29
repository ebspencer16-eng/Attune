/**
 * Customer-facing results copy, version 1.
 *
 * Snapshot of the copy as it stood on 2026-08-29. Couples whose results were
 * computed under CONTENT_VERSION 1 render from this file, and it does not
 * change again: editing it would move the words a highlight was written
 * against, which is the thing content pinning exists to prevent.
 *
 * TO CHANGE THE COPY: copy this file to v2.js, edit that, bump CONTENT_VERSION
 * in api/_lib/content-version.js, and register v2 in ./index.js. New couples
 * get v2; everyone already stamped keeps v1 until deliberately republished.
 *
 * Moved verbatim out of src/App.jsx. SHIFTS keeps its original indentation
 * because it was nested inside getDimShift; nothing else changed.
 */

// 6.3 — "One thing to keep in mind" prose for ALIGNED dimensions. Previously
// every aligned dimension fell back to one generic line. These are per-
// dimension. Pole-neutral on purpose: an aligned couple sits on the same pole,
// but which pole is data-dependent, so each line works for either.
export const ALIGNED_ADVICE = {
  reassurance: {
    low:  "You both want where you stand said out loud, and you both say it. Nothing goes unnamed. The thing to watch is it becoming a routine that stops carrying weight. Name the specific thing, not the category.",
    high: "You both take security as a given, so it rarely gets said. That is a settled place to be. The thing to watch is that silence carries no information, so a hard stretch looks exactly like an easy one. Say it out loud after the next rough week.",
  },
  energy:     "You recharge in similar ways. That makes it easy to assume the other always wants what you want. Check before you plan the weekend around it.",
  // Direction-dependent: which pole the couple is aligned toward changes the copy.
  expression: {
    low:  "You both process emotion inwardly. That gives feelings room to settle before they're spoken. It also means nothing forces the deeper thing to the surface, so neither of you pushes the other toward the part that's harder to say. Ask for it sometimes, even when neither of you offers first.",
    high: "You both process emotion out loud. Feelings reach the table fast, which is easy. The watch-out is volume. When you're both expressing at once, leave room for one of you to just listen.",
  },
  needs: {
    low:  "You both ask directly. Nothing gets buried, which is its own kind of ease. The watch-out is tone, not clarity. When you're tired, directness can read sharper than you mean it. Same ask, softer.",
    high: "You both tend to hint. That keeps things gentle, but when neither of you says it straight, the ask gets missed by both of you. Say the direct version sometimes anyway.",
  },
  bids: {
    low:  "You're both reserved with the small reaches for connection. Neither of you makes a show of them, which keeps things low-key. It also means they can pass unnoticed. Name one out loud now and then. The reach only lands when the other person knows it happened.",
    high: "You both catch the small reaches for connection. Keep catching them out loud. The acknowledgment is what makes a bid land, not just the noticing.",
  },
  listening:  "You listen in similar ways. That works until one of you needs the other mode. Ask which one is wanted before you give it.",
  conflict:   "You handle conflict in similar ways. If you both engage, it can escalate fast. If you both step back, things go unsaid. Watch for whichever one is yours.",
  repair: {
    low:  "You both repair deliberately, with a real reset. That makes repairs count. It can also leave small ruptures waiting for a big enough moment. Let some be smaller and sooner.",
    high: "You both repair casually, without much ceremony. Because it comes so naturally, it's easy to skip naming that a repair even happened. Say it landed.",
  },
  love:       "Love lands in similar ways for both of you. That's rare. Keep giving it in that form on purpose, not just by default.",
  feedback:   "You handle feedback in similar ways. When you're both open, keep it kind. When you're both guarded, small things pile up. Say the small thing early.",
};

// SHIFTS was nested inside getDimShift and its template literals close over
// loName and hiName. At module scope those do not exist, so it becomes a
// function of the two names. Same prose, same keys.
export const SHIFTS = (loName, hiName) => ({

  // ── REASSURANCE (A=Voiced, B=Assumed) ──
  // DRAFT copy, in the prose approval doc. Every other dimension's shift
  // prose was reviewed; this one postdates that pass.
  reassurance: {
    '1_1': `You both need where you stand said out loud, and you both say it. Nothing goes unnamed. The risk is that it turns into a routine and stops carrying weight. Make it specific this week: name the thing, not the category.`,
    '1_2': `${loName} needs it said plainly; ${hiName} leans the same way. Close match, so neither of you is left waiting. The one gap: when life gets busy, the saying is the first thing to drop. Put it somewhere it survives a hard week.`,
    '1_3': `${loName} needs where they stand said out loud; ${hiName} is steady either way. That steadiness can read as not needing to say it. It costs ${hiName} very little to say it anyway, and it lands.`,
    '1_4': `${loName} needs it voiced; ${hiName} treats it as settled and does not think to say it. The quiet is not withholding, and the asking is not doubt. The shift: ${hiName} says it once this week unprompted, before ${loName} has to ask.`,
    '1_5': `${loName} needs where they stand said out loud. ${hiName} takes it as given and rarely says it. This is the gap where a long quiet stretch means two completely different things. Agree on a small, regular way it gets said. It matters more to one of you than the other, and that is fine.`,
    '2_2': `You both like hearing it, without needing much. Comfortable match. Watch for it thinning out over time, since neither of you will chase it. Say it when you notice it, not only when it is asked for.`,
    '2_3': `${loName} likes it said; ${hiName} is comfortable either way. No real strain here. ${hiName} can be the one who says it first, since it costs them less.`,
    '2_4': `${loName} likes hearing it; ${hiName} assumes it and moves on. The shift: ${hiName} answers the unasked question sometimes, rather than waiting for a prompt.`,
    '2_5': `${loName} wants it said now and then; ${hiName} treats it as long since settled. ${hiName} may not hear the ask, because it arrives quietly. ${loName} can ask outright, and ${hiName} can take the ask at face value.`,
    '3_3': `Neither of you needs it said, and neither of you goes looking for it. That is a low-maintenance place to be. The gap shows up after a rough patch, when neither of you names that you are okay. Say it once out loud after the next hard week.`,
    '3_4': `${loName} is steady either way; ${hiName} takes it as given. Nothing is straining. The one thing worth doing is saying it during a good stretch, so it is available during a bad one.`,
    '3_5': `${loName} does not need much; ${hiName} needs none at all. You will rarely talk about where you stand. That works until something is actually off and there is no signal either way. Build one small check-in you both do on purpose.`,
    '4_4': `You both take it as settled and rarely say it. Secure and uncomplicated. The risk is that silence carries no information, so a hard stretch looks exactly like an easy one. Name it out loud once a month, even when nothing prompts it.`,
    '4_5': `${loName} assumes it; ${hiName} assumes it more. Neither of you will bring it up. That is fine while things are steady. Pick one moment, an anniversary or the start of a month, and say it then.`,
    '5_5': `You both treat security as a given and neither of you asks for confirmation. Genuinely settled. The only thing to watch: after something hard, neither of you will be the one to say you are okay. Decide now who says it first next time.`,
  },

  // ── ENERGY & RECHARGE (A=Inward, B=Outward) ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  energy: {
    '1_1': `You both recharge in solitude. The risk is that neither of you flags when you're depleted. You just go quiet. Try naming it before you disappear: "I need a low-key evening." It prevents the silence from reading as something else.`,
    '1_2': `${loName} recharges alone; ${hiName} leans the same way, slightly more flexible. Close match, but don't let the ease of being separate quietly turn into less connection than you want. One shared ritual, dinner, a walk, holds the thread.`,
    '1_3': `${loName} recharges in solitude; ${hiName} is genuinely flexible. Make sure ${hiName}'s flexibility doesn't always defer to ${loName}'s preference for quiet. Check in: "what do you actually want tonight?" beats assuming.`,
    '1_4': `${loName} restores alone; ${hiName} leans toward people and togetherness. The shift: when ${loName} needs to withdraw, name it as a recharge request rather than going quiet. ${hiName} is less likely to misread it when it's said out loud.`,
    '1_5': `${loName} recharges in solitude; ${hiName} genuinely energizes from being together. A real daily-life difference. Design your week intentionally, some evenings are separately yours, some are deliberately shared. Named in advance, not negotiated on the spot.`,
    '2_2': `You both lean toward quiet restoration. Good match. You're unlikely to drain each other. The one gap: neither of you may push for togetherness when it's actually needed. Sometimes one person has to reach, even when it doesn't come naturally.`,
    '2_3': `${loName} leans toward quiet; ${hiName} is flexible. Ask ${hiName} what they actually want occasionally, neutral doesn't mean indifferent, and their flexibility may be quietly costing them.`,
    '2_4': `${loName} leans toward recharging alone; ${hiName} leans toward connection. One shift: when you've both had a long day, name your mode before defaulting to it. "I need an hour to decompress" lands very differently than silently withdrawing.`,
    '2_5': `${loName} tends toward quiet; ${hiName} genuinely energizes from togetherness. The shift: ${hiName} shouldn't read ${loName}'s quiet time as withdrawal, and ${loName} should flag when they're recharged and ready to reconnect. Both need to become signals.`,
    '3_3': `You're both genuinely flexible about how you restore. That's adaptive, but it can mean connection gets left to chance. When stress hits, each of you may default to a mode the other doesn't know about. Check in when things are hard.`,
    '3_4': `${hiName} leans more toward needing togetherness than ${loName} does. ${hiName} can name when they want company rather than hoping ${loName} picks it up. ${loName} tends to assume everyone's preferences match their own.`,
    '3_5': `${loName} is neutral; ${hiName} genuinely energizes from people and connection. ${hiName}'s need is a real preference worth designing around. Build in deliberate closeness even when ${loName} would otherwise be fine either way.`,
    '4_4': `You both restore through connection and togetherness. Warm match. Give each other explicit permission to want a quiet night sometimes. It shouldn't feel like a confession when one of you needs to be alone for a bit.`,
    '4_5': `Both of you lean toward connection, ${hiName} more strongly. When one of you is genuinely depleted and doesn't have energy for togetherness, build in an easy way to signal it: "I'm low tonight but I'm not going anywhere."`,
    '5_5': `You both restore through people and being together. Strong match in daily energy needs. The watch-out: when you're both depleted at the same time, neither of you may feel like being "on" for the other. Name it when it happens rather than both performing okay-ness.`,
  },

  // ── EMOTIONAL EXPRESSION (A=Internal, B=External) ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
  expression: {
    '1_1': `You both process internally before sharing. That prevents blurting, but it also means important things can stay unspoken for a long time. The shift: if something's been sitting with you for more than 48 hours, name it. Even "I've been sitting with something" opens the door.`,
    '1_2': `${loName} is strongly internal; ${hiName} leans similar. Neither of you is rushing to the surface. Watch for the slow drift where things stay unsaid because neither pushed. A regular check-in, "anything on your mind this week?", creates the opening.`,
    '1_3': `${loName} processes privately; ${hiName} is flexible. The shift for ${loName}: trust that sharing before you're fully sorted won't make you look uncertain. It gives ${hiName} a chance to feel included in what's actually going on.`,
    '1_4': `${loName} goes internal; ${hiName} tends toward sharing. A real difference. ${loName} can offer an interim signal, "I'm processing something, I'll bring it up when I have words", so ${hiName} doesn't fill the silence with their own interpretation.`,
    '1_5': `${loName} is very private in processing; ${hiName} processes by talking it through. One of the most common expression mismatches. The shift: agree that ${hiName} gets to think out loud without it being a finished position, and ${loName} gets time before being expected to respond.`,
    '2_2': `You both tend to work through things privately. That creates low-drama, but it means significant things can sit unspoken too long. Make it easy to say "I've been sitting with something" without needing to be fully ready to explain.`,
    '2_3': `${loName} leans private; ${hiName} is flexible. Don't let ${hiName}'s flexibility become the default that always gives way. Check in on what ${hiName} actually wants to share, rather than only what they're willing to hold.`,
    '2_4': `${loName} leans internal; ${hiName} leans toward sharing. ${loName} may often appear fine when they're not. Agree that "I need to think about this" means "I'll come back to you", not "nothing's wrong."`,
    '2_5': `${loName} tends inward; ${hiName} processes externally. The shift: ${hiName} may share unfinished thoughts, which can feel like oversharing to ${loName}. Agree that thinking out loud is allowed and doesn't require an immediate response.`,
    '3_3': `You're both flexible on expression, can hold or share depending on the day. That's adaptive. Watch for: when something actually needs saying, the flexibility can become avoidance. Make it easy for either person to say "I need to talk about something."`,
    '3_4': `${hiName} leans more toward sharing than ${loName}. ${hiName} may feel like they're doing most of the initiating when it comes to talking things through. ${loName} can start sometimes, even when nothing is wrong.`,
    '3_5': `${loName} is neutral; ${hiName} genuinely processes out loud and needs to share. Give ${hiName} explicit room to think aloud without ${loName} treating every word as a conclusion. Processing isn't the same as deciding.`,
    '4_4': `You both lean toward sharing rather than holding. The relationship is verbally expressive. Watch for: both of you sharing at once without one person listening. Practice one person speaking while the other actively receives, especially when things are charged.`,
    '4_5': `Both lean external, ${hiName} more so. You're likely to talk things through, which is healthy. When both of you are processing out loud at the same time, the volume can get high. Take turns more deliberately when things are tense.`,
    '5_5': `You both process very externally, feelings are out, usually in real time. That makes you readable to each other. The shift: because both of you share readily, the emotional volume can escalate quickly. Slowing down, speaking quieter, not louder, is the most useful skill here.`,
  },

  // ── HOW YOU ASK FOR WHAT YOU NEED (A=Direct, B=Indirect) ───────────────────────────────────────────────────────────────────────────────────────────────────────
  needs: {
    '1_1': `You both tend to ask for what you need directly. That's a genuine gift, the relationship doesn't carry much guesswork. The shift over time: make sure directness stays a request and doesn't become a demand. Tone and flexibility around the ask matters as much as saying it.`,
    '1_2': `${loName} is very direct; ${hiName} leans similarly. Close match. Watch for ${hiName} occasionally holding back something they'd normally say directly. Check in: "anything you've been wanting to bring up?"`,
    '1_3': `${loName} asks directly; ${hiName} is flexible. ${hiName} doesn't always have to match ${loName}'s directness, but can practice being a bit more explicit when something is needed.`,
    '1_4': `${loName} asks directly; ${hiName} tends to signal rather than state. A real difference. The shift: ${loName} can ask "what do you need right now?" when something seems off. It gives ${hiName} an opening without them having to initiate the ask.`,
    '1_5': `${loName} states needs directly; ${hiName} signals indirectly. The gap creates the "you should just know" dynamic on one side and "just tell me what you want" frustration on the other. ${loName} can model the direct ask gently, "I'd love X, what about you?", to show it's safe.`,
    '2_2': `You both lean toward direct communication about needs. Good match. Watch for: when someone is close to asking but holds back because they don't want to seem demanding. Make it explicit that asking directly is always welcome here.`,
    '2_3': `${loName} leans direct; ${hiName} is flexible. ${hiName} can be encouraged to name what they want rather than wait. "What would make this easier for you?" creates the opening.`,
    '2_4': `${loName} leans direct; ${hiName} tends to hint. A moderate difference. When ${loName} doesn't catch ${hiName}'s signal, ${hiName} can try: "I was hoping you'd offer to…", it names the expectation without accusation.`,
    '2_5': `${loName} leans direct; ${hiName} is very indirect. The gap can create frustration on both sides. ${loName} can help by asking specifically, "is there something you need from me today?", which removes the burden from ${hiName} of deciding whether to ask.`,
    '3_3': `You're both somewhere in the middle, not always direct, not always signaling. Watch for: needs slipping through because neither of you pushed to name them. A weekly "what do you need from me this week?" keeps it simple.`,
    '3_4': `${hiName} tends a bit more indirect than ${loName}. ${loName} can reflect back what they observe, "it sounds like you might need X", rather than waiting. It gives ${hiName} a bridge between signaling and asking.`,
    '3_5': `${loName} is neutral; ${hiName} is quite indirect in how they ask. ${hiName} doesn't have to change their style completely, but practicing one direct ask per week, on something small, makes the indirect signals land better when they matter.`,
    '4_4': `You both tend toward indirect communication around needs. That works when you're well-attuned, but it also means things can go unmet because neither named them. The shift: once a week, name one thing you actually need from each other. Directly.`,
    '4_5': `Both of you lean indirect, ${hiName} more so. You're probably well-matched in not wanting to impose, but that same quality can mean needs go unspoken. Agree on a norm: "I should just tell you" is allowed and encouraged.`,
    '5_5': `You both tend to signal needs rather than state them. The relationship carries real goodwill. You're both trying not to burden each other. The cost is that needs can quietly go unmet. Build a weekly "what do you need?" into your rhythm. It removes the weight from the ask.`,
  },

  // ── RESPONDING TO BIDS (A=Subtle, B=Expressive) ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  bids: {
    '1_1': `You're both on the reserved end, fewer bids, quieter reaching. The relationship is probably stable but low-key. The shift: increase bid volume deliberately. Share a thought, ask a small question, notice something out loud. Connection is built in those tiny moments more than the big ones.`,
    '1_2': `${loName} is very reserved; ${hiName} is a bit more present. Close match, but the bid volume between you is probably low. Worth deliberately creating more moments, share more small things, even when they feel insignificant.`,
    '1_3': `${loName} is reserved; ${hiName} is in the middle. ${hiName} can start noticing and naming when ${loName} makes a small bid, "you seemed like you wanted to say something earlier", making it easier for ${loName} to reach again.`,
    '1_4': `${loName} tends quiet in reaching for connection; ${hiName} is more responsive and attuned. The shift: ${loName} can practice making the smallest version of a bid, sending a link, sharing an observation, without expecting more than a nod.`,
    '1_5': `${loName} rarely bids for connection; ${hiName} is very attuned and responsive, a real gap. The shift: ${loName} can start with the simplest thing, showing ${hiName} something, sharing a minor thought. Bids don't need to be meaningful to matter.`,
    '2_2': `You both lean quieter in how you reach for each other. Warm but not loudly expressive. Agree to initiate at least one small connection moment per day, a specific question, a brief check-in. Build it into the routine rather than leaving it to chance.`,
    '2_3': `${loName} leans reserved; ${hiName} is flexible. ${hiName} can make it easier to respond to ${loName}'s bids by acknowledging them explicitly, "you mentioned X earlier, tell me more", signals that ${loName}'s reaching is always welcome.`,
    '2_4': `${loName} tends quieter; ${hiName} is more attuned to small moments. ${loName} can become more aware of what ${hiName} does to reach for connection, and make a deliberate effort to turn toward it, even when it's a small thing.`,
    '2_5': `${loName} leans reserved; ${hiName} is highly responsive. ${hiName} may feel like they're always the one reaching. The shift: ${loName} can pick one type of bid and practice it consistently, asking about ${hiName}'s day, noticing something they did. It doesn't have to be grand.`,
    '3_3': `You're both somewhere in the middle. Workable, but "somewhere in the middle" can mean neither reaches reliably. Build in deliberate connection moments rather than leaving it to feel.`,
    '3_4': `${hiName} is more tuned to small moments than ${loName}. ${loName} can practice responding explicitly when ${hiName} bids, even a "I noticed that", makes ${hiName} feel seen.`,
    '3_5': `${loName} is neutral; ${hiName} is very attuned and responsive. ${hiName} genuinely values these small moments, and ${loName} can create more of them even when they'd otherwise not think about it. Low effort, high return.`,
    '4_4': `You're both responsive to each other. That builds a warm, attentive dynamic. Watch for: when one of you is distracted or checked out, the other can feel it acutely. Agree to name it: "I feel like I haven't had your attention today."`,
    '4_5': `Both of you lean toward presence and responsiveness, ${hiName} slightly more. Good match. When ${loName} is genuinely depleted and doesn't feel like connecting, build in an easy signal: "I need 20 minutes", not rejection, just recharge.`,
    '5_5': `You're both highly attuned and responsive. The relationship probably feels warm and connected. Watch for: because both of you reach for connection readily, check in about whether the volume feels right. Too many bids can occasionally feel like pressure rather than warmth.`,
  },

  // ── CONFLICT STYLE (A=Engage, B=Withdraw) ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  conflict: {
    '1_1': `You both move toward resolution quickly. That keeps things from festering, but when both of you are ready to engage before one has fully settled, words can come out sharper than intended. A short pause, even 10 minutes, can change the tone without losing momentum.`,
    '1_2': `${loName} addresses things quickly; ${hiName} leans similar. Close match. Watch for: moving so fast toward resolution that one of you doesn't fully share what happened before you're onto "what do we do." Make space for "here's what I felt" before jumping to fix it.`,
    '1_3': `${loName} moves toward resolution quickly; ${hiName} is flexible. ${hiName} can signal when they're ready. It helps ${loName} not feel like they're carrying the weight of bringing things up.`,
    '1_4': `${loName} addresses things quickly; ${hiName} tends to need more time. A real tension point. Agree in advance that when ${hiName} asks for time, ${loName} can ask for a return window: "when should we come back to this?", turns space into a plan.`,
    '1_5': `${loName} wants to resolve things quickly; ${hiName} needs significant space first. One of the most common conflict mismatches. Name the pattern in a calm moment. Agree: ${hiName} commits to a specific return time, and ${loName} trusts that as a promise, not avoidance.`,
    '2_2': `You both lean toward addressing things sooner rather than later. That keeps the relationship clear. Watch for: moving quickly into the conversation before one of you is actually ready. "Ready to talk" doesn't mean "ready to resolve", it's okay to share and still feel unsettled.`,
    '2_3': `${loName} leans toward quicker resolution; ${hiName} is flexible. ${hiName} can signal readiness. It helps ${loName} not always be the one initiating.`,
    '2_4': `${loName} leans toward resolving; ${hiName} leans toward needing space. Moderate difference. ${loName} can make it easier for ${hiName} to come back, "I'm not going anywhere, let me know when you're ready", removes the urgency that makes space harder to take.`,
    '2_5': `${loName} tends toward resolution; ${hiName} needs significant time. The shift: ${hiName} commits to a specific return time when asking for space. That gives ${loName} something to hold, and prevents open-ended silence from feeling like withdrawal.`,
    '3_3': `You're both flexible on timing. That's adaptive. Watch for: neither of you pushing to address something that should be addressed. Make it easy for either person to say "I'm ready to talk about that thing from earlier", the opening shouldn't always come from the same person.`,
    '3_4': `${hiName} needs a bit more time than ${loName} does. ${loName} can signal readiness without pushing, "whenever you're ready, I'm here", rather than waiting in silence or asking repeatedly.`,
    '3_5': `${loName} is neutral; ${hiName} strongly needs space before engaging. The shift: ${hiName} can share why time matters, often it's about saying things more accurately, not avoiding the conversation. That reframe helps ${loName} understand the delay isn't rejection.`,
    '4_4': `You both tend to need some time before resolving. A compatible match. The watch-out: "some space" can quietly stretch into avoidance when both people are comfortable waiting. Set a norm, things get addressed within 24 hours unless explicitly deferred to a specific time.`,
    '4_5': `Both of you lean toward needing space, ${hiName} more significantly. Close match in pacing. The thing to name: when both of you are holding space, who comes back first? Agree on a signal or a window so it doesn't drift into distance.`,
    '5_5': `You both need significant space before conflict is possible. That prevents saying things you don't mean, but also means things can sit for too long. Agree to a timeout protocol with a return time. "I need a couple hours, let's come back at 8pm" is not avoidance. Open-ended silence is.`,
  },

  // ── HOW YOU REPAIR (A=Formal, B=Informal) ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  repair: {
    '1_1': `You both tend toward more formal, deliberate repair. The aftermath can feel long. The shift: agree on a small signal that says "I'm not fully okay yet, but we're okay", separate from full resolution. It prevents the silence from reading as something worse.`,
    '1_2': `${loName} takes longer to recover; ${hiName} leans similar. Close match. Name what "repaired" actually means to each of you, if you don't share that definition, one person can feel resolved before the other is ready.`,
    '1_3': `${loName} recovers slowly; ${hiName} is flexible. ${hiName} can check in without forcing, "I feel okay, how are you feeling?", gives ${loName} a chance to name where they are without pressure to match.`,
    '1_4': `${loName} takes longer to recover; ${hiName} bounces back sooner. A real difference. When ${hiName} is ready to move forward, ask rather than assume, "are we good, or do you need more time?", instead of acting normal and leaving ${loName} feeling unseen.`,
    '1_5': `${loName} takes significantly longer to recover; ${hiName} moves on quickly, a meaningful gap. Agree: ${hiName} moving on first doesn't mean it's resolved. ${loName} can name a window, "I'll be ready to put this behind me by tomorrow morning", gives both something to work with.`,
    '2_2': `You both tend to take a bit of time recovering. Neither of you will push the other to perform "fine" before they are. Watch for: slow repair slipping into distance. Make sure "I need time" doesn't become indefinite.`,
    '2_3': `${loName} leans toward slower recovery; ${hiName} is flexible. ${hiName} can signal when they're ready, "I'm feeling good about where we are", without demanding ${loName} match it. Gives ${loName} information without pressure.`,
    '2_4': `${loName} tends slower; ${hiName} tends to recover more quickly. Moderate difference. Try a check-in 24 hours after conflict, "are we good?", low pressure, high information.`,
    '2_5': `${loName} tends toward slower repair; ${hiName} moves on quickly. ${hiName} can say "I'm okay, take whatever time you need" without expecting ${loName} to match the pace. That removes the silent pressure to perform recovery.`,
    '3_3': `You're both somewhere in the middle. Watch for: neither of you having a strong pull to check in, which can leave repair feeling incomplete. A "are we actually good?" the day after a hard moment helps.`,
    '3_4': `${hiName} tends to move through repair faster than ${loName}. ${loName} can communicate where they are without oversharing, "I'm still sitting with it a little, but we're okay", so ${hiName} doesn't have to guess.`,
    '3_5': `${loName} is flexible; ${hiName} moves on very quickly. ${hiName}'s quick return to normal doesn't always mean ${loName} is there yet. Check in, don't assume.`,
    '4_4': `You both tend to move through repair at a similar pace. Strong match. Watch for: assuming repair is complete when it's just quiet. A brief "I felt good about how we handled that" keeps repair explicit.`,
    '4_5': `Both of you lean toward quicker repair, ${hiName} more so. You're unlikely to carry conflict for long. When both of you move on fast, make sure you're both actually good, a check-in a day later can catch what quiet quick repair sometimes misses.`,
    '5_5': `You both repair quickly and informally. The relationship is probably resilient. Watch for: moving on so fast that something occasionally gets left slightly unresolved. "That felt resolved to me, how about you?" is worth asking sometimes.`,
  },

  // ── HOW YOU LISTEN (A=Reflective, B=Responsive) ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  listening: {
    '1_1': `You both listen by going quiet and staying with it. Neither of you rushes to respond. That makes you calm to talk to. The risk: silence can read as absence. A small signal, a nod, a short "I'm with you," tells the other you're still there.`,
    '1_2': `${loName} listens quietly and stays with it; ${hiName} leans the same way, a little more active. Close match. Just check that neither of you reads the other's quiet as checking out. A word now and then confirms you're tracking.`,
    '1_3': `${loName} listens by sitting with it; ${hiName} shifts between quiet and active. The shift: ${hiName} can name when they're just receiving versus ready to engage, so ${loName} isn't guessing which one is happening.`,
    '1_4': `${loName} takes things in quietly; ${hiName} responds, asks, reflects back. A real difference in how you each show you're listening. ${hiName}'s questions are care, not pressure. ${loName}'s quiet is attention, not distance.`,
    '1_5': `${loName} listens in silence and stays there; ${hiName} listens by engaging and drawing it out. A wide gap, and an easy one to misread. ${hiName}'s questions aren't interruption. ${loName}'s quiet isn't disinterest. Name what each of you is doing so neither has to assume.`,
    '2_2': `You both lean toward quiet listening. Low pressure, easy to talk near. The gap: when one of you wants a response rather than quiet presence, neither offers it by instinct. Ask directly when you want to be answered, not only heard.`,
    '2_3': `${loName} leans toward quiet listening; ${hiName} moves between modes. ${hiName} can match ${loName}'s pace when something is tender, and step in with questions when ${loName} wants to be drawn out.`,
    '2_4': `${loName} listens more quietly; ${hiName} engages more actively. When ${hiName} reflects back or asks, that's how they show care. When ${loName} stays quiet, that's how they stay present. Say which one you need in the moment.`,
    '2_5': `${loName} tends to receive quietly; ${hiName} engages hard, asks, fills the space. The shift: ${hiName} can leave room before jumping in, and ${loName} can offer a word so ${hiName} knows the silence is full, not empty.`,
    '3_3': `You both adjust how you listen depending on the day. That's adaptive. Watch for: in a hard moment, you each default to a mode the other didn't expect. When it matters, say what you need, presence or engagement.`,
    '3_4': `${hiName} leans more toward active listening than ${loName}. ${hiName} can carry the engagement. ${loName} can ask a question sometimes, even a small one, so the drawing-out runs both directions.`,
    '3_5': `${loName} is flexible; ${hiName} listens by engaging, reflecting, asking. ${hiName}'s questions are how they connect, not a demand for more than you have. ${loName} can meet it with a short answer rather than retreating into quiet.`,
    '4_4': `You both listen by engaging, asking, reflecting back. Conversations move. Watch for: two people responding at once crowds out the actual listening. Let one person finish and sit with it before the other steps in.`,
    '4_5': `Both of you listen actively, ${hiName} more so. You draw each other out, which keeps you current. When one of you wants to be heard and not questioned, say so. Active listening tips into problem-solving when the other just wanted presence.`,
    '5_5': `You both listen by engaging fully, asking, responding. Nothing sits unaddressed for long. The watch-out: sometimes a person needs silence and room, not questions. Build a way to say "I just want you to listen for a minute" without it landing as criticism.`,
  },

  // ── HOW LOVE LANDS (A=Words, B=Actions) ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  love: {
    '1_1': `You both feel most loved through words, sincere and specific. You can speak the same language here. The shift: keep it specific over time. "I love you" becomes ambient; "I noticed what you did yesterday and it meant a lot" stays alive.`,
    '1_2': `${loName} connects most through words; ${hiName} leans similar. Close match. When life gets busy and verbal expression drops off, both of you may start feeling less loved without knowing why. A short specific acknowledgment every few days costs almost nothing.`,
    '1_3': `${loName} feels love through words; ${hiName} is flexible. The shift: ${hiName} can default slightly more toward verbal expression when uncertain. It's low-cost and high-return for a words-oriented partner.`,
    '1_4': `${loName} connects through words; ${hiName} expresses love primarily through actions. A real difference. ${loName} can start noticing ${hiName}'s acts as the expressions of care they are. ${hiName} can add the occasional specific word, even "I'm glad you're mine" lands.`,
    '1_5': `${loName} feels love through words; ${hiName} through acts and presence. The shift: each person learns to express in the other's language, not just receive in their own. ${loName} does something. ${hiName} says something sincere.`,
    '2_2': `You both lean toward words as the primary love language. A close match. Keep the words specific over time, "I appreciate you" lands less than "I noticed how you handled that today." Specificity is what keeps verbal expression feeling real.`,
    '2_3': `${loName} leans toward words; ${hiName} is flexible. ${hiName} doesn't need to choose a lane, but paying attention to when verbal appreciation lands well for ${loName} and doing more of it deliberately matters.`,
    '2_4': `${loName} leans toward words; ${hiName} leans toward acts. Moderate difference. Spend a week noticing each other's expressions in the other's language. ${loName} tracks what ${hiName} does; ${hiName} pays attention to what ${loName} says. Noticing shifts reception.`,
    '2_5': `${loName} leans verbal; ${hiName} strongly shows love through acts, a meaningful gap. Neither is wrong, but each needs to learn to feel the other's expressions as love. ${loName} can verbalize what ${hiName} does; ${hiName} can act on what ${loName} says.`,
    '3_3': `You're both genuinely receptive to both words and acts. Flexible. Watch for: when neither of you has a strong pull, love expression can get inconsistent. Build in deliberate moments rather than leaving it to spontaneity.`,
    '3_4': `${hiName} leans more toward actions and presence. When ${hiName} does something, ${loName} can notice and name it, "thank you for that", rather than letting the act disappear unacknowledged.`,
    '3_5': `${loName} is neutral; ${hiName} feels love primarily through acts and presence. For ${hiName}, showing up and doing things is the language of care. ${loName} can practice acts of service, planning something, making something easier, even when verbal expression would feel more natural.`,
    '4_4': `You both lean toward acts and presence as expressions of care. A close match. Neither of you may say what you feel in words very often, which means the verbal thread can fade. Naming what you appreciate explicitly, occasionally, holds the relationship in the light.`,
    '4_5': `Both of you lean toward acts, ${hiName} more strongly. Good match. When both of you are very busy and the acts start slipping, neither may say anything, and the connection can fade quietly. Name when you notice it dropping.`,
    '5_5': `You both feel most loved through presence and acts of care. Strong match. Because neither of you relies heavily on words, make sure feelings get named occasionally. Even once a week, saying something sincere out loud keeps the emotional connection explicit.`,
  },

  // ── GIVING & RECEIVING FEEDBACK (A=Guarded, B=Open) ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
  feedback: {
    '1_1': `You're both guarded around feedback, which means you're unlikely to criticize each other harshly, but you may also not hear important things. Create a norm for low-stakes feedback that makes it feel less loaded. "Can I mention something?" removes the surprise before it starts.`,
    '1_2': `${loName} is very guarded around feedback; ${hiName} leans similar, slightly more open. A close match. Both of you being cautious means important things can go unnamed. Build a "low-stakes feedback" norm, short, specific, non-critical, so it doesn't feel like a big event every time.`,
    '1_3': `${loName} is guarded; ${hiName} is flexible. When ${hiName} wants to raise something, framing it as an observation helps ${loName} receive it, "I noticed X" lands better than "you did X."`,
    '1_4': `${loName} is guarded; ${hiName} is more open to giving and receiving feedback. A real difference. ${hiName} can give feedback in very small doses. One thing at a time, specifically framed, and wait. ${loName} will need time, not more information.`,
    '1_5': `${loName} is very guarded; ${hiName} is very open with feedback. A significant difference. ${hiName} can create safety by asking how ${loName} prefers to receive feedback, timing, tone, framing. People who are guarded usually have a reason; understanding it opens the conversation.`,
    '2_2': `You both lean a bit guarded. That means the relationship stays relatively conflict-free, but things that should be named sometimes don't get named. Practice low-stakes feedback on small things so that raising something doesn't always feel like a production.`,
    '2_3': `${loName} leans guarded; ${hiName} is flexible. ${hiName} can be explicit about intent, "I want to mention something, and it's not a big deal", which removes the anticipatory dread ${loName} may feel when feedback is incoming.`,
    '2_4': `${loName} leans guarded; ${hiName} leans more open. Moderate difference. ${hiName} can work on timing, feedback lands better when the temperature is low. Ask if it's a good time before starting.`,
    '2_5': `${loName} leans guarded; ${hiName} is very comfortable with direct feedback, a meaningful gap. ${hiName} needs to slow down delivery. One thing, specific, followed by silence. Not a list, not a conversation. ${loName} needs time to sit with it.`,
    '3_3': `You're both in the middle. Watch for: feedback needing to happen but neither person reaching for it. A norm: one thing each month that each person wants to mention, raised gently. Small volume, regular cadence.`,
    '3_4': `${hiName} is a bit more open to feedback. ${loName} can practice receiving ${hiName}'s feedback without responding immediately, "thanks for saying that, let me think about it" is a complete response.`,
    '3_5': `${loName} is neutral; ${hiName} is very open to feedback. ${loName} can communicate what format works best, "I'd rather you bring it up in the moment" or the opposite. Giving ${hiName} the protocol makes it easier.`,
    '4_4': `You're both open to feedback. A healthy dynamic. You can raise things without it being a production. Watch for: the openness being one-directional. Make sure raising something feels as safe as receiving it, for both of you.`,
    '4_5': `Both of you lean open, ${hiName} more so. Good match. Watch for: ${hiName}'s comfort with feedback occasionally meaning ${loName} hears more than expected. A norm around frequency and timing keeps feedback constructive rather than relentless.`,
    '5_5': `You're both very open to feedback. You can raise things and take them in without much defensiveness. Rare and genuinely valuable. The one thing to stay aware of: openness can occasionally tip into over-analyzing the relationship. Not everything needs to be examined.`,
  },
});

// One action item per dimension, ten in all, for the results-at-a-glance plan.
// The plan shows the widest-gap dimension in each domain, so these need to be
// pointed rather than generic: each names the specific mismatch and gives one
// concrete thing to do this week. {LO} and {HI} resolve to whichever partner
// sits at the low and high end of that dimension.
// DRAFT copy, in the prose approval doc.
export const DIM_ACTION_ITEMS = {
  energy: {
    title: "Say when you are running empty",
    body: "{LO} refuels alone, {HI} refuels around people. Neither of you can read the other's tank from the outside. This week, say it out loud before you hit empty, not after. One sentence: 'I need an hour on my own' or 'I need to be around people tonight.'",
  },
  expression: {
    title: "Close the gap between feeling it and saying it",
    body: "{HI} names it in the moment. {LO} works it out inside first and brings it later. The quiet is not withholding and the speed is not pressure. This week, {LO} shares one thing while it is still half-formed, and {HI} waits a beat before filling the silence.",
  },
  reassurance: {
    title: "Say where you stand without being asked",
    body: "{LO} needs it said. {HI} treats it as settled. That difference decides what a long quiet stretch means to each of you. Once this week, say it plainly and unprompted. One sentence. Notice how it lands.",
  },
  love: {
    title: "Give it in their currency, not yours",
    body: "{LO} feels it in words, {HI} feels it in what gets done. You are both showing up, in the language that reads as love to you. This week, each of you does one thing in the other's currency instead of your own.",
  },
  needs: {
    title: "Ask straight, once",
    body: "{LO} asks directly. {HI} hints, or waits to be offered. The hint is a real ask, and it is easy to miss. Once this week, {HI} asks for something outright, with no preamble and no apology, and {LO} notices the hints that were already there.",
  },
  bids: {
    title: "Catch the small ones",
    body: "{HI} reaches out obviously. {LO} reaches out quietly, and quiet bids are the ones that get missed. Once a day this week, when the other does something small for you, say what you noticed, not just thanks.",
  },
  listening: {
    title: "Say which kind of listening you want",
    body: "{LO} listens by reflecting it back. {HI} listens by helping fix it. Both are attention. Neither is what the other wants in the moment. This week, whoever is bringing something says first: 'I want you to just hear this' or 'I want help solving this.'",
  },
  conflict: {
    title: "Build a pause you both agreed to in advance",
    body: "{LO} wants it resolved now. {HI} needs space before they can think. Without a plan, the pressing reads as attack and the space reads as abandonment. Agree this week on the words for a pause and the time it ends. The person who calls it is the person who restarts it.",
  },
  repair: {
    title: "Agree on what repaired actually looks like",
    body: "{LO} needs it said out loud to feel finished. {HI} repairs through warmth and moving on. One of you can be done while the other is still waiting. This week, name what closure takes for each of you, and say it before the next disagreement, not during.",
  },
  feedback: {
    title: "Say the small thing early",
    body: "{LO} holds feedback until it matters enough. {HI} says it as it comes. Held-back feedback arrives heavier than it needed to be. This week, when something lands a little off, name it the same day, in one sentence, not to fight but to say it.",
  },
};

// When a domain has no meaningful gap, each domain gets its own line rather
// than one shared "keep noticing what's working" that printed twice.
export const DOMAIN_ALIGNED = {
  inner: {
    title: "Keep telling each other what is going on inside",
    body: "You process on similar rhythms, so neither of you is left guessing. That holds while life is steady. Say the quiet stuff out loud once this week anyway, so the habit is there when it is not.",
  },
  connection: {
    title: "Name what already works",
    body: "You connect in compatible currencies, which is rarer than it sounds. Once this week, tell each other one specific thing the other does that lands. Specific, not general.",
  },
  hard: {
    title: "Pressure-test it while things are calm",
    body: "You handle hard moments in similar ways, so they rarely escalate. The time to agree on what happens in a genuinely bad week is a good one. Talk it through before you need it.",
  },
};

// Derive insights from anniversary answers
// ── Insight evidence contract ────────────────────────────────────────────────
// Every insight declares what it is built from:
//   tier 1  structured  scales, picks, rankings. Exact comparison, may claim
//                       things about both partners.
//   tier 2  quoted      free text surfaced verbatim. Presents, does not interpret.
// Tier 3 (keyword inference about what free text *means*) was retired: it made
// claims the evidence could not support. Anything whose copy says "both",
// "each" or "you two" must be gated on BOTH partners having a real answer.
// Relationship Reflection insight titles describe what the answers showed
// ("You each named what you want more of"). On What Comes Next they need to be
// something a couple can actually do, so this maps each explore title to an
// instruction. Anything unmapped falls through unchanged rather than blank.
// DRAFT copy, in the prose approval doc.
export const REFLECTION_ACTION_TITLES = {
  "You're experiencing this relationship from different vantage points": "Read your overall ratings side by side and name what each of you was measuring",
  "You're not aligned on how much lightness and fun you're getting": "Plan one thing this month that is purely for fun, chosen by whoever is missing it",
  "One of you finds hard conversations easier than the other does": "Agree on how a hard conversation starts, and who gets to call for a pause",
  "You are not feeling equally connected day to day": "Pick one daily moment to protect, and hold it for two weeks",
  "You each named what you want more of": "Read your 'what you want more of' answers side by side",
  "Your five-year pictures, in your own words": "Read your five-year answers aloud to each other and mark where they overlap",
};

