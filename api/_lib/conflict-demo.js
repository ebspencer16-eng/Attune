// The demo couple's Conflict Patterns, for the showcase and the smoke test.
//
// ── WHY THIS MOVED OUT OF scripts/ ─────────────────────────────────────────
// It was a test fixture, and its header said so at length: two of the conflict
// questions are free text, demo answers appear in the showcase, and that is
// customer copy. So Conflict was the one exercise the showcase could not
// stand up, and its four pages were the only results pages nothing rendered.
//
// Ellie: "Customers never see the showcase, not sure what you're talking
// about. Demo lives in admin. Because of that, demo answers don't need my read
// before they ship." So the reason is gone, and with it the reason to keep two
// demo couples: one here, one in a test script, drifting apart.
//
// One couple, Sarah and James, read by the website's demo path and by the
// render smoke test.
//
// Built from the question registry rather than typed, so it stays complete as
// questions change: isConflictComplete requires every id in CONFLICT_REQUIRED,
// and answers missing one summarise to null and silently show nothing.

import { CONFLICT_QUESTIONS, CONFLICT_REQUIRED } from '../_conflict-questions.js';
import { summarizeConflict } from './conflict-results.js';
import { partnerView } from './conflict-partner-view.js';
import {
  PATTERN_COPY, PATTERN_ACTIONS, PATTERN_NOTES, BAND_COLORS, FREQUENCY_LABELS,
  SNAPSHOT_ROWS, OPENING_CHIPS, CONFLICT_RESULTS_COPY,
  NO_ACTION_NEEDED, WROTE_ROWS,
} from '../_conflict-results-prose.js';

/**
 * The two written answers, one per person.
 *
 * These are the only sentences here that a person wrote rather than the
 * registry produced, and they are the reason this file used to be a fixture.
 * Drafted to Ellie's rules: short, declarative, no hedging, and specific
 * enough to read as something a real couple typed rather than as an example.
 *
 * They show on Conflict Patterns > What you each wrote, labelled by WROTE_ROWS.
 */
const WRITTEN = {
  c9: {
    a: 'We disagreed about money on a Sunday and I said I needed an hour before we kept going. James said fine and meant it. When we came back neither of us was still building a case.',
    b: 'Sarah asked for an hour in the middle of it. I used to hear that as walking out. This time I said yes and we finished the conversation properly that evening.',
  },
  c_grat: {
    a: 'James never brings up something from three years ago to win an argument. Whatever we are talking about is the only thing we are talking about.',
    b: 'Sarah says the actual thing. I do not have to work out what she is really annoyed about, which is most of what used to go wrong.',
  },
};

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
        out[id] = WRITTEN[id]?.[seed === 1 ? 'a' : 'b'] || '';
        break;
    }
  }
  return out;
}

export function conflictDemo() {
  const mine = summarizeConflict(answersFor(1));
  const theirs = summarizeConflict(answersFor(2));
  if (!mine || !theirs) {
    throw new Error(
      'conflict demo is incomplete: summarizeConflict returned null. '
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
      openingChips: OPENING_CHIPS,
      noActionNeeded: NO_ACTION_NEEDED,
      copy: CONFLICT_RESULTS_COPY,
    },
  };
}
