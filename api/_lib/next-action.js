/**
 * What the app home screen should prompt, given where a couple actually is.
 *
 * Pure: no network, no database, no clock beyond the `now` passed in. That
 * makes every branch testable here, which matters because screen-level checks
 * are moving to Xcode where I cannot see them.
 *
 * DESIGN, from Ellie's spec and the Duolingo comparison:
 *
 * One primary action, not a wall of options. The ladder below is ordered by
 * what unblocks the couple, not by what would drive engagement. Anything that
 * needs the partner to move comes first, because a couple stuck on one person's
 * unfinished exercise cannot do anything else.
 *
 * Explicitly NOT modelled: streaks, daily habit, manufactured urgency. Attune
 * is not a daily product, and inventing a deadline around someone's marriage
 * would be unpleasant. The reason Duolingo's notifications work is that the
 * streak does the work and the notification points back at it. We have no
 * equivalent hook and should not fake one.
 *
 * Revisit prompts are anchored to something specific (a dimension, a
 * conversation they never had) rather than "it has been a while", which is the
 * difference between a useful nudge and nagging.
 */

const DAY = 24 * 60 * 60 * 1000;

/**
 * @param state {
 *   now, firstName, partnerName,
 *   profileComplete,                        has a name, pronouns, the basics
 *   exercises: { ex1, ex2, ex3, intimacy }  each { owned, mine, theirs } booleans
 *   resultsReady,                           both partners done with ex1 + ex2
 *   resultsLastOpenedAt,                    ISO string or null
 *   resources: { budget, checklist }        each { owned, started, complete }
 *   inPractice: { latestId, latestTitle, latestPublishedAt, lastReadAt },
 *   partnerLastActiveAt, partnerNudgedAt,
 *   opens30d, feedbackGivenAt,
 *   topGapDimensionLabel, unresolvedConversationTitle
 * }
 * @returns { primary, secondary[] } cards, each { id, kind, title, body, cta, deepLink }
 */
export function nextActions(state = {}) {
  const now = state.now ? new Date(state.now).getTime() : Date.now();
  const ago = (iso) => (iso ? (now - new Date(iso).getTime()) / DAY : Infinity);
  const ex = state.exercises || {};
  const res = state.resources || {};
  const ip = state.inPractice || {};
  const you = state.firstName || 'you';
  const them = state.partnerName || 'your partner';

  const cards = [];
  const add = (c) => cards.push(c);

  // 1. Your own unfinished exercise. Above nudging the partner on purpose:
  //    asking someone else to finish while you have not is a bad look, and the
  //    app should not help you do it.
  for (const [key, label, link] of [
    ['ex1', 'Communication', 'exercise1'],
    ['ex2', 'What You Expect', 'exercise2'],
    ['ex3', 'Relationship Reflection', 'exercise3'],
    ['intimacy', 'Physical Intimacy', 'intimacy'],
  ]) {
    const e = ex[key];
    if (e?.owned && !e.mine) {
      add({ id: `finish-${key}`, kind: 'finish_exercise', priority: 10,
        title: `Finish ${label}`,
        body: e.theirs ? `${them} has finished this one. Your results unlock when you do.`
                       : 'About 20 minutes. Your answers stay yours until you both finish.',
        cta: 'Continue', deepLink: `/?view=${link}` });
      break; // one exercise at a time, in order
    }
  }

  // 2. Partner has not finished, and you have. The only case where nudging is
  //    the genuinely useful action.
  const waitingOn = ['ex1', 'ex2', 'ex3', 'intimacy']
    .filter(k => ex[k]?.owned && ex[k].mine && !ex[k].theirs);
  if (waitingOn.length) {
    const nudgedRecently = ago(state.partnerNudgedAt) < 3;
    add({ id: 'nudge-partner', kind: 'nudge_partner', priority: 9,
      title: nudgedRecently ? `Waiting on ${them}` : `Send ${them} a reminder`,
      body: nudgedRecently
        ? `You nudged them recently. Give it a day or two.`
        : `You are done. ${them} has one exercise left, and your results unlock when they finish.`,
      cta: nudgedRecently ? 'View progress' : 'Send a reminder',
      disabled: nudgedRecently,
      deepLink: '/?view=home' });
  }

  // 3. Results ready and never opened. The payoff they paid for.
  if (state.resultsReady && !state.resultsLastOpenedAt) {
    add({ id: 'open-results', kind: 'open_results', priority: 8,
      title: 'Your results are ready',
      body: `Everything you and ${them} answered, side by side.`,
      cta: 'Open results', deepLink: '/?view=results' });
  }

  // 4. A resource they paid for and have not used. Bought and unused is worse
  //    than not bought: they are out of pocket with nothing to show.
  for (const [key, label, link] of [['budget', 'Shared Budgeting', 'budget'], ['checklist', 'Newlywed Checklist', 'checklist']]) {
    const r = res[key];
    if (r?.owned && !r.complete) {
      add({ id: `use-${key}`, kind: 'use_resource', priority: 7,
        title: r.started ? `Pick up ${label}` : `Start ${label}`,
        body: r.started ? 'You started this. It saves as you go.' : 'Included with your package.',
        cta: r.started ? 'Continue' : 'Start', deepLink: `/?view=${link}` });
      break;
    }
  }

  // 5. Profile setup. Low urgency, but it makes everything else read better,
  //    since results address people by name.
  if (!state.profileComplete) {
    add({ id: 'profile', kind: 'profile_setup', priority: 6,
      title: 'Finish setting up your profile',
      body: 'Takes a minute, and it makes your results read properly.',
      cta: 'Set up', deepLink: '/?view=profile' });
  }

  // 6. A new In Practice post they have not read.
  if (ip.latestId && ago(ip.latestPublishedAt) < 30 && ago(ip.lastReadAt) > ago(ip.latestPublishedAt)) {
    add({ id: 'new-post', kind: 'new_post', priority: 5,
      title: 'New in In Practice',
      body: ip.latestTitle || 'Something new to read.',
      cta: 'Read', deepLink: `/?view=practice&post=${ip.latestId}` });
  }

  // 7. Revisit, anchored to something specific. Never "it has been a while".
  if (state.resultsReady && ago(state.resultsLastOpenedAt) > 30) {
    const anchor = state.unresolvedConversationTitle || state.topGapDimensionLabel;
    if (anchor) {
      add({ id: 'revisit', kind: 'revisit_results', priority: 4,
        title: `Revisit ${anchor}`,
        body: state.unresolvedConversationTitle
          ? 'You flagged this and have not come back to it.'
          : `Your widest difference. Worth rereading together.`,
        cta: 'Open', deepLink: '/?view=results' });
    }
  }

  // 8. Feedback, only from people who actually use it. Asking a stranger to
  //    rate you is noise; asking a regular is a fair request.
  if ((state.opens30d || 0) >= 5 && !state.feedbackGivenAt) {
    add({ id: 'feedback', kind: 'feedback', priority: 2,
      title: 'How is Attune working for you?',
      body: 'Two questions. It shapes what we build next.',
      cta: 'Leave feedback', deepLink: '/?view=feedback' });
  }

  // Nothing outstanding: say so plainly rather than inventing a task.
  if (!cards.length) {
    add({ id: 'all-clear', kind: 'idle', priority: 0,
      title: `You are all caught up`,
      body: 'Your results are here whenever you want them.',
      cta: 'Open results', deepLink: '/?view=results' });
  }

  cards.sort((a, b) => b.priority - a.priority);
  return { primary: cards[0], secondary: cards.slice(1, 4) };
}

/** Greeting for the home screen. Time-of-day only, no streak, no guilt. */
export function greeting({ now, firstName, returning }) {
  const h = new Date(now || Date.now()).getHours();
  const part = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  return firstName ? `${part}, ${firstName}` : (returning ? 'Welcome back' : part);
}
