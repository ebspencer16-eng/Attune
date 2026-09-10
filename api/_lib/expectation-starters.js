/**
 * How a given couple type should approach each Expectations category.
 *
 * ── WHY THIS EXISTS ───────────────────────────────────────────────────────
 * Every Expectations category page opens with a paragraph. When the couple's
 * type is known the website prints one written for that pairing, under a
 * heading naming both of them; otherwise it falls back to the category's
 * general introduction.
 *
 * The table was inline in the website's results component, so the app only
 * ever had the fallback. Six category pages, ten pairings, and the app showed
 * the generic paragraph to everyone.
 *
 * Keyed by category id, then by the pairing code with its two letters sorted,
 * which is how the couple type ids are formed.
 */

export const EXP_CAT_STARTERS = {
  household: {
    WW: "You're both expressive and emotionally present, but domestic logistics tend to go unspoken even in open couples. Name who's doing what explicitly, because your ability to talk about feelings doesn't automatically extend to who's vacuuming.",
    XX: "You both process privately and get things done. The risk is that one person quietly takes on more without raising it. Agree on who handles what, and build a regular check-in so that quiet resentment doesn't build under the efficiency.",
    YY: "You're both attuned and feeling-forward. Domestic friction can land harder than expected when neither of you wants to seem petty for raising it. Name the logistics early. It's not unromantic to decide who buys groceries.",
    ZZ: "You're both internal processors, which means domestic imbalances can simmer quietly for a long time before either of you names them. Schedule a review of who's carrying what every few months. Domestic load is exactly the kind of thing that drifts without conversation.",
    WX: "One of you brings things to the surface quickly; the other processes before speaking. Make sure household logistics get talked about at a set time rather than only when someone reaches a tipping point.",
    WY: "One of you addresses things quickly; the other needs time first. Household friction rarely feels urgent enough to raise, until it is. Set a regular rhythm for reviewing who's doing what, so it doesn't only get named when someone is already frustrated.",
    WZ: "One of you reaches out when something needs addressing; the other holds things close. Domestic imbalances tend to accumulate silently in couples like yours. Build a habit of naming household roles explicitly rather than letting them form by default.",
    XY: "One of you wants to solve quickly; the other needs space first. Household logistics decisions can stall if one person isn't ready and the other is impatient. Pick a weekly moment, 15 minutes, to review and decide together.",
    XZ: "You both tend to hold things internally. Domestic resentment is particularly likely to stay quiet in a pairing like yours, until it isn't. Make a habit of naming the load each person is carrying, before something breaks.",
    YZ: "You both need space before engaging with conflict. Household imbalances are easy to defer. Make a habit of reviewing roles at a set time so the conversation doesn't require someone to work up to it.",
  },
  financial: {
    WW: "You're both expressive and emotionally open, which can actually make financial conversations easier to start, but harder to finish. Be careful that talking about money doesn't become a substitute for making actual decisions about it.",
    XX: "You both tend to process privately and move efficiently. Financial decisions are one area where that efficiency can skip important alignment. Slow down enough to make sure both of you actually agree, not just that both of you accept.",
    YY: "You're both feeling-forward, financial conversations can carry emotional weight that makes them harder to start. Know that it's okay for this to be uncomfortable. The discomfort doesn't mean you're financially incompatible.",
    ZZ: "You both tend to carry things quietly. Financial misalignments in a pairing like yours can go unnamed for a long time. Set a quarterly money conversation, not to review budgets, but to check: are we still aligned on what money is for?",
    WX: "One of you surfaces things quickly; the other needs time. Financial decisions benefit from the person who needs more time actually getting it, rather than quietly conceding. Make sure financial conversations include a built-in pause for reflection before deciding.",
    WY: "You have different engagement clocks. Financial conversations should happen when both of you are actually ready, not when one person pushes and the other complies. Pick a time for it when neither of you is stressed.",
    WZ: "One of you names things openly; the other holds them close. Financial alignment is hard if one person is doing all the raising. Build an expectation that both people bring concerns.",
    XY: "One of you wants to resolve quickly; the other needs time. Financial decisions made under time pressure rarely hold. Make sure the person who needs space gets it, even if it delays the decision.",
    XZ: "You're both private processors. Financial transparency requires deliberate effort in a pairing like yours, since neither of you naturally pushes the other to open up. Schedule it.",
    YZ: "You both need space before engaging. Money conversations can easily get deferred indefinitely. Set a regular, calm moment for financial check-ins, not after a tension-filled moment, but on a neutral calendar day.",
  },
  career: {
    WW: "You're both expressive and tend to process out loud. Career conversations can become long, emotionally complex exchanges. It's fine to talk, but make sure the talking leads somewhere. End career conversations with an actual decision or next step.",
    XX: "You both tend to process internally. Career trade-offs can stay entirely invisible between two private people. Make time to say out loud: whose career is setting the pace right now? Is that working for both of you?",
    YY: "You're both emotionally attuned. Career sacrifice is one of the harder things to name when you don't want to seem demanding. Know that naming it is an act of care, not selfishness, the person carrying more deserves to have it acknowledged.",
    ZZ: "You're both quiet processors. Career imbalances in couples like yours can go entirely unspoken until they've built significant resentment. Check in explicitly about whose career is getting prioritized, and whether that feels fair to both.",
    WX: "One of you raises things quickly; the other processes first. Career decisions with long-term implications need both of you fully present. Don't let the faster processor set the pace before the other has had time to think.",
    WY: "You have different timelines for readiness. Career decisions, especially big ones, should wait until both of you are genuinely ready to decide, not just willing to stop discussing.",
    WZ: "One of you speaks up when something needs to be named; the other tends to hold it. Career concerns are exactly the kind of thing the quieter partner may be carrying without raising. Build an expectation that career check-ins happen on both sides.",
    XY: "One of you wants to decide quickly; the other needs time. Career decisions are rarely truly urgent, give the person who processes slower the time they need. A decision made under pressure tends to not hold.",
    XZ: "You're both private. Career conversations require deliberate effort in a pairing like yours because neither of you will naturally push the topic. Build in a regular 'where are we on career stuff?', once a quarter is enough.",
    YZ: "You both need space to process. Career conversations that need to happen can be deferred indefinitely when both people are comfortable waiting. Set a specific time for them, not just 'soon.'",
  },
  emotional: {
    WW: "You're both emotionally expressive and attuned, which means invisible labor is actually more visible in your relationship than most. The risk is that naming it starts to feel like scorekeeping. Frame it as awareness, not accounting.",
    XX: "You both tend toward efficiency and private processing. Emotional labor in a pairing like yours can go entirely unremarked, since neither of you naturally points to it. Name it. The person carrying more needs it acknowledged.",
    YY: "You're both deeply feeling and emotionally present. The invisible labor in your relationship is probably significant on both sides. The work is both carrying the emotional load and making sure the other person sees it too.",
    ZZ: "You're both quiet carriers. Emotional labor is probably distributed in your relationship in ways that neither of you has fully mapped. It can accumulate invisibly. Make a habit of asking: 'what are you managing right now that I might not know about?'",
    WX: "One of you names things directly; the other holds them. Emotional labor that goes unspoken is still labor. The quieter partner may be carrying more than they say. Build a norm where both of you name what you're managing.",
    WY: "You have different timelines. Emotional labor conversations can feel premature for one partner and overdue for the other. Pick a neutral time, not when one person is already drained, to check in about what each of you is carrying.",
    WZ: "One of you speaks up; the other tends to hold things close. Emotional labor is exactly the kind of thing that the more private partner absorbs silently. Build an expectation that both people name what they're tracking and carrying.",
    XY: "One of you wants to resolve quickly; the other needs time. Emotional labor conversations can feel charged. Don't rush the one who needs space, the conversation is more useful when both of you are actually present.",
    XZ: "You're both private processors. Emotional labor is particularly invisible in pairings like yours. It's being done, often a lot of it, by one or both of you, without being named. Make it a practice to name it, even briefly.",
    YZ: "You both need space to engage. Emotional labor conversations can be repeatedly deferred in a pairing like yours. Set a recurring, calm check-in, not a big conversation, just a brief: 'what are you carrying right now?'",
  },
  life: {
    WW: "You're both expressive and emotionally present. Life and values conversations can feel natural, but they can also go long without reaching resolution. For big questions, agree in advance that you'll end with each person's actual current position, even if it's unresolved.",
    XX: "You both tend to process privately. You may each have more formed views on life and values questions than the other knows about. Make space to share your position and the reasoning underneath it. It changes the conversation.",
    YY: "You're both emotionally attuned and values-driven. Life and values disagreements can carry real weight. Know that diverging on some of these questions is normal, and not a sign you're wrong for each other. What matters is how you hold the difference.",
    ZZ: "You're both private processors. Big-picture questions about life and values can stay entirely internalized in a pairing like yours. Make a deliberate practice of sharing your current thinking on these topics, not to resolve them, but to stay current with each other.",
    WX: "One of you surfaces things readily; the other processes first. Life and values conversations benefit from both people having time to think before sharing. Don't let the faster processor carry more of the conversation than the other person is ready for.",
    WY: "You have different timelines for readiness. Life questions, children, location, faith, shouldn't be decided when one person isn't fully ready to engage. Wait for both.",
    WZ: "One of you speaks up; the other holds things close. Life and values conversations require both people to actually share their real positions, including the ones that don't feel safe. Build an expectation that both of you bring your actual views.",
    XY: "One of you wants to decide; the other needs time. For life questions with real implications, the person who processes more slowly needs time, even if it delays the decision. A premature decision on big things tends to create pressure later.",
    XZ: "You're both private. Life and values alignment can be assumed rather than actively explored in pairings like yours. Don't let the stability of your relationship mean you stop checking in on where each of you is with the big questions.",
    YZ: "You both need space before engaging. Life and values conversations can be deferred indefinitely when both of you are comfortable waiting. Set a specific, recurring time to revisit where you each are, not when something forces the conversation.",
  },
};

/**
 * The opening paragraph for a category, for this couple.
 *
 * Falls back to the category's general introduction, which is what the website
 * does when the type is unknown, so a page is never left without one.
 */
export function starterFor(categoryId, coupleTypeId, fallback) {
  const key = coupleTypeId ? coupleTypeId.split('').sort().join('') : null;
  return (key && EXP_CAT_STARTERS[categoryId]?.[key]) || fallback || null;
}
