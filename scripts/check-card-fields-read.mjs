#!/usr/bin/env node
/**
 * Every field on a home card is read by a surface.
 *
 * ── THE TWO BUGS ──────────────────────────────────────────────────────────
 * `cta` was nine button labels written on the server, and neither the app nor
 * the website ever printed one: the whole card is the button and the title and
 * the line under it do the work. Ellie, told about it: "Field should go."
 *
 * `tint` was the opposite and worse. src/App.jsx drew
 * `background: card.tint || "#F3E4DE"` and nothing has ever set a tint on a
 * card, so both prompts on the website fell to one fallback colour while the
 * app alternated two. `git log -S tint` over the engine returns nothing at all.
 *
 * Both survived for months for the same reason: an extra key costs nothing and
 * raises no error, and a missing one reads as a default rather than a fault.
 *
 * ── THE RULE, AND WHY IT HAS NO EXCEPTIONS ────────────────────────────────
 * Every key the engine puts on a card is dereferenced by at least one surface.
 * That was true of all of them except `priority`, the sort key, which the
 * `{ ...c }` spread published for the life of the screen; it is stripped now.
 *
 * So the rule needs no allowlist, and that is the point. A list of fields
 * excused from being read is exactly where `cta` would have gone, and CLAUDE.md
 * has had to remove one escape hatch already: the field someone reaches for the
 * moment a real regression starts failing.
 *
 * ── HOW IT DECIDES ────────────────────────────────────────────────────────
 * The engine is RUN, over states chosen to raise different rungs, and the union
 * of the keys is compared against what each surface dereferences. Reading the
 * engine's source would miss a key added by a spread, which is how both of these
 * got out.
 *
 * ── AND IT MATCHES THE RECEIVER, NOT THE NAME ─────────────────────────────
 * The first version asked whether `.<key>` appeared anywhere in the three
 * surfaces. Planting `cta` back on a card passed: `.cta` appears eleven times in
 * src/App.jsx, every one of them on `exerciseComplete(...)`, which is a
 * different payload entirely. Evidence by coincidence, which is the mistake
 * CLAUDE.md records about matching a name instead of what follows it.
 *
 * So the receivers are derived first. An identifier that is dereferenced for at
 * least three of `id`, `title`, `body` and `deepLink` is a card; two is not
 * enough, because an exercise intro has a title and a body. Then a field counts
 * as read only when one of THOSE receivers asks for it.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Alerts, which come from api/home.js rather than from this engine and carry
 * their own shape. `createdAt` on one of those is unread today and is a
 * different question: an alert strip with no timestamp is arguably the gap.
 *
 * Whether a field is read WELL. `search` on a post is read and only
 * concatenated; that is not something a check can judge.
 */

import { readFileSync } from 'node:fs';

import { nextActions } from '../api/_lib/next-action.js';
import { EXERCISES } from '../api/_exercises.js';

const ROOT = new URL('..', import.meta.url).pathname;
const fails = [];

/** States chosen so that between them they raise most of the ladder. */
const STATES = [
  { profileComplete: false,
    exercises: Object.fromEntries(EXERCISES.map((e) => [e.key, { owned: true, mine: false, theirs: false }])) },
  { profileComplete: true, resultsReady: true, resultsLastOpenedAt: null, exercises: {} },
  { profileComplete: true, opens30d: 9, exercises: {} },
  { profileComplete: true, exercises: {},
    inPractice: { latestId: 'p1', latestTitle: 'T', latestPublishedAt: '2026-01-01', lastReadAt: null } },
  { profileComplete: true, exercises: {},
    resources: { budget: { owned: true, started: false, complete: false }, checklist: { owned: false } } },
  /* A nudge sent yesterday, which is the only state that raises `disabled`. */
  { profileComplete: true, partnerNudgedAt: '2026-02-01T12:00:00Z',
    exercises: Object.fromEntries(EXERCISES.map((e) => [e.key, { owned: true, mine: true, theirs: false }])) },
];

const keys = new Set();
let cards = 0;
for (const state of STATES) {
  const out = nextActions({ now: '2026-02-02T12:00:00Z', firstName: 'A', partnerName: 'B', ...state });
  for (const c of [out.primary, ...(out.secondary || [])]) {
    if (!c) continue;
    cards += 1;
    for (const k of Object.keys(c)) keys.add(k);
  }
}

if (cards < 4 || keys.size < 4) {
  console.error(`[check-card-fields-read] the engine raised ${cards} cards with ${keys.size} fields`
    + ' between them, which cannot be right. Refusing to pass: a gate that has lost its subject'
    + ' must never report success.');
  process.exit(1);
}

/** Everywhere a card could be read. */
const SURFACES = [
  'src/App.jsx',
  'attune-app/src/app/index.tsx',
  'attune-app/src/api/client.ts',
];
const read = SURFACES.map((f) => readFileSync(`${ROOT}${f}`, 'utf8')).join('\n');

/**
 * Which identifiers in those files are holding a card.
 *
 * Derived rather than listed, so a surface that renames its loop variable stays
 * covered and a gate pointed at the old name cannot quietly stop looking.
 */
const CORE = ['id', 'title', 'body', 'deepLink'];
const receivers = (() => {
  const hits = new Map();
  for (const k of CORE) {
    for (const m of read.matchAll(new RegExp(`\\b([A-Za-z_$][\\w$]*)\\s*\\??\\.${k}\\b`, 'g'))) {
      if (!hits.has(m[1])) hits.set(m[1], new Set());
      hits.get(m[1]).add(k);
    }
  }
  return [...hits].filter(([, ks]) => ks.size >= 3).map(([name]) => name);
})();

if (!receivers.length) {
  console.error('[check-card-fields-read] no identifier in the surfaces reads three of a card\'s'
    + ' four core fields, so there is nothing here holding a card. Refusing to pass: a gate that'
    + ' has lost its subject must never report success.');
  process.exit(1);
}

for (const key of [...keys].sort()) {
  const esc = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const seen = receivers.some((r) => new RegExp(`\\b${r}\\s*\\??\\.${esc}\\b`).test(read));
  if (!seen) {
    fails.push(`the engine puts \`${key}\` on every card and no surface reads it.\n`
      + '      Either a screen should draw it, or it should not be sent. `cta` was nine button\n'
      + '      labels nobody printed and Ellie\'s answer was "Field should go"; `priority` was\n'
      + '      the sort key, published by the spread for the life of the screen.');
  }
}

if (fails.length) {
  console.error('\n check-card-fields-read: a home card carries something nobody reads.\n');
  for (const f of fails) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}

console.log(`[check-card-fields-read] ${cards} cards across ${STATES.length} states carry`
  + ` ${keys.size} fields between them, and every one is read off a card by one of`
  + ` ${receivers.length} receivers (${receivers.join(', ')}).`);
