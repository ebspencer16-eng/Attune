/**
 * The results experience.
 *
 * Renders what /api/results returns and computes nothing. That is the rule this
 * product cannot bend: two scorers drifting apart is how it starts lying to
 * people. Every number here arrives already worked out, and every word arrives
 * already written.
 *
 * Structure follows app/SCREENS.md. A section list is the spine. A glance
 * screen sits above the detail for each section, and the two look different on
 * purpose: glance screens invert onto a coloured ground, detail screens stay on
 * the warm one. That contrast is how the web signals summary against detail,
 * and someone moving between the two should not have to relearn it.
 *
 * Sections appear only when the payload carries what they need. A section that
 * renders empty because the server did not send its content reads as a broken
 * product, and a section invented in the app is a second copy of a rule.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';

import CoupleMap from '@/components/couple-map';
import EdgeFadedRow from '@/components/edge-faded-row';
import { LinearGradient } from 'expo-linear-gradient';

import { fetchConflictResults } from '@/api/client';
import type {
  ConflictResults, CoupleResults, ExpectationRow, ExpectationsSummary,
  CommsPlan, HighlightCard, IntimacyDimension, IntimacyResults, NextStepGroup,
  ReflectionInsight, ReflectionResults, ResultDimension, ResultsNavGroup, ResultsSection,
} from '@/api/client';
import ConflictResultsView from '@/components/conflict-results';
import HighlightCards from '@/components/highlight-cards';
import { Eyebrow } from '@/components/screen-states';
import {
  BlueGround, BottomTabInset, Colors, MaxContentWidth, Palette, Radius, SectionColor, Spacing, Type,
} from '@/constants/attune-theme';

/**
 * One colour per person, everywhere.
 *
 * The markers first took their colour from the dimension, so the same person
 * was orange on one row and blue on the next and the eye had to re-learn who
 * was who on every card. A person is a colour; a dimension is a row.
 */
const YOU_COLOR = Palette.orange;
// The website's partner colour on every chart it draws: #1B5FE8, which is
// Palette.indigo. The app used ink, so the same two people were orange and
// blue on the site and orange and black here.
const THEM_COLOR = Palette.indigo;

const c = Colors.light;

/**
 * How much room every results section leaves at the bottom.
 *
 * The previous and next buttons used to sit under the content and carried
 * BottomTabInset, so they were what kept the last card clear of the tab bar.
 * Removing them took that with it, and the last paragraph of every section
 * would have run underneath Home and Insights. The clearance belongs to the
 * scrolling content, not to a row that happened to be there.
 */
const ResultsBottomInset = BottomTabInset + Spacing.lg;

/**
 * How many protocols the Communication overview shows.
 *
 * The website's limit, named there as COMMS_PROTOCOL_LIMIT in src/App.jsx.
 * Two surfaces showing a different number of the same list is the shape of
 * bug this codebase keeps having, so if this changes, change it there too.
 */
const COMMS_PROTOCOL_LIMIT = 3;

/**
 * Why a section someone owns cannot open yet.
 *
 * Mapped from the server's own reason rather than inferred, so the app never
 * explains a lock it does not understand. An unrecognised reason falls back to
 * saying it is not ready, which is true of every case.
 */
function lockReason(reason: string): string {
  if (reason === 'you_have_not_finished') return 'Finish the exercise to open this';
  if (reason === 'partner_has_not_finished') return 'Waiting on your partner';
  return 'Not ready yet';
}

/** Replace {U} and {P} with the two names, from this reader's point of view. */
function interp(text: string | null | undefined, you: string, them: string): string {
  if (!text) return '';
  return text.replace(/\{U\}/g, you).replace(/\{P\}/g, them);
}

/**
 * The section the reader was last on, for the lifetime of the process.
 *
 * Deliberately not persisted and deliberately not in a store. See the note in
 * the component.
 */
let lastSection: string | null = null;

/**
 * Forget where the last reader was.
 *
 * `lastSection` is module state, so it outlives a sign-out. Without this the
 * next person to sign in on the same device lands on whatever section the
 * previous one was reading, which at best is disorienting and at worst opens
 * on Physical Intimacy for someone who has just arrived.
 */
export function forgetLastSection() {
  lastSection = null;
}

export default function Results({
  results, owned = [], sections: fromServer, nav = [], highlights = [],
  expectations = null, intimacy = null, reflection = null, whatComesNext = null,
  commsPlan = null, commDomains = [], commResponses = [], storycardStyle = null,
  reflectionPlan = null,
}: {
  results: CoupleResults;
  owned?: string[];
  sections?: ResultsSection[];
  nav?: ResultsNavGroup[];
  highlights?: HighlightCard[];
  commsPlan?: CommsPlan | null;
  commDomains?: CommDomain[];
  commResponses?: SbsRow[];
  storycardStyle?: StorycardStyle | null;
  reflectionPlan?: ReflectionInsight[] | null;
  expectations?: ExpectationsSummary | null;
  intimacy?: IntimacyResults | null;
  reflection?: ReflectionResults | null;
  whatComesNext?: { groups: NextStepGroup[] } | null;
}) {
  // The spine comes from the server, in the server's order, with the server's
  // names. It used to be six entries written here against the website's
  // twenty-nine, so a couple who owned Expectations saw five conversation
  // screens on a laptop and none at all on their phone.
  //
  // The fallback covers a cached payload written before the server sent this.
  const sections: ResultsSection[] = fromServer?.length
    ? fromServer
    : [{ id: 'highlights', label: 'Highlights' }, { id: 'couple-type', label: 'Couple Type' }];

  // ── WHY THIS IS NOT PLAIN STATE ──────────────────────────────────────────
  // All four tabs mount at startup and the Insights screen remounts every time
  // you come back to it, so plain state put the reader back on Highlights on
  // every tab switch. Reaching Communication and then checking something on
  // Home meant finding Communication again, which undoes the point of a nav
  // you can jump around in.
  //
  // Module scope rather than a store: it is one string, it should not outlive
  // the process, and it must not be persisted, because a section a couple no
  // longer owns should not be restored on next launch.
  const [sectionId, setSectionId] = useState<string>(lastSection || sections[0]?.id || 'highlights');
  const rememberSection = useCallback((id: string) => { lastSection = id; setSectionId(id); }, []);

  /**
   * The nav, two levels, from the server.
   *
   * The fallback groups the flat section list into one page each, which is
   * what a cached payload from before the nav existed can still render.
   */
  const groups: ResultsNavGroup[] = nav.length
    ? nav
    : sections.map((s) => ({ id: s.id, label: s.label }));

  /** Which group the page being read belongs to. */
  const groupOf = (id: string) =>
    groups.find((g) => g.id === id || g.children?.some((ch) => ch.id === id)) ?? null;

  /**
   * Keep both rows following the reader.
   *
   * Twenty-nine sections is far wider than a phone, so moving forward left the
   * entry for the page you were reading off to the right, and the row then
   * claimed you were still at the start.
   */
  const topNav = useRef<ScrollView>(null);
  const pageNav = useRef<ScrollView>(null);
  const groupX = useRef<Record<string, number>>({});
  const pageX = useRef<Record<string, number>>({});
  const section = sections.some((s) => s.id === sectionId) ? sectionId : (sections[0]?.id ?? 'highlights');
  const activeGroup = groupOf(section);

  useEffect(() => {
    // A little to the left of each, so the active entry does not sit flush
    // against the edge and look like the row starts there.
    const gx = activeGroup ? groupX.current[activeGroup.id] : undefined;
    if (gx != null) topNav.current?.scrollTo({ x: Math.max(0, gx - Spacing.xl), animated: true });
    const px = pageX.current[section];
    if (px != null) pageNav.current?.scrollTo({ x: Math.max(0, px - Spacing.xl), animated: true });
  }, [section, activeGroup]);

  // Conflict Patterns is a separate payload with its own privacy rules, so it
  // is fetched separately rather than folded into /api/results. Not owning the
  // add-on comes back as ready:false, which is a normal state, not an error.
  const [conflict, setConflict] = useState<ConflictResults | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetchConflictResults();
      if (!cancelled && res.ok) setConflict(res.data);
    })();
    return () => { cancelled = true; };
  }, []);

  const content = results.content;
  const dims = content?.dimensions ?? [];

  // Which half of the payload is the reader.
  //
  // This used to assume `a` was you. It is not: stored results are keyed by the
  // two user ids in sorted order, so `a` is whichever id sorts lower. For one
  // partner in every couple that assumption put their partner's name on their
  // own answers and swapped both marks on every scale.
  //
  // Defaults to 'a' only so an older cached payload without the field renders
  // rather than blanking.
  const viewer = content?.viewer ?? 'a';
  const you = (viewer === 'a' ? content?.names?.a : content?.names?.b) || 'You';
  const them = (viewer === 'a' ? content?.names?.b : content?.names?.a) || 'Your partner';

  // How wide a gap has to be to be called wide. From the server.
  const wideGap = content?.alignmentThreshold?.gap ?? null;

  const byDomain = useMemo(() => ({
    inner: dims.filter((d) => d.domain === 'inner'),
    connection: dims.filter((d) => d.domain === 'connection'),
    hard: dims.filter((d) => d.domain === 'hard'),
  }), [dims]);

  // Conflict sections are listed by the server on ownership alone, matching
  // the website. They can still be waiting on a partner, which is a different
  // state from not owning it and reads as a bug if the section just vanishes.
  const conflictWaiting = section.startsWith('conflict-') && !conflict?.ready;

  return (
    <View style={{ flex: 1 }}>
      {/* Two levels, the same as the sidebar on the website.
          Top row is the sections; the row under it is the pages inside the one
          you are in. A group with no pages of its own shows no second row. */}
      <EdgeFadedRow
        ref={topNav}
        gap={Spacing.sm}
        contentContainerStyle={{ paddingBottom: Spacing.md }}>
        {groups.map((g) => {
          const on = g.id === activeGroup?.id;
          return (
            <Pressable
      accessibilityRole="button"
              key={g.id}
              onPress={() => rememberSection(g.children?.length ? g.children[0].id : g.id)}
              onLayout={(e) => { groupX.current[g.id] = e.nativeEvent.layout.x; }}
              style={{
                paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg,
                minHeight: 36, justifyContent: 'center',
                borderRadius: Radius.pill,
                backgroundColor: on ? (g.color || c.textStrong) : c.surface,
                borderColor: on ? (g.color || c.textStrong) : c.border,
                borderWidth: 1,
              }}>
              <Text
                numberOfLines={1}
                style={{
                  ...Type.small, fontWeight: '700', lineHeight: 18,
                  color: on ? Palette.white : c.textMuted,
                }}>
                {g.shortLabel || g.label}
              </Text>
            </Pressable>
          );
        })}
      </EdgeFadedRow>

      {activeGroup?.children?.length ? (
        <EdgeFadedRow
          ref={pageNav}
          gap={Spacing.lg}
          contentContainerStyle={{ paddingBottom: Spacing.md }}>
          {activeGroup.children.map((child) => {
            const on = child.id === section;
            return (
              <Pressable
      accessibilityRole="button"
                key={child.id}
                onPress={() => rememberSection(child.id)}
                onLayout={(e) => { pageX.current[child.id] = e.nativeEvent.layout.x; }}
                style={{ paddingVertical: Spacing.xs, minHeight: 28, justifyContent: 'center' }}>
                <Text
                  numberOfLines={1}
                  style={{
                    ...Type.small, lineHeight: 18,
                    fontWeight: on ? '700' : '400',
                    color: on ? (activeGroup.color || c.textStrong) : c.textMuted,
                  }}>
                  {child.label}
                </Text>
                {/* Underline rather than a second row of pills: two rows of
                    pills reads as two equal choices, and these are not. */}
                <View
                  style={{
                    height: 2, marginTop: 2, borderRadius: Radius.pill,
                    backgroundColor: on ? (activeGroup.color || c.textStrong) : 'transparent',
                  }}
                />
              </Pressable>
            );
          })}
        </EdgeFadedRow>
      ) : null}

      <View style={{ flex: 1 }}>
        <SectionBody
          section={section}
          expectations={expectations}
          highlights={highlights}
          commsPlan={commsPlan}
          commDomains={commDomains}
          commResponses={commResponses}
          storycardStyle={storycardStyle}
          reflectionPlan={reflectionPlan}
          intimacy={intimacy}
          reflection={reflection}
          whatComesNext={whatComesNext}
          onGoToSection={rememberSection}
          results={results}
          conflict={conflict}
          conflictWaiting={conflictWaiting}
          byDomain={byDomain}
          you={you}
          them={them}
          viewer={viewer}
          wideGap={wideGap}
        />
      </View>
      {/* No previous and next buttons.
          They ran across the bottom of every results page, taking a strip of
          the screen on the longest pages in the product to offer a move the
          nav above already offers, by name, to any section rather than only
          the adjacent one. Reading results is not a wizard. */}
    </View>
  );
}

/**
 * Which content a section id shows.
 *
 * One place, so adding a section is adding a case rather than editing a
 * conditional buried in the nav. Section ids are the server's, and are the same
 * ids notes anchor to, so a note written against a section keeps pointing at
 * the same screen.
 */
function SectionBody({
  section, results, conflict, conflictWaiting, byDomain, you, them, viewer, wideGap,
  expectations, highlights, commsPlan, commDomains, commResponses, storycardStyle, reflectionPlan,
  intimacy, reflection, whatComesNext, onGoToSection,
}: {
  section: string;
  expectations: ExpectationsSummary | null;
  highlights: HighlightCard[];
  commsPlan: CommsPlan | null;
  commDomains: CommDomain[];
  commResponses: SbsRow[];
  storycardStyle: StorycardStyle | null;
  reflectionPlan: ReflectionInsight[] | null;
  intimacy: IntimacyResults | null;
  reflection: ReflectionResults | null;
  whatComesNext: { groups: NextStepGroup[] } | null;
  onGoToSection: (id: string) => void;
  results: CoupleResults;
  conflict: ConflictResults | null;
  conflictWaiting: boolean;
  byDomain: { inner: ResultDimension[]; connection: ResultDimension[]; hard: ResultDimension[] };
  you: string; them: string; viewer: 'a' | 'b'; wideGap: number | null;
}) {
  if (section === 'highlights') {
    // The storycards, the same nine the website shows. This was a summary
    // panel written for the app, which meant the first screen of results was
    // the one place the two products disagreed most.
    if (highlights.length) {
      {/* block: highlights/storycards */}
      return (
        <HighlightCards
          cards={highlights}
          accent={results.content?.coupleType?.color || null}
          style={storycardStyle}
          onDone={() => onGoToSection('couple-type')}
        />
      );
    }
    return <Glance results={results} you={you} them={them} viewer={viewer} wideGap={wideGap} />;
  }
  if (section === 'couple-type') return <CoupleType results={results} you={you} them={them} />;

  if (section === 'comm-overview') {
    return (
      <Glance
        results={results} you={you} them={them} viewer={viewer} wideGap={wideGap}
        plan={commsPlan}
      />
    );
  }
  // The three domain pages, all from the server's own list: its label, its
  // colour, its opening paragraph and the gradient the website paints it. The
  // app used to hard-code the first three and have none of the last two.
  const DOMAIN_SECTION: Record<string, 'inner' | 'connection' | 'hard'> = {
    'comm-inner': 'inner', 'comm-connection': 'connection', 'comm-hard': 'hard',
  };
  const domainId = DOMAIN_SECTION[section];
  if (domainId) {
    const d = commDomains.find((x) => x.id === domainId) ?? null;
    return (
      <Domain
        title={d?.label || ''}
        accent={d?.color || c.accent}
        dims={byDomain[domainId]}
        tile={commsPlan?.tiles?.find((t) => t.domain === domainId) ?? null}
        domain={d}
        responses={commResponses}
        you={you}
        them={them}
        viewer={viewer}
      />
    );
  }

  if (section === 'exp-overview') {
    return <ExpectationsOverview summary={expectations} you={you} them={them} />;
  }
  if (section.startsWith('exp-convo-')) {
    const all = expectations?.categories ?? [];
    const at = all.findIndex((cat) => cat.section === section);
    const bucket = at >= 0 ? all[at] : null;
    return (
      <ExpectationsConversation
        bucket={bucket}
        you={you}
        them={them}
        position={at >= 0 ? { index: at + 1, total: all.length } : null}
      />
    );
  }

  if (section === 'what-comes-next') {
    return <WhatComesNext data={whatComesNext} onGoToSection={onGoToSection} />;
  }

  if (section === 'reflection-overview') return <ReflectionOverview data={reflection} />;
  if (section === 'reflection-ratings') return <ReflectionRatings data={reflection} />;
  if (section === 'reflection-story') return <ReflectionStory data={reflection} />;
  if (section === 'reflection-plan') return <ReflectionPlan data={reflection} insights={reflectionPlan} />;

  if (section === 'intimacy-overview') return <IntimacyOverview data={intimacy} you={you} them={them} />;
  if (section === 'intimacy-plan') return <IntimacyConversations data={intimacy} />;
  if (section.startsWith('intimacy-')) {
    const dim = intimacy?.dimensions.find((d) => d.section === section) ?? null;
    return <IntimacyDimensionView dim={dim} you={you} them={them} />;
  }

  if (section.startsWith('conflict-')) {
    // ready:false carries the reason; ready:true does not have the field at
    // all, which is why this is a narrow rather than a cast.
    if (!conflict || !conflict.ready) {
      return (
        <Waiting
          title="Conflict Patterns"
          body={conflict ? lockReason(conflict.reason) : 'Loading your conflict results.'}
        />
      );
    }
    return <ConflictResultsView data={conflict} section={section} />;
  }

  // A section the website renders and the app does not yet. Named rather than
  // hidden: this list is the server's, so a missing screen is a gap in the app,
  // not a section the couple does not have. Saying which one is missing is the
  // difference between a known gap and a bug.
  return <NotYet section={section} />;
}

function ExpectationsOverview({
  summary, you, them,
}: { summary: ExpectationsSummary | null; you: string; them: string }) {
  if (!summary) {
    return (
      <Waiting
        title="Expectations"
        body="This opens when you have both finished Expectations."
      />
    );
  }

  // The website's page, in the website's order: the two counts, alignment by
  // category, then the conversations. It carries no framing prose and neither
  // does this. What was here was written for the app and appears nowhere in
  // the product.
  const categories = [
    ...summary.categories.filter((cat) => cat.answered > 0),
    ...(summary.life.length ? [{
      section: 'life',
      // The website's name for this category, from the server. The app used
      // to call it "The bigger questions", which is nowhere in the product.
      label: summary.lifeLabel || 'Life & Values',
      answered: summary.life.length,
      aligned: summary.life.filter((r) => r.aligned).length,
      differences: summary.life.filter((r) => !r.aligned).length,
      rows: summary.life,
    }] : []),
  ];
  const conversations = categories.filter((cat) => cat.rows.some((r) => !r.aligned));
  const gaps = categories.flatMap((cat) => cat.rows.filter((r) => !r.aligned));

  return (
    /* Dark, like the website's Expectations landing page. The app drew it on
       cream, which is why it did not look like the same section. */
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={['#2E2A6B', '#4C56C0', '#1B8FA8']}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: ResultsBottomInset }}>
        <View style={{ paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}>
          <Text style={{ ...Type.hero, color: Palette.white }}>{you} & {them}</Text>

          <View style={{ flexDirection: 'row', gap: Spacing.xl, marginTop: Spacing.md }}>
            <Text style={{ ...Type.body, color: 'rgba(255,255,255,0.7)' }}>
              Already aligned: <Text style={{ fontWeight: '700', color: Palette.white }}>{summary.aligned}</Text>
            </Text>
            <Text style={{ ...Type.body, color: 'rgba(255,255,255,0.7)' }}>
              Worth discussing: <Text style={{ fontWeight: '700', color: Palette.white }}>{summary.differences}</Text>
            </Text>
          </View>

          {/* ── ALIGNMENT BY CATEGORY: ONE TILE ──────────────────────────
              The website puts every category in a single panel as a row of
              label, bar and percentage. The app drew a bordered card each, so
              six categories read as six findings. */}
          <View
            style={{
              marginTop: Spacing.xl,
              backgroundColor: 'rgba(255,255,255,0.10)',
              borderColor: 'rgba(255,255,255,0.16)', borderWidth: 1,
              borderRadius: Radius.lg, padding: Spacing.lg,
            }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.md }}>
              {/* block: exp-overview/by-category */}
              <Text style={{ ...Type.eyebrow, color: 'rgba(255,255,255,0.75)' }}>Alignment by category</Text>
              <Text style={{ ...Type.small, fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>% aligned</Text>
            </View>
            <View style={{ gap: Spacing.sm }}>
              {categories.map((cat) => {
                const pct = cat.answered ? Math.round((cat.aligned / cat.answered) * 100) : 0;
                const bar = pct >= 80 ? '#10b981' : pct >= 50 ? '#F5B841' : '#E8673A';
                return (
                  <View key={cat.section} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                    <Text style={{ ...Type.small, fontSize: 11, color: 'rgba(255,255,255,0.65)', width: 104 }}>
                      {cat.label}
                    </Text>
                    <View style={{ flex: 1, height: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                      <View style={{ width: `${pct}%`, height: 6, backgroundColor: bar, borderRadius: 999 }} />
                    </View>
                    <Text style={{ ...Type.small, fontSize: 11, fontWeight: '700', color: bar, width: 34, textAlign: 'right' }}>
                      {pct}%
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>

          {/* ── CONVERSATIONS TO HAVE ────────────────────────────────────
              One line of summary, then a dropdown per category, which is what
              the website does. The app listed every differing row flat, and
              carried a paragraph of its own about each one that the website
              does not print anywhere. */}
          {conversations.length ? (
            <View style={{ marginTop: Spacing.xxl }}>
              {/* block: exp-overview/conversations */}
              <Text style={{ ...Type.eyebrow, color: 'rgba(255,255,255,0.75)', marginBottom: Spacing.sm }}>
                Conversations to have
              </Text>
              <Text style={{ ...Type.small, color: 'rgba(255,255,255,0.62)', marginBottom: Spacing.md, lineHeight: 19 }}>
                {`${gaps.length} topic${gaps.length !== 1 ? 's' : ''} where your assumptions differ, across ${conversations.length} area${conversations.length !== 1 ? 's' : ''}. Open an area to see its full list.`}
              </Text>
              <View style={{ gap: Spacing.md }}>
                {conversations.map((cat) => (
                  <CategoryDrawer
                    key={cat.section}
                    label={cat.label}
                    items={cat.rows.filter((r) => !r.aligned).map((r) => r.item)}
                    color={SectionColor.expectations}
                  />
                ))}
              </View>
            </View>
          ) : (
            <View
              style={{
                marginTop: Spacing.xxl, borderRadius: Radius.lg, padding: Spacing.xl,
                backgroundColor: 'rgba(16,185,129,0.16)',
                borderColor: 'rgba(16,185,129,0.35)', borderWidth: 1,
              }}>
              <Text style={{ ...Type.cardTitle, color: Palette.white, textAlign: 'center' }}>
                Aligned across every area.
              </Text>
              <Text style={{ ...Type.small, color: 'rgba(255,255,255,0.75)', textAlign: 'center', marginTop: Spacing.xs }}>
                Nothing to work through. Keep staying current with each other.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

/**
 * One category, collapsed, with its differing topics inside.
 *
 * The website's `<details>`: a summary row carrying the label, the count, the
 * word "Show" and a chevron so it reads as openable, then a checkbox line per
 * topic. Collapsed by default so the page stays scannable.
 */
function CategoryDrawer({ label, items, color }: { label: string; items: string[]; color: string }) {
  const [open, setOpen] = useState(false);
  return (
    <View
      style={{
        borderRadius: Radius.lg, overflow: 'hidden',
        backgroundColor: 'rgba(255,255,255,0.13)',
        borderColor: 'rgba(255,255,255,0.22)', borderWidth: 1,
        borderLeftColor: color, borderLeftWidth: 4,
      }}>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          gap: Spacing.sm, paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg,
          backgroundColor: 'rgba(255,255,255,0.09)',
        }}>
        <Text style={{ ...Type.eyebrow, color: 'rgba(255,255,255,0.95)', flex: 1 }}>{label}</Text>
        <Text style={{ ...Type.small, fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>
          {`${items.length} topic${items.length !== 1 ? 's' : ''}`}
        </Text>
        <Text style={{ ...Type.small, fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>Show</Text>
        <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13 }}>{open ? '\u25B4' : '\u25BE'}</Text>
      </Pressable>
      {open ? (
        <View style={{ borderTopColor: 'rgba(255,255,255,0.16)', borderTopWidth: 1 }}>
          {items.map((it) => (
            <View
              key={it}
              style={{
                flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm,
                paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg,
                borderBottomColor: 'rgba(255,255,255,0.1)', borderBottomWidth: 1,
              }}>
              <View
                style={{
                  width: 17, height: 17, borderRadius: 4, marginTop: 1,
                  borderColor: 'rgba(255,255,255,0.55)', borderWidth: 1.5,
                  backgroundColor: 'rgba(255,255,255,0.12)',
                }}
              />
              <Text style={{ ...Type.small, color: 'rgba(255,255,255,0.88)', flex: 1, lineHeight: 19 }}>{it}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** One conversation: every item in that category, differences first. */
function ExpectationsConversation({
  bucket, you, them, position,
}: {
  bucket: ExpectationsSummary['categories'][number] | null;
  you: string;
  them: string;
  position?: { index: number; total: number } | null;
}) {
  if (!bucket || bucket.answered === 0) {
    return (
      <Waiting
        title={bucket?.label || 'Expectations'}
        body="Neither of you answered anything in this area, so there is nothing to compare."
      />
    );
  }

  const gaps = bucket.rows.filter((r) => !r.aligned);
  const matched = bucket.rows.filter((r) => r.aligned);
  const ground = ['#443D8C', '#6F63D6', '#514AAE'] as [string, string, string];
  const accent = SectionColor.expectations;

  return (
    /* The website's page: dark, the category and its position in the set, a
       progress bar, the paragraph it opens with, then the differences as a
       two-column table and what you already agree on underneath. The app had
       a cream page, a summary sentence of its own and one card per row. */
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={ground}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: ResultsBottomInset }}>
        <View style={{ paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <Text style={{ ...Type.title, color: Palette.white, flex: 1 }}>{bucket.label}</Text>
            {position ? (
              <Text style={{ ...Type.small, fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
                {`${position.index} of ${position.total}`}
              </Text>
            ) : null}
          </View>

          {position ? (
            <View style={{ height: 2, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.1)', marginTop: Spacing.sm, marginBottom: Spacing.lg }}>
              <View style={{ height: 2, borderRadius: 2, backgroundColor: accent, width: `${(position.index / position.total) * 100}%` }} />
            </View>
          ) : null}

          {/* The paragraph the website opens this page with, from
              api/_lib/category-intros.js. The app opened straight into rows. */}
          {bucket.intro ? (
            <View
              style={{
                backgroundColor: 'rgba(255,255,255,0.07)',
                borderColor: 'rgba(255,255,255,0.13)', borderWidth: 1.5,
                borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.lg,
              }}>
              {/* The website names both people when the paragraph is the one
                  written for their pairing, and stays general when it is not. */}
              <Text style={{ ...Type.eyebrow, color: accent, marginBottom: Spacing.sm }}>
                {bucket.introIsForPair
                  ? `How ${you} & ${them} need to approach these conversations`
                  : 'How to approach these conversations'}
              </Text>
              <Text style={{ ...Type.body, color: 'rgba(255,255,255,0.85)', lineHeight: 24 }}>
                {bucket.intro}
              </Text>
            </View>
          ) : null}

          {/* block: exp-conversation/questions */}
          {gaps.length ? (
            <View style={{ backgroundColor: Palette.white, borderRadius: Radius.lg, overflow: 'hidden' }}>
              <View style={{ paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg, backgroundColor: `${accent}14` }}>
                <Text style={{ ...Type.eyebrow, color: accent }}>Conversations to have</Text>
              </View>
              <View style={{ flexDirection: 'row', paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm }}>
                <View style={{ flex: 1.6 }} />
                <Text style={{ ...Type.eyebrow, fontSize: 9, color: accent, flex: 1, textAlign: 'center' }}>{you}</Text>
                <Text style={{ ...Type.eyebrow, fontSize: 9, color: c.textMuted, flex: 1, textAlign: 'center' }}>{them}</Text>
              </View>
              {gaps.map((row, i) => (
                <View
                  key={row.key}
                  style={{
                    flexDirection: 'row', alignItems: 'center',
                    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg,
                    borderTopColor: `${accent}20`, borderTopWidth: i === 0 ? 0 : 1,
                  }}>
                  <Text style={{ ...Type.small, fontSize: 12, color: c.text, flex: 1.6, paddingRight: Spacing.sm, lineHeight: 17 }}>
                    {row.item}
                  </Text>
                  <Text style={{ ...Type.small, fontSize: 12, fontWeight: '700', color: c.textStrong, flex: 1, textAlign: 'center' }}>
                    {row.you || '\u2014'}
                  </Text>
                  <Text style={{ ...Type.small, fontSize: 12, fontWeight: '700', color: c.textMuted, flex: 1, textAlign: 'center' }}>
                    {row.them || '\u2014'}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}

          {/* What you already agree on. The website shows it in full, green
              tinted, with the shared answer beside each item. */}
          {matched.length ? (
            <View
              style={{
                marginTop: gaps.length ? Spacing.lg : 0,
                backgroundColor: 'rgba(16,185,129,0.07)',
                borderColor: 'rgba(16,185,129,0.3)', borderWidth: 1.5,
                borderRadius: Radius.lg, overflow: 'hidden',
              }}>
              <View
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
                  paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg,
                  backgroundColor: 'rgba(16,185,129,0.1)',
                  borderBottomColor: 'rgba(16,185,129,0.2)', borderBottomWidth: 1,
                }}>
                <Text style={{ ...Type.eyebrow, color: '#10B981', flex: 1 }}>Already aligned</Text>
                <Text style={{ ...Type.small, fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                  {`${matched.length} item${matched.length !== 1 ? 's' : ''}`}
                </Text>
              </View>
              {matched.map((row, i) => (
                <View
                  key={row.key}
                  style={{
                    flexDirection: 'row', alignItems: 'center',
                    paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg,
                    borderTopColor: 'rgba(16,185,129,0.12)', borderTopWidth: i === 0 ? 0 : 1,
                  }}>
                  <Text style={{ ...Type.small, fontSize: 12, color: 'rgba(255,255,255,0.6)', flex: 1.6, paddingRight: Spacing.sm, lineHeight: 17 }}>
                    {row.item}
                  </Text>
                  <Text
                    style={{
                      ...Type.small, fontSize: 12, fontWeight: '600',
                      color: 'rgba(255,255,255,0.75)', flex: 1, textAlign: 'center',
                      backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 6,
                      paddingVertical: 2, paddingHorizontal: 4,
                    }}>
                    {row.you || '\u2014'}
                  </Text>
                </View>
              ))}
              {!gaps.length ? (
                <View style={{ paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg, borderTopColor: 'rgba(16,185,129,0.15)', borderTopWidth: 1 }}>
                  <Text style={{ ...Type.small, fontSize: 12, color: 'rgba(16,185,129,0.85)' }}>
                    {`Fully aligned here. You and ${them} are on the same page across all ${matched.length} item${matched.length !== 1 ? 's' : ''}.`}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

/**
 * One item, with both answers.
 *
 * Both names are always shown, even when the two agree, because the answer is
 * the content here. A row that collapsed to a tick when two people matched
 * would hide the thing they matched on.
 */
function ExpectationRowView({
  row, you, them,
}: { row: ExpectationRow; you: string; them: string }) {
  return (
    <View
      style={{
        backgroundColor: c.surface, borderColor: c.border, borderWidth: 1,
        borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.md,
      }}>
      <Text style={{ ...Type.cardTitle, color: c.textStrong }}>{row.item}</Text>
      {row.prompt ? (
        <Text style={{ ...Type.small, color: c.textMuted, marginTop: Spacing.xs }}>{row.prompt}</Text>
      ) : null}

      <View style={{ flexDirection: 'row', gap: Spacing.lg, marginTop: Spacing.md }}>
        <View style={{ flex: 1 }}>
          <Text style={{ ...Type.eyebrow, color: c.accentQuiet }}>{you}</Text>
          <Text style={{ ...Type.body, color: c.text, marginTop: Spacing.xs }}>{row.you}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ ...Type.eyebrow, color: c.textMuted }}>{them}</Text>
          <Text style={{ ...Type.body, color: c.text, marginTop: Spacing.xs }}>{row.them}</Text>
        </View>
      </View>

    </View>
  );
}

/**
 * How far apart, said without a verdict.
 *
 * Four states, and none of them is a grade. "Different" is the interesting one
 * on a page about sex, not the bad one, and the colours reflect that: a single
 * quiet accent throughout rather than a run from green to red. A couple
 * reading that they are red on Frequency has been told something about
 * themselves that the exercise never measured.
 */
function DistanceBar({ pct, state }: { pct: number | null; state: string }) {
  if (pct == null) return null;
  return (
    <View style={{ marginTop: Spacing.md }}>
      <View style={{ height: 6, borderRadius: Radius.pill, backgroundColor: c.border, overflow: 'hidden' }}>
        <View style={{ width: `${Math.max(3, pct)}%`, height: 6, backgroundColor: c.accentQuiet }} />
      </View>
      <Text style={{ ...Type.small, color: c.textMuted, marginTop: Spacing.xs }}>
        {state === 'aligned' ? 'Close together'
          : state === 'discuss' ? 'Somewhat apart'
          : state === 'different' ? 'Furthest apart'
          : 'Not answered'}
      </Text>
    </View>
  );
}

function IntimacyOverview({ data, you, them }: { data: IntimacyResults | null; you: string; them: string }) {
  if (!data) {
    return <Waiting title="Physical Intimacy" body="This opens when you have both finished the exercise." />;
  }
  // The website's page: where you each land, then the action plan. It has no
  // framing paragraph, so neither does this. One written here would be the app
  // telling a couple something the product never told them.
  return (
    /* Dark rose, which is the website's ground for this section. The app drew
       it on cream. */
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={['#4A1B33', '#A34468', '#C8703E']}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: ResultsBottomInset }}>
        <View style={{ paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}>
          <Text style={{ ...Type.hero, color: Palette.white }}>Physical Intimacy Expectations</Text>

          {/* One panel, a row per dimension, each partner on the track. The app
              drew a card per dimension carrying one distance bar, which is a
              score where the website shows two people. */}
          <View
            style={{
              marginTop: Spacing.xl,
              backgroundColor: 'rgba(255,255,255,0.12)',
              borderColor: 'rgba(255,255,255,0.22)', borderWidth: 1,
              borderRadius: Radius.lg, padding: Spacing.lg,
            }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md }}>
              {/* block: intimacy-overview/where-you-each-land */}
              <Text style={{ ...Type.eyebrow, color: 'rgba(255,255,255,0.3)' }}>Where you each land</Text>
              <View style={{ flexDirection: 'row', gap: Spacing.md }}>
                {[{ n: you, col: YOU_COLOR }, { n: them, col: GLANCE_THEM }].map((x) => (
                  <View key={x.n} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: x.col }} />
                    <Text style={{ ...Type.small, fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{x.n}</Text>
                  </View>
                ))}
              </View>
            </View>
            <View style={{ gap: Spacing.xs }}>
              {data.dimensions.map((d) => (
                <View key={d.section} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                  <Text style={{ ...Type.small, fontSize: 11, color: 'rgba(255,255,255,0.65)', width: 100, lineHeight: 15 }}>
                    {d.label}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Slider
                      you={d.positions?.you ?? null}
                      them={d.positions?.them ?? null}
                      youName={you}
                      themName={them}
                      onDark
                    />
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* block: intimacy-overview/action-plan */}
            <Text style={{ ...Type.cardTitle, color: Palette.white, marginTop: Spacing.xxl, marginBottom: Spacing.md }}>
              Your action plan
            </Text>
            {data.conversations.map((d) => (
              <View
                key={d.section}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.10)', borderColor: 'rgba(255,255,255,0.2)', borderWidth: 1,
                  borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.md,
                }}>
                <Text style={{ ...Type.eyebrow, color: c.accentQuiet }}>{d.label}</Text>
                <Text style={{ ...Type.body, color: 'rgba(255,255,255,0.85)', marginTop: Spacing.xs }}>{d.prompt}</Text>
              </View>
            ))}
        </View>
      </ScrollView>
    </View>
  );
}

function IntimacyDimensionView({
  dim, you, them,
}: { dim: IntimacyDimension | null; you: string; them: string }) {
  if (!dim) {
    return <Waiting title="Physical Intimacy" body="This opens when you have both finished the exercise." />;
  }
  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={(dim.ground?.length === 3 ? dim.ground : ['#7A2540dd', '#7A254099', '#22204a']) as [string, string, string]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: ResultsBottomInset }}>
      <View style={{ paddingHorizontal: Spacing.xl, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}>
        <Text style={{ ...Type.title, color: Palette.white }}>{dim.label}</Text>
        {dim.intro ? (
          <Text style={{ ...Type.body, color: 'rgba(255,255,255,0.7)', marginTop: Spacing.sm }}>{dim.intro}</Text>
        ) : null}

        {/* block: intimacy-dimension/state */}
        <DistanceBar pct={dim.distancePct} state={dim.state} />

        {dim.body ? (
          <View
            style={{
              backgroundColor: 'rgba(255,255,255,0.10)', borderColor: 'rgba(255,255,255,0.2)', borderWidth: 1,
              borderRadius: Radius.lg, padding: Spacing.lg, marginTop: Spacing.xl,
            }}>
            <Text style={{ ...Type.body, color: 'rgba(255,255,255,0.85)' }}>{dim.body}</Text>
          </View>
        ) : null}

        {dim.prompt ? (
          <Text style={{ ...Type.title, color: Palette.white, marginTop: Spacing.xl }}>
            {/* block: intimacy-dimension/prompt */}
            {dim.prompt}
          </Text>
        ) : null}

        {/* The side-by-side comparison, which is what the exercise is sold as:
            "answered independently, compared side by side". The app could not
            draw this until the server carried positions, so the website had a
            screen the app did not. */}
        {dim.questions?.length ? (
          /* Behind the same dropdown the Communication pages use, which is
             what Ellie asked for. It used to sit open on the page, so the most
             explicit content in the product was on screen the moment the page
             loaded with no step in between.

             The control is the shared Disclosure, not a copy of the comms one,
             so the two cannot drift into looking almost alike. */
          <Disclosure title={`Side by side ${dim.label.toLowerCase()} responses`}>
            <Legend you={you} them={them} />
            {/* block: intimacy-dimension/questions */}
            {dim.questions.map((q) => (
              <View
                key={q.id}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.10)', borderColor: 'rgba(255,255,255,0.2)', borderWidth: 1,
                  borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.md,
                }}>
                <Text style={{ ...Type.body, color: 'rgba(255,255,255,0.85)' }}>{q.text}</Text>
                <View style={{ height: 28, justifyContent: 'center', marginTop: Spacing.md }}>
                  <View style={{ height: 3, borderRadius: Radius.pill, backgroundColor: 'rgba(255,255,255,0.18)' }} />
                  {q.you != null ? (
                    <Marker left={q.you * 100} color={YOU_COLOR} label={initial(you)} />
                  ) : null}
                  {q.them != null ? (
                    <Marker left={q.them * 100} color={THEM_COLOR} label={initial(them)} />
                  ) : null}
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.xs }}>
                  <Text style={{ ...Type.small, color: 'rgba(255,255,255,0.7)', flex: 1 }}>{q.low}</Text>
                  <Text style={{ ...Type.small, color: 'rgba(255,255,255,0.7)', flex: 1, textAlign: 'right' }}>{q.high}</Text>
                </View>
              </View>
            ))}
          </Disclosure>
        ) : null}
      </View>
    </ScrollView>
    </View>
  );
}

function IntimacyConversations({ data }: { data: IntimacyResults | null }) {
  if (!data) {
    return <Waiting title="Conversations Worth Having" body="This opens when you have both finished the exercise." />;
  }
  if (!data.conversations.length) {
    return (
      <Waiting
        title="Conversations Worth Having"
        body="Nothing here yet. These appear for the areas you both answered."
      />
    );
  }
  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={['#4A1B33', '#A34468', '#C8703E'] as [string, string, string]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: ResultsBottomInset }}>
      <View style={{ paddingHorizontal: Spacing.xl, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}>
        <Text style={{ ...Type.title, color: Palette.white }}>Conversations Worth Having</Text>
        <View style={{ marginTop: Spacing.lg, gap: Spacing.md }}>
          {data.conversations.map((d) => (
            <View
              key={d.section}
              style={{
                backgroundColor: 'rgba(255,255,255,0.10)', borderColor: 'rgba(255,255,255,0.2)', borderWidth: 1,
                borderRadius: Radius.lg, padding: Spacing.lg,
              }}>
              <Text style={{ ...Type.eyebrow, color: 'rgba(255,255,255,0.85)' }}>{d.label}</Text>
              <Text style={{ ...Type.cardTitle, color: Palette.white, marginTop: Spacing.xs }}>{d.prompt}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
    </View>
  );
}

function ReflectionWaiting() {
  return (
    <Waiting
      title="Relationship Reflection"
      body="This opens when you have both finished writing."
    />
  );
}

function ReflectionOverview({ data }: { data: ReflectionResults | null }) {
  if (!data) return <ReflectionWaiting />;
  // The website's page: how you feel right now, then the action plan. No
  // opening line of its own, so none here either.
  const commitment = data.written.find((w) => w.key === 'a6');
  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={['#22285E', '#3E63C8', '#10A5B8'] as [string, string, string]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: ResultsBottomInset }}>
      <View style={{ paddingHorizontal: Spacing.xl, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}>
        <Text style={{ ...Type.hero, color: Palette.white }}>Relationship Reflection</Text>

          {/* block: reflection-overview/ratings */}
        <Text style={{ ...Type.cardTitle, color: Palette.white, marginTop: Spacing.xl, marginBottom: Spacing.md }}>
          How you feel right now
        </Text>
        <Legend you={data.names.you} them={data.names.them} />
        {data.ratings.map((r) => (
          <View
            key={r.key}
            style={{
              backgroundColor: 'rgba(255,255,255,0.10)', borderColor: 'rgba(255,255,255,0.2)', borderWidth: 1,
              borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.md,
            }}>
            <Text style={{ ...Type.cardTitle, color: Palette.white }}>{r.question}</Text>
            <View style={{ height: 28, justifyContent: 'center', marginTop: Spacing.lg }}>
              <View style={{ height: 3, borderRadius: Radius.pill, backgroundColor: 'rgba(255,255,255,0.18)' }} />
              <Marker left={r.you.pct} color={YOU_COLOR} label={initial(data.names.you)} />
              <Marker left={r.them.pct} color={THEM_COLOR} label={initial(data.names.them)} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.xs }}>
              <Text style={{ ...Type.small, color: 'rgba(255,255,255,0.7)', flex: 1 }}>{r.low}</Text>
              <Text style={{ ...Type.small, color: 'rgba(255,255,255,0.7)', flex: 1, textAlign: 'right' }}>{r.high}</Text>
            </View>
          </View>
        ))}
        {/* What you each admire. On the website this sits on the Reflection
            page as well as inside a storycard. The app had it only in the card,
            so the page itself never showed it. */}
        {data.admired?.you || data.admired?.them ? (
          <View style={{ marginTop: Spacing.xl }}>
              {/* block: reflection-overview/admired */}
            <Text style={{ ...Type.eyebrow, color: Palette.indigo, marginBottom: Spacing.sm }}>
              What you each admire
            </Text>
            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
              {[
                { from: data.names.you, about: data.names.them, val: data.admired.you, col: Palette.orange },
                { from: data.names.them, about: data.names.you, val: data.admired.them, col: Palette.indigo },
              ].map((x) => (
                <View
                  key={x.from}
                  style={{
                    flex: 1, backgroundColor: 'rgba(255,255,255,0.10)', borderColor: 'rgba(255,255,255,0.2)', borderWidth: 1,
                    borderTopColor: x.col, borderTopWidth: 3,
                    borderRadius: Radius.lg, padding: Spacing.lg,
                  }}>
                  <Text style={{ ...Type.eyebrow, fontSize: 9, color: x.col, marginBottom: Spacing.xs }}>
                    {x.from}
                  </Text>
                  <Text style={{ ...Type.cardTitle, color: Palette.white }}>{x.val || 'Not answered'}</Text>
                  <Text style={{ ...Type.small, color: 'rgba(255,255,255,0.7)', marginTop: Spacing.xs }}>
                    in {x.about}
                  </Text>
                </View>
              ))}
            </View>
            {data.admired.you && data.admired.you === data.admired.them ? (
              <View
                style={{
                  marginTop: Spacing.sm, backgroundColor: '#EDFAF5',
                  borderColor: '#10b98130', borderWidth: 1,
                  borderRadius: Radius.md, padding: Spacing.md,
                }}>
                <Text style={{ ...Type.small, color: 'rgba(255,255,255,0.85)' }}>
                  You picked the same quality, without conferring.
                </Text>
              </View>
            ) : null}
          </View>
        ) : null}


        {commitment ? (
          <>
            <Text style={{ ...Type.cardTitle, color: Palette.white, marginTop: Spacing.xxl, marginBottom: Spacing.md }}>
              Your action plan
            </Text>
            <WrittenPair
              you={data.names.you}
              them={data.names.them}
              yourWords={commitment.you}
              theirWords={commitment.them}
            />
          </>
        ) : null}
      </View>
    </ScrollView>
    </View>
  );
}

/** Two people's words on the same question, stacked and attributed. */
function WrittenPair({
  you, them, yourWords, theirWords, prompt,
}: {
  you: string; them: string; yourWords: string; theirWords: string;
  prompt?: string | null;
}) {
  return (
    <>
      <View
        style={{
          backgroundColor: c.surface, borderColor: c.border, borderWidth: 1,
          borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.sm,
        }}>
        <Eyebrow>{you}</Eyebrow>
        <Text style={{ ...Type.body, color: c.text }}>{yourWords}</Text>
      </View>
      <View
        style={{
          backgroundColor: c.surface, borderColor: c.border, borderWidth: 1,
          borderRadius: Radius.lg, padding: Spacing.lg,
        }}>
        <Eyebrow color={c.textMuted}>{them}</Eyebrow>
        <Text style={{ ...Type.body, color: c.text }}>{theirWords}</Text>
      </View>

      {/* ── THE QUESTION UNDER THE PAIR ────────────────────────────────
          Two answers side by side do not need a verdict, they need something
          to do with having read them. The website has printed one under every
          pair since this page existed; the app printed the two answers and
          stopped, which is the half that does the work. */}
      {prompt ? (
        <Text style={{ ...Type.small, color: c.textMuted, fontStyle: 'italic', marginTop: Spacing.sm, lineHeight: 19 }}>
          {prompt}
        </Text>
      ) : null}
    </>
  );
}

/**
 * How you each rated, on the same line.
 *
 * One track per question with both marks on it, the way the communication
 * scales already work, so a reader who has come this far already knows how to
 * read it. No colour runs from bad to good: two steps apart on how connected
 * someone feels is the most useful thing on the page, not a failure.
 */
function ReflectionRatings({ data }: { data: ReflectionResults | null }) {
  if (!data) return <ReflectionWaiting />;
  if (!data.ratings.length) {
    return <Waiting title="How You Each Rated" body="Neither of you answered the rating questions." />;
  }
  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={['#22285E', '#3E63C8', '#10A5B8'] as [string, string, string]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: ResultsBottomInset }}>
      <View style={{ paddingHorizontal: Spacing.xl, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}>
        <Text style={{ ...Type.title, color: Palette.white }}>How You Each Rated</Text>

        <View style={{ marginTop: Spacing.md }}>
          <Legend you={data.names.you} them={data.names.them} />
        </View>

        {data.ratings.map((r) => (
          <View
            key={r.key}
            style={{
              backgroundColor: 'rgba(255,255,255,0.10)', borderColor: 'rgba(255,255,255,0.2)', borderWidth: 1,
              borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.md,
            }}>
            <Text style={{ ...Type.cardTitle, color: Palette.white }}>{r.question}</Text>

            {/* The same track and markers the dimension scales use, so a
                reader who has come this far already knows how to read it. */}
            <View style={{ height: 28, justifyContent: 'center', marginTop: Spacing.lg }}>
              <View style={{ height: 3, borderRadius: Radius.pill, backgroundColor: 'rgba(255,255,255,0.18)' }} />
              <Marker left={r.you.pct} color={YOU_COLOR} label={initial(data.names.you)} />
              <Marker left={r.them.pct} color={THEM_COLOR} label={initial(data.names.them)} />
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.xs }}>
              <Text style={{ ...Type.small, color: 'rgba(255,255,255,0.7)', flex: 1 }}>{r.low}</Text>
              <Text style={{ ...Type.small, color: 'rgba(255,255,255,0.7)', flex: 1, textAlign: 'right' }}>{r.high}</Text>
            </View>

            {/* Both answers, always, in their own words. This used to say
                "You rated this the same" when the two matched, which is the
                app drawing a conclusion the website leaves to the reader. */}
            <Text style={{ ...Type.small, color: 'rgba(255,255,255,0.7)', marginTop: Spacing.md }}>
              {data.names.you}: {r.you.label}. {data.names.them}: {r.them.label}.
            </Text>
          </View>
        ))}

        {/* ── WHAT MATTERS MOST THIS YEAR ──────────────────────────────
            The website puts the two ranked lists on this page, under this
            heading. The app had them on the Action Plan under one it made up. */}
        {data.priorities?.you?.length && data.priorities?.them?.length ? (
          <View style={{ marginTop: Spacing.xxl }}>
            <Eyebrow>What matters most this year</Eyebrow>
            <View style={{ flexDirection: 'row', gap: Spacing.lg, marginTop: Spacing.sm }}>
              <PriorityList name={data.names.you} items={data.priorities.you} />
              <PriorityList name={data.names.them} items={data.priorities.them} />
            </View>
          </View>
        ) : null}
      </View>
    </ScrollView>
    </View>
  );
}


/**
 * Side by side: what you each wrote.
 *
 * Stacked rather than in two columns. These are paragraphs, and two columns of
 * paragraphs on a phone is four words a line. Whose words they are is said
 * above each one.
 */
function ReflectionStory({ data }: { data: ReflectionResults | null }) {
  if (!data) return <ReflectionWaiting />;
  if (!data.written.length) {
    return (
      <Waiting
        title="Side by Side"
        body="There is nothing here yet. These appear where you both wrote an answer to the same question."
      />
    );
  }
  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={['#22285E', '#3E63C8', '#10A5B8'] as [string, string, string]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: ResultsBottomInset }}>
      <View style={{ paddingHorizontal: Spacing.xl, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}>
        <Text style={{ ...Type.title, color: Palette.white }}>Side by Side</Text>

        {data.written.map((w) => (
          <View key={w.key} style={{ marginBottom: Spacing.xl }}>
            <Text style={{ ...Type.cardTitle, color: Palette.white, marginBottom: Spacing.md }}>
              {w.question}
            </Text>

            <View
              style={{
                backgroundColor: 'rgba(255,255,255,0.10)', borderColor: 'rgba(255,255,255,0.2)', borderWidth: 1,
                borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.sm,
              }}>
              <Eyebrow>{data.names.you}</Eyebrow>
              <Text style={{ ...Type.body, color: 'rgba(255,255,255,0.85)' }}>{w.you}</Text>
            </View>

            <View
              style={{
                backgroundColor: 'rgba(255,255,255,0.10)', borderColor: 'rgba(255,255,255,0.2)', borderWidth: 1,
                borderRadius: Radius.lg, padding: Spacing.lg,
              }}>
              <Eyebrow color={c.textMuted}>{data.names.them}</Eyebrow>
              <Text style={{ ...Type.body, color: 'rgba(255,255,255,0.85)' }}>{w.them}</Text>
            </View>

            {/* ── THE QUESTION UNDER THE PAIR ──────────────────────────
                Two answers side by side do not need a verdict, they need
                something to do with having read them. The website has printed
                one under every pair since this page existed; the app printed
                the answers and stopped, which is the half that does the work.
                From api/_lib/reflection-prompts.js. */}
            {w.prompt ? (
              <Text style={{ ...Type.small, color: 'rgba(255,255,255,0.7)', fontStyle: 'italic', marginTop: Spacing.md, lineHeight: 19 }}>
                {w.prompt}
              </Text>
            ) : null}
          </View>
        ))}
      </View>
    </ScrollView>
    </View>
  );
}

/**
 * The action plan: what each of you said you would work on, and what you each
 * put first.
 *
 * Their own words rather than advice generated about them. Two people who have
 * each written down one thing they want to change have already done the
 * difficult part.
 */
function ReflectionPlan({
  data, insights,
}: { data: ReflectionResults | null; insights: ReflectionInsight[] | null }) {
  if (!data) return <ReflectionWaiting />;
  const commitment = data.written.find((w) => w.key === 'a6');
  const together = data.written.find((w) => w.key === 'a4');
  const bothRanked = data.priorities.you && data.priorities.them;

  return (
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={['#22285E', '#3E63C8', '#10A5B8'] as [string, string, string]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: ResultsBottomInset }}>
      <View style={{ paddingHorizontal: Spacing.xl, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}>
        {/* block: reflection-overview/action-plan */}
        <Text style={{ ...Type.title, color: Palette.white }}>Action Plan</Text>

        {/* The derived plan, under REFLECTION_ACTION_TITLES. The app could not
            reach that copy until now, so this page showed only the couple's
            own words and none of the plan the website builds from them. */}
        {insights?.length ? (
          <View style={{ marginTop: Spacing.xl }}>
            {insights.map((ins, i) => (
              <View
                key={`${ins.title}-${i}`}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.10)', borderColor: 'rgba(255,255,255,0.2)', borderWidth: 1,
                  borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.md,
                }}>
                <Text style={{ ...Type.cardTitle, color: Palette.white }}>{ins.title}</Text>
                {ins.body ? (
                  <Text style={{ ...Type.body, color: 'rgba(255,255,255,0.85)', marginTop: Spacing.sm }}>{ins.body}</Text>
                ) : null}
                {ins.action ? (
                  <Text style={{ ...Type.body, color: 'rgba(255,255,255,0.7)', marginTop: Spacing.md }}>{ins.action}</Text>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}

        {commitment ? (
          <View style={{ marginTop: Spacing.xl }}>
            <Eyebrow>What you each said you would work on</Eyebrow>
            <View
              style={{
                backgroundColor: 'rgba(255,255,255,0.10)', borderColor: 'rgba(255,255,255,0.2)', borderWidth: 1,
                borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.sm,
              }}>
              <Eyebrow>{data.names.you}</Eyebrow>
              <Text style={{ ...Type.body, color: 'rgba(255,255,255,0.85)' }}>{commitment.you}</Text>
            </View>
            <View
              style={{
                backgroundColor: 'rgba(255,255,255,0.10)', borderColor: 'rgba(255,255,255,0.2)', borderWidth: 1,
                borderRadius: Radius.lg, padding: Spacing.lg,
              }}>
              <Eyebrow color={c.textMuted}>{data.names.them}</Eyebrow>
              <Text style={{ ...Type.body, color: 'rgba(255,255,255,0.85)' }}>{commitment.them}</Text>
            </View>
          </View>
        ) : null}

        {/* ── NOT HERE ─────────────────────────────────────────────────
            The priorities lived on this page under "What you each put first
            this year", and what each of you wants more of under "More of this,
            next year". Neither heading is anywhere in the product, and the
            website puts the priorities on How You Each Rated, as "What matters
            most this year". The a4 answer is a written question and already
            appears on Side by Side with the rest of them.

            Moved rather than restyled: a block on the wrong page is the same
            problem as a block with the wrong words. */}
        {!commitment && !insights?.length ? (
          <Text style={{ ...Type.body, color: 'rgba(255,255,255,0.7)', marginTop: Spacing.lg }}>
            This fills in from the last few questions of the exercise, which you
            have not both answered yet.
          </Text>
        ) : null}
      </View>
    </ScrollView>
    </View>
  );
}

function PriorityList({ name, items }: { name: string; items: string[] }) {
  return (
    <View style={{ flex: 1 }}>
      <Eyebrow color={c.textMuted}>{name}</Eyebrow>
      {items.slice(0, 3).map((item, i) => (
        <Text key={item} style={{ ...Type.small, color: c.text, marginTop: Spacing.xs }}>
          {i + 1}. {item}
        </Text>
      ))}
    </View>
  );
}

/**
 * The closing page.
 *
 * Everything the results ask this couple to do, in the order worth doing it,
 * with a way back to the section each group came from. Nothing here is new:
 * every line has already been read in its own context, and a closing page that
 * introduces a fresh claim is a claim nothing else supports.
 */
function WhatComesNext({
  data, onGoToSection,
}: { data: { groups: NextStepGroup[] } | null; onGoToSection: (id: string) => void }) {
  if (!data?.groups.length) {
    return (
      <Waiting
        title="What Comes Next"
        body="This fills in as you finish the exercises in your package."
      />
    );
  }
  return (
    /* Cream, which is what the website uses here, and one collapsed group per
       source rather than every item of every group laid out flat. The app
       listed them all open with a paragraph under each title, which is three
       screens of scrolling for a page whose job is to gather things up. */
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: ResultsBottomInset }}>
      <View style={{ paddingHorizontal: Spacing.xl, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}>
        <Text style={{ ...Type.hero, color: c.textStrong }}>What to do with all of this.</Text>
        <Text style={{ ...Type.small, color: c.textMuted, marginTop: Spacing.md, marginBottom: Spacing.lg, lineHeight: 20 }}>
          Each part of your results ends in something to do. They are gathered here,
          grouped by where they came from. Open one to see its items and the words to
          start with.
        </Text>

        <View style={{ gap: Spacing.sm }}>
          {/* block: what-comes-next/groups */}
          {data.groups.map((group) => (
            <NextGroup
              key={group.id}
              label={group.label}
              color={group.color || c.accent}
              items={group.items}
              onOpen={() => onGoToSection(group.section)}
            />
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

/**
 * One source of next steps, collapsed.
 *
 * The website's `<details>`: a white card with the group's colour down its
 * left edge, a summary carrying the label, the item count, "Show" and a
 * chevron, and inside, one row per item with its title and the phrase to try
 * under a small "Try".
 */
function NextGroup({
  label, color, items, onOpen,
}: {
  label: string; color: string;
  items: { title: string; body?: string | null; say?: string | null }[];
  onOpen: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View
      style={{
        backgroundColor: c.surface, borderColor: c.border, borderWidth: 1,
        borderLeftColor: color, borderLeftWidth: 4,
        borderRadius: Radius.lg, overflow: 'hidden',
      }}>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          gap: Spacing.sm, paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg,
        }}>
        <Text style={{ ...Type.cardTitle, color: c.textStrong, flex: 1 }}>{label}</Text>
        <Text style={{ ...Type.small, color: c.textMuted }}>
          {`${items.length} item${items.length !== 1 ? 's' : ''}`}
        </Text>
        <Text style={{ ...Type.small, color, fontWeight: '700' }}>Show</Text>
        <Text style={{ color, fontSize: 13 }}>{open ? '\u25B4' : '\u25BE'}</Text>
      </Pressable>

      {open ? (
        <View style={{ borderTopColor: c.border, borderTopWidth: 1 }}>
          {items.map((item, i) => (
            <View
              key={`${label}-${i}`}
              style={{
                paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg,
                borderBottomColor: c.border,
                borderBottomWidth: i < items.length - 1 ? 1 : 0,
              }}>
              {/* Title and phrase. No description paragraph: the website prints
                  none here either. */}
              <Text style={{ ...Type.small, fontWeight: '700', color: c.textStrong, lineHeight: 19 }}>
                {item.title}
              </Text>
              {item.say ? (
                <View style={{ flexDirection: 'row', gap: Spacing.xs, marginTop: Spacing.xs }}>
                  <Text style={{ ...Type.eyebrow, fontSize: 9, color, marginTop: 3 }}>Try</Text>
                  <Text style={{ ...Type.small, color: c.textMuted, fontStyle: 'italic', flex: 1, lineHeight: 19 }}>
                    {item.say}
                  </Text>
                </View>
              ) : null}
            </View>
          ))}
          <Pressable
      accessibilityRole="button" onPress={onOpen} style={{ paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg }}>
            <Text style={{ ...Type.small, fontWeight: '700', color: c.textMuted }}>
              {`Open ${label} \u2192`}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function Waiting({ title, body }: { title: string; body: string }) {
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: ResultsBottomInset }}>
      <View style={{ paddingHorizontal: Spacing.xl, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}>
        <Text style={{ ...Type.title, color: c.textStrong }}>{title}</Text>
        <Text style={{ ...Type.body, color: c.textMuted, marginTop: Spacing.sm }}>{body}</Text>
      </View>
    </ScrollView>
  );
}

function NotYet({ section }: { section: string }) {
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: ResultsBottomInset }}>
      <View style={{ paddingHorizontal: Spacing.xl, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}>
        <View style={{ backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.xl }}>
          <Text style={{ ...Type.eyebrow, color: c.accentQuiet }}>Not on your phone yet</Text>
          <Text style={{ ...Type.body, color: c.text, marginTop: Spacing.sm }}>
            This section is part of your results and is written and ready on the
            website. It is being built for the app now.
          </Text>
          <Text style={{ ...Type.small, color: c.textMuted, marginTop: Spacing.md }}>
            Open it at attune-relationships.com in the meantime.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

/**
 * Results at a glance: the couple type, then the widest gaps.
 *
 * On a coloured ground, because this is the summary. Ordering comes from the
 * server's rankedGaps and is not re-sorted here.
 */
/**
 * The two dot colours on the glance panel.
 *
 * The website's values, not the app's section palette: on that dark ground it
 * uses orange for the reader and a lighter indigo for the partner, and those
 * two are what a reader has already learned by the time they get here.
 */
const GLANCE_YOU = '#E8673A';
// The same blue, lifted for a dark ground. #1B5FE8 on navy is barely visible;
// this is that hue at a lightness the panel can carry.
const GLANCE_THEM = '#6C7FFF';

/**
 * One dimension on the glance panel: a label and a shared track.
 *
 * Deliberately not DimensionRow, which is the detail-page treatment: a card
 * with a border, the pole names spelled out and room to breathe. Ten of those
 * is a list you scroll rather than a shape you see. Here the whole point is
 * reading all ten at once, so it is one line each.
 */
function GlanceRow({ dim, viewer }: { dim: ResultDimension; viewer: 'a' | 'b' }) {
  const mine = (viewer === 'a' ? dim.a : dim.b) ?? 3;
  const theirs = (viewer === 'a' ? dim.b : dim.a) ?? 3;
  // 1..5 onto 10..90 percent, the same range the website uses, so the two
  // never place the same pair of answers in visibly different spots.
  const pct = (v: number) => 10 + (v - 1) * 20;
  const close = Math.abs(pct(mine) - pct(theirs)) < 3;
  const mineLeft = pct(mine) <= pct(theirs);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.sm }}>
      <Text
        numberOfLines={2}
        style={{ ...Type.small, fontSize: 11, lineHeight: 14, color: 'rgba(255,255,255,0.65)', width: 96 }}>
        {dim.label}
      </Text>
      <View style={{ flex: 1, height: 6, borderRadius: Radius.pill, backgroundColor: 'rgba(255,255,255,0.10)' }}>
        {[
          { v: theirs, col: GLANCE_THEM, dy: close ? (mineLeft ? 4 : -4) : 0 },
          { v: mine, col: GLANCE_YOU, dy: close ? (mineLeft ? -4 : 4) : 0 },
        ].map((p, i) => (
          <View
            key={i}
            style={{
              position: 'absolute', left: `${pct(p.v)}%`, top: -2 + p.dy,
              width: 10, height: 10, borderRadius: 5, marginLeft: -5,
              backgroundColor: p.col, borderColor: '#1B2A5E', borderWidth: 1.5,
            }}
          />
        ))}
      </View>
    </View>
  );
}

function Glance({
  results, you, them, viewer, wideGap, plan = null,
}: {
  results: CoupleResults; you: string; them: string; viewer: 'a' | 'b';
  wideGap: number | null; plan?: CommsPlan | null;
}) {
  const type = results.content?.coupleType;
  const dims = results.content?.dimensions ?? [];

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: ResultsBottomInset }}>
      <View style={{ paddingHorizontal: Spacing.xl, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}>
        {/* ── ONE TILE, NOT ONE PER DIMENSION ────────────────────────────────
            The website's glance is a single dark panel: the couple type, then
            "Where you each land" with every dimension as a tight row inside
            it. The app had the panel, then four of the ten dimensions as
            separate white bordered cards underneath, which read as four
            findings rather than one picture of the whole thing.

            All ten, in the server's order, in the panel. The point of this
            page is the shape of the pair across everything, and you cannot see
            a shape in four cards. */}
        <LinearGradient
          colors={[...BlueGround]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: Radius.xl, padding: Spacing.xl }}>
          {/* block: comm-overview/couple-type-lead */}
          {/* No "You two are" over the type name. The name is a noun phrase
              and reads as the answer on its own. */}
          <Text style={{ ...Type.hero, color: Palette.white }}>
            {type?.name || 'Your results'}
          </Text>
          {type?.tagline ? (
            <Text style={{ ...Type.body, color: 'rgba(255,255,255,0.82)', marginTop: Spacing.md }}>
              {interp(type.tagline, you, them)}
            </Text>
          ) : null}

          {dims.length ? (
            <View style={{ marginTop: Spacing.xl }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: Spacing.md }}>
                {/* block: comm-overview/where-you-each-land */}
                <Text style={{ ...Type.eyebrow, color: 'rgba(255,255,255,0.85)' }}>
                  Where you each land
                </Text>
                <View style={{ flexDirection: 'row', gap: Spacing.md }}>
                  {[{ n: you, col: GLANCE_YOU }, { n: them, col: GLANCE_THEM }].map((x) => (
                    <View key={x.n} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}>
                      <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: x.col }} />
                      <Text style={{ ...Type.small, fontSize: 11, color: 'rgba(255,255,255,0.55)' }}>{x.n}</Text>
                    </View>
                  ))}
                </View>
              </View>

              {dims.map((d) => (
                <GlanceRow key={d.key} dim={d} viewer={viewer} />
              ))}
            </View>
          ) : null}
          {/* ── YOUR ACTION PLAN ─────────────────────────────────────
              One tile per domain, inside the panel and on the dark ground,
              which is where the website has them. The app had them as white
              cards below the panel, so the page broke into two halves that did
              not look like one finding. */}
          {plan?.tiles?.length ? (
            <View style={{ marginTop: Spacing.xl }}>
              <Text style={{ ...Type.eyebrow, color: 'rgba(255,255,255,0.75)', marginBottom: Spacing.sm }}>
                Your action plan
              </Text>
              {/* block: comm-overview/action-tiles */}
              {plan.tiles.map((tile) => (
                <View
                  key={tile.domain}
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.13)',
                    borderColor: `${tile.color}66`, borderWidth: 1,
                    borderLeftColor: tile.color, borderLeftWidth: 4,
                    borderRadius: Radius.md, padding: Spacing.lg, marginBottom: Spacing.sm,
                  }}>
                  <Text style={{ ...Type.eyebrow, color: 'rgba(255,255,255,0.95)' }}>{tile.label}</Text>
                  {tile.title ? (
                    <Text style={{ ...Type.small, fontWeight: '700', color: 'rgba(255,255,255,0.9)', marginTop: Spacing.xs }}>
                      {tile.title}
                    </Text>
                  ) : null}
                  {tile.body ? (
                    <Text style={{ ...Type.small, color: 'rgba(255,255,255,0.6)', marginTop: Spacing.xs, lineHeight: 20 }}>
                      {tile.body}
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>
          ) : null}

        </LinearGradient>
      </View>
    </ScrollView>
  );
}

/** The couple type in full. Detail screen, so it stays on the warm ground. */
function CoupleType({ results, you, them }: { results: CoupleResults; you: string; them: string }) {
  const type = results.content?.coupleType;
  // Not null. This section is in the nav, so returning nothing gives a blank
  // page with no explanation, which reads as the app being broken. The website
  // logs loudly and falls back rather than rendering an empty slide, and the
  // only way here is a pairing the type table does not know, which is a bug
  // worth saying out loud rather than hiding.
  if (!type) {
    return (
      <Waiting
        title="Couple type"
        body="This one could not be built from your answers. Everything else in your results is unaffected."
      />
    );
  }

  // The type's own colour, which the website paints this page with. It was
  // arriving in the payload and being ignored, so every couple type looked the
  // same shade of orange and the visual identity the site gives each one was
  // lost.
  const accent = type.color || c.accent;

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: ResultsBottomInset }}>
      <View style={{ paddingHorizontal: Spacing.xl, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}>
        {/* block: couple-type/lead

            The page opens on what the answers uncovered, not on the type name.
            The app used to lead with the name, so a reader met "The jumpstart"
            before being told what they were looking at, and the two surfaces
            read as different pages while both claimed the same six blocks.

            The line is the website's, word for word. */}
        <Text style={{ ...Type.hero, color: c.textStrong }}>
          What your responses uncover about your unique relationship dynamic
        </Text>

        <Text style={{ ...Type.eyebrow, color: accent, marginTop: Spacing.xl, marginBottom: Spacing.xs }}>
          Your couple map
        </Text>

        {/* The map. It was missing entirely: the positions were in the payload
            and nothing drew them.

            The spacing lives inside CoupleMap rather than on a wrapper here,
            because the map returns null on an older cached payload that has no
            coords, and a wrapper with a margin around nothing leaves a hole in
            the page that looks like a failed image. */}
        {/* block: couple-type/map */}
        <CoupleMap
          a={results.partners?.a ?? null}
          b={results.partners?.b ?? null}
          aName={results.content?.names?.a || 'You'}
          bName={results.content?.names?.b || 'Your partner'}
          quadrants={results.content?.mapQuadrants}
        />

        {/* How the map is worked out, and a warning about expecting a
            particular answer. Ellie's copy, from api/_axes.js by way of the
            payload. The website has printed it under its map all along; the
            app printed nothing, because the words lived inline in the
            website's source. Small, because it is small print. */}
        {(results.content?.mapCaption || []).map((para, i, all) => (
          <Text
            key={i}
            style={{
              ...Type.small, fontSize: 12, lineHeight: 17, color: c.textMuted,
              marginTop: i === 0 ? Spacing.md : Spacing.sm,
              marginBottom: i === all.length - 1 ? 0 : 0,
            }}>
            {para}
          </Text>
        ))}

        {/* block: couple-type/axes

            What the two axes mean. The map without these is a picture: two
            dots in different corners and no way to know what the corners are.
            The copy is api/_axes.js, which the website reads too. */}
        {/* Side by side, which is what Ellie asked for and what the website
            does on a wide screen. The two are halves of one explanation and
            reading them stacked means holding the first while you read the
            second. Type steps down because a column is half the measure.

            One sentence each now. The pole lines that used to follow, with the
            up and down arrows spelling out Engage versus Withdraw, were cut
            from both surfaces: the label names both ends already. */}
        <View
          style={{
            flexDirection: 'row', alignItems: 'stretch', gap: 10,
            marginTop: results.content?.axes?.length ? Spacing.xl : 0,
          }}>
          {(results.content?.axes || []).map((ax) => (
            <View key={ax.id} style={{ flex: 1, borderLeftColor: ax.color, borderLeftWidth: 3, paddingLeft: Spacing.sm }}>
              <Text style={{ ...Type.eyebrow, color: ax.color, marginBottom: Spacing.xs }}>{ax.label}</Text>
              <Text style={{ ...Type.small, color: c.text }}>{ax.desc}</Text>
            </View>
          ))}
        </View>

        {/* block: couple-type/individual-types

            Each partner on their own, before the pairing. The website has had
            this panel all along; the app had nothing, because the blurb and
            the bands were written inline in the website's source and had never
            been anywhere the app could read them. They are in
            api/_lib/individual-profile.js now and arrive on the payload. */}
        {results.content?.individualTypes?.a || results.content?.individualTypes?.b ? (
          <Text style={{ ...Type.eyebrow, color: accent, marginTop: Spacing.xxl, marginBottom: Spacing.sm }}>
            Your individual types
          </Text>
        ) : null}
        {[results.content?.individualTypes?.a, results.content?.individualTypes?.b]
          .filter((p): p is NonNullable<typeof p> => !!p)
          .map((p) => (
            <View key={p.name} style={{ ...card(), marginBottom: Spacing.sm, borderTopColor: p.color, borderTopWidth: 4 }}>
              <Text style={{ ...Type.eyebrow, color: p.color }}>{p.name}</Text>
              <Text style={{ ...Type.title, color: c.textStrong, marginTop: Spacing.xs }}>{p.typeName}</Text>
              <Text style={{ ...Type.body, color: c.textMuted, marginTop: Spacing.sm }}>{p.blurb}</Text>
              <View style={{ marginTop: Spacing.md, gap: Spacing.sm }}>
                {p.rows.map((r) => (
                  <View key={r.axis}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                      <Text style={{ ...Type.small, color: c.textMuted }}>{r.label}</Text>
                      <Text style={{ ...Type.small, color: p.color, fontWeight: '600' }}>{r.value}</Text>
                    </View>
                    {/* The bar is the same 0..1 the website draws, so a reader
                        comparing the two screens sees the same fill. */}
                    <View style={{ height: 4, borderRadius: 2, backgroundColor: c.border, overflow: 'hidden' }}>
                      <View style={{ height: '100%', width: `${Math.round(r.score * 100)}%`, backgroundColor: p.color, borderRadius: 2 }} />
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ))}

        <Text style={{ ...Type.eyebrow, color: accent, marginTop: Spacing.xxl }}>Your couple type</Text>

        {/* block: couple-type/name */}
        {/* The website's type reveal: the name set large in white on a tile
            filled with the type's own colour, its tagline under it, and the
            name again oversized and barely visible in the corner.

            The app set the same two strings as plain text on the page ground.
            Every word matched and the moment did not: this is the line the
            whole section builds to, and it read like a subheading. Ellie asked
            for the coloured tile.

            The colour is the type's, from the payload, so there is no second
            copy of the palette here. */}
        <LinearGradient
          colors={[`${type.color || c.accent}ee`, `${type.color || c.accent}99`]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: Radius.lg, overflow: 'hidden',
            paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl, paddingBottom: Spacing.lg,
            marginTop: Spacing.md,
          }}>
          {/* The watermark. Positioned rather than laid out, so it cannot
              push the name around when a type name is long, and clipped by
              the tile's overflow like the website's is. */}
          <Text
            pointerEvents="none"
            numberOfLines={1}
            style={{
              position: 'absolute', right: -10, bottom: -18,
              ...Type.hero, fontSize: 76, lineHeight: 80,
              color: 'rgba(255,255,255,0.10)',
            }}>
            {(type.name || '').replace(/^The /, '')}
          </Text>
          <Text style={{ ...Type.hero, fontSize: 38, lineHeight: 40, color: '#FFFFFF' }}>
            {type.name}
          </Text>
          <Text style={{ ...Type.body, color: 'rgba(255,255,255,0.9)', fontWeight: '500', marginTop: Spacing.sm }}>
            {interp(type.tagline, you, them)}
          </Text>
        </LinearGradient>

        {/* block: couple-type/description */}
        {/* `patterns`, which is what the website's "What this looks like in
            your relationship" tile prints. The app printed `description`, a
            different field with different words, so this tile said something
            else entirely on the two products. Near-axis overrides are already
            applied server-side.

            The heading was missing too, so the paragraph arrived unlabelled
            and the reader had to work out what it was describing. */}
        <View style={{ ...card(), marginTop: Spacing.lg }}>
          <Text style={{ ...Type.eyebrow, color: type.color || accent, marginBottom: Spacing.md }}>
            What this looks like in your relationship
          </Text>
          <Text style={{ ...Type.body, color: c.text }}>
            {interp((type.patterns?.length ? type.patterns.join(' ') : type.description), you, them)}
          </Text>
        </View>

        {/* The website's three blocks, in the website's order and with the
            website's headings. All three were absent because /api/results did
            not forward strengths, stickingPoints or tips. */}
        {type.strengths?.length ? (
          <View style={{ marginTop: Spacing.xl }}>
            <Text style={{ ...Type.eyebrow, color: accent, marginBottom: Spacing.sm }}>
              {/* block: couple-type/strengths */}
              What comes naturally
            </Text>
            {type.strengths.slice(0, 2).map((t) => (
              <View key={t} style={{ ...card(), marginBottom: Spacing.sm }}>
                <Text style={{ ...Type.body, color: c.text }}>{interp(t, you, them)}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {type.stickingPoints?.length ? (
          <View style={{ marginTop: Spacing.lg }}>
            <Text style={{ ...Type.eyebrow, color: accent, marginBottom: Spacing.sm }}>
              {/* block: couple-type/sticking-points */}
              What&apos;s worth being aware of
            </Text>
            {type.stickingPoints.slice(0, 2).map((t) => (
              <View key={t} style={{ ...card(), marginBottom: Spacing.sm }}>
                <Text style={{ ...Type.body, color: c.text }}>{interp(t, you, them)}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* No nuance card. The website's couple-type page does not render
            coupleType.nuance at all: the only place that field is read is the
            workbook payload. The app was showing it, first under a heading it
            invented and then as an unlabelled third tile under "What's worth
            being aware of", where it also broke the spacing rhythm because it
            carried a section-level margin inside a list of tiles.

            Both problems were the same problem. It is copy the app was showing
            and the website was not. */}

        {/* ── PHRASES TO TRY ───────────────────────────────────────────
            The website's shape, tile for tile: a white card with a thick
            coloured left edge, a bold title, the body, and the phrase itself
            in a nested tile tinted to match that edge, italicised and in
            quotation marks.

            The app had the outer card and neither the edge nor the phrase.
            The phrase was not in the payload at all, so no amount of styling
            here would have produced it.

            The three colours cycle the way the website cycles them: the
            couple's own colour, then indigo, then green. */}
        {type.tips?.length ? (
          <View style={{ marginTop: Spacing.xl }}>
            <Text style={{ ...Type.eyebrow, color: accent, marginBottom: Spacing.sm }}>
              {/* block: couple-type/tips */}
              Phrases to try
            </Text>
            {type.tips.map((tip, i) => {
              const tipColor = [accent, Palette.indigo, '#10b981'][i % 3];
              return (
                <View
                  key={tip.title}
                  style={{
                    ...card(), marginBottom: Spacing.sm,
                    borderLeftColor: tipColor, borderLeftWidth: 4,
                  }}>
                  {/* Title and phrase only. The paragraph between them was
                      the part nobody needed: the title says what to do and the
                      phrase shows how. Gone from both surfaces. */}
                  <Text style={{ ...Type.cardTitle, color: c.textStrong }}>
                    {interp(tip.title, you, them)}
                  </Text>
                  {tip.phraseTry ? (
                    <View
                      style={{
                        marginTop: Spacing.md, borderRadius: Radius.sm,
                        backgroundColor: `${tipColor}0D`, borderColor: `${tipColor}30`, borderWidth: 1,
                        paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md,
                      }}>
                      <Text style={{ ...Type.eyebrow, fontSize: 9, color: tipColor, marginBottom: Spacing.xs }}>
                        Phrase to try
                      </Text>
                      <Text style={{ ...Type.body, fontStyle: 'italic', color: c.text }}>
                        {`\u201C${interp(tip.phraseTry, you, them)}\u201D`}
                      </Text>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

/** One Communication domain: every dimension in it, both partners on each. */
function Domain({
  title, accent, dims, you, them, viewer, tile = null, domain = null, responses = [],
}: {
  title: string; accent: string; dims: ResultDimension[];
  you: string; them: string; viewer: 'a' | 'b';
  tile?: CommsPlan['tiles'][number] | null;
  domain?: { label: string; color: string; prose: string; ground: string[] } | null;
  responses?: SbsRow[];
}) {
  const ground = (domain?.ground?.length === 3
    ? domain.ground
    : ['#5B21B6dd', '#5B21B699', '#22204a']) as [string, string, string];

  return (
    /* ── THE PAGE IS DARK, LIKE THE WEBSITE'S ──────────────────────────
       Every Communication detail page on the site is a gradient tinted to its
       domain: purple for internal processing, orange for how you connect, blue
       for when things get hard. The app drew all three on cream, so the two
       products did not look like the same product on the pages a couple spends
       the most time in.

       The stops come from the server, from api/_lib/comm-domains.js, which the
       website builds its own gradient from. Neither surface holds the colour. */
    <View style={{ flex: 1 }}>
      <LinearGradient
        colors={ground}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: ResultsBottomInset }}>
        <View style={{ paddingHorizontal: Spacing.xl, paddingTop: Spacing.md, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}>
          {/* No exercise-name eyebrow. "Communication" over a page already
              reached from a tab called Comms is a label on a label. */}
          <Text style={{ ...Type.title, color: Palette.white, marginBottom: Spacing.md }}>
            {title}
          </Text>

          {/* The paragraph the website opens every domain page with. The app
              had none, because the words were inline in src/App.jsx and had
              never been anywhere it could read them. */}
          {/* block: comm-domain/intro */}
          {domain?.prose ? (
            <Text style={{ ...Type.body, color: 'rgba(255,255,255,0.75)', lineHeight: 25, marginBottom: Spacing.xl }}>
              {domain.prose}
            </Text>
          ) : null}

          {/* ── ONE PANEL, ONE ROW PER DIMENSION ───────────────────────
              The website's "Overall orientation" panel. The app drew a
              bordered card per dimension with a paragraph inside, so three
              dimensions read as three findings at three times the height. */}
          <View
            style={{
              backgroundColor: 'rgba(255,255,255,0.10)',
              borderColor: 'rgba(255,255,255,0.16)', borderWidth: 1,
              borderRadius: Radius.lg, padding: Spacing.lg,
            }}>
            <Text style={{ ...Type.eyebrow, color: 'rgba(255,255,255,0.9)', marginBottom: Spacing.md }}>
              Overall orientation
            </Text>
            {/* block: comm-domain/dimensions */}
            <View style={{ gap: Spacing.xs }}>
              {dims.map((d) => (
                <SliderRow
                  key={d.key}
                  label={d.label}
                  left={d.left || ''}
                  right={d.right || ''}
                  you={unit(viewer === 'a' ? d.a : d.b)}
                  them={unit(viewer === 'a' ? d.b : d.a)}
                  youName={you}
                  themName={them}
                  onDark
                />
              ))}
            </View>
          </View>

          {/* The domain's one instruction, which the website ends these pages
              with. No dimension name in the corner: the tile is the page's one
              instruction and the page already says which domain it is. */}
          {tile?.body ? (
            <View
              style={{
                marginTop: Spacing.xl,
                backgroundColor: 'rgba(255,255,255,0.10)',
                borderColor: 'rgba(255,255,255,0.2)', borderWidth: 1,
                borderLeftColor: accent, borderLeftWidth: 4,
                borderRadius: Radius.lg, padding: Spacing.lg,
              }}>
              {/* block: comm-domain/action-tile */}
              <Text style={{ ...Type.eyebrow, color: 'rgba(255,255,255,0.9)' }}>One thing to try</Text>
              <Text style={{ ...Type.body, color: 'rgba(255,255,255,0.88)', marginTop: Spacing.sm, lineHeight: 24 }}>
                {tile.body}
              </Text>
            </View>
          ) : null}

          {/* block: comm-domain/side-by-side */}
          <SideBySide dims={dims} you={you} them={them} viewer={viewer} label={title} rows={responses} />
        </View>
      </ScrollView>
    </View>
  );
}

/**
 * The side-by-side dropdown: every question, both answers, both cross-views.
 *
 * ── WHAT IT MIRRORS ───────────────────────────────────────────────────────
 * The website's SideBySideResponses, which every Communication detail page
 * ends with behind a disclosure. Ellie called this the most important missing
 * piece and she is right: the scores say where the two of you landed, and this
 * is the only place that shows what you each actually answered.
 *
 * Four dots per question. The two large ones are what each partner said about
 * themselves. The two small ones are the cross-view reads: what each guessed
 * about the other.
 *
 * ── WHOSE COLOUR A DOT WEARS ──────────────────────────────────────────────
 * The person the dot is ABOUT, not the person who answered. "How your partner
 * sees you" is your colour and sits beside your own dot, which is what makes
 * the pair readable as agreement or a misread. The server names the fields
 * readOfYou and readOfThem so this cannot be got backwards here.
 *
 * ── THE STACKING ──────────────────────────────────────────────────────────
 * The website's rule, exactly: every dot claims a position, and a dot landing
 * within 7 per cent of one already placed steps down 11 points until it finds
 * a free row. Self dots are placed first and keep their close-together offset,
 * so a cross-view read moves rather than displacing the answer it describes.
 * Without it a read landing on another dot vanishes underneath and looks like
 * missing data.
 */
const SBS_NEAR = 7;
const SBS_STEP = 11;

function SideBySide({
  dims, you, them, viewer, label, rows,
}: {
  dims: ResultDimension[]; you: string; them: string; viewer: 'a' | 'b';
  label: string; rows?: CoupleResults['content'] extends never ? never : SbsRow[];
}) {
  const keys = new Set(dims.map((d) => d.key));
  const qs = (rows || []).filter((r) => keys.has(r.dimension));
  if (!qs.length) return null;

  const uInit = initial(you);
  const pInit = initial(them);
  const same = uInit === pInit;
  const U = YOU_COLOR;
  const P = '#6C7FFF';

  return (
    <Disclosure title={`Side by side ${label.toLowerCase()} responses`}>
          {/* The small dots carry no initial, so this is the only thing naming
              them. */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, marginBottom: Spacing.lg }}>
            {[
              { size: 14, color: U, text: `${you}'s responses`, ini: same ? '' : uInit },
              { size: 14, color: P, text: `${them}'s responses`, ini: same ? '' : pInit },
              { size: 9, color: U, text: `How ${them} views ${you}`, ini: '' },
              { size: 9, color: P, text: `How ${you} views ${them}`, ini: '' },
            ].map((it) => (
              <View key={it.text} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}>
                <View
                  style={{
                    width: it.size, height: it.size, borderRadius: it.size / 2,
                    backgroundColor: it.color, alignItems: 'center', justifyContent: 'center',
                  }}>
                  {it.ini ? (
                    <Text style={{ fontSize: 7, fontWeight: '800', color: Palette.white }}>{it.ini}</Text>
                  ) : null}
                </View>
                <Text style={{ ...Type.small, fontSize: 11, color: 'rgba(255,255,255,0.7)' }}>{it.text}</Text>
              </View>
            ))}
          </View>

          <View style={{ gap: Spacing.xl }}>
            {qs.map((q) => (
              <SbsQuestion
                key={q.id}
                row={q}
                uInit={same ? '' : uInit}
                pInit={same ? '' : pInit}
                U={U}
                P={P}
              />
            ))}
          </View>
    </Disclosure>
  );
}

/**
 * A titled dropdown on a dark results ground.
 *
 * ── WHY IT IS ITS OWN COMPONENT ───────────────────────────────────────────
 * Ellie asked for the intimacy responses to sit behind a dropdown "like
 * comms". The obvious way to do that is to copy the comms chrome onto the
 * intimacy page, and then there are two dropdowns that both happen to look
 * alike until one of them is adjusted.
 *
 * This product's most expensive bug is the same rule kept by hand in two
 * places, so the chrome is the thing that gets shared and the contents are
 * what differ. Comms rows and intimacy rows are genuinely different shapes;
 * the control around them is not.
 */
function Disclosure({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <View
      style={{
        marginTop: Spacing.xl, borderRadius: Radius.lg,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderColor: 'rgba(255,255,255,0.14)', borderWidth: 1,
        overflow: 'hidden',
      }}>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingVertical: Spacing.lg, paddingHorizontal: Spacing.lg,
        }}>
        <Text style={{ ...Type.eyebrow, color: 'rgba(255,255,255,0.85)', flex: 1 }}>
          {title}
        </Text>
        <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>{open ? '\u25B4' : '\u25BE'}</Text>
      </Pressable>
      {open ? (
        <View style={{ paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg }}>
          {children}
        </View>
      ) : null}
    </View>
  );
}

export type StorycardStyle = {
  ratio: number; stripe: string[]; wordmark: string; siteLabel: string;
};

export type CommDomain = {
  id: string; label: string; color: string; dims: string[];
  prose: string; ground: string[];
};

type SbsRow = {
  id: string; dimension: string; text: string; left: string; right: string;
  you: number | null; them: number | null;
  readOfYou: number | null; readOfThem: number | null;
};

function SbsQuestion({
  row, uInit, pInit, U, P,
}: { row: SbsRow; uInit: string; pInit: string; U: string; P: string }) {
  const pct = (v: number | null) =>
    (v == null ? null : Math.max(3, Math.min(97, ((v - 1) / 4) * 100)));
  const pYou = pct(row.you);
  const pThem = pct(row.them);
  const close = pYou != null && pThem != null && Math.abs(pYou - pThem) < SBS_NEAR;

  const placed: { p: number; dy: number }[] = [];
  const place = (p: number | null, preferred: number) => {
    if (p == null) return 0;
    let dy = preferred;
    while (placed.some((o) => Math.abs(o.p - p) < SBS_NEAR && Math.abs(o.dy - dy) < 9)) dy += SBS_STEP;
    placed.push({ p, dy });
    return dy;
  };
  const dyYou = place(pYou, close ? -7 : 0);
  const dyThem = place(pThem, close ? 7 : 0);
  const dyReadOfYou = place(pct(row.readOfYou), 0);
  const dyReadOfThem = place(pct(row.readOfThem), 0);

  /**
   * The pole labels either side of the bar.
   *
   * These are whole sentences, not words: "Independent. Your own friendships
   * and plans are part of how you stay yourself." In a fixed 86pt column at
   * 11pt they wrapped to eight or nine lines and the row became a wall.
   *
   * The column takes whatever the bar does not need now, rather than a fixed
   * width, and the dead space around the bar is cut to what the dots actually
   * overhang. That is worth about fourteen points a side, which is a line or
   * two off most rows.
   *
   * It does not eliminate the wrapping and nothing here can: three columns on
   * a phone, with a sentence in each of the outer two, is the constraint. The
   * website has the same problem at the same width and hides it by being read
   * on a laptop. Short pole labels would fix it properly, and those are
   * Ellie's words to write.
   */
  const pole = {
    ...Type.small, fontSize: 11, lineHeight: 14,
    color: 'rgba(255,255,255,0.62)', flex: 1,
  };

  return (
    <View>
      <Text style={{ ...Type.small, fontWeight: '600', color: Palette.white, marginBottom: Spacing.sm, lineHeight: 19 }}>
        {row.text}
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text style={{ ...pole, textAlign: 'right' }}>{row.left}</Text>
        {/* Fixed, so the labels flex around it instead of the other way round.
            The padding is the dot overhang and nothing more: a 20pt dot at the
            3% clamp hangs 10pt past the bar's end. */}
        <View style={{ width: 104, paddingHorizontal: 10 }}>
          <View style={{ height: 6, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.14)', marginVertical: 16 }}>
            {/* readOfYou is the partner's answer ABOUT the reader, so it takes
                the reader's colour and sits by the reader's own dot. */}
            <SbsDot p={pct(row.readOfYou)} dy={dyReadOfYou} color={U} small />
            <SbsDot p={pct(row.readOfThem)} dy={dyReadOfThem} color={P} small />
            <SbsDot p={pYou} dy={dyYou} color={U} label={uInit} />
            <SbsDot p={pThem} dy={dyThem} color={P} label={pInit} />
          </View>
        </View>
        <Text style={pole}>{row.right}</Text>
      </View>
    </View>
  );
}

function SbsDot({
  p, dy, color, label, small,
}: { p: number | null; dy: number; color: string; label?: string; small?: boolean }) {
  if (p == null) return null;
  const size = small ? 10 : 20;
  return (
    <View
      style={{
        position: 'absolute', left: `${p}%`, marginLeft: -size / 2,
        top: (6 - size) / 2 + dy,
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: color, opacity: small ? 0.9 : 1,
        alignItems: 'center', justifyContent: 'center',
        shadowColor: color, shadowOpacity: small ? 0 : 0.5,
        shadowRadius: small ? 0 : 6, shadowOffset: { width: 0, height: 0 },
      }}>
      {label ? (
        <Text style={{ fontSize: 8, fontWeight: '800', color: Palette.white }}>{label}</Text>
      ) : null}
    </View>
  );
}

/**
 * A dimension track with both partners on it.
 *
 * ── THIS IS THE WEBSITE'S DimTrackViz, PORTED EXACTLY ─────────────────────
 * Every number here is the website's, because the placement rule is the whole
 * point of the chart and two products cannot round it differently.
 *
 *   position   ((score - 1) / 4) as a fraction of the track
 *   close      the two are within 8 percentage points of each other
 *   stagger    when close, one dot lifts 11 points and the other drops 11,
 *              whichever is further left going up. Without it two people who
 *              nearly agree print on top of each other and the page says they
 *              answered the same thing.
 *   margin     symmetric, and the same whether or not the dots are staggered,
 *              so rows in a tile are all the same height
 *   initials   hidden when both partners' first initials are the same letter,
 *              because two dots both saying E resolve nothing. A name key
 *              appears underneath only in that case.
 *
 * The colours are fixed: the reader is orange and the partner is blue, on
 * every chart in the product.
 */
/** A 1..5 score as a position on the track. Null stays null: an unanswered
 *  dimension is left off rather than defaulted to the middle, which would read
 *  as a real answer. */
function unit(v: number | null | undefined) {
  return v == null ? null : Math.max(0, Math.min(1, (v - 1) / 4));
}

const CLOSE_PCT = 8;
const STAGGER = 11;

function Slider({
  you, them, youName, themName, onDark,
}: {
  you: number | null; them: number | null; youName: string; themName: string;
  onDark?: boolean;
}) {
  const yPct = you == null ? null : Math.max(0, Math.min(1, you)) * 100;
  const tPct = them == null ? null : Math.max(0, Math.min(1, them)) * 100;
  const close = yPct != null && tPct != null && Math.abs(yPct - tPct) < CLOSE_PCT;
  const youIsLeft = (yPct ?? 0) <= (tPct ?? 0);
  const yDy = close ? (youIsLeft ? -STAGGER : STAGGER) : 0;
  const tDy = close ? (youIsLeft ? STAGGER : -STAGGER) : 0;
  const same = initial(youName) === initial(themName);

  return (
    <View>
      <View style={{ height: 5, borderRadius: 3, backgroundColor: onDark ? 'rgba(255,255,255,0.18)' : c.border, marginVertical: 15 }}>
        {tPct != null ? <Dot pct={tPct} dy={tDy} color={THEM_COLOR} label={same ? '' : initial(themName)} /> : null}
        {yPct != null ? <Dot pct={yPct} dy={yDy} color={YOU_COLOR} label={same ? '' : initial(youName)} /> : null}
      </View>
      {same ? (
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: Spacing.lg, marginTop: Spacing.xs }}>
          {(youIsLeft
            ? [[youName, YOU_COLOR], [themName, THEM_COLOR]]
            : [[themName, THEM_COLOR], [youName, YOU_COLOR]]
          ).map(([name, colour]) => (
            <View key={name} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colour }} />
              <Text style={{ ...Type.small, fontSize: 11, color: onDark ? 'rgba(255,255,255,0.6)' : c.textMuted }}>{name}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function Dot({ pct, dy, color, label }: { pct: number; dy: number; color: string; label: string }) {
  const SIZE = 22;
  return (
    <View
      style={{
        position: 'absolute', left: `${pct}%`,
        marginLeft: -SIZE / 2, top: (5 - SIZE) / 2 + dy,
        width: SIZE, height: SIZE, borderRadius: SIZE / 2,
        backgroundColor: color, borderColor: Palette.white, borderWidth: 2.5,
        alignItems: 'center', justifyContent: 'center',
      }}>
      {label ? (
        <Text style={{ fontSize: 9, lineHeight: 11, fontWeight: '700', color: Palette.white }}>{label}</Text>
      ) : null}
    </View>
  );
}

/**
 * One dimension: its name, then the track with a pole word either side.
 *
 * The poles sit beside the bar rather than under it, which is what the website
 * does and why a dimension costs one row there instead of three.
 */
function SliderRow({
  label, left, right, you, them, youName, themName, onDark,
}: {
  label: string; left: string; right: string;
  you: number | null; them: number | null; youName: string; themName: string;
  onDark?: boolean;
}) {
  const pole = {
    ...Type.small, fontSize: 11, fontWeight: '600' as const,
    color: onDark ? 'rgba(255,255,255,0.8)' : c.textMuted, width: 68,
  };
  return (
    <View>
      <Text style={{ ...Type.small, fontWeight: '700', color: onDark ? Palette.white : c.textStrong }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
        <Text style={{ ...pole, textAlign: 'right' }}>{left}</Text>
        {/* Inset so a dot at either extreme clears the pole word instead of
            printing on it. */}
        <View style={{ flex: 1, paddingHorizontal: 13 }}>
          <Slider you={you} them={them} youName={youName} themName={themName} onDark={onDark} />
        </View>
        <Text style={pole}>{right}</Text>
      </View>
    </View>
  );
}

function Marker({ left, color, label }: { left: number; color: string; label: string }) {
  return (
    <View
      style={{
        position: 'absolute', top: -8, left: `${left * 100}%`,
        marginLeft: -10,
        width: 20, height: 20, borderRadius: Radius.pill,
        backgroundColor: color, alignItems: 'center', justifyContent: 'center',
        borderWidth: 2, borderColor: Palette.white,
      }}>
      <Text style={{ fontSize: 9, lineHeight: 11, fontWeight: '700', color: Palette.white }}>{label}</Text>
    </View>
  );
}

/** Who the two marks are. Without it the initials are a puzzle. */
function Legend({ you, them }: { you: string; them: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: Spacing.lg, marginBottom: Spacing.md }}>
      {[[you, YOU_COLOR], [them, THEM_COLOR]].map(([name, color]) => (
        <View key={name} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}>
          <View
            style={{
              width: 16, height: 16, borderRadius: Radius.pill, backgroundColor: color,
              alignItems: 'center', justifyContent: 'center',
            }}>
            <Text style={{ fontSize: 8, lineHeight: 10, fontWeight: '700', color: Palette.white }}>
              {initial(name)}
            </Text>
          </View>
          <Text style={{ ...Type.small, color: c.textMuted }}>{name}</Text>
        </View>
      ))}
    </View>
  );
}

const initial = (name: string) => (name || '?').trim().charAt(0).toUpperCase();

const card = () => ({
  backgroundColor: c.surface, borderColor: c.border, borderWidth: 1,
  borderRadius: Radius.lg, padding: Spacing.lg,
});
