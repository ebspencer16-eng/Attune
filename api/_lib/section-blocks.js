/**
 * What each results section is made of, in order.
 *
 * ── WHY THIS EXISTS ───────────────────────────────────────────────────────
 * The website's results are React DOM inside a 15,700-line src/App.jsx. The
 * app's are React Native in attune-app/src/components/results.tsx. They cannot
 * share render code, and everything they do share is data: /api/results and
 * the dozen modules behind it.
 *
 * So content fixes propagate and layout decisions do not. Every judgement
 * about what a page contains and in what order has had to be made twice, by
 * hand, with nothing checking the two agreed. The couple type page drifted
 * three separate times: the app opened with a card the website does not have,
 * drew a map the website captions and the app did not, and carried a legend
 * the website never had. Each was found by someone looking at both screens.
 *
 * This is the thing they can share. Not markup, not styles: the inventory.
 * For each section, which blocks it contains and in what order. A block is a
 * named idea, not a component. Both surfaces decide how a `map` looks; neither
 * gets to decide whether couple-type has one.
 *
 * ── WHAT A BLOCK IS ───────────────────────────────────────────────────────
 * A block name is the smallest thing a reader would notice missing. If a
 * surface can drop it without the page looking wrong, it is styling and does
 * not belong here. If dropping it means a reader is not told something, it is
 * a block.
 *
 * `optional: true` means the block appears only when the payload carries it.
 * That is different from a surface choosing not to draw it, which is what this
 * file exists to prevent.
 *
 * ── HOW THIS IS ENFORCED ──────────────────────────────────────────────────
 * check-section-blocks.mjs reads this file and both renderers and fails when a
 * surface is missing a block the spec lists, or draws one it does not. Each
 * renderer marks its blocks with a comment so the check can find them:
 *
 *     // block: couple-type/map
 *
 * A marker is cheap and honest. Inferring which JSX corresponds to which idea
 * is neither.
 */

/**
 * ── WHERE THE INVENTORY COMES FROM ────────────────────────────────────────
 * From the website's page, block by block. Not from what both surfaces happen
 * to already draw.
 *
 * This file was first written the second way, and it is the reason a page that
 * passed the gate still read wrong. Two blocks the website had shown all along,
 * the axis descriptions and the individual type panel, were absent from the app
 * and therefore absent from the spec, so the check could not see them: it was
 * comparing the two surfaces against their own agreement rather than against
 * the product. An inventory taken from the intersection can only ever certify
 * that neither side has changed.
 *
 * When you adopt a section, read the website's render top to bottom and list
 * what it draws. The failures that follow are the work.
 */

/** @typedef {{ id: string, optional?: boolean, note?: string }} Block */

/**
 * ── ADOPTED, AND ENFORCED ─────────────────────────────────────────────────
 * Only what both renderers have actually been marked up for. The gate is hard,
 * so this list is exactly as long as the work that is done.
 *
 * Grow it one section at a time. Adding a section here fails the build until
 * both surfaces mark their blocks, which is the point: the spec cannot claim
 * agreement that does not exist. See PLANNED below for the queue.
 */
/** @type {Record<string, Block[]>} */
/**
 * Sections whose block ORDER is enforced, not just their presence.
 *
 * ── WHY THIS IS OPT-IN ────────────────────────────────────────────────────
 * Order was deliberately not checked when this file was written, on the
 * reasoning that two surfaces legitimately stack things differently on a
 * phone. That reasoning was wrong for the section it mattered most on. The
 * website's couple type page opens on what the responses uncover, then the
 * map, and only names the type further down. The app opened on the type name.
 * Both surfaces claimed all six blocks, the gate passed, and the page still
 * read as a different page.
 *
 * A checker that ignores the thing that is wrong is worse than no checker,
 * because it certifies the drift.
 *
 * It stays opt-in because order is inferred from where the markers sit in the
 * source, which is only a fair proxy when a section's blocks are marked inline
 * and linearly. Turn it on for a section once you have checked that they are.
 */
export const ORDER_ENFORCED = new Set([
  'couple-type',
  'comm-overview',
  'comm-domain',
  'intimacy-overview',
  'intimacy-dimension',
  'exp-overview',
  'exp-conversation',
  'what-comes-next',
  // highlights is deliberately out. The website defines its watermark helper
  // above the cards array that uses it, so marker position there is
  // declaration order rather than reading order, and the two surfaces would be
  // reported as disagreeing about a sequence neither of them disagrees about.
  // reflection-overview is deliberately out. The website draws its ratings,
  // action plan and admiration on one page; the app's nav gives the action
  // plan a screen of its own, so the marker further down the file is a
  // different screen rather than a later part of the same one. File position
  // is not a fair proxy there, and a check that pretended otherwise would
  // report drift that is not drift, which is how a gate loses its credibility.
]);

export const SECTION_BLOCKS = {
  // Split deliberately. `groups` is on both surfaces and is enforced;
  // `keep-growing` is in PLANNED because the app cannot draw it yet. The unit
  // of adoption is a block, not a page, so a section can be half adopted
  // rather than waiting for its slowest block.
  'what-comes-next': [
    { id: 'groups', note: 'The grouped next steps.' },
  ],

  'intimacy-dimension': [
    { id: 'state', note: 'Where the two of you land on this one.' },
    { id: 'prompt', optional: true, note: 'Something to ask each other.' },
    { id: 'questions', note: 'The questions behind it, both positions.' },
  ],

  'exp-conversation': [
    { id: 'questions', note: 'The questions in this category, both answers side by side.' },
  ],

  'intimacy-overview': [
    { id: 'where-you-each-land', note: 'Every dimension in one panel.' },
    { id: 'action-plan', note: 'The conversations worth having.' },
  ],

  'exp-overview': [
    { id: 'by-category', note: 'Each category with its alignment.' },
    { id: 'conversations', note: 'The categories worth talking about.' },
  ],

  'reflection-overview': [
    { id: 'admired', optional: true, note: 'What you each admire, and whether it matched.' },
    { id: 'ratings', note: 'How you each feel right now.' },
    { id: 'action-plan', note: 'What you each said you would work on.' },
  ],

  'comm-domain': [
    { id: 'dimensions', note: 'Every dimension in this domain, both partners.' },
    { id: 'action-tile', note: 'The domain\'s one instruction, labelled "One thing to try".' },
  ],

  /**
   * Storycards drifted three times on presentation while every field was
   * drawn, so these blocks are about how the reel is built rather than what it
   * contains. The values that drifted, the ratio and the stripe and the two
   * lines at the foot of each card, are shared data now: both surfaces read
   * api/_lib/storycard-style.js, so no gate is needed for those. What data
   * cannot carry is where a thing sits, and that is what these mark.
   */
  highlights: [
    { id: 'storycards', note: 'The nine cards, swipeable, in the order the server sends.' },
    { id: 'stripe', note: "The opener's top edge, from STRIPE." },
    { id: 'progress', note: 'Where you are in the sequence. Above the card, in the couple\u2019s colour.' },
    { id: 'controls', note: 'Previous and next. Swiping back through nine cards is a chore.' },
    { id: 'watermark', note: 'The site address on every card, so a screenshot says where it came from.' },
  ],









  'comm-overview': [
    { id: 'couple-type-lead', note: 'The type, restated as the lead of the panel.' },
    { id: 'where-you-each-land', note: 'Every dimension, both partners, one panel.' },
    { id: 'action-tiles', note: 'One per domain. No label: the domain is named above.' },
    { id: 'protocols', optional: true, note: 'Up to three things to try this week.' },
  ],

  'couple-type': [
    { id: 'lead', note: 'The page\u2019s opening line: what the responses uncover.' },
    { id: 'map', note: 'Where each partner sits on the two axes.' },
    { id: 'axes', note: 'What each axis means, both poles. Without it the map is a picture.' },
    { id: 'individual-types', note: 'Each partner alone: their type, a blurb, a bar per axis.' },
    { id: 'name', note: 'The type name and its tagline.' },
    { id: 'description', note: 'What this pairing is like.' },
    { id: 'strengths', optional: true, note: 'What comes naturally.' },
    { id: 'sticking-points', optional: true, note: "What's worth being aware of." },
    { id: 'tips', optional: true, note: 'Phrase to try.' },
  ],

};

/**
 * ── THE QUEUE, NOT YET ENFORCED ───────────────────────────────────────────
 * Written down so the intent survives, deliberately not checked. Moving a
 * section from here into SECTION_BLOCKS is the act of adopting it, and it will
 * fail the build until both renderers carry the markers. That failure is the
 * work, not an obstacle to it.
 *
 * Do not "adopt" a section by adding it here and marking only one surface.
 * A spec that lists agreement nobody has is worse than no spec.
 */
/** @type {Record<string, Block[]>} */
export const PLANNED = {

  // Neither surface shows an overall figure any more: the summary sentence on
  // every glance was removed deliberately, because it restated what the rows
  // underneath already show.






  /**
   * The app has no Keep growing block at all. The website's needs the
   * catalogue and the owned list, which arrive on /api/home rather than
   * /api/results, so the app cannot draw it without that data being plumbed
   * into the results screen. That is the work; it is not done, so this is not
   * claimed as agreed.
   */
  'what-comes-next': [
    { id: 'keep-growing', note: 'What they do not own yet, and nothing they do.' },
  ],

};

/** Every block id in the spec, for a checker that wants a flat list. */
export function allBlocks() {
  return Object.entries(SECTION_BLOCKS).flatMap(
    ([section, blocks]) => blocks.map((b) => ({ section, ...b })),
  );
}

/** The marker a renderer writes so the checker can find a block. */
export function marker(section, block) {
  return `block: ${section}/${block}`;
}
