/**
 * The workbook's long prose, for both builders.
 *
 * ── WHY THIS FILE EXISTS ──────────────────────────────────────────────────
 * Attune builds a workbook twice. api/generate-workbook.js makes the .docx
 * that the app and the website hand over; scripts/build_workbook.py makes the
 * PDF, through the container in Dockerfile.workbook that
 * api/store-workbook-pdf.js posts to.
 *
 * The dimension pages, the moments pages and the situation prompts existed
 * only in the Python. 166 prose strings that the .docx has never carried, so
 * two customers with the same results received different books depending on
 * which format they got.
 *
 * Ellie: "Everything should exist in both the .docx and the pdf."
 *
 * ── HOW THE PYTHON READS IT ───────────────────────────────────────────────
 * It cannot import JavaScript. scripts/build-workbook-prose.mjs writes
 * scripts/workbook_prose.json from this file, the Python loads that, and
 * check-workbook-prose.mjs fails the build if the two fall out of step. Same
 * arrangement as PKG_CAPS to public/_pkg-rules.js, and for the same reason.
 *
 * Edit here. The JSON is generated and the Python holds no prose of its own.
 *
 * ── THE TOKENS ────────────────────────────────────────────────────────────
 * {U} is the reader, {P} is their partner. Both builders substitute them;
 * check-copy-tokens.mjs knows about them.
 *
 * Moved verbatim out of scripts/build_workbook.py by parsing it, not by
 * retyping it, so no word changed in the move.
 */

/** What each communication dimension measures, what a small gap and a large gap feel like, and what to do about it. Keyed by the dimension keys in api/_type-engine.js. */
export const DIM_CONTENT = {
  "energy": {
    "measures": "How each of you recovers, socially, emotionally, physically. Inward: solitude recharges. Outward: connection recharges. This shapes your weekend default, how you decompress, and what a good evening looks like.",
    "closeText": "{U} and {P} recover in similar ways. This quietly removes friction, you're rarely on opposite ends after a hard week.",
    "gapText": "One of you recharges through solitude; the other through connection. After a long week, you're in very different places. Without a framework, the inward partner's need for quiet can read as withdrawal, and the outward partner's reach for people can feel exhausting.",
    "prompts": [
      "After a big social event, what does each of you need in the next 24 hours?",
      "When does one of you feel most energized, and when does the other feel most depleted?",
      "Is your current daily rhythm giving each person the kind of recovery they need?",
      "Is there anything either of you has been asking of the other that runs against their recharge style?"
    ],
    "thisWeek": "Pick one upcoming situation likely to produce different energy states, a party, a family visit, a busy week. Before it happens, name what you'll each need afterward. Then check in."
  },
  "expression": {
    "measures": "How freely each of you shares what's going on internally, not the content of feelings, but how naturally they surface. Expressive partners wear their emotional state; guarded partners process privately and share selectively.",
    "closeText": "{U} and {P} are operating in the same register. Neither tends to feel overwhelmed by too much sharing or starved by too little.",
    "gapText": "One of you shares as feelings arise; the other waits until they've processed. The expressive partner may experience the guarded one's silence as emotional unavailability. The guarded partner may experience the expressive one's openness as pressure.",
    "prompts": [
      "When something bothers you, at what point do you typically share it, immediately, after processing, or only when asked?",
      "When one of you is struggling, does the other know? Or is it usually carried privately?",
      "Is there a version of your emotional experience you share, and a version you hold back?",
      "What would feel different if either of you shared more, or less?"
    ],
    "thisWeek": "Each of you shares one thing you'd normally hold back or let pass, not something big, just something that's been sitting there. Notice what happens."
  },
  "reassurance": {
    "measures": "How each of you stays sure of where you stand. Voiced: hearing it said keeps you close. Assumed: security is the baseline and does not need confirming. This shapes what a long quiet stretch means to each of you.",
    "closeText": "{U} and {P} need reassurance in similar amounts. Neither of you is left waiting for a signal the other never thought to send.",
    "gapText": "One of you needs where you stand said out loud. The other treats it as settled and does not think to say it. The voiced partner can read the quiet as distance. The assumed partner can read the asking as doubt. Neither reading is accurate, and both feel true in the moment.",
    "prompts": [
      "When was the last time either of you wanted to hear you were okay and did not say so?",
      "What does a long quiet stretch mean to each of you?",
      "Which words land as reassurance, and which ones feel automatic?",
      "If each of you set the number, how often would it get said?"
    ],
    "thisWeek": "Once this week, say where you stand out loud without being asked for it. One sentence. Notice how it lands."
  },
  "needs": {
    "measures": "How directly each partner communicates needs, whether they ask outright or signal indirectly. Direct communicators state needs explicitly. Indirect communicators hint, hope to be noticed, or pull back.",
    "closeText": "{U} and {P} communicate needs with similar directness. There are fewer unspoken expectations, and less of the resentment that builds when needs go unnamed.",
    "gapText": "One of you asks directly; the other signals. The direct partner may feel set up to fail, they can't respond to what they can't see. The indirect partner may feel chronically unseen.",
    "prompts": [
      "Think of the last time you needed something and didn't get it. Did you ask directly, or did you signal?",
      "Is there something you've needed for a while that you haven't said clearly? What's the barrier?",
      "Do you each know what the other needs right now? Has it been said, or are you guessing?",
      "What would make it easier for each of you to ask more directly?"
    ],
    "thisWeek": "Each of you names one thing you need from the other this week, specifically, without softening. \"I need you to ___.\" Notice what it feels like to ask that clearly."
  },
  "bids": {
    "measures": "How reliably each partner notices and responds to small, everyday bids for connection, a comment, a gesture, a look. These micro-moments are the primary currency of sustained intimacy.",
    "closeText": "{U} and {P} both notice and respond naturally to each other's small bids. This is one of the strongest predictors of relationship satisfaction over time.",
    "gapText": "One partner tends to miss bids, absorbed in tasks, not naturally tracking the relational current. The other tracks them instinctively. Repeated missed bids can feel like dismissal even when none is intended.",
    "prompts": [
      "Can you think of a recent moment when one of you reached for connection and the other wasn't available?",
      "Are there ways either of you reaches for the other that get regularly missed, not out of rejection, but out of being absorbed?",
      "What's the smallest thing each of you does that signals you want the other's attention?",
      "What would it look like to be slightly more tuned in, without it feeling performative?"
    ],
    "thisWeek": "Once a day this week, when one of you makes a small bid, says something minor, reaches out physically, checks in, the other stops what they're doing and acknowledges it specifically."
  },
  "conflict": {
    "measures": "How each partner responds when something feels wrong, whether the instinct is to engage immediately or need space first. This is about timing, not care.",
    "closeText": "{U} and {P} move toward resolution with similar timing. This symmetry removes the most common friction point in conflict, the pursuer-withdrawer dynamic.",
    "gapText": "One of you needs to address things immediately; the other needs space first. Without a framework, the person who needs resolution reads the other's silence as avoidance. The person who needs space reads the other's urgency as pressure.",
    "prompts": [
      "When something is bothering you, what does your ideal next few hours look like?",
      "When one of you is clearly upset and pulls back, what does that feel like for the other? What does the other do?",
      "Is there a version of \"I need space\" that lands differently than open-ended silence?",
      "What agreement would make the next hard moment go better than the last?"
    ],
    "thisWeek": "When things are calm, not during conflict, tell each other: \"When I'm upset, what I need first is ___.\" Write it down. Refer to it next time."
  },
  "repair": {
    "measures": "What each partner needs to feel genuinely repaired after conflict. One end needs explicit verbal acknowledgment. The other can move forward once the warmth is back, without needing the formal exchange.",
    "closeText": "{U} and {P} both know what \"okay again\" feels like and reach it in similar ways. This shortens the distance between conflict and repair.",
    "gapText": "One of you considers things resolved when warmth returns. The other isn't repaired until there's been an explicit conversation. The informal partner often considers things over before the formal partner is ready.",
    "prompts": [
      "After a hard argument, what does \"okay again\" actually feel like for you? How do you know when you're there?",
      "Is there a version of your last unresolved argument where one of you thought it was resolved and the other didn't?",
      "What would a repair conversation look like that actually works for both of you?",
      "Is there a past disagreement that never fully closed? What would it take to finish it?"
    ],
    "thisWeek": "After the next friction moment, however small, check in explicitly: \"Are we actually okay, or are we both just ready to be done?\" Name the difference out loud."
  },
  "listening": {
    "measures": "How each of you shows you are listening. Reflective: you go quiet and stay with it. Responsive: you engage, ask, reflect back. Both are attention. They just look nothing alike from the outside.",
    "closeText": "{U} and {P} listen in similar ways. That works until one of you needs the other mode. Ask which one is wanted before you give it.",
    "gapText": "One of you listens by going quiet. The other listens by engaging and drawing it out. The quiet can read as absence. The questions can read as pressure. Neither is what is happening.",
    "prompts": [
      "When you bring something to each other, do you want to be heard, or do you want a response?",
      "Has either of you ever read the other's quiet as not caring, or the other's questions as pushing?",
      "In a hard moment, which do you need first: room to be heard, or active engagement?",
      "How can each of you signal which kind of listening you need in the moment?"
    ],
    "thisWeek": "Before the next hard conversation, say which one you want: presence or engagement. One sentence, before you start."
  },
  "love": {
    "measures": "How each partner most naturally gives and receives affection. Specifically: does verbal expression land most deeply, or does love register more through presence, action, and shared experience?",
    "closeText": "{U} and {P} express and receive love through compatible channels. When care is expressed in a language the other naturally receives, the signal lands without translation.",
    "gapText": "One of you feels most loved through verbal affirmation; the other through presence, touch, or shared activity. Both may be genuinely expressing love, but in a language the other doesn't fully receive.",
    "prompts": [
      "When did each of you last feel genuinely loved by the other? What was happening?",
      "What does each of you do that makes the other feel most cared for, even if it's something small?",
      "Is there something you'd like more of that you haven't said clearly?",
      "Do you each know specifically how to make the other feel appreciated?"
    ],
    "thisWeek": "Each of you asks the other: \"What's one thing I do that makes you feel really loved that I might not realize has that effect?\" Then do more of it."
  },
  "feedback": {
    "measures": "How comfortably each partner gives and receives direct, honest feedback. Guarded partners tend toward defensiveness. Open partners can engage with critical input without feeling attacked.",
    "closeText": "{U} and {P} are in a similar place on feedback. This creates a low-friction environment for honest conversations, things that need to be said, get said.",
    "gapText": "One of you avoids direct feedback; the other can engage with it. The open partner may feel like things go unsaid for too long. The guarded partner may feel like honest observations come as attacks, even when not intended that way.",
    "prompts": [
      "Is there something either of you does regularly that bothers the other that hasn't been said clearly? What's the barrier?",
      "When one of you offers a critical observation, what's the other's first instinct?",
      "Can each of you tell the other when something isn't working without it becoming a bigger thing than it needs to be?",
      "What would make honest feedback easier in both directions?"
    ],
    "thisWeek": "Identify one small thing that bothered you recently that you let go without saying anything. Bring it up briefly, specifically: \"Hey, this thing last week, can I mention it?\" Notice what happens."
  }
};

/** Six recognisable moments for a W pairing, and what each person can do in them. */
export const MOMENTS_W = {
  "hard_workday": {
    "moment": "{U} gets home from a hard day and starts unpacking it the moment they walk in: the project, the people, the frustration.",
    "happening": "{U} processes by talking. They're not asking {P} to fix it; they're making sense of the day by hearing themselves say it. Once it's said, most of it's out of their system and they can move on.",
    "not": "Don't problem-solve, don't try to redirect, don't go quiet halfway through.",
    "works": "Listen actively. Reflect back what you heard. Match their energy and ask one or two follow-up questions. The relief comes from being heard, not from being fixed.",
    "phrase": "Tell me more, what was the worst part?"
  },
  "quiet_worry": {
    "moment": "{U} has gone unusually quiet for half a day: no talking through their week, no debriefing the meeting.",
    "happening": "For {U}, silence is the signal that something is heavy enough that even the talking has stopped. They're not sulking; they're carrying something they haven't found words for yet.",
    "not": "Don't ask 'what's wrong' as a one-shot question. It lands like pressure to perform an answer.",
    "works": "Soften the entry. Sit near them without requiring conversation. Open with curiosity, not interrogation. Give them room to start when they're ready.",
    "phrase": "You've been quiet today. I'm here when you want to talk, no rush."
  },
  "during_conflict": {
    "moment": "Tension is rising. {U} is leaning in, wanting to address it now, surface the feelings, talk it through.",
    "happening": "{U} processes conflict outward. Holding it in feels worse than the conflict itself. They want to engage so the thing can move, not so it can escalate.",
    "not": "Don't go silent or ask to 'talk later' without a specific time. Open-ended pauses register as withdrawal, not space.",
    "works": "Stay engaged. If you genuinely need a beat, name it with a return time: 'I need 30 minutes, then let's pick this up.' Then come back on time.",
    "phrase": "I want to work this out with you. Give me 20 minutes to think, then I'm in."
  },
  "after_conflict": {
    "moment": "The hard part of the conversation is over. The room has cooled, but {U} is still circling, checking in, looking for closure.",
    "happening": "For {U}, repair isn't done until it's named. They need to hear that you're okay, that the two of you are okay. Warmth alone reads as 'maybe but not sure.'",
    "not": "Don't assume warmth equals resolved. Don't skip the verbal close.",
    "works": "Say it out loud, even if it feels obvious. A short, clear sentence ('we're good') does more than another hour of warmth.",
    "phrase": "We're good. I love you. We worked it out."
  },
  "wanting_closeness": {
    "moment": "{U} is reaching: sitting closer, finding excuses to be in the same room, asking what you're up to this weekend.",
    "happening": "Closeness is one of the ways {U} feels the relationship is alive. The bids look casual; the meaning behind them isn't.",
    "not": "Don't half-meet the bid. A distracted nod while you keep working reads as a no.",
    "works": "Stop what you're doing for thirty seconds. Make eye contact. Match their energy briefly, even if you're going back to your task. The bid landing matters more than how long it lands for.",
    "phrase": "Hey, hi. Come here for a sec, what's going on?"
  },
  "external_stress": {
    "moment": "{U} is dealing with something hard: a work crisis, a family thing, a deadline. They're reaching toward you for support.",
    "happening": "Under pressure, {U} reaches outward. They're not asking you to fix it; they're asking you to be present in it. Solitude is what makes the stress worse, not better.",
    "not": "Don't disappear into your own work. Don't assume they'd rather be left alone.",
    "works": "Be visibly available. Take one logistical thing off their plate without being asked, and tell them you did. Sit with them in the evening even if neither of you talks.",
    "phrase": "I've got dinner tonight. You don't have to think about it."
  }
};

/** The same six moments for an X pairing. */
export const MOMENTS_X = {
  "hard_workday": {
    "moment": "{U} gets home from a hard day, sets their bag down, and goes quiet for a while.",
    "happening": "{U} is processing internally. They're not shutting {P} out; they're getting their thoughts in order before they can say anything useful about them. The quiet IS the work.",
    "not": "Don't pepper them with questions. Don't read the silence as withdrawal. Don't assume the quiet means something is wrong with the two of you.",
    "works": "Give them 15-30 minutes of low-stimulation space. Make space without requiring conversation. They'll come find you when they're ready, and what they say will be considered.",
    "phrase": "Take the time you need. I'm around when you want to talk."
  },
  "quiet_worry": {
    "moment": "Something is clearly weighing on {U}, but they haven't said anything about it.",
    "happening": "{U} doesn't broadcast worry. They're working through it privately first. Until they've clarified what they actually think, the answer to 'what's wrong' is genuinely 'I'm not sure yet.'",
    "not": "Don't push for an answer they don't have yet. Don't translate their silence into 'they're hiding something from me.'",
    "works": "Name the observation, not the feeling. 'You've seemed off since Tuesday' lands cleanly because it's factual. Then give them space to respond on their own clock.",
    "phrase": "You've been somewhere else this week. No rush. I'm just noticing."
  },
  "during_conflict": {
    "moment": "Tension is rising. {U} wants to address it, but they're pulling on logic before feeling: facts first, framing second.",
    "happening": "{U} engages with conflict by getting the structure right. Once the logic is clear, the emotional layer becomes manageable. Skipping to feelings before the framing exists makes them feel ungrounded.",
    "not": "Don't read their focus on logic as not caring. Don't try to force the emotional layer first when they're still organizing the framing.",
    "works": "Match their sequence: agree on what the issue actually is, then surface the feelings. Both layers get covered, just in their order.",
    "phrase": "Walk me through how you're seeing it. Then I'll tell you how it lands for me."
  },
  "after_conflict": {
    "moment": "The conversation has ended. The logic is sorted out. {U} is moving forward like the thing is closed.",
    "happening": "For {U}, repair happens when the problem is solved. Once the working-through is done, they experience the thing as resolved. The verbal close-out feels redundant to them.",
    "not": "Don't assume their moving on means they don't care. Don't withhold warmth waiting for a verbal close that they don't realize you need.",
    "works": "Ask for the verbal close explicitly. They'll give it readily; they just don't realize it's missing. After that, trust that they mean it when they say it's done.",
    "phrase": "Are we good? I just want to hear you say it."
  },
  "wanting_closeness": {
    "moment": "{U} is in the same room with you, doing their own thing, but consciously near you. Not bidding, exactly. Just present.",
    "happening": "For {U}, side-by-side presence is the closeness. They don't always need conversation to feel connected; the shared space is the thing. The reading you might call 'just sitting there' is, for them, an active form of being together.",
    "not": "Don't read their quiet presence as disengagement. Don't assume they want to be left alone if they chose to be near you.",
    "works": "Receive the presence. A hand on their arm, a small acknowledgment, that's enough. Don't require a conversation to make the closeness count.",
    "phrase": "I like that you're here. We don't have to talk."
  },
  "external_stress": {
    "moment": "{U} is dealing with something hard. They're working it internally, not bringing it into the room, not asking for help.",
    "happening": "Under stress, {U} goes inward. They're not refusing support; they're running the analysis. Once they have a plan, they'll surface what's relevant. Until then, talking about it can feel like adding load, not lifting it.",
    "not": "Don't push them to talk through it. Don't take the silence as exclusion or as a sign you're not trusted.",
    "works": "Take logistical things off their plate without asking. Be visibly available without requiring engagement. Tell them after the fact that you did the thing.",
    "phrase": "I picked up groceries, one less thing. Take the night."
  }
};

/** The same six moments for a Y pairing. */
export const MOMENTS_Y = {
  "hard_workday": {
    "moment": "{U} gets home from a hard day, drops their things, and the day is on their face before any words come.",
    "happening": "{U} is feeling the day in their body before they can articulate it. The expression is honest but the words aren't ready yet. They want to be near you, not necessarily talking.",
    "not": "Don't ask 'how was your day' and expect a clean answer. Don't read the heaviness as something you caused.",
    "works": "Acknowledge what you see, then offer presence without requiring talk. 'Rough one?' lands. So does sitting nearby with no agenda. The words come later, in pieces.",
    "phrase": "You look wiped. I'm here. No talking required."
  },
  "quiet_worry": {
    "moment": "{U} has been off all week. They haven't said much, but the heaviness is there in the room.",
    "happening": "{U} feels things first and finds language for them slowly. The worry is real and present; they just haven't reached the words for it yet. They're not hiding it; they're still feeling it.",
    "not": "Don't push for specifics they don't have. Don't tell them they're being too sensitive.",
    "works": "Name what you're noticing gently. 'You've felt heavy this week' invites more than 'what's wrong.' Sit with whatever surfaces, even if it's tears before sentences.",
    "phrase": "Something's been heavy. I see it. I'm not going anywhere."
  },
  "during_conflict": {
    "moment": "Tension is rising. {U} is pulling back from the conversation, but their face hasn't gone neutral. The hurt is right there.",
    "happening": "{U} feels conflict in their body before they can think through it. They withdraw to protect the feeling, not to punish you. If they push past the withdrawal too soon, the words come out raw and wrong.",
    "not": "Don't read the withdrawal as the silent treatment. Don't push them to articulate what they're feeling before they've named it for themselves.",
    "works": "Acknowledge the feeling without demanding the explanation. 'I can see this hurt. Take what you need; we'll come back to it' gives them the room to find words.",
    "phrase": "I see this landed hard. Let's pause. I'll be here when you're ready."
  },
  "after_conflict": {
    "moment": "The hard part is over. {U} has gone quiet, but the residue is still on their face.",
    "happening": "For {U}, repair has to reach the feeling, not just the topic. Until the emotional charge has eased, they don't experience the thing as resolved, even if the issue itself is sorted.",
    "not": "Don't move on too fast. Don't assume topic-resolution equals emotional-resolution.",
    "works": "Give the feeling a name and a moment. 'That was hard for both of us' acknowledges it without re-litigating. Soft physical contact often does more than another conversation.",
    "phrase": "That was hard. I love you. Come here."
  },
  "wanting_closeness": {
    "moment": "{U} is hovering: in the same room, doing nothing in particular, looking up when you look up.",
    "happening": "{U} reaches for closeness through presence and feeling, not always through asking. The bid is in the lingering, the eye contact, the just-being-near. Saying 'come sit with me' takes more vulnerability than the gesture suggests.",
    "not": "Don't miss the soft bid because it's quiet. Don't make them ask out loud when they've already asked with their body.",
    "works": "Read the gesture. Pat the seat next to you. Make eye contact and hold it for two extra seconds. The reach was already real; you're just confirming it.",
    "phrase": "Come sit. I want you here."
  },
  "external_stress": {
    "moment": "{U} is dealing with something hard from outside the relationship. They're carrying it in their face but not bringing it into words.",
    "happening": "Under pressure, {U} goes inward emotionally. The feelings are loud internally; the expression is half-volume. They want presence and steady ground, not problem-solving.",
    "not": "Don't try to fix the outside thing. Don't take the heaviness personally.",
    "works": "Be the steady ground. Make the meals, run the warm bath, hold the routine. Touch their shoulder when you walk past. Less talk, more presence.",
    "phrase": "I've got the basics tonight. You don't have to carry anything else."
  }
};

/** The same six moments for a Z pairing. */
export const MOMENTS_Z = {
  "hard_workday": {
    "moment": "{U} gets home from a hard day, follows their normal routine, and reveals nothing.",
    "happening": "{U} contains hard days. The processing happens privately and at its own pace. Performing a debrief would actually make the day worse, not better. Steady routine is how they reset.",
    "not": "Don't ask probing questions hoping to crack it open. Don't take the steadiness as a sign nothing's wrong.",
    "works": "Hold the regular rhythm. Make eye contact when they pass through the room. Trust that they'll surface what they want surfaced, on their schedule.",
    "phrase": "Glad you're home. Dinner's at seven."
  },
  "quiet_worry": {
    "moment": "Something is going on for {U}, but you'd only know it from very small cues: a shorter answer, a longer pause, a missed text.",
    "happening": "{U} keeps worry close. They aren't hiding it from you so much as managing it themselves first. By the time they speak about something, they've usually already decided how they're handling it.",
    "not": "Don't translate the small cues into a story about your relationship. Don't push for the worry before they've decided how to talk about it.",
    "works": "Stay normal. Stay attentive. A simple 'I'm here, whenever' carries more than a probing question. When they do speak, listen without trying to solve.",
    "phrase": "I noticed. I'm here whenever, no pressure."
  },
  "during_conflict": {
    "moment": "Tension is rising. {U} has gone level: voice steady, language careful, conflict approached like a problem to manage.",
    "happening": "{U} stays composed in conflict by design. The composure is the strategy: emotional flooding makes things worse, so they keep their own temperature down. Inside the calm, real feelings are still moving; they're just not on the surface.",
    "not": "Don't read the calm as not caring. Don't push for emotional volume to prove the thing matters.",
    "works": "Match the temperature. Stay specific. Resolve the concrete piece in front of you; the feelings can come later, in private. Trust that 'fine' said calmly is sometimes the most honest version they have.",
    "phrase": "Let's solve this piece. We can talk about the rest tonight."
  },
  "after_conflict": {
    "moment": "The conversation is done. {U} returns to their evening like nothing major happened.",
    "happening": "For {U}, the resolution IS moving on. Re-opening the topic to confirm warmth would feel like re-running the conflict. Their normal-ness is the closure they're offering you.",
    "not": "Don't keep checking in on whether you're 'really okay.' Don't read their normalcy as avoidance.",
    "works": "Receive the normal as the close. A small physical gesture, sitting next to them, a hand on the back, lands cleanly without re-opening anything.",
    "phrase": "Good talk. Glad we sorted it."
  },
  "wanting_closeness": {
    "moment": "{U} is doing something for you without making a thing of it: making coffee the way you like, fixing the thing on your car, sitting nearby while you're on a call.",
    "happening": "{U} offers closeness through action and steady presence. The verbal version of love is harder to reach for; the doing is the saying. If you watch what they do, the love is loud.",
    "not": "Don't miss the offering because it isn't said. Don't push for words to confirm what the actions already proved.",
    "works": "Receive the action and name what it meant: 'thanks for taking care of that, it mattered.' That kind of return is how the loop closes for them.",
    "phrase": "I noticed you did that. Thank you."
  },
  "external_stress": {
    "moment": "{U} is dealing with something hard outside the relationship. They've absorbed it and kept going. The shape of the day looks normal.",
    "happening": "Under pressure, {U} goes self-contained. Asking for help feels like adding cost, not relieving load. They'd rather hold it themselves and protect you from carrying it too.",
    "not": "Don't pry for the details. Don't make them perform reassurance that they're 'fine.'",
    "works": "Reduce ambient load without making it a transaction. Handle one normal thing without comment. Be physically present without requiring conversation. They feel supported when the friction quietly drops.",
    "phrase": "I've got tonight. You don't have to do anything."
  }
};

/**
 * The same six moments for two partners of the same type.
 *
 * ── W WAS THE ONLY ONE ────────────────────────────────────────────────────
 * MOMENTS_SHARED_W existed and XX, YY and ZZ did not. The PDF showed W's
 * words to all four, and its own comment said three more needed writing.
 * Ellie, 13 Sep: "Write them for the others."
 *
 * ── WHAT EACH TYPE IS ─────────────────────────────────────────────────────
 * From api/_type-engine.js: W engages and is open, X engages and is guarded,
 * Y withdraws and is open, Z withdraws and is guarded. A same-type pair does
 * not balance, it doubles, and that is what these are about: what two people
 * with the same wiring do to each other in a moment, and the one move that
 * breaks it.
 *
 * ── THE WORDS ARE MINE ────────────────────────────────────────────────────
 * Written to match the W set's register and length. Ellie's to edit; it is
 * R17 on her list.
 */
/** The six moments when both partners are W, where the advice differs from a mixed pair. */
export const MOMENTS_SHARED_W = {
  "hard_workday": {
    "moment": "One of you walks in mid-story. The other is also full of the day. Both have something they want to land first.",
    "happening": "Two Ws come home wanting to externalize. The talking is the processing. Neither of you has finished the day until you've said it out loud. When you both arrive full at the same time, you can talk over each other instead of taking turns.",
    "not": "Half-listening while waiting for your turn. The other person feels the half-attention and pushes harder, which makes you tune out more.",
    "works": "Whoever walks in first gets ten minutes to download. The other holds the receiving role with full attention. Then switch. The container makes the listening easier.",
    "phrase": "I need ten minutes to dump the day, then I'm yours."
  },
  "quiet_worry": {
    "moment": "One of you has gone unusually quiet. For Ws, silence at home is a flag. Something is heavy enough to interrupt the normal flow of talking.",
    "happening": "Two Ws are unusually attuned to each other's verbal patterns because both of you use words to feel okay. When one of you stops talking, the other notices fast. The risk is reading the silence wrong.",
    "not": "Filling the silence with theories. 'Are you upset with me? Did something happen?' That's interrogation, not listening.",
    "works": "Acknowledge the silence without trying to break it. Sit nearby. Make space without making demands. Let the other person come to language at their own pace.",
    "phrase": "I notice you're quiet. No pressure. I'm here when you're ready."
  },
  "during_conflict": {
    "moment": "Tension is rising. Both of you are leaning in, both of you want to address it now, both of you are talking. The volume creeps up.",
    "happening": "Ws don't want conflict to sit. You both want it surfaced and resolved. That's the strength. The risk is two engaged Ws can talk over each other, escalate together, and lose the thread of the actual fight.",
    "not": "Talking faster, louder, more. Neither of you stepping back because stepping back feels like losing. The argument is still happening but you've stopped hearing each other.",
    "works": "When the volume rises, the first one to feel it calls a 30-minute reset. Not 'we're done talking,' just a pause. Come back with the same intensity but with one specific thing to resolve.",
    "phrase": "I need 30 minutes. I'm not done, but I want to say this better."
  },
  "after_conflict": {
    "moment": "The hard part is over. You've both said what needed saying. The room is quieter, but the thing isn't quite closed yet.",
    "happening": "Both of you need verbal repair to feel done. A nod or a hug isn't enough. For Ws, the closure happens when one of you names it out loud.",
    "not": "Assuming the other is done because you're done. Or circling back into it because the relief hasn't landed yet.",
    "works": "One of you names the close. A short clear sentence. Not a recap, just a flag that you're both okay. The other confirms back.",
    "phrase": "We're good. I love you. We worked it out."
  },
  "wanting_closeness": {
    "moment": "One of you is reaching. Sitting closer, asking what the other is up to, finding excuses to be in the same room.",
    "happening": "Bids for closeness in a W-W pair often look like conversation starters. Casual questions, light topics, low-stakes ramble. The actual ask is presence, not the topic.",
    "not": "Half-meeting it. Answering the question while keeping your eyes on your screen. Two Ws can both be reaching at the same time and both miss the bid.",
    "works": "Stop what you're doing for thirty seconds. Make eye contact. Match the energy briefly. The bid landing matters more than how long it lasts.",
    "phrase": "Hey. What's going on with you right now?"
  },
  "external_stress": {
    "moment": "One of you is dealing with something hard. Work, family, a deadline. They're reaching toward the relationship, not retreating from it.",
    "happening": "Under pressure, Ws reach outward. Not to be fixed. To be present in. The risk in a W-W pair is that when you're both stressed at the same time, both of you are reaching, and neither of you is anchored.",
    "not": "Trading stress stories. Both venting at the same time, neither actually landing. You leave the conversation more wound up than you started.",
    "works": "When you're both in it, one takes the anchoring role for an hour. Listen to the other's stress fully, hold it, then switch. Sequential, not parallel.",
    "phrase": "Yours first tonight. I want to hear it before I bring mine in."
  }
};

/** The six moments for two Xs. See the note above MOMENTS_SHARED_W. */
export const MOMENTS_SHARED_X = {
  "hard_workday": {
    "moment": "Both of you are home. Both of you had a day. The kitchen gets tidied, the mail gets opened, and neither of you says what the day was like.",
    "happening": "Xs come toward each other and hold the inside back. Two of you together means two people who want the company and do not volunteer the content. Being in the same room reads as connection, so the day goes unsaid and nobody notices it has.",
    "not": "Waiting for the other person to open first. Both of you are doing it, so nobody does.",
    "works": "One direct question with a specific answer in it. Not 'how was your day' but 'what was the worst part of today'. Xs answer a question readily. What you do not do is start.",
    "phrase": "What was the worst ten minutes of your day?"
  },
  "quiet_worry": {
    "moment": "One of you is carrying something. The routine is normal. Dinner happens. Nothing looks wrong, and something is.",
    "happening": "An X under strain gets busier and more available, not quieter. Two Xs can both be managing something privately while being perfectly pleasant to each other, for weeks.",
    "not": "Reading the normal behaviour as proof that nothing is wrong. For an X it is not evidence either way.",
    "works": "Ask about the thing rather than the mood. 'How is the thing with your sister' gets an answer. 'Are you okay' gets a yes.",
    "phrase": "I'm not asking how you are. I'm asking what's on your mind."
  },
  "during_conflict": {
    "moment": "You are both in it, and you are both being reasonable. The voices stay level. The point keeps not landing.",
    "happening": "Xs engage with a disagreement and keep the feeling out of it. Two of you can argue the facts for an hour without either of you saying what actually hurt, which is why it does not resolve.",
    "not": "Winning the logic. You can both be right about the facts and neither of you has said the true thing yet.",
    "works": "One of you names the feeling first, out loud, without justifying it. It will feel disproportionate to say. It is the part the other one cannot guess.",
    "phrase": "Before we go further: this one landed harder than it should have, and I want to say why."
  },
  "after_conflict": {
    "moment": "It is finished. You are both being kind. Neither of you has mentioned it since.",
    "happening": "Xs repair through behaviour. Coffee gets made, the plan gets kept, the tone is warm. Two Xs can both feel repaired without either of you knowing the other does.",
    "not": "Assuming the warmth means it is closed for both of you. It might be closed for one.",
    "works": "Say the sentence anyway, even though it feels redundant. Behaviour is how you repair; words are how you check.",
    "phrase": "Are we actually done with that, or just being nice about it?"
  },
  "wanting_closeness": {
    "moment": "One of you keeps ending up in the same room. Sitting nearby. Suggesting something to do together.",
    "happening": "An X asks for closeness by doing rather than saying. Two Xs get a lot of shared activity and not much stated wanting, and either of you can end up unsure whether you were chosen or just nearby.",
    "not": "Adding another activity. More proximity does not answer the question that is actually being asked.",
    "works": "Name the wanting once, plainly. It is the thing neither of you does by default, and it is the only thing that answers it.",
    "phrase": "I don't want to do anything. I just want to be with you."
  },
  "external_stress": {
    "moment": "Something outside the relationship is pressing on one of you. A deadline, a diagnosis, a family thing. Life at home carries on looking ordinary.",
    "happening": "Under pressure an X takes on more, tightens up and stays present. Two Xs both do it, so the household runs beautifully and nobody has said they are struggling.",
    "not": "Matching their competence with your own. Two people coping well is two people alone.",
    "works": "Drop one thing deliberately and say you are dropping it. It gives the other person permission they will not ask for.",
    "phrase": "I'm not doing dinner tonight. I'm at capacity, and I wanted you to know rather than guess."
  }
};

/** The six moments for two Ys. See the note above MOMENTS_SHARED_W. */
export const MOMENTS_SHARED_Y = {
  "hard_workday": {
    "moment": "You both come in and go quiet. Separate rooms, or the same room with a wall up. Neither of you has said a word about the day.",
    "happening": "Ys need to come down before they can talk, and then they talk honestly. Two of you means two people decompressing at once, and the honest conversation keeps getting postponed because neither of you is ready at the same time.",
    "not": "Reading the other person's retreat as being shut out. It is recovery, and it ends.",
    "works": "Agree the time rather than the topic. 'After dinner' beats waiting for the moment to arrive, because for two Ys it often does not.",
    "phrase": "I'm not ready yet. Nine o'clock, and I'll tell you the whole thing."
  },
  "quiet_worry": {
    "moment": "One of you is somewhere else. Present in the room, not in the conversation. It has been a few days.",
    "happening": "A Y goes inward first and says it fully later. Two Ys can both be inward at once, and the silence stops registering as unusual because it is what the house normally sounds like.",
    "not": "Waiting for it to surface on its own. In a Y-Y pair the normal amount of quiet hides a lot.",
    "works": "Ask once, directly, and then leave it with them. A Y will not answer on demand and will almost always come back to it.",
    "phrase": "Something's been sitting with you. I'm not asking now. I'm telling you I noticed."
  },
  "during_conflict": {
    "moment": "It got sharp. One of you has stopped talking. Then the other one does too.",
    "happening": "Ys pull back to think rather than to punish. When you both do it, the conversation ends without ending, and two people sit in separate rooms rehearsing the honest version they would say if the other one asked.",
    "not": "Treating the withdrawal as the end of the conversation. Neither of you means it that way, and both of you can read it that way.",
    "works": "Name the pause as a pause and put a time on it. Ys keep their word about coming back, and the promise is what stops the silence turning into distance.",
    "phrase": "I'm stopping, not leaving. Give me an hour and I'll come find you."
  },
  "after_conflict": {
    "moment": "The heat is gone. You have both been quiet for a while. It is not clear to either of you whether it is over.",
    "happening": "A Y needs the space first and the conversation second. Two Ys get the space right and skip the conversation, so the thing looks resolved and is only paused.",
    "not": "Letting the calm stand in for the repair. Quiet is where a Y recovers, not where a Y closes things.",
    "works": "Come back to it once, briefly, when you are both level. It does not need to be long. It needs to happen.",
    "phrase": "I'm past it now. Can we say the last bit out loud so it's actually finished?"
  },
  "wanting_closeness": {
    "moment": "One of you has come looking. Not for a conversation. For the other person to be there.",
    "happening": "A Y reaching is a bigger move than it looks, because the default is inward. Two Ys can both want closeness at the same time and both wait, each reading the other's quiet as not now.",
    "not": "Deciding from their stillness that they want to be left alone. Sometimes it is the opposite and neither of you will say so first.",
    "works": "Make the small move without explaining it. Sit down next to them. Ys respond to presence faster than to a question.",
    "phrase": "Not doing anything. Just sitting here with you."
  },
  "external_stress": {
    "moment": "One of you is under real pressure from outside. The house has gone very quiet.",
    "happening": "Ys handle strain by going in and then telling you the truth about it afterwards. When you are both under it, both of you go in, and the telling can be a long time coming.",
    "not": "Protecting each other with silence. It is well meant and it leaves two people carrying things alone in the same house.",
    "works": "Say the headline now and the detail later. A Y does not need to explain to say something is heavy.",
    "phrase": "Short version: this week is bad. I'll tell you properly on Sunday."
  }
};

/** The six moments for two Zs. See the note above MOMENTS_SHARED_W. */
export const MOMENTS_SHARED_Z = {
  "hard_workday": {
    "moment": "Both of you are home, both of you had a day, and the evening passes without either of you saying anything about it.",
    "happening": "Zs take space and keep the inside in. Two of you means a calm house and very little information. It works for years, and then something has been unsaid long enough that neither of you knows how to start.",
    "not": "Taking the peace as proof that you are fine. It is proof that you are both doing what you do.",
    "works": "Build a small habit that does not depend on either of you initiating. Same time, same question, short answer allowed. A structure carries what neither of you will start.",
    "phrase": "One thing from today. You first."
  },
  "quiet_worry": {
    "moment": "Something is wrong with one of you. There is no visible sign of it. There rarely is.",
    "happening": "A Z absorbs and keeps going. With two Zs, nothing about the surface changes when something is badly wrong, so the other person has no signal to read even if they are looking.",
    "not": "Waiting for a sign. In a Z-Z pair the sign does not come, and its absence means nothing.",
    "works": "Ask on a schedule rather than on instinct. It feels mechanical and it is the only reliable way in, because neither of you volunteers and neither of you shows it.",
    "phrase": "Checking in because it's Sunday, not because I think something's wrong. Anything I should know about?"
  },
  "during_conflict": {
    "moment": "It sharpened, and then it stopped. Nobody left the room. Nobody said anything either.",
    "happening": "Zs disengage to protect the relationship, not to punish. Two Zs shut it down almost instantly, which means the disagreement never actually happens and never actually ends.",
    "not": "Calling it resolved because it stopped. It did not resolve. It went underground, and it will come back attached to something small.",
    "works": "Put it in writing if saying it is too much. Zs will often write what they will not speak, and written is a great deal better than nothing.",
    "phrase": "I can't do this out loud right now. I'm going to write it down and give it to you tonight."
  },
  "after_conflict": {
    "moment": "A day has passed. Things are normal again. Neither of you has mentioned it.",
    "happening": "Zs repair by letting time do it. Two Zs get very good at moving on and never confirming, so the same argument can recur for years without either of you knowing it was never closed.",
    "not": "Letting normal stand in for repaired. For two Zs it always will, and it is the thing that accumulates.",
    "works": "One sentence, once, even days later. It does not have to reopen anything. It has to acknowledge that something happened.",
    "phrase": "About Tuesday. I'm not bringing it back. I just didn't want it to go unsaid."
  },
  "wanting_closeness": {
    "moment": "One of you wants to be close and has not said so. The evening looks exactly like every other evening.",
    "happening": "A Z asks for closeness in very small ways, or not at all. When both of you are Zs, the signals are small enough on both sides that they can pass each other completely.",
    "not": "Expecting to be read. Neither of you is going to catch a signal that quiet, and neither of you is failing when you miss it.",
    "works": "Make it explicit and make it easy to say yes to. A Z will accept an invitation far more readily than they will issue one.",
    "phrase": "Come sit with me for ten minutes."
  },
  "external_stress": {
    "moment": "Something hard is happening to one of you. The routine holds. Everything gets done.",
    "happening": "Under pressure a Z contracts and carries on. Two Zs under pressure produce a household that looks completely fine and two people managing alone, in the same rooms, at the same time.",
    "not": "Admiring the competence. Both of you are good at this, and being good at it is what keeps it invisible.",
    "works": "Say the fact without the feeling, which is a Z's easiest route in. 'This is happening' asks for nothing and tells the other person everything they need.",
    "phrase": "Something's going on. I don't want to talk about it yet. I wanted you to know it's there."
  }
};

/** Questions to ask each other, grouped by the situation they suit. */
export const SITUATION_PROMPTS = {
  "quiet_night": [
    "What's something you noticed this week that you didn't tell me about yet?",
    "What's one thing you're thinking about lately that I probably don't know?",
    "If you had a completely free Saturday next month, what would you actually want to do?",
    "What's a compliment about you that you don't quite believe?",
    "What's something small I could start doing that would make your weeks a little easier?"
  ],
  "after_hard_week": [
    "What was the hardest part of this week, not the busiest, the hardest?",
    "What do you need for the rest of tonight? I'll work around it.",
    "Is there anything you wish I'd noticed this week that I didn't?",
    "What would help you feel like yourself again tomorrow?",
    "Do you want to process out loud, or would distraction help more right now?"
  ],
  "one_is_off": [
    "Something feels off to me, and I'm not sure what. Do you know what it is?",
    "I'm not trying to fix anything. I just want to know what's there.",
    "If you could name one thing that's been sitting in the background, what would it be?",
    "Is it me, or is it something else? Either answer is okay.",
    "Do you want to talk now, or would it be easier later?"
  ],
  "before_hard": [
    "Before I say this, what do you need from me to hear it well?",
    "I want to talk about something hard. Can we agree we're on the same team first?",
    "This isn't urgent, but I want to bring it up when you have capacity. When's good?",
    "If this goes sideways, how do we want to come back to it?",
    "I've been sitting with something. Can I tell you what it is before we try to solve it?"
  ],
  "tired_of_logistics": [
    "What's something we used to do that I miss and haven't named?",
    "When did we last have a conversation that wasn't about the calendar?",
    "What's one thing we could take off our list this week, just to have time back?",
    "What do you actually think about, when you're not thinking about logistics?",
    "If we had one extra hour tomorrow with no obligations, how should we spend it?"
  ]
};
