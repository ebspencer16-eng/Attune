// Tests for the app home screen's priority engine.
//
// This is the screen the whole app hangs on, and its logic is pure, so it can
// be tested properly here rather than by tapping through a simulator. Every
// rung of the ladder is covered, plus the orderings that are easy to get
// backwards.
//
//   node scripts/next-action-test.mjs

import { nextActions, greeting } from '../api/_lib/next-action.js';
import { EXERCISES } from '../api/_exercises.js';

let pass = 0, fail = 0;
const NOW = '2026-08-29T10:00:00.000Z';
const ok = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  PASS  ${name}`); }
  else { fail++; console.error(`  FAIL  ${name}${detail ? '  ::  ' + detail : ''}`); }
};
const base = (over = {}) => ({
  now: NOW, firstName: 'Ellie', partnerName: 'Preston',
  profileComplete: true,
  exercises: {
    ex1: { owned: true, mine: true, theirs: true },
    ex2: { owned: true, mine: true, theirs: true },
    ex3: { owned: false }, intimacy: { owned: false },
  },
  resultsReady: true,
  resultsLastOpenedAt: NOW,
  resources: { budget: { owned: false }, checklist: { owned: false } },
  inPractice: {},
  opens30d: 0,
  ...over,
});
const primary = (over) => nextActions(base(over)).primary;

// ── The ladder, rung by rung ────────────────────────────────────────────────
ok('own unfinished exercise wins over everything',
  primary({ exercises: { ...base().exercises, ex1: { owned: true, mine: false, theirs: true } },
            resultsReady: false }).kind === 'finish_exercise');

ok('own unfinished exercise outranks nudging the partner',
  // Both are true: they owe ex1, partner owes ex2. Asking someone else to
  // finish while you have not is the wrong prompt.
  primary({ exercises: {
    ex1: { owned: true, mine: false, theirs: true },
    ex2: { owned: true, mine: true, theirs: false },
    ex3: { owned: false }, intimacy: { owned: false },
  }, resultsReady: false }).kind === 'finish_exercise');

// Conflict Patterns was missing from the hardcoded list this engine used to
// carry, so a couple who owned it and had not finished it was never prompted.
// Every exercise in the registry gets a card, not four of the five.
ok('an owned unfinished Conflict Patterns is prompted',
  primary({ exercises: {
    ex1: { owned: true, mine: true, theirs: true },
    ex2: { owned: true, mine: true, theirs: true },
    ex3: { owned: false }, intimacy: { owned: false },
    conflict: { owned: true, mine: false, theirs: false },
  }, resultsReady: false }).id === 'finish-conflict');

// The same, stated as a rule rather than a case, so adding an exercise to the
// registry without teaching the engine about it fails here.
for (const e of EXERCISES) {
  const only = Object.fromEntries(EXERCISES.map(x => [
    x.key, x.key === e.key ? { owned: true, mine: false, theirs: false } : { owned: false },
  ]));
  ok(`every registry exercise can be prompted: ${e.key}`,
    primary({ exercises: only, resultsReady: false }).id === `finish-${e.key}`);
}

ok('nudge the partner when you are done and they are not',
  primary({ exercises: { ...base().exercises, ex2: { owned: true, mine: true, theirs: false } },
            resultsReady: false }).kind === 'nudge_partner');

const recentlyNudged = primary({
  exercises: { ...base().exercises, ex2: { owned: true, mine: true, theirs: false } },
  resultsReady: false, partnerNudgedAt: '2026-08-28T10:00:00.000Z' });
ok('a recent nudge disables rather than repeats', recentlyNudged.disabled === true, recentlyNudged.title);

ok('results ready and never opened',
  primary({ resultsLastOpenedAt: null }).kind === 'open_results');

ok('a paid resource sitting unused',
  primary({ resources: { budget: { owned: true, started: false, complete: false }, checklist: { owned: false } } }).kind === 'use_resource');

ok('a started resource says pick up, not start',
  primary({ resources: { budget: { owned: true, started: true, complete: false }, checklist: { owned: false } } }).title.startsWith('Pick up'));

ok('a completed resource does not prompt',
  primary({ resources: { budget: { owned: true, started: true, complete: true }, checklist: { owned: false } } }).kind !== 'use_resource');

ok('profile setup when incomplete',
  primary({ profileComplete: false }).kind === 'profile_setup');

// Profile outranks starting an exercise: the exercises need pronouns, and
// answering without them produces results copy that misgenders someone.
ok('profile setup outranks starting an exercise',
  primary({ profileComplete: false, resultsReady: false,
    exercises: { ex1: { owned: true, mine: false, theirs: false }, ex2: { owned: true },
                 ex3: { owned: false }, intimacy: { owned: false } } }).kind === 'profile_setup');

ok('a new post they have not read',
  primary({ inPractice: { latestId: 'p1', latestTitle: 'Repair after a hard week',
    latestPublishedAt: '2026-08-27T10:00:00.000Z', lastReadAt: null } }).kind === 'new_post');

ok('an already-read post does not prompt',
  primary({ inPractice: { latestId: 'p1', latestPublishedAt: '2026-08-27T10:00:00.000Z',
    lastReadAt: '2026-08-28T10:00:00.000Z' } }).kind !== 'new_post');

// ── Revisit, which must be specific or absent ───────────────────────────────
const staleNoAnchor = primary({ resultsLastOpenedAt: '2026-06-01T10:00:00.000Z' });
ok('no revisit prompt without something specific to point at',
  staleNoAnchor.kind !== 'revisit_results', staleNoAnchor.kind);

const staleWithAnchor = primary({ resultsLastOpenedAt: '2026-06-01T10:00:00.000Z',
  topGapDimensionLabel: 'Conflict Style' });
ok('revisit names the thing', staleWithAnchor.kind === 'revisit_results' && /Conflict Style/.test(staleWithAnchor.title), staleWithAnchor.title);

ok('a flagged conversation outranks the widest gap as the anchor',
  primary({ resultsLastOpenedAt: '2026-06-01T10:00:00.000Z', topGapDimensionLabel: 'Conflict Style',
    unresolvedConversationTitle: 'Planning visits with family' }).title.includes('Planning visits'));

ok('recently opened results do not prompt a revisit',
  primary({ resultsLastOpenedAt: '2026-08-25T10:00:00.000Z', topGapDimensionLabel: 'Conflict Style' }).kind !== 'revisit_results');

// ── Feedback, only from regulars ────────────────────────────────────────────
ok('no feedback ask from an occasional user',
  primary({ opens30d: 2 }).kind !== 'feedback');
ok('feedback ask from a regular with nothing else outstanding',
  primary({ opens30d: 9 }).kind === 'feedback');
ok('no feedback ask once given',
  primary({ opens30d: 9, feedbackGivenAt: NOW }).kind !== 'feedback');

// ── Nothing outstanding ─────────────────────────────────────────────────────
ok('all caught up rather than an invented task', primary({}).kind === 'idle');

// ── Shape ───────────────────────────────────────────────────────────────────
const full = nextActions(base({ profileComplete: false, resultsLastOpenedAt: null, opens30d: 9 }));
ok('one primary and at most three secondary', !!full.primary && full.secondary.length <= 3);
ok('secondary is lower priority than primary',
  full.secondary.every(c => c.priority <= full.primary.priority));
// Every card must also carry an app destination, or the card does nothing when
// tapped in the app. That was true of every card for the life of the screen:
// the app pushed the website route and navigated nowhere.
{
  const all = [];
  for (const over of [
    {}, { profileComplete: false }, { resultsReady: false },
    { exercises: { ex1: { owned: true, mine: false, theirs: false }, ex2: { owned: false }, ex3: { owned: false }, intimacy: { owned: false }, conflict: { owned: false } }, resultsReady: false },
    { exercises: { ex1: { owned: true, mine: true, theirs: true }, ex2: { owned: true, mine: true, theirs: true }, ex3: { owned: true, mine: false, theirs: false }, intimacy: { owned: false }, conflict: { owned: false } }, resultsReady: false },
  ]) {
    const r = nextActions(base(over));
    all.push(r.primary, ...r.secondary);
  }
  ok('every card carries an app destination',
    all.filter(Boolean).every(c => c.app && (c.app.route || c.app.external)));
  ok('no app destination is a raw website view route',
    all.filter(Boolean).every(c => !c.app?.route || !c.app.route.includes('view=')));
}

ok('every card carries a deep link', [full.primary, ...full.secondary].every(c => c.deepLink));

// ── No streak mechanics ─────────────────────────────────────────────────────
const src = await import('fs').then(fs => fs.readFileSync(new URL('../api/_lib/next-action.js', import.meta.url), 'utf8'));
ok('no streak or daily-habit language in the engine',
  !/streak|don'?t break|keep it going|days in a row/i.test(src.replace(/\/\*[\s\S]*?\*\//g, '')));

// ── Greeting ────────────────────────────────────────────────────────────────
//
// This asserted one exact string, 'Welcome back', which was the whole of the
// behaviour when the greeting never varied. It does now: Ellie asked for it to
// move between the time of day and a few generic phrases. Asserting the output
// of one hour would fail on five hours in six and prove nothing about the six.
//
// So the properties instead. They are the things that would actually be wrong.
ok('greeting uses the name', greeting({ now: NOW, firstName: 'Ellie' }).includes('Ellie'));

// Date.parse, because NOW is an ISO string and adding a number to a string
// concatenates. That mistake is what found greeting() returning undefined for
// an unparseable date, so it is worth naming rather than just avoiding.
const HOURS = Array.from({ length: 48 }, (_, i) => Date.parse(NOW) + i * 3600000);

// A first visit is always the time of day. Greeting a first arrival with
// "welcome back" is the product claiming a history it does not have.
ok('a first visit is only ever the time of day',
  HOURS.every((t) => /^Good (morning|afternoon|evening)$/.test(greeting({ now: t }))));

// A returning visitor sees more than one phrase across a day, and every one of
// them is from the list rather than assembled.
const seen = new Set(HOURS.map((t) => greeting({ now: t, returning: true })));
ok('a returning visitor sees several different greetings', seen.size >= 3);
ok('every greeting is a whole phrase, never a fragment',
  [...seen].every((g) => /^(Good (morning|afternoon|evening)|[A-Z][a-z].*[a-z])$/.test(g) && !g.endsWith(',')));

// The time-of-day forms must still be honest about the clock: a greeting is
// the one piece of copy a reader can immediately check against their own day.
//
// Stated in UTC on both sides. This used to compare greeting() against
// new Date(t).getHours(), the hour of whichever machine ran the test, which
// agreed with greeting() only because greeting() had the same bug: it read the
// server's clock. Now that the reader's offset is explicit, the test has to be
// explicit too, and it is deterministic wherever it runs rather than passing in
// UTC and failing in Denver.
ok('a morning greeting never appears in the evening',
  HOURS.filter((t) => new Date(t).getUTCHours() >= 18)
    .every((t) => !/morning|afternoon/.test(
      greeting({ now: t, returning: true, tzOffsetMinutes: 0 }))));

// And the reader's own zone decides, not the server's.
ok('noon in Denver is the afternoon, not the evening',
  greeting({ now: '2026-09-12T18:00:00Z', tzOffsetMinutes: 360 }) === 'Good afternoon');
ok('the same instant is the evening for a reader in UTC',
  greeting({ now: '2026-09-12T18:00:00Z', tzOffsetMinutes: 0 }) === 'Good evening');

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
