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
 *
 * ── WHY EACH ONE OPENS ON THE INSTRUCTION ─────────────────────────────────
 * Every one of these used to open by describing the couple: "One of you brings
 * things to the surface quickly; the other processes before speaking", or
 * "You're both private processors."
 *
 * Ellie cut all fifty. Her reasoning: that sentence says close to the same
 * thing on every page, and it repeats what the couple has just read in their
 * Communication results. A reader arriving at Household, then Financial, then
 * Career is told their own type three times before being told anything they
 * can act on.
 *
 * All fifty fit the pattern and none was an exception, which is itself the
 * argument: a sentence that can be written fifty times from a template is
 * setup rather than guidance. What is left is the part that differs by
 * category, which is the part worth reading.
 *
 * If one is rewritten, it should still open on the instruction.
 */

export const EXP_CAT_STARTERS = {
  household: {
    WW: "Try to say out loud who does which chore. Being able to talk about feelings doesn't automatically mean you agree on who's vacuuming.",
    XX: "One of you may quietly take on more of the chores without saying so. Agree on who handles which chores, and set a regular time to review that split so that resentment doesn't build.",
    YY: "Friction over chores can feel bigger than expected when neither of you wants to seem petty by raising it. Try to decide early who handles which chores. It is not unromantic to decide who buys groceries.",
    ZZ: "Every few months, try to set a time to review which chores each of you is carrying. The split of housework tends to drift when you don't talk about it.",
    WX: "Try to talk about who handles which chores at a set time, rather than only when one of you reaches a tipping point.",
    WY: "Friction over chores rarely feels urgent enough to raise, until it is. Try to set a regular time to review who does which chores, so an uneven split doesn't only come up when one of you is already frustrated.",
    WZ: "An uneven split of chores can build up without either of you saying anything. Try to make a habit of saying out loud who does which chores, rather than letting the split form by default.",
    XY: "Decisions about chores can stall if one of you isn't ready and the other is impatient. Try to pick 15 minutes each week to review who does which chores and decide together.",
    XZ: "When you both keep things to yourselves, resentment about chores can stay quiet until it boils over. Try to make a habit of saying out loud which chores each of you is carrying.",
    YZ: "An uneven split of chores is easy to leave unmentioned. Try to review who does which chores at a set time, so neither of you has to work up to raising it.",
  },
  financial: {
    WW: "Be careful that talking about money doesn't become a substitute for making actual decisions about it.",
    XX: "Deciding quickly can skip real agreement when it comes to money. Before you settle a financial decision, try to slow down and make sure you both agree with it, rather than one of you simply accepting it.",
    YY: "It is completely fine for talking about money to feel uncomfortable. That discomfort doesn't mean you're financially incompatible.",
    ZZ: "Differences about money can go unspoken for a long time when you both keep things to yourselves. Try to set a money conversation once a quarter. This is not to review budgets, but to ask each other: are we still aligned on what money is for?",
    WX: "Financial decisions go better when whichever of you needs more time to think actually gets that time, rather than quietly giving in. Try to build a pause into money conversations so you each have time to think before you decide.",
    WY: "Money conversations should happen when you are both ready, rather than when one of you pushes and the other goes along with it. Try to pick a time when neither of you is stressed.",
    WZ: "Agreeing about money is hard if one of you raises every money concern. Try to make it expected that each of you brings up your own money concerns.",
    XY: "Financial decisions made under time pressure rarely hold. It is fine for a decision to wait, so make sure whichever of you needs time to think gets that time.",
    XZ: "When you are both guarded, being open about money takes deliberate effort, since neither of you naturally pushes the other to open up. Try to schedule a regular time to talk through your finances together.",
    YZ: "Money conversations can easily get put off indefinitely. Try to set a regular, calm time to talk about money, on an ordinary day rather than right after a tense moment.",
  },
  career: {
    WW: "Career conversations can become long, emotionally complex exchanges. It's fine to talk, but make sure the talking leads somewhere. End career conversations with an actual decision or next step.",
    XX: "Career trade-offs can stay entirely invisible between two private people. Make time to say out loud: whose career is setting the pace right now? Is that working for both of you?",
    YY: "Career sacrifice can be hard to say out loud when you don't want to seem demanding. Telling your partner what you have given up is an act of care, not selfishness. Whichever of you is giving up more deserves to have that sacrifice acknowledged.",
    ZZ: "An imbalance between your careers can go unspoken until it has built real resentment. Try to ask each other directly whose career is getting priority right now, and whether that feels fair to both of you.",
    WX: "Career decisions with long-term consequences need both of you fully engaged in the conversation. Try not to let whichever of you decides faster set the pace before your partner has had time to think.",
    WY: "Career decisions, especially big ones, should wait until both of you are genuinely ready to decide, not just willing to stop discussing.",
    WZ: "The more private one of you may be carrying career concerns without raising them. Try to make it expected that you each ask the other about career concerns.",
    XY: "Career decisions are rarely truly urgent, so it is fine to give whichever of you takes longer to think the time they need. A decision made under pressure tends not to hold.",
    XZ: "When you are both guarded, career conversations take deliberate effort, because neither of you will naturally bring up careers. Try to ask each other once a quarter: where are we each with our careers?",
    YZ: "Career conversations that need to happen can be deferred indefinitely when both people are comfortable waiting. Set a specific time for them, not just 'soon.'",
  },
  emotional: {
    WW: "Pointing out the emotional labor each of you does can start to feel like scorekeeping. Try to point it out so you stay aware of each other, rather than to keep score.",
    XX: "When you are both guarded, emotional labor can go unnoticed, since neither of you naturally points to it. Try to say out loud what emotional labor each of you is doing. Whichever of you carries more needs that work acknowledged.",
    YY: "You each carry emotional labor that can be hard for your partner to see. Try to keep carrying your share, and to make sure your partner sees what you carry.",
    ZZ: "Neither of you may have fully mapped how the emotional labor in your relationship is split, so that labor can build up without either of you seeing it. Try to make a habit of asking: 'what are you managing right now that I may not know about?'",
    WX: "Emotional labor that goes unspoken is still labor. The more guarded one of you may be carrying more than they say. Try to make it normal for each of you to say what you're keeping track of for the two of you.",
    WY: "Conversations about emotional labor can feel too early for one of you and overdue for the other. Try to pick a neutral time, not when one of you is already drained, to ask each other what you are each carrying.",
    WZ: "The more private one of you may tend to take on emotional labor silently. Try to make it expected that you each say out loud what you're keeping track of and carrying for the two of you.",
    XY: "Conversations about emotional labor can feel charged. Try not to rush whichever of you needs time to think, because the conversation is more useful when you are both fully present.",
    XZ: "When you are both guarded, emotional labor is especially hard to see. One or both of you may be doing a lot of it without saying so. Try to make a habit of saying out loud the emotional labor you are doing, even briefly.",
    YZ: "Conversations about emotional labor can be put off again and again. Try to set a recurring, calm moment to ask each other one short question: 'what are you carrying right now?'",
  },
  life: {
    WW: "Life and values conversations can feel natural, but they can also go long without reaching resolution. For big questions, agree in advance that you'll end with each person's actual current position, even if it's unresolved.",
    XX: "Each of you may hold more settled views on life and values than your partner knows about. Try to tell each other where you stand and why. Hearing the reasoning behind each other's views can change the conversation.",
    YY: "Disagreements about life and values can carry real weight. It is normal to differ on some of these questions, and it is not a sign you're wrong for each other. What matters is how you handle the places where you differ.",
    ZZ: "Big questions about life and values can stay entirely in your own heads. Try to make a habit of telling each other your current thinking on life and values, not to settle anything, but to stay up to date with each other.",
    WX: "Life and values conversations go better when you both have time to think before sharing. Try not to let whichever of you responds faster carry more of the conversation than your partner is ready for.",
    WY: "Life questions like children, location and faith shouldn't be decided when one of you isn't fully ready. It is completely fine to wait until you are both ready to decide.",
    WZ: "Life and values conversations require both people to actually share their real positions, including the ones that don't feel safe. Build an expectation that both of you bring your actual views.",
    XY: "For big life questions, whichever of you takes longer to think needs that time, even if it delays the decision. A rushed decision on a big question tends to create pressure later.",
    XZ: "When you are both guarded, it is easy to assume you agree on life and values rather than actually talking about them. Even when your relationship feels steady, try to keep asking where each of you stands on the big questions.",
    YZ: "Life and values conversations can be put off indefinitely when you are both comfortable delaying the conversations. Try to set a recurring time to revisit where you each stand, rather than waiting for something to force the conversation.",
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
