/**
 * Conflict Patterns results. Four screens, per app/SCREENS.md.
 *
 * ── THE RULE ──────────────────────────────────────────────────────────────
 * Your Patterns is yours. Your partner is never shown it, and this component
 * could not show it if it tried: /api/conflict-results does not send the
 * partner's patterns, their type has no field for them, and a build gate fails
 * if anyone adds one. Three layers, because the cost of getting this wrong is
 * someone reading a private answer about themselves in their partner's hands.
 *
 * ── WHY IT LOOKS LIKE THIS ────────────────────────────────────────────────
 * No score, no letter, no couple type. The other exercises describe a dynamic
 * where neither end is worse. This one measures a rate on patterns where one
 * direction genuinely is, and turning that into an identity label is the most
 * harmful thing this product could do. "You are a Critic" is a sentence someone
 * repeats to themselves for years.
 *
 * So: frequencies, bands, and one thing to try. Described, never ranked into a
 * verdict, and never averaged with the partner into a couple number that would
 * let a serious imbalance read as fine.
 *
 * Every word comes from api/_conflict-results-prose.js.
 */

import { ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import type { ConflictOpenings, ConflictResults, ConflictSummary } from '@/api/client';
import PageTile from '@/components/page-tile';
import StepCount from '@/components/step-count';
import { Prose } from '@/components/annotation-context';
import { ResultsScroll } from '@/components/results-scroll';
import {
  BottomTabInset, Colors, MaxContentWidth, Palette, Radius, Spacing, Type,
} from '@/constants/attune-theme';

const c = Colors.light;

/** Ink on a coloured ground. Same three names as results.tsx uses. */
const INK = c.onDark;
const INK_QUIET = c.onDarkMuted;
const PANEL = 'rgba(255,255,255,0.10)';
const PANEL_EDGE = 'rgba(255,255,255,0.22)';
const PANEL_BAND = 'rgba(255,255,255,0.16)';

/**
 * The four Conflict screens, named exactly as the server names them.
 *
 * They used to be 'glance' | 'snapshot' | 'patterns' | 'wrote', a second
 * vocabulary for the same four things the results nav already calls
 * conflict-overview, -snapshot, -patterns and -wrote. Two names for one screen
 * is two lists to keep in step, and the `section` prop that carried the
 * server's name was accepted here and never read.
 */
type Screen = 'overview' | 'snapshot' | 'patterns' | 'wrote';

const SCREENS: Screen[] = ['overview', 'snapshot', 'patterns', 'wrote'];

/**
 * The label over a pattern's advice. Which one appears is the point of having
 * it: a pattern showing up regularly gets something to try, one that is rare
 * gets something to keep in mind, and the difference is the reading.
 *
 * The website's two strings. They were one string here, and it was the wrong
 * one for half the bands.
 */
/**
 * The two section labels on Conflict at a glance, and the colour of an answer
 * on the shared measure.
 *
 * Both live in api/_conflict-results-prose.js, which the website imports. The
 * app cannot, so it names them and check-conflict-colours.mjs fails the build
 * if they stop matching: the documented arrangement, derive where you can and
 * gate where you cannot.
 */
const GLANCE_LABEL = '#8FB2FF';

/**
 * The red on "*private to you". Not the brand orange: this is the one line in
 * the results that is a warning rather than an accent, and it has to read as
 * one against a dark blue ground.
 */
const PRIVATE_RED = '#FF8A7A';

/**
 * The colour of one answer on the shared conflict measure.
 *
 * c0 runs from "Really rocky" at 0 to "We handle it well" at 4, so the scale
 * is the opposite way round from the pattern bands, which run from a pattern
 * that never happens to one that happens often. The value is flipped before
 * it is looked up, or the page would paint the couple who say they handle
 * conflict well in the colour of the worst pattern.
 *
 * Five answers, four bands: the two middle answers share one, which is the
 * server's own scale and the one the patterns page draws, so a colour means
 * the same thing on both pages of this section.
 */
function overallTone(bands: string[], value: number): string {
  if (!bands?.length) return '#FFFFFF';
  const worst = 4 - Math.min(Math.max(value, 0), 4);
  const i = Math.min(Math.round((worst * (bands.length - 1)) / 4), bands.length - 1);
  return bands[i];
}

const ADVICE_TRY = 'One thing to try';
const ADVICE_KEEP = 'One thing to keep in mind';

/** The section's blue, which the website uses for this label. */
const accentBlue = '#1B5FE8';

export default function ConflictResultsView({
  data, section, accent, ground, groundStops, title = 'Conflict Styles', step = null,
}: {
  /**
   * Which of the section's pages this is.
   *
   * Ellie: "Add 1/3 page count on conflict pages just like other sections."
   * Conflict is the one section whose pages live in their own file, which is
   * the only reason it did not have one: the count is computed from the nav in
   * results.tsx and was never passed across the boundary.
   */
  step?: { index: number; total: number } | null;
  /** The heading this page prints, from the server's pageTitles. */
  title?: string;
  /**
   * The at-a-glance page's gradient and where its colours sit, from the
   * results nav. One copy, in api/_lib/section-grounds.js, which the website
   * paints from too.
   */
  ground?: string[] | null;
  groundStops?: number[] | null;
  data: Extract<ConflictResults, { ready: true }>;
  /**
   * The section's colour, from the results nav the server builds. It is the
   * website's conflict BLUE. Passed rather than written here so the two
   * products cannot end up with two different blues.
   */
  accent?: string;
  /**
   * Which of the four Conflict screens to show. The website splits this into
   * conflict-overview, -snapshot, -patterns and -wrote, and notes anchor to
   * those ids, so the app shows the same four rather than one long page.
   */
  section?: string;
}) {
  const { you, partner, names, content } = data;

  /**
   * Which screen, from the section the results nav asked for.
   *
   * ── WHY THE TAB BAR IS GONE ─────────────────────────────────────────────
   * This screen had its own row of pills across the top, so Conflict Patterns
   * was the only section in the app with two navigations: the results nav that
   * every other section uses, and a second one inside it that looked nothing
   * like it.
   *
   * Worse, they were not connected. `section` arrived from the nav and was
   * never read, and the pills were local state defaulting to the first tab. So
   * every conflict link in the nav, including the three that name a specific
   * page, landed on At a glance and left the reader to find the rest through a
   * control the rest of the product does not have.
   *
   * Ellie: "Conflict pages on app need to match site and currently don't...
   * use the nav we've organized in other sections."
   */
  const screen: Screen =
    (SCREENS.find((k) => section === `conflict-${k}`) || 'overview');

  return (
    <View style={{ flex: 1 }}>
      {screen === 'overview' ? <Glance data={data} title={title} ground={ground} groundStops={groundStops} /> : null}
      {screen === 'snapshot' ? <Snapshot data={data} accent={accent} ground={ground} groundStops={groundStops} step={step} /> : null}
      {screen === 'patterns' ? <Patterns you={you} content={content} ground={ground} groundStops={groundStops} step={step} /> : null}
      {screen === 'wrote' ? <Wrote data={data} ground={ground} groundStops={groundStops} step={step} /> : null}
    </View>
  );
}

/**
 * Conflict at a glance.
 *
 * ── WHAT THIS USED TO BE, AND WHY IT CHANGED ──────────────────────────────
 * The website's page is one dark panel: the section eyebrow, both names set
 * large, the one shared measure this exercise produces as two bars, then the
 * action plan.
 *
 * The app's opened with "How conflict goes for you" and the reader's own
 * written strength, and then went straight to the action cards. Two
 * differences that matter:
 *
 * The names were missing, so the page that opens a section about the two of
 * them did not name them.
 *
 * The shared measure was missing entirely. c0 asks each of you to describe how
 * you handle disagreements, and it is the only number in Conflict Patterns
 * that both people see. The app could not draw it because the five answer
 * labels were typed inline in src/App.jsx: the values were on the payload all
 * along with nothing to label them with. They are derived from the question
 * now and sent as content.overallLabels.
 *
 * The written strength moved off this page. It belongs to What You Each Wrote,
 * which is where the website puts it, next to the partner's answer to the same
 * question rather than alone.
 */
function Glance({ data, title, ground, groundStops }: {
  data: Extract<ConflictResults, { ready: true }>;
  /** The page's heading, from the server's pageTitles. */
  title: string;
  /** The page's gradient and its stops, from the results nav. */
  ground?: string[] | null;
  groundStops?: number[] | null;
}) {
  const { you, partner, content, names } = data;
  const worth = you.ranked.filter((p) => p.band === 'worth_watching' || p.band === 'worth_attention');
  const labels = content.overallLabels || [];

  // Both sides of the one shared number, in the website's order: you, then
  // them. A partner who has not finished has no value and is left out rather
  // than drawn at zero, which would read as an answer.
  const overalls = [
    { name: names.you, value: you.overall },
    { name: names.partner, value: partner?.overall ?? null },
  ].filter((r) => r.value != null);

  return (
    /* ── ONE GROUND FOR THE WHOLE PAGE ───────────────────────────────────
       The website puts Results at a glance on a single dark slide: the names,
       the shared number and the action plan all sit on it. This file used to
       paint the gradient as a rounded panel around the first two and let the
       action plan fall off the bottom of it onto cream, so the page a reader
       arrived at was two different pages stacked.

       One ground for all of it, in the tile every at-a-glance page in the app
       takes, and the website's own three colours rather than the two this file
       had invented. */
    <PageTile ground={ground} locations={groundStops}>
      <>
        {/* The names, and nothing above them. The eyebrow and its dot were
            here, matching the website, and Ellie asked for both to go from
            both products: the section is already named in the nav you arrived
            through. */}
        {/* Ellie: "Conflict: should be titled 'Conflict Styles'". The page led
            with the couple's names on both surfaces, which does not say what
            the page is. From the server, so neither can drift. */}
        <Text style={{ ...Type.hero, color: Palette.white }}>
          {title}
        </Text>

        {/* block: conflict-overview/overall */}
        {overalls.length ? (
          <View
            style={{
              backgroundColor: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)',
              borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.lg, marginTop: Spacing.lg,
            }}>
            {/* Ellie: "Conflict styles at a glance page needs some color in
                the content, can the bars be colored and can the section labels
                be colored?" The two labels on this page were white at a third
                opacity, which is as close to no colour as a label gets. */}
            <Text style={{ ...Type.eyebrow, fontSize: 9, color: GLANCE_LABEL, marginBottom: Spacing.md }}>
              How you each describe conflict resolution in your relationship
            </Text>
            {overalls.map((r) => (
              <View key={r.name} style={{ marginBottom: Spacing.md }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: Spacing.xs }}>
                  <Text style={{ ...Type.small, color: Palette.white, fontWeight: '700' }}>{r.name}</Text>
                  <Text style={{ ...Type.small, color: 'rgba(255,255,255,0.8)' }}>
                    {labels[r.value as number] || ''}
                  </Text>
                </View>
                {/* The bar carries the answer's own colour rather than white:
                    the five answers run from "we work it out" to "it goes
                    unresolved", and the colour is the fastest reading of which
                    end someone is at. The five come from the band colours the
                    server already sends, which is the same scale the patterns
                    page draws. */}
                <View style={{ height: 6, borderRadius: Radius.pill, backgroundColor: 'rgba(255,255,255,0.14)', overflow: 'hidden' }}>
                  <View
                    style={{
                      height: 6,
                      width: `${(((r.value as number) + 1) / 5) * 100}%`,
                      backgroundColor: overallTone(content.bandColors, r.value as number),
                    }}
                  />
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {/* block: conflict-overview/action-plan */}
        {/* The heading, and the note that this list is nobody else's. Ellie
            asked for it level with the heading and out at the right margin,
            which is where an aside belongs: it qualifies the heading without
            interrupting it. */}
        <View
          style={{
            flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between',
            gap: Spacing.md, marginTop: Spacing.xl, marginBottom: Spacing.md,
          }}>
          <Text style={{ ...Type.eyebrow, fontSize: 9, color: GLANCE_LABEL }}>
            Your action plan
          </Text>
          <Text style={{ ...Type.small, fontSize: 11, fontWeight: '600', color: PRIVATE_RED }}>
            {content.copy.glancePrivate || '*private to you'}
          </Text>
        </View>
        {worth.length ? (
          <View style={{ gap: Spacing.md }}>
            {worth.map((p) => {
              const action = content.patternActions[p.key];
              if (!action) return null;
              return (
                <View key={p.key} style={darkCard}>
                  {/* The pattern named, so a card can be tied back to the bar it
                      came from. No eyebrow: on Results at a glance the cards ARE
                      the actions, three in a row under a heading that already says
                      so, and a label over each one said it three more times. It
                      stays on the Patterns detail page, where a card sits alone
                      under its own bar. */}
                  <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'baseline', gap: Spacing.md }}>
                    <Text style={{ ...Type.small, fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>{titleFor(p.key)}</Text>
                  </View>
                  <Text style={{ ...Type.cardTitle, color: Palette.white, marginTop: Spacing.xs }}>{action.title}</Text>
                  <Prose style={{ ...Type.body, color: 'rgba(255,255,255,0.85)', marginTop: Spacing.xs }}>{action.body}</Prose>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={darkCard}>
            {content.noActionNeeded?.title ? (
              <Text style={{ ...Type.cardTitle, color: Palette.white, marginBottom: Spacing.xs }}>
                {content.noActionNeeded.title}
              </Text>
            ) : null}
            <Prose style={{ ...Type.body, color: 'rgba(255,255,255,0.85)' }}>
              {content.noActionNeeded?.body || content.copy.allClear || ''}
            </Prose>
          </View>
        )}
      </>
    </PageTile>
  );
}


/**
 * The header every Conflict detail page carries on the website: the section
 * eyebrow, the page's own title, and a badge saying whether this page is
 * shared or private.
 *
 * ── WHY THIS WAS WORTH ADDING ─────────────────────────────────────────────
 * The app drew none of it. The three titles and both badge words have been on
 * the payload since /api/conflict-results existed, in content.copy, and the
 * app read two keys out of that object and ignored the rest. So each page
 * opened straight into its content with nothing naming it, and the reader had
 * no way to tell which pages their partner can see.
 *
 * On this section in particular that is not a cosmetic difference. Conflict
 * Patterns is the one part of the product where half the answers stay private,
 * and the badge is the only thing on the page that says so.
 */
function PageHead({
  copy, title, shared,
}: {
  copy: { eyebrow?: string; sharedBadge?: string; privateBadge?: string };
  title?: string;
  shared: boolean;
}) {
  return (
    <View style={{ marginBottom: Spacing.lg }}>
      {/* The section eyebrow was here, above the title, matching the website.
          Ellie asked for it to go from every Conflict detail page on both
          products. The badge stays: it is the only thing saying whether the
          partner can see this page, which is not decoration on this section. */}
      <View
        style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          gap: Spacing.md,
        }}>
        {/* White, because the three Conflict detail pages moved onto the
            section's own gradient. The same miss as ReflectionHead: the panels
            below were converted and the heading above them was not. */}
        <Text style={{ ...Type.title, color: Palette.white, flex: 1 }}>{title}</Text>
        {/* ── NO BADGE ON THE DETAIL PAGES ────────────────────────────────
            Ellie: "Remove shared pill from conflict snapshot page and just for
            you pill on your patterns page."

            The badge stays where it does real work, which is the at-a-glance
            page's action plan: that one says "private to you" beside a list a
            reader might otherwise assume their partner is reading. On a page
            heading it was a label on every page saying the same two things
            alternately, which is the kind of thing people stop seeing. */}
      </View>
    </View>
  );
}

/** Snapshot. The three shared questions, and what each of you helps with. */
function Snapshot({ data, accent, ground = null, groundStops = null, step = null }: {
  data: Extract<ConflictResults, { ready: true }>; accent?: string;
  /* Ellie: "Same with conflict patterns detailed pages." The section's own
     ground, from the nav, which its overview page already uses. */
  ground?: string[] | null; groundStops?: number[] | null;
  step?: { index: number; total: number } | null;
}) {
  const { you, partner, names, content } = data;

  return (
    <PageTile ground={ground} locations={groundStops}>
      {/* block: conflict-snapshot/head */}
      <StepCount step={step} />
      <PageHead copy={content.copy} title={content.copy.snapshotTitle} shared />
      {/* ── THE SNAPSHOT IS A TABLE ──────────────────────────────────────
          Ellie: "Your patterns does match the web view, but the conflict
          snapshot does not."

          The website draws three columns, the question and a column per
          person, under a header naming the two of them, with each answer in a
          blue pill. This drew a row per person per question with a dot and a
          name against it, so the same three questions read as six findings and
          there was nothing to scan down.

          Two columns of pills under two names, which is the website's table
          with the question above each row rather than beside it, because the
          questions are sentences and a phone has no room for a 1.6fr column. */}
      {/* block: conflict-snapshot/openings */}
      <View style={{ ...card }}>
        <Text style={{ ...Type.eyebrow, color: c.accentQuiet, marginBottom: Spacing.md }}>Conflict</Text>

        {content.snapshotRows.map((row, i) => {
          const chips = content.openingChips[row.id];
          const mine = pickChip(you.openings, row.field);
          const theirs = partner ? pickChip(partner.openings, row.field) : null;
          return (
            <View
              key={row.id}
              style={{
                /* Ellie: "Too much vertical space between rows on conflict
                   snapshot conflict tile." Sixteen above the rule and sixteen
                   below it is thirty-two points between two short rows. */
                paddingTop: i === 0 ? 0 : Spacing.md,
                marginTop: i === 0 ? 0 : Spacing.md,
                borderTopWidth: i === 0 ? 0 : 1, borderTopColor: PANEL_EDGE,
              }}>
              <Text style={{ ...Type.small, color: INK_QUIET, marginBottom: Spacing.md }}>{row.label}</Text>
              <View style={{ flexDirection: 'row', gap: Spacing.md }}>
                <SnapshotCell name={names.you} text={chipText(chips, mine)} own />
                {partner ? <SnapshotCell name={names.partner} text={chipText(chips, theirs)} /> : null}
              </View>
            </View>
          );
        })}
        {!partner ? (
          <Text style={{ ...Type.small, color: INK_QUIET, marginTop: Spacing.lg }}>
            {names.partner} has not finished this yet. Their side fills in when they do.
          </Text>
        ) : null}
      </View>

      <View style={{ ...card, marginTop: Spacing.md }}>
        {/* "Repair", then the two columns, which is what the website shows.
            There was a line under this heading reading "What helps each of you
            reset.", written here as a fallback for content.copy.repairIntro,
            which is an empty string. So the fallback was the only thing that
            ever rendered: a sentence the website does not have, written in the
            app, which is the thing Ellie asked not to happen. */}
        {/* block: conflict-snapshot/repair */}
        <Text style={{ ...Type.eyebrow, color: c.accentQuiet, marginBottom: Spacing.md }}>Repair</Text>
        {/* The website's own heading for these two columns. The app said
            "What Ellie wants", which drops who it is wanted from and that the
            list is in order, both of which are the point of a ranking. */}
        <View style={{ flexDirection: 'row', gap: Spacing.lg }}>
          <RepairColumn
            title={`What ${names.you} wants from ${names.partner}, in order`}
            items={you.repairRanking}
            accent={accent}
          />
          {partner ? (
            <RepairColumn
              title={`What ${names.partner} wants from ${names.you}, in order`}
              items={partner.repairRanking}
              accent={accent}
            />
          ) : null}
        </View>

        {/* ── WHAT YOU EACH DO ────────────────────────────────────────────
            c8, which neither surface has ever shown. It is in the partner
            allowlist, so both of you agreed to share it by answering it, and
            it sat in the payload unread. The rankings above are what each of
            you wants done; this is what each of you actually does, which is
            the other half of the same question and belongs beside it.

            The question's own text is the label, because a heading would be
            customer copy. */}
        {/* Ellie: "and in the repair tile between sections 1 and 2." Same
            doubling: a margin above the rule and a padding below it. */}
        {you.strength || partner?.strength ? (
          <View style={{ marginTop: Spacing.md, borderTopColor: PANEL_EDGE, borderTopWidth: 1, paddingTop: Spacing.md }}>
            <Text style={{ ...Type.small, color: INK_QUIET, marginBottom: Spacing.md }}>
              {content.resetQuestion}
            </Text>
            {/* The website puts these two in the same pills as the rows
                above, side by side. They were the old dot-and-name rows, which
                is the shape the snapshot table has just left behind. */}
            <View style={{ flexDirection: 'row', gap: Spacing.md }}>
              {you.strength ? <SnapshotCell name={names.you} text={you.strength} own /> : null}
              {partner?.strength ? <SnapshotCell name={names.partner} text={partner.strength} /> : null}
            </View>
          </View>
        ) : null}
      </View>
    </PageTile>
  );
}

/**
 * Your Patterns. The private one.
 *
 * `you` is the only summary this function receives. The partner's is not a
 * parameter, so there is nothing here to accidentally render.
 */
function Patterns({
  you, content, ground = null, groundStops = null, step = null,
}: {
  you: ConflictSummary;
  content: Extract<ConflictResults, { ready: true }>['content'];
  ground?: string[] | null; groundStops?: number[] | null;
  step?: { index: number; total: number } | null;
}) {
  return (
    <PageTile ground={ground} locations={groundStops}>
      {/* block: conflict-patterns/head */}
      <StepCount step={step} />
      <PageHead copy={content.copy} title={content.copy.patternsTitle} shared={false} />
      {/* The privacy line sits above the content, not below it, because someone
          reading their own worst pattern should know it is private before they
          read it rather than after. */}
      {/* block: conflict-patterns/privacy */}
      {/* A line, not a panel. The app boxed it in pink and set it italic, which
          is a heavier treatment than the website gives the single most
          important sentence on the page, and made the two products look least
          alike exactly where they most need to agree. */}
      <Text
        style={{
          ...Type.small, fontSize: 13, fontWeight: '600', color: '#B5546E',
          lineHeight: 20, marginBottom: Spacing.lg,
        }}>
        * {content.copy.patternsPrivacy}
      </Text>

      {content.copy.patternsIntro ? (
        <Prose style={{ ...Type.body, color: INK_QUIET, marginBottom: Spacing.lg }}>
          {content.copy.patternsIntro}
        </Prose>
      ) : null}

      {/* block: conflict-patterns/rows */}
      {/* ── ONE CARD, A ROW PER PATTERN ──────────────────────────────────
          The website draws the four patterns as rows inside one card, divided
          by a hairline. The app drew a card each, so four readings of one
          measure read as four separate findings, which is the same mistake the
          comms glance used to make with its dimensions.

          Three other things were the website's and are here now: the
          definition line under each name, the bar filled the way the website
          fills it, and the label over the advice, which reads differently when
          a pattern is rare. Ellie: "Conflict styles detailed pages don't match
          the site's formatting." */}
      <View style={card}>
        {you.ranked.map((p, i) => {
          const v = p.value ?? 0;
          const color = content.bandColors[Math.min(v, content.bandColors.length - 1)] || PANEL_EDGE;
          const label = content.frequencyLabels[v] || '';
          const copy = content.patternCopy[p.key] || {};
          // The band entries are objects and the label and definition are
          // strings, in one map, which is how the website writes it.
          const band = copy[String(v)];
          const note = typeof band === 'object' ? band?.note : null;
          const definition = typeof copy.definition === 'string' ? copy.definition : null;
          // Sometimes and Often get the action; Rarely gets the awareness note;
          // Never gets neither. Attaching an instruction to a pattern that is
          // not happening would read as a warning about nothing.
          const advice = v >= 2 ? content.patternActions[p.key] : v === 1 ? content.patternNotes[p.key] : null;
          const adviceLabel = v >= 2 ? ADVICE_TRY : ADVICE_KEEP;

          return (
            <View
              key={p.key}
              style={{
                paddingTop: i === 0 ? 0 : Spacing.lg,
                marginTop: i === 0 ? 0 : Spacing.lg,
                borderTopWidth: i === 0 ? 0 : 1, borderTopColor: PANEL_EDGE,
              }}>
              <Text style={{ ...Type.cardTitle, color: Palette.white }}>{titleFor(p.key)}</Text>
              {definition ? (
                <Text style={{ ...Type.small, color: INK_QUIET, marginTop: 2 }}>{definition}</Text>
              ) : null}

              {/* Frequency named above the bar, in the bar's own colour, so the
                  colour is never the only thing carrying the meaning. */}
              <Text style={{ ...Type.small, color, fontWeight: '700', textAlign: 'right', marginTop: Spacing.md }}>
                {label}
              </Text>
              <View style={{ height: 5, borderRadius: Radius.pill, backgroundColor: PANEL_EDGE, marginTop: Spacing.xs, overflow: 'hidden' }}>
                {/* The website's fill: the band as a share of the top band,
                    with a sliver left visible at zero so the track reads as a
                    measure rather than as an empty box. The app filled a
                    quarter of the bar for a pattern that never happens. */}
                <View style={{ width: `${Math.max((v / 3) * 100, 3)}%`, height: 5, backgroundColor: color }} />
              </View>

              {note ? (
                <Prose style={{ ...Type.body, color: INK, marginTop: Spacing.md }}>{note}</Prose>
              ) : null}

              {advice ? (
                /* ── WHITE ON NEAR-WHITE ────────────────────────────────
                   Ellie: "Text is invisible in conflict patterns tile."

                   It was: the tile was #F4F7FF and everything in it had been
                   converted to white when the page moved onto the dark
                   gradient. The tile itself was the one thing the conversion
                   missed, so three lines of white type sat on a white panel.
                   A ghost band, like every other panel on these pages. */
                <View style={{ marginTop: Spacing.md, backgroundColor: PANEL_BAND, borderColor: PANEL_EDGE, borderWidth: 1, borderRadius: Radius.md, padding: Spacing.lg }}>
                  <Text style={{ ...Type.eyebrow, fontSize: 9, color: 'rgba(255,255,255,0.75)', marginBottom: Spacing.xs }}>
                    {adviceLabel}
                  </Text>
                  {v >= 2 && advice.title ? (
                    <Text style={{ ...Type.cardTitle, color: Palette.white, marginBottom: 2 }}>{advice.title}</Text>
                  ) : null}
                  <Prose style={{ ...Type.body, color: INK }}>{advice.body || ''}</Prose>
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    </PageTile>
  );
}

/** What You Each Wrote. Only the questions you both answered knowing they were shared. */
function Wrote({ data, ground = null, groundStops = null, step = null }: {
  data: Extract<ConflictResults, { ready: true }>;
  ground?: string[] | null; groundStops?: number[] | null;
  step?: { index: number; total: number } | null;
}) {
  const { you, partner, names, content } = data;

  /**
   * The rows and their headings come from the server, in the server's order.
   *
   * This listed three rows with headings written here: 'What already works',
   * 'Looking back' and 'What you appreciate'. The website shows two, under
   * different headings again, so the same answers sat under different words on
   * the two products and neither set was anywhere the other could read.
   *
   * The third row was `strength`, which is c8: a picked option, not written
   * text. "The thing you do that most often helps you reset mid-conflict"
   * answers with something like "Taking a break", and it was being printed as
   * prose on a page called What You Each Wrote. The website has never shown
   * it. Dropped here to match, and flagged: an answer collected and displayed
   * nowhere is a question worth asking about, not one to quietly keep drawing
   * in one place.
   */
  const written: Record<string, string | null> = {
    reflection: you.reflection, appreciation: you.appreciation,
  };
  const theirWritten: Record<string, string | null> = {
    reflection: partner?.reflection ?? null, appreciation: partner?.appreciation ?? null,
  };
  const rows = (content.wroteRows || [])
    .map((r) => ({ label: r.label, mine: written[r.key] ?? null, theirs: theirWritten[r.key] ?? null }))
    .filter((r) => r.mine || r.theirs);

  if (!rows.length) {
    return (
      <PageTile ground={ground} locations={groundStops}>
        <StepCount step={step} />
      <PageHead copy={content.copy} title={content.copy.wroteTitle} shared />
        <Text style={{ ...Type.body, color: INK_QUIET }}>
          Neither of you wrote anything on these questions.
        </Text>
      </PageTile>
    );
  }

  return (
    /* ── THE PAGE HAD NO TILE ──────────────────────────────────────────────
       Ellie: "What you each wrote white text is invisible. Missing that page's
       tile, I want all insights pages to be in a tile."

       Both true and the same cause: this function has two returns, the empty
       state and the page, and the conversion to PageTile replaced the first
       one. So the empty state got a dark tile and the page itself stayed a
       bare scroll on cream, with type that had already been turned white for
       the tile it never got. A replacement that stops at the first match is
       how half a function gets converted. */
    <PageTile ground={ground} locations={groundStops}>
      {/* block: conflict-wrote/head */}
      <StepCount step={step} />
      <PageHead copy={content.copy} title={content.copy.wroteTitle} shared />
      {/* block: conflict-wrote/rows */}
      {/* The label, then the two quote cards. No outer card: the website has
          the pair sitting on the page under its heading, and a white card
          around two cream ones is a box in a box. */}
      {rows.map((r) => (
        <View key={r.label} style={{ marginBottom: Spacing.xl }}>
          <Text style={{ ...Type.eyebrow, color: INK_QUIET, marginBottom: Spacing.md }}>{r.label}</Text>
          <Written name={names.you} text={r.mine} />
          <Written name={names.partner} text={r.theirs} />
        </View>
      ))}
    </PageTile>
  );
}

// ── Pieces ─────────────────────────────────────────────────────────────────

/**
 * One person's answer to one snapshot question: their name, then the answer in
 * the website's blue pill.
 *
 * The reader's own column carries the section's blue and their partner's is
 * grey, which is the distinction the website draws between the two columns of
 * its table and the only thing on the row saying which is which at a glance.
 */
function SnapshotCell({ name, text, own = false }: { name: string; text: string; own?: boolean }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ ...Type.eyebrow, fontSize: 9, color: own ? accentBlue : c.textMuted, marginBottom: Spacing.xs }}>
        {name}
      </Text>
      <View
        style={{
          alignSelf: 'flex-start',
          backgroundColor: own ? '#EEF3FF' : Palette.warm,
          borderColor: own ? `${accentBlue}33` : c.border, borderWidth: 1,
          borderRadius: Radius.pill, paddingVertical: 5, paddingHorizontal: Spacing.md,
        }}>
        <Text style={{ ...Type.small, fontWeight: '600', color: own ? accentBlue : c.textMuted }}>
          {text}
        </Text>
      </View>
    </View>
  );
}

// Chip, a dot and a name against a value, drew the snapshot before it became
// a table. Nothing uses that shape now.

function RepairColumn({ title, items, accent }: {
  title: string; items: string[]; accent?: string;
}) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ ...Type.eyebrow, fontSize: 9, color: c.textMuted, marginBottom: Spacing.sm }}>
        {title}
      </Text>
      {/* The rank in the section's colour, hanging beside the item rather than
          run into it as "1. ". That is how the website draws it, and it is what
          makes the column read as an order rather than a list. */}
      {(items || []).slice(0, 3).map((item, i) => (
        <View key={item} style={{ flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm }}>
          <Text style={{ ...Type.small, fontWeight: '700', color: accent || c.textStrong }}>{i + 1}</Text>
          <Text style={{ ...Type.small, color: c.text, flex: 1 }}>{item}</Text>
        </View>
      ))}
      {!items?.length ? <Text style={{ ...Type.small, color: c.textMuted }}>Not answered.</Text> : null}
    </View>
  );
}

/**
 * One person's written answer, as the website's quote card.
 *
 * It was a coloured left rule with the text beside it in the body face. The
 * website draws a cream card with the name in small amber caps and the answer
 * in italics inside quotation marks, which is what makes it read as something
 * a person wrote rather than something the product is saying.
 *
 * It also renders when there is no answer, with the website's own line, so a
 * pair reads as a pair. The app returned null, so a question one of you had
 * skipped showed a single card with nothing saying the other half was empty.
 */
/**
 * One person's answer, quoted.
 *
 * A cream card with brown type, which was right while this page was cream and
 * is the last thing on it that had not moved. Ghost, like every other panel on
 * these pages now.
 */
function Written({ name, text }: { name: string; text: string | null }) {
  return (
    <View
      style={{
        backgroundColor: PANEL, borderColor: PANEL_EDGE, borderWidth: 1,
        borderRadius: Radius.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
        marginBottom: Spacing.md,
      }}>
      <Text
        style={{
          ...Type.eyebrow, fontSize: 9, color: 'rgba(255,255,255,0.7)', marginBottom: Spacing.xs,
        }}>
        {name}
      </Text>
      <Prose
        style={{
          ...Type.body, color: Palette.white, lineHeight: 24,
          fontStyle: text ? 'italic' : 'normal',
        }}>
        {text ? `“${text}”` : 'No answer given.'}
      </Prose>
    </View>
  );
}

/**
 * Where a snapshot row's answer sits on a summary's `openings`.
 *
 * This was three ifs mapping question ids to field names, written here and
 * nowhere else. The row carries its own field now, from SNAPSHOT_ROWS, so the
 * website can read the same data without a second copy of the mapping.
 */
function pickChip(openings: ConflictOpenings, field: string) {
  return (openings as Record<string, string | null>)[field] ?? null;
}

/**
 * The text for a forced-A/B answer.
 *
 * ── WHAT WAS WRONG ────────────────────────────────────────────────────────
 * This read `value === 0 ? chips.A : chips.B`. The exercise stores the letter,
 * not an index: setAns(q.id, 'A'). So 'A' === 0 was false and every A answer
 * printed the B text. All three snapshot rows told each partner the opposite
 * of what they had said, on a page whose whole job is showing what they said.
 *
 * It survived because the type said `number`. Declaring the wrong type for a
 * value is worse than declaring none: tsc then enforces the mistake and every
 * reader downstream trusts it.
 *
 * The chips are keyed by the stored letter, so the answer indexes them
 * directly, which is what the website has always done.
 */
function chipText(chips: Record<string, string> | undefined, value: string | null) {
  if (!chips || value == null) return 'Not answered';
  return chips[value] || 'Not answered';
}

/** Pattern names. The only strings this file owns, and they are labels. */
const TITLES: Record<string, string> = {
  criticism: 'Criticism',
  contempt: 'Contempt',
  defensiveness: 'Defensiveness',
  stonewalling: 'Stonewalling',
};
const titleFor = (key: string) => TITLES[key] || key;

const pad = {
  paddingHorizontal: Spacing.xl, paddingBottom: BottomTabInset + Spacing.xxl,
  maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center',
} as const;

const card = {
  backgroundColor: c.surface, borderColor: c.border, borderWidth: 1,
  borderRadius: Radius.lg, padding: Spacing.lg,
} as const;

/** The same card on the glance screen's dark ground, as the website draws it. */
const darkCard = {
  backgroundColor: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.14)',
  borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.lg,
} as const;
