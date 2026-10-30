/**
 * Customer-facing results copy, version 1.
 *
 * Snapshot of the copy as it stood on 2026-08-29, and the copy everybody is
 * served today.
 *
 * ── THIS HEADER USED TO SAY THE OPPOSITE ──────────────────────────────────
 * It said the file never changes, and that a copy edit meant a v2 which only
 * new couples would read. That stopped being true when Ellie asked for the
 * split the product actually has: "I want formatting changes and prose
 * adjustments to be applied even for couples who have already taken their
 * assessments, but responses and scoring/backend calculations should persist."
 *
 * api/_lib/results-store.js hands back the CURRENT content version rather than
 * the one stamped on the row, so results.js renders everyone from whatever is
 * newest. Editing this file is how a correction reaches people, and a header
 * telling you not to was describing a path nothing has taken for months. See
 * api/_lib/content-version.js, which has been right about this the whole time.
 *
 * ── WHAT IT COSTS, WHICH IS REAL ──────────────────────────────────────────
 * A mark is anchored by the text it was made on. Editing a sentence here
 * orphans every highlight and note anybody made on that sentence, silently:
 * the row stays in the table and nothing draws it. Run check-mark-reach after
 * a copy edit, and expect to tell somebody their highlight is gone.
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
    low:  "You both want reassurance to be shared aloud, and you tend to share freely. The risk is that vocalizing reassurance can feel casual since it happens regularly, and that may mean you don't trust that it is meaningful. Try to name the specific thing you value in each other, rather than stating general reassurances.",
    high: "You both take security as a given, so you rarely vocalize reassurances. You are both on the same page about this, which is good, but silence carries no information, so a hard stretch looks exactly like an easy one. After the next rough week, tell each other out loud how you are feeling about each other.",
  },
  energy:     "You recharge in similar ways. That makes it easy to assume the other person always wants what you want. Combat these assumptions by asking before you plan something (like a weekend) around your own preference.",
  // Direction-dependent: which pole the couple is aligned toward changes the copy.
  expression: {
    low:  "You both process emotion inwardly, which gives feelings room to settle before they're spoken. It also means nothing is pushing the harder feelings to the surface, which can lead to feelings of being disconnected. Try to ask the other about heavy feelings sometimes, even when neither of you is actively being vulnerable.",
    high: "You both process emotion out loud. Feelings are shared readily, which is good. If you're both expressing at once, be sure to pause and actively listen to your partner.",
  },
  needs: {
    low:  "You both ask directly. Needs are rarely buried, which is great. The thing to watch for is tone rather than clarity. When you're tired, directness can read sharper than you mean it. Same ask, softer.",
    high: "You both tend to hint at needs rather than asking explicitly. That keeps things gentle, but when neither of you says what you need plainly, needs are missed by both of you. Try to occasionally ask for what you need in plain words even if it feels uncomfortable.",
  },
  bids: {
    low:  "You're both reserved when it comes to small reaches for connection. This means that attempts to connect can pass unnoticed. Now and then, say out loud that you noticed the other reach for you. It is important that the person who made an attempt feels like it was noticed.",
    high: "You both usually notice each other's small reaches for connection. When you notice one, try to say so out loud. Acknowledging a bid makes your partner feel cared for, not just noticing the attempt.",
  },
  listening:  "You listen in similar ways. This works until one of you needs the other kind of listening, quiet attention or questions and a response. It is completely fine to ask your partner which kind of listening they want when they begin a discussion.",
  conflict:   "You handle conflict in similar ways. If you both engage, feelings can escalate fast. If you both step back, things can go unsaid. Try to find a happy medium together where feelings can be shared freely, while at the same time calmly and safely.",
  repair: {
    low:  "You both repair deliberately, by taking a real reset. That can increase the effectiveness of those attempts to repair, but it can also leave small, unresolved feelings that rise up in meaningful moments. It is fine to let some repairs be smaller and sooner so that you can avoid unresolved feelings.",
    high: "You both repair casually, without much ceremony. Because repair comes so naturally, it's easy to not acknowledge that intentional repair even happened. Tell each other when an apology or a reset helped you move forward.",
  },
  love:       "Love lands in similar ways for both of you, which is rare. Try to keep showing love in that shared way on purpose, rather than only out of habit.",
  feedback:   "You handle feedback in similar ways. Try to keep feedback kind and mention small things early, so that nothing turns into resentment.",
};

// SHIFTS was nested inside getDimShift and its template literals close over
// loName and hiName. At module scope those do not exist, so it becomes a
// function of the two names. Same prose, same keys.
export const SHIFTS = (loName, hiName) => ({

  // ── REASSURANCE (A=Voiced, B=Assumed) ──
  // DRAFT copy, in the prose approval doc. Every other dimension's shift
  // prose was reviewed; this one postdates that pass.
  reassurance: {
    '1_1': `You both need reassurance shared aloud, and you both share it freely. The risk is that reassurance can start to feel routine since it happens regularly, and then it may not feel meaningful. This week, try to name the specific thing you value in each other, rather than stating general reassurances.`,
    '1_2': `${loName} needs reassurance said plainly, and ${hiName} leans the same way. You are both on the same page about this, so neither of you is left waiting. The one gap is that when life gets busy, reassurance is usually the first thing to drop. Try to tie it to a fixed moment in your schedules, so it holds up during a hard week.`,
    '1_3': `${loName} needs reassurance said out loud, and ${hiName} feels steady either way. That steadiness can make reassurance feel unnecessary to ${hiName}. Telling ${loName} how you feel about them costs ${hiName} very little, and it helps ${loName} feel secure.`,
    '1_4': `${loName} needs reassurance said out loud. ${hiName} treats the relationship as settled and does not think to say so. ${hiName}'s quiet is not withholding, and ${loName}'s asking is not doubt. Once this week, ${hiName} can try to reassure ${loName} without being asked, before ${loName} has to ask.`,
    '1_5': `Reassurance matters more to one of you than the other, and that is completely fine. ${loName} needs reassurance said out loud, while ${hiName} takes the relationship's security as given. This means that a long quiet stretch can mean two completely different things to each of you. Try to agree on a small, regular way to reassure each other.`,
    '2_2': `You both like hearing reassurance, without needing much of it. Since neither of you will ask for reassurance, it can become few and far between over time. Try to reassure each other when feelings come up, not only when someone asks.`,
    '2_3': `${loName} likes reassurance said out loud, and ${hiName} is comfortable either way. There is no real strain here. Since reassuring comes more easily to ${hiName}, ${hiName} should try to be the one to offer it first sometimes.`,
    '2_4': `${loName} likes hearing reassurance, and ${hiName} assumes the relationship is secure and moves on. Try for ${hiName} to occasionally reassure ${loName} before ${loName} asks, rather than waiting to be prompted.`,
    '2_5': `${loName} wants reassurance now and then, and ${hiName} treats the relationship as steady and not in need of reassurance. ${hiName} can miss ${loName}'s need for reassurance, because ${loName} tends to ask quietly. It is completely fine for ${loName} to ask outright.`,
    '3_3': `Neither of you needs reassurance said out loud, and neither of you goes looking for it. That is a low-maintenance place to be. Issues can show up after a rough patch, when neither of you says that you are okay. After the next hard week, try to tell each other out loud that you are okay.`,
    '3_4': `${loName} feels steady either way, and ${hiName} takes the relationship's security as given. Nothing is straining, but one thing worth doing is reassuring each other during a good stretch, so those words are easier to find during a bad one.`,
    '3_5': `${loName} does not need much reassurance, and ${hiName} needs none at all. You might rarely talk about how you feel about each other. That works until something is actually wrong and neither of you can tell. Try to pick one small, regular moment where you each say how things feel between you.`,
    '4_4': `You both feel secure in the relationship and rarely say so. This is stable, but the risk is that silence carries no information, so a hard stretch looks exactly like an easy one. Once a month, try to tell each other out loud how you are feeling about each other, even when nothing prompts it.`,
    '4_5': `${loName} assumes the relationship is secure, and ${hiName} assumes so even more. Neither of you will usually bring up reassurance, and that is fine while things are steady. Try to pick one moment, like an anniversary or the start of a month, to tell each other how you feel about each other.`,
    '5_5': `You both treat security as a given, and neither of you asks for reassurance. You are both on the same page about this, but it is worth knowing that after something hard, neither of you may be the one to say that you are okay. Try to decide now which of you will say it first next time.`,
  },

  // ── ENERGY & RECHARGE (A=Inward, B=Outward) ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  energy: {
    '1_1': `You both recharge in solitude. The risk is that neither of you tells the other when you are depleted, and you just go quiet. Try to say that you are running low before you withdraw: "I need a low-key evening." Saying so keeps your partner from reading the silence as a problem between you.`,
    '1_2': `${loName} recharges alone, and ${hiName} leans the same way but is slightly more flexible. You are both on the same page about this, which is good, but the ease of spending time apart can quietly turn into less connection than you want. One shared ritual, like dinner or a walk, can help you stay connected.`,
    '1_3': `${loName} recharges in solitude; ${hiName} is genuinely flexible. Make sure ${hiName}'s flexibility doesn't always defer to ${loName}'s preference for quiet. Check in: "what do you actually want tonight?" beats assuming.`,
    '1_4': `${loName} recharges alone, and ${hiName} leans toward people and togetherness. When ${loName} needs time alone, try to say so out loud, like "I need an hour on my own," rather than going quiet. ${hiName} is less likely to read time alone as distance when the need is said out loud.`,
    '1_5': `${loName} recharges in solitude; ${hiName} genuinely energizes from being together. A real daily-life difference. Design your week intentionally, some evenings are separately yours, some are deliberately shared. Named in advance, not negotiated on the spot.`,
    '2_2': `You both lean toward quiet time to recharge, which is a good match, and you are unlikely to drain each other. The one gap is that neither of you may ask for time together when you actually need it. Sometimes one of you will have to ask for time together, even if it does not come naturally.`,
    '2_3': `${loName} leans toward quiet; ${hiName} is flexible. Ask ${hiName} what they actually want occasionally, neutral doesn't mean indifferent, and their flexibility may be quietly costing them.`,
    '2_4': `${loName} leans toward recharging alone, and ${hiName} leans toward connection. When you have both had a long day, try to say whether you need time alone or time together before acting on that need. "I need an hour to decompress" feels very different to your partner than silently withdrawing.`,
    '2_5': `${loName} tends toward quiet time, and ${hiName} genuinely gets energy from togetherness. It is important that ${hiName} does not read ${loName}'s quiet time as withdrawal. ${loName} can help by saying when they need time alone and when they are recharged and ready to reconnect.`,
    '3_3': `You are both genuinely flexible about how you recharge. That is adaptive, but it can mean connection is left to chance. When stress hits, each of you may want time alone or time together without the other knowing which. When things are hard, try asking: "Do you want company or space tonight?"`,
    '3_4': `${hiName} leans more toward needing togetherness than ${loName} does. It is completely fine for ${hiName} to say when they want company, rather than hoping ${loName} picks up on that need. ${loName} tends to assume everyone's preferences match their own.`,
    '3_5': `${loName} feels comfortable recharging alone or with people, and ${hiName} genuinely gets energy from people and connection. ${hiName}'s need for time together is a real preference worth planning around. Try to plan regular time together, even when ${loName} would be fine either way.`,
    '4_4': `You both restore through connection and togetherness. Warm match. Give each other explicit permission to want a quiet night sometimes. It shouldn't feel like a confession when one of you needs to be alone for a bit.`,
    '4_5': `You both lean toward connection, ${hiName} more strongly. When one of you is genuinely depleted and does not have energy for togetherness, try to agree on an easy way to say so: "I'm low tonight but I'm not going anywhere."`,
    '5_5': `You both recharge through people and being together, which is a strong match in your daily energy needs. The risk is that when you are both depleted at the same time, neither of you may have the energy to show up for the other. When you are both running low, try to say so rather than both pretending to be okay.`,
  },

  // ── EMOTIONAL EXPRESSION (A=Internal, B=External) ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
  expression: {
    '1_1': `You both process internally before sharing. That keeps you from saying things you do not mean, but it also means important feelings can stay unspoken for a long time. If a feeling or worry has been on your mind for more than 48 hours, try to bring it up. Even "I've been thinking about something" opens the door.`,
    '1_2': `${loName} strongly processes feelings internally, and ${hiName} leans the same way. Neither of you rushes to say what you feel, which means feelings can slowly go unsaid because neither of you asked. A regular check-in, like "anything on your mind this week?", gives you both a chance to share.`,
    '1_3': `${loName} processes feelings privately, and ${hiName} is flexible. ${loName} can trust that sharing a feeling before it is fully worked out will not make them look uncertain. Sharing early helps ${hiName} feel included in what is actually going on.`,
    '1_4': `${loName} goes internal; ${hiName} tends toward sharing. A real difference. ${loName} can offer an interim signal, "I'm processing something, I'll bring it up when I have words", so ${hiName} doesn't fill the silence with their own interpretation.`,
    '1_5': `${loName} is very private in processing; ${hiName} processes by talking it through. One of the most common expression mismatches. The shift: agree that ${hiName} gets to think out loud without it being a finished position, and ${loName} gets time before being expected to respond.`,
    '2_2': `You both tend to work through things privately. That keeps things calm, but means significant things can sit unspoken too long. Make it easy to say "I've been sitting with something" without needing to be fully ready to explain.`,
    '2_3': `${loName} leans private; ${hiName} is flexible. Don't let ${hiName}'s flexibility become the default that always gives way. Check in on what ${hiName} actually wants to share, rather than only what they're willing to hold.`,
    '2_4': `${loName} leans internal; ${hiName} leans toward sharing. ${loName} may often appear fine when they're not. Agree that "I need to think about this" means "I'll come back to you", not "nothing's wrong."`,
    '2_5': `${loName} tends inward; ${hiName} processes externally. The shift: ${hiName} may share unfinished thoughts, which can feel like oversharing to ${loName}. Agree that thinking out loud is allowed and doesn't require an immediate response.`,
    '3_3': `You're both flexible on expression, can hold or share depending on the day. That's adaptive. Watch for: when something actually needs saying, the flexibility can become avoidance. Make it easy for either person to say "I need to talk about something."`,
    '3_4': `${hiName} leans more toward sharing feelings than ${loName}, so ${hiName} may feel like they start most of the conversations about how things are going. ${loName} can try to start those conversations sometimes, even when nothing is wrong.`,
    '3_5': `When it comes to keeping feelings in or sharing them, ${loName} is relatively neutral, and ${hiName} genuinely processes out loud and needs to share. Try to give ${hiName} room to think aloud, without ${loName} treating every word as a final decision. Thinking something through out loud is not the same as deciding.`,
    '4_4': `You both lean toward sharing rather than holding. The relationship is verbally expressive. Watch for: both of you sharing at once without one person listening. Practice one person speaking while the other actively receives, especially when things are charged.`,
    '4_5': `Both lean external, ${hiName} more so. You're likely to talk things through, which is healthy. When both of you are processing out loud at the same time, the volume can get high. Take turns more deliberately when things are tense.`,
    '5_5': `You both process very externally, feelings are out, usually in real time. That makes you readable to each other. The shift: because both of you share readily, the emotional volume can escalate quickly. Slowing down, speaking quieter, not louder, is the most useful skill here.`,
  },

  // ── HOW YOU ASK FOR WHAT YOU NEED (A=Direct, B=Indirect) ───────────────────────────────────────────────────────────────────────────────────────────────────────
  needs: {
    '1_1': `You both tend to ask for what you need directly. That's a genuine gift, the relationship doesn't carry much guesswork. The shift over time: make sure directness stays a request and doesn't become a demand. Tone and flexibility around the ask matters as much as saying it.`,
    '1_2': `${loName} is very direct; ${hiName} leans similarly. Close match. Watch for ${hiName} occasionally holding back something they'd normally say directly. Check in: "anything you've been wanting to bring up?"`,
    '1_3': `${loName} asks directly; ${hiName} is flexible. ${hiName} doesn't always have to match ${loName}'s directness, but can practice being a bit more explicit when something is needed.`,
    '1_4': `${loName} asks directly for what they need, and ${hiName} tends to hint rather than ask, which is a real difference. When something seems wrong, ${loName} can ask "what do you need right now?" That question gives ${hiName} an opening without ${hiName} having to ask first.`,
    '1_5': `${loName} states needs directly, and ${hiName} tends to hint. This difference can lead to ${hiName} feeling "you should just know" and ${loName} feeling "just tell me what you want." ${loName} can gently show what a direct ask sounds like, "I'd love X, what about you?", so ${hiName} feels safe asking directly too.`,
    '2_2': `You both lean toward direct communication about needs. Good match. Watch for: when someone is close to asking but holds back because they don't want to seem demanding. Make it explicit that asking directly is always welcome here.`,
    '2_3': `${loName} leans direct; ${hiName} is flexible. ${hiName} can be encouraged to name what they want rather than wait. "What would make this easier for you?" creates the opening.`,
    '2_4': `${loName} leans toward asking directly, and ${hiName} tends to hint. When ${loName} misses one of ${hiName}'s hints, ${hiName} can try saying "I was hoping you'd offer to…", which names the need without blaming ${loName}.`,
    '2_5': `${loName} leans direct; ${hiName} is very indirect. The gap can create frustration on both sides. ${loName} can help by asking specifically, "is there something you need from me today?", which removes the burden from ${hiName} of deciding whether to ask.`,
    '3_3': `When it comes to asking directly or hinting, you both are relatively neutral. Watch for needs being missed because neither of you said them out loud. A weekly "what do you need from me this week?" is a simple way to keep needs from being missed.`,
    '3_4': `${hiName} tends to hint at needs a bit more than ${loName}. Rather than waiting, ${loName} can say what they notice, like "it sounds like you need X." That makes it easier for ${hiName} to go from hinting to asking.`,
    '3_5': `When it comes to asking directly or hinting, ${loName} is relatively neutral, and ${hiName} tends to hint. ${hiName} does not have to change their style completely, but practicing one direct ask a week, on something small, makes ${hiName}'s hints easier to understand when they matter.`,
    '4_4': `You both tend to hint at needs rather than asking directly. That works when you are closely in tune, but it also means needs can go unmet because neither of you said them out loud. Once a week, try to name one thing you need from each other, in plain words.`,
    '4_5': `Both of you lean indirect, ${hiName} more so. You're probably well-matched in not wanting to impose, but that same quality can mean needs go unspoken. Agree on a norm: "I should just tell you" is allowed and encouraged.`,
    '5_5': `You both tend to hint at needs rather than stating them, which shows real care, since you are both trying not to burden each other. The concern is that needs might quietly go unmet. Try to build a weekly "what do you need?" into your routine. A regular question makes asking feel less heavy.`,
  },

  // ── RESPONDING TO BIDS (A=Subtle, B=Expressive) ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  bids: {
    '1_1': `You're both on the reserved end, fewer bids, quieter reaching. The relationship is probably stable but low-key. The shift: increase bid volume deliberately. Share a thought, ask a small question, notice something out loud. Connection is built in those tiny moments more than the big ones.`,
    '1_2': `${loName} is very reserved, and ${hiName} is a bit more open. You are close here, but you probably reach for each other less often than you could. Try to create more small moments of connection on purpose, like sharing small things, even when they feel insignificant.`,
    '1_3': `${loName} is reserved, and ${hiName} sits between reserved and open. ${hiName} can start noticing and saying when ${loName} reaches for connection, like "you seemed like you wanted to say something earlier." That makes it easier for ${loName} to reach again.`,
    '1_4': `${loName} tends quiet in reaching for connection; ${hiName} is more responsive and attuned. The shift: ${loName} can practice making the smallest version of a bid, sending a link, sharing an observation, without expecting more than a nod.`,
    '1_5': `${loName} rarely bids for connection; ${hiName} is very attuned and responsive, a real gap. The shift: ${loName} can start with the simplest thing, showing ${hiName} something, sharing a minor thought. A bid for connection can be obvious or low-key, but both matter.`,
    '2_2': `You both lean quieter in how you reach for each other. Warm but not loudly expressive. Agree to initiate at least one small connection moment per day, a specific question, a brief check-in. Build it into the routine rather than leaving it to chance.`,
    '2_3': `${loName} leans reserved; ${hiName} is flexible. ${hiName} can make it easier to respond to ${loName}'s bids by acknowledging them explicitly, "you mentioned X earlier, tell me more", signals that ${loName}'s reaching is always welcome.`,
    '2_4': `${loName} tends to be quieter, and ${hiName} is more tuned in to small moments. ${loName} can become more aware of how ${hiName} reaches for connection, and try to respond to those attempts on purpose, even small ones.`,
    '2_5': `${loName} leans reserved, and ${hiName} is highly responsive, so ${hiName} may feel like they are always the one reaching for connection. ${loName} can pick one small way of reaching out and practice it regularly, like asking about ${hiName}'s day or noticing something they did. It does not have to be a big gesture.`,
    '3_3': `When it comes to reaching for each other quietly or openly, you both are relatively neutral. That works, but it can mean neither of you reaches for the other reliably. Try to plan small moments of connection on purpose, rather than waiting until you feel like it.`,
    '3_4': `${hiName} is more tuned to small moments than ${loName}. ${loName} can practice responding explicitly when ${hiName} bids, even a "I noticed that", makes ${hiName} feel seen.`,
    '3_5': `When it comes to reaching for each other quietly or openly, ${loName} is relatively neutral, and ${hiName} is very tuned in and responsive. ${hiName} genuinely values these small moments, and ${loName} can try to create more of them, even when ${loName} would not usually think about it. A small moment does not take much, but it means a lot to ${hiName}.`,
    '4_4': `You are both responsive to each other, which builds a warm, attentive relationship. Watch for times when one of you is distracted, because the other might feel it strongly. It is completely fine to say so: "I feel like I haven't had your attention today."`,
    '4_5': `Both of you lean toward presence and responsiveness, ${hiName} slightly more. Good match. When ${loName} is genuinely depleted and doesn't feel like connecting, build in an easy signal: "I need 20 minutes", not rejection, just recharge.`,
    '5_5': `You are both highly tuned in and responsive, and the relationship probably feels warm and connected. Because you both reach for connection so readily, try to occasionally ask each other whether the amount of reaching feels right. Too much can sometimes feel like pressure rather than warmth.`,
  },

  // ── CONFLICT STYLE (A=Engage, B=Withdraw) ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  conflict: {
    '1_1': `You both move toward resolution quickly. That keeps things from festering, but when both of you are ready to engage before one has fully settled, words can come out sharper than intended. A short pause, even 10 minutes, can change the tone without losing momentum.`,
    '1_2': `${loName} addresses things quickly; ${hiName} leans similar. Close match. Watch for: moving so fast toward resolution that one of you doesn't fully share what happened before you're onto "what do we do." Ask questions and listen for "here's what I felt" before jumping to fix things.`,
    '1_3': `${loName} moves toward resolving disagreements quickly, and ${hiName} is flexible. ${hiName} can try to say when they are ready to talk. That helps ${loName} not feel like they carry the weight of bringing things up.`,
    '1_4': `${loName} addresses disagreements quickly, and ${hiName} tends to need more time. This may be a point of tension for the relationship. Try to agree in advance that when ${hiName} asks for time, ${loName} can ask "when should we come back to this?", which turns the space into a plan.`,
    '1_5': `${loName} wants to resolve disagreements quickly, and ${hiName} needs significant space first. This is one of the most common differences in how couples handle conflict. In a calm moment, try to talk about how one of you pushes to resolve while the other needs space. Then agree that ${hiName} will name a specific time to resume the conversation, and ${loName} can trust that as a promise and not avoidance.`,
    '2_2': `You both lean toward addressing things sooner rather than later. That keeps the relationship clear. Watch for: moving quickly into the conversation before one of you is actually ready. "Ready to talk" doesn't mean "ready to resolve", it's okay to share and still feel unsettled.`,
    '2_3': `${loName} leans toward resolving disagreements quickly, and ${hiName} is flexible. ${hiName} can try to say when they are ready to talk, so that ${loName} is not always the one who starts the conversation.`,
    '2_4': `${loName} leans toward resolving; ${hiName} leans toward needing space. Moderate difference. ${loName} can make it easier for ${hiName} to come back, "I'm not going anywhere, let me know when you're ready", removes the urgency that makes space harder to take.`,
    '2_5': `${loName} tends toward resolution; ${hiName} needs significant time. The shift: ${hiName} commits to a specific return time when asking for space. That gives ${loName} something to hold, and prevents open-ended silence from feeling like withdrawal.`,
    '3_3': `You're both flexible on timing. That's adaptive. Watch for: neither of you pushing to address something that should be addressed. Make it easy for either person to say "I'm ready to talk about that thing from earlier", the opening shouldn't always come from the same person.`,
    '3_4': `${hiName} needs a bit more time than ${loName} does. ${loName} can signal readiness without pushing, "whenever you're ready, I'm here", rather than waiting in silence or asking repeatedly.`,
    '3_5': `When it comes to engaging or withdrawing, ${loName} is relatively neutral, and ${hiName} strongly needs space before talking. ${hiName} can share why time matters, which is often about saying things more accurately rather than avoiding the conversation. That helps ${loName} understand that the delay is not rejection.`,
    '4_4': `You both tend to need some time before resolving. A compatible match. The risk is that "some space" can quietly stretch into avoidance when both people are comfortable waiting. Set a norm, things get addressed within 24 hours unless explicitly deferred to a specific time.`,
    '4_5': `Both of you lean toward needing space, ${hiName} more significantly. Close match in pacing. It is worth deciding, when you are both giving each other room, who comes back first? Agree on a signal or a window so it doesn't drift into distance.`,
    '5_5': `You both need significant space before conflict is possible. That prevents saying things you don't mean, but also means things can sit for too long. Agree to a timeout protocol with a return time. "I need a couple hours, let's come back at 8pm" is not avoidance. Open-ended silence is.`,
  },

  // ── HOW YOU REPAIR (A=Formal, B=Informal) ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  repair: {
    '1_1': `You both tend to repair in a formal, deliberate way, which can make the time after a disagreement feel long. Try to agree on a small signal that says "I'm not fully okay yet, but we're okay", separate from fully resolving things. That signal keeps the silence from feeling like something worse.`,
    '1_2': `${loName} takes longer to recover; ${hiName} leans similar. Close match. Name what "repaired" actually means to each of you, if you don't share that definition, one person can feel resolved before the other is ready.`,
    '1_3': `${loName} recovers slowly; ${hiName} is flexible. ${hiName} can check in without forcing, "I feel okay, how are you feeling?", gives ${loName} a chance to name where they are without pressure to match.`,
    '1_4': `${loName} takes longer to recover; ${hiName} bounces back sooner. A real difference. When ${hiName} is ready to move forward, ask rather than assume, "are we good, or do you need more time?", instead of acting normal and leaving ${loName} feeling unseen.`,
    '1_5': `${loName} takes much longer to recover after a disagreement, and ${hiName} moves on quickly. This is a noteworthy gap. Try to agree that ${hiName} moving on first does not mean the disagreement is resolved. It is completely fine for ${loName} to name a time, like "I'll be ready to put this behind me by tomorrow morning", which gives you both something to work with.`,
    '2_2': `You both tend to take a bit of time recovering. Neither of you will push the other to perform "fine" before they are. Watch for: slow repair slipping into distance. Make sure "I need time" doesn't become indefinite.`,
    '2_3': `${loName} leans toward slower recovery; ${hiName} is flexible. ${hiName} can signal when they're ready, "I'm feeling good about where we are", without demanding ${loName} match it. Gives ${loName} information without pressure.`,
    '2_4': `${loName} tends to recover more slowly, and ${hiName} tends to recover more quickly. Try checking in 24 hours after a disagreement with "are we good?" The question is small, but it can tell you a lot about how your partner is feeling.`,
    '2_5': `${loName} tends toward slower repair; ${hiName} moves on quickly. ${hiName} can say "I'm okay, take whatever time you need" without expecting ${loName} to match the pace. That removes the silent pressure to perform recovery.`,
    '3_3': `When it comes to repairing formally or informally, you both are relatively neutral. Watch for times when neither of you feels a strong pull to check in, which can leave repair feeling incomplete. Asking "are we actually good?" the day after a hard moment can help.`,
    '3_4': `${hiName} tends to move through repair faster than ${loName}. ${loName} can communicate where they are without oversharing, "I'm still sitting with it a little, but we're okay", so ${hiName} doesn't have to guess.`,
    '3_5': `${loName} is flexible, and ${hiName} moves on very quickly after a disagreement. ${hiName} feeling back to normal does not always mean ${loName} is there yet. ${hiName} can try to ask ${loName} whether they are okay, rather than assuming.`,
    '4_4': `You both tend to move through repair at a similar pace. Strong match. Watch for: assuming repair is complete when it's just quiet. A brief "I felt good about how we handled that" keeps repair explicit.`,
    '4_5': `Both of you lean toward quicker repair, ${hiName} more so. You're unlikely to carry conflict for long. When both of you move on fast, make sure you're both actually good, a check-in a day later can catch what quiet quick repair sometimes misses.`,
    '5_5': `You both repair quickly and informally. The relationship is probably resilient. Watch for: moving on so fast that something occasionally gets left slightly unresolved. "That felt resolved to me, how about you?" is worth asking sometimes.`,
  },

  // ── HOW YOU LISTEN (A=Reflective, B=Responsive) ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  listening: {
    '1_1': `You both listen by going quiet and staying with what your partner is saying. Neither of you rushes to respond, which makes you calm to talk to. The risk is that silence can feel like you are not paying attention. A small signal, like a nod or a short "I'm with you," tells your partner you are still there.`,
    '1_2': `${loName} listens quietly and stays with what is being said, and ${hiName} leans the same way, a little more actively. You are both on the same page about this, which is good. Try to make sure neither of you reads the other's quiet as not paying attention. A word now and then shows you are following along.`,
    '1_3': `${loName} listens by quietly taking in what they hear, and ${hiName} moves between quiet listening and asking questions. ${hiName} can try to say when they are just taking something in and when they are ready to respond, so ${loName} does not have to guess.`,
    '1_4': `${loName} takes things in quietly; ${hiName} responds, asks, reflects back. A real difference in how you each show you're listening. ${hiName}'s questions are care, not pressure. ${loName}'s quiet is attention, not distance.`,
    '1_5': `${loName} listens in silence, and ${hiName} listens by asking questions and drawing their partner out. These orientations are easy to misread. ${hiName}'s questions are not interruptions, and ${loName}'s quiet is not disinterest. Try to tell each other how you listen, so neither of you has to assume.`,
    '2_2': `You both lean toward quiet listening. Low pressure, easy to talk near. The gap: when one of you wants a response rather than quiet presence, neither offers it by instinct. Ask directly when you want to be answered, not only heard.`,
    '2_3': `${loName} leans toward quiet listening; ${hiName} moves between modes. ${hiName} can match ${loName}'s pace when something is tender, and step in with questions when ${loName} wants to be drawn out.`,
    '2_4': `${loName} listens more quietly; ${hiName} engages more actively. When ${hiName} reflects back or asks, that's how they show care. When ${loName} stays quiet, that's how they stay present. Say which one you need in the moment.`,
    '2_5': `${loName} tends to receive quietly; ${hiName} engages hard, asks, fills the space. The shift: ${hiName} can leave room before jumping in, and ${loName} can offer a word so ${hiName} knows the silence is full, not empty.`,
    '3_3': `You both change how you listen depending on the day, which is adaptive. Watch for hard moments, when each of you may fall back on quiet listening or on asking questions, and your partner may not expect which. When it matters, it is completely fine to say what you need: quiet attention, or questions and a response.`,
    '3_4': `${hiName} leans more toward active listening than ${loName}. ${hiName} can carry the engagement. ${loName} can ask a question sometimes, even a small one, so the drawing-out runs both directions.`,
    '3_5': `${loName} is flexible, and ${hiName} listens by asking questions and reflecting back what they hear. ${hiName}'s questions are how they connect, not a demand for more than ${loName} has to give. ${loName} can try answering those questions briefly, rather than going quiet.`,
    '4_4': `You both listen by asking questions and reflecting back what you hear, so conversations move quickly. Watch for times when you both respond at once, which can leave no room for actual listening. Try to let one person finish, and take a moment with what they said before the other responds.`,
    '4_5': `Both of you listen actively, ${hiName} more so. You draw each other out, which keeps you current. When one of you wants to be heard and not questioned, say so. Active listening tips into problem-solving when the other just wanted presence.`,
    '5_5': `You both listen by engaging fully, asking, responding. Nothing sits unaddressed for long. The risk: sometimes a person needs silence and room, not questions. Build a way to say "I just want you to listen for a minute" without it landing as criticism.`,
  },

  // ── HOW LOVE LANDS (A=Words, B=Actions) ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  love: {
    '1_1': `You both feel most loved through words, sincere and specific. You can speak the same language here. The shift: keep it specific over time. "I love you" becomes ambient; "I noticed what you did yesterday and it meant a lot" stays alive.`,
    '1_2': `${loName} connects most through words; ${hiName} leans similar. Close match. When life gets busy and verbal expression drops off, both of you may start feeling less loved without knowing why. A short specific acknowledgment every few days costs almost nothing.`,
    '1_3': `${loName} feels loved through words, and ${hiName} is flexible. When ${hiName} is unsure how to show love, ${hiName} can try to lean toward saying it out loud. Kind words take little effort and mean a lot to a partner who feels loved through words.`,
    '1_4': `${loName} connects through words; ${hiName} expresses love primarily through actions. A real difference. ${loName} can start noticing ${hiName}'s acts as the expressions of care they are. ${hiName} can add the occasional specific word, even "I'm glad you're mine" lands.`,
    '1_5': `${loName} feels love through words; ${hiName} through acts and presence. The shift: each person learns to express in the other's language, not just receive in their own. ${loName} does something. ${hiName} says something sincere.`,
    '2_2': `You both lean toward words as the primary love language. A close match. Keep the words specific over time, "I appreciate you" lands less than "I noticed how you handled that today." Specificity is what keeps verbal expression feeling real.`,
    '2_3': `${loName} leans toward words; ${hiName} is flexible. ${hiName} doesn't need to choose a lane, but paying attention to when verbal appreciation lands well for ${loName} and doing more of it deliberately matters.`,
    '2_4': `${loName} leans toward words; ${hiName} leans toward acts. Moderate difference. Spend a week noticing each other's expressions in the other's language. ${loName} tracks what ${hiName} does; ${hiName} pays attention to what ${loName} says. Noticing shifts reception.`,
    '2_5': `${loName} leans verbal; ${hiName} strongly shows love through acts, a noteworthy gap. Neither is wrong, but each needs to learn to feel the other's expressions as love. ${loName} can verbalize what ${hiName} does; ${hiName} can act on what ${loName} says.`,
    '3_3': `You both feel loved through both words and actions, which gives you flexibility. Watch for times when neither of you feels a strong pull, because showing love can become inconsistent. Try to plan moments to show love on purpose, rather than leaving them to chance.`,
    '3_4': `${hiName} leans more toward actions and presence. When ${hiName} does something, ${loName} can notice and name it, "thank you for that", rather than letting the act disappear unacknowledged.`,
    '3_5': `When it comes to showing love through words or actions, ${loName} is relatively neutral, and ${hiName} feels loved mostly through actions and being present. For ${hiName}, showing up and doing things is how care is shown. ${loName} can try doing things for ${hiName}, like planning something or making something easier, even when saying it in words would feel more natural.`,
    '4_4': `You both lean toward actions and being present as ways of showing care. You are both on the same page about this, which is good. Neither of you may say how you feel in words very often, which means words can slowly drop out of how you show love. Try to occasionally say out loud what you appreciate in each other.`,
    '4_5': `You both lean toward showing love through actions, ${hiName} more strongly, which is a good match. When you are both very busy and those actions start slipping, neither of you may say anything, and you can quietly start to feel disconnected. Try to say so when you notice those acts of care dropping off.`,
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
    '2_5': `${loName} leans guarded with feedback, and ${hiName} is very comfortable giving direct feedback. ${hiName} can try to slow down by sharing one specific thing and then giving ${loName} space, rather than a list or a long conversation. ${loName} needs time to think about the feedback.`,
    '3_3': `When it comes to being guarded or open with feedback, you both are relatively neutral. Watch for times when feedback needs to be shared but neither of you brings it up. Try making a habit of each sharing one thing a month, raised gently. Keeping it small and regular makes it easier.`,
    '3_4': `${hiName} is a bit more open to feedback. ${loName} can practice receiving ${hiName}'s feedback without responding immediately, "thanks for saying that, let me think about it" is a complete response.`,
    '3_5': `When it comes to being guarded or open with feedback, ${loName} is relatively neutral, and ${hiName} is very open to it. ${loName} can tell ${hiName} how they like to hear feedback, like "I'd rather you bring it up in the moment" or the opposite. Knowing what ${loName} prefers makes giving feedback easier for ${hiName}.`,
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
    body: "{LO} recharges alone, and {HI} recharges around people. Neither of you can tell from the outside how much energy the other has left. This week, try to say that you are running low before you are completely drained, not after. One sentence is enough: 'I need an hour on my own' or 'I need to be around people tonight.'",
  },
  expression: {
    title: "Share feelings sooner",
    body: "{HI} shares feelings in the moment. {LO} works through feelings privately first and brings them up later. {LO}'s quiet is not withholding, and {HI}'s speed is not pressure. This week, {LO} can try to share one feeling before it is fully worked out, and {HI} can try to pause before filling the silence.",
  },
  reassurance: {
    title: "Say where you stand without being asked",
    body: "{LO} needs reassurance said out loud, and {HI} treats the relationship as settled. That difference shapes what a long quiet stretch means to each of you. Once this week, try to reassure each other plainly and without being asked. One sentence is enough. Notice how it makes your partner feel.",
  },
  love: {
    title: "Show love the way your partner feels it",
    body: "{LO} feels loved through words, and {HI} feels loved through what gets done. You are both showing love in the way that feels like love to you. This week, try to each do one thing the way your partner feels love, rather than your own way.",
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
    body: "{LO} listens by reflecting back what they hear. {HI} listens by helping solve the problem. Both are ways of paying attention, but neither may be what your partner wants in the moment. This week, whoever brings something up can say first: 'I want you to just hear this' or 'I want help solving this.'",
  },
  conflict: {
    title: "Build a pause you both agreed to in advance",
    body: "{LO} wants a disagreement resolved right away. {HI} needs space before they can think clearly. Without a plan, {LO} pressing can feel like an attack, and {HI} stepping away can feel like abandonment. This week, try to agree on the words for asking for a pause and on when the pause ends. The person who asks for the pause is the one who restarts the conversation.",
  },
  repair: {
    title: "Agree on what repaired actually looks like",
    body: "{LO} needs a repair said out loud to feel finished. {HI} repairs through warmth and moving on, which means one of you can feel done while the other is still waiting. This week, try to tell each other what helps you feel a disagreement is truly over, and do it before the next disagreement, not during.",
  },
  feedback: {
    title: "Say the small thing early",
    body: "{LO} holds feedback until it matters enough. {HI} shares feedback as it comes up. Feedback that has been held back tends to feel heavier than it needed to. This week, when something bothers you a little, try to say so the same day in one sentence, not to start a fight but to let your partner know.",
  },
};

// When a domain has no meaningful gap, each domain gets its own line rather
// than one shared "keep noticing what's working" that printed twice.
export const DOMAIN_ALIGNED = {
  inner: {
    title: "Keep telling each other what is going on inside",
    body: "You process feelings at a similar pace, so neither of you is left guessing, and that works well while life is steady. This week, try to share one feeling out loud that you would usually keep to yourself, so the habit is ready for times when life is more complicated.",
  },
  connection: {
    title: "Name what already works",
    body: "You connect in compatible currencies, which is rarer than it sounds. Once this week, tell each other one specific thing the other does that lands. Specific, not general.",
  },
  hard: {
    title: "Plan for a hard week while things are calm",
    body: "You handle hard moments in similar ways, so disagreements rarely escalate. A good week is the best time to agree on what each of you needs during a genuinely bad one. Try to talk that plan through before you need it.",
  },
};

