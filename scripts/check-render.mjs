// Render smoke test. Loads every results section in a real browser and fails
// on any page error or unresolved token in the rendered text.
//
// This exists because esbuild does not flag undefined variable references. A
// scope crash builds clean and throws at render: extracting buildCommsProtocols
// pulled glancePlan out of PersonalityResults with it, the build passed, and
// the comms glance page threw a ReferenceError for every user. Only a real
// render catches that class.
//
// Not part of `npm run build` — it needs a browser and a running preview, so
// Vercel cannot run it. Run it locally before pushing anything that moves code
// between scopes:
//
//   npx vite build && npx vite preview --port 4173 &
//   node scripts/check-render.mjs
//
// Optional: BASE=http://127.0.0.1:4173 TYPE=WX PKG=premium

import { createRequire } from 'module';

const BASE = process.env.BASE || 'http://127.0.0.1:4173';
const TYPE = process.env.TYPE || 'WX';
const PKG = process.env.PKG || 'premium';

const SECTIONS = [
  'highlights', 'couple-type',
  'comm-overview', 'comm-inner', 'comm-connection', 'comm-hard',
  'exp-overview', 'exp-convo-0', 'exp-convo-1', 'exp-convo-2',
  'exp-convo-3', 'exp-convo-4', 'exp-convo-5',
  'reflection-overview', 'reflection-ratings', 'reflection-story', 'reflection-plan',
  'intimacy-overview', 'intimacy-plan',
  'what-comes-next',
];

// Anything in braces that survived to the screen, plus the two words that mean
// a value was missing rather than absent.
const LEAK = /\{[A-Za-z_][A-Za-z0-9_]*\}|\[[WXYZ] partner name\]|\bundefined\b|\bNaN\b/g;

const require = createRequire('/home/claude/.npm-global/lib/node_modules/playwright/');
const { chromium } = require('playwright');

const browser = await chromium.launch({
  executablePath: process.env.CHROME || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
  args: ['--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 1200 } });

const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => {
  const t = m.text();
  // 403/404 are the demo's missing Supabase calls, not render failures.
  if (m.type() === 'error' && !/403|404|Failed to load resource/.test(t)) errors.push('console: ' + t);
});

let failed = 0;
const skipped = [];
await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });

for (const section of SECTIONS) {
  errors.length = 0;
  await page.evaluate(
    (s) => localStorage.setItem('attune_results_state', JSON.stringify({ activeResult: s, highlightsSeen: true })),
    section,
  );
  await page.goto(`${BASE}/?demo=1&type=${TYPE}&pkg=${PKG}&view=results`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);

  // Read the results column, not the whole document: a section the demo has no
  // data for still renders the shell and the marketing footer, which is long
  // enough to pass a body-length check while showing the user nothing.
  const text = await page.evaluate(() => {
    const el = document.querySelector('[data-results-scroll]');
    return (el ? el.innerText : document.body.innerText) || '';
  });
  const leaks = [...new Set((text.match(LEAK) || []))];
  // A section the demo has no data for still renders the shell and the site
  // footer, so the column is not empty: it comes to ~290 characters of nav
  // links and nothing else. Every real section is several times that. 600 sits
  // well clear of both.
  const empty = text.trim().length < 600;
  // A section this couple cannot reach now redirects to highlights rather than
  // rendering blank, so a length check alone would call it clean. Ask where we
  // actually landed.
  const landed = await page.evaluate(() => {
    try { return JSON.parse(localStorage.getItem('attune_results_state') || '{}').activeResult; } catch { return null; }
  });
  const redirected = landed && landed !== section;

  const problems = [
    ...errors,
    ...(leaks.length ? ['leaked: ' + leaks.slice(0, 4).join(', ')] : []),
  ];
  if (problems.length) {
    failed++;
    console.error(`  FAIL  ${section}`);
    for (const p of problems.slice(0, 3)) console.error(`        ${p.slice(0, 160)}`);
  } else if (redirected || empty) {
    // Not a failure: the section exists but the demo has no answers for it, so
    // there is nothing to render and nothing to check. Reported loudly rather
    // than silently passed, because a section that can never be seen in demo
    // is also a section nobody has visually reviewed.
    skipped.push(section);
    console.log(`  SKIP  ${section}  (${redirected ? 'not available for this package, redirected to ' + landed : 'no demo data — ' + text.trim().length + ' chars'})`);
  } else {
    console.log(`  ok    ${section}`);
  }
}

await browser.close();

if (failed) {
  console.error(`\n[check-render] ${failed} of ${SECTIONS.length} sections failed.`);
  process.exit(1);
}
console.log(`\n[check-render] ${SECTIONS.length - skipped.length} of ${SECTIONS.length} sections rendered clean (${TYPE}, ${PKG}).`);
if (skipped.length) console.log(`[check-render] skipped, no demo data: ${skipped.join(', ')}`);
