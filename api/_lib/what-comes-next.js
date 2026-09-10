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

export function whatComesNext({ coupleTypeId, expectations, intimacy, reflection, conflictReady, names }) {
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
      label: 'Your type',
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

  // 2. Expectations, named rather than generic. The categories with the most
  //    differences, because those are the conversations with the most in them.
  const expCats = (expectations?.categories || [])
    .filter((cat) => cat.differences > 0)
    .sort((a, b) => b.differences - a.differences)
    .slice(0, 3);
  if (expCats.length) {
    groups.push({
      id: 'expectations',
      color: '#1B5FE8',
      label: 'Expectations',
      section: 'exp-overview',
      items: expCats.map((cat) => ({
        title: `Work through ${cat.label.toLowerCase()} together`,
        body: `${cat.differences} ${cat.differences === 1 ? 'thing' : 'things'} here you each pictured differently. Start with the first one.`,
        say: null,
      })),
    });
  }

  // 3. Physical Intimacy, as the questions it produced, furthest apart first.
  const convos = (intimacy?.conversations || []).slice(0, 3);
  if (convos.length) {
    groups.push({
      id: 'intimacy',
      color: '#C2185B',
      label: 'Physical Intimacy',
      section: 'intimacy-plan',
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
      label: 'What you each said',
      section: 'reflection-plan',
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
