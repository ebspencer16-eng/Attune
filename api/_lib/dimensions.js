/**
 * The ten communication dimensions: their order, their names and their poles.
 *
 * ── WHY ITS OWN MODULE ────────────────────────────────────────────────────
 * These were in api/_workbook-content.js, which imports the workbook prose and
 * is copied into the workbook's own container. Four places in the admin needed
 * the names and none of them could reach them without dragging that in, which
 * is the trap this repo already recorded once: pointing one module at another
 * can change what a container needs. So the names live here, in a file with no
 * imports at all, and _workbook-content.js re-exports them. One
 * implementation, nothing new in the image.
 *
 * ── WHAT WENT WRONG WITHOUT IT ────────────────────────────────────────────
 * Four copies of these labels existed in the admin and they disagreed about
 * both the words and the set. api/admin-explore.js had a map with `stress`,
 * which is not a dimension, and no `reassurance`, which is, so that field fell
 * through to its own key and Ellie read a row called "reassurance" in lower
 * case among nine capitalised ones. public/admin.html had a seed array with
 * the same two faults, a PRETTY map, and an LBL map with its own wording. Four
 * answers to what the product calls a thing.
 *
 * The names here are the product's own: they are what the results pages and
 * the workbook have always printed, and they are Ellie's copy.
 */

export const DIMS = ['energy','expression','reassurance','needs','bids','conflict','repair','listening','love','feedback'];

export const DIM_META = {
  energy:      { label: 'Energy & Recharge',              left: 'Inward',     right: 'Outward',    color: '9B5DE5' },
  expression:  { label: 'Emotional Expression',           left: 'Internal',   right: 'External',   color: '9B5DE5' },
  reassurance: { label: 'Reassurance',                    left: 'Voiced',     right: 'Assumed',    color: '9B5DE5' },
  needs:       { label: 'Communicating Needs',            left: 'Direct',     right: 'Indirect',   color: 'E8673A' },
  bids:        { label: 'Bids for Connection',            left: 'Subtle',     right: 'Expressive', color: 'E8673A' },
  conflict:    { label: 'Conflict Style',                 left: 'Engage',     right: 'Withdraw',   color: '1B5FE8' },
  repair:      { label: 'Repairing',                      left: 'Formal',     right: 'Informal',   color: '1B5FE8' },
  listening:   { label: 'Listening',                      left: 'Reflective', right: 'Responsive', color: 'E8673A' },
  love:        { label: 'Emotional Intimacy',             left: 'Words',      right: 'Actions',    color: 'E8673A' },
  feedback:    { label: 'Feedback',  left: 'Guarded',    right: 'Open',       color: '1B5FE8' },
};

/**
 * The ends of each dimension's slider, in the longer wording the admin uses.
 *
 * ── WHY THESE ARE NOT `left` AND `right` ──────────────────────────────────
 * DIM_META's left and right are the axis ends the workbook and the results
 * pages print, and they are terse by design: "Inward" against "Outward". The
 * admin's sliders carry a fuller phrase, "Independent" against "Togetherness",
 * which reads better when ten of them are stacked with no question above. Two
 * registers of the same idea, both of them Ellie's copy, so neither is
 * rewritten here.
 *
 * ── WHAT WAS WRONG WITH THEM ──────────────────────────────────────────────
 * They were a map inside api/admin-explore.js with exactly the two faults its
 * label map had, made independently: a `stress` entry, which has not been a
 * dimension for a long time, and no `reassurance`, which is one. Every caller
 * reads `(DIM_POLES[dim] || [])[0]`, so the Reassurance slider fell back to
 * "1 · low" and "5 · high" while the other nine named their ends.
 *
 * Reassurance takes DIM_META's own pair, "Voiced" and "Assumed", rather than a
 * phrase invented here. It is the only row in the short register, so it will
 * read tighter than its neighbours until Ellie writes a longer pair; that is a
 * copy gap, named, not something to fill in by guessing at her voice.
 */
export const DIM_SCALE_POLES = {
  energy:      ['Independent', 'Togetherness'],
  expression:  ['Keeps it in', 'Shares openly'],
  reassurance: [DIM_META.reassurance.left, DIM_META.reassurance.right],
  love:        ['Words', 'Acts & presence'],
  listening:   ['Sits with it', 'Engages & reflects'],
  bids:        ["Doesn't track bids", 'Small moments matter'],
  needs:       ['Names needs directly', 'Wants to be noticed'],
  conflict:    ['Address right away', 'Needs space first'],
  repair:      ['Repairs quickly', 'Repairs when ready'],
  feedback:    ['Gentle approach', 'Direct & specific'],
};

/* Both maps are about the same ten dimensions, so they are held to the same
   ten at load time rather than by a comment saying they agree. This is the
   check that would have caught `stress` and the missing `reassurance` the day
   either was written. */
for (const k of Object.keys(DIM_META)) {
  if (!DIM_SCALE_POLES[k]) throw new Error(`DIM_SCALE_POLES is missing ${k}`);
}
for (const k of Object.keys(DIM_SCALE_POLES)) {
  if (!DIM_META[k]) throw new Error(`DIM_SCALE_POLES names ${k}, which is not a dimension`);
}
