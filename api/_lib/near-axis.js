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
        one: `Neither of you starts the harder conversation by default. One of you sits closer to the middle and may reach first on some things. That person opening the door is the pattern-breaker, make the reach a habit not an exception.`,
        both: `Neither of you starts the harder conversation by default, but both of you sit closer to neutral and may reach first on some things. Either of you opening the door breaks the pattern, so make the reach a habit not an exception.`,
      },
    },
    patternsNearOpen: {
      2: {
        one: `The relationship looks stable, and mostly is. One of you reveals a little more of what's underneath, which is your early-warning system when things build up.`,
        both: `The relationship looks stable, and mostly is. Both of you reveal a little more of what's underneath, which is your early-warning system when things build up.`,
      },
    },
    stickingPointsNearOpen: {
      0: {
        one: `Important things can go unsaid for a long time. One of you shows more than a fully guarded partner, so there are more openings than there could be. Take them when they appear.`,
        both: `Important things can go unsaid for a long time, but both of you show more than fully guarded partners, so there are more openings than the type implies. Take them when they appear.`,
      },
    },
  },
  WX: {
    patternsNearOpen: {
      1: {
        one: `{EXP} leans toward processing out loud. {GRD} sometimes wants a beat to think before discussing feelings. You two both want a productive conversation, what you're experiencing is just a difference in timing.`,
        both: `Though you both sit close to neutral, {EXP} leans slightly expressive and {GRD} tends to take a minute to process. You two both want a productive conversation, what you're experiencing is just a small difference in timing.`,
      },
    },
    stickingPointsNearOpen: {
      0: {
        one: `{EXP} tends to start the deeper conversations, but one of you sits closer to the middle than the label suggests, so the map placement should read less like fixed roles and more like who happens to speak first.`,
        both: `{EXP} tends to start the deeper conversations, but {GRD} shares more than a truly guarded partner would, so who speaks first may change depending on the situation.`,
      },
      1: {
        one: `One of you sits close to the middle on how much you show. On an easy day, that person shares freely. Under stress, they can pull inward, which may feel sudden to the other.`,
        both: `You both sit close to the middle on how much you show. On an easy day you both may share freely, but under stress, either of you can pull inward, which may feel sudden to the other.`,
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
        one: `When something is off, you're often not in the same place at once. {RCH} is ready sooner, {WDR} needs a moment. One of you sits close to the axis here, so the gap is smaller than the map labels suggest and may flip depending on the situation.`,
        both: `When something is off, you're often not in the same place at once. {RCH} is ready sooner, {WDR} needs a moment. You both sit close to the axis here, so the gap is smaller than the map labels suggest and often flips depending on the situation.`,
      },
    },
    stickingPointsNearEngage: {
      1: {
        one: `The pursue-and-retreat loop is real, but muted here. Because one of you flexes toward neutral, the loop is easy to interrupt and rarely runs far. Name it early and it will often dissolve.`,
        both: `The pursue-and-retreat loop is real, but muted here because you both flex toward neutral. This means the loop is easy to interrupt and rarely runs far, name it early and it will often dissolve.`,
      },
      2: {
        one: `Repair tends to start on one person's timeline. Since the two of you are closer to neutral in this regard, whoever is ready can start the conversation, and it will not usually be the same person every time.`,
        both: `Repair tends to start on one person's timeline. Since you're both close to neutral here, whoever is ready can start, and it won't usually be the same person every time.`,
      },
    },
    patternsNearOpen: {
      1: {
        one: `What reads as pulling away is usually needing space, not distance. One of you shows a little less while processing, so say the reassuring part out loud rather than trusting it to land on its own.`,
        both: `What reads as pulling away is usually needing space, not distance. You both show a little less while processing, so say the reassuring part out loud rather than trusting it to land on its own.`,
      },
    },
  },
  WZ: {
    patternsNearOpen: {
      0: {
        one: `You sometimes mean one thing and the other receives something different, though one of you is more communicative than a fully guarded partner, so the signal usually gets through with a little checking.`,
        both: `You sometimes mean one thing and the other receives something different. You both sit closer to neutral than the labels suggest, so the signal usually gets through with a little checking.`,
      },
    },
    stickingPointsNearOpen: {
      0: {
        one: `{EXP} tends to start the emotional depth. But because one of you sits close to neutral this can shift with the situation.`,
        both: `{EXP} tends to start the emotional depth, but you both sit close to neutral here, so this role is not fixed and will often shift based on the situation.`,
      },
      1: {
        one: `One of you sits closer to neutral on how much you show. On steady days that person meets the other partway. Under strain they can withdraw, and that is where a rift can become noticeable.`,
        both: `You both sit close to neutral with regard to how much you show. On steady days you meet in the middle, but under strain, either of you can withdraw, and that is where a rift can become noticeable.`,
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
        one: `When something is hard, you're often not in the same place at once. {RCH} is ready, {WDR} needs room. One of you sits near neutral, so the timing gap is relatively narrow and shifts by topic.`,
        both: `When something is hard, you're often not in the same place at once. {RCH} is ready, {WDR} needs room. You both sit near neutral, so the timing gap is narrow and roles shift based on the topic.`,
      },
    },
    stickingPointsNearEngage: {
      0: {
        one: `{RCH_pos} move toward resolution can close off the space {WDR} needs. Because one of you flexes toward neutral, that crowding is more mild here. A short agreement on when to talk usually settles it.`,
        both: `{RCH_pos} move toward resolution can crowd the space {WDR} needs. Because you both flex toward neutral, that crowding is mild here. A short agreement on when to talk usually settles it.`,
      },
    },
    stickingPointsNearOpen: {
      1: {
        one: `{WDR_pos} visible emotion during withdrawal can read to {RCH} as something to fix now. One of you sits closer to the middle on showing, so signals can be easier to read than you may expect. Ask what things mean instead of assuming.`,
        both: `{WDR_pos} visible emotion during withdrawal can read to {RCH} as something to fix now. You both sit closer to the middle on showing, so signals are easier to read than the pairing suggests. Ask what things mean instead of assuming.`,
      },
    },
  },
  XZ: {
    patternsNearEngage: {
      1: {
        one: `{RCH} carries a low push toward resolving, and {WDR} usually needs more time. One of you sits near neutral, so that gap is not always noticeable and depends on the issue.`,
        both: `{RCH} carries a low push toward resolving, and {WDR} usually needs more time. You both sit near neutral, so that gap is often not noticeable and depends on the issue.`,
      },
    },
    stickingPointsNearEngage: {
      1: {
        one: `When something is wrong, neither of you reaches first by default. Because one of you leans toward reaching, problems can sit for less time when that person leads, make that the norm.`,
        both: `When something is wrong, neither of you reaches first by default. Because you both lean toward reaching, problems don't always sit for long. Though it can be uncomfortable, make reaching the norm.`,
      },
    },
    stickingPointsNearOpen: {
      0: {
        one: `Neither of you offers much emotional visibility, so it can look more okay outside than in. One of you shows more than a fully guarded partner, which is your opening and shouldn't be taken for granted.`,
        both: `Neither of you offers much emotional visibility, so it can look more okay outside than in. Both of you show more than fully guarded partners, which is your opening and shouldn't be taken for granted.`,
      },
      2: {
        one: `Two private processors can coexist without reaching emotional depth together. One of you leans toward showing a little more, so let that person set a slightly more open baseline and try to maintain it together.`,
        both: `Two private processors can coexist without reaching emotional depth together. Both of you lean toward showing a little more, so set a slightly more open baseline and maintain it together.`,
      },
    },
  },
  YZ: {
    patternsNearEngage: {
      1: {
        one: `The coming-back-together step can drag because neither of you rushes it. One of you sits closer to neutral and is sometimes ready first. Let that person start conversations without it becoming their job.`,
        both: `The coming-back-together step can drag because neither of you rushes it. Both of you sit closer to neutral which means either may be ready first. Whoever is ready can start, it won't always be the same person.`,
      },
    },
    stickingPointsNearEngage: {
      0: {
        one: `You can both wait a long time for the other to return. Since one of you flexes toward reaching, the wait can sometimes be shorter. Name the feeling rather than reading it as abandonment.`,
        both: `You can both wait a long time for the other to return. Since you both flex toward reaching, the wait is usually shorter than it feels. Name the feeling rather than reading it as abandonment.`,
      },
    },
    stickingPointsNearOpen: {
      1: {
        one: `{EXP_pos} visible emotion during withdrawal can be hard for {GRD} to interpret. One of you sits closer to neutral on showing, so emotions can be more visible than the pairing suggests. A quick "this isn't a call to fix it" clears up intentions.`,
        both: `Visible emotion during withdrawal can be confusing to interpret. You both sit close to neutral, which means emotions are sometimes visible and may be hard for either of you to place. A quick "this isn't a call to fix it" clears up intentions.`,
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
