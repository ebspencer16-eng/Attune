// Intimacy Expectations add-on — question data + gap scoring.
//
// Structure mirrors Ex2 (_questions.js): each question has an id, a dimension,
// a topic, and per-variant framing. The variant here is premarital vs married,
// chosen by the FIRST partner to start (see App.jsx wiring), NOT by package.
//
// Answer encoding for gap scoring:
//   Each option has { label, value }. `value` is a position on a 0..1 scale
//   used to compute the gap between partners. `kind` controls comparison:
//     - 'scale'     : compare values directly (|a - b|). Lower = more aligned.
//     - 'selfref'   : self-referential ("mostly me" vs "mostly my partner").
//                     If BOTH partners pick the same side (both "me" or both
//                     "my partner"), that is a CONTRADICTION and scores as a
//                     maximal gap, because they can't both be right. Handled
//                     specially in scoreIntimacyPair below.
//     - 'multi'     : multi-select. Gap = Jaccard distance of the chosen sets.
//   Every question includes a "Prefer not to say" option (value null). Mutual
//   "prefer not to say" is treated as its own state, not as agreement.
//
// This is a SCAFFOLD question set. Final copy is under review; ids are stable
// so answers persist across copy edits.

export const INTIMACY_DIMENSIONS = [
  { id: 'frequency',   label: 'Frequency',        poles: ['Less often', 'More often'] },
  { id: 'initiating',  label: 'Initiating',       poles: ['Waits to be asked', 'Likes to initiate'] },
  { id: 'comfort',     label: 'Comfort & Safety', poles: ['Needs time', 'At ease quickly'] },
  { id: 'communication', label: 'Communication',  poles: ['Would rather show', 'Likes to talk it through'] },
  { id: 'adventure',   label: 'Adventurousness',  poles: ['Prefers the familiar', 'Wants novelty'] },
  { id: 'meaning',     label: 'What It Is For',   poles: ['Release and play', 'Closeness and connection'] },
];

// value: 0..1 directional position; null = prefer not to say
const PNS = { label: 'Prefer not to say', value: null };

export const INTIMACY_QUESTIONS = [
  // ── Frequency ─────────────────────────────────────────────────────────
  {
    id: 'iq_freq_want', dimension: 'frequency', kind: 'scale',
    topic: 'How often feels right',
    premarital: 'How often do you imagine wanting physical intimacy?',
    married: 'How often do you want physical intimacy?',
    options: [
      { label: 'Daily or close to it', value: 1.0 },
      { label: 'Several times a week', value: 0.75 },
      { label: 'About once a week', value: 0.5 },
      { label: 'A few times a month', value: 0.25 },
      { label: 'Less often than that', value: 0.0 },
      PNS,
    ],
  },
  {
    id: 'iq_freq_relative', dimension: 'frequency', kind: 'selfref',
    topic: 'Relative desire',
    premarital: "When your ideal and your partner's don't match, you expect to",
    married: 'Compared to your partner, you tend to',
    // selfref: high = "me more", low = "partner more". Both-high or both-low = contradiction.
    options: [
      { label: 'Want it more often than my partner', value: 1.0, side: 'me' },
      { label: 'Lean slightly higher', value: 0.75, side: 'me' },
      { label: 'Be about the same', value: 0.5, side: 'even' },
      { label: 'Lean slightly lower', value: 0.25, side: 'partner' },
      { label: 'Want it less often than my partner', value: 0.0, side: 'partner' },
      PNS,
    ],
  },
  {
    id: 'iq_freq_meaning', dimension: 'frequency', kind: 'scale',
    topic: 'Frequency as a signal',
    premarital: "How much do you expect frequency to signal the relationship's health?",
    married: 'How much does frequency signal the health of your relationship to you?',
    options: [
      { label: "It's a major signal for me", value: 1.0 },
      { label: 'It matters', value: 0.75 },
      { label: 'Neutral', value: 0.5 },
      { label: "It's not really how I read us", value: 0.25 },
      { label: "I don't connect the two", value: 0.0 },
      PNS,
    ],
  },

  // ── Initiating ────────────────────────────────────────────────────────
  {
    id: 'iq_init_who', dimension: 'initiating', kind: 'selfref',
    topic: 'Who initiates',
    premarital: 'Who do you expect will usually initiate?',
    married: 'Who usually initiates?',
    options: [
      { label: 'Mostly me', value: 1.0, side: 'me' },
      { label: 'Me a bit more', value: 0.75, side: 'me' },
      { label: 'Evenly', value: 0.5, side: 'even' },
      { label: 'My partner a bit more', value: 0.25, side: 'partner' },
      { label: 'Mostly my partner', value: 0.0, side: 'partner' },
      PNS,
    ],
  },
  {
    id: 'iq_init_feel', dimension: 'initiating', kind: 'scale',
    topic: 'Comfort initiating',
    premarital: 'How do you feel about initiating?',
    married: 'How do you feel about initiating?',
    options: [
      { label: 'I like being the one who initiates', value: 1.0 },
      { label: 'Comfortable with it', value: 0.75 },
      { label: 'Neutral', value: 0.5 },
      { label: "I'd rather not be the usual initiator", value: 0.25 },
      { label: 'Initiating is hard for me', value: 0.0 },
      PNS,
    ],
  },
  {
    id: 'iq_init_turndown', dimension: 'initiating', kind: 'scale',
    topic: 'Being turned down',
    premarital: 'When you turn your partner down, you expect to want them to',
    married: 'When you turn your partner down, you want them to',
    options: [
      { label: 'Not take it personally and let it pass', value: 1.0 },
      { label: 'Check in lightly', value: 0.75 },
      { label: 'Read it how they read it', value: 0.5 },
      { label: 'Reassure me it’s okay', value: 0.25 },
      { label: "I'd worry about how it lands", value: 0.0 },
      PNS,
    ],
  },

  // ── Comfort & Safety ──────────────────────────────────────────────────
  {
    id: 'iq_comfort_ease', dimension: 'comfort', kind: 'scale',
    topic: 'Being vulnerable',
    premarital: 'How at ease do you expect to feel being physically vulnerable?',
    married: 'How at ease do you feel being physically vulnerable?',
    options: [
      { label: 'Completely at ease', value: 1.0 },
      { label: 'Mostly', value: 0.75 },
      { label: 'It depends', value: 0.5 },
      { label: 'Takes me time', value: 0.25 },
      { label: 'I find it hard', value: 0.0 },
      PNS,
    ],
  },
  {
    id: 'iq_comfort_safe', dimension: 'comfort', kind: 'multi',
    topic: 'What helps you feel safe',
    premarital: 'What helps you feel safe enough to be open? (select all that are true)',
    married: 'What helps you feel safe enough to be open? (select all that are true)',
    multi: true,
    options: [
      { label: 'Emotional closeness beforehand', value: 'emo' },
      { label: 'Feeling desired', value: 'desired' },
      { label: 'Privacy and no rush', value: 'privacy' },
      { label: 'Talking first', value: 'talk' },
      { label: 'Familiar routine', value: 'routine' },
      { label: 'Their patience if I hesitate', value: 'patience' },
      PNS,
    ],
  },
  {
    id: 'iq_comfort_off', dimension: 'comfort', kind: 'scale',
    topic: 'When something feels off',
    premarital: 'When something feels off in the moment, you expect to',
    married: 'When something feels off in the moment, you',
    options: [
      { label: 'Say so directly', value: 1.0 },
      { label: 'Find a way to signal it', value: 0.75 },
      { label: 'Hope they notice', value: 0.5 },
      { label: 'Push through it', value: 0.25 },
      { label: 'Go quiet', value: 0.0 },
      PNS,
    ],
  },

  // ── Communication ─────────────────────────────────────────────────────
  {
    id: 'iq_comm_open', dimension: 'communication', kind: 'scale',
    topic: 'Talking about intimacy',
    premarital: 'How openly do you expect to be able to talk about intimacy?',
    married: 'How openly can you talk about intimacy?',
    options: [
      { label: 'Very openly', value: 1.0 },
      { label: 'Fairly openly', value: 0.75 },
      { label: 'It depends', value: 0.5 },
      { label: 'With some difficulty', value: 0.25 },
      { label: "It's hard for me to talk about", value: 0.0 },
      PNS,
    ],
  },
  {
    id: 'iq_comm_moment', dimension: 'communication', kind: 'scale',
    topic: 'Saying what you want',
    premarital: 'Saying what you want in the moment',
    married: 'Saying what you want in the moment',
    options: [
      { label: 'Comes easily to me', value: 1.0 },
      { label: 'I can do it', value: 0.75 },
      { label: 'Neutral', value: 0.5 },
      { label: 'I find it awkward', value: 0.25 },
      { label: "I'd rather show than say", value: 0.0 },
      PNS,
    ],
  },
  {
    id: 'iq_comm_debrief', dimension: 'communication', kind: 'scale',
    topic: 'Talking afterward',
    premarital: 'Talking afterward about what worked',
    married: 'Talking afterward about what worked',
    options: [
      { label: 'I want that kind of debrief', value: 1.0 },
      { label: 'Open to it sometimes', value: 0.75 },
      { label: 'Neutral', value: 0.5 },
      { label: "I'd rather not analyze it", value: 0.25 },
      { label: 'It would feel awkward to me', value: 0.0 },
      PNS,
    ],
  },

  // ── Adventurousness ───────────────────────────────────────────────────
  {
    id: 'iq_adv_appetite', dimension: 'adventure', kind: 'scale',
    topic: 'Appetite for novelty',
    premarital: 'Your appetite for trying new things',
    married: 'Your appetite for trying new things',
    options: [
      { label: 'I want a lot of novelty', value: 1.0 },
      { label: 'I lean adventurous', value: 0.75 },
      { label: 'Somewhere in the middle', value: 0.5 },
      { label: 'I lean toward the familiar', value: 0.25 },
      { label: 'I prefer what I know works', value: 0.0 },
      PNS,
    ],
  },
  {
    id: 'iq_adv_suggest', dimension: 'adventure', kind: 'scale',
    topic: 'When a new idea comes up',
    premarital: 'When your partner suggests something new, you expect to',
    married: 'When your partner suggests something new, you',
    options: [
      { label: 'Be eager', value: 1.0 },
      { label: 'Be open', value: 0.75 },
      { label: 'Depend on what it is', value: 0.5 },
      { label: 'Be cautious', value: 0.25 },
      { label: 'Need real reassurance first', value: 0.0 },
      PNS,
    ],
  },
  {
    id: 'iq_adv_balance', dimension: 'adventure', kind: 'scale',
    topic: 'Novelty vs comfort',
    premarital: 'How do you expect novelty and routine to balance over a long marriage?',
    married: 'How do novelty and routine balance for you now?',
    options: [
      { label: 'Keeping it fresh matters a lot to me', value: 1.0 },
      { label: 'It matters somewhat', value: 0.75 },
      { label: 'Neutral', value: 0.5 },
      { label: 'Comfort matters more to me', value: 0.25 },
      { label: 'I value the familiar strongly', value: 0.0 },
      PNS,
    ],
  },

  // ── What It Is For ────────────────────────────────────────────────────
  {
    id: 'iq_mean_for', dimension: 'meaning', kind: 'multi',
    topic: 'What it is primarily about',
    premarital: 'What is physical intimacy primarily about for you? (select up to two)',
    married: 'What is physical intimacy primarily about for you? (select up to two)',
    multi: true, maxSelect: 2,
    options: [
      { label: 'Emotional closeness', value: 'closeness' },
      { label: 'Physical release', value: 'release' },
      { label: 'Play and fun', value: 'play' },
      { label: 'Feeling desired', value: 'desired' },
      { label: 'Reassurance and security', value: 'security' },
      { label: 'Ritual and connection', value: 'ritual' },
      PNS,
    ],
  },
  {
    id: 'iq_mean_disconnect', dimension: 'meaning', kind: 'scale',
    topic: 'When disconnected',
    premarital: "When you're emotionally disconnected, you expect physical intimacy to",
    married: "When you're emotionally disconnected, physical intimacy tends to",
    options: [
      { label: 'Be how we reconnect', value: 1.0 },
      { label: 'Help, usually', value: 0.75 },
      { label: 'Depend on the day', value: 0.5 },
      { label: 'Feel hard until we talk', value: 0.25 },
      { label: 'Be off the table for me', value: 0.0 },
      PNS,
    ],
  },
  {
    id: 'iq_mean_hope', dimension: 'meaning', kind: 'scale',
    topic: 'What you hope it means',
    premarital: 'What do you most hope intimacy will mean in your marriage?',
    married: 'What does intimacy most mean in your marriage now?',
    options: [
      { label: 'A primary way we stay close', value: 1.0 },
      { label: 'One of several ways', value: 0.75 },
      { label: 'Important but not central', value: 0.5 },
      { label: 'Meaningful in its own lane', value: 0.25 },
      { label: "I'm still working that out", value: 0.0 },
      PNS,
    ],
  },
];

// Look up an option object by question id + stored label.
function optByLabel(q, label) {
  return q.options.find(o => o.label === label) || null;
}

// Per-dimension slider positions (0..1) for each partner, for the results
// dimension pages. Averages the scalar (scale + selfref) question values a
// partner gave within each dimension. Multi-select questions have no scalar
// position, so they're skipped. Returns { [dimId]: { mine, theirs } } where
// each is a 0..1 number or null if that partner gave no scalar answers.
export function intimacyDimensionPositions(mineAnswers, theirsAnswers) {
  const out = {};
  for (const d of INTIMACY_DIMENSIONS) {
    const qs = INTIMACY_QUESTIONS.filter(q => q.dimension === d.id && q.kind !== 'multi');
    const avg = (answers) => {
      const vals = [];
      for (const q of qs) {
        const o = answers?.[q.id] != null ? optByLabel(q, answers[q.id]) : null;
        if (o && o.value != null) vals.push(o.value);
      }
      return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    };
    out[d.id] = { mine: avg(mineAnswers), theirs: avg(theirsAnswers) };
  }
  return out;
}

// Compute the gap (0 = aligned, 1 = maximal divergence) for one question.
// Returns { gap, state } where state ∈ 'aligned'|'discuss'|'different'|'unspoken'|'incomplete'.
export function scoreIntimacyPair(q, mineRaw, theirsRaw) {
  // Multi-select: stored as array of values.
  if (q.kind === 'multi') {
    const mine = Array.isArray(mineRaw) ? mineRaw.filter(v => v !== null) : [];
    const theirs = Array.isArray(theirsRaw) ? theirsRaw.filter(v => v !== null) : [];
    const minePNS = Array.isArray(mineRaw) && mineRaw.includes(null);
    const theirsPNS = Array.isArray(theirsRaw) && theirsRaw.includes(null);
    if ((!mine.length && !minePNS) || (!theirs.length && !theirsPNS)) return { gap: null, state: 'incomplete' };
    if (minePNS && theirsPNS) return { gap: null, state: 'unspoken' };
    const setA = new Set(mine), setB = new Set(theirs);
    const inter = [...setA].filter(v => setB.has(v)).length;
    const union = new Set([...mine, ...theirs]).size || 1;
    const gap = 1 - inter / union; // Jaccard distance
    return { gap, state: gapState(gap) };
  }

  // Scalar / self-referential: stored as label string.
  const mo = mineRaw != null ? optByLabel(q, mineRaw) : null;
  const to = theirsRaw != null ? optByLabel(q, theirsRaw) : null;
  if (!mo || !to) return { gap: null, state: 'incomplete' };
  const minePNS = mo.value === null, theirsPNS = to.value === null;
  if (minePNS && theirsPNS) return { gap: null, state: 'unspoken' };
  if (minePNS || theirsPNS) return { gap: null, state: 'incomplete' };

  if (q.kind === 'selfref') {
    // Contradiction: both claim the same non-even side → maximal gap.
    if (mo.side && to.side && mo.side === to.side && mo.side !== 'even') {
      return { gap: 1, state: 'different', contradiction: true };
    }
    // Otherwise: a complementary pair (one "me", one "partner") is ALIGNED.
    // Map both onto a shared axis where agreement means they describe the
    // same split. mine "me-high" (1.0) + theirs "partner-low" (0.0) = same
    // reality → gap should be ~0. So compare mine.value to (1 - theirs.value).
    const gap = Math.abs(mo.value - (1 - to.value));
    return { gap, state: gapState(gap) };
  }

  // Plain scale.
  const gap = Math.abs(mo.value - to.value);
  return { gap, state: gapState(gap) };
}

function gapState(gap) {
  if (gap == null) return 'incomplete';
  if (gap <= 0.2) return 'aligned';
  if (gap <= 0.5) return 'discuss';
  return 'different';
}

// Roll up per-dimension and overall alignment for a completed pair.
export function summarizeIntimacy(mineAnswers, theirsAnswers) {
  const perDim = {};
  for (const d of INTIMACY_DIMENSIONS) perDim[d.id] = { gaps: [], states: [] };
  const rows = [];
  for (const q of INTIMACY_QUESTIONS) {
    const r = scoreIntimacyPair(q, mineAnswers?.[q.id], theirsAnswers?.[q.id]);
    rows.push({ id: q.id, dimension: q.dimension, ...r });
    if (r.gap != null) {
      perDim[q.dimension].gaps.push(r.gap);
      perDim[q.dimension].states.push(r.state);
    }
  }
  const dimSummary = INTIMACY_DIMENSIONS.map(d => {
    const g = perDim[d.id].gaps;
    const avg = g.length ? g.reduce((a, b) => a + b, 0) / g.length : null;
    return { id: d.id, label: d.label, avgGap: avg, state: avg == null ? 'unspoken' : gapState(avg) };
  });
  const allGaps = rows.filter(r => r.gap != null).map(r => r.gap);
  const overall = allGaps.length ? allGaps.reduce((a, b) => a + b, 0) / allGaps.length : null;
  return { rows, dimSummary, overall, overallState: overall == null ? 'unspoken' : gapState(overall) };
}
