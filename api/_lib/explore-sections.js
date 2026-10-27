/**
 * The seven sections the Explore page and every slicer are organised by.
 *
 * ── WHY ───────────────────────────────────────────────────────────────────
 * Ellie: "Row and column organization should be as follows: Section header
 * (with colored row) for: Demographic, Communication Styles, Expectations,
 * Relationship Reflection, Physical Intimacy Expectations, Conflict Patterns,
 * Engagement. Each exercise section should include a high-level section
 * (dimensions, alignment) then a detailed section with one row per question."
 *
 * The field list had sixteen groups in no particular order, built up one
 * exercise at a time, so the row picker was a flat run of optgroups with names
 * like "Ex1 . Understanding (0 = read exactly right)" sitting between two
 * unrelated things. Seven sections in a fixed order, each with a high-level
 * half and a detailed half, is a shape somebody can navigate.
 *
 * ── ONE MAPPING, TWO READERS ──────────────────────────────────────────────
 * The Explore pickers show both halves. The slicers show only the high-level
 * half, which is her instruction too: "This setup should also be used for the
 * slicers, but should not include the every-question rows, only the high-level
 * section for the exercises."
 *
 * So the section and the tier are decided here, on the server, and sent with
 * the field. Deciding it on the page would mean the Explore page and the
 * slicers each carried their own copy of which group is high-level, and the
 * day they disagreed one of them would be offering a cut the other refused.
 *
 * ── A GROUP THAT IS NOT LISTED IS NOT SILENTLY DROPPED ────────────────────
 * It goes to Demographic as a detail row and `unmapped` records it, so a new
 * group turns up in the answer rather than vanishing from the page. A field
 * nobody can find is indistinguishable from a field that was never built.
 */

/** In the order Ellie listed them, which is the order they are drawn. */
export const EXPLORE_SECTIONS = [
  { id: 'demographic', label: 'Demographic', color: '#5C6DDA' },
  { id: 'comms', label: 'Communication Styles', color: '#C55329' },
  { id: 'expectations', label: 'Expectations', color: '#9B5DE5' },
  { id: 'reflection', label: 'Relationship Reflection', color: '#E5578C' },
  { id: 'intimacy', label: 'Physical Intimacy Expectations', color: '#B5546E' },
  { id: 'conflict', label: 'Conflict Patterns', color: '#22A5C4' },
  { id: 'engagement', label: 'Engagement', color: '#34D399' },
];

/**
 * Which section each existing group belongs to, and whether it is high-level.
 *
 * "High-level" means a roll-up: a dimension score, an alignment band, a
 * derived yes or no. "Detail" means one row per question. The split is what
 * lets the slicers offer the first without drowning in the second.
 */
const GROUP_MAP = {
  'Type & axes':                                { section: 'demographic', tier: 'high' },
  'Demographics':                               { section: 'demographic', tier: 'high' },
  'Package & cohort':                           { section: 'demographic', tier: 'high' },
  'Growing up':                                 { section: 'demographic', tier: 'high' },

  'Dimensions (score 1–5)':                     { section: 'comms', tier: 'high' },
  'Ex1 . Understanding (0 = read exactly right)': { section: 'comms', tier: 'high' },
  'Ex1 · Partner-view dimensions (1–5)':        { section: 'comms', tier: 'high' },
  'Ex1 · Communication (1–5)':                  { section: 'comms', tier: 'detail' },
  'Ex1 · Partner-view (1–5)':                   { section: 'comms', tier: 'detail' },

  'Ex2 · Life & values':                        { section: 'expectations', tier: 'detail' },
  'Ex2 · Who does what':                        { section: 'expectations', tier: 'detail' },

  'Ex3 · Relationship Reflection':              { section: 'reflection', tier: 'detail' },

  'Physical Intimacy':                          { section: 'intimacy', tier: 'detail' },

  'Conflict Patterns':                          { section: 'conflict', tier: 'detail' },

  /* The survey is about the experience of using Attune rather than about the
     relationship, so it sits with the other behavioural measures. */
  'Survey':                                     { section: 'engagement', tier: 'high' },
  'Engagement':                                 { section: 'engagement', tier: 'high' },
};

/**
 * Fields that are high-level despite their group being detailed.
 *
 * The four horsemen are derived yes/no roll-ups and belong in the slicer half,
 * but they live in the Conflict Patterns group beside the questions they come
 * from. Matched on the key rather than moved to a group of their own, because
 * a group exists to say where a field is drawn and these are drawn there.
 */
const HIGH_KEYS = /^(horse_|alignment_group$|understanding_group$|intimacy_variant$)/;

/** The section and tier for one field. */
export function placeField(field) {
  const byKey = HIGH_KEYS.test(field.key) ? 'high' : null;
  const m = GROUP_MAP[field.group];
  if (!m) return { section: 'demographic', tier: byKey || 'detail', mapped: false };
  return { section: m.section, tier: byKey || m.tier, mapped: true };
}

/**
 * Place every field, and say which groups were not recognised.
 *
 * The caller gets the list back rather than a log line, so an unmapped group
 * can be reported in the payload and seen, which is the difference between a
 * new exercise appearing in the wrong place and appearing nowhere.
 */
export function placeAll(fields) {
  const unmapped = new Set();
  const out = (fields || []).map((f) => {
    const p = placeField(f);
    if (!p.mapped) unmapped.add(f.group);
    return { ...f, section: p.section, tier: p.tier };
  });
  return { fields: out, unmapped: [...unmapped] };
}
