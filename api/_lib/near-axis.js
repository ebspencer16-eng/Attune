/**
 * Near-axis prose: what a couple type says when one of them sits on the line.
 *
 * ── WHY THIS EXISTS ───────────────────────────────────────────────────────
 * A couple type is a categorical read of two continuous axes. When a partner
 * sits within 0.6 of the middle of an axis, the type is a lean rather than a
 * position, and the default prose overstates it. So specific sentences are
 * swapped for variants that say so: one-near text when a single partner is on
 * the line, both-near text when both are. Reviewed with Ellie and Carolina.
 *
 * ── WHY IT LEFT src/App.jsx ───────────────────────────────────────────────
 * It was inline in the website's results component, which meant only the
 * website could apply it. The app rendered the default sentences for every
 * couple, so a couple near an axis line read one thing on the website and a
 * different thing in the app, and the app was the one overstating their type.
 *
 * The same class of problem as the alignment rule: one couple, two products,
 * two answers. Applied on the server now, once, for both.
 */

export const NEAR_AXIS_PROSE = {
  WW: {
    patternsNearEngage: {
      2: {
        one: `Arguments between you can get heated, but one of you does not always engage right away. That pause isn't a retreat, but rather can be used to let feelings settle before you talk.`,
        both: `Arguments between you can run hot, but neither of you consistently engages on the spot. Those pauses shouldn't be interpreted as retreating, you can use them to let the heat settle before the conversation starts.`,
      },
    },
    patternsNearOpen: {
      1: {
        one: `You both bring real emotional energy, but when it comes to being open or guarded, one of you is relatively neutral. That small difference is a good thing because it can keep a heated moment from escalating.`,
        both: `You both bring real emotional energy, but when it comes to being open or guarded, you both are relatively neutral, so heated moments are less likely to escalate.`,
      },
    },
    stickingPointsNearOpen: {
      0: {
        one: `When you are both very expressive at the same time, feelings can escalate. You can work together to keep emotions in check, but under stress, those emotions can still flare.`,
        both: `When you are both very expressive at the same time, feelings can escalate. When it comes to being open or guarded, you both are relatively neutral, so that happens less often. Under stress, though, feelings can still flare and escalate.`,
      },
    },
  },
  XX: {
    patternsNearEngage: {
      0: {
        one: `You tend to decide quickly once the information is in, though one of you is comfortable letting a decision sit longer. That slower gear can keep a decision from being rushed.`,
        both: `You tend to decide quickly once the information is in, and both of you are comfortable letting a decision sit when it needs to. Neither of you forces it, so decisions rarely get rushed.`,
      },
    },
    stickingPointsNearEngage: {
      1: {
        one: `Efficient repair isn't complete repair. One of you is less driven to move on immediately, you both can use that patience to share fully before you move on.`,
        both: `Efficient repair isn't complete repair. Neither of you is driven to move on immediately, you can use that patience to share fully before you close the conversation.`,
      },
    },
    patternsNearOpen: {
      2: {
        one: `The feelings behind hard moments can get brushed over when you rush to fix a problem. When one of you points out those feelings, try to take a pause together and talk about how you each feel.`,
        both: `The feelings behind hard moments can get skipped when you rush to fix the problem. When it comes to being open or guarded, you both are relatively neutral, so you will each sometimes point out those feelings. When one of you does, try to take a pause together and talk about how you each feel.`,
      },
    },
    stickingPointsNearOpen: {
      0: {
        one: `Two people who process feelings privately can go a long time without saying how they feel. One of you will sometimes be ready to talk sooner. When that happens try to talk then, even if one of you is sharing half-formed thoughts.`,
        both: `Two people who process feelings privately can go a long time without saying how they feel. When it comes to being open or guarded, you both are relatively neutral, so you are often ready to talk sooner than two very private people would be. When one of you is ready, try to talk then, even if you're sharing half-formed thoughts.`,
      },
    },
  },
  YY: {
    patternsNearEngage: {
      1: {
        one: `Coming back together after a disagreement can take a while, because neither of you rushes it. One of you is sometimes ready to talk sooner. It is fine to let that person start the conversation, as long as it does not become their job every time.`,
        both: `Coming back together after a disagreement can take a while, because neither of you rushes it. When it comes to engaging or withdrawing, you both are relatively neutral, so you are sometimes ready to talk sooner than two people who both need a lot of space. Whoever is ready first can start the conversation, and that will not always be the same person.`,
      },
    },
    stickingPointsNearEngage: {
      0: {
        one: `You can both wait a long time for the other to come back. Because one of you can occasionally reach sooner, the standoff is usually shorter than it feels. Recognize the patient period instead of reading it as distance.`,
        both: `You can both wait a long time for the other to come back. Because you each will sometimes reach sooner, the standoff is usually shorter than it feels. Recognize the patient period instead of reading it as distance.`,
      },
    },
    stickingPointsNearOpen: {
      2: {
        one: `When you both tend to take space, things can go unaddressed for a long time, and unspoken feelings can quietly build up. A regular check-in, at a set time each week, gives you both a chance to share what you are feeling.`,
        both: `When you both tend to take space, things can go unaddressed for a long time. You both also hold back a bit more than very open partners would, so unspoken feelings can quietly build up. A regular check-in, at a set time each week, gives you both a chance to share what you are feeling.`,
      },
    },
  },
  ZZ: {
    patternsNearEngage: {
      1: {
        one: `When something is hard, it can be days before it comes up. One of you is quicker to speak your mind than a fully withdrawn partner, so the delay is shorter when that person leads.`,
        both: `When something is hard, it can be days before it comes up. Both of you are quicker to speak your mind than fully withdrawn partners, so the delay is shorter than the type implies.`,
      },
    },
    stickingPointsNearEngage: {
      1: {
        one: `Neither of you prefers to start the harder conversations, but one of you might tend to bring things up first more often. When this happens, it helps you both stop waiting, so try to make that a habit rather than an exception.`,
        both: `Neither of you prefers to start the harder conversations, but when it comes to engaging or withdrawing, you both are relatively neutral, so either of you may bring things up first. When one of you does, it helps you both stop waiting, so try to make that a habit rather than an exception.`,
      },
    },
    patternsNearOpen: {
      2: {
        one: `Your relationship looks stable, and it mostly is. One of you shows a little more of how they feel, which can be an early sign when something is building up.`,
        both: `Your relationship looks stable, and it mostly is. You both show a little more of how you feel than very private people would, which can be an early sign when something is building up.`,
      },
    },
    stickingPointsNearOpen: {
      0: {
        one: `Important feelings can go unsaid for a long time. When one of you shows a feeling, try to ask about it.`,
        both: `Important feelings can go unsaid for a long time, but you both show more of how you feel than very private partners would, so you have more chances to talk than your type suggests. When one of you shows a feeling, try to ask about it.`,
      },
    },
  },
  WX: {
    patternsNearOpen: {
      1: {
        one: `{EXP} leans toward processing out loud. {GRD} sometimes wants a beat to think before discussing feelings. You two both want a productive conversation, what you're experiencing is just a difference in timing.`,
        both: `When it comes to being open or guarded, you both are relatively neutral, but {EXP} leans slightly toward sharing and {GRD} tends to take a minute to process. You both want a productive conversation, what you might be noticing is just a small difference in timing.`,
      },
    },
    stickingPointsNearOpen: {
      0: {
        one: `{EXP} might tend to start the deeper conversations, but these roles are less fixed than your map suggests. It is more about who happens to speak first, and the other person supporting them when they do.`,
        both: `{EXP} tends to start the deeper conversations, but {GRD} shares more than a truly guarded partner would, so who speaks first may change depending on the situation.`,
      },
      1: {
        one: `On an easy day, you might both share freely, but under stress, you may pull inward, which can feel sudden to your partner.`,
        both: `When it comes to being open or guarded, you both are relatively neutral. On an easy day you both tend to share freely, but under stress, either of you can pull inward, which can feel sudden to your partner.`,
      },
    },
    patternsNearEngage: {
      0: {
        one: `When something is off, you're usually both aware of it. One of you is a little faster to communicate, though neither of you sits with feelings for very long. The timing gap is manageable since you're heading in the same direction.`,
        both: `When something is off, you're usually both aware of it. Neither of you charges straight in, and neither of you sits with feelings for very long. The gap in timing is small and you're heading toward the same meaningful conversation.`,
      },
    },
  },
  WY: {
    patternsNearEngage: {
      0: {
        one: `When something is wrong, you are often not ready to talk at the same time. {RCH} is ready sooner, and {WDR} needs a moment. However, this difference is smaller for your relationship and can change depending on the situation.`,
        both: `When something is wrong, you are often not ready to talk at the same time. {RCH} is ready sooner, and {WDR} needs a moment. When it comes to engaging or withdrawing, you both are relatively neutral, so the difference is smaller than your map suggests and often changes depending on the situation.`,
      },
    },
    stickingPointsNearEngage: {
      1: {
        one: `One of you can push to talk while the other pulls back, but that pattern is mild for you. If you notice it starting, try to say so early, and it will usually help you create a safe place to talk.`,
        both: `One of you can push to talk while the other pulls back, but that pattern is mild for you. If you notice it starting, try to say so early, and it will usually help you to communicate calmly.`,
      },
      2: {
        one: `Repair after a disagreement tends to start when one person is ready. Whichever of you is ready can start the conversation, but that usually will not be the same person every time.`,
        both: `Repair after a disagreement tends to start when one person is ready. Whoever is ready can start the conversation, and that will usually not be the same person every time.`,
      },
    },
    patternsNearOpen: {
      1: {
        one: `What looks like pulling away is usually a need for space, not distance. One of you shows a little less of how they feel while processing, so try to say out loud that you need space, rather than trusting your partner to understand the silence.`,
        both: `What looks like pulling away is usually a need for space, not distance. Try to say out loud that you need space, rather than trusting your partner to understand the silence.`,
      },
    },
  },
  WZ: {
    patternsNearOpen: {
      0: {
        one: `Sometimes one of you means one thing and your partner hears something different. The way to combat this is by asking your partner what they heard.`,
        both: `Sometimes one of you means one thing and your partner hears something different. When it comes to being open or guarded, you both are more neutral than your labels suggest, so asking your partner what they heard will usually help.`,
      },
    },
    stickingPointsNearOpen: {
      0: {
        one: `{EXP} might tend to start the deeper emotional conversations, but this is flexible and who starts may change in your relationship depending on the situation.`,
        both: `{EXP} might tend to start the deeper emotional conversations, but this is flexible and who starts may change in your relationship depending on the situation.`,
      },
      1: {
        one: `On steady days, you meet each other partway. Under stress, one of you may withdraw, and that is when distance between you can become noticeable.`,
        both: `When it comes to being open or guarded, you both are relatively neutral. On steady days you meet in the middle, but under stress, either of you can withdraw, and that is when distance between you can become noticeable.`,
      },
    },
    patternsNearEngage: {
      2: {
        one: `When you're communicating well, it's because you're both working to understand each other. One of you is quicker to a hard topic than a fully withdrawn partner, so the wait for repair is shorter when that person leads.`,
        both: `When you're communicating well, it's because you're both working to understand each other. Because neither of you are fully withdrawn, the wait for repair is shorter and either of you may initiate discussions.`,
      },
    },
  },
  XY: {
    patternsNearEngage: {
      0: {
        one: `When something is hard, you may not be ready to talk at the same time. {RCH} might be ready, while {WDR} needs room. However, this difference in timing is fairly small and can change by topic.`,
        both: `When something is hard, you may not be ready to talk at the same time. {RCH} is ready, and {WDR} needs room. When it comes to engaging or withdrawing, you both are relatively neutral, so the difference in timing is small and who needs what can change by topic.`,
      },
    },
    stickingPointsNearEngage: {
      0: {
        one: `{RCH_pos} push to resolve a disagreement can take away the space {WDR} sometimes needs. A quick agreement on when to talk usually helps.`,
        both: `{RCH_pos} push to resolve a disagreement can take away the space {WDR} needs. When it comes to engaging or withdrawing, you both are relatively neutral, so that pressure is mild for you. A short agreement on when to talk usually helps.`,
      },
    },
    stickingPointsNearOpen: {
      1: {
        one: `{WDR_pos} visible emotion while processing can feel to {RCH} like something to fix right away. Feelings can be easier to read than you expect. Nonetheless, try to ask each other what a reaction means, rather than assuming.`,
        both: `{WDR_pos} visible emotion while taking space can feel to {RCH} like something to fix right away. When it comes to being open or guarded, you both are relatively neutral, so your feelings are easier to read than your pairing suggests. Try to ask what a reaction means, rather than assuming.`,
      },
    },
  },
  XZ: {
    patternsNearEngage: {
      1: {
        one: `{RCH} has a mild pull toward resolving things, and {WDR} sometimes needs more time. For your relationship, that difference is not always noticeable and depends on the issue.`,
        both: `{RCH} has a mild pull toward resolving things, and {WDR} sometimes needs more time. When it comes to engaging or withdrawing, you both are relatively neutral, so that difference is often not noticeable and depends on the issue.`,
      },
    },
    stickingPointsNearEngage: {
      1: {
        one: `When something is wrong, neither of you usually brings it up first. One of you leans a little toward talking things through, so problems sit for less time when that person speaks up. Try to make that the norm.`,
        both: `When something is wrong, neither of you usually brings it up first. You both lean a little toward talking things through, so problems do not always sit for long. Even if it feels uncomfortable, try to make bringing things up the norm.`,
      },
    },
    stickingPointsNearOpen: {
      0: {
        one: `Neither of you shows much of how you feel, so things can look more okay from the outside than they really are. One of you shows a little more than a very private partner would. Try to treat what that person shows as a chance to talk, because those chances are easy to take for granted.`,
        both: `Neither of you shows much of how you feel, so things can look more okay from the outside than they really are. You both show a little more than very private partners would. Try to treat what you each show as a chance to talk, because those chances are easy to take for granted.`,
      },
      2: {
        one: `Two people who process feelings privately can get along well without ever sharing deeply. One of you leans toward sharing a little more, so let that person set the pace for sharing a bit more than feels natural, and try to keep that pace together.`,
        both: `Two people who process feelings privately can get along well without ever sharing deeply. You both lean toward sharing a little more, so try to agree to share a bit more than feels natural, and keep doing so together.`,
      },
    },
  },
  YZ: {
    patternsNearEngage: {
      1: {
        one: `Coming back together after a disagreement can take a while, because neither of you rushes it. One of you is sometimes ready to talk first. It is fine to let that person start the conversation, as long as it does not become their job every time.`,
        both: `Coming back together after a disagreement can take a while, because neither of you rushes it. When it comes to engaging or withdrawing, you both are relatively neutral, so either of you may be ready to talk first. Whoever is ready can start the conversation, and that will not always be the same person.`,
      },
    },
    stickingPointsNearEngage: {
      0: {
        one: `You can both wait a long time for your partner to come back to the conversation. One of you leans a little toward talking things through, so the wait can sometimes be shorter. Try to say how the waiting feels, rather than reading it as abandonment.`,
        both: `You can both wait a long time for your partner to come back to the conversation. You both lean a little toward talking things through, so the wait is usually shorter than it feels. Try to say how the waiting feels, rather than reading it as abandonment.`,
      },
    },
    stickingPointsNearOpen: {
      1: {
        one: `{EXP_pos} visible emotion while taking space can be hard for {GRD} to understand. When it comes to being open or guarded, one of you is relatively neutral, so feelings can be easier to see than your pairing suggests. A quick "I don't need you to fix this" helps make your intentions clear.`,
        both: `When one of you shows emotion while taking space, it can be confusing for your partner. When it comes to being open or guarded, you both are relatively neutral, so feelings are sometimes visible but can be hard for either of you to understand. A quick "I don't need you to fix this" helps make your intentions clear.`,
      },
    },
  },
};

/** Is a score close enough to the middle that the type is a lean? */
const NEAR = 0.6;

function nearCount(a, b, key) {
  return (Math.abs((a?.[key] ?? 3) - 3) < NEAR ? 1 : 0)
       + (Math.abs((b?.[key] ?? 3) - 3) < NEAR ? 1 : 0);
}

/**
 * One override, if this item has one for this many near partners.
 *
 * A string applies to either case. An object carries `one` and `both`, and
 * falls back to whichever it has when the other is absent, so an incomplete
 * entry degrades to the variant that exists rather than to nothing.
 */
function pick(map, index, count) {
  if (!map || count < 1) return undefined;
  const v = map[index];
  if (v == null) return undefined;
  if (typeof v === 'string') return v;
  return count >= 2 ? (v.both ?? v.one) : (v.one ?? v.both);
}

/**
 * Apply the overrides to one list of sentences.
 *
 * Items with no override keep the default, so nothing ever blanks.
 *
 * @param {string[]} base
 * @param {object} engageMap overrides keyed by index, for the engage axis
 * @param {object} openMap   the same, for the open axis
 * @param {{withdraw:number, open:number}} a first partner's axis scores, 1..5
 * @param {{withdraw:number, open:number}} b second partner's
 */
export function withNearAxis(base, engageMap, openMap, a, b) {
  const engage = nearCount(a, b, 'withdraw');
  const open = nearCount(a, b, 'open');
  return (base || []).map((line, i) => {
    const e = pick(engageMap, i, engage);
    if (e !== undefined) return e;
    const o = pick(openMap, i, open);
    return o !== undefined ? o : line;
  });
}

/**
 * The two lists a couple-type page renders, with overrides already applied.
 *
 * `patterns` is what the website's "What this looks like in your
 * relationship" tile prints. The app had been printing `description`, which is
 * a different field with different words, so that tile said something else
 * entirely on the two products before this.
 */
export function coupleTypeProse(type, a, b) {
  const near = NEAR_AXIS_PROSE[type?.id] || {};
  return {
    patterns: withNearAxis(type?.patterns, near.patternsNearEngage, near.patternsNearOpen, a, b),
    stickingPoints: withNearAxis(
      type?.stickingPoints, near.stickingPointsNearEngage, near.stickingPointsNearOpen, a, b),
  };
}
