/**
 * The ten couple types, and the words a couple reads about theirs.
 *
 * ── WHY THIS FILE ─────────────────────────────────────────────────────────
 * This lived in src/App.jsx, which is the website bundle. That made it
 * unreachable from anywhere else: /api/results could return the code "WX" and
 * nothing else, so the iOS app could show a couple an internal identifier and
 * no name for it.
 *
 * The two ways out of that were moving the content here or copying it into the
 * app. Copying version-pinned results copy into a second place, where nothing
 * checks the two agree, is the failure this project keeps having, and here it
 * would be prose about someone's relationship going stale rather than a label.
 *
 * So it lives here. src/App.jsx imports it, /api/results attaches it, and the
 * app renders what it is given.
 *
 * {U} and {P} are the two partners' names. Interpolation happens at the point
 * of display, because the same content is read by two people who each see
 * themselves as {U}.
 */

export const COUPLE_TYPES = [
  // ── Same-type pairings ──────────────────────────────────────────────────────
  {
    id: "WW", typeA: "W", typeB: "W",
    name: "The ignition",
    tagline: "Both reach. Both express. Connection isn't something you have to chase.",
    description: "{U} and {P} both move toward resolving conflict and both share feelings openly, which means there is a lot of warmth and emotional availability in both directions. Neither of you has to coax the other into a hard conversation or wait for a signal that it's okay to share how you feel.",
    nuance: "The risk for you two is not distance, but strong feelings feeding off each other. When you both feel something strongly, the intensity can build rather than settle. If one of you says out loud, 'I think we're both escalating things right now', that is usually enough to help you both calm down.",
    color: "#E8673A", shade: "#FFF4F0",
    famousDuos: [
      { names: "Monica & Chandler", show: "Friends", note: "Both put everything into the shared space. The warmth between them was real and visible, and occasionally required one of them to take the temperature down." },
      { names: "Eric & Tami Taylor", show: "Friday Night Lights", note: "Two people who led with feeling, turned toward each other, and built something real by doing it out loud." },
    ],
    strengths: [
      "Emotional availability is a strong suit for you two",
      "You are both readable and willing to be read",
      "You tend to avoid hard conversations less than most couples",
    ],
    stickingPoints: [
      "Two strong feelings can amplify each other",
      "Hard moments land at full force for you two",
      "Not every feeling has to be said straight away",
    ],
    patterns: [
      "{U} and {P} probably know each other's emotional state well, often before anything is said.",
      "Both partners have a lot of emotional energy, which can be wonderful and occasionally overwhelming.",
      "Arguments between you are usually not subtle. Try to make sure that what you each say in an argument is accurate, not just loud.",
    ],
    /* Behavior to try (A190): one tile above Phrases to try, and the same
       sentence in What Comes Next under Things to consider. Ellie's words. */
    behavior: "Given how alike your approaches are, you can share one rule: when you are both upset at the same time, whoever notices first says \"Let's pause for ten minutes,\" and you both come back to the conversation after.",
    tips: [
      { title: "Notice when you're amplifying each other", body: "When you both feel something strongly, each of your reactions can raise the other's, and an argument can escalate quickly. If one of you says 'we're both escalating' out loud, that can calm the argument down before it gets bigger.", phraseTry: "I think we're both escalating things right now, can we both take a breath before we keep going?" },
      { title: "Not every feeling needs an audience", body: "{U} and {P} are both expressive, but some feelings are better processed privately before being shared. Try to hold a feeling to yourself for a few minutes before you share that feeling with your partner.", phraseTry: "I need some time with this feeling before I talk about it. Give me twenty minutes." },
      { title: "Seeing each other's feelings is a gift", body: "Most couples have to guess at how each other feels. {U} and {P} don't have to. Try to appreciate being able to see each other's feelings, even when that feels uncomfortable, because that openness is what makes real closeness possible.", phraseTry: "I know this conversation is a lot right now, but I'm glad we can see how each other feels." },
    ],
  },
  {
    id: "XX", typeA: "X", typeB: "X",
    name: "The collaboration",
    tagline: "You both engage to resolve conflict, and you both tend to keep feelings private while you work through them.",
    description: "{U} and {P} both move toward resolving conflict, and both work through feelings privately before sharing them. Decisions get made and disagreements get worked through, which means the practical side of your relationship tends to run efficiently and quietly.",
    nuance: "Moving quickly to repair can mean ending an argument before the issue is actually settled. When you both move fast toward resolution, you can fix the visible problem without addressing the feelings underneath it, which means the same argument tends to come back because the real conversation happened too quickly.",
    color: "#1B5FE8", shade: "#EFF1FF",
    famousDuos: [
      { names: "Sherlock & Watson (as partners)", show: "Sherlock", note: "Two people who processed through logic and action rather than feeling. The understanding between them was real; it just ran quiet." },
      { names: "Ben Wyatt & April Ludgate", show: "Parks & Recreation", note: "Both efficient, both internally contained, both effective. They got things done without a lot of emotional weather." },
    ],
    strengths: [
      "As a unit, you are efficient decision makers",
      "Arguments tend to be structured and reasonable",
      "You often understand where the other is coming from",
    ],
    stickingPoints: [
      "Two internal processors can go too long without sharing how they feel",
      "Quick repair is not always complete repair",
      "Though you are great at logistics, emotional depth can be lost",
    ],
    patterns: [
      "{U} and {P} probably make decisions quickly, once the information is assembled. The process feels collaborative.",
      "Arguments between you tend to be structured. You can usually find your way to a logical conclusion.",
      "How a hard moment feels to each of you can get skipped in the rush to resolve the problem.",
    ],
    /* Behavior to try (A190): one tile above Phrases to try, and the same
       sentence in What Comes Next under Things to consider. Ellie's words. */
    behavior: "Given how alike your approaches are, you can both add one step before you close a disagreement: each of you says how you feel about the outcome, not only what you decided.",
    tips: [
      { title: "Check if an argument is resolved or just closed", body: "Repairing quickly is a real strength, but there is a risk of ending a conversation or apologizing before the issue is fully settled.", phraseTry: "Are we actually okay, or are we both just ready to be done?" },
      { title: "Ask about the feelings underneath the plan", body: "{U} and {P} are both comfortable talking about what to do. When you make a plan together, try to also ask how each of you feels about the plan. Talking about feelings as well as logistics can lead to a better decision for you both.", phraseTry: "How does this actually feel for you, beyond what we need to do about it?" },
      { title: "Slow down your repair sometimes", body: "Occasionally, after an argument, try to slow the repair down enough to make sure you've actually heard each other. Those extra few minutes can stop the same argument from coming back.", phraseTry: "I want to make sure we've actually heard each other on this before we move on. I'm curious about your perspective." },
    ],
  },
  {
    id: "YY", typeA: "Y", typeB: "Y",
    name: "The safe space",
    tagline: "You both need space first, and you both show your feelings openly while you take that space.",
    description: "When things get hard, {U} and {P} both withdraw before coming forward. Neither of you is avoiding the issue, but you are both taking time so the conversation you have later goes well. When you do come back together, you both bring the full weight of what you felt while you were apart.",
    nuance: "Two people who both need space can each wait a very long time for the other to come back first. That waiting can start to feel like abandonment, even when each of you is only taking time to think. Try to agree on a signal, even something small, that means 'I'm ready when you are' without needing a full conversation to get there.",
    color: "#7C3AED", shade: "#F5F0FF",
    famousDuos: [
      { names: "Carrie & Aidan", show: "Sex and the City", note: "Both needed time and space before they could come back. Neither was great at initiating the return, which made the distance feel longer than it needed to be." },
      { names: "April & Andy", show: "Parks & Recreation", note: "Both withdrew into themselves when things got hard. When they did come back, it was always real, just slow." },
    ],
    strengths: [
      "You share an instinct to step back before getting too heated",
      "Though delayed, discussions are calm and productive",
      "Neither of you takes the other's need for space personally",
    ],
    stickingPoints: [
      "Waiting for the other to reengage can feel like abandonment",
      "Taking space with no set end time can be harder than taking space with one",
      "Issues that need addressing can be put off for a long time",
    ],
    patterns: [
      "After a hard moment, {U} and {P} both tend to need time before the conversation is possible.",
      "The coming-back-together step can take longer than it needs to, because neither of you naturally initiates it.",
      "When the conversation does happen, it tends to be calmer and more complete than it would have been without the space.",
    ],
    /* Behavior to try (A190): one tile above Phrases to try, and the same
       sentence in What Comes Next under Things to consider. Ellie's words. */
    behavior: "Given how alike your approaches are, you can both give a return time whenever you step away, like \"I need until tonight.\" Whoever is ready first goes to the other and says so.",
    tips: [
      { title: "Someone has to come back first", body: "After a hard moment, both {U} and {P} tend to wait for the other to reach out. Whoever reaches out first usually gets a warmer reception than they expect, so try to be the one who reaches out.", phraseTry: "I'm ready to talk when you are. No rush, just wanted you to know." },
      { title: "Give your space an end time", body: "'I need some time' is not as useful as 'I need until tonight.' Giving a specific time to come back lets your partner stop worrying while they wait for you.", phraseTry: "I need until tonight. I'll come find you after dinner." },
      { title: "Build a low-key signal", body: "{U} and {P} don't need a full conversation to show each other that you're okay again. A small gesture, like a cup of tea or a hand on the shoulder, can say that for you.", phraseTry: "I'm okay. We're okay. Just needed a minute." },
    ],
  },
  {
    id: "ZZ", typeA: "Z", typeB: "Z",
    name: "The depth",
    tagline: "You both withdraw and keep feelings private, so much of what you feel can go unsaid.",
    description: "{U} and {P} both withdraw when things get hard and both keep feelings private. Your relationship tends to be stable, calm, and emotionally deep, but that depth is rarely said out loud, which means there is often more going on beneath the calm than either of you shows.",
    nuance: "Important things can go unsaid for a very long time. Your comfort with quiet can turn into avoidance without either of you intending it, which means the relationship can look more okay from the outside than it sometimes feels from the inside. Setting a time each week to share how you each feel matters more for you two than for most couples.",
    color: "#6B7280", shade: "#F4F5F6",
    famousDuos: [
      { names: "Mr. & Mrs. Darcy (post-wedding)", show: "Pride & Prejudice", note: "Both learned to respect the other's privacy. The understanding ran deep even when the words ran scarce." },
      { names: "Anne & Gilbert (later years)", show: "Anne of Green Gables", note: "Two internal processors who built something quiet and real together over time." },
    ],
    strengths: [
      "When either of you shares something, it is respected",
      "You both respect each other's interior life",
      "Your feelings can be heavy, even when you don't say them out loud",
    ],
    stickingPoints: [
      "Comfort with silence can become avoidance",
      "Neither of you likes to start hard conversations",
      "The relationship can appear more stable than it actually is",
    ],
    patterns: [
      "{U} and {P} probably don't have a lot of dramatic conversations. The emotional content of the relationship tends to go inward rather than outward.",
      "When something is hard, it may be days before either of you brings it up, if it gets brought up at all.",
      "The relationship is probably more stable-looking than many. Worth noting that feelings can still accumulate beneath that stability.",
    ],
    /* Behavior to try (A190): one tile above Phrases to try, and the same
       sentence in What Comes Next under Things to consider. Ellie's words. */
    behavior: "Given how alike your approaches are, it may benefit your relationship to keep a 15-minute check-in each week, and each bring one thing you have not shared yet, even if you are still working out your feelings.",
    tips: [
      { title: "Schedule a time to talk instead of waiting for one", body: "A weekly check-in, even for 15 minutes, gives you a set time to share what you would otherwise each keep to yourselves. Try to schedule the conversation that neither of you would start on your own.", phraseTry: "Can we do a quick check-in this week? Nothing heavy. I just want to know how you're actually doing." },
      { title: "Share feelings before they are fully figured out", body: "Both {U} and {P} tend to wait until a thought or feeling is fully formed before sharing. Try to practice sharing thoughts and feelings while they are still half-formed, even if that feels uncomfortable.", phraseTry: "I'm still figuring out how I feel about this, but I wanted to say it out loud anyway." },
      { title: "Name what you appreciate", body: "Reserved people often feel deeply, they just don't say it. Make a practice of saying specifically what you value about each other. The other person may not know unless you tell them.", phraseTry: "I don't say this enough, but I want you to know I really value the way you {something specific}." },
    ],
  },

  // ── Cross-type pairings ────────────────────────────────────────────────────
  {
    id: "WX", typeA: "W", typeB: "X",
    name: "The jumpstart",
    tagline: "You both engage to resolve conflict, but you differ on how openly you share feelings.",
    description: "{U} and {P} both engage to resolve conflict when things get hard, so you're pulling in the same direction. Where you differ is how openly you share: {EXP} shares feelings as they come, and {GRD} keeps them private for longer. You want the same outcome, but you take different paths to get there.",
    nuance: "{EXP} can feel like {GRD} is holding back {GRD_pos} real feelings. {GRD} can feel like too much is said out loud before there has been time to think it through. Neither of you is wrong. You simply share at different levels of openness.",
    color: "#E8673A", shade: "#FFF4F0",
    famousDuos: [
      { names: "Leslie & Ben", show: "Parks & Recreation", note: "Both wanted to get things done. One led with passion and feeling; one led with spreadsheets and caution. Together they made things actually happen." },
      { names: "Pam & Jim (later seasons)", show: "The Office", note: "Both reaching toward resolution, both committed to the relationship. The difference was how much of the working-through happened out loud versus privately." },
    ],
    strengths: [
      "You both strive for resolution",
      "{GRD} tends to think first and {EXP} tends to share first, which helps you balance each other",
      "Your relationship has warmth and steadiness",
    ],
    stickingPoints: [
      "{EXP} can feel like the one always doing the emotional work",
      "{GRD} can feel pressure to match an expressiveness that is not natural",
      "{GRD}'s private processing can feel like withholding to {EXP}",
    ],
    patterns: [
      "When something is off, {U} and {P} are usually both aware of it, but processing it at different speeds.",
      "{EXP} tends to process out loud, while {GRD} needs to think a problem through before raising it. You are having the same conversation, just coming into it in different ways.",
      "When you do talk a problem through, the conversation tends to be useful. You usually aren't fighting about whether to talk, just when.",
    ],
    /* Behavior to try (A190): one tile above Phrases to try, and the same
       sentence in What Comes Next under Things to consider. Ellie's words. */
    behavior: "Given your unique approaches, {EXP} should ask {GRD} once how something feels for {GRD_obj} and then wait for the answer, and {GRD} should try to share something, even if it's just \"I'm still figuring out how I feel about this.\"",
    tips: [
      { title: "Say whether you need to talk or think first", body: "At the start of a hard conversation, try to say 'I need to process this out loud' or 'I need to think before I talk.' That one sentence tells your partner how to support you.", phraseTry: "I need to process this out loud, bear with me. I don't have it figured out yet." },
      { title: "Guarded partner: share feelings before they are fully formed", body: "You don't have to wait until a feeling is fully formed before you share it. Saying 'I'm still figuring out how I feel about this' is a form of sharing, and that is usually exactly what {EXP} needs to hear.", phraseTry: "I'm still working through it, but I think I'm bothered by this. Not sure why yet." },
      { title: "Expressive partner: give the guarded partner room to process", body: "Pressing {GRD} to share before {GRD} is ready doesn't create connection, but it does create pressure. Try to ask once how {GRD} is feeling, and then give {GRD_obj} time to share.", phraseTry: "I can wait until you are ready to share. Thank you for being willing to talk." },
    ],
  },
  {
    id: "WY", typeA: "W", typeB: "Y",
    name: "The orbit",
    tagline: "You have different reactions to conflict, and one of you is sometimes ready to talk before the other. Recognizing that difference changes the way you react to each other.",
    description: "When things get hard, {RCH} tends to engage to resolve the issue, while {WDR} needs to withdraw first. Engaging can feel like pressure to {WDR}, and withdrawing can feel like abandonment to {RCH}. Neither is true, you are simply wired differently for when you are ready to talk.",
    nuance: "Engaging versus withdrawing is one of the most common and most solvable friction points in relationships. The answer isn't changing your instinct, but telling each other which one you tend to do before a hard moment arrives. A simple agreement, like 'I need a few hours, let's talk at 9', can break the cycle of one of you pressing while the other pulls away.",
    color: "#E8673A", shade: "#FCE4EC",
    famousDuos: [
      { names: "Ross & Rachel", show: "Friends", note: "One wanted to resolve everything immediately; the other needed time and space first. Without the right mindset to approach it, they kept colliding at the wrong moments." },
      { names: "Carrie & Big", show: "Sex and the City", note: "She reached. He retreated. Without a language for it, the pattern was destabilizing for years. When they finally named it, things changed." },
    ],
    strengths: [
      "Friction can be easily removed for this pairing",
      "You have complementary instincts, attentive and stabilizing",
      "You can build a way of repairing after conflict that works for you both",
    ],
    stickingPoints: [
      "Urgency reads as pressure, distance reads as avoidance",
      "When one presses and the other retreats, things can escalate",
      "Repair tends to start on {RCH}'s timeline",
    ],
    patterns: [
      "When something is off, {U} and {P} are usually not in the same place at the same time. {RCH} is ready to engage. {WDR} isn't there yet.",
      "What reads as pulling away is usually just needing space to process. What reads as pressure is usually just care.",
      "The conflict clock mismatch doesn't mean one person cares more. It means you're wired differently, which requires understanding from each partner.",
    ],
    /* Behavior to try (A190): one tile above Phrases to try, and the same
       sentence in What Comes Next under Things to consider. Ellie's words. */
    behavior: "Given your unique approaches, {WDR} should try to state a timeframe before stepping away, like \"I need an hour,\" and {RCH} should respect that by leaving the conversation alone until that hour is up.",
    tips: [
      { title: "Talk about how you each handle conflict before a hard moment", body: "When you are both calm, try to tell each other what you each need during an argument. That conversation can change how the next argument goes.", phraseTry: "When I'm upset, I need a few minutes before I can talk. It's not avoidance. I'll come back." },
      { title: "Give your space an end time", body: "When {WDR} needs time, {WDR} should try to name a time to come back. 'I need an hour' is different from silence, because a set time lets {RCH} stop worrying while waiting.", phraseTry: "I need an hour. I'll be back at eight." },
      { title: "Urgency isn't pressure; silence isn't avoidance", body: "When {RCH} presses for resolution, that comes from care, not control. When {WDR} needs space, that is time to think, not avoidance. Try to say what you need in the moment, and accept that your needs are different.", phraseTry: "I know this is hard for you to sit with. I'm not gone. I'm processing. I'll be back." },
    ],
  },
  {
    id: "WZ", typeA: "W", typeB: "Z",
    name: "The opening",
    tagline: "One of you engages and shares openly, and one of you withdraws and keeps feelings private. Understanding what you each need helps bridge that gap.",
    description: "{RCH} engages to resolve conflict and shares feelings openly, while {WDR} withdraws and keeps feelings private. You differ both in conflict timing and in how openly you share, which means you have more translating to do for each other than most couples.",
    nuance: "{RCH} often doesn't know what {GRD} is feeling until long after the fact, which can feel like withholding. {GRD} often feels pressure to be emotionally open in a way that doesn't come naturally to {GRD_obj}. The most useful thing {U} and {P} can do is see this gap as a difference, not a deficiency.",
    color: "#E8673A", shade: "#FFF4F0",
    famousDuos: [
      { names: "Elizabeth & Philip Mountbatten (early years)", show: "The Crown", note: "Wildly different in emotional register and expression. The relationship survived because both parties kept choosing it, gaps and all." },
      { names: "Hannah & Adam", show: "Girls", note: "One always needed more contact; the other needed to disappear first. The difficulty wasn't incompatibility, it was the gap between their stress responses." },
    ],
    strengths: [
      "Together, you encourage emotional safety and depth",
      "Genuine feelings are received well between you",
      "You have learned to stretch toward each other",
    ],
    stickingPoints: [
      "{RCH} can feel like the one always making the first move",
      "{GRD} can feel pressure to match an expressiveness that is not natural",
      "What {U} means and what {P} hears can differ",
    ],
    patterns: [
      "{U} and {P} sometimes find that what one of you means is not quite what the other hears.",
      "Understanding each other has taken real effort, and usually more conversation than you'd expect.",
      "When {U} and {P} are communicating well, it's because you're both actively working to understand each other, rather than assuming you already do.",
    ],
    /* Behavior to try (A190): one tile above Phrases to try, and the same
       sentence in What Comes Next under Things to consider. Ellie's words. */
    behavior: "Given your unique approaches, {RCH} should ask once what is on {WDR_pos} mind and then give {WDR} time to think, and {WDR} should do their best to share feelings out loud, something like \"This has been on my mind and I want to say it before while I'm thinking about it.\"",
    tips: [
      { title: "Expressiveness isn't depth, and silence isn't emptiness", body: "{GRD}'s inner life is not less rich because {GRD_pos} feelings aren't expressed as often. {RCH}'s sharing isn't less valuable because sharing comes more easily. Try to say both of these things to each other out loud.", phraseTry: "There's more going on for me than I'm showing. I just need to sort out my feelings before I share them." },
      { title: "Reaching partner: give the withdrawing partner room to process", body: "Pressing {GRD} to share before {GRD} is ready doesn't create connection, but it does create pressure. Try to ask once how {GRD} is feeling, and then give {GRD_obj} time to share.", phraseTry: "I can wait until you are ready to share. Thank you for being willing to talk." },
      { title: "Reserved partner: share feelings before they are fully formed", body: "You don't have to wait until a feeling is fully formed before you share it. Even saying 'I'm still figuring out how I feel about this' is a form of sharing, and that is usually exactly what {RCH} needs to hear.", phraseTry: "I don't have this figured out, but something's been sitting with me and I wanted to say it before I lose it." },
    ],
  },
  {
    id: "XY", typeA: "X", typeB: "Y",
    name: "The translators",
    tagline: "You both have strong conflict instincts, but one of you engages and one of you withdraws. Moving forward together takes understanding and intention.",
    description: "{RCH} pushes toward resolution and keeps feelings private, while {WDR} needs space before talking and shows feelings openly in the meantime. This means you can each read the other as too much and not enough at once. {RCH}'s push toward resolution can cut short the space {WDR} needs, and {WDR}'s visible feelings during that space can look like a problem {RCH} needs to fix right now.",
    nuance: "{RCH}'s urgency to resolve conflict can feel like pressure to {WDR}, who isn't ready yet. {WDR}'s visible emotion while taking space can look like an invitation to engage, when {WDR} is actually signaling a need to wait. Both readings are understandable, but both are wrong.",
    color: "#7C3AED", shade: "#F5F0FF",
    famousDuos: [
      { names: "Hermione & Ron", show: "Harry Potter", note: "She analyzed and pushed; he felt his way through and needed to breathe. They drove each other crazy in exactly the ways that made them better." },
      { names: "Ted & Robin", show: "How I Met Your Mother", note: "He pushed toward resolution; she pulled toward distance. Neither was wrong, but they needed a way to say so." },
    ],
    strengths: [
      "When you name your different conflict instincts and plan for them, your repairs tend to work",
      "You are emotionally complementary, logical and feeling",
      "Your difference in conflict timing is very solvable once you both understand it",
    ],
    stickingPoints: [
      "A hard conversation can start before {WDR} is ready",
      "{WDR}'s visible emotion can look like something {RCH} needs to fix",
      "Your different timing can make it look like one of you cares more",
    ],
    patterns: [
      "When something is hard, {U} and {P} are usually not in the same place at the same time. {RCH} is ready to engage. {WDR} needs the space.",
      "What reads as pulling away is usually just needing room to process. What reads as pressure is usually just care.",
      "The gap between your instincts is not a character flaw. It means you're wired differently, which requires understanding from each partner.",
    ],
    /* Behavior to try (A190): one tile above Phrases to try, and the same
       sentence in What Comes Next under Things to consider. Ellie's words. */
    behavior: "Given your unique approaches, {RCH} should try to pause heavy conversations until {WDR} is ready to talk, and {WDR} should try to assign a timeframe, like \"I need until tomorrow morning.\"",
    tips: [
      { title: "{RCH}: pushing to talk doesn't resolve conflict faster", body: "{WDR} needs space first, and then the conversation. Pushing to talk before {WDR} is ready usually slows down a resolution rather than speeding up the process.", phraseTry: "I know you're not ready. I'll wait, but can you tell me when you think you will be?" },
      { title: "{WDR}: say when you'll be back", body: "Not knowing when {WDR} will come back is harder for {RCH} than the wait itself. Saying 'I need until tonight' lets {RCH} stop worrying while waiting.", phraseTry: "I need until tomorrow morning. I'll come to you then." },
      { title: "Talk about how you each handle conflict before a hard moment", body: "When you are both calm, try to tell each other what you each need during an argument. That conversation can change how the next argument goes.", phraseTry: "When I go quiet, the conversation isn't over, I'm just processing. Give me space and I'll come back." },
    ],
  },
  {
    id: "XZ", typeA: "X", typeB: "Z",
    name: "The stethoscope",
    tagline: "You both think before you speak, so you tend to sort through your feelings privately before you talk.",
    description: "{U} and {P} both keep feelings private and both think them through before saying anything, if you say anything at all. Your dynamic is calm and rarely explosive, and the practical side of your relationship runs smoothly, but your feelings tend to stay unspoken.",
    nuance: "Neither of you shows the other much of what you feel. Your relationship can run on logic, shared purpose, and good-enough communication while your feelings go largely unaddressed. This gap tends to show up during life transitions, when feelings that have stayed quiet need to be said out loud.",
    color: "#1B5FE8", shade: "#EFF1FF",
    famousDuos: [
      { names: "Joel & Ellie", show: "The Last of Us", note: "Both held things close. Both processed privately. What passed between them was real and deep, it just required the other person to ask rather than assume." },
      { names: "Ron Swanson & Diane", show: "Parks & Recreation", note: "He valued his private world enormously. She had her own rich interior life. They built something that worked by not crowding each other." },
    ],
    strengths: [
      "Silence between you is comfortable rather than tense",
      "You both think through feelings before sharing",
      "Your relationship respects each other's interior life",
    ],
    stickingPoints: [
      "Neither of you offers much emotional visibility",
      "When something is wrong, neither of you reaches first",
      "You can coexist without reaching emotional depth",
    ],
    patterns: [
      "{U} and {P} probably have fewer dramatic conversations than most couples. The emotional content of the relationship tends to go inward.",
      "{RCH} has a low-level push toward getting things resolved. {WDR} tends to need more time before the conversation is fully possible.",
      "When you do talk through something, it tends to be calmer and more considered than it would be for more expressive pairings.",
    ],
    /* Behavior to try (A190): one tile above Phrases to try, and the same
       sentence in What Comes Next under Things to consider. Ellie's words. */
    behavior: "Given your unique approaches, {RCH} should try to ask a question, like \"What's actually going on for you right now?\", and {WDR} should do their best to give an honest answer, even without fully understanding the feeling.",
    tips: [
      { title: "Build a practice of asking", body: "Not 'are you okay?' but 'what's actually going on for you right now?' Two people who both hold things privately need to be asked before they'll share their feelings.", phraseTry: "What's actually going on for you right now? How are you feeling?" },
      { title: "Schedule the emotional check-in", body: "{U} and {P} can both go long stretches without saying how you feel. Try to set aside a short weekly conversation about how you each feel, because neither of you is likely to start one on your own.", phraseTry: "Can we do fifteen minutes on Sunday? Just to check in properly." },
      { title: "A calm relationship is a good thing, as long as nothing is going unsaid", body: "Calm is a wonderful quality, but it is worth making sure the calm isn't covering for avoided conversations. Every so often, try to ask each other whether the calm is genuine or whether something is going unsaid.", phraseTry: "Is there anything sitting unspoken between us right now? I want to make sure we're actually okay." },
    ],
  },
  {
    id: "YZ", typeA: "Y", typeB: "Z",
    name: "The sanctuary",
    tagline: "You both need space when things get hard, but one of you shows feelings openly and one of you keeps them private. That difference is worth understanding.",
    description: "When things get hard, {U} and {P} both withdraw. {EXP} shows feelings openly while taking space, and {GRD} keeps feelings private. Coming back together tends to be slow for both of you, which means hard moments can sit for a long time before either of you raises them.",
    nuance: "There is real depth in your relationship, often more than either of you shows. The risk is that your feelings never get said, because neither of you naturally starts the conversation. Try to agree on who restarts the conversation after a hard moment, and when, so you each get the space you need without a silence that has no end.",
    color: "#7C3AED", shade: "#F5F0FF",
    famousDuos: [
      { names: "Joel & Clementine", show: "Eternal Sunshine of the Spotless Mind", note: "He held everything privately; she expressed the weight of everything she was feeling. Both needed space. Both took it in different ways." },
      { names: "Anne Elliot & Captain Wentworth (early)", show: "Persuasion", note: "Both withdrew and held things close. The return was slow and required one of them to finally speak." },
    ],
    strengths: [
      "Neither of you escalates in the heat of the moment",
      "Conversations are calmer because they are delayed",
      "Neither of you takes the other's need for space personally",
    ],
    stickingPoints: [
      "Both of you can wait a long time for the other to reengage",
      "{EXP}'s visible emotion can be hard to read while you each take space",
      "Hard things can sit a long time before either of you raises them",
    ],
    patterns: [
      "After a hard moment, {U} and {P} both need time, but the space is usually helpful.",
      "The coming-back-together step sometimes takes longer than it needs to because neither of you naturally initiates it.",
      "When the conversation does happen, it tends to be more complete than it would have been earlier. The depth just required time.",
    ],
    /* Behavior to try (A190): one tile above Phrases to try, and the same
       sentence in What Comes Next under Things to consider. Ellie's words. */
    behavior: "Given your unique approaches, {EXP} can say plainly how {EXP} feels so that {GRD} does not have to guess, and {GRD} may need time to process but should set a time to engage, like \"Let's talk after dinner.\"",
    tips: [
      { title: "Agree on who restarts the conversation", body: "Neither of you tends to reopen a hard conversation quickly, so the silence can stretch. Try to decide in advance who reaches out first. Whoever tends to settle first should signal when they are ready, and the other gets the full space until then.", phraseTry: "I'm ready when you are. Take your time. I'll be here." },
      { title: "Give your space an end time", body: "'I need some time' is not as useful as 'I need until tonight.' Giving a specific time to come back lets your partner stop worrying while they wait for you.", phraseTry: "I need until tomorrow morning. I'll come find you then." },
      { title: "Create a regular time for openness", body: "{U} and {P} need a set time to share feelings. A weekly check-in, even for 10 minutes, gives you a time to talk that neither of you would usually create on your own.", phraseTry: "Can we do ten minutes on Sunday? Not about anything specific. I just want to check in." },
    ],
  },
];
