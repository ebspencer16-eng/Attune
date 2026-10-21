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
import { audienceOf, resolveRoleTokens } from './role-tokens.js';
import { currentSection } from './results-sections.js';

/**
 * The three tiles What Comes Next is built from, at module scope so a check
 * can read their names.
 *
 * They were declared inside the function, which meant the only way to find out
 * what the page must carry was to run the whole builder with a couple's
 * answers. check-render judged this page by how many characters it drew, and
 * the page is three collapsed tiles: 591 characters with everything on it.
 * So the one results page Ellie has reported on most was reported as "no demo
 * data" on every run and had never once been checked.
 *
 * Nothing about the values changed. They are literals and were always
 * literals; only where they are declared moved.
 */
export const BUCKETS = [
  /* ── B108: HER NAMES, AND HER LINE BREAKS ────────────────────────────
     Ellie: "Change titles and make each split to 2 lines: Things to
     consider, Discussions to have, Phrases to try."

     The break is in the string because it is hers: a tile that wraps where
     the width happens to run out breaks "Discussions to have" after
     "Discussions to", which is not where she put it. Both surfaces honour
     the newline, so the two tiles read the same. */
  {
    id: 'keep-in-mind',
    label: 'Things to\nconsider',
    /* The three that describe how you already are with each other. */
    from: ['comm', 'conflict', 'reflection'],
    color: '#E8673A',
  },
  {
    id: 'discuss',
    label: 'Discussions\nto have',
    /* The two that are lists of conversations to have. */
    from: ['exp', 'intimacy'],
    color: '#1B5FE8',
  },
  {
    id: 'phrases',
    label: 'Phrases\nto try',
    from: ['couple-type'],
    color: '#9B5DE5',
  },
];

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

  /**
   * ── WHO A ROW IS FOR ──────────────────────────────────────────────────
   * Ellie, of Phrases to try: "only show the phrases to the partner who should
   * be saying them. You'll have to back into this based on which phrases are
   * for which type of individual and which partner is which type." And of
   * Things to consider: "'For both of you' (the rows that go to both
   * partners) and 'For [name]' (the things that are just for that user)."
   *
   * Both answers are already in the content. A couple type's tip says who it
   * is for in its own title, "Guarded partner: share the half-formed version",
   * and which of them is the guarded one is the axis comparison role-tokens.js
   * has always made. `audienceOf` reads the first with the same table that
   * resolves the second, so there is no second list of role phrases to drift.
   *
   * 'both' is the answer for a row that names nobody, and also for a row that
   * names a role this couple does not split on: if neither of them is the more
   * guarded one, advice for the guarded partner is advice for the pair.
   *
   * The viewer is `sides.you`, so this is answered per reader. The same couple
   * gets two different pages, which is the point.
   */
  const audience = (text) => {
    const who = audienceOf(text, sides?.you || null, sides?.them || null);
    if (!who) return 'both';
    return who.name === (sides?.you?.name || names?.you) ? 'you' : 'them';
  };
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
      /**
       * ── B104: THE ROWS ARE THE PHRASES ──────────────────────────────────
       * Ellie: "Couple type action plan should be the three phrases to try."
       *
       * They were a title, a paragraph and the phrase underneath, which is the
       * shape every other group has. In the bucket layout this group IS the
       * bucket called Phrases to try, so the phrase is the row and the advice
       * around it stays on the couple type page where it was met in context.
       *
       * A tip with no phrase is dropped rather than shown as a heading with
       * nothing to say, which is what the conflict rows used to be.
       */
      /**
       * ── B114: AND IT IS A QUOTATION, SO IT IS SET AS ONE ───────────────
       * Ellie: "Put phrases to try in quotes and italics."
       *
       * `quote` rather than `title`, because that is the field both surfaces
       * already draw in italics inside quotation marks: it is what the
       * reflection rows use for the words somebody wrote. A phrase to try is
       * the same kind of thing, something said, so it gets the same treatment
       * rather than a second one.
       */
      items: type.tips.slice(0, 3)
        .filter((t) => t.phraseTry)
        .map((t) => ({
          title: null,
          quote: named(t.phraseTry),
          body: null,
          say: null,
          section: 'couple-type',
          /* Worked out from the tip's own title, which says who it is for and
             is not itself drawn here. Read before it is dropped: the row keeps
             the phrase and nothing else, so this is the last moment the
             audience is knowable. */
          forWhom: audience(t.title),
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
  /**
   * ── AND NOT THE ONES ADDRESSED TO THE OTHER PERSON ──────────────────────
   * Ellie: "For Preston and Me, our internal processing action item is for
   * both of us, the how you connect action item is for me, and the when
   * things get hard action item is for Preston. The action item for Preston
   * should not be included in my list of things to consider, and vice versa."
   *
   * `audience` is 'you', 'them' or 'both', worked out from the shift sentence
   * itself in api/_content/shift-audience.js. A row for the partner alone is
   * dropped here and nowhere else: the same advice still appears on the
   * Communication overview, where it is read in context with both names in
   * it and is about the pair. This page is the list of things to DO.
   *
   * Anything the rule is not sure about is 'both', so a sentence this never
   * gets an answer for keeps showing. Nothing is hidden by not knowing.
   */
  const commTiles = (commsPlan?.tiles || [])
    .filter((t) => (t.title || t.label) && t.body)
    .filter((t) => t.audience !== 'them');
  if (commTiles.length) {
    groups.push({
      id: 'comm',
      color: '#E8673A',
      /* B103. Ellie: "Communication action plan should be called communication
         styles." It is the exercise's own full name, which is what the nav has
         always called it. The bucket layout does not print a group label at
         all, so this now only reaches a surface that lists sources; it is
         corrected rather than left wrong. */
      label: 'Communication Styles',
      section: 'comm-overview',
      /**
       * ── EXACTLY WHAT THE COMMUNICATION OVERVIEW SAYS ──────────────────
       * Ellie asked for the detail page's name as the title and the website's
       * Try line under it; the Try line on the website comes from the
       * protocols, which do not appear anywhere else in the app. Shown that,
       * she said: "Revert, make the action items for comms match the comms
       * overview page's action items exactly."
       *
       * She is right, and it is the rule this whole page is built on: nothing
       * here is a new claim, every group is something the reader has already
       * met in context. A Try line that exists only on this page is exactly the
       * thing that rule forbids.
       *
       * So a row is its glance tile: the tile's heading, and the tile's advice
       * with the extra line the hardest domain carries joined onto it. Both of
       * those are drawn here, where `body` is not: sending the advice as `body`
       * is how the conflict rows came to be headings with nothing under them.
       *
       * The domain's page is still where the row's arrow goes, which is what
       * `section` is for and is the half of her earlier ask that survives.
       */
      /**
       * ── B102: THE ROW IS THE ACTION, NOT THE CATEGORY ──────────────────
       * Ellie: "Comms action plans in what comes next should list the action
       * items not the category."
       *
       * The row was the domain's name, which is a category: "When things get
       * hard". What to DO was underneath it as the Try line. They are the
       * other way round now, so the row reads as something to do and the
       * domain is where its arrow goes.
       *
       * This is the third instruction about these rows and all three are kept
       * because the round trip is the argument. She asked for the detail
       * page's name with the website's Try line under it; then "Revert, make
       * the action items for comms match the comms overview page's action
       * items exactly", which is the tile's advice; and now that the advice is
       * the row itself.
       */
      items: commTiles.map((tile) => {
        const domain = COMM_DOMAINS.find((d) => d.id === tile.domain);
        const action = [tile.body, tile.reflect].filter(Boolean).join(' ');
        return {
          title: action || tile.title || tile.label,
          body: null,
          say: null,
          section: domain ? `comm-${domain.id}` : 'comm-overview',
          /**
           * Whose row this is, from the tile's own `audience`, which
           * comms-plan.js has always set: 'you', 'them' or 'both'. Read rather
           * than re-derived from the words, because the shift that decided it
           * is a comparison of two scores and the sentence is only a
           * description of that.
           *
           * The filter above already drops 'them'; this is what puts the rest
           * under the right eyebrow. Ellie: "I'm not seeing the for ellie
           * section and some of these should be there."
           */
          forWhom: tile.audience === 'you' ? 'you' : tile.audience === 'them' ? 'them' : 'both',
        };
      }),
    });
  }

  // 2. Expectations, named rather than generic. The categories with the most
  //    differences, because those are the conversations with the most in them.
  /**
   * ── EVERY CATEGORY WITH A CONVERSATION IN IT, NOT THE TOP THREE ─────────
   * Ellie: "in what comes next discussions to have, the expectations
   * discussions should be listed in the same format as the expectations
   * overview action plan - meaning that there should be 5 rows... and each of
   * those rows should be a dropdown with the same rows as the expectations
   * overview page."
   *
   * So the same categories the Expectations overview draws a drawer for, in
   * the same order, each carrying that drawer's own topics. It was the three
   * with the most differences, flattened into a sentence apiece, so a couple
   * with conversations in five areas saw three of them here and five there and
   * the two pages disagreed about how much was left to talk about.
   *
   * The topics are `cat.conversations`, which is the list the overview's
   * drawer draws. Filtering the rows again here would be the seventh copy of
   * that filter; see the note on `conversations` in _lib/expectations.js.
   */
  const expCats = (expectations?.categories || [])
    .filter((cat) => (cat.conversations?.length || cat.differences) > 0);
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
        ? expCats.map((cat) => {
          const topics = cat.conversations || [];
          return {
            /* Her words for the row: "they should be titled Life and values
               discussions, household discussions, etc." */
            title: `${cat.label} discussions`,
            body: `${topics.length} ${topics.length === 1 ? 'thing' : 'things'} here you each pictured differently.`,
            say: null,
            section: cat.section,
            /**
             * The rows inside this one, which is what makes it a dropdown
             * rather than a line. Keyed, because a tick has to survive a copy
             * edit: `key` comes from the question id and `item` is the
             * sentence, and only one of those is safe to store.
             */
            topics: topics.map((r) => ({ key: r.key, item: r.item })),
          };
        })
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
    /**
     * ── B112: AND IT IS THE READER'S OWN LINE ONLY ────────────────────────
     * Ellie: "My action plan should only have my row from rel relf, not
     * Preston's. And retitle it, say 'when asked to reflect, you said'."
     *
     * This page is built per reader, so "you" is whoever is holding it and
     * each of them gets their own sentence. The partner's commitment is still
     * on the Relationship Reflection page, side by side with theirs, which is
     * where comparing the two belongs; an action plan is a list of things for
     * the person reading it to do.
     *
     * Her earlier instruction, "I want them to say 'Ellie wrote: [insert what
     * I wrote]' then 'Preston wrote: [insert what Preston wrote]'", is
     * reversed by this one. Both are kept because the round trip is the
     * argument: the two rows were right for a page that gathers up what was
     * said, and wrong for one that lists what to do.
     */
    const items = [];
    /* ── AND IT IS ADDRESSED TO ONE PERSON ──────────────────────────────
       Ellie: "I'm not seeing the for ellie section and some of these should be
       there." This row is the reader's own sentence, quoted back to them, so
       it belongs under For <name> rather than under For both of you.

       Set here rather than left to the audience pass below, because that pass
       reads the words for a role phrase and there is no role phrase in
       somebody's own commitment. Where a row comes from is better evidence
       than what it says. */
    if (commitment.you) items.push({ title: 'When asked to reflect, you said', quote: commitment.you, body: null, say: null, section: 'reflection-overview', forWhom: 'you' });
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
      /**
       * ── B113: THE NOUN, NOT THE PRONOUN ────────────────────────────────
       * Ellie: 'Intimacy "talk about what it is for" should say physical
       * intimacy not it.'
       *
       * What It Is For reads correctly on its own page, where everything
       * around it says what "it" is. Here it is one row among fifteen about
       * five different exercises, so the question carries a second name for
       * use outside its section and this reads that. See `standalone` in
       * api/_intimacy-questions.js.
       */
      items: convos.map((d) => ({
        title: `Talk about ${String(d.standalone || d.label || '').toLowerCase()}`,
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
    /**
     * ── B111: THE ADVICE IS THE ROW ────────────────────────────────────
     * Ellie: "Remove titles on conflict ones, just make the description the
     * content and format it the same way the other rows are formatted."
     *
     * The same change the communication rows had in B102, for the same
     * reason: the heading was the pattern's name, which is a category, and
     * what to do was the line under it. The pattern's name is still on the
     * Conflict Patterns page, which is where the arrow goes.
     */
    .map((a) => ({
      title: (a.body || a.title || '').replace(/\{partner\}/g, them),
      body: null,
      say: null,
      section: 'conflict-overview',
      /* The reader's own patterns, from the reader's own answers, which is
         what makes this list private to them. So these rows are For <name>,
         not For both of you. Same argument as the reflection row above: the
         source says who it is for more reliably than the sentence does. */
      forWhom: 'you',
    }));

  if (conflictReady) {
    groups.push({
      id: 'conflict',
      label: 'Conflict Patterns',
      section: 'conflict-overview',
      items: conflictItems.length ? conflictItems : [{
        // Nothing in a band worth watching is a real answer, not an empty one.
        // One sentence and no line under it, which is how every conflict row
        // reads since B111, and it opens the same page: a row with no way out
        // is the thing the arrows replaced.
        title: 'Reread your patterns before the next hard conversation',
        body: null,
        say: null,
        section: 'conflict-overview',
        forWhom: 'you',
      }],
    });
  }

  /**
   * ── B105: THREE BUCKETS, NOT SIX SECTIONS ────────────────────────────────
   * Ellie: "I want to take all of the action items we currently list, and
   * present them not grouped by exercise/section but rather by: What to keep
   * in mind, What to discuss together, Phrases to try."
   *
   * And: "Do not list which exercises populate each bucket on what comes
   * next." So the bucket carries no source names, and a row's arrow is the
   * only thing that says where it came from, which is also the only part a
   * reader needs: it takes them to the page they met it on.
   *
   * The grouping lives here rather than in either renderer. Two surfaces
   * deciding independently which bucket conflict belongs in is the shape of
   * bug this codebase is mostly made of.
   *
   * `groups` is still returned beside the buckets. It is what the workbook and
   * the email read, and those are not this page; a bucket is a decision about
   * one screen rather than about what the results contain.
   */

  /**
   * ── THE SECTIONS INSIDE A BUCKET ────────────────────────────────────────
   * Ellie, for Things to consider and for Phrases to try: "one section for
   * both of you (if there are any) and one section for only ellie (if there's
   * anything)". And for Discussions to have: "there should be one section 'For
   * the two of you to discuss together'".
   *
   * So a bucket is sections rather than a flat list, every surface draws the
   * eyebrows the same, and "if there are any" is honoured by a section with
   * nothing in it not existing.
   *
   * A row addressed to the PARTNER is not drawn at all. That is the whole of
   * her first instruction about the phrases: "only show the phrases to the
   * partner who should be saying them." Things to consider is treated the
   * same, because she asked for its sections to be the same two and a
   * partner-only row would have nowhere to sit.
   *
   * Discussions to have is a list of things to do together by construction, so
   * it gets her one eyebrow and no audience filter.
   */
  const SECTION_LABEL = {
    both: 'For both of you',
    discuss: 'For the two of you to discuss together',
  };
  const youName = names?.you || sides?.you?.name || 'you';

  /**
   * ── WHO EVERY ROW IS FOR, NOT JUST THE PHRASES ─────────────────────────
   * Ellie: "This doesn't look right, I'm not seeing the for ellie section and
   * some of these should be there."
   *
   * She was right, and it was an omission rather than a judgement: only the
   * couple-type rows were given an audience, so every row in Things to
   * consider fell to 'both' and that section could never appear.
   *
   * In one pass over every group, so a group added later gets it without
   * anyone remembering, and BEFORE the buckets are built: the sections are cut
   * by this field, so setting it afterwards would change the rows and not the
   * page. A row that already worked its own out keeps it, because the phrases
   * read a title they then discard and this pass cannot see it.
   */
  for (const g of groups) {
    for (const item of g.items || []) {
      if (item.forWhom == null) {
        item.forWhom = audience([item.title, item.body, item.say].filter(Boolean).join(' '));
      }
    }
  }

  const buckets = BUCKETS.map((b) => {
    const items = b.from
      .map((id) => groups.find((g) => g.id === id))
      .filter(Boolean)
      .flatMap((g) => g.items || []);

    if (b.id === 'discuss') {
      return {
        id: b.id, label: b.label, color: b.color, items,
        sections: items.length ? [{ id: 'together', label: SECTION_LABEL.discuss, items }] : [],
      };
    }

    const mine = items.filter((it) => (it.forWhom || 'both') === 'you');
    const both = items.filter((it) => (it.forWhom || 'both') === 'both');
    const sections = [];
    if (both.length) sections.push({ id: 'both', label: SECTION_LABEL.both, items: both });
    if (mine.length) sections.push({ id: 'you', label: `For ${youName}`, items: mine });
    /* `items` stays the flat list a section holds, so the tile's count is what
       the reader will actually find under it and not what was built. */
    return { id: b.id, label: b.label, color: b.color, items: [...both, ...mine], sections };
  }).filter((b) => b.items.length);

  /**
   * ── EVERY ARROW HAS TO LAND ON A PAGE THAT EXISTS ───────────────────────
   * Ellie: "I tried to tap into the physical intimacy discussion we need to
   * have, and it did not bring me to that Page."
   *
   * The intimacy dimension rows carry `section: 'intimacy-<dimension>'`, and
   * those six pages were retired into two at her own ask. The id is still a
   * valid ANCHOR, so `isResultsSection` says yes and nothing complained; it is
   * not a page, so the tap went nowhere. One field doing two jobs: where a
   * mark lives and where an arrow goes.
   *
   * `currentSection` already knows what each retired id became and was called
   * by nothing but its own gate. Resolving here covers every group rather than
   * the one that was reported, which is the half that matters: the next page
   * Ellie asks to merge would have broken the same way.
   */
  for (const g of groups) {
    for (const item of g.items || []) {
      if (item.section) item.section = currentSection(item.section);
    }
  }

  return { groups, buckets };
}
