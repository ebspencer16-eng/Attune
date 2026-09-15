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

export function whatComesNext({ coupleTypeId, commsPlan, expectations, intimacy, reflection, conflictReady, names }) {
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
  if (commsPlan?.tiles?.length) {
    groups.push({
      id: 'comm',
      color: '#E8673A',
      label: 'Communication',
      section: 'comm-overview',
      items: commsPlan.tiles.map((tile) => ({
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

  // 4. Reflection, in their own words. Not advice: each of them already wrote
  //    down the thing they wanted to work on.
  const commitment = (reflection?.written || []).find((w) => w.key === 'a6');
  if (commitment) {
    groups.push({
      id: 'reflection',
      color: '#10B981',
      label: 'Relationship Reflection',
      section: 'reflection-overview',
      items: [
        { title: `${you} wrote`, body: commitment.you, say: null },
        { title: `${them} wrote`, body: commitment.them, say: null },
      ],
    });
  }

  // 5. Conflict, only as a pointer. The patterns themselves are private to
  //    each reader, so nothing about them is repeated here.
  if (conflictReady) {
    groups.push({
      id: 'conflict',
      label: 'Conflict Patterns',
      section: 'conflict-overview',
      items: [{
        title: 'Reread your patterns before the next hard conversation',
        body: 'Not during one. The point of knowing them is recognising one early.',
        say: null,
      }],
    });
  }

  return { groups };
}
