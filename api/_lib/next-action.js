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
 *   exercises: keyed by every exercise in the registry, each of them
 *                 { owned, mine, theirs } booleans
 *   resultsReady,   both partners through every exercise the couple owns,
 *                   decided by api/_lib/results-gate.js
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
import { SITE_URL as SITE } from './site.js';
import { pronounForm } from './role-tokens.js';

/**
 * How long a nudge lasts before another one is reasonable.
 *
 * Read here to grey the card out and by api/partner-nudge.js to refuse the
 * second one. One number: a card that says "you nudged them recently" over an
 * endpoint that would happily send another is two rules wearing one name.
 */
export const NUDGE_COOLDOWN_DAYS = 3;

/**
 * What a resource card says under its title, when it has not been started.
 *
 * Ellie's words, one at a time. Anything not named here keeps the generic
 * line, which is the honest default: a blurb invented for a tool nobody has
 * described is the product speaking for her.
 */
const RESOURCE_BLURB = {
  budget: 'Build your budget with a customizable tool',
};

/** The name a resource card leads with, when Ellie has written one. */
const RESOURCE_TITLE = {
  budget: 'Explore build-a-budget',
};

/**
 * The website address for a deepLink.
 *
 * Two shapes reach here. `/?view=budget` is a view inside the portal and
 * belongs under /app. `/feedback` is a page of its own. The one builder did
 * `${SITE}/app${deepLink.replace(/^\//, '')}`, which turns the second into
 * https://www.attune-relationships.com/appfeedback.
 */
function websiteUrl(deepLink) {
  const link = deepLink || '/';
  return link.startsWith('/?') ? `${SITE}/app${link.slice(1)}` : `${SITE}${link}`;
}

export function appTargetFor(deepLink) {
  // The feedback questionnaire runs in the app now. It is a page on the
  // website rather than a view, so it is matched here rather than in the view
  // list below. Nothing had asked these questions anywhere since the component
  // was deleted as dead code.
  if (deepLink === '/feedback') return { route: '/', feedback: true };

  const view = /[?&]view=([^&]+)/.exec(deepLink || '')?.[1] || '';

  // Tabs the app has.
  if (view === 'results') return { route: '/insights' };
  if (view === 'home' || view === '') return { route: '/' };
  if (view === 'practice') return { route: '/resources' };
  if (view === 'notes') return { route: '/notes' };
  // Profile setup lives in the app now: Settings can edit a name, pronouns and
  // the five questions, through api/update-profile.js. The card used to open
  // the website, which was the honest answer while the app could not do it.
  if (view === 'profile') return { route: '/', settings: true };

  // An exercise. Routed to Insights, carrying which one, so the app can open it
  // directly when it can ask it and show its row when it cannot.
  const exercise = EXERCISES.find(e => e.view === view);
  if (exercise) {
    return exercise.inApp
      ? { route: '/insights', exercise: exercise.key }
      : { external: websiteUrl(deepLink) };
  }

  // Profile setup, feedback, budget, checklist: all still on the website.
  return { external: websiteUrl(deepLink) };
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
      body: 'We need info to properly set up your exercises',
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
      /**
       * ── STARTED IS A DIFFERENT PROMPT FROM NOT STARTED ──────────────────
       * Ellie: "If one of the exercises is in progress, can the first prompt
       * on the home page be 'Continue [exercise name]' and the line under say
       * 'You've completed [#]/[#] questions'".
       *
       * Someone twenty questions in does not need to be told what the
       * exercises are for. They need the name of the one they are in and how
       * much is left.
       */
      const started = e.started && e.answered > 0;
      add({ id: `finish-${key}`, kind: 'finish_exercise', priority: 10,
        title: started ? `Continue ${label}` : 'Complete your exercises',
        body: started
          ? `You've completed ${e.answered}/${e.total} questions`
          : `Your results unlock once you and ${them} complete your exercises`,
        cta: 'Continue', deepLink: `/?view=${link}` });
      break; // one exercise at a time, in order
    }
  }

  // 2. Partner has not finished, and you have. The only case where nudging is
  //    the genuinely useful action.
  // From the registry, like the block above it. This was written out by hand
  // with four of the five: Conflict Patterns was missing, so a couple who owned
  // it, where one of them had finished it and the other had not, was never
  // offered the reminder. The loop above had exactly this bug and was fixed;
  // this line is the same bug, six lines further down, and it survived because
  // the gate skips any file that imports the registry at all.
  const waitingOn = EXERCISES
    .filter(({ key }) => ex[key]?.owned && ex[key].mine && !ex[key].theirs);
  if (waitingOn.length) {
    const nudgedRecently = ago(state.partnerNudgedAt) < NUDGE_COOLDOWN_DAYS;
    add({ id: 'nudge-partner', kind: 'nudge_partner', priority: 9,
      title: nudgedRecently ? `Waiting on ${them}` : `Send ${them} a reminder`,
      body: nudgedRecently
        ? 'You sent a reminder recently'
        : `Results unlock once ${them} finishes ${pronounForm(state.partnerPronouns, 'pos')} final exercise`,
      cta: nudgedRecently ? 'View progress' : 'Send a reminder',
      disabled: nudgedRecently,
      /**
       * The one card that does something rather than going somewhere.
       *
       * `action` is generic: a client runs the named action instead of
       * following the destination, and nothing here branches on kind. The
       * deepLink stays what it was, so a client that has never heard of
       * actions lands on the home screen rather than nowhere.
       */
      action: nudgedRecently ? null : 'nudge',
      deepLink: '/?view=home' });
  }

  // 3. Results ready and never opened. The payoff they paid for.
  if (state.resultsReady && !state.resultsLastOpenedAt) {
    add({ id: 'open-results', kind: 'open_results', priority: 8,
      title: 'Your results are ready',
      body: 'Insights and guidance based on your responses',
      cta: 'Open results', deepLink: '/?view=results' });
  }

  // 4. A resource they paid for and have not used. Bought and unused is worse
  //    than not bought: they are out of pocket with nothing to show.
  for (const [key, label, link] of [['budget', 'Shared Budgeting', 'budget'], ['checklist', 'Newlywed Checklist', 'checklist']]) {
    const r = res[key];
    if (r?.owned && !r.complete) {
      add({ id: `use-${key}`, kind: 'use_resource', priority: 7,
        title: r.started ? `Pick up ${label}` : (RESOURCE_TITLE[key] || 'Start a new exercise'),
        // Ellie's words. The started line is the same for every tool; the
        // other one is per tool, and anything she has not written keeps the
        // general sentence rather than something invented for it.
        body: r.started
          ? 'This exercise is in progress and status has been saved'
          : (RESOURCE_BLURB[key] || 'You have purchased exercises that you have not completed'),
        cta: r.started ? 'Continue' : 'Start', deepLink: `/?view=${link}` });
      break;
    }
  }

  // 6. A new In Practice post they have not read.
  if (ip.latestId && ago(ip.latestPublishedAt) < 30 && ago(ip.lastReadAt) > ago(ip.latestPublishedAt)) {
    add({ id: 'new-post', kind: 'new_post', priority: 5,
      title: 'New publication to explore',
      body: 'View this and others in your resources tab',
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
      title: 'Tell us about your experience',
      body: 'Take a minute to share feedback to help us shape Attune',
      // A page, not a view. /?view=feedback drew the header and nothing else.
      cta: 'Leave feedback', deepLink: '/feedback' });
  }

  /**
   * Nothing outstanding.
   *
   * This used to say "You are all caught up" and stop. Ellie: "I'd rather, in
   * that case, cycle through a list of prompts to drive engagement - one idea
   * is to send a shared note to your partner."
   *
   * So it is a rotation rather than a single line, and every entry points at
   * something the product can actually do today. The rule the engine is
   * written to still holds everywhere else: when something is blocked, say
   * what is blocked. This is the one branch where nothing is, and inventing a
   * task there is the difference between a prompt and a nag.
   *
   * Rotates by day so a person opening twice in an afternoon sees the same
   * one, rather than the app appearing to change its mind.
   *
   * Ellie's words, edited by her on 2026-09-12.
   */
  if (!cards.length) {
    // state.now is an ISO string, not a number: api/home.js sends
    // new Date().toISOString(). Dividing a string gives NaN, and
    // IDLE_PROMPTS[NaN] is undefined, which would have spread into a card with
    // no title, no body and no destination. Parsed, with a fallback so an
    // unusable date still produces a real prompt rather than an empty one.
    // new Date() rather than Date.parse(), because `now` arrives as an ISO
    // string from api/home.js and as a number from anything holding a
    // timestamp. Date.parse returns NaN for the number, which would have made
    // the rotation constant while looking like it worked.
    const ms = new Date(state.now).getTime();
    const day = Number.isFinite(ms) ? Math.floor(ms / 86400000) : 0;
    const idle = IDLE_PROMPTS[day % IDLE_PROMPTS.length];
    add({ id: 'all-clear', kind: 'idle', priority: 0, ...idle });
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

/**
 * What to offer when nothing is waiting.
 *
 * One per day, rotating. Each names a thing that already exists, because a
 * prompt for a feature we do not have is a broken promise on the home screen.
 *
 * Ellie's words. Three of the five bodies are her edits to the drafts.
 */
const IDLE_PROMPTS = [
  {
    title: 'Send a note to your partner',
    body: 'Mark a line in your results and share it with them.',
    cta: 'Open results', deepLink: '/?view=results',
  },
  {
    title: 'Reread what you each wrote',
    body: 'Written answers are worth revisiting and discussing.',
    cta: 'Open results', deepLink: '/?view=results',
  },
  {
    title: 'Pick one conversation to have this week',
    body: 'Every section ends with something to try.',
    cta: 'What comes next', deepLink: '/?view=results',
  },
  {
    title: 'Read something from In Practice',
    body: 'Short pieces on the things that impact relationships.',
    cta: 'Open In Practice', deepLink: '/practice',
  },
  {
    title: 'Look back at your tags',
    body: 'What you marked is a record of what mattered to you.',
    cta: 'Open notes', deepLink: '/?view=notes',
  },
];

export function greeting({ now, firstName, returning, tzOffsetMinutes = 0 }) {
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

  /**
   * ── WHOSE MORNING ─────────────────────────────────────────────────────
   * Ellie, at noon: "it's noon right now and showing me 'good evening'."
   *
   * /api/home runs on the edge runtime, where the server's clock is UTC, and
   * getHours() reads that clock. Noon in Mountain Time is 18:00 UTC, which is
   * the first hour of "Good evening". The greeting was correct for a server
   * nobody lives on.
   *
   * The same shape as every unit bug in this codebase: a number crossing a
   * boundary whose name does not say what it is measured against. `now` is an
   * instant, and an instant has no hour until you say whose.
   *
   * So the caller sends its offset and the server does the arithmetic.
   * getTimezoneOffset() is minutes to ADD to local to reach UTC: +360 in
   * Mountain, so local is UTC minus 360. Shifting and then reading UTC hours
   * gives the reader's own hour without the server needing a timezone
   * database.
   *
   * Zero is the default, which is the old behaviour, so a caller that sends
   * nothing is no worse off than before. check-greeting-clock.mjs fails the
   * build if a caller stops sending it.
   */
  const off = Number.isFinite(Number(tzOffsetMinutes)) ? Number(tzOffsetMinutes) : 0;
  const local = new Date(at.getTime() - off * 60000);

  const h = local.getUTCHours();
  const timeOfDay = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';

  let part = timeOfDay;
  if (returning) {
    const options = [timeOfDay, ...ANYTIME];
    part = options[Math.floor(at.getTime() / 3600000) % options.length] || timeOfDay;
  }
  return firstName ? `${part}, ${firstName}` : part;
}
