/**
 * An In Practice article chosen from what somebody has left notes on (A245).
 *
 * Ellie: "I want it always showing 2. If I've done everything, it can prompt
 * me to revisit something, it could suggest an article based on what I've
 * left notes about, or something helpful."
 *
 * A note is anchored to a part of the results. That part belongs to one
 * exercise, and each exercise points at one shelf of In Practice: Conflict
 * Patterns at the conflict shelf, Relationship Reflection at the experience
 * shelf, the rest at understanding. The exercise with the most notes picks
 * the shelf; the day picks the article on it, so it holds still for a day and
 * moves on the next. The shelf for each exercise is a placeholder of mine,
 * listed in TASKS.md under A245 for Ellie.
 *
 * Nothing here reads a note's words. The home screen is somewhere other
 * people glance at, and the anchor is all this needs.
 */
import { IN_PRACTICE } from '../_in-practice.js';
import { resultsNav } from './results-sections.js';

/** Which shelf each exercise's notes point at. */
export const SHELF_FOR_GROUP = {
  comm: 'understanding',
  exp: 'understanding',
  'couple-type': 'understanding',
  intimacy: 'understanding',
  reflection: 'experience',
  conflict: 'conflict',
};

/* Every section id the results have, to the group it sits under. */
const GROUP_OF = (() => {
  const map = new Map();
  for (const g of resultsNav({ hasReflection: true, intimacyReady: true, conflictListed: true })) {
    map.set(g.id, g.id);
    for (const c of g.children || []) map.set(c.id, g.id);
  }
  return map;
})();

/** The results group a note is about, or null for a note that is not on the results. */
export function groupForAnchor(type, key) {
  if (!type || !key) return null;
  if (type === 'expectations_item') return 'exp';
  if (type === 'intimacy_dimension') return 'intimacy';
  if (type === 'results_dimension') return 'comm';
  if (type === 'results_section' || type === 'results_question') {
    if (GROUP_OF.has(key)) return GROUP_OF.get(key);
    const prefix = String(key).split('-')[0];
    return GROUP_OF.has(prefix) ? prefix : null;
  }
  return null;
}

/**
 * The article, or null when their notes point nowhere.
 * `anchors` is [{ anchor_type, anchor_key }]; `day` is the reader's day number.
 */
export function articleForNotes(anchors, day = 0) {
  const counts = new Map();
  for (const a of Array.isArray(anchors) ? anchors : []) {
    const g = groupForAnchor(a?.anchor_type, a?.anchor_key);
    if (g && SHELF_FOR_GROUP[g]) counts.set(g, (counts.get(g) || 0) + 1);
  }
  if (!counts.size) return null;
  const group = [...counts.entries()].sort((x, y) => y[1] - x[1])[0][0];
  const shelf = IN_PRACTICE.filter((p) => p.category === SHELF_FOR_GROUP[group]);
  if (!shelf.length) return null;
  const n = shelf.length;
  const p = shelf[((Math.floor(day) % n) + n) % n];
  return { slug: p.slug, title: p.title, path: p.path, group };
}
