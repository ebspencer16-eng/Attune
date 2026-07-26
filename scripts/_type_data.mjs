// Auto-extracted from src/App.jsx (single source of truth for type prose).
// Regenerate if INDIVIDUAL_TYPES / NEW_COUPLE_TYPES change in App.jsx.

export const INDIVIDUAL_TYPES = {
  W: { code: "W", name: "The Initiator", color: "#E8673A", fill: "#FFF4F0", axis1: "Engage", axis2: "Open",
       desc: "Moves toward resolution. Processes and expresses relatively freely.",
       wired: "You move toward connection when things need addressing. You don't wait for an opening, you create one. You process outward, which means the people close to you usually know where you stand without having to ask. This makes you easy to know, and relatively easy to be in productive conflict with.",
       typeDesc: "You engage quickly and express freely, which means the people close to you usually know where they stand, and they know where you stand too. You don't make them guess. Under pressure, you tend to reach toward the relationship rather than away from it, which can be genuinely stabilizing. The thing to stay aware of: your speed to engage can feel like a lot when someone else needs more time to get there." },
  X: { code: "X", name: "The Anchor", color: "#1B5FE8", fill: "#EFF1FF", axis1: "Engage", axis2: "Guarded",
       desc: "Pushes toward resolution. Processes internally, shares selectively.",
       wired: "You move toward resolution rather than away from it. When something needs addressing, you don't avoid the conversation. You process before you speak, which means your perspective is usually considered by the time it comes out. This makes you direct and deliberate, but sometimes harder to read in the middle of something.",
       typeDesc: "You engage with problems directly but process privately before speaking, which means you tend to arrive at conversations with something considered to say. You don't react out loud. Under pressure, you want resolution, but you need your own thinking to be in order first. The thing to stay aware of: your internal processing can look like distance to someone who expresses more freely." },
  Y: { code: "Y", name: "The Feeler", color: "#7C3AED", fill: "#F5F0FF", axis1: "Withdraw", axis2: "Open",
       desc: "Needs space first. Carries and expresses feeling when ready.",
       wired: "You need space to process before you can fully show up to a hard conversation. This isn't avoidance, it's how you get to something honest. You're emotionally expressive when you're ready, and the people close to you get real feeling when it comes. What you bring most is depth: you don't stay on the surface.",
       typeDesc: "You process before you can share, taking the time you need to understand what's actually true for you before you say it. You're emotionally present and expressive when you get there. Under pressure, you need time, and pushing you before you're ready usually produces something incomplete. The thing to stay aware of: your withdrawal before sharing can read as avoidance to someone who engages more quickly." },
  Z: { code: "Z", name: "The Protector", color: "#6B7280", fill: "#F4F5F6", axis1: "Withdraw", axis2: "Guarded",
       desc: "Withdraws and holds things close. Real depth and feeling running quiet beneath the surface.",
       wired: "You process privately and share selectively. There's usually more going on internally than what's visible from the outside. When you do speak, it carries weight precisely because you don't offer it carelessly. What you bring is steadiness: you don't react quickly, which means you don't create unnecessary chaos.",
       typeDesc: "You carry things privately and surface them selectively, which means there's usually more going on internally than what's visible. You don't perform your inner life, and you don't dump it on the people around you. Under pressure, you go quiet and go deep. The thing to stay aware of: the people who love you most sometimes struggle to know what you're carrying, which can make them feel shut out without you intending it." },
};

export const NEW_COUPLE_TYPES = [
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
      "{U} and {P} are easy to be known by each other. The emotional availability goes both ways.",
      "Neither of you has to decode the other. You're both readable, and both willing to be read.",
      "Hard conversations don't get avoided as often because neither of you is protecting against feeling.",
    ],
    stickingPoints: [
      "High expressiveness on both sides can create amplification. When both of you are feeling something intensely, the intensity can feed itself.",
      "Difficult emotions can land harder than intended, because neither person is holding anything back, the impact of a hard moment is felt fully.",
      "Not every feeling needs to go into the shared space immediately. Sitting with something for 20 minutes before speaking is a skill worth building.",
    ],
    patterns: [
      "{U} and {P} probably know each other's emotional state well, often before anything is said.",
      "Both partners have a lot of emotional energy, which can be wonderful and occasionally overwhelming.",
      "Arguments between you are probably not subtle. The work is making sure what comes out is accurate, not just loud.",
    ],
    tips: [
      { title: "Notice when you're amplifying each other", body: "When both of you are feeling something strongly, the loop can escalate. One person naming it can break the cycle before it needs to get bigger.", phraseTry: "I think we're both escalating things right now, can we both take a breath before we keep going?" },
      { title: "Not every feeling needs an audience", body: "{U} and {P} are both expressive, but some feelings are better processed privately before being shared. Practice sitting with something for a beat before putting it into the shared space.", phraseTry: "I need a minute with this before I put it out there. Give me twenty minutes." },
      { title: "The visibility is a gift", body: "Most couples are guessing at each other's interior. {U} and {P} don't have to. Appreciate that even when it's uncomfortable, it's the thing that makes real closeness possible.", phraseTry: "I know this is a lot right now, but I'm glad we can actually see each other in it." },
    ],
  },
  {
    id: "XX", typeA: "X", typeB: "X",
    name: "The collaboration",
    tagline: "Resolution is the shared instinct. Privacy is the shared method of processing.",
    description: "{U} and {P} both move toward resolving things and both handle the feeling internally before it comes out. Decisions get made and disagreements get worked through. The practical machinery of the relationship runs efficiently, and quietly.",
    nuance: "Efficient repair can mean closing the loop before it's actually through. Two people who both move fast toward resolution can sometimes resolve the surface without fully addressing what's underneath. The same thing comes back because the real conversation happened too quickly.",
    color: "#1B5FE8", shade: "#EFF1FF",
    famousDuos: [
      { names: "Sherlock & Watson (as partners)", show: "Sherlock", note: "Two people who processed through logic and action rather than feeling. The understanding between them was real; it just ran quiet." },
      { names: "Ben Wyatt & April Ludgate", show: "Parks & Recreation", note: "Both efficient, both internally contained, both effective. They got things done without a lot of emotional weather." },
    ],
    strengths: [
      "{U} and {P} make decisions efficiently once the information is assembled. You speak the same language when things get complicated.",
      "Arguments between you tend to be structured. You can usually reason your way to a conclusion.",
      "There's very little translation required. You're both tracking the same kind of information.",
    ],
    stickingPoints: [
      "Two people who both process internally can go a long time without surfacing what's actually going on. Things that needed to be said get closed over.",
      "Efficient repair isn't the same as complete repair. The same conversation can reappear because the real thing didn't make it into the previous one.",
      "The relationship can be strong on logistics and weak on emotional texture. That gap tends to show up during life transitions.",
    ],
    patterns: [
      "{U} and {P} probably make decisions quickly, once the information is assembled. The process feels collaborative.",
      "Arguments between you tend to be structured. You can usually find your way to a logical conclusion.",
      "The emotional texture of hard moments can sometimes get skipped in the move toward resolution.",
    ],
    tips: [
      { title: "Check if it's resolved or just closed", body: "Fast repair is a real strength. The watch-out is closing the loop before the thing is actually through.", phraseTry: "Are we actually okay, or are we both just ready to be done?" },
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
      "Things don't escalate in the moment. {U} and {P} both have the instinct to step back before the conversation gets more heated than it needs to be.",
      "When the conversation does happen, it tends to be calmer and more emotionally substantive than it would have been in the heat of it.",
      "Both of you understand the need for space, so you're less likely to take it personally when the other person needs it.",
    ],
    stickingPoints: [
      "{U} and {P} can both wait a long time for the other person to come back first. That waiting can start to feel like abandonment, even when it's just a process.",
      "Open-ended space is harder to sit with than bounded space. Without a rough return time, the waiting becomes anxious.",
      "Two people who both default to withdrawal after conflict can go long stretches without addressing things that needed to be addressed.",
    ],
    patterns: [
      "After a hard moment, {U} and {P} both tend to need time before the conversation is possible.",
      "The coming-back-together step can take longer than it needs to, because neither of you naturally initiates it.",
      "When the conversation does happen, it tends to be calmer and more complete than it would have been without the space.",
    ],
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
    description: "{U} and {P} both go inward when things get hard and both hold their interior life privately. The relationship tends to be stable, low-drama, and genuinely deep, but the depth doesn't surface readily. There is often more going on beneath the calm than either of you shows.",
    nuance: "Important things can go unsaid for a very long time. The comfort with quiet can become avoidance without either person intending it. The relationship looks more okay from the outside than it sometimes is from the inside. Creating a deliberate structure for openness is worth more here than in most pairings.",
    color: "#6B7280", shade: "#F4F5F6",
    famousDuos: [
      { names: "Mr. & Mrs. Darcy (post-wedding)", show: "Pride & Prejudice", note: "Both learned to respect the other's privacy. The understanding ran deep even when the words ran scarce." },
      { names: "Anne & Gilbert (later years)", show: "Anne of Green Gables", note: "Two internal processors who built something quiet and real together over time." },
    ],
    strengths: [
      "When {U} and {P} share something, it carries weight. Neither of you is casual with the important stuff.",
      "The relationship has real privacy and respect for each other's interior life. You don't demand access to everything.",
      "What you've built together is real even if it's not loudly expressed. The depth is there, it's just not performed.",
    ],
    stickingPoints: [
      "Important things can go unsaid for a very long time. The comfort with silence can become avoidance.",
      "Neither of you naturally initiates the harder conversation. Both may be waiting for the other.",
      "The relationship can look more okay from the outside than it actually is, because neither of you is showing what's wrong.",
    ],
    patterns: [
      "{U} and {P} probably don't have a lot of dramatic conversations. The emotional content of the relationship tends to go inward rather than outward.",
      "When something is hard, it may be days before either of you brings it up, if it gets brought up at all.",
      "The relationship is probably more stable-looking than many, but the thing to watch is what's accumulating beneath the stability.",
    ],
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
      "{U} and {P} are rarely stuck in a standoff. You both want to resolve things, which means you're usually working in the same direction.",
      "You bring complementary processing styles. One keeps the emotional temperature in the room; the other thinks before putting it in the shared space.",
      "The relationship has both warmth and steadiness. You cover different emotional territory in a way that tends to be more complete than one style alone.",
    ],
    stickingPoints: [
      "{EXP} can feel like {EXP_isC} always the one initiating depth, always doing the emotional work, always making the first move.",
      "{GRD} can feel pressure to match an emotional expressiveness that doesn't come naturally, which sometimes makes {GRD_obj} pull back further.",
      "What the expressive partner reads as withholding, the guarded partner experiences as just needing time to form it properly. Both readings feel true; neither is quite right.",
    ],
    patterns: [
      "When something is off, {U} and {P} are usually both aware of it, but processing it at different speeds.",
      "{EXP} is the expressive one and tends to get the conversation started. {GRD} is more guarded and is willing to engage once the conversation begins.",
      "When the conversation does happen, it tends to go somewhere useful. You're not fighting about whether to have it, just when.",
    ],
    tips: [
      { title: "Name which mode you're in", body: "'I need to process this out loud' vs. 'I need to think before I talk.' That one sentence tells the other person how to meet you. Use it early in the process.", phraseTry: "I need to process this out loud, bear with me. I don't have it figured out yet." },
      { title: "Guarded partner: share the half-formed version", body: "You don't have to wait until it's fully formed. 'I'm still figuring out how I feel about this' is a form of sharing, and it's usually exactly what the expressive partner needs to hear.", phraseTry: "I'm still working through it, but I think I'm bothered by {something}. Not sure why yet." },
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
      { names: "Ross & Rachel", show: "Friends", note: "One wanted to resolve everything immediately; the other needed time and space first. Without a framework for it, they kept colliding at exactly the wrong moment." },
      { names: "Carrie & Big", show: "Sex and the City", note: "She reached. He retreated. Without a language for it, the pattern was destabilizing for years. When they finally named it, things changed." },
    ],
    strengths: [
      "Once you understand each other's conflict clock, you stop misreading each other's behavior. That alone removes most of the friction.",
      "You bring complementary instincts, one keeps things from festering, one keeps things from escalating.",
      "This dynamic, when named, often produces repair that works for both people rather than one.",
    ],
    stickingPoints: [
      "Without a framework, whoever needs space reads urgency as pressure, and whoever needs resolution reads distance as avoidance. Both interpretations feel true, and both are wrong.",
      "The pursuer-withdrawer loop: one presses for resolution, the other retreats further, which makes the first person press harder. It escalates without anyone wanting it to.",
      "Repair happens on one person's timeline, usually the person who initiates. The other person doesn't always feel ready when it starts.",
    ],
    patterns: [
      "When something is off, {U} and {P} are usually not in the same place at the same time. {RCH} is ready to engage. {WDR} isn't there yet.",
      "What reads as pulling away is usually just needing space to process. What reads as pressure is usually just care.",
      "The conflict clock mismatch doesn't mean one person cares more. It means you're wired differently, which requires understanding from each partner.",
    ],
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
      "The reaching partner creates space for emotional honesty in the relationship. The reserved partner creates depth beneath the surface.",
      "When {WDR} does share, it carries real weight, and {RCH} has usually created the safety for it to land.",
      "You've both had to stretch toward each other in ways that have probably made you more capable partners.",
    ],
    stickingPoints: [
      "{RCH} can feel like {RCH_isC} always the one initiating emotional depth, always doing the emotional work, always making the first move.",
      "The reserved partner can feel pressure to match an emotional expressiveness that isn't natural to {GRD}, which can push {GRD_obj} further into withdrawal.",
      "The translation gap is real. What {U} means and what {P} hears aren't always the same thing, and the assumption that you've understood each other can lead to confusion downstream.",
    ],
    patterns: [
      "{U} and {P} sometimes find that you mean something the other doesn't quite receive. The signal and the interpretation don't always match.",
      "Understanding each other has taken real effort, and usually more conversation than you'd expect.",
      "When {U} and {P} are communicating well, it's because you're both actively working to understand each other, rather than assuming you already do.",
    ],
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
      "{U} and {P} have strong, complementary instincts. When named and managed, they produce repair that actually works for both people.",
      "You cover very different emotional territory, one tracks the logic, one tracks the feeling. The relationship has range.",
      "The dynamic is highly solvable once it's named. Many couples with this pattern go on to build some of the most intentional relationships.",
    ],
    stickingPoints: [
      "{RCH_pos} move toward resolution can close off the space {WDR} needs. The conversation starts before {WDR} is ready.",
      "{WDR_pos} visible emotion during withdrawal can look to {RCH} like something that needs fixing immediately, which makes {RCH} push harder.",
      "It can feel like one person cares more than the other, even though you're simply expressing it at different times and in different ways.",
    ],
    patterns: [
      "When something is hard, {U} and {P} are usually not in the same place at the same time. {RCH} is ready to engage. {WDR} needs the space.",
      "What reads as pulling away is usually just needing room to process. What reads as pressure is usually just care.",
      "The gap between your instincts is not a character flaw. It means you're wired differently, which requires understanding from each partner.",
    ],
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
      "{U} and {P} can coexist in quiet without it feeling like distance. Silence between you is comfortable rather than tense.",
      "Neither of you puts things into the shared space before they're formed. What comes out tends to be considered.",
      "The relationship has real privacy and mutual respect for each other's interior life.",
    ],
    stickingPoints: [
      "Neither partner is offering a lot of emotional visibility to the other. The relationship can feel more okay on the outside than it is on the inside.",
      "When something is wrong, neither of you naturally reaches for the other first. Problems can sit longer than they should.",
      "Two people who both process privately can coexist comfortably without ever quite landing in the relationship's emotional interior.",
    ],
    patterns: [
      "{U} and {P} probably have fewer dramatic conversations than most couples. The emotional content of the relationship tends to go inward.",
      "{RCH} has a low-level push toward getting things resolved. {WDR} tends to need more time before the conversation is fully possible.",
      "When you do talk through something, it tends to be calmer and more considered than it would be for more expressive pairings.",
    ],
    tips: [
      { title: "Build a practice of asking", body: "Not 'are you okay?' but 'what's actually going on for you right now?' Two people who both hold things privately need to be asked before they'll share their feelings.", phraseTry: "What's actually going on for you right now? How are you feeling?" },
      { title: "Schedule the emotional check-in", body: "{U} and {P} are both capable of going long stretches without naming what's going on inside. A regular, brief check-in creates the structure that neither of you will naturally generate on your own.", phraseTry: "Can we do fifteen minutes on Sunday? Just to check in properly." },
      { title: "The quiet isn't a problem, until it is", body: "Low-drama is a real quality. The work is making sure the ease isn't covering for avoided conversations. Check in on whether the calm is genuine or whether something is sitting unspoken.", phraseTry: "Is there anything sitting unspoken between us right now? I want to make sure we're actually okay." },
    ],
  },
  {
    id: "YZ", typeA: "Y", typeB: "Z",
    name: "The sanctuary",
    tagline: "You both need space when things get hard. The difference is how much it shows, and that gap is worth understanding.",
    description: "When things get hard, {U} and {P} both pull back. {EXP} carries the emotional weight visibly while withdrawn. {GRD} holds everything privately. The return is slow for both. Hard moments can sit for a long time before either of you surfaces them.",
    nuance: "Real depth runs in this pairing, often more than either partner shows. The risk is that the depth never surfaces, because neither of you naturally initiates the opening. {EXP}, once ready, tends to be more willing to bring it back. Making that the agreed pattern gives {GRD} the full space, without indefinite silence.",
    color: "#7C3AED", shade: "#F5F0FF",
    famousDuos: [
      { names: "Joel & Clementine", show: "Eternal Sunshine of the Spotless Mind", note: "He held everything privately; she expressed the weight of everything she was feeling. Both needed space. Both took it in different ways." },
      { names: "Anne Elliot & Captain Wentworth (early)", show: "Persuasion", note: "Both withdrew and held things close. The return was slow and required one of them to finally speak." },
    ],
    strengths: [
      "Things don't escalate in the moment. {U} and {P} both have the instinct to step back before the conversation gets more heated than it needs to be.",
      "When the conversation does happen, it tends to be calmer and more real than it would have been at the height of it.",
      "Both of you understand the need for space, so you're less likely to take it personally when the other person needs it.",
    ],
    stickingPoints: [
      "{U} and {P} can both wait a long time for the other to come back first. That waiting can start to feel like abandonment, even when it's just the process.",
      "{EXP_pos} visible emotion during withdrawal can be hard for {GRD} to know what to do with. It isn't a signal to engage, but it doesn't look like 'I'm fine' either.",
      "Hard things can sit for a very long time before either of you surfaces them. Without a deliberate practice, important things go unaddressed.",
    ],
    patterns: [
      "After a hard moment, {U} and {P} both need time, but the space is usually helpful.",
      "The coming-back-together step sometimes takes longer than it needs to because neither of you naturally initiates it.",
      "When the conversation does happen, it tends to be more complete than it would have been earlier. The depth just required time.",
    ],
    tips: [
      { title: "Let {EXP} initiate the return", body: "{EXP}, once ready, tends to be more willing to bring it back. Make that the agreed pattern. {EXP} signals readiness, and {GRD} gets the full space, without indefinite silence.", phraseTry: "I'm ready when you are. Take your time. I'll be here." },
      { title: "Bound the space with a time", body: "'I need some time' is not as useful as 'I need until tonight.' A specific return time lets the other person stop the worried waiting and trust the process.", phraseTry: "I need until tomorrow morning. I'll come find you then." },
      { title: "Create a regular time for openness", body: "{U} and {P} need a deliberate structure for things to surface. A weekly check-in, even 10 minutes, creates the opening that neither of you will naturally generate on your own.", phraseTry: "Can we do ten minutes on Sunday? Not about anything specific. I just want to check in." },
    ],
  },
];
