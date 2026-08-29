// Tests for the app home screen's priority engine.
//
// This is the screen the whole app hangs on, and its logic is pure, so it can
// be tested properly here rather than by tapping through a simulator. Every
// rung of the ladder is covered, plus the orderings that are easy to get
// backwards.
//
//   node scripts/next-action-test.mjs

import { nextActions, greeting } from '../api/_lib/next-action.js';

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
ok('every card carries a deep link', [full.primary, ...full.secondary].every(c => c.deepLink));

// ── No streak mechanics ─────────────────────────────────────────────────────
const src = await import('fs').then(fs => fs.readFileSync(new URL('../api/_lib/next-action.js', import.meta.url), 'utf8'));
ok('no streak or daily-habit language in the engine',
  !/streak|don'?t break|keep it going|days in a row/i.test(src.replace(/\/\*[\s\S]*?\*\//g, '')));

// ── Greeting ────────────────────────────────────────────────────────────────
ok('greeting uses the name', greeting({ now: NOW, firstName: 'Ellie' }).includes('Ellie'));
ok('greeting falls back without a name', greeting({ now: NOW, returning: true }) === 'Welcome back');

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
