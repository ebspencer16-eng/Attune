/**
 * The standard tags each person starts with.
 *
 * Derived from the live dimension and category lists rather than typed out, so
 * a renamed dimension or a new expectations category cannot leave the tag list
 * stale. That drift is not hypothetical: admin-data carried a dimension map
 * that was wrong for weeks because it restated the list instead of reading it.
 *
 * standard_key is the join back to the product: 'dim:conflict' is the tag for
 * Conflict Style. Renaming the dimension changes the tag's label on the next
 * reseed without creating a duplicate, because the key is stable and the name
 * is not.
 *
 * Intimacy tags are only seeded for people who own that exercise; tagging
 * something you cannot see is noise.
 */

import { DIM_META } from '../_workbook-content.js';
import { DIM_KEYS } from '../_type-engine.js';
import { RESPONSIBILITY_CATEGORIES } from '../_questions.js';
import { INTIMACY_DIMENSIONS } from '../_intimacy-questions.js';

/** Colours match the results domains, so a tag looks like where it came from. */
const DOMAIN_COLOR = {
  inner: '#9B5DE5',
  connection: '#E8673A',
  hard: '#1B5FE8',
};
const DOMAIN_OF = {
  energy: 'inner', expression: 'inner', reassurance: 'inner',
  love: 'connection', needs: 'connection', bids: 'connection', listening: 'connection',
  conflict: 'hard', repair: 'hard', feedback: 'hard',
};

export function standardTags({ ownsIntimacy = false } = {}) {
  const tags = [];

  for (const dim of Object.keys(DIM_KEYS)) {
    tags.push({
      standard_key: `dim:${dim}`,
      name: DIM_META[dim]?.label || dim,
      color: DOMAIN_COLOR[DOMAIN_OF[dim]] || null,
      group: 'Communication',
    });
  }

  for (const cat of RESPONSIBILITY_CATEGORIES) {
    tags.push({
      standard_key: `expcat:${cat.id}`,
      name: cat.label,
      color: cat.color || '#1B5FE8',
      group: 'Expectations',
    });
  }

  if (ownsIntimacy) {
    for (const d of INTIMACY_DIMENSIONS) {
      tags.push({
        standard_key: `intdim:${d.id}`,
        name: d.label,
        color: '#B5546E',
        group: 'Physical Intimacy',
      });
    }
  }

  return tags;
}

/**
 * What to write when reseeding. Existing standard tags are updated in place by
 * standard_key so a renamed dimension does not create a second tag, and a tag
 * the person hid or renamed themselves is left alone.
 */
export function reseedPlan(existing, { ownsIntimacy = false } = {}) {
  const byKey = new Map((existing || []).filter(t => t.standard_key).map(t => [t.standard_key, t]));
  const wanted = standardTags({ ownsIntimacy });
  const insert = [], update = [];

  for (const t of wanted) {
    const found = byKey.get(t.standard_key);
    if (!found) { insert.push(t); continue; }
    // Respect a person's own edits: only fix the name if they never touched it.
    if (found.name !== t.name && !found.renamed) update.push({ id: found.id, name: t.name });
  }
  return { insert, update };
}

/**
 * Is this a valid anchor for an annotation?
 *
 * Checked on write, because a bad anchor is invisible until someone opens the
 * note months later and it points at nothing.
 */
export function isValidAnchor(type, key) {
  if (!type && !key) return true; // a standalone note
  if (!type || !key) return false;
  switch (type) {
    case 'results_dimension':
      return Object.keys(DIM_KEYS).includes(key);
    case 'results_section':
      return /^(highlights|couple-type|comm-(overview|inner|connection|hard)|exp-(overview|convo-\d+)|reflection-[a-z]+|intimacy-[a-z]+|what-comes-next)$/.test(key);
    case 'results_question':
      return Object.values(DIM_KEYS).flat().includes(key);
    case 'expectations_item':
      return RESPONSIBILITY_CATEGORIES.some(c => key.startsWith(c.id + ':'));
    case 'intimacy_dimension':
      return INTIMACY_DIMENSIONS.some(d => d.id === key);
    case 'post':
    case 'post_block':
      return key.length > 0 && key.length <= 200;
    default:
      return false;
  }
}
