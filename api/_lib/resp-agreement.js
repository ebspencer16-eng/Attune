/**
 * Whether two people put the same person in charge of a responsibility.
 *
 * ── WHY IT IS A RULE AND NOT A COMPARISON ─────────────────────────────────
 * Plain string equality gets this wrong. The Expectations exercise asks each
 * partner who does a thing, from their own side, so a couple who entirely
 * agree answer "Primarily mine" and "Primarily my partner's". Those two
 * strings are different and the couple are not. Each answer has to be
 * resolved to a SIDE of the couple before the two can be compared, and a
 * partner's copy of the item is stored under a mirrored key.
 *
 * ── WHY IT IS ITS OWN MODULE ──────────────────────────────────────────────
 * api/admin-data.js held it inline, and api/admin-explore.js was about to
 * need it for the high-level Expectations fields. Ellie: "Expectations should
 * have a high-level for 'alignment across categories' that shows avg
 * alignment across each category." Writing this a second time is this
 * codebase's signature failure, and this one would have been invisible: two
 * implementations of "do these two agree" that differ only on the perspective
 * case produce two plausible percentages and nothing says which is right.
 *
 * ── WHAT COUNTS, AND WHAT IS SKIPPED ──────────────────────────────────────
 * An item counts only when BOTH partners resolved to a side. An unanswered
 * item and one either of them marked as not applying are left out of both the
 * numerator and the denominator, so a couple who skipped a category are not
 * recorded as disagreeing about it. That is why every figure here carries its
 * own `n`: a percentage over two items is not the same fact as one over seven.
 */
import { RESPONSIBILITY_CATEGORIES } from '../_questions.js';
import { mirrorRespKey } from './expectations.js';

/**
 * One answer, resolved to a side of the couple.
 *
 * A session partner has no name columns, so the caller derives their names
 * from the other partner: a.partner_name is b's name.
 */
export function resolveSide(v, selfName, partnerName, selfTok, partnerTok) {
  if (v == null || v === '') return null;
  if (v === 'Both of us' || v === 'Balanced') return 'both';
  if (v === "Doesn't apply to us" || v === "Doesn't apply") return 'na';
  if (v === 'Primarily mine' || (selfName && v === selfName)) return selfTok;
  if (v === "Primarily my partner's" || (partnerName && v === partnerName)) return partnerTok;
  return null;
}

/**
 * Every responsibility item for one couple: true when they named the same
 * person, false when they did not, and absent when it could not be counted.
 *
 * @param {object} a  A profile row, with ex2_answers, name and partner_name.
 * @param {object} b  Their partner's row, in the same shape.
 * @returns {{ byItem: Record<string, boolean>, counted: number, agreed: number }}
 */
export function itemAgreement(a, b) {
  const byItem = {};
  let counted = 0, agreed = 0;
  const ra = a?.ex2_answers?.responsibilities;
  const rb = b?.ex2_answers?.responsibilities;
  if (!ra || !rb) return { byItem, counted, agreed };
  const aName = (a.name || '').trim(), aPartner = (a.partner_name || '').trim();
  /* The session partner's names, derived from the other side when absent. */
  const bName = (b.name || '').trim() || aPartner, bPartner = (b.partner_name || '').trim() || aName;
  for (const cat of RESPONSIBILITY_CATEGORIES) {
    for (const item of (cat.items || [])) {
      const key = cat.id + '__' + item;
      const ares = resolveSide(ra[key], aName, aPartner, 'A', 'B');
      const bres = resolveSide(rb[mirrorRespKey(key)], bName, bPartner, 'B', 'A');
      if (ares == null || bres == null || ares === 'na' || bres === 'na') continue;
      counted++;
      const same = ares === bres;
      if (same) agreed++;
      byItem[key] = same;
    }
  }
  return { byItem, counted, agreed };
}

/**
 * The same couple, summarised per category and overall.
 *
 * Every entry carries its `n`, because a category where one item could be
 * counted and a category where seven could are not the same evidence, and a
 * percentage hides that difference completely.
 *
 * @returns {{ byCategory: Record<string, {pct: number|null, n: number}>,
 *             overall: number|null, n: number }}
 */
export function categoryAlignment(a, b) {
  const { byItem } = itemAgreement(a, b);
  const byCategory = {};
  let total = 0, hits = 0;
  for (const cat of RESPONSIBILITY_CATEGORIES) {
    let n = 0, ok = 0;
    for (const item of (cat.items || [])) {
      const v = byItem[cat.id + '__' + item];
      if (v === undefined) continue;
      n++; if (v) ok++;
    }
    byCategory[cat.id] = { pct: n ? Math.round((100 * ok) / n) : null, n };
    total += n; hits += ok;
  }
  return { byCategory, overall: total ? Math.round((100 * hits) / total) : null, n: total };
}
