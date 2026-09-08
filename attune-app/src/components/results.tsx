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

/** Replace {U} and {P} with the two names, from this reader's point of view. */
function interp(text: string | null | undefined, you: string, them: string): string {
  if (!text) return '';
  return text.replace(/\{U\}/g, you).replace(/\{P\}/g, them);
}

type SectionKey = 'overview' | 'couple-type' | 'inner' | 'connection' | 'hard' | 'conflict';

export default function Results({ results }: { results: CoupleResults }) {
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

  // Names, from this reader's side. The payload does not say which partner is
  // reading, so `a` is treated as you. When the app knows the viewer's id this
  // becomes a lookup rather than an assumption, and it is marked as such.
  const you = content?.names?.a || 'You';
  const them = content?.names?.b || 'Your partner';

  const byDomain = useMemo(() => ({
    inner: dims.filter((d) => d.domain === 'inner'),
    connection: dims.filter((d) => d.domain === 'connection'),
    hard: dims.filter((d) => d.domain === 'hard'),
  }), [dims]);

  const sections: { key: SectionKey; label: string; enabled: boolean }[] = [
    { key: 'overview', label: 'At a glance', enabled: true },
    { key: 'couple-type', label: 'Couple Type', enabled: !!content?.coupleType },
    { key: 'inner', label: 'Internal Processing', enabled: byDomain.inner.length > 0 },
    { key: 'connection', label: 'How You Connect', enabled: byDomain.connection.length > 0 },
    { key: 'hard', label: 'When Things Get Hard', enabled: byDomain.hard.length > 0 },
    { key: 'conflict', label: 'Conflict Patterns', enabled: !!conflict?.ready },
  ];

  return (
    <View style={{ flex: 1 }}>
      {/* The spine. Sideways rather than stacked, so it costs one line of
          height on a screen whose job is the content below it. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: Spacing.xl, gap: Spacing.sm, paddingBottom: Spacing.lg }}>
        {sections.filter((s) => s.enabled).map((s) => {
          const on = s.key === section;
          return (
            <Pressable
              key={s.key}
              onPress={() => setSection(s.key)}
              style={{
                paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg,
                borderRadius: Radius.pill,
                backgroundColor: on ? c.textStrong : c.surface,
                borderColor: on ? c.textStrong : c.border, borderWidth: 1,
              }}>
              <Text style={{ ...Type.small, fontWeight: '700', color: on ? Palette.white : c.textMuted }}>
                {s.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {section === 'overview' ? <Glance results={results} you={you} them={them} /> : null}
      {section === 'couple-type' ? <CoupleType results={results} you={you} them={them} /> : null}
      {section === 'inner' ? <Domain title="Internal Processing" accent={Palette.indigo} dims={byDomain.inner} you={you} them={them} /> : null}
      {section === 'connection' ? <Domain title="How You Connect" accent={SectionColor.communication} dims={byDomain.connection} you={you} them={them} /> : null}
      {section === 'hard' ? <Domain title="When Things Get Hard" accent={SectionColor.conflict} dims={byDomain.hard} you={you} them={them} /> : null}
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
function Glance({ results, you, them }: { results: CoupleResults; you: string; them: string }) {
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
                <DimensionRow key={g.dim} dim={d} you={you} them={them} />
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
  title, accent, dims, you, them,
}: { title: string; accent: string; dims: ResultDimension[]; you: string; them: string }) {
  return (
    <ScrollView contentContainerStyle={{ paddingBottom: BottomTabInset + Spacing.xxl }}>
      <View style={{ paddingHorizontal: Spacing.xl, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}>
        <Text style={{ ...Type.eyebrow, color: accent }}>Communication</Text>
        <Text style={{ ...Type.title, color: c.textStrong, marginTop: Spacing.xs, marginBottom: Spacing.lg }}>
          {title}
        </Text>
        <Legend you={you} them={them} />
        {dims.map((d) => <DimensionRow key={d.key} dim={d} you={you} them={them} expanded />)}
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
  dim, you, them, expanded,
}: { dim: ResultDimension; you: string; them: string; expanded?: boolean }) {
  // Scores are 1 to 5. Null means the person did not answer enough of it, and
  // an unanswered dimension is left off the track rather than defaulted to the
  // middle, which would read as a real answer.
  const pos = (v: number | null) => (v == null ? null : Math.max(0, Math.min(1, (v - 1) / 4)));
  const pa = pos(dim.a);
  const pb = pos(dim.b);

  return (
    <View style={{ ...card(), marginBottom: Spacing.md }}>
      <Text style={{ ...Type.cardTitle, color: c.textStrong }}>{dim.label}</Text>

      {pa == null && pb == null ? (
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
            {pa != null ? <Marker left={pa} color={YOU_COLOR} label={initial(you)} /> : null}
            {pb != null ? <Marker left={pb} color={THEM_COLOR} label={initial(them)} /> : null}
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.lg }}>
            <Text style={{ ...Type.small, color: c.textMuted }}>{dim.left}</Text>
            <Text style={{ ...Type.small, color: c.textMuted }}>{dim.right}</Text>
          </View>
        </>
      )}

      {expanded && dim.gap != null ? (
        <Text style={{ ...Type.small, color: c.textMuted, marginTop: Spacing.md }}>
          {dim.gap < 0.5
            ? 'You landed close together here.'
            : dim.gap < 1.5
              ? 'A moderate distance between you.'
              : 'One of your widest differences.'}
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
