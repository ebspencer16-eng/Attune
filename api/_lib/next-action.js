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
import { EXERCISES } from '../_exercises.js';


/**
 * Where a card goes in the iOS app.
 *
 * deepLink is a website route, /?view=results. The app has four tabs and no
 * concept of ?view=, so pushing it navigated nowhere: every card on Home was
 * silently inert, including the primary one, which is the whole screen.
 *
 * Derived here from the deepLink so a new card kind needs no app release, which
 * is the same reason SCREENS.md says to route on deepLink rather than on kind.
 *
 * A view the app has no screen for opens the website in the browser instead of
 * doing nothing. That is honest: the thing genuinely lives there.
 */
const SITE = 'https://www.attune-relationships.com';

function appTargetFor(deepLink) {
  const view = /[?&]view=([^&]+)/.exec(deepLink || '')?.[1] || '';

  // Tabs the app has.
  if (view === 'results') return { route: '/insights' };
  if (view === 'home' || view === '') return { route: '/' };
  if (view === 'practice') return { route: '/resources' };
  if (view === 'notes') return { route: '/notes' };

  // An exercise. Routed to Insights, carrying which one, so the app can open it
  // directly when it can ask it and show its row when it cannot.
  const exercise = EXERCISES.find(e => e.view === view);
  if (exercise) {
    return exercise.inApp
      ? { route: '/insights', exercise: exercise.key }
      : { external: `${SITE}/app${deepLink.replace(/^\//, '')}` };
  }

  // Profile setup, feedback, budget, checklist: all still on the website.
  return { external: `${SITE}/app${deepLink.replace(/^\//, '')}` };
}

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

  // 1. Profile setup. First because the exercises need pronouns and the
  //    results prose addresses people by name: starting an exercise without
  //    them produces copy that misgenders someone, which is not a cosmetic
  //    problem and cannot be fixed after the fact without a retake.
  if (!state.profileComplete) {
    // Names what is actually missing. "Finish setting up your profile" to
    // someone whose profile is finished is the app being wrong out loud, and
    // there was no way for them to tell which part it meant.
    const missing = state.profileMissing?.length
      ? state.profileMissing.join(' and ')
      : 'a couple of details';
    add({ id: 'profile', kind: 'profile_setup', priority: 12,
      title: 'Finish setting up your profile',
      body: `We still need ${missing}. Your results address you both by name throughout.`,
      cta: 'Set up', deepLink: '/?view=profile' });
  }

  // 2. Your own unfinished exercise. Above nudging the partner on purpose:
  //    asking someone else to finish while you have not is a bad look, and the
  //    app should not help you do it.
  //    The list comes from the registry. It was written out here and had four
  //    of the five exercises: Conflict Patterns was missing, so a couple who
  //    owned it and had not finished it was never once prompted to. Nothing
  //    errored; the card simply never existed.
  for (const { key, label, view: link } of EXERCISES) {
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
  // Every card gains its app destination here, once, rather than each add()
  // call remembering to set one.
  const withApp = cards.map(c => ({ ...c, app: appTargetFor(c.deepLink) }));
  return { primary: withApp[0], secondary: withApp.slice(1, 4) };
}

/**
 * Greeting for the home screen. No streak, no guilt.
 *
 * ── WHY IT VARIES ─────────────────────────────────────────────────────────
 * It was time of day and nothing else, so anyone who opens the app at the same
 * hour each day was greeted with the same three words forever. Ellie asked for
 * it to move between "welcome back", "good morning", "nice to see you again"
 * and a few others.
 *
 * Those three are hers. The two other time-of-day forms were already here.
 * ANYTIME is short on purpose: more phrases is a copy decision and copy is
 * Ellie's, so the list is exactly what she has written rather than padded out
 * with things that sound like her.
 *
 * ── WHY IT CHANGES HOURLY AND NOT PER REQUEST ─────────────────────────────
 * A greeting that rerolls on every pull to refresh is a screen that will not
 * sit still, and this one sits above a research finding that changes daily.
 * Keyed to the hour, so it moves through the day and holds still while someone
 * is using it.
 *
 * Someone's FIRST visit always gets the time of day. A first arrival greeted
 * with "welcome back" is the product claiming a history it does not have.
 */
const ANYTIME = [
  // Ellie's.
  'Welcome back',
  'Nice to see you again',
  // PLACEHOLDERS, awaiting Ellie's review. She asked for a few to look at
  // rather than for me to settle the list. Written to her rules: short,
  // declarative, no hedging, and nothing that congratulates someone for
  // opening an app. Each has a name appended, so each has to read as a
  // greeting and not as a sentence: "Good to see you, Ellie."
  'Good to see you',
  'Hello again',
  'There you are',
];

export function greeting({ now, firstName, returning }) {
  // An unusable `now` falls back to the real clock rather than propagating.
  // Indexing by the hour turns an invalid date into NaN, and options[NaN] is
  // undefined, so the screen's first line rendered as nothing at all. The
  // previous version could not do this: it only ever compared the hour, and
  // NaN failed both comparisons and landed on 'Good evening'.
  //
  // Found by a test that passed a string where a number was expected, which is
  // exactly the shape of the mistake a caller makes.
  const ms = new Date(now ?? Date.now()).getTime();
  const at = new Date(Number.isFinite(ms) ? ms : Date.now());

  const h = at.getHours();
  const timeOfDay = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';

  let part = timeOfDay;
  if (returning) {
    const options = [timeOfDay, ...ANYTIME];
    part = options[Math.floor(at.getTime() / 3600000) % options.length] || timeOfDay;
  }
  return firstName ? `${part}, ${firstName}` : part;
}
