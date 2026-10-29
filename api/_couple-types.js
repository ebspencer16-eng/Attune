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
    description: "{U} and {P} both move toward resolution and process outward. High warmth and emotional availability in both directions. Neither partner has to coax the other into the conversation or wait for the signal that it's okay to share what's going on.",
    nuance: "The risk here is feedback loops rather than disconnection. When both of you are feeling something strongly, the intensity can amplify rather than settle. One of you naming that, 'I think we're both escalating things right now', is usually enough to break the loop.",
    color: "#E8673A", shade: "#FFF4F0",
    famousDuos: [
      { names: "Monica & Chandler", show: "Friends", note: "Both put everything into the shared space. The warmth between them was real and visible, and occasionally required one of them to take the temperature down." },
      { names: "Eric & Tami Taylor", show: "Friday Night Lights", note: "Two people who led with feeling, turned toward each other, and built something real by doing it out loud." },
    ],
    strengths: [
      "Emotional availability is a strong suit for you two",
      "You are both readable and willing to be read",
      "Hard conversations aren't avoided as often",
    ],
    stickingPoints: [
      "Two strong feelings can amplify each other",
      "Hard moments land at full force for you two",
      "Not every feeling has to be said straight away",
    ],
    patterns: [
      "{U} and {P} probably know each other's emotional state well, often before anything is said.",
      "Both partners have a lot of emotional energy, which can be wonderful and occasionally overwhelming.",
      "Arguments between you are probably not subtle. The work is making sure what comes out is accurate, not just loud.",
    ],
    /* Behavior to try (A190): one tile above Phrases to try, and the same
       sentence in What Comes Next under Things to consider. Ellie's words. */
    behavior: "Given how alike your approaches are, you can share one rule: when you are both upset at the same time, whoever notices first says \"Let's pause for ten minutes,\" and you both come back to the conversation after.",
    tips: [
      { title: "Notice when you're amplifying each other", body: "When both of you are feeling something strongly, the loop can escalate. One person naming it can break the cycle before it needs to get bigger.", phraseTry: "I think we're both escalating things right now, can we both take a breath before we keep going?" },
      { title: "Not every feeling needs an audience", body: "{U} and {P} are both expressive, but some feelings are better processed privately before being shared. Practice sitting with something for a beat before putting it into the shared space.", phraseTry: "I need a minute with this before I put it out there. Give me twenty minutes." },
      { title: "The visibility is a gift", body: "Most couples are guessing at each other's interior. {U} and {P} don't have to. Appreciate that even when it's uncomfortable, it is what makes real closeness possible.", phraseTry: "I know this is a lot right now, but I'm glad we can actually see each other in it." },
    ],
  },
  {
    id: "XX", typeA: "X", typeB: "X",
    name: "The collaboration",
    tagline: "Resolution is the shared instinct. Privacy is the shared method of processing.",
    description: "{U} and {P} both move toward resolving things and both handle the feeling internally before it comes out. Decisions get made and disagreements get worked through. The practical machinery of the relationship runs efficiently, and quietly.",
    nuance: "Efficient repair can mean ending the conversation before it is actually settled. Two people who both move fast toward resolution can sometimes resolve the surface without fully addressing what's underneath. The same thing comes back because the real conversation happened too quickly.",
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
      "Two internal processors can go too long without sharing",
      "Quick repair is not always complete repair",
      "Though you are great at logistics, emotional depth can be lost",
    ],
    patterns: [
      "{U} and {P} probably make decisions quickly, once the information is assembled. The process feels collaborative.",
      "Arguments between you tend to be structured. You can usually find your way to a logical conclusion.",
      "The emotional texture of hard moments can sometimes get skipped in the move toward resolution.",
    ],
    /* Behavior to try (A190): one tile above Phrases to try, and the same
       sentence in What Comes Next under Things to consider. Ellie's words. */
    behavior: "Given how alike your approaches are, you can both add one step before you close a disagreement: each of you says how you feel about the outcome, not only what you decided.",
    tips: [
      { title: "Check if it's resolved or just closed", body: "Fast repair is a real strength. The risk is ending a conversation or apologizing before things are fully settled.", phraseTry: "Are we actually okay, or are we both just ready to be done?" },
      { title: "Ask what's going on underneath the plan", body: "{U} and {P} are both comfortable with the practical mode. Add a deliberate question to get at the emotional weight underneath the practical action. This changes the quality of the conclusion.", phraseTry: "How does this actually feel for you, beyond what it means?" },
      { title: "Give the slower moments their time", body: "Occasionally, slow the repair down enough to make sure you've actually heard each other. The extra few minutes tends to be what prevents the same conversation coming back.", phraseTry: "I want to make sure we've actually heard each other on this before we move on. I'm curious about your perspective." },
    ],
  },
  {
    id: "YY", typeA: "Y", typeB: "Y",
    name: "The safe space",
    tagline: "Both need space first. Both carry it visibly when withdrawn.",
    description: "When things get hard, {U} and {P} both pull back before coming forward. Neither of you is avoiding, you're both protecting the quality of the eventual conversation. When you do come back together, you both bring the full emotional weight of what you've been carrying.",
    nuance: "Two people who both need space can wait for the other to come back first for a very long time. That waiting can start to feel like abandonment even when it's just process. Build an agreed-upon signal, even something small, that means 'I'm ready when you are' without requiring a full conversation to get there.",
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
      "Open-ended space is more fragile than a set limit",
      "Things that need addressing can be delayed a long time",
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
      { title: "Someone has to come back first", body: "Both {U} and {P} tend to wait. The good news is that whoever initiates the return usually gets a warmer reception than they expect. Take the step.", phraseTry: "I'm ready to talk when you are. No rush, just wanted you to know." },
      { title: "Bound the space with a time", body: "'I need some time' is not as useful as 'I need until tonight.' A specific return time lets the other person stop the worried waiting and trust the process.", phraseTry: "I need until tonight. I'll come find you after dinner." },
      { title: "Build a low-key signal", body: "{U} and {P} don't need a full conversation to signal that you're okay again. A small gesture, a cup of tea, a hand on the shoulder, does most of the work.", phraseTry: "I'm okay. We're okay. Just needed a minute." },
    ],
  },
  {
    id: "ZZ", typeA: "Z", typeB: "Z",
    name: "The depth",
    tagline: "Both withdraw. Both hold it close. A lot lives under the surface.",
    description: "{U} and {P} both go inward when things get hard and both hold their interior life privately. The relationship tends to be stable, calm, and emotionally deep, but the depth doesn't surface readily. There is often more going on beneath the calm than either of you shows.",
    nuance: "Important things can go unsaid for a very long time. The comfort with quiet can become avoidance without either person intending it. The relationship looks more okay from the outside than it sometimes is from the inside. Creating a deliberate structure for openness is worth more here than in most pairings.",
    color: "#6B7280", shade: "#F4F5F6",
    famousDuos: [
      { names: "Mr. & Mrs. Darcy (post-wedding)", show: "Pride & Prejudice", note: "Both learned to respect the other's privacy. The understanding ran deep even when the words ran scarce." },
      { names: "Anne & Gilbert (later years)", show: "Anne of Green Gables", note: "Two internal processors who built something quiet and real together over time." },
    ],
    strengths: [
      "When either of you shares something, it is respected",
      "You both respect each other's interior life",
      "Feelings can be heavy even if they are not spoken",
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
      { title: "Build in the opening, don't wait for it to happen", body: "A weekly check-in, even 15 minutes, creates a structure for the things that wouldn't come up otherwise. Schedule the opening you both won't naturally make.", phraseTry: "Can we do a quick check-in this week? Nothing heavy. I just want to know how you're actually doing." },
      { title: "Share the rougher draft", body: "Both {U} and {P} wait until something is fully formed before sharing it. Practice sharing it half-formed.", phraseTry: "I'm still figuring out how I feel about this, but I wanted to say it out loud anyway." },
      { title: "Name what you appreciate", body: "Reserved people often feel deeply, they just don't say it. Make a practice of saying specifically what you value about each other. The other person may not know unless you tell them.", phraseTry: "I don't say this enough, but I want you to know I really value the way you {something specific}." },
    ],
  },

  // ── Cross-type pairings ────────────────────────────────────────────────────
  {
    id: "WX", typeA: "W", typeB: "X",
    name: "The jumpstart",
    tagline: "Different approaches to resolution, both heading in the same direction.",
    description: "{U} and {P} both move toward resolution when things get hard, you're pulling in the same direction. Where you differ is in how the internal experience travels: one processes outward, and one holds it closer. The destination is the same. The path there looks different.",
    nuance: "The expressive partner can feel like the guarded partner isn't sharing what's actually going on. The guarded partner can feel like too much is being put into the shared space before it's ready. Neither is wrong. The registers are just different.",
    color: "#E8673A", shade: "#FFF4F0",
    famousDuos: [
      { names: "Leslie & Ben", show: "Parks & Recreation", note: "Both wanted to get things done. One led with passion and feeling; one led with spreadsheets and caution. Together they made things actually happen." },
      { names: "Pam & Jim (later seasons)", show: "The Office", note: "Both reaching toward resolution, both committed to the relationship. The difference was how much of the working-through happened out loud versus privately." },
    ],
    strengths: [
      "You both strive for resolution",
      "You are complementary processors, thoughtful and eager",
      "Your relationship has warmth and steadiness",
    ],
    stickingPoints: [
      "{EXP} can feel like the one always doing the emotional work",
      "{GRD} can feel pressure to match an expressiveness that is not natural",
      "Processing can feel like withholding to one of you",
    ],
    patterns: [
      "When something is off, {U} and {P} are usually both aware of it, but processing it at different speeds.",
      "{EXP} tends to process out loud. {GRD} needs to think it through first, then bring it. Same conversation, different way in.",
      "When the conversation does happen, it tends to go somewhere useful. You're not fighting about whether to have it, just when.",
    ],
    /* Behavior to try (A190): one tile above Phrases to try, and the same
       sentence in What Comes Next under Things to consider. Ellie's words. */
    behavior: "Given your unique approaches, {EXP} should ask {GRD} once how something feels for {GRD_obj} and then wait for the answer, and {GRD} should try to share something, even if it's just \"I'm still figuring out how I feel about this.\"",
    tips: [
      { title: "Name which mode you're in", body: "'I need to process this out loud' vs. 'I need to think before I talk.' That one sentence tells the other person how to meet you. Use it early in the process.", phraseTry: "I need to process this out loud, bear with me. I don't have it figured out yet." },
      { title: "Guarded partner: share the half-formed version", body: "You don't have to wait until it's fully formed. 'I'm still figuring out how I feel about this' is a form of sharing, and it's usually exactly what the expressive partner needs to hear.", phraseTry: "I'm still working through it, but I think I'm bothered by this. Not sure why yet." },
      { title: "Expressive partner: give the guarded partner room to process", body: "Pressing for more than the guarded partner is ready to give doesn't create connection, it creates pressure. Ask once, then wait. The sharing will come in its own time.", phraseTry: "I can wait until you are ready to share. Thank you for being willing to talk." },
    ],
  },
  {
    id: "WY", typeA: "W", typeB: "Y",
    name: "The orbit",
    tagline: "You have different conflict clocks. One is ready before the other, recognizing that changes everything.",
    description: "When things get hard, {U} moves toward resolution and {P} pulls back, or vice versa, depending on your individual types. The reaching can feel like pressure. The withdrawal can feel like abandonment. Neither is true, you're just wired differently for when the conversation becomes possible.",
    nuance: "This is one of the most common and most solvable friction patterns in relationships. The solution isn't changing your instinct, it's naming it out loud before the hard moment arrives. A simple agreement, 'I need a few hours, let's talk at 9', short-circuits the loop that otherwise runs on its own.",
    color: "#E8673A", shade: "#FCE4EC",
    famousDuos: [
      { names: "Ross & Rachel", show: "Friends", note: "One wanted to resolve everything immediately; the other needed time and space first. Without the right mindset to approach it, they kept colliding at the wrong moments." },
      { names: "Carrie & Big", show: "Sex and the City", note: "She reached. He retreated. Without a language for it, the pattern was destabilizing for years. When they finally named it, things changed." },
    ],
    strengths: [
      "Friction can be easily removed for this pairing",
      "You have complementary instincts, attentive and stabilizing",
      "Genuinely beneficial repair systems are attainable here",
    ],
    stickingPoints: [
      "Urgency reads as pressure, distance reads as avoidance",
      "When one presses and the other retreats, things can escalate",
      "Repair starts on the initiator's timeline",
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
      { title: "Name the pattern before you're in it", body: "When things are calm, explain what you need when things are not calm. That one conversation changes what the next hard moment looks like.", phraseTry: "When I'm upset, I need a few minutes before I can talk. It's not avoidance. I'll come back." },
      { title: "Make space bounded, not open-ended", body: "When {WDR} needs time, give a return. 'I need an hour' is different from silence. It lets {RCH} stop the worried waiting.", phraseTry: "I need an hour. I'll be back at eight." },
      { title: "Urgency isn't pressure; silence isn't avoidance", body: "When {U} presses for resolution, that's care, not control. When {P} needs space, that's the process, not withdrawal. Say what you need in the moment, and be open to the fact that your needs are different.", phraseTry: "I know this is hard for you to sit with. I'm not gone. I'm processing. I'll be back." },
    ],
  },
  {
    id: "WZ", typeA: "W", typeB: "Z",
    name: "The opening",
    tagline: "One reaches. One holds. Understanding what you each need bridges the gap.",
    description: "One of {U} and {P} reaches toward resolution and expresses things openly; the other pulls back and holds things privately. The gap exists on both axes simultaneously, different conflict timing and different expressiveness, which means there's more translation work here than in most pairings.",
    nuance: "The reaching partner often doesn't know what the reserved partner is feeling until long after the fact, which can feel like withholding. The reserved partner often feels pressure to perform an emotional openness that isn't natural to {GRD}. Naming this as a difference, not a deficiency, is the most useful thing {U} and {P} can do.",
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
      "{U} and {P} sometimes find that you mean something the other doesn't quite receive. The signal and the interpretation don't always match.",
      "Understanding each other has taken real effort, and usually more conversation than you'd expect.",
      "When {U} and {P} are communicating well, it's because you're both actively working to understand each other, rather than assuming you already do.",
    ],
    /* Behavior to try (A190): one tile above Phrases to try, and the same
       sentence in What Comes Next under Things to consider. Ellie's words. */
    behavior: "Given your unique approaches, {RCH} should ask once what is on {WDR_pos} mind and then give {WDR} time to think, and {WDR} should do their best to share feelings out loud, something like \"This has been on my mind and I want to say it before while I'm thinking about it.\"",
    tips: [
      { title: "Expressiveness isn't depth, and silence isn't emptiness", body: "The reserved partner's inner life is not less rich because it isn't expressed as often. The reaching partner's sharing isn't less valuable because it comes more easily. Name that dynamic directly.", phraseTry: "There's more going on for me than I'm showing. I just need to get it in order before I share it." },
      { title: "Reaching partner: give the withdrawing partner room to process", body: "Pressing for more than the reserved partner is ready to give doesn't create connection, it creates pressure. Ask once, then wait. The sharing will come in its own time.", phraseTry: "I can wait until you are ready to share. Thank you for being willing to talk." },
      { title: "Reserved partner: share the earlier draft", body: "You don't have to wait until it's fully formed. Even 'I'm still figuring out how I feel about this' is a form of sharing, and it's usually exactly what the reaching partner needs to hear.", phraseTry: "I don't have this figured out, but something's been sitting with me and I wanted to say it before I lose it." },
    ],
  },
  {
    id: "XY", typeA: "X", typeB: "Y",
    name: "The translators",
    tagline: "Strong instincts on both sides, pointed differently. Moving forward together takes understanding and intention.",
    description: "{U} pushes toward resolution while processing internally; {P} needs space before the conversation is possible, and carries visible feeling in the meantime. They can read each other as simultaneously too much and not enough, the driving toward resolution can close off the space, and the visible feeling during withdrawal can look like something that needs fixing right now.",
    nuance: "{RCH_pos} urgency toward resolution can feel like pressure to {WDR}, who isn't ready yet. {WDR_pos} emotional visibility during withdrawal can look like an invitation to engage, when it's actually a signal to wait. Both readings are understandable. Both are wrong.",
    color: "#7C3AED", shade: "#F5F0FF",
    famousDuos: [
      { names: "Hermione & Ron", show: "Harry Potter", note: "She analyzed and pushed; he felt his way through and needed to breathe. They drove each other crazy in exactly the ways that made them better." },
      { names: "Ted & Robin", show: "How I Met Your Mother", note: "He pushed toward resolution; she pulled toward distance. Neither was wrong, but they needed a way to say so." },
    ],
    strengths: [
      "Named and managed, your instincts produce repair that works",
      "You are emotionally complementary, logical and feeling",
      "The dynamic is highly solvable once it is understood",
    ],
    stickingPoints: [
      "The conversation can start before {WDR} is ready",
      "{WDR_pos} visible emotion can look like something to fix",
      "It can look like one of you cares more",
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
      { title: "{RCH}: resolution doesn't mean resolved", body: "{WDR} needs the space first, and then the conversation. Moving fast to 'let's talk' before {WDR} is ready doesn't get to resolution faster. It delays it.", phraseTry: "I know you're not ready. I'll wait, but can you tell me when you think you will be?" },
      { title: "{WDR}: say when you'll be back", body: "The uncertainty is harder for {RCH} than the wait. 'I need until tonight' lets {RCH} stop the worried waiting and trust the process.", phraseTry: "I need until tomorrow morning. I'll come to you then." },
      { title: "Name the pattern out loud before you're in it", body: "When things are calm, explain what you need when things are not calm. That one conversation changes what the next hard moment looks like.", phraseTry: "When I go quiet, it's not over, it's processing. Give me space and I'll come back." },
    ],
  },
  {
    id: "XZ", typeA: "X", typeB: "Z",
    name: "The stethoscope",
    tagline: "Both of you think before you speak, the real work happens before the conversations begin.",
    description: "{U} and {P} both hold things privately and both process what's going on before it comes out, if it comes out at all. The dynamic is low-temperature and rarely explosive. The practical machinery of the relationship runs smoothly. The emotional layer tends to stay quiet.",
    nuance: "Neither partner is offering a lot of emotional visibility to the other. The relationship can run on logic, shared purpose, and good-enough communication while the emotional texture goes largely unaddressed. That gap tends to show up during life transitions, when something that's been running quietly needs to be named.",
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
      { title: "Schedule the emotional check-in", body: "{U} and {P} are both capable of going long stretches without naming what's going on inside. A regular, brief check-in creates the structure that neither of you will naturally generate on your own.", phraseTry: "Can we do fifteen minutes on Sunday? Just to check in properly." },
      { title: "The quiet isn't a problem, until it is", body: "Calm is a wonderful quality. The work is making sure the ease isn't covering for avoided conversations. Check in on whether the calm is genuine or whether something is sitting unspoken.", phraseTry: "Is there anything sitting unspoken between us right now? I want to make sure we're actually okay." },
    ],
  },
  {
    id: "YZ", typeA: "Y", typeB: "Z",
    name: "The sanctuary",
    tagline: "You both need space when things get hard. The difference is how much it shows, and that gap is worth understanding.",
    description: "When things get hard, {U} and {P} both pull back. {EXP} carries the emotional weight visibly while withdrawn. {GRD} holds everything privately. The return is slow for both. Hard moments can sit for a long time before either of you surfaces them.",
    nuance: "Real depth runs in this pairing, often more than either partner shows. The risk is that the depth never surfaces, because neither of you naturally initiates the opening. Agree on who brings it back, and when. A named pattern gives you both the full space, without indefinite silence.",
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
      "{EXP_pos} visible emotion is hard to read during withdrawal",
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
      { title: "Agree on who brings it back", body: "Neither of you moves to reopen things quickly, so the silence can stretch. Decide the pattern in advance. Whoever tends to settle first signals when they are ready, and the other gets the full space until then.", phraseTry: "I'm ready when you are. Take your time. I'll be here." },
      { title: "Bound the space with a time", body: "'I need some time' is not as useful as 'I need until tonight.' A specific return time lets the other person stop the worried waiting and trust the process.", phraseTry: "I need until tomorrow morning. I'll come find you then." },
      { title: "Create a regular time for openness", body: "{U} and {P} need a deliberate structure for things to surface. A weekly check-in, even 10 minutes, creates the opening that neither of you will naturally generate on your own.", phraseTry: "Can we do ten minutes on Sunday? Not about anything specific. I just want to check in." },
    ],
  },
];
