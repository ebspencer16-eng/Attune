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

import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { fetchConflictResults } from '@/api/client';
import type {
  ConflictResults, CoupleResults, ExpectationRow, ExpectationsSummary,
  HighlightCard, IntimacyDimension, IntimacyResults, NextStepGroup,
  ReflectionResults, ResultDimension, ResultsNavGroup, ResultsSection,
} from '@/api/client';
import ConflictResultsView from '@/components/conflict-results';
import HighlightCards from '@/components/highlight-cards';
import { Eyebrow } from '@/components/screen-states';
import {
  BottomTabInset, Colors, MaxContentWidth, Palette, Radius, SectionColor, Spacing, Type,
} from '@/constants/attune-theme';

/**
 * One colour per person, everywhere.
 *
 * The markers first took their colour from the dimension, so the same person
 * was orange on one row and blue on the next and the eye had to re-learn who
 * was who on every card. A person is a colour; a dimension is a row.
 */
const YOU_COLOR = Palette.orange;
const THEM_COLOR = Palette.ink;

const c = Colors.light;

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

export default function Results({
  results, owned = [], sections: fromServer, nav = [], highlights = [],
  expectations = null, intimacy = null, reflection = null, whatComesNext = null,
}: {
  results: CoupleResults;
  owned?: string[];
  sections?: ResultsSection[];
  nav?: ResultsNavGroup[];
  highlights?: HighlightCard[];
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

  const [sectionId, setSectionId] = useState<string>(sections[0]?.id ?? 'highlights');

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
  const index = sections.findIndex((s) => s.id === section);
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
      <ScrollView
        ref={topNav}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0, flexShrink: 0 }}
        contentContainerStyle={{
          paddingHorizontal: Spacing.xl, gap: Spacing.sm,
          paddingBottom: Spacing.md, alignItems: 'center',
        }}>
        {groups.map((g) => {
          const on = g.id === activeGroup?.id;
          return (
            <Pressable
              key={g.id}
              onPress={() => setSectionId(g.children?.length ? g.children[0].id : g.id)}
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
      </ScrollView>

      {activeGroup?.children?.length ? (
        <ScrollView
          ref={pageNav}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0, flexShrink: 0 }}
          contentContainerStyle={{
            paddingHorizontal: Spacing.xl, gap: Spacing.lg,
            paddingBottom: Spacing.md, alignItems: 'center',
          }}>
          {activeGroup.children.map((child) => {
            const on = child.id === section;
            return (
              <Pressable
                key={child.id}
                onPress={() => setSectionId(child.id)}
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
        </ScrollView>
      ) : null}

      <View style={{ flex: 1 }}>
        <SectionBody
          section={section}
          expectations={expectations}
          highlights={highlights}
          intimacy={intimacy}
          reflection={reflection}
          whatComesNext={whatComesNext}
          onGoToSection={setSectionId}
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

      {/* Straight through, in the website's order. Someone reading results is
          reading them, not hunting for the next pill: the spine above is for
          jumping, and this is for going. */}
      <View
        style={{
          flexDirection: 'row', gap: Spacing.md,
          paddingHorizontal: Spacing.xl,
          paddingTop: Spacing.md,
          // Clear of the tab bar. Without this the row rendered underneath it,
          // so the next section was a strip of colour behind Home and Insights.
          paddingBottom: BottomTabInset,
          backgroundColor: c.background,
          borderTopColor: c.border,
          borderTopWidth: 1,
        }}>
        {index > 0 ? (
          <Pressable
            onPress={() => setSectionId(sections[index - 1].id)}
            style={{
              flex: 1, paddingVertical: Spacing.md, borderRadius: Radius.md, alignItems: 'center',
              backgroundColor: c.surface, borderColor: c.border, borderWidth: 1,
            }}>
            <Text numberOfLines={1} style={{ ...Type.small, fontWeight: '700', color: c.textMuted }}>
              {sections[index - 1].label}
            </Text>
          </Pressable>
        ) : null}
        {index >= 0 && index < sections.length - 1 ? (
          <Pressable
            onPress={() => setSectionId(sections[index + 1].id)}
            style={{
              flex: 1, paddingVertical: Spacing.md, borderRadius: Radius.md, alignItems: 'center',
              backgroundColor: c.accent,
            }}>
            <Text numberOfLines={1} style={{ ...Type.small, fontWeight: '700', color: c.onDark }}>
              {sections[index + 1].label}
            </Text>
          </Pressable>
        ) : null}
      </View>
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
  expectations, highlights, intimacy, reflection, whatComesNext, onGoToSection,
}: {
  section: string;
  expectations: ExpectationsSummary | null;
  highlights: HighlightCard[];
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
      return <HighlightCards cards={highlights} onDone={() => onGoToSection('couple-type')} />;
    }
    return <Glance results={results} you={you} them={them} viewer={viewer} wideGap={wideGap} />;
  }
  if (section === 'couple-type') return <CoupleType results={results} you={you} them={them} />;

  if (section === 'comm-overview') {
    return <Glance results={results} you={you} them={them} viewer={viewer} wideGap={wideGap} />;
  }
  if (section === 'comm-inner') {
    return <Domain title="Internal Processing" accent={Palette.indigo} dims={byDomain.inner} you={you} them={them} viewer={viewer} wideGap={wideGap} />;
  }
  if (section === 'comm-connection') {
    return <Domain title="How You Connect" accent={SectionColor.communication} dims={byDomain.connection} you={you} them={them} viewer={viewer} wideGap={wideGap} />;
  }
  if (section === 'comm-hard') {
    return <Domain title="When Things Get Hard" accent={SectionColor.conflict} dims={byDomain.hard} you={you} them={them} viewer={viewer} wideGap={wideGap} />;
  }

  if (section === 'exp-overview') {
    return <ExpectationsOverview summary={expectations} you={you} them={them} />;
  }
  if (section.startsWith('exp-convo-')) {
    const bucket = expectations?.categories.find((cat) => cat.section === section) ?? null;
    return <ExpectationsConversation bucket={bucket} you={you} them={them} />;
  }

  if (section === 'what-comes-next') {
    return <WhatComesNext data={whatComesNext} onGoToSection={onGoToSection} />;
  }

  if (section === 'reflection-overview') return <ReflectionOverview data={reflection} />;
  if (section === 'reflection-ratings') return <ReflectionRatings data={reflection} />;
  if (section === 'reflection-story') return <ReflectionStory data={reflection} />;
  if (section === 'reflection-plan') return <ReflectionPlan data={reflection} />;

  if (section === 'intimacy-overview') return <IntimacyOverview data={intimacy} />;
  if (section === 'intimacy-plan') return <IntimacyConversations data={intimacy} />;
  if (section.startsWith('intimacy-')) {
    const dim = intimacy?.dimensions.find((d) => d.section === section) ?? null;
    return <IntimacyDimensionView dim={dim} />;
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

/**
 * Expectations, in one number and five conversations.
 *
 * The number is what the exercise is for: how often two people assumed the
 * same thing. Neither a high nor a low one is a verdict, so nothing here is
 * coloured good or bad, and the copy names the differences as conversations
 * rather than as problems.
 */
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

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: Spacing.xxl }}>
      <View style={{ paddingHorizontal: Spacing.xl, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}>
        <Eyebrow>Expectations</Eyebrow>
        <Text style={{ ...Type.hero, color: c.textStrong }}>
          {summary.differences === 0
            ? 'You matched on everything you both answered.'
            : `${summary.differences} of ${summary.answered} where you assumed different things.`}
        </Text>
        <Text style={{ ...Type.body, color: c.textMuted, marginTop: Spacing.md }}>
          {summary.differences === 0
            ? 'That is rare. Worth revisiting when something in your life changes.'
            : 'Not disagreements. Neither of you knew the other had a different answer, which is the only reason they are worth reading together.'}
        </Text>

        <View style={{ marginTop: Spacing.xl, gap: Spacing.md }}>
          {[
            ...summary.categories.filter((cat) => cat.answered > 0),
            ...(summary.life.length ? [{
              section: 'life',
              label: 'The bigger questions',
              answered: summary.life.length,
              aligned: summary.life.filter((r) => r.aligned).length,
              differences: summary.life.filter((r) => !r.aligned).length,
              rows: summary.life,
            }] : []),
          ].map((cat) => (
            <View
              key={cat.section}
              style={{
                backgroundColor: c.surface, borderColor: c.border, borderWidth: 1,
                borderRadius: Radius.lg, padding: Spacing.lg,
              }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ ...Type.cardTitle, color: c.textStrong, flex: 1 }}>{cat.label}</Text>
                <Text style={{ ...Type.small, color: c.textMuted }}>
                  {cat.differences === 0 ? 'All matched' : `${cat.differences} to talk about`}
                </Text>
              </View>
              <View style={{ height: 4, borderRadius: Radius.pill, backgroundColor: c.border, marginTop: Spacing.md, overflow: 'hidden' }}>
                <View
                  style={{
                    width: `${cat.answered ? (cat.aligned / cat.answered) * 100 : 0}%`,
                    height: 4, backgroundColor: c.accentQuiet,
                  }}
                />
              </View>
            </View>
          ))}
        </View>

        {summary.life.length ? (
          <View style={{ marginTop: Spacing.xl }}>
            <Eyebrow>The bigger questions</Eyebrow>
            <Text style={{ ...Type.small, color: c.textMuted, marginBottom: Spacing.md }}>
              Not about who does what. These are the ones worth knowing you see
              differently before it matters.
            </Text>
            {summary.life.map((row) => (
              <ExpectationRowView key={row.key} row={row} you={you} them={them} />
            ))}
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

/** One conversation: every item in that category, differences first. */
function ExpectationsConversation({
  bucket, you, them,
}: {
  bucket: ExpectationsSummary['categories'][number] | null;
  you: string;
  them: string;
}) {
  if (!bucket || bucket.answered === 0) {
    return (
      <Waiting
        title={bucket?.label || 'Expectations'}
        body="Neither of you answered anything in this area, so there is nothing to compare."
      />
    );
  }

  // Differences first. The matches still appear, because knowing what you
  // already agree on is the reason the differences are not alarming.
  const ordered = [...bucket.rows].sort((a, b) => Number(a.aligned) - Number(b.aligned));

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: Spacing.xxl }}>
      <View style={{ paddingHorizontal: Spacing.xl, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}>
        <Eyebrow>Expectations</Eyebrow>
        <Text style={{ ...Type.title, color: c.textStrong }}>{bucket.label}</Text>
        <Text style={{ ...Type.body, color: c.textMuted, marginTop: Spacing.sm }}>
          {bucket.differences === 0
            ? `You matched on all ${bucket.answered}.`
            : `${bucket.differences} of ${bucket.answered} where you pictured it differently.`}
        </Text>

        <View style={{ marginTop: Spacing.lg }}>
          {ordered.map((row) => <ExpectationRowView key={row.key} row={row} you={you} them={them} />)}
        </View>
      </View>
    </ScrollView>
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

      {/* Said in words, not colour. A red row would make a difference read as
          a fault, and neither answer here is the right one. */}
      <Text style={{ ...Type.small, color: c.textMuted, marginTop: Spacing.md }}>
        {row.aligned ? 'You pictured this the same way.' : 'Worth talking about.'}
      </Text>
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

function IntimacyOverview({ data }: { data: IntimacyResults | null }) {
  if (!data) {
    return (
      <Waiting
        title="Physical Intimacy"
        body="This opens when you have both finished the exercise."
      />
    );
  }
  const spoken = data.dimensions.filter((d) => d.state !== 'unspoken');
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: Spacing.xxl }}>
      <View style={{ paddingHorizontal: Spacing.xl, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}>
        <Eyebrow>Physical Intimacy</Eyebrow>
        <Text style={{ ...Type.hero, color: c.textStrong }}>
          {data.overallState === 'aligned' ? 'You are closer together than most.'
            : data.overallState === 'unspoken' ? 'Neither of you said much here.'
            : 'Six things, and where each of you sits on them.'}
        </Text>
        <Text style={{ ...Type.body, color: c.textMuted, marginTop: Spacing.md }}>
          None of these has a right answer. The distance is the subject, and a
          wide one is a conversation you have not had yet rather than a problem
          you have.
        </Text>

        <View style={{ marginTop: Spacing.xl, gap: Spacing.md }}>
          {data.dimensions.map((d) => (
            <View
              key={d.section}
              style={{
                backgroundColor: c.surface, borderColor: c.border, borderWidth: 1,
                borderRadius: Radius.lg, padding: Spacing.lg,
              }}>
              <Text style={{ ...Type.cardTitle, color: c.textStrong }}>{d.label}</Text>
              {d.intro ? (
                <Text style={{ ...Type.small, color: c.textMuted, marginTop: Spacing.xs }}>{d.intro}</Text>
              ) : null}
              <DistanceBar pct={d.distancePct} state={d.state} />
            </View>
          ))}
        </View>

        {spoken.length === 0 ? (
          <Text style={{ ...Type.small, color: c.textMuted, marginTop: Spacing.xl }}>
            You both skipped most of this. That is a valid answer, and it stays
            here if you ever want to come back to it.
          </Text>
        ) : null}
      </View>
    </ScrollView>
  );
}

function IntimacyDimensionView({ dim }: { dim: IntimacyDimension | null }) {
  if (!dim) {
    return <Waiting title="Physical Intimacy" body="This opens when you have both finished the exercise." />;
  }
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: Spacing.xxl }}>
      <View style={{ paddingHorizontal: Spacing.xl, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}>
        <Eyebrow>Physical Intimacy</Eyebrow>
        <Text style={{ ...Type.title, color: c.textStrong }}>{dim.label}</Text>
        {dim.intro ? (
          <Text style={{ ...Type.body, color: c.textMuted, marginTop: Spacing.sm }}>{dim.intro}</Text>
        ) : null}

        <DistanceBar pct={dim.distancePct} state={dim.state} />

        {dim.body ? (
          <View
            style={{
              backgroundColor: c.surface, borderColor: c.border, borderWidth: 1,
              borderRadius: Radius.lg, padding: Spacing.lg, marginTop: Spacing.xl,
            }}>
            <Text style={{ ...Type.body, color: c.text }}>{dim.body}</Text>
          </View>
        ) : null}

        {dim.prompt ? (
          <View style={{ marginTop: Spacing.xl }}>
            <Eyebrow>Ask each other</Eyebrow>
            <Text style={{ ...Type.title, color: c.textStrong }}>{dim.prompt}</Text>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

/**
 * The Conversations screen: every prompt, furthest apart first.
 *
 * This is what the exercise is actually for. The scores exist to decide the
 * order of these questions, not to be the thing anyone takes away.
 */
function IntimacyConversations({ data }: { data: IntimacyResults | null }) {
  if (!data) {
    return <Waiting title="Conversations" body="This opens when you have both finished the exercise." />;
  }
  if (!data.conversations.length) {
    return (
      <Waiting
        title="Conversations"
        body="You both skipped these, so there is nothing here yet. It stays if you want to come back to it."
      />
    );
  }
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: Spacing.xxl }}>
      <View style={{ paddingHorizontal: Spacing.xl, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}>
        <Eyebrow>Physical Intimacy</Eyebrow>
        <Text style={{ ...Type.hero, color: c.textStrong }}>Conversations</Text>
        <Text style={{ ...Type.body, color: c.textMuted, marginTop: Spacing.md }}>
          Furthest apart first. One at a time, and not all in one evening.
        </Text>

        <View style={{ marginTop: Spacing.xl, gap: Spacing.md }}>
          {data.conversations.map((d) => (
            <View
              key={d.section}
              style={{
                backgroundColor: c.surface, borderColor: c.border, borderWidth: 1,
                borderRadius: Radius.lg, padding: Spacing.lg,
              }}>
              <Text style={{ ...Type.eyebrow, color: c.accentQuiet }}>{d.label}</Text>
              <Text style={{ ...Type.cardTitle, color: c.textStrong, marginTop: Spacing.xs }}>{d.prompt}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
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
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: Spacing.xxl }}>
      <View style={{ paddingHorizontal: Spacing.xl, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}>
        <Eyebrow>Relationship Reflection</Eyebrow>
        <Text style={{ ...Type.hero, color: c.textStrong }}>
          You both wrote about the same year.
        </Text>
        <Text style={{ ...Type.body, color: c.textMuted, marginTop: Spacing.md }}>
          {data.writtenCount > 0
            ? `${data.writtenCount} questions you both answered in your own words, and ${data.ratings.length} you both rated.`
            : `${data.ratings.length} questions you both rated.`}
        </Text>

        {data.admired.you || data.admired.them ? (
          <View
            style={{
              backgroundColor: c.surface, borderColor: c.border, borderWidth: 1,
              borderRadius: Radius.lg, padding: Spacing.lg, marginTop: Spacing.xl,
            }}>
            <Eyebrow>What you each named</Eyebrow>
            {data.admired.you ? (
              <Text style={{ ...Type.body, color: c.text }}>
                {data.names.you} admires {data.admired.them ? '' : ''}
                {data.admired.you.toLowerCase()} in {data.names.them}.
              </Text>
            ) : null}
            {data.admired.them ? (
              <Text style={{ ...Type.body, color: c.text, marginTop: Spacing.sm }}>
                {data.names.them} admires {data.admired.them.toLowerCase()} in {data.names.you}.
              </Text>
            ) : null}
          </View>
        ) : null}

        {data.widest ? (
          <View style={{ marginTop: Spacing.xl }}>
            <Eyebrow>Furthest apart</Eyebrow>
            <Text style={{ ...Type.title, color: c.textStrong }}>{data.widest.question}</Text>
            <Text style={{ ...Type.body, color: c.textMuted, marginTop: Spacing.sm }}>
              {data.names.you} said {data.widest.you.label.toLowerCase()}.{' '}
              {data.names.them} said {data.widest.them.label.toLowerCase()}.
            </Text>
          </View>
        ) : null}
      </View>
    </ScrollView>
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
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: Spacing.xxl }}>
      <View style={{ paddingHorizontal: Spacing.xl, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}>
        <Eyebrow>Relationship Reflection</Eyebrow>
        <Text style={{ ...Type.title, color: c.textStrong }}>How You Each Rated</Text>

        <View style={{ marginTop: Spacing.md }}>
          <Legend you={data.names.you} them={data.names.them} />
        </View>

        {data.ratings.map((r) => (
          <View
            key={r.key}
            style={{
              backgroundColor: c.surface, borderColor: c.border, borderWidth: 1,
              borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.md,
            }}>
            <Text style={{ ...Type.cardTitle, color: c.textStrong }}>{r.question}</Text>

            {/* The same track and markers the dimension scales use, so a
                reader who has come this far already knows how to read it. */}
            <View style={{ height: 28, justifyContent: 'center', marginTop: Spacing.lg }}>
              <View style={{ height: 3, borderRadius: Radius.pill, backgroundColor: c.border }} />
              <Marker left={r.you.pct} color={YOU_COLOR} label={initial(data.names.you)} />
              <Marker left={r.them.pct} color={THEM_COLOR} label={initial(data.names.them)} />
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.xs }}>
              <Text style={{ ...Type.small, color: c.textMuted, flex: 1 }}>{r.low}</Text>
              <Text style={{ ...Type.small, color: c.textMuted, flex: 1, textAlign: 'right' }}>{r.high}</Text>
            </View>

            <Text style={{ ...Type.small, color: c.textMuted, marginTop: Spacing.md }}>
              {r.gapSteps === 0
                ? 'You rated this the same.'
                : `${data.names.you}: ${r.you.label}. ${data.names.them}: ${r.them.label}.`}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
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
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: Spacing.xxl }}>
      <View style={{ paddingHorizontal: Spacing.xl, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}>
        <Eyebrow>Relationship Reflection</Eyebrow>
        <Text style={{ ...Type.title, color: c.textStrong }}>Side by Side</Text>
        <Text style={{ ...Type.body, color: c.textMuted, marginTop: Spacing.sm, marginBottom: Spacing.lg }}>
          In your own words, unedited.
        </Text>

        {data.written.map((w) => (
          <View key={w.key} style={{ marginBottom: Spacing.xl }}>
            <Text style={{ ...Type.cardTitle, color: c.textStrong, marginBottom: Spacing.md }}>
              {w.question}
            </Text>

            <View
              style={{
                backgroundColor: c.surface, borderColor: c.border, borderWidth: 1,
                borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.sm,
              }}>
              <Eyebrow>{data.names.you}</Eyebrow>
              <Text style={{ ...Type.body, color: c.text }}>{w.you}</Text>
            </View>

            <View
              style={{
                backgroundColor: c.surface, borderColor: c.border, borderWidth: 1,
                borderRadius: Radius.lg, padding: Spacing.lg,
              }}>
              <Eyebrow color={c.textMuted}>{data.names.them}</Eyebrow>
              <Text style={{ ...Type.body, color: c.text }}>{w.them}</Text>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
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
function ReflectionPlan({ data }: { data: ReflectionResults | null }) {
  if (!data) return <ReflectionWaiting />;
  const commitment = data.written.find((w) => w.key === 'a6');
  const together = data.written.find((w) => w.key === 'a4');
  const bothRanked = data.priorities.you && data.priorities.them;

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: Spacing.xxl }}>
      <View style={{ paddingHorizontal: Spacing.xl, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}>
        <Eyebrow>Relationship Reflection</Eyebrow>
        <Text style={{ ...Type.title, color: c.textStrong }}>Action Plan</Text>

        {commitment ? (
          <View style={{ marginTop: Spacing.xl }}>
            <Eyebrow>What you each said you would work on</Eyebrow>
            <View
              style={{
                backgroundColor: c.surface, borderColor: c.border, borderWidth: 1,
                borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.sm,
              }}>
              <Eyebrow>{data.names.you}</Eyebrow>
              <Text style={{ ...Type.body, color: c.text }}>{commitment.you}</Text>
            </View>
            <View
              style={{
                backgroundColor: c.surface, borderColor: c.border, borderWidth: 1,
                borderRadius: Radius.lg, padding: Spacing.lg,
              }}>
              <Eyebrow color={c.textMuted}>{data.names.them}</Eyebrow>
              <Text style={{ ...Type.body, color: c.text }}>{commitment.them}</Text>
            </View>
          </View>
        ) : null}

        {bothRanked ? (
          <View style={{ marginTop: Spacing.xl }}>
            <Eyebrow>What you each put first this year</Eyebrow>
            <View style={{ flexDirection: 'row', gap: Spacing.lg }}>
              <PriorityList name={data.names.you} items={data.priorities.you!} />
              <PriorityList name={data.names.them} items={data.priorities.them!} />
            </View>
          </View>
        ) : null}

        {together ? (
          <View style={{ marginTop: Spacing.xl }}>
            <Eyebrow>More of this, next year</Eyebrow>
            <Text style={{ ...Type.body, color: c.text }}>{data.names.you}: {together.you}</Text>
            <Text style={{ ...Type.body, color: c.text, marginTop: Spacing.sm }}>
              {data.names.them}: {together.them}
            </Text>
          </View>
        ) : null}

        {!commitment && !bothRanked && !together ? (
          <Text style={{ ...Type.body, color: c.textMuted, marginTop: Spacing.lg }}>
            This fills in from the last few questions of the exercise, which you
            have not both answered yet.
          </Text>
        ) : null}
      </View>
    </ScrollView>
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
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: Spacing.xxl }}>
      <View style={{ paddingHorizontal: Spacing.xl, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}>
        <Eyebrow>What comes next</Eyebrow>
        <Text style={{ ...Type.hero, color: c.textStrong }}>What to do with all of this.</Text>
        <Text style={{ ...Type.body, color: c.textMuted, marginTop: Spacing.md }}>
          Not all at once. One of these, this week, is more than most couples do
          with a result like this.
        </Text>

        {data.groups.map((group) => (
          <View key={group.id} style={{ marginTop: Spacing.xl }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Eyebrow>{group.label}</Eyebrow>
              <Pressable onPress={() => onGoToSection(group.section)} hitSlop={8}>
                <Text style={{ ...Type.small, color: c.accentQuiet, fontWeight: '700' }}>
                  Back to it
                </Text>
              </Pressable>
            </View>

            {group.items.map((item, i) => (
              <View
                key={`${group.id}-${i}`}
                style={{
                  backgroundColor: c.surface, borderColor: c.border, borderWidth: 1,
                  borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.md,
                }}>
                <Text style={{ ...Type.cardTitle, color: c.textStrong }}>{item.title}</Text>
                {item.body ? (
                  <Text style={{ ...Type.body, color: c.textMuted, marginTop: Spacing.sm }}>{item.body}</Text>
                ) : null}
                {item.say ? (
                  <View
                    style={{
                      marginTop: Spacing.md, paddingLeft: Spacing.md,
                      borderLeftColor: c.accentQuiet, borderLeftWidth: 2,
                    }}>
                    <Text style={{ ...Type.body, color: c.text, fontStyle: 'italic' }}>
                      {item.say}
                    </Text>
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function Waiting({ title, body }: { title: string; body: string }) {
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: Spacing.xxl }}>
      <View style={{ paddingHorizontal: Spacing.xl, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}>
        <Text style={{ ...Type.title, color: c.textStrong }}>{title}</Text>
        <Text style={{ ...Type.body, color: c.textMuted, marginTop: Spacing.sm }}>{body}</Text>
      </View>
    </ScrollView>
  );
}

function NotYet({ section }: { section: string }) {
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: Spacing.xxl }}>
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
function Glance({
  results, you, them, viewer, wideGap,
}: { results: CoupleResults; you: string; them: string; viewer: 'a' | 'b'; wideGap: number | null }) {
  const type = results.content?.coupleType;
  const gaps = (results.rankedGaps ?? []).slice(0, 4);
  const dims = results.content?.dimensions ?? [];
  const find = (k: string) => dims.find((d) => d.key === k);

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: Spacing.xxl }}>
      <View style={{ paddingHorizontal: Spacing.xl, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}>
        <LinearGradient
          colors={['#1B2A5E', '#2F55C4']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: Radius.xl, padding: Spacing.xl }}>
          <Text style={{ ...Type.eyebrow, color: 'rgba(255,255,255,0.6)' }}>You two are</Text>
          <Text style={{ ...Type.hero, color: Palette.white, marginTop: Spacing.sm }}>
            {type?.name || 'Your results'}
          </Text>
          {type?.tagline ? (
            <Text style={{ ...Type.body, color: 'rgba(255,255,255,0.82)', marginTop: Spacing.md }}>
              {interp(type.tagline, you, them)}
            </Text>
          ) : null}
        </LinearGradient>

        {gaps.length ? (
          <View style={{ marginTop: Spacing.xl }}>
            <Text style={{ ...Type.eyebrow, color: c.textMuted, marginBottom: Spacing.md }}>
              Where you differ most
            </Text>
            <Legend you={you} them={them} />
            {gaps.map((g) => {
              const d = find(g.dim);
              return d ? (
                <DimensionRow key={g.dim} dim={d} you={you} them={them} viewer={viewer} wideGap={wideGap} />
              ) : null;
            })}
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

/** The couple type in full. Detail screen, so it stays on the warm ground. */
function CoupleType({ results, you, them }: { results: CoupleResults; you: string; them: string }) {
  const type = results.content?.coupleType;
  if (!type) return null;

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: Spacing.xxl }}>
      <View style={{ paddingHorizontal: Spacing.xl, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}>
        <Text style={{ ...Type.eyebrow, color: c.accentQuiet }}>Couple type</Text>
        <Text style={{ ...Type.hero, color: c.textStrong, marginTop: Spacing.sm }}>{type.name}</Text>
        <Text style={{ ...Type.body, color: c.textMuted, marginTop: Spacing.sm }}>
          {interp(type.tagline, you, them)}
        </Text>

        <View style={{ ...card(), marginTop: Spacing.xl }}>
          <Text style={{ ...Type.body, color: c.text }}>{interp(type.description, you, them)}</Text>
        </View>

        {type.nuance ? (
          <View style={{ ...card(), marginTop: Spacing.md }}>
            <Text style={{ ...Type.eyebrow, color: c.accentQuiet, marginBottom: Spacing.sm }}>
              Worth watching
            </Text>
            <Text style={{ ...Type.body, color: c.text }}>{interp(type.nuance, you, them)}</Text>
          </View>
        ) : null}

        {/* A couple type is a dynamic between two people, not a verdict on
            either of them. Said once, here, rather than hedged throughout. */}
        <Text style={{ ...Type.small, color: c.textMuted, marginTop: Spacing.xl }}>
          A couple type describes how two people move together. It is not a
          score, and neither of you is the problem in it.
        </Text>
      </View>
    </ScrollView>
  );
}

/** One Communication domain: every dimension in it, both partners on each. */
function Domain({
  title, accent, dims, you, them, viewer, wideGap,
}: {
  title: string; accent: string; dims: ResultDimension[];
  you: string; them: string; viewer: 'a' | 'b'; wideGap: number | null;
}) {
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: Spacing.xxl }}>
      <View style={{ paddingHorizontal: Spacing.xl, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}>
        <Text style={{ ...Type.eyebrow, color: accent }}>Communication</Text>
        <Text style={{ ...Type.title, color: c.textStrong, marginTop: Spacing.xs, marginBottom: Spacing.lg }}>
          {title}
        </Text>
        <Legend you={you} them={them} />
        {dims.map((d) => (
          <DimensionRow key={d.key} dim={d} you={you} them={them} viewer={viewer} wideGap={wideGap} expanded />
        ))}
      </View>
    </ScrollView>
  );
}

/**
 * One dimension, with both partners placed on it.
 *
 * A shared track rather than two bars. The subject is the distance between two
 * people, and two separate bars make that something you have to work out by
 * comparing lengths. One line with two marks on it shows it directly.
 *
 * Neither end is better than the other, so the track carries no direction and
 * no colour gradient implying one side is the good side.
 */
function DimensionRow({
  dim, you, them, viewer, wideGap, expanded,
}: {
  dim: ResultDimension; you: string; them: string;
  viewer: 'a' | 'b'; wideGap: number | null; expanded?: boolean;
}) {
  // Scores are 1 to 5. Null means the person did not answer enough of it, and
  // an unanswered dimension is left off the track rather than defaulted to the
  // middle, which would read as a real answer.
  const pos = (v: number | null) => (v == null ? null : Math.max(0, Math.min(1, (v - 1) / 4)));
  // dim.a and dim.b follow the stored order, not the reader. Resolve to yours
  // and theirs before drawing, or the two marks land on each other's values.
  const pYou = pos(viewer === 'a' ? dim.a : dim.b);
  const pThem = pos(viewer === 'a' ? dim.b : dim.a);

  return (
    <View style={{ ...card(), marginBottom: Spacing.md }}>
      <Text style={{ ...Type.cardTitle, color: c.textStrong }}>{dim.label}</Text>

      {pYou == null && pThem == null ? (
        <Text style={{ ...Type.small, color: c.textMuted, marginTop: Spacing.sm }}>
          Not enough answers to place this one.
        </Text>
      ) : (
        <>
          <View style={{ marginTop: Spacing.lg, marginBottom: Spacing.sm }}>
            {/* The track */}
            <View style={{ height: 4, borderRadius: Radius.pill, backgroundColor: c.border }} />
            {/* Two marks on it. Offset by half their width so the centre of the
                dot sits on the value rather than its left edge. */}
            {pYou != null ? <Marker left={pYou} color={YOU_COLOR} label={initial(you)} /> : null}
            {pThem != null ? <Marker left={pThem} color={THEM_COLOR} label={initial(them)} /> : null}
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.lg }}>
            <Text style={{ ...Type.small, color: c.textMuted }}>{dim.left}</Text>
            <Text style={{ ...Type.small, color: c.textMuted }}>{dim.right}</Text>
          </View>
        </>
      )}

      {/* Wide or not, using the server's own threshold. The app used to carry
          its own numbers here, which is a second copy of the rule that decides
          what a couple is told about their results. Nothing is said at all when
          the server has not sent one. */}
      {/* The website's own words for this dimension, from the server.
          This used to be a sentence written here, "One of your wider
          differences", which appears nowhere on the site. Nothing about a
          couple should be asserted in the app that the product has not
          already said in their results. */}
      {expanded && (dim.shift || dim.aligned) ? (
        <Text style={{ ...Type.body, color: c.text, marginTop: Spacing.md }}>
          {dim.shift || dim.aligned}
        </Text>
      ) : null}
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
