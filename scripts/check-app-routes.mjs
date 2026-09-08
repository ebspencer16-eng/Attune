// Fails the build when the routes the server sends and the routes the app has
// stop agreeing.
//
// /api/_lib/next-action.js decides where each Home card goes. The app pushes
// that route. If the two drift, a card navigates nowhere: expo-router's typed
// routes cannot check a string decided at runtime, so nothing errors and the
// button is simply inert. That is exactly how every card on Home came to do
// nothing for the life of the screen.
//
// Three things have to line up: the tab triggers that exist, the set the app
// validates against, and the routes the engine hands out.

import { readFileSync } from 'fs';
import { nextActions } from '../api/_lib/next-action.js';
import { EXERCISES } from '../api/_exercises.js';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

// The tabs that exist, from the tab bar itself.
const tabs = [...read('attune-app/src/components/app-tabs.tsx')
  .matchAll(/NativeTabs\.Trigger name="([a-z]+)"/g)].map(m => m[1]);
const actual = new Set(tabs.map(t => (t === 'index' ? '/' : `/${t}`)));

// The set the app checks a route against before pushing it.
const declared = new Set(
  [...(/const APP_ROUTES = new Set\(\[([^\]]*)\]\)/.exec(read('attune-app/src/app/index.tsx'))?.[1] || '')
    .matchAll(/'([^']+)'/g)].map(m => m[1]));

const problems = [];

for (const r of declared) {
  if (!actual.has(r)) problems.push(`APP_ROUTES lists ${r}, which is not a tab in app-tabs.tsx.`);
}
for (const r of actual) {
  if (!declared.has(r)) problems.push(`${r} is a tab but is missing from APP_ROUTES, so cards routed there go nowhere.`);
}

// Every route the engine can hand out must be one the app has. Walked over a
// spread of states so every card kind gets produced.
const base = (over) => ({
  now: new Date().toISOString(), firstName: 'A', partnerName: 'B', profileComplete: true,
  exercises: Object.fromEntries(EXERCISES.map(e => [e.key, { owned: false }])),
  resultsReady: true, resources: { budget: { owned: false }, checklist: { owned: false } },
  inPractice: {}, opens30d: 0, ...over,
});
const states = [
  {}, { profileComplete: false }, { resultsReady: false },
  { inPractice: { latestId: 'x', latestTitle: 'y', latestPublishedAt: new Date().toISOString() } },
  { resources: { budget: { owned: true, complete: false }, checklist: { owned: false } } },
  ...EXERCISES.map(e => ({
    exercises: Object.fromEntries(EXERCISES.map(x => [
      x.key, x.key === e.key ? { owned: true, mine: false, theirs: false } : { owned: false }])),
    resultsReady: false,
  })),
];

const seen = new Set();
for (const over of states) {
  const r = nextActions(base(over));
  for (const card of [r.primary, ...r.secondary].filter(Boolean)) {
    if (!card.app) { problems.push(`card ${card.id} has no app destination.`); continue; }
    if (card.app.route) {
      seen.add(card.app.route);
      if (!actual.has(card.app.route)) {
        problems.push(`card ${card.id} routes to ${card.app.route}, which the app does not have.`);
      }
    } else if (!card.app.external) {
      problems.push(`card ${card.id} has an app destination with neither a route nor a URL.`);
    }
  }
}

if (problems.length) {
  console.error('[check-app-routes] the server and the app disagree about where cards go:');
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

console.log(`[check-app-routes] ${actual.size} tabs, ${seen.size} reachable from cards, all agree.`);
