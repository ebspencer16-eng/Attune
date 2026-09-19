/**
 * What Comes Next: everything the results actually ask the couple to do.
 *
 * ── WHY THIS IS ASSEMBLED AND NOT WRITTEN ─────────────────────────────────
 * The website builds this page by reaching into every section it has already
 * rendered. Doing the same on the server would mean a second copy of every one
 * of those derivations, which is how this codebase gets its bugs.
 *
 * So this takes the finished section payloads as arguments. Every group here
 * is something the reader has already seen in context; this page is where they
 * are collected, in the order they are worth doing. Nothing new is asserted
 * about the couple, because a closing page that introduces a fresh claim is a
 * claim nothing else in the results supports.
 *
 * Groups with nothing in them are left out rather than filled with
 * encouragement.
 */

import { COUPLE_TYPES } from '../_couple-types.js';
import { summarizeConflict } from './conflict-results.js';
import { PATTERN_ACTIONS } from '../_conflict-results-prose.js';

export function whatComesNext({ coupleTypeId, commsPlan, expectations, intimacy, reflection, reflectionPlan, conflictReady, conflictAnswers, names }) {
  const groups = [];
  const you = names?.you || 'You';
  const them = names?.them || 'your partner';

  // 1. The couple type's own tips. First because they are about the dynamic
  //    everything else sits inside.
  const type = COUPLE_TYPES.find((t) => t.id === coupleTypeId);
  if (type?.tips?.length) {
    groups.push({
      id: 'couple-type',
      color: '#9B5DE5',
      label: 'Couple type',
      section: 'couple-type',
      items: type.tips.slice(0, 3).map((t) => ({
        title: t.title,
        body: t.body || null,
        // The sentence to actually say. On a page of advice this is the only
        // part that survives contact with a real evening.
        say: t.phraseTry || null,
      })),
    });
  }

  /**
   * 2. Communication, as the at-a-glance page's own action plan.
   *
   * ── WHY NOT THE PROTOCOLS ─────────────────────────────────────────────
   * This page collected commsProtocols while the Communication at-a-glance
   * page draws commsActionPlan, so the same couple was given two different
   * lists of things to do about communication depending on which page they
   * were on. Ellie: "Comms action items on what comes next page are different
   * from and need to match the action plan from comms at a glance. Please
   * ensure that each section in the what comes next page's action plan matches
   * the action plan from each section's at a glance page."
   *
   * That is the rule this whole page is supposed to follow: nothing here is a
   * new claim, every group is what the reader already met in context. The
   * tiles are that, so the tiles are what it takes.
   */
  /**
   * ── ONLY THE DOMAINS THAT ASK FOR SOMETHING ────────────────────────────
   * Ellie: "There are no action items for internal processing and how you
   * connect for me and preston. If this is the case, my communication top line
   * should say 1 item not 3 items and it should only show the applicable row
   * (when things get hard)."
   *
   * A tile exists for all three domains whether or not there is anything to do
   * in one: an aligned domain gets DOMAIN_ALIGNED's title and body, and a
   * domain with neither gets a tile with nothing in it. This page counted all
   * three, so a couple with one thing to work on was told they had three and
   * shown two blank rows.
   *
   * The count is the rows, so filtering the rows fixes both.
   */
  const commTiles = (commsPlan?.tiles || []).filter((t) => (t.title || t.label) && t.body);
  if (commTiles.length) {
    groups.push({
      id: 'comm',
      color: '#E8673A',
      label: 'Communication',
      section: 'comm-overview',
      items: commTiles.map((tile) => ({
        // The domain is the heading on the glance tile, and the advice is its
        // body. A tile for an aligned domain carries a title of its own.
        title: tile.title || tile.label,
        body: tile.body || null,
        // The extra line the hardest domain carries. It is on the tile, so it
        // is here: this page is the same list, not a summary of it.
        say: tile.reflect || null,
      })),
    });
  }

  // 2. Expectations, named rather than generic. The categories with the most
  //    differences, because those are the conversations with the most in them.
  const expCats = (expectations?.categories || [])
    .filter((cat) => cat.differences > 0)
    .sort((a, b) => b.differences - a.differences)
    .slice(0, 3);
  /**
   * The group appears whenever this couple has expectations results, which is
   * what the website does. It was conditional on there being a difference, so
   * a couple who agreed across every area lost the section entirely and their
   * page had one fewer than the same couple's page on a laptop. The line for
   * that case is the website's own.
   */
  if (expectations) {
    groups.push({
      id: 'exp',
      color: '#1B5FE8',
      label: 'Expectations',
      section: 'exp-overview',
      items: expCats.length
        ? expCats.map((cat) => ({
          title: `Work through ${cat.label.toLowerCase()} together`,
          body: `${cat.differences} ${cat.differences === 1 ? 'thing' : 'things'} here you each pictured differently. Start with the first one.`,
          say: null,
        }))
        : [{
          title: 'Keep your expectations current',
          body: 'You matched across every area. Revisit this when something changes.',
          say: null,
        }],
    });
  }

  // 3. Physical Intimacy: the same three the at-a-glance page lists, from the
  //    same field, rather than this function's own slice of a longer list.
  const convos = intimacy?.actionPlan || [];
  if (convos.length) {
    groups.push({
      id: 'intimacy',
      color: '#C2185B',
      label: 'Physical Intimacy',
      section: 'intimacy-overview',
      items: convos.map((d) => ({ title: d.label, body: null, say: d.prompt })),
    });
  }

  /**
   * 4. Reflection, as its own at-a-glance action plan.
   *
   * ── WHAT WAS WRONG ────────────────────────────────────────────────────
   * Ellie: "Rel Relf action items don't carry to what comes next correctly,
   * I'm only seeing 'ellie wrote' and 'preston wrote'."
   *
   * That is exactly what this did: it took one written answer, a6, and made
   * two rows of it titled with their names. The section's actual action plan
   * is reflectionPlan, which is what its overview page draws, and the rule
   * stated at the top of this file is that every group here is what the reader
   * already met in context.
   *
   * Their own words stay, underneath, because a commitment each of them wrote
   * is the one item on this page nobody had to be advised into.
   */
  const reflectionItems = (reflectionPlan || [])
    .filter((r) => r.title)
    .map((r) => ({ title: r.title, body: r.body || null, say: r.action || null }));
  const commitment = (reflection?.written || []).find((w) => w.key === 'a6');
  if (commitment && (commitment.you || commitment.them)) {
    if (commitment.you) reflectionItems.push({ title: `${you} wrote`, body: commitment.you, say: null });
    if (commitment.them) reflectionItems.push({ title: `${them} wrote`, body: commitment.them, say: null });
  }
  if (reflectionItems.length) {
    groups.push({
      id: 'reflection',
      color: '#10B981',
      label: 'Relationship Reflection',
      section: 'reflection-overview',
      items: reflectionItems,
    });
  }

  /**
   * 5. Conflict, as the reader's own action plan.
   *
   * ── WHAT WAS WRONG ────────────────────────────────────────────────────
   * Ellie: "Conflict patterns action items aren't carrying over for what comes
   * next, I should have 4. Each person should have the action items based on
   * their conflict patterns, they pull to the conflict overview page."
   *
   * This was one hardcoded sentence, on the argument that the patterns are
   * private so nothing about them should be repeated here. That argument
   * confused two different promises. Conflict Patterns is private FROM THE
   * PARTNER, not from the reader: the at-a-glance page draws the reader their
   * own action plan and marks it "private to you". This page is built per
   * viewer as well, so it can carry the same list, and the pointer said
   * nothing they could do.
   *
   * Same selection as the overview page: the patterns in a band worth watching
   * or worth attention, in that order, each with its action.
   */
  const mineConflict = conflictAnswers ? summarizeConflict(conflictAnswers) : null;
  const conflictItems = (mineConflict?.ranked || [])
    .filter((p) => p.band === 'worth_watching' || p.band === 'worth_attention')
    .map((p) => PATTERN_ACTIONS[p.key])
    .filter(Boolean)
    .map((a) => ({ title: a.title, body: (a.body || '').replace(/\{partner\}/g, them), say: null }));

  if (conflictReady) {
    groups.push({
      id: 'conflict',
      label: 'Conflict Patterns',
      section: 'conflict-overview',
      items: conflictItems.length ? conflictItems : [{
        // Nothing in a band worth watching is a real answer, not an empty one.
        title: 'Reread your patterns before the next hard conversation',
        body: 'Not during one. The point of knowing them is recognising one early.',
        say: null,
      }],
    });
  }

  return { groups };
}
