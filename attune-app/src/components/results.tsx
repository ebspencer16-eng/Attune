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

import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { fetchConflictResults } from '@/api/client';
import type {
  ConflictResults, CoupleResults, ExpectationRow, ExpectationsSummary,
  ResultDimension, ResultsSection,
} from '@/api/client';
import ConflictResultsView from '@/components/conflict-results';
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
  results, owned = [], sections: fromServer, expectations = null,
}: {
  results: CoupleResults;
  owned?: string[];
  sections?: ResultsSection[];
  expectations?: ExpectationsSummary | null;
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
  const section = sections.some((s) => s.id === sectionId) ? sectionId : (sections[0]?.id ?? 'highlights');
  const index = sections.findIndex((s) => s.id === section);

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
      {/* The spine. Sideways rather than stacked, so it costs one line of
          height on a screen whose job is the content below it. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        // Its own height, and no share of the column's.
        //
        // None of the three children of this screen had a flex rule, so the
        // column had nothing to distribute height by and squeezed the spine
        // until its labels were a sliver. The spine is as tall as a pill, the
        // body takes what is left, and the nav row is as tall as a button.
        style={{ flexGrow: 0, flexShrink: 0 }}
        contentContainerStyle={{
          paddingHorizontal: Spacing.xl, gap: Spacing.sm,
          paddingBottom: Spacing.lg, alignItems: 'center',
        }}>
        {sections.map((s) => {
          const on = s.id === section;
          return (
            <Pressable
              key={s.id}
              onPress={() => setSectionId(s.id)}
              style={{
                paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg,
                minHeight: 36, justifyContent: 'center',
                borderRadius: Radius.pill,
                backgroundColor: on ? c.textStrong : c.surface,
                borderColor: on ? c.textStrong : c.border,
                borderWidth: 1,
              }}>
              <Text
                numberOfLines={1}
                style={{
                  ...Type.small, fontWeight: '700',
                  // Explicit, and taller than the font size. Type.small's own
                  // lineHeight clipped the descenders inside the pill: "Highlights"
                  // lost the tail of its g and "Couple Type" the tail of its p.
                  lineHeight: 18,
                  color: on ? Palette.white : c.textMuted,
                }}>
                {s.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={{ flex: 1 }}>
        <SectionBody
          section={section}
          expectations={expectations}
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
  section, results, conflict, conflictWaiting, byDomain, you, them, viewer, wideGap, expectations,
}: {
  section: string;
  expectations: ExpectationsSummary | null;
  results: CoupleResults;
  conflict: ConflictResults | null;
  conflictWaiting: boolean;
  byDomain: { inner: ResultDimension[]; connection: ResultDimension[]; hard: ResultDimension[] };
  you: string; them: string; viewer: 'a' | 'b'; wideGap: number | null;
}) {
  if (section === 'highlights') {
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
    <ScrollView contentContainerStyle={{ paddingBottom: Spacing.xxl }}>
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
          {summary.categories.filter((cat) => cat.answered > 0).map((cat) => (
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
    <ScrollView contentContainerStyle={{ paddingBottom: Spacing.xxl }}>
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

function Waiting({ title, body }: { title: string; body: string }) {
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: Spacing.xxl }}>
      <View style={{ paddingHorizontal: Spacing.xl, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}>
        <Text style={{ ...Type.title, color: c.textStrong }}>{title}</Text>
        <Text style={{ ...Type.body, color: c.textMuted, marginTop: Spacing.sm }}>{body}</Text>
      </View>
    </ScrollView>
  );
}

function NotYet({ section }: { section: string }) {
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: Spacing.xxl }}>
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
    <ScrollView contentContainerStyle={{ paddingBottom: Spacing.xxl }}>
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
    <ScrollView contentContainerStyle={{ paddingBottom: Spacing.xxl }}>
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
    <ScrollView contentContainerStyle={{ paddingBottom: Spacing.xxl }}>
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
      {expanded && dim.gap != null && wideGap != null ? (
        <Text style={{ ...Type.small, color: c.textMuted, marginTop: Spacing.md }}>
          {dim.gap >= wideGap
            ? 'One of your wider differences.'
            : 'You landed close together here.'}
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
