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
import type { ConflictResults, CoupleResults, ResultDimension } from '@/api/client';
import ConflictResultsView from '@/components/conflict-results';
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

type SectionKey = 'overview' | 'couple-type' | 'inner' | 'connection' | 'hard' | 'conflict';

export default function Results({
  results, owned = [],
}: { results: CoupleResults; owned?: string[] }) {
  const [section, setSection] = useState<SectionKey>('overview');

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

  // A section someone owns is listed even when it cannot open yet, greyed with
  // the reason. SCREENS.md is blunt about why: a section that vanishes reads as
  // a bug, which is exactly what happened on the web. A section nobody owns is
  // genuinely absent, because listing it would be advertising inside results.
  const sections: { key: SectionKey; label: string; enabled: boolean; locked?: string }[] = [
    { key: 'overview', label: 'At a glance', enabled: true },
    { key: 'couple-type', label: 'Couple Type', enabled: !!content?.coupleType },
    { key: 'inner', label: 'Internal Processing', enabled: byDomain.inner.length > 0 },
    { key: 'connection', label: 'How You Connect', enabled: byDomain.connection.length > 0 },
    { key: 'hard', label: 'When Things Get Hard', enabled: byDomain.hard.length > 0 },
    {
      key: 'conflict',
      label: 'Conflict Patterns',
      enabled: !!conflict?.ready,
      // Only if they own it. The server's reason is used rather than a guess,
      // so the app never explains a lock it does not understand.
      locked: owned.includes('conflict') && conflict && !conflict.ready
        ? lockReason(conflict.reason)
        : undefined,
    },
  ];

  return (
    <View style={{ flex: 1 }}>
      {/* The spine. Sideways rather than stacked, so it costs one line of
          height on a screen whose job is the content below it. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: Spacing.xl, gap: Spacing.sm, paddingBottom: Spacing.lg }}>
        {sections.filter((s) => s.enabled || s.locked).map((s) => {
          const on = s.key === section;
          const locked = !s.enabled;
          return (
            <Pressable
              key={s.key}
              onPress={locked ? undefined : () => setSection(s.key)}
              disabled={locked}
              accessibilityState={{ disabled: locked }}
              style={{
                paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg,
                borderRadius: Radius.pill,
                backgroundColor: on ? c.textStrong : locked ? 'transparent' : c.surface,
                borderColor: on ? c.textStrong : c.border,
                borderWidth: 1,
                borderStyle: locked ? 'dashed' : 'solid',
              }}>
              <Text
                style={{
                  ...Type.small, fontWeight: '700',
                  color: on ? Palette.white : locked ? c.border : c.textMuted,
                }}>
                {s.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* The reason a locked section is locked, said once under the list. A
          greyed pill on its own tells someone it is unavailable but not why. */}
      {sections.filter((s) => !s.enabled && s.locked).map((s) => (
        <Text key={s.key} style={{ ...Type.small, color: c.textMuted, paddingHorizontal: Spacing.xl, marginBottom: Spacing.md }}>
          {s.label}: {s.locked}
        </Text>
      ))}

      {section === 'overview' ? <Glance results={results} you={you} them={them} viewer={viewer} wideGap={wideGap} /> : null}
      {section === 'couple-type' ? <CoupleType results={results} you={you} them={them} /> : null}
      {section === 'inner' ? <Domain title="Internal Processing" accent={Palette.indigo} dims={byDomain.inner} you={you} them={them} viewer={viewer} wideGap={wideGap} /> : null}
      {section === 'connection' ? <Domain title="How You Connect" accent={SectionColor.communication} dims={byDomain.connection} you={you} them={them} viewer={viewer} wideGap={wideGap} /> : null}
      {section === 'hard' ? <Domain title="When Things Get Hard" accent={SectionColor.conflict} dims={byDomain.hard} you={you} them={them} viewer={viewer} wideGap={wideGap} /> : null}
      {section === 'conflict' && conflict?.ready ? <ConflictResultsView data={conflict} /> : null}
    </View>
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
    <ScrollView contentContainerStyle={{ paddingBottom: BottomTabInset + Spacing.xxl }}>
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
    <ScrollView contentContainerStyle={{ paddingBottom: BottomTabInset + Spacing.xxl }}>
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
    <ScrollView contentContainerStyle={{ paddingBottom: BottomTabInset + Spacing.xxl }}>
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
