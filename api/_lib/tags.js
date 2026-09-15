/**
 * The names the product knows, and the tags a person is offered.
 *
 * ── WHAT CHANGED, AND WHY ─────────────────────────────────────────────────
 * These used to be written into every person's tag list the first time they
 * opened Notes: twenty-one rows they never asked for. Ellie: "I don't like our
 * default tags." They are no longer rows. They are sent as reference data
 * beside the person's own tags, because they were always doing two jobs and
 * only one of them was being a tag.
 *
 * The other job is the dictionary. An annotation stores `dim:conflict` and
 * nothing else, and something has to turn that into "Conflict Style" with the
 * right colour. That is what this is now, and it is better for the change:
 * the label is derived at request time from the live lists instead of frozen
 * into a row on the day someone first opened a screen.
 *
 * Derived from the live dimension and category lists rather than typed out, so
 * a renamed dimension or a new expectations category cannot leave the labels
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
import { isResultsSection } from './results-sections.js';

/** Colours match the results domains, so a tag looks like where it came from. */
/** Domain display names, matching the results nav on the web. */
export const DOMAIN_LABEL = {
  inner: 'Internal Processing',
  connection: 'How You Connect',
  hard: 'When Things Get Hard',
};

export const DOMAIN_COLOR = {
  inner: '#9B5DE5',
  connection: '#E8673A',
  hard: '#1B5FE8',
};


/**
 * Which of the three Communication domains a dimension belongs to.
 *
 * Exported because the results screens group by it too. It was private here,
 * so the only other way to group dimensions was to write the mapping out a
 * second time.
 */
export const DOMAIN_OF = {
  energy: 'inner', expression: 'inner', reassurance: 'inner',
  love: 'connection', needs: 'connection', bids: 'connection', listening: 'connection',
  conflict: 'hard', repair: 'hard', feedback: 'hard',
};

/**
 * The three Communication domains, in the order results present them.
 *
 * Derived from the two maps above rather than listed again. src/App.jsx built
 * this list a fourth time as UR_DOMAINS, with its own labels and colours, and
 * the results nav on both surfaces is built from it.
 */
export const COMM_DOMAINS = ['inner', 'connection', 'hard'].map((id) => ({
  id,
  label: DOMAIN_LABEL[id],
  color: DOMAIN_COLOR[id],
  dims: Object.keys(DOMAIN_OF).filter((d) => DOMAIN_OF[d] === id),
}));

/**
 * The tags offered under the "add a tag" field.
 *
 * Ellie: "Just have a spot for people to 'add a tag' then they see their own
 * list. Maybe we could have a line with some suggestions ie. communicating
 * needs, love, etc." These two are hers, quoted from that line.
 *
 * The other three are mine. Ellie: "you write and I'll review once live",
 * which is the same order Carolina reads copy in, so they ship and she edits
 * this line rather than the line waiting on her.
 *
 * ── WHY THESE THREE ───────────────────────────────────────────────────────
 * A suggestion has one job: to show what size of thing a tag is, so the next
 * one a person types is theirs rather than a guess at the product's
 * vocabulary. So they are short, lower case, and about a life rather than
 * about results. Money, family and time together are the three subjects that
 * come up in every section of this product: they are what the expectations
 * categories, the reflection answers and half the conflict openings are
 * actually about, said the way a person would say them.
 *
 * Deliberately not the names of dimensions, categories or couple types. Those
 * are exactly the twenty-one tags that were seeded and that Ellie asked to be
 * rid of, and offering them back as suggestions would be the same list with a
 * tap in front of it.
 *
 * Here rather than in the app so both surfaces offer the same words, and so
 * changing them is one edit.
 */
export const TAG_SUGGESTIONS = [
  'communicating needs',
  'love',
  'money',
  'family',
  'time together',
];

/**
 * The add field's own placeholder.
 *
 * Ellie: "let's remove the pill examples underneath and instead have the 'add
 * a tag' text in the write in box read 'add a tag (ie. communicating needs,
 * showing love, family)' or something along those lines that fits in the bar."
 *
 * The first three of the five, because five do not fit a phone's field and a
 * placeholder that runs off the end says less than three that do not. Built
 * from the same list rather than typed again, which means the order of that
 * list decides which three appear: move one up to put it in the field.
 */
export const TAG_PLACEHOLDER = `Add a tag (ie. ${TAG_SUGGESTIONS.slice(0, 3).join(', ')})`;

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
      // Was a regex written before Conflict Patterns shipped, which refused
      // every conflict-* section outright: annotating one returned "invalid
      // anchor" and the note was simply never saved. The list is now shared
      // with the results UI rather than described twice.
      return isResultsSection(key);
    case 'results_question':
      return Object.values(DIM_KEYS).flat().includes(key);
    case 'expectations_item':
      return RESPONSIBILITY_CATEGORIES.some(c => key.startsWith(c.id + ':'));
    case 'intimacy_dimension':
      return INTIMACY_DIMENSIONS.some(d => d.id === key);
    case 'post':
      return key.length > 0 && key.length <= 200;

    case 'post_block': {
      // 'post-slug#block-id', both halves required.
      //
      // A block id is stable but only unique within its post, and stored alone
      // it does not say which post that is. So a highlight could never name the
      // piece it came from: the Notes screen had to group every In Practice
      // highlight under one anonymous heading and hope the quoted text was
      // enough. Carrying the post id with it is what makes a highlight
      // resolvable back to the thing it highlights.
      if (key.length > 200) return false;
      const parts = key.split('#');
      return parts.length === 2 && !!parts[0] && !!parts[1];
    }
    default:
      return false;
  }
}
