/**
 * The four quick tiles on the home screen, and what each one is right now.
 *
 * ── WHY THEY ARE NOT A FIXED LIST ─────────────────────────────────────────
 * Ellie: "for a user who has not completed exercises yet, quick access tiles
 * should have slight adjustments. Action plans should be 'Your exercises' and
 * should take you to your status view on insights tab, then, if user completes
 * exercises and unlocks results, it should change to action plan, but if user
 * finishes and partner still hasn't, it should show action plan but should be
 * slightly greyed out and the icon should be a padlock. For a user who hasn't
 * begun exercises, results highlights should be greyed with the padlock icon."
 *
 * Three states for one tile, and a tile that is locked has to say so rather
 * than opening a page with nothing on it.
 *
 * ── ONE PLACE I WIDENED IT, AND WHY ───────────────────────────────────────
 * She described the highlights tile as locked "for a user who hasn't begun
 * exercises". It is locked here until results are READY, which also covers
 * somebody half way through. There are no highlights until both people have
 * finished: the storycards are built out of the pair. Locking only before the
 * first answer would leave the tile open through the whole middle of the
 * product, opening a page that cannot draw anything.
 *
 * ── WHY PLAIN JAVASCRIPT IN lib ───────────────────────────────────────────
 * The same reason insight-fit.js and card-tints.js are: a rule in a .tsx file
 * cannot be run by a check without lifting it out and stripping its types
 * first, which is how a gate ends up pointed at a copy. check-quick-tiles.mjs
 * imports this and runs it over every state.
 */

/** The label and lock state of each tile, from the home payload. */
export function quickTiles({ exercises = {}, resultsReady = false } = {}) {
  const owned = Object.values(exercises).filter((e) => e && e.owned);
  /* Nothing owned means the payload has not arrived. Treat it as the start:
     an empty object must not read as "finished everything". */
  const mineDone = owned.length > 0 && owned.every((e) => e.mine);

  return [
    { id: 'insight', label: 'Insight of the day', icon: 'brain', locked: false },
    mineDone
      ? {
        id: 'plan',
        label: 'Action\nplans',
        icon: 'signpost',
        section: 'what-comes-next',
        /* Finished, and waiting on the other one. The plan is built from both
           sets of answers, so there is nothing behind this tile yet. */
        locked: !resultsReady,
      }
      : {
        id: 'plan',
        label: 'Your\nexercises',
        icon: 'signpost',
        /* No section: the Insights tab without one is the status table, which
           is the screen she means by "your status view". */
        locked: false,
      },
    {
      id: 'highlights',
      label: 'Results highlights',
      icon: 'sparkles',
      section: 'highlights',
      locked: !resultsReady,
    },
    { id: 'journal', label: 'Relationship journal', icon: 'book.closed', locked: false },
  ];
}
