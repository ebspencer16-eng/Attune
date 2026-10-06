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
import { COMM_DOMAINS } from './comm-domains.js';
import { resolveRoleTokens } from './role-tokens.js';

export function whatComesNext({ coupleTypeId, commsPlan, expectations, intimacy, reflection, reflectionPlan, conflictReady, conflictAnswers, names, sides }) {
  /**
   * ── THE PEOPLE, NAMED ───────────────────────────────────────────────────
   * Ellie: "Couple type action items should match the site - the app is
   * showing 'Guarded partner:...' but the site says 'Preston'. I want that done
   * throughout, make sure the app matches."
   *
   * The couple type's tips are written with role tokens, {EXP} and {GRD} and
   * their pronoun forms, because which partner is which depends on the couple.
   * The website resolves them and this page did not, so the app read out the
   * role where the website read out the person.
   *
   * `sides` is the two people with the axes that decide who holds which role.
   * Without it every token falls back to the generic phrase, which is what
   * role-tokens does for a couple that has no such role, and is right: it is
   * never a raw `{EXP}` on the page either way.
   */
  const named = (text) => (text
    ? resolveRoleTokens(String(text), sides?.you || null, sides?.them || null)
    : text);
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
        title: named(t.title),
        body: named(t.body) || null,
        // The sentence to actually say. On a page of advice this is the only
        // part that survives contact with a real evening.
        say: named(t.phraseTry) || null,
        section: 'couple-type',
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
      /**
       * ── THE PAGE'S NAME, AND THE THING TO TRY ─────────────────────────
       * Ellie: "Both app and site use the wrong setup for comms action items.
       * Bold title should be the detailed page name, then the content should
       * be the 'try' content that the site shows."
       *
       * The title was the advice's own heading, which is a sentence about this
       * couple rather than a place to go, so a row told you something and gave
       * you nowhere to read it. `label` is the domain's page: Internal
       * Processing, How You Connect, When Things Get Hard.
       *
       * The Try line is the protocol's `thisWeek`, which is what the website
       * has always printed here, matched to the tile by the dimension the tile
       * leads with. A domain whose protocol has no weekly line falls back to
       * the advice, so a row is never a heading with nothing under it.
       */
      items: commTiles.map((tile) => {
        const protocol = (commsPlan?.protocols || []).find((pr) => pr.dim === tile.dim);
        const domain = COMM_DOMAINS.find((d) => d.id === tile.domain);
        return {
          title: tile.label || tile.title,
          body: null,
          say: named(protocol?.thisWeek || tile.body) || null,
          section: domain ? `comm-${domain.id}` : 'comm-overview',
        };
      }),
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
        /**
         * ── EACH ROW SAYS WHAT IT IS AND OPENS ITS OWN PAGE ──────────────
         * Ellie: "Rather than 'Work through household together' the action plan
         * rows for expectations in the what comes next page should read
         * 'Discuss household expectations together' and each row should have a
         * little arrow on the right side of the row to open that page directly,
         * then remove the 'open expectations' arrow at the bottom of the
         * expectations list."
         *
         * `section` on the item is that arrow's destination. The category
         * already carries the id the nav uses, so the row goes to the page it
         * names rather than to the overview above it, and a surface that draws
         * a row arrow draws it from this and not from a list of its own.
         *
         * A group whose items each carry a section does not draw its own open
         * arrow: the same link seven times is six too many.
         */
        ? expCats.map((cat) => ({
          title: `Discuss ${cat.label.toLowerCase()} expectations together`,
          body: `${cat.differences} ${cat.differences === 1 ? 'thing' : 'things'} here you each pictured differently. Start with the first one.`,
          say: null,
          section: cat.section,
        }))
        : [{
          title: 'Keep your expectations current',
          body: 'You matched across every area. Revisit this when something changes.',
          say: null,
        }],
    });
  }

  /**
   * 3. Reflection, in their own words.
   *
   * Ellie: "I want rel relf listed above physical intimacy expectations on
   * what comes next pages." Above it on both surfaces, which is this order,
   * because each renders the groups in the order they are sent.
   *
   * ── THIS HAS BEEN BOTH WAYS ───────────────────────────────────────────
   * It was these two rows, then Ellie: "Rel Relf action items don't carry to
   * what comes next correctly, I'm only seeing 'ellie wrote' and 'preston
   * wrote'." So it took the section's whole action plan instead.
   *
   * Then, seeing that: "Rel RElf in the what comes next section has 11 things
   * - it should only have 2, and it should be what we each wrote for
   * ourselves." Eleven insights on a page whose job is to gather things up is
   * the page becoming a second copy of the section.
   *
   * So it is the two commitments again, and this note is here so the next
   * person to read "only two rows?" knows it was asked for twice.
   */
  const commitment = (reflection?.written || []).find((w) => w.key === 'a6');
  if (commitment && (commitment.you || commitment.them)) {
    /**
     * Ellie: "I want them to say 'Ellie wrote: [insert what I wrote]' then
     * 'Preston wrote: [insert what Preston wrote]'."
     *
     * The words go in the title rather than under it, because this page is
     * read as a list of headings and the body was the half carrying the
     * content. Their own words, unedited, which is the whole point of the two
     * rows being here.
     */
    /**
     * ── AND THE WORDS ARE THEIR OWN FIELD ─────────────────────────────────
     * Ellie: "can the text of what we wrote be italicized? Like 'Ellie wrote:
     * Be nicer' and be nicer would be italicized".
     *
     * Which means the sentence has two halves that are set differently, and a
     * renderer cannot find the join in one string without restating the rule
     * that put it there. So the server splits it: `title` is who, `quote` is
     * what they wrote. The app draws the quote in italic inside the title's
     * line, so it still reads as one sentence.
     *
     * The website builds its own items for this group, client-side, which
     * check-what-comes-next.mjs says out loud that it does not cover. This
     * changes the app only, and that is the surface she is reading.
     */
    const items = [];
    if (commitment.you) items.push({ title: `${you} wrote:`, quote: commitment.you, body: null, say: null, section: 'reflection-overview' });
    if (commitment.them) items.push({ title: `${them} wrote:`, quote: commitment.them, body: null, say: null, section: 'reflection-overview' });
    groups.push({
      id: 'reflection',
      color: '#10B981',
      label: 'Relationship Reflection',
      section: 'reflection-overview',
      items,
    });
  }

  // 4. Physical Intimacy: the same three the at-a-glance page lists, from the
  //    same field, rather than this function's own slice of a longer list.
  const convos = intimacy?.actionPlan || [];
  if (convos.length) {
    groups.push({
      id: 'intimacy',
      color: '#C2185B',
      /* Ellie: "I want the what comes next page to call it physical intimacy
         expectations not just physical intimacy." It is the exercise's own
         name, and the short form reads as a different subject. */
      label: 'Physical Intimacy Expectations',
      section: 'intimacy-overview',
      /**
       * Ellie: "Use the site's physical intimacy action items, not the app's."
       * The website says "Talk about how it happens" and the server said "How
       * it happens", which is the dimension's name rather than something to do.
       * Its prompt is the same on both.
       */
      items: convos.map((d) => ({
        title: `Talk about ${String(d.label || '').toLowerCase()}`,
        body: null,
        say: named(d.prompt),
        section: d.section || 'intimacy-overview',
      })),
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
    /* Ellie: "I want the full action item with the try section (like the site
       shows) for the conflict patterns action items on the app what comes next
       page." The advice's body WAS being sent, as `body`, and the app draws
       `title` and `say` and nothing else, so on a phone every conflict row was
       a heading with nothing under it. It is the Try line on both surfaces
       now, which is where the website has always printed it. */
    .map((a) => ({
      title: a.title,
      body: null,
      say: (a.body || '').replace(/\{partner\}/g, them),
      section: 'conflict-overview',
    }));

  if (conflictReady) {
    groups.push({
      id: 'conflict',
      label: 'Conflict Patterns',
      section: 'conflict-overview',
      items: conflictItems.length ? conflictItems : [{
        // Nothing in a band worth watching is a real answer, not an empty one.
        // Its sentence is the Try line, like every other row here, and it opens
        // the same page: a row with no way out is the thing the arrows replaced.
        title: 'Reread your patterns before the next hard conversation',
        body: null,
        say: 'Not during one. The point of knowing them is recognising one early.',
        section: 'conflict-overview',
      }],
    });
  }

  return { groups };
}
