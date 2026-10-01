#!/usr/bin/env node
/**
 * Every card the home engine can produce goes somewhere, on both surfaces.
 *
 * ── THE BUG, TWICE ────────────────────────────────────────────────────────
 * The app's cards were once silently inert: every deepLink is a website route
 * like `/?view=results`, the app has four tabs and no concept of `?view=`, so
 * pushing one navigated nowhere. `appTargetFor` was written for that.
 *
 * The website had the same bug and nobody looked, because the deepLinks are
 * written in its own vocabulary and three of them are still not views it can
 * render. Its handler read `?view=`, checked RENDERABLE_VIEWS, and fell through
 * to the Insights tab:
 *
 *   /?view=profile          no `profile` view exists
 *   /?view=practice&post=N  no `practice` view exists
 *   /feedback               a page, so the `?view=` read finds nothing
 *
 * "Finish setting up your profile", "New publication to explore" and both
 * feedback cards opened Insights. The beta feedback card became one of the two
 * prompts on Home the same week, so the most prominent thing on the screen went
 * to the wrong tab.
 *
 * ── HOW IT IS CHECKED ─────────────────────────────────────────────────────
 * The deepLinks are DERIVED by running the engine across the states that raise
 * each card, never listed here: a list typed in a gate goes stale the first
 * time a card is added, and goes stale silently, which is the failure this
 * catches one level down.
 *
 * Then each link is put through both resolvers and the answer has to be a real
 * destination. Running them, not reading them: a destination worked out inside
 * a screen is a destination nothing can check, which is why both resolvers live
 * in api/_lib/next-action.js.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Whether the destination is the RIGHT one. "Profile setup opens the account
 * page" is a judgement; that it opens anything at all is not.
 *
 * Whether the app's route exists as a file. check-app-routes.mjs holds that.
 */

import { readFileSync } from 'node:fs';

import { nextActions, appTargetFor, webTargetFor } from '../api/_lib/next-action.js';
import { EXERCISES } from '../api/_exercises.js';

const ROOT = new URL('..', import.meta.url).pathname;
const fails = [];

/** The website's own list, read from its source rather than restated here. */
const RENDERABLE = (() => {
  const src = readFileSync(`${ROOT}src/App.jsx`, 'utf8');
  const m = /const RENDERABLE_VIEWS = new Set\(\[([\s\S]*?)\]\)/.exec(src);
  if (!m) return null;
  return new Set([...m[1].matchAll(/"([a-z0-9-]+)"/g)].map((x) => x[1]));
})();

if (!RENDERABLE || !RENDERABLE.size) {
  console.error('[check-card-targets] RENDERABLE_VIEWS could not be read from src/App.jsx.'
    + ' Refusing to pass: a gate that has lost its subject must never report success.');
  process.exit(1);
}

/** Every state that raises a card, so every deepLink the engine can emit. */
const ex = (over = {}) => Object.fromEntries(
  EXERCISES.map((e) => [e.key, { owned: true, mine: true, theirs: true, ...over }]),
);
const STATES = [
  { profileComplete: false, exercises: ex({ mine: false, theirs: false }) },
  { profileComplete: true, exercises: ex({ mine: false, theirs: false }) },
  { profileComplete: true, exercises: ex({ theirs: false }) },
  { profileComplete: true, exercises: ex(), resultsReady: true },
  { profileComplete: true, exercises: ex(), resources: { budget: { owned: true, started: false, complete: false } } },
  { profileComplete: true, exercises: ex(), resources: { checklist: { owned: true, started: false, complete: false } } },
  { profileComplete: true, exercises: ex(), inPractice: { latestId: 7, latestPublishedAt: '2025-12-28T12:00:00Z', lastReadAt: null } },
  { profileComplete: true, exercises: ex(), resultsReady: true, resultsLastOpenedAt: '2025-10-01T12:00:00Z', topGapDimensionLabel: 'Conflict Style' },
  { profileComplete: true, exercises: ex(), resultsReady: true, resultsLastOpenedAt: '2025-10-01T12:00:00Z', unresolvedConversationTitle: 'Money' },
  { profileComplete: true, exercises: ex(), opens30d: 6 },
  { profileComplete: true, exercises: ex(), resultsReady: true, resultsLastOpenedAt: '2025-09-30T12:00:00Z', betaTester: true },
];
/* The idle rotation, which is five more cards and five more destinations. */
for (let d = 0; d < 7; d += 1) {
  STATES.push({
    now: new Date(Date.UTC(2026, 0, 1 + d)).toISOString(),
    profileComplete: true, exercises: ex(),
  });
}

const seen = new Map();
for (const state of STATES) {
  const out = nextActions({
    now: '2026-01-01T12:00:00Z', firstName: 'A', partnerName: 'B', partnerPronouns: 'she/her',
    ...state,
  });
  for (const card of [out.primary, ...(out.secondary || [])]) {
    if (card) seen.set(card.deepLink, card.id);
  }
}

if (seen.size < 5) {
  console.error(`[check-card-targets] the engine produced only ${seen.size} destinations across`
    + ' every state. Refusing to pass: a gate that has lost its subject must never report'
    + ' success.');
  process.exit(1);
}

for (const [link, cardId] of seen) {
  // ── The website ───────────────────────────────────────────────────────────
  const web = webTargetFor(link, RENDERABLE);
  if (!web || (!web.href && !web.view)) {
    fails.push(`the website has no destination for ${link} (card ${cardId}).`);
  } else if (web.unresolved) {
    fails.push(`the website has no destination for ${link} (card ${cardId}): webTargetFor`
      + ' fell through to its unknown branch.\n'
      + '      It shows the dashboard so the card does something, but the card is about'
      + ' something else.\n'
      + '      Three plants passed before this was reported, because the fallback returned'
      + ' a real view.');
  } else if (web.view && !RENDERABLE.has(web.view)) {
    fails.push(`${link} (card ${cardId}) resolves to the website view "${web.view}",`
      + ' which RENDERABLE_VIEWS does not contain, so the dashboard draws nothing for it.');
  }

  // ── The app ───────────────────────────────────────────────────────────────
  const app = appTargetFor(link);
  if (!app || !app.route) {
    fails.push(`the app has no route for ${link} (card ${cardId}).`);
  }
}

/**
 * The resolver can still say "I do not know".
 *
 * Every check above reads `web.unresolved`, so a resolver that stopped setting
 * it would make all of them pass: a fallback that cannot be told apart from an
 * answer is exactly the shape of the bug being guarded against, one level up.
 * Two plants proved it, so the flag itself is probed with a link that is
 * certainly not a destination.
 */
{
  const nonsense = webTargetFor('/?view=definitely-not-a-view-abc123', RENDERABLE);
  if (!nonsense || !nonsense.unresolved) {
    fails.push('webTargetFor answered a link that is not a destination without setting'
      + ' `unresolved`, so every other check here would accept a card that goes nowhere.'
      + ' Refusing to pass: a gate whose signal has been removed must never report success.');
  }
  const page = webTargetFor('/some-page-that-is-not-a-view', RENDERABLE);
  if (!page || !page.href) {
    fails.push('webTargetFor no longer treats a path-shaped link as a page to navigate to,'
      + ' which is how /feedback reaches the questionnaire.');
  }
  /**
   * Home, in both spellings, is a tab and not a page reload.
   *
   * Probed rather than swept, because the engine emits `/?view=home` and never
   * a bare `/`, so the sweep above cannot see this one. It was wrong when first
   * written: `/` matched the page branch and answered `{ href: '/' }`, which is
   * a full reload of the marketing site instead of switching tab.
   */
  for (const link of ['/', '', '/?view=home']) {
    const home = webTargetFor(link, RENDERABLE);
    if (!home || home.view !== 'home' || home.href || home.unresolved) {
      fails.push(`webTargetFor(${JSON.stringify(link)}) answered`
        + ` ${JSON.stringify(home)} rather than the Home tab. A card that means home should`
        + ' switch tab, not reload the site.');
    }
  }
}

/**
 * And the website actually uses the resolver.
 *
 * It is the handler that was wrong, not the engine, so a gate that only runs
 * the resolver would pass while the screen went on doing its own thing.
 */
{
  const src = readFileSync(`${ROOT}src/App.jsx`, 'utf8');
  const code = src.replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n');
  if (!/onCard=\{[\s\S]{0,400}?webTargetFor\(/.test(code)) {
    fails.push('src/App.jsx\'s onCard does not call webTargetFor, so the cards are routed by'
      + ' whatever that handler decides and nothing here checks it. That is the arrangement'
      + ' that sent three cards to the Insights tab.');
  }
}

if (fails.length) {
  console.error('\n check-card-targets: a card on the home screen goes nowhere.\n');
  for (const f of fails) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}

console.log(`[check-card-targets] ${seen.size} destinations the engine can produce, every one`
  + ' resolving to a view the website draws or a page it can open, and to a route in the app.');
