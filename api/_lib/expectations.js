/**
 * Comparing two people's Expectations answers.
 *
 * ── WHY THIS FILE ─────────────────────────────────────────────────────────
 * Three copies of this already existed and none could be reached by the app:
 * the website built it inside src/App.jsx, /api/admin-data built it again for
 * the aggregate charts, and the workbook generator built it a third time. The
 * app therefore showed nothing at all for the six Expectations sections, which
 * is every package, which is every customer.
 *
 * ── THE MIRROR ────────────────────────────────────────────────────────────
 * The one genuinely difficult thing here. These questions are asked in the
 * first person: who does the cooking is answered "Primarily mine" or
 * "Primarily my partner's". Two people who answer the same way have said the
 * opposite thing, and two who answer oppositely have agreed.
 *
 * So one side has to be flipped before it is read, in the key, which embeds
 * {userName} and {partnerName}, and in the value. Getting that backwards
 * inverts every result while looking entirely plausible, which is why it
 * belongs in one file with one test rather than in four.
 */

import { RESPONSIBILITY_CATEGORIES, LIFE_QUESTIONS, substName } from '../_questions.js';

/**
 * A responsibility key seen from the other side.
 *
 * Both name tokens swap at once, in a single pass. Replacing one and then the
 * other would turn both into the same name, which is why this is a replacer
 * function rather than two chained replaces through a placeholder.
 */
export function mirrorRespKey(key) {
  if (!key) return key;
  return String(key).replace(
    /\{userName\}|\{partnerName\}/g,
    (token) => (token === '{userName}' ? '{partnerName}' : '{userName}'));
}

/** The two life questions that name a side. Everything else is symmetric. */
export function mirrorLifeId(id) {
  if (id === 'lq_involve_user') return 'lq_involve_partner';
  if (id === 'lq_involve_partner') return 'lq_involve_user';
  return id;
}

/**
 * Which person an answer names, as a side rather than a word.
 *
 * Returns null for unanswered and 'na' for "doesn't apply", which are
 * different things: one is missing, and one is a real answer that no
 * comparison should count.
 */
function sideOf(value) {
  if (value == null || value === '') return null;
  if (value === 'Balanced' || value === 'Both of us') return 'both';
  if (value === "Doesn't apply" || value === "Doesn't apply to us") return 'na';
  if (value === 'Primarily mine') return 'self';
  if (value === "Primarily my partner's") return 'other';
  return null;
}

/** An answer as a name the reader will recognise. */
export function normRespValue(value, isSelf, youName, themName) {
  const side = sideOf(value);
  if (side === 'both') return 'Both of us';
  if (side === 'na') return "Doesn't apply";
  if (side === 'self') return isSelf ? youName : themName;
  if (side === 'other') return isSelf ? themName : youName;
  return value;
}

/**
 * Do two answers name the same person?
 *
 * Compared as absolute sides, never as strings. "Primarily mine" from both
 * partners is a disagreement, because each has claimed it. Comparing the
 * strings says they match, and that is the bug this exists to avoid.
 */
export function agrees(yourValue, theirValue) {
  const you = sideOf(yourValue);
  const them = sideOf(theirValue);
  if (you == null || them == null) return null;
  if (you === 'na' || them === 'na') return null;
  if (you === 'both' || them === 'both') return you === them;
  const youMean = you === 'self' ? 'you' : 'them';
  const theyMean = them === 'self' ? 'them' : 'you';
  return youMean === theyMean;
}

/**
 * Every answered pair, in the order the results screens present them.
 *
 * `mine` belongs to whoever is reading. Rows where either side has not
 * answered are dropped rather than shown blank: an expectation only one person
 * has stated is not a comparison.
 */
export function expectationsRows({ mine, theirs, youName = 'You', themName = 'Your partner' }) {
  const you = youName || 'You';
  const them = themName || 'Your partner';

  const respRows = RESPONSIBILITY_CATEGORIES.flatMap((cat, categoryIndex) =>
    cat.items.map((item) => {
      const key = cat.id + '__' + item;
      const rawYours = mine?.responsibilities?.[key];
      const rawTheirs = theirs?.responsibilities?.[mirrorRespKey(key)];
      const aligned = agrees(rawYours, rawTheirs);
      if (aligned === null) return null;
      return {
        key,
        kind: 'responsibility',
        category: cat.label,
        categoryId: cat.id,
        categoryIndex,
        item: substName(item, you, them),
        you: normRespValue(rawYours, true, you, them),
        them: normRespValue(rawTheirs, false, you, them),
        aligned,
      };
    }).filter(Boolean));

  const lifeRows = LIFE_QUESTIONS.map((q) => {
    const rawYours = mine?.life?.[q.id];
    const rawTheirs = theirs?.life?.[mirrorLifeId(q.id)];
    if (!rawYours || !rawTheirs) return null;
    return {
      key: q.id,
      kind: 'life',
      category: q.category,
      categoryId: null,
      categoryIndex: null,
      item: substName(q.text, you, them),
      prompt: q.core || null,
      you: rawYours,
      them: rawTheirs,
      // Life questions are not directional: both answer about the same thing,
      // so the strings compare directly.
      aligned: rawYours === rawTheirs,
    };
  }).filter(Boolean);

  return [...respRows, ...lifeRows];
}

/** The overview numbers, and one bucket per conversation screen. */
export function expectationsSummary({ mine, theirs, youName, themName }) {
  const rows = expectationsRows({ mine, theirs, youName, themName });
  const answered = rows.length;
  const aligned = rows.filter((r) => r.aligned).length;

  const categories = RESPONSIBILITY_CATEGORIES.map((cat, i) => {
    const inCat = rows.filter((r) => r.categoryIndex === i);
    return {
      // The id the app navigates to and notes anchor against.
      section: 'exp-convo-' + i,
      label: cat.label,
      rows: inCat,
      answered: inCat.length,
      aligned: inCat.filter((r) => r.aligned).length,
      differences: inCat.filter((r) => !r.aligned).length,
    };
  });

  return {
    answered,
    aligned,
    differences: answered - aligned,
    alignedPct: answered ? Math.round((aligned / answered) * 100) : null,
    categories,
    life: rows.filter((r) => r.kind === 'life'),
  };
}
