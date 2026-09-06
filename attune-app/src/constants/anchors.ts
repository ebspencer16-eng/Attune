/**
 * What an annotation is attached to, turned into something a person can read.
 *
 * An annotation stores a stable identifier and nothing else: `results_dimension`
 * plus `conflict`, or `expectations_item` plus `finances:groceries`. Useful to
 * the server, meaningless on a screen. Something has to turn that pair into
 * "Conflict Style" and give it the colour of the section it came from.
 *
 * The temptation is a lookup table of every dimension and category, typed out
 * here. That is exactly the failure this project keeps having: a second copy of
 * a list, with nothing checking it against the first.
 *
 * So most of this derives. Standard tags are seeded server-side from the live
 * dimension, expectations and intimacy lists (api/_lib/tags.js), and each one
 * carries a `standard_key` in the same shape as the anchor: `dim:conflict`,
 * `expcat:finances`, `intdim:frequency`. Resolving an anchor is a lookup in the
 * tags the server already sent. Rename a dimension and the label follows on the
 * next reseed, because nothing here knows the old name to be wrong about.
 *
 * Two things cannot derive, and both are honest about it:
 *
 * `RESULTS_SECTIONS` is the results layout, which is a set of screens rather
 * than a set of data. The web's copy is in src/App.jsx. This is the app's, and
 * the results experience will read it from here rather than adding a third.
 *
 * Anything unresolvable falls back to the key itself. A group header reading
 * "Comm inner" is poor, but it still shows the note. Dropping the note because
 * its label could not be found would lose someone's words.
 */

import { Palette, SectionColor } from '@/constants/attune-theme';

/**
 * The results sections, by the ids annotations anchor to.
 *
 * Labels match the web's results nav exactly, so a note written on the site and
 * read in the app names the same place. Ids match the anchor validator in
 * api/_lib/tags.js.
 *
 * Note that `conflict-*` is listed here and is NOT accepted by that validator,
 * so a Conflict Patterns section cannot currently be annotated. Listed anyway:
 * when the server accepts it, this is already right, and until then no note
 * exists to be mislabelled.
 */
export const RESULTS_SECTIONS: Record<string, string> = {
  'highlights': 'Highlights',
  'couple-type': 'Couple Type',
  'comm-overview': 'Communication',
  'comm-inner': 'Internal Processing',
  'comm-connection': 'How You Connect',
  'comm-hard': 'When Things Get Hard',
  'exp-overview': 'Expectations',
  'reflection-overview': 'Relationship Reflection',
  'reflection-ratings': 'How You Each Rated',
  'reflection-story': 'Side by Side',
  'reflection-plan': 'Action Plan',
  'intimacy-overview': 'Physical Intimacy',
  'intimacy-plan': 'Conversations',
  'conflict-overview': 'Conflict Patterns',
  'conflict-snapshot': 'Your Conflict Snapshot',
  'conflict-patterns': 'Your Patterns',
  'conflict-wrote': 'What You Each Wrote',
  'what-comes-next': 'What Comes Next',
};

/** Which section a results id belongs to, for its accent colour. */
function sectionColor(key: string): string | null {
  if (key.startsWith('comm-')) return SectionColor.communication;
  if (key.startsWith('exp-')) return SectionColor.expectations;
  if (key.startsWith('reflection-')) return SectionColor.reflection;
  if (key.startsWith('intimacy-')) return SectionColor.intimacy;
  if (key.startsWith('conflict-')) return SectionColor.conflict;
  return null;
}

/** Last resort: 'comm-inner' becomes 'Comm inner'. Poor, but it shows the note. */
function humanise(key: string): string {
  const words = key.replace(/[:_-]+/g, ' ').trim();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Trim to a length that fits a group header without wrapping to three lines. */
function clip(text: string, max = 64): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length <= max ? flat : `${flat.slice(0, max - 1).trimEnd()}…`;
}

/** What the caller has to hand for resolution. Both may return undefined. */
export type AnchorContext = {
  /** A standard tag by its `standard_key`, from /api/notes?action=tags. */
  tag: (standardKey: string) => { name: string; color: string | null } | undefined;
  /** A post title by its slug, from /api/posts?action=feed. */
  postTitle: (id: string) => string | undefined;
};

export type ResolvedAnchor = {
  /** Annotations sharing this key belong in one group. */
  groupKey: string;
  label: string;
  color: string | null;
};

export type AnchoredNote = {
  anchor_type: string | null;
  anchor_key: string | null;
  anchor_context: string | null;
};

/**
 * Group an annotation by what it is attached to.
 *
 * Grouping is by `groupKey`, not by label, so two things that happen to share a
 * name do not merge. Expectations items group by their category rather than
 * one group per item: a person annotates several lines of Finances and wants
 * them together, not as five headers reading "Finances".
 */
export function resolveAnchor(note: AnchoredNote, ctx: AnchorContext): ResolvedAnchor {
  const type = note.anchor_type;
  const key = note.anchor_key;
  if (!type || !key) return { groupKey: 'none', label: 'Your notes', color: null };

  switch (type) {
    case 'results_dimension': {
      const tag = ctx.tag(`dim:${key}`);
      return {
        groupKey: `results_dimension:${key}`,
        label: tag?.name ?? humanise(key),
        color: tag?.color ?? SectionColor.communication,
      };
    }

    case 'results_section':
      return {
        groupKey: `results_section:${key}`,
        label: RESULTS_SECTIONS[key] ?? humanise(key),
        color: sectionColor(key),
      };

    case 'results_question':
      // The question's wording lives in the version-pinned results, not in the
      // app. The note carries what it said when it was written, which is the
      // better header anyway: it names the question in the person's own view of
      // it rather than a key.
      return {
        groupKey: `results_question:${key}`,
        label: note.anchor_context ? clip(note.anchor_context) : humanise(key),
        color: SectionColor.communication,
      };

    case 'expectations_item': {
      // 'finances:groceries' belongs to the Finances conversation.
      const category = key.split(':')[0];
      const tag = ctx.tag(`expcat:${category}`);
      return {
        groupKey: `expectations_item:${category}`,
        label: tag?.name ?? humanise(category),
        color: tag?.color ?? SectionColor.expectations,
      };
    }

    case 'intimacy_dimension': {
      const tag = ctx.tag(`intdim:${key}`);
      return {
        groupKey: `intimacy_dimension:${key}`,
        label: tag?.name ?? humanise(key),
        color: tag?.color ?? SectionColor.intimacy,
      };
    }

    case 'post': {
      const title = ctx.postTitle(key);
      return { groupKey: `post:${key}`, label: title ?? 'In Practice', color: Palette.clay };
    }

    case 'post_block':
      // A block id does not carry the post it belongs to, so there is no way to
      // name the piece from the note alone. These group together under one
      // header and lean on the quoted wording to say where each came from.
      // Fixing it properly means storing the post with the block on write.
      return { groupKey: 'post_block', label: 'In Practice', color: Palette.clay };

    default:
      return { groupKey: `${type}:${key}`, label: humanise(key), color: null };
  }
}
