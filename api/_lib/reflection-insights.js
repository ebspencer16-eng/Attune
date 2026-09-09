/**
 * The Relationship Reflection insights, and the titles they are shown under.
 *
 * ── WHY THIS MOVED ────────────────────────────────────────────────────────
 * REFLECTION_ACTION_TITLES was the last of the three copy sources in
 * api/_content that the app could not reach. It was consumed only by
 * src/App.jsx, so the website had a reflection action plan and the app did
 * not.
 *
 * ── THE EVIDENCE RULE ─────────────────────────────────────────────────────
 * An insight that says "you both" or "you each" has to rest on at least two
 * pieces of evidence, one from each person. Asserting something about a couple
 * from one person's answer is the failure this section is most exposed to,
 * because most of it is free text and free text is easy to over-read.
 *
 * The website enforced that with a dev-only console warning, which never runs
 * in production and never ran on the server at all. Here it throws in tests
 * and logs in production, so the rule is checked wherever this runs.
 */

import { ANNIVERSARY_QUESTIONS, admiredNoun, NON_ANSWER } from '../_anniversary-questions.js';
import { contentFor } from '../_content/index.js';

const admiredNounLower = (v) => { const n = admiredNoun(v); return n ? n.toLowerCase() : n; };

/**
 * Is this free text an answer, or a placeholder?
 *
 * Under eight characters, or anything matching NON_ANSWER, is treated as not
 * provided. An insight built on "n/a" asserts a problem the person never
 * described. This lived in src/App.jsx and did not come across with the code
 * that uses it, so every insight threw the moment it was reached.
 */
export function isSubstantive(v) {
  if (typeof v !== 'string') return false;
  const t = v.trim().replace(/[.!?]+$/, '');
  if (t.length < 8) return false;
  if (NON_ANSWER.test(t)) return false;
  return true;
}

/** A person's own words, marked as a quote rather than as our prose. */
export function quoted(v) {
  return `\u201C${String(v || '').trim().replace(/\s+/g, ' ')}\u201D`;
}

export function reflectionActionTitle(title, content) {
  const t = String(title || "");
  const titles = (content || contentFor(undefined)).REFLECTION_ACTION_TITLES;
  if (titles[t]) return titles[t];
  // Fall back on a light rewrite of the "One of you named X" shape.
  const m = t.match(/^(.+?) named (.+)$/);
  if (m) return `Read what ${m[1]} said about ${m[2]}, together`;
  return t;
}

export function deriveAnniversaryInsights(mine, theirs, userName, partnerName, coupleType) {
  const insights = [];
  // Dev-only guard so a future "both" claim cannot ship on one-sided evidence.
  const push = (ins) => {
    // Checked wherever this runs, not only in a dev browser. An insight that
    // speaks for both people on one person's answer is the thing this section
    // must never do.
    const claimsBoth = /\b(both|you each|you two)\b/i.test(`${ins.title} ${ins.body}`);
    if (claimsBoth && !(ins.evidence?.length >= 2)) {
      const message = `[reflection] insight claims both partners on fewer than two pieces of evidence: ${ins.title}`;
      if (process.env.NODE_ENV === 'test') throw new Error(message);
      console.error(message);
    }
    if (!ins.tier) console.error(`[reflection] insight is missing its evidence tier: ${ins.title}`);
    insights.push(ins);
  };
  const scaleQ = ANNIVERSARY_QUESTIONS.filter(q => q.type === "scale");
  const ctNote = coupleType ? `As a ${coupleType.name} couple, ` : "";

  // --- SCALE ALIGNMENT ---
  const scaleGaps = scaleQ.map(q => ({
    q,
    myVal: mine[q.id] ?? 2,
    theirVal: theirs[q.id] ?? 2,
    gap: Math.abs((mine[q.id] ?? 2) - (theirs[q.id] ?? 2)),
    avgVal: ((mine[q.id] ?? 2) + (theirs[q.id] ?? 2)) / 2,
  }));
  const overallFeelGap = Math.abs((mine.a0 ?? 2) - (theirs.a0 ?? 2));
  const overallQ = ANNIVERSARY_QUESTIONS.find(q=>q.id==='a0');

  // Overall feel perception gap
  const bothRatedOverall = mine.a0 != null && theirs.a0 != null;
  if (bothRatedOverall && overallFeelGap >= 1 && overallQ) {
    const myLabel = overallQ.scaleLabels[mine.a0 ?? 2];
    const theirLabel = overallQ.scaleLabels[theirs.a0 ?? 2];
    push({
      type: "explore",
      tier: 1,
      evidence: ["a0:mine","a0:theirs"],
      title: "You're experiencing this relationship from different vantage points",
      prompt: "Let's talk about how we each see the relationship right now. I want to understand what's shaping our different reads.",
      body: `${userName} describes the overall feel as "${myLabel}", ${partnerName} says "${theirLabel}." Neither is wrong, and the gap doesn't mean one of you isn't paying attention. But it's worth understanding what's shaping each perspective.`,
      priority: "Have this conversation gently",
      action: `Ask each other: what would make this feel even better from where you're standing right now? Don't defend your own rating, get curious about theirs first.`,
    });
  } else if (bothRatedOverall && overallQ) {
    const sharedLabel = overallQ.scaleLabels[Math.round(((mine.a0 ?? 2) + (theirs.a0 ?? 2)) / 2)];
    push({
      type: "strength",
      tier: 1,
      evidence: ["a0:mine","a0:theirs"],
      title: "You're on the same page about how the relationship feels",
      body: `Both of you independently described the relationship as something close to "${sharedLabel}." Shared perception of where you are is a meaningful starting point, it means you're reading the same room.`,
      priority: "Build on this",
      action: `Name it together. When you both feel good about things but don't say it out loud, that warmth stays private. Saying "I feel like things are really good between us right now" creates a shared moment instead of parallel ones.`,
    });
  }

  // Fun gap
  const funQ = scaleGaps.find(s=>s.q.id==='a_sat_fun');
  if (funQ && mine.a_sat_fun != null && theirs.a_sat_fun != null && funQ.gap >= 2) {
    const wantMoreFun = (mine.a_sat_fun ?? 2) < (theirs.a_sat_fun ?? 2) ? userName : partnerName;
    push({
      type: "explore",
      tier: 1,
      evidence: ["a_sat_fun:mine","a_sat_fun:theirs"],
      title: "You're not aligned on how much lightness and fun you're getting",
      prompt: "Let's talk about whether we're making enough room for fun. I don't want to keep saving it for vacations.",
      body: `${wantMoreFun} feels like you could be having more fun together than you currently are. This isn't a complaint about the relationship, it's a signal about what's been deprioritized.`,
      priority: "Easy win to act on",
      action: `Block something deliberately fun in the next two weeks, not a big trip, just something that has no productive purpose whatsoever. Fun doesn't usually happen by accident when life gets full.`,
    });
  } else if (funQ && mine.a_sat_fun != null && theirs.a_sat_fun != null && funQ.avgVal >= 3) {
    push({
      type: "strength",
      tier: 1,
      evidence: ["a_sat_fun:mine","a_sat_fun:theirs"],
      title: "You both feel like there's real lightness in what you have",
      body: `Both of you rate the fun and levity in your relationship positively. That matters more than it sounds, couples who laugh together regularly tend to weather hard periods better than those who save fun for vacations.`,
      priority: "Keep prioritizing it",
      action: `Don't let busyness quietly crowd out the small pleasures. Whatever's been creating lightness lately, protect it.`,
    });
  }

  // Communication gap
  const commQ = scaleGaps.find(s=>s.q.id==='a_sat_comm');
  if (commQ && mine.a_sat_comm != null && theirs.a_sat_comm != null && commQ.gap >= 2) {
    const lowPerson = (mine.a_sat_comm ?? 2) < (theirs.a_sat_comm ?? 2) ? userName : partnerName;
    push({
      type: "explore",
      tier: 1,
      evidence: ["a_sat_comm:mine","a_sat_comm:theirs"],
      title: "One of you finds hard conversations easier than the other does",
      prompt: "Let's talk about how hard conversations land for each of us. I want to know if one of us is carrying more of the friction.",
      body: `${lowPerson} rates how well you handle difficult conversations more cautiously than their partner does. This asymmetry is common, usually it means one person absorbs more friction before raising something, while the other thinks things resolve smoothly.`,
      priority: "Worth naming explicitly",
      action: `${lowPerson}: try naming one thing that's been sitting unspoken, not a criticism, just something you've been carrying. The other person likely doesn't know it's there.`,
    });
  }

  const myGrateful = (mine.a3 || "").toLowerCase();
  const theirGrateful = (theirs.a3 || "").toLowerCase();
  const seenWords = ["notice","see","understand","get me","gets me","knows","space","pull","curiosity","curious","interest","interested","make me","laugh","appreciat","pay attention","attentiv","present","remember"];
  const myFeelsSeen = seenWords.some(w => myGrateful.includes(w));
  const theirFeelsSeen = seenWords.some(w => theirGrateful.includes(w));
  // Both quotes have to be real answers before we say "you each".
  const myA3ok = isSubstantive(mine.a3), theirA3ok = isSubstantive(theirs.a3);
  if (myFeelsSeen && theirFeelsSeen && myA3ok && theirA3ok) {
    push({
      type: "strength",
      tier: 2,
      evidence: ["a3:mine","a3:theirs"],
      title: "You each feel genuinely seen",
      body: `What each of you is most grateful for right now speaks to being known, not just liked. ${userName}: ${quoted(mine.a3)}. ${partnerName}: ${quoted(theirs.a3)}. These are descriptions of how you're actually showing up for each other.`,
      priority: "Preserve intentionally",
      action: `The things you're each most grateful for are the things most worth protecting. Whatever you're each doing that makes the other feel known, keep doing it deliberately. These are the first things to quietly erode when life gets full.`,
    });
  } else if ((myFeelsSeen && myA3ok) || (theirFeelsSeen && theirA3ok)) {
    const who = (myFeelsSeen && myA3ok) ? userName : partnerName;
    const text = (myFeelsSeen && myA3ok) ? mine.a3 : theirs.a3;
    push({
      type: "strength",
      tier: 2,
      evidence: ["a3:one"],
      title: `${who} named being known, not just liked`,
      body: `${who} is most grateful for ${quoted(text)}. That is a description of being understood rather than simply appreciated, and it is worth knowing that it lands that way.`,
      priority: "Keep doing it",
      action: `Whatever produces that feeling, it is probably something small and repeated rather than grand. Identify it and protect it, because these are the first things to erode when life gets full.`,
    });
  }

  // --- RECENT MEMORY (a_memory) --- collected but previously never surfaced
  if (isSubstantive(mine.a_memory) && isSubstantive(theirs.a_memory)) {
    push({
      type: "strength",
      tier: 2,
      evidence: ["a_memory:mine", "a_memory:theirs"],
      title: "You each had something recent that made you smile",
      body: `${userName} wrote ${quoted(mine.a_memory)}. ${partnerName} wrote ${quoted(theirs.a_memory)}. Neither of you knew what the other would say.`,
      priority: "Say these out loud",
      action: `Read each other's answer, then say why that one. The moments people pick are rarely the obvious ones, and the reason behind the choice is usually the part the other person has never heard.`,
    });
  }

  // --- DAY-TO-DAY CONNECTION (a_sat_conn) --- collected but previously unused
  const connQ = scaleGaps.find(s => s.q.id === "a_sat_conn");
  if (connQ && mine.a_sat_conn != null && theirs.a_sat_conn != null) {
    const qDef = ANNIVERSARY_QUESTIONS.find(q => q.id === "a_sat_conn");
    if (connQ.gap >= 2) {
      push({
        type: "explore",
        tier: 1,
        evidence: ["a_sat_conn:mine", "a_sat_conn:theirs"],
        title: "You are not feeling equally connected day to day",
      prompt: "Let's talk about what makes each of us feel close day to day. I want to know what actually builds connection for you.",
        body: `${userName} rates day-to-day connection as "${qDef.scaleLabels[mine.a_sat_conn]}". ${partnerName} rates it as "${qDef.scaleLabels[theirs.a_sat_conn]}". Same weeks, same house, different read. That gap usually means the things that create closeness for one of you are not the same things that create it for the other.`,
        priority: "Name what closeness looks like",
        action: `Each of you finish this sentence out loud: "I feel closest to you when we..." Do not negotiate the answers, just hear them. The point is finding out whether you have been aiming at different targets.`,
        coupleTypeNote: coupleType ? `${ctNote}a difference in felt connection is worth surfacing early rather than letting it accumulate.` : "",
      });
    } else if (connQ.avgVal >= 3) {
      push({
        type: "strength",
        tier: 1,
        evidence: ["a_sat_conn:mine", "a_sat_conn:theirs"],
        title: "You both feel connected day to day",
        body: `${userName} says "${qDef.scaleLabels[mine.a_sat_conn]}" and ${partnerName} says "${qDef.scaleLabels[theirs.a_sat_conn]}". Landing in the same place on day-to-day closeness, independently, is a real signal. It is also the first thing to slip when a season gets busy.`,
        priority: "Protect what is working",
        action: `Work out what is actually producing this. It is almost never the big things. Name the small repeated one, and guard it when the calendar fills up.`,
      });
    }
  }

  // --- WHAT THEY WANT NEXT (a4) ---
  // Previously classified each answer as "adventure" or "ritual" and assigned
  // roles from that. When one answer matched both word sets, both roles landed
  // on the same person. The contrast is legible without being labelled, so the
  // answers are shown side by side instead.
  if (isSubstantive(mine.a4) && isSubstantive(theirs.a4)) {
    push({
      type: "explore",
      tier: 2,
      evidence: ["a4:mine", "a4:theirs"],
      title: "You each named what you want more of",
      prompt: "Let's talk about what we each want more of. I want to make sure we're doing intentional things to meet those needs.",
      body: `${userName} wants ${quoted(mine.a4)}. ${partnerName} wants ${quoted(theirs.a4)}. Read those next to each other before deciding whether they are the same wish or two different ones.`,
      priority: "Compare directly",
      action: `Put both answers side by side and find the overlap. Most couples discover these are two routes to the same thing: more intentional time that actually feels like you. Pick one concrete version of each and try both this month.`,
    });
  }

  // --- FIVE YEAR VISION (a5) ---
  // Same reasoning as a4: the old version inferred who wanted "financial
  // stability" and who wanted "space", and could attribute both to one person.
  if (isSubstantive(mine.a5) && isSubstantive(theirs.a5)) {
    push({
      type: "explore",
      tier: 2,
      evidence: ["a5:mine", "a5:theirs"],
      title: "Your five-year pictures, in your own words",
      prompt: "Let's talk about where we each see us in five years. I want to know if we're building toward the same picture.",
      body: `${userName} pictures ${quoted(mine.a5)}. ${partnerName} pictures ${quoted(theirs.a5)}. These do not have to match. What matters is whether you have said them out loud to each other in this much detail.`,
      priority: "Build a shared map",
      action: `Block an evening for this one specifically. Where these two pictures overlap is your shared plan. Where they differ is not a problem to solve tonight, it is the thing to keep talking about. Get concrete: numbers, places, timelines.`,
    });
  }

  // --- GROWTH EDGES (a6) ---
  const myGrowth = (mine.a6 || "").toLowerCase();
  const theirGrowth = (theirs.a6 || "").toLowerCase();
  const presenceWords = ["present","here","in the room","phone","distracted","somewhere else","half"];
  const expressionWords = ["say","tell","hint","communicate","speak","need","express","directly"];
  const myWorksOnPresence = presenceWords.some(w => myGrowth.includes(w));
  const myWorksOnExpression = expressionWords.some(w => myGrowth.includes(w));
  const theirWorksOnPresence = presenceWords.some(w => theirGrowth.includes(w));
  const theirWorksOnExpression = expressionWords.some(w => theirGrowth.includes(w));
  // Fire if one partner works on presence and the other on expression — either direction
  const presencePerson = myWorksOnPresence ? userName : (theirWorksOnPresence ? partnerName : null);
  const expressionPerson = myWorksOnExpression ? userName : (theirWorksOnExpression ? partnerName : null);

  if (isSubstantive(mine.a6) && isSubstantive(theirs.a6) && presencePerson && expressionPerson && presencePerson !== expressionPerson) {
    push({
      type: "strength",
      tier: 2,
      evidence: ["a6:mine","a6:theirs"],
      title: "Where you each struggle is exactly what the other one offers",
      body: `${presencePerson} is working on being more present. ${expressionPerson} is working on saying what they need directly. Notice what's happening: each of you independently identified the thing that would most benefit the other person. That's rare.`,
      priority: "Make this mutual",
      action: `Tell each other. ${presencePerson}: "I know I disappear sometimes. I'm working on it, and I want you to tell me when it's happening." ${expressionPerson}: "I'm going to try to say what I actually need instead of waiting for you to notice." Saying it out loud creates accountability and removes the guesswork.`,
      coupleTypeNote: coupleType ? `${ctNote}this complementary dynamic is characteristic of your pairing, name it explicitly rather than hoping the other person notices.` : "",
    });
  }

  // --- APPRECIATION (a8) ---
  if (mine.a8 && theirs.a8) {
    if (mine.a8 === theirs.a8) {
      push({
        type: "strength",
        tier: 1,
        evidence: ["a8:mine","a8:theirs"],
        title: `You both admire the same thing in each other`,
        body: `Both of you independently named "${admiredNoun(mine.a8)}" as the quality you most admire in your partner right now. When two people independently land on the same word to describe what they value in the other, it usually means that quality is genuinely visible in daily life, not only in words.`,
        priority: "Say it out loud",
        action: `Tell each other directly. "The thing I most admire about you right now is your ${admiredNounLower(mine.a8)}." Hearing it said plainly lands differently than assuming the other person knows.`,
        coupleTypeNote: coupleType ? `${ctNote}shared admiration for the same quality is a meaningful signal of mutual recognition in your dynamic.` : "",
      });
    } else {
      push({
        type: "strength",
        tier: 1,
        evidence: ["a8:mine","a8:theirs"],
        title: `You admire different things in each other, both real`,
        body: `${userName} most admires ${partnerName}'s ${admiredNounLower(mine.a8)}. ${partnerName} most admires ${userName}'s ${admiredNounLower(theirs.a8)}. Different qualities, both freely given. This suggests each of you is genuinely being seen for something specific rather than getting generic praise.`,
        priority: "Make it direct",
        action: `Say it to each other: "${partnerName}, I most admire your ${admiredNounLower(mine.a8)} right now." It takes about eight seconds and lands better than you'd think.`,
        coupleTypeNote: coupleType ? `${ctNote}the ability to name specific admiration rather than general appreciation is a sign of real attunement.` : "",
      });
    }
  }

  // --- WHAT SHOULD HAVE GONE DIFFERENTLY (a7) ---
  // Only speak for both people when both actually described something. A
  // non-answer from one partner used to be quoted back as if it were a problem
  // they had raised.
  {
    const mineA7 = isSubstantive(mine.a7) ? mine.a7.trim() : null;
    const theirsA7 = isSubstantive(theirs.a7) ? theirs.a7.trim() : null;
    const hits = (t) => {
      const stressWords = ["stress","stressed","scared","anxious","worry","worried","pressure"];
      const communicationWords = ["said","listen","talk","told","quiet","silent","hint","assume"];
      const l = t.toLowerCase();
      return stressWords.some(w => l.includes(w)) || communicationWords.some(w => l.includes(w));
    };
    if (mineA7 && theirsA7) {
      const bothOnTheme = hits(mineA7) && hits(theirsA7);
      push(bothOnTheme ? {
        type: "explore",
        tier: 2,
        evidence: ["a7:mine","a7:theirs"],
        title: "You both identified a moment where communication broke down under pressure",
      prompt: "Let's talk about that moment when things broke down under pressure. I want to understand what each of us needed then.",
        body: `${userName} named ${quoted(mineA7)} and ${partnerName} named ${quoted(theirsA7)}. Both point at something not fully said or heard. Landing there independently, without coordinating, suggests it is a real pattern rather than a one-off.`,
        quotes: [{ name: userName, text: mineA7 }, { name: partnerName, text: theirsA7 }],
        priority: "Have the meta-conversation",
        action: `Don't relitigate the specific situation, instead, talk about the pattern. "When things get hard between us, what does each of us actually need in the first hour?" Getting to that agreement before the next hard moment changes how it plays out.`,
        coupleTypeNote: coupleType ? `${ctNote}understanding your default stress responses is one of the highest-leverage things you can do together.` : "",
      } : {
        type: "explore",
        tier: 2,
        evidence: ["a7:mine","a7:theirs"],
        title: "You each identified something you wish had gone differently",
      prompt: "Let's talk about what we each wish had gone differently. I want to hear it without either of us getting defensive.",
        body: `${userName} named ${quoted(mineA7)} and ${partnerName} named ${quoted(theirsA7)}. These don't have to match to be useful. The fact that both of you can identify something shows self-awareness, which is the first requirement for handling it better next time.`,
        quotes: [{ name: userName, text: mineA7 }, { name: partnerName, text: theirsA7 }],
        priority: "Talk about it directly",
        action: `Pick one of these to talk about. Not to assign blame, to understand what each person was feeling in that moment that the other person didn't know. "When that happened, I was feeling X and I didn't say it because Y." That's the whole conversation.`,
        coupleTypeNote: coupleType ? `${ctNote}naming what should have gone differently is more useful than relitigating what actually happened.` : "",
      });
    } else if (mineA7 || theirsA7) {
      // One person had something in mind and the other didn't. That asymmetry is
      // the finding, and it is stated as such rather than invented into a shared pattern.
      const who = mineA7 ? userName : partnerName;
      const other = mineA7 ? partnerName : userName;
      const text = mineA7 || theirsA7;
      push({
        type: "explore",
        tier: 2,
        evidence: ["a7:one"],
        title: `Only one of you had a moment in mind`,
        prompt: `Let's talk about the moment one of us had in mind. I want to hear what made it stick.`,
        body: `${who} named ${quoted(text)}. ${other} didn't have something that came to mind. That difference is worth noticing on its own: it can mean the moment landed harder for one of you, or simply that you were tracking different things. It does not mean either answer is wrong.`,
        quotes: [{ name: who, text }],
        priority: "Compare notes",
        action: `${other}, ask ${who} to walk through it, not to defend anything, just to hear what it was like from the inside. "Tell me what that was like for you" is the whole opener.`,
        coupleTypeNote: coupleType ? `${ctNote}one partner carrying a moment the other didn't register is common, and worth surfacing rather than assuming.` : "",
      });
    }
  }

  // --- PRIORITY RANKING (a_priority) ---
  if (Array.isArray(mine.a_priority) && Array.isArray(theirs.a_priority) && mine.a_priority.length > 0 && theirs.a_priority.length > 0) {
    const myTop = mine.a_priority[0];
    const theirTop = theirs.a_priority[0];
    // Find biggest rank gap
    // indexOf returns -1 for anything the partner never ranked, which used to
    // inflate the gap past the threshold and render as "#0". Only items present
    // in both rankings are comparable.
    const rankGaps = mine.a_priority
      .filter(item => theirs.a_priority.indexOf(item) !== -1)
      .map(item => ({
        item,
        myRank: mine.a_priority.indexOf(item),
        theirRank: theirs.a_priority.indexOf(item),
        gap: Math.abs(mine.a_priority.indexOf(item) - theirs.a_priority.indexOf(item)),
      })).sort((a, b) => b.gap - a.gap);
    const biggestRankGap = rankGaps[0];

    if (myTop === theirTop) {
      push({
        type: "strength",
        tier: 1,
        evidence: ["a_priority:mine","a_priority:theirs"],
        title: `You agree on what matters most this year`,
        prompt: `Let's talk about what matters most to us this year. We're aligned, and I want to make sure we actually act on it.`,
        body: `Both of you independently ranked "${myTop}" as your top priority for the year ahead. When two people rank the same thing first without discussing it, that alignment is real, and it makes it much easier to act on.`,
        priority: "Turn it into a plan",
        action: `Alignment on priorities is only useful if it produces decisions. Agree on one concrete thing you'll do differently in the next 30 days that reflects this priority. Even one change made on purpose counts.`,
        coupleTypeNote: coupleType ? `${ctNote}shared priority alignment reduces the invisible negotiation that often drains energy between partners.` : "",
      });
    } else {
      push({
        type: "explore",
        tier: 1,
        evidence: ["a_priority:mine","a_priority:theirs"],
        title: `Your top priorities for this year are different`,
        prompt: `Let's talk about our different priorities this year. I want to understand what's behind each of them.`,
        body: `${userName}'s top priority: "${myTop}." ${partnerName}'s top priority: "${theirTop}." Neither is wrong, but without naming it, this difference quietly shapes decisions, energy allocation, and what each of you feels is being neglected.`,
        priority: "Negotiate, not compromise",
        action: `Both priorities deserve to be real. The question is how to protect both, not which one wins. What would it look like to honor "${myTop}" and "${theirTop}" in the same month? Start with something small and specific.`,
        coupleTypeNote: coupleType ? `${ctNote}different investment priorities are common in your pairing, naming them explicitly tends to clear a lot of unspoken frustration.` : "",
      });
    }

    if (biggestRankGap && biggestRankGap.gap >= 3) {
      push({
        type: "explore",
        tier: 1,
        evidence: ["a_priority:mine","a_priority:theirs"],
        title: `You see "${biggestRankGap.item}" very differently`,
        prompt: `Let's talk about how differently we see "${biggestRankGap.item}". I want to understand where you're coming from.`,
        body: `${userName} ranked "${biggestRankGap.item}" #${biggestRankGap.myRank + 1}. ${partnerName} ranked it #${biggestRankGap.theirRank + 1}. That's a significant gap on the same item, and the kind of thing that creates friction without either person fully understanding why.`,
        priority: "Worth one honest conversation",
        action: `Ask each other: "What would it feel like if we invested more in ${biggestRankGap.item.toLowerCase()} this year?" The answer usually reveals something about what's been missing that neither person has said directly.`,
        coupleTypeNote: coupleType ? `${ctNote}gaps in how you value the same area often reflect different experiences of that area, not different values overall.` : "",
      });
    }
  }

  return insights;
}
