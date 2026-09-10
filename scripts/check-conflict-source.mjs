// Fails the build when a surface tries to work out conflict results for itself.
//
// ── WHAT HAPPENED ──────────────────────────────────────────────────────────
// Ellie: "Conflict is present but when I click says 'not open yet'." It said
// that for every couple, on every conflict page, for as long as the section
// has existed on the website.
//
// Conflict Patterns is the one section that cannot be paired on the client.
// Half of it is private: the product tells the customer, on the page, "Not
// visible to your partner. This is the one section that stays private,
// always." So /api/partner-sync withholds the partner's raw conflict record
// and sends an allowlisted summary instead.
//
// src/App.jsx did not know. It read partnerSession.conflict.answers, a field
// that has never been sent, and called summarizeConflict() on the result. That
// needs the raw answers it must never have, so it returned null, so
// conflictBothDone was false, so every page showed the waiting screen. Nothing
// errored. A privacy rule working exactly as designed and a consumer that had
// never been told, which is the same shape as the field the same endpoint
// deletes.
//
// It is also the whole of "conflict works on the app and not the web": the app
// has always read /api/conflict-results, which pairs the two records on the
// server where both legitimately are.
//
// ── WHAT THIS CHECKS ───────────────────────────────────────────────────────
// That neither surface calls summarizeConflict or conflictPair on anything,
// and that both read the endpoint. Own answers are not an exception: the
// endpoint returns the reader's full summary too, so there is no reason left
// to compute one, and an exception here is where the next copy hides.
//
// api/ is exempt, obviously: that is where the computing belongs.

import { readFileSync } from 'fs';

const ROOT = new URL('..', import.meta.url).pathname;

/**
 * Blank out comments, keeping every newline so line numbers still mean
 * something.
 *
 * Skipping lines that START with a comment marker is not enough: a block
 * comment's continuation lines start with whatever the prose starts with, and
 * this gate's first run flagged a sentence inside its own explanation of the
 * bug. A checker that cannot tell code from prose about code will eventually
 * be silenced by someone rather than fixed.
 */
function stripComments(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, p) => p + ' '.repeat(m.length - p.length));
}

const SURFACES = [
  { file: 'src/App.jsx', endpoint: '/api/conflict-results' },
  { file: 'attune-app/src/api/client.ts', endpoint: '/api/conflict-results' },
];

const problems = [];

for (const { file, endpoint } of SURFACES) {
  const raw = readFileSync(ROOT + file, 'utf8');
  const src = stripComments(raw);

  for (const fn of ['summarizeConflict', 'conflictPair']) {
    // A call, not a mention. The comment explaining why this is gone is fine.
    const called = new RegExp(`(?<![\\w.])${fn}\\s*\\(`);
    src.split('\n').forEach((line, i) => {
      if (!called.test(line)) return;
      problems.push(
        `${file}:${i + 1} calls ${fn}(). Conflict results are paired by\n`
        + `      ${endpoint}, on the server, because the partner's raw record is\n`
        + '      withheld by design and this cannot work without it.\n'
        + `      ${raw.split('\n')[i].trim().slice(0, 88)}`);
    });
  }

  if (!raw.includes(endpoint)) {
    problems.push(
      `${file} never calls ${endpoint}. That endpoint is the only place a\n`
      + '      surface can get a partner\'s conflict half, so a surface that draws\n'
      + '      these pages without it is drawing them from nothing.');
  }
}

// And the allowlist has to still be what stands between the two. If
// partner-sync stopped stripping, the client could compute again and the
// promise on the page would quietly stop being true.
const sync = stripComments(readFileSync(ROOT + 'api/partner-sync.js', 'utf8'));
if (!/delete\s+\w+\.conflict_data;/.test(sync)) {
  problems.push(
    'api/partner-sync.js no longer deletes conflict_data. The page promises the\n'
    + '      reader that their patterns are "not visible to your partner, always".\n'
    + '      That promise is this line.');
}

if (problems.length) {
  console.error('[check-conflict-source] a surface is computing conflict results itself:');
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

console.log(
  '[check-conflict-source] neither surface pairs conflict itself; both read '
  + '/api/conflict-results, and partner-sync still strips the raw record.');
