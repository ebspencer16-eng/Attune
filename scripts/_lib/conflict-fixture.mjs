// A complete Conflict Patterns payload, for the render smoke test only.
//
// ── WHY A FIXTURE AND NOT DEMO DATA ────────────────────────────────────────
// The four Conflict pages were excluded from the smoke test because the demo
// cannot stand up /api/conflict-results. So they were the only results pages
// nobody had ever rendered, and they sat on "Loading. One moment." forever
// after the website moved to reading that endpoint. Four pages, invisible,
// because the thing that renders every other page skipped them.
//
// The obvious fix is demo answers for Sarah and James, like the intimacy ones.
// That is not mine to write: two of the conflict questions are free text, and
// demo answers appear in the showcase tour, which is customer-facing copy and
// Ellie's.
//
// A test fixture is different. It is injected by a script, rendered in a
// headless browser, and seen by nobody. The wording below is placeholder on
// purpose and must never become demo data.
//
// Built from the question registry rather than typed, so it stays complete as
// questions change: isConflictComplete requires every id in CONFLICT_REQUIRED,
// and a fixture missing one summarises to null and silently tests nothing.

import { CONFLICT_QUESTIONS, CONFLICT_REQUIRED } from '../../api/_conflict-questions.js';
import { summarizeConflict } from '../../api/_lib/conflict-results.js';
import { partnerView } from '../../api/_lib/conflict-partner-view.js';
import {
  PATTERN_COPY, PATTERN_ACTIONS, PATTERN_NOTES, BAND_COLORS, FREQUENCY_LABELS,
  SNAPSHOT_ROWS, SNAPSHOT_PROSE, OPENING_CHIPS, CONFLICT_RESULTS_COPY,
  NO_ACTION_NEEDED, WROTE_ROWS,
} from '../../api/_conflict-results-prose.js';

/** One person's answers, complete by construction. `seed` varies the picks. */
function answersFor(seed) {
  const out = {};
  for (const id of CONFLICT_REQUIRED) {
    const q = CONFLICT_QUESTIONS.find((x) => x.id === id);
    if (!q) continue;
    switch (q.kind) {
      case 'scale':
        out[id] = seed % (q.options?.length || 5);
        break;
      case 'forcedAB':
        out[id] = seed % 2 === 0 ? 'A' : 'B';
        break;
      case 'frequency':
        // Spread across the bands so the pages have something to rank and at
        // least one pattern lands in "worth attention".
        out[id] = (seed + id.length) % 4;
        break;
      case 'pickOne':
        out[id] = q.options?.[seed % q.options.length] ?? 'Taking a break';
        break;
      case 'rank':
        out[id] = [...(q.options || [])].slice(0, 3);
        break;
      case 'openText':
      default:
        out[id] = 'Fixture text, never shown to anyone.';
        break;
    }
  }
  return out;
}

export function conflictFixture() {
  const mine = summarizeConflict(answersFor(1));
  const theirs = summarizeConflict(answersFor(2));
  if (!mine || !theirs) {
    throw new Error(
      'conflict fixture is incomplete: summarizeConflict returned null. '
      + 'A question was probably added with a kind this builder does not handle.',
    );
  }
  return {
    ok: true,
    ready: true,
    names: { you: 'Sarah', partner: 'James' },
    you: mine,
    partner: partnerView(theirs, 'James'),
    partnerFinished: true,
    content: {
      patternCopy: PATTERN_COPY,
      patternActions: PATTERN_ACTIONS,
      patternNotes: PATTERN_NOTES,
      bandColors: BAND_COLORS,
      frequencyLabels: FREQUENCY_LABELS,
      wroteRows: WROTE_ROWS,
      resetQuestion: CONFLICT_QUESTIONS.find((q) => q.id === 'c8')?.text || '',
      overallLabels: CONFLICT_QUESTIONS.find((q) => q.id === 'c0')?.options.map((o) => o.label) || [],
      snapshotRows: SNAPSHOT_ROWS,
      snapshotProse: SNAPSHOT_PROSE,
      openingChips: OPENING_CHIPS,
      noActionNeeded: NO_ACTION_NEEDED,
      copy: CONFLICT_RESULTS_COPY,
    },
  };
}
