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

import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import type { ConflictResults, ConflictSummary } from '@/api/client';
import {
  BottomTabInset, Colors, MaxContentWidth, Palette, Radius, Spacing, Type,
} from '@/constants/attune-theme';

const c = Colors.light;

type Screen = 'glance' | 'snapshot' | 'patterns' | 'wrote';

export default function ConflictResultsView({
  data, section,
}: {
  data: Extract<ConflictResults, { ready: true }>;
  /**
   * Which of the four Conflict screens to show. The website splits this into
   * conflict-overview, -snapshot, -patterns and -wrote, and notes anchor to
   * those ids, so the app shows the same four rather than one long page.
   */
  section?: string;
}) {
  const [screen, setScreen] = useState<Screen>('glance');
  const { you, partner, names, content } = data;

  const tabs: { key: Screen; label: string }[] = [
    { key: 'glance', label: 'At a glance' },
    { key: 'snapshot', label: 'Your Snapshot' },
    { key: 'patterns', label: 'Your Patterns' },
    { key: 'wrote', label: 'What You Each Wrote' },
  ];

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: Spacing.xl, gap: Spacing.sm, paddingBottom: Spacing.lg }}>
        {tabs.map((t) => {
          const on = t.key === screen;
          return (
            <Pressable
      accessibilityRole="button"
              key={t.key}
              onPress={() => setScreen(t.key)}
              style={{
                paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg, borderRadius: Radius.pill,
                backgroundColor: on ? c.textStrong : c.surface,
                borderColor: on ? c.textStrong : c.border, borderWidth: 1,
              }}>
              <Text style={{ ...Type.small, fontWeight: '700', color: on ? Palette.white : c.textMuted }}>
                {t.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {screen === 'glance' ? <Glance data={data} /> : null}
      {screen === 'snapshot' ? <Snapshot data={data} /> : null}
      {screen === 'patterns' ? <Patterns you={you} content={content} /> : null}
      {screen === 'wrote' ? <Wrote data={data} /> : null}
    </View>
  );
}

/** Glance. Coloured ground, then one thing to try per pattern worth attention. */
function Glance({ data }: { data: Extract<ConflictResults, { ready: true }> }) {
  const { you, content, names } = data;
  const worth = you.ranked.filter((p) => p.band === 'worth_watching' || p.band === 'worth_attention');

  return (
    <ScrollView contentContainerStyle={pad}>
      <LinearGradient
        colors={['#16305C', '#1B5FE8']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={{ borderRadius: Radius.xl, padding: Spacing.xl }}>
        <Text style={{ ...Type.eyebrow, color: 'rgba(255,255,255,0.6)' }}>
          {content.copy.eyebrow || 'Conflict Patterns'}
        </Text>
        <Text style={{ ...Type.title, color: Palette.white, marginTop: Spacing.sm }}>
          How conflict goes for you
        </Text>
        {you.strength ? (
          <Text style={{ ...Type.body, color: 'rgba(255,255,255,0.85)', marginTop: Spacing.md }}>
            {you.strength}
          </Text>
        ) : null}
      </LinearGradient>

      {worth.length ? (
        <View style={{ marginTop: Spacing.xl }}>
          {worth.map((p) => {
            const action = content.patternActions[p.key];
            if (!action) return null;
            return (
              <View key={p.key} style={{ ...card, marginBottom: Spacing.md }}>
                <Text style={{ ...Type.eyebrow, color: c.accentQuiet, marginBottom: Spacing.sm }}>
                  One thing to try
                </Text>
                <Text style={{ ...Type.cardTitle, color: c.textStrong }}>{action.title}</Text>
                <Text style={{ ...Type.body, color: c.text, marginTop: Spacing.sm }}>{action.body}</Text>
              </View>
            );
          })}
        </View>
      ) : (
        <View style={{ ...card, marginTop: Spacing.xl }}>
          <Text style={{ ...Type.body, color: c.text }}>
            {content.copy.allClear || 'Nothing here is showing up often enough to need attention.'}
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

/** Snapshot. The three shared questions, and what each of you helps with. */
function Snapshot({ data }: { data: Extract<ConflictResults, { ready: true }> }) {
  const { you, partner, names, content } = data;

  return (
    <ScrollView contentContainerStyle={pad}>
      <View style={{ ...card }}>
        <Text style={{ ...Type.eyebrow, color: c.accentQuiet, marginBottom: Spacing.md }}>Conflict</Text>
        {content.snapshotRows.map((row) => {
          const chips = content.openingChips[row.id];
          const mine = pickChip(you.openings, row.id);
          const theirs = partner ? pickChip(partner.openings, row.id) : null;
          return (
            <View key={row.id} style={{ marginBottom: Spacing.lg }}>
              <Text style={{ ...Type.small, color: c.textMuted, marginBottom: Spacing.sm }}>{row.label}</Text>
              <View style={{ gap: Spacing.sm }}>
                <Chip name={names.you} text={chipText(chips, mine)} color={Palette.orange} />
                {partner ? (
                  <Chip name={names.partner} text={chipText(chips, theirs)} color={Palette.ink} />
                ) : null}
              </View>
            </View>
          );
        })}
        {!partner ? (
          <Text style={{ ...Type.small, color: c.textMuted }}>
            {names.partner} has not finished this yet. Their side fills in when they do.
          </Text>
        ) : null}
      </View>

      <View style={{ ...card, marginTop: Spacing.md }}>
        <Text style={{ ...Type.eyebrow, color: c.accentQuiet, marginBottom: Spacing.sm }}>Repair</Text>
        <Text style={{ ...Type.small, color: c.textMuted, marginBottom: Spacing.md }}>
          {content.copy.repairIntro || 'What helps each of you reset.'}
        </Text>
        <View style={{ flexDirection: 'row', gap: Spacing.lg }}>
          <RepairColumn title={`What ${names.you} wants`} items={you.repairRanking} />
          {partner ? (
            <RepairColumn title={`What ${names.partner} wants`} items={partner.repairRanking} />
          ) : null}
        </View>
      </View>
    </ScrollView>
  );
}

/**
 * Your Patterns. The private one.
 *
 * `you` is the only summary this function receives. The partner's is not a
 * parameter, so there is nothing here to accidentally render.
 */
function Patterns({
  you, content,
}: { you: ConflictSummary; content: Extract<ConflictResults, { ready: true }>['content'] }) {
  return (
    <ScrollView contentContainerStyle={pad}>
      {/* The privacy line sits above the content, not below it, because someone
          reading their own worst pattern should know it is private before they
          read it rather than after. */}
      <View
        style={{
          backgroundColor: '#FDF2F6', borderColor: '#F0C9DA', borderWidth: 1,
          borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.lg,
        }}>
        <Text style={{ ...Type.small, color: '#8E3A5D', fontStyle: 'italic' }}>
          {content.copy.patternsPrivacy}
        </Text>
      </View>

      {content.copy.patternsIntro ? (
        <Text style={{ ...Type.body, color: c.textMuted, marginBottom: Spacing.lg }}>
          {content.copy.patternsIntro}
        </Text>
      ) : null}

      {/* Worst first, as the server ranked them. */}
      {you.ranked.map((p) => {
        const v = p.value ?? 0;
        const color = content.bandColors[Math.min(v, content.bandColors.length - 1)] || c.border;
        const label = content.frequencyLabels[v] || '';
        const note = content.patternCopy[p.key]?.[String(v)]?.note;
        const action = v >= 2 ? content.patternActions[p.key] : null;

        return (
          <View key={p.key} style={{ ...card, marginBottom: Spacing.md }}>
            <Text style={{ ...Type.cardTitle, color: c.textStrong }}>
              {content.patternNotes[p.key] ? titleFor(p.key) : titleFor(p.key)}
            </Text>

            {/* Frequency named above the bar, in the bar's own colour, so the
                colour is never the only thing carrying the meaning. */}
            <Text style={{ ...Type.small, color, fontWeight: '700', textAlign: 'right', marginTop: Spacing.md }}>
              {label}
            </Text>
            <View style={{ height: 6, borderRadius: Radius.pill, backgroundColor: c.border, marginTop: Spacing.xs, overflow: 'hidden' }}>
              <View style={{ width: `${((v + 1) / 4) * 100}%`, height: 6, backgroundColor: color }} />
            </View>

            {note ? (
              <Text style={{ ...Type.body, color: c.text, marginTop: Spacing.md }}>{note}</Text>
            ) : null}

            {action ? (
              <View style={{ marginTop: Spacing.md, borderTopWidth: 1, borderTopColor: c.border, paddingTop: Spacing.md }}>
                <Text style={{ ...Type.eyebrow, color: c.accentQuiet, marginBottom: Spacing.xs }}>
                  One thing to try
                </Text>
                <Text style={{ ...Type.cardTitle, color: c.textStrong }}>{action.title}</Text>
                <Text style={{ ...Type.body, color: c.text, marginTop: Spacing.xs }}>{action.body}</Text>
              </View>
            ) : null}
          </View>
        );
      })}
    </ScrollView>
  );
}

/** What You Each Wrote. Only the questions you both answered knowing they were shared. */
function Wrote({ data }: { data: Extract<ConflictResults, { ready: true }> }) {
  const { you, partner, names } = data;
  const rows: { label: string; mine: string | null; theirs: string | null }[] = [
    { label: 'What already works', mine: you.strength, theirs: partner?.strength ?? null },
    { label: 'Looking back', mine: you.reflection, theirs: partner?.reflection ?? null },
    { label: 'What you appreciate', mine: you.appreciation, theirs: partner?.appreciation ?? null },
  ].filter((r) => r.mine || r.theirs);

  if (!rows.length) {
    return (
      <ScrollView contentContainerStyle={pad}>
        <Text style={{ ...Type.body, color: c.textMuted }}>
          Neither of you wrote anything on these questions.
        </Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView contentContainerStyle={pad}>
      {rows.map((r) => (
        <View key={r.label} style={{ ...card, marginBottom: Spacing.md }}>
          <Text style={{ ...Type.eyebrow, color: c.accentQuiet, marginBottom: Spacing.md }}>{r.label}</Text>
          <Written name={names.you} text={r.mine} color={Palette.orange} />
          <Written name={names.partner} text={r.theirs} color={Palette.ink} />
        </View>
      ))}
    </ScrollView>
  );
}

// ── Pieces ─────────────────────────────────────────────────────────────────

function Chip({ name, text, color }: { name: string; text: string; color: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
      <View style={{ width: 6, height: 6, borderRadius: Radius.pill, backgroundColor: color }} />
      <Text style={{ ...Type.small, color: c.textMuted, width: 64 }} numberOfLines={1}>{name}</Text>
      <Text style={{ ...Type.small, color: c.text, flex: 1 }}>{text}</Text>
    </View>
  );
}

function RepairColumn({ title, items }: { title: string; items: string[] }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ ...Type.small, color: c.textMuted, marginBottom: Spacing.sm }}>{title}</Text>
      {(items || []).slice(0, 3).map((item, i) => (
        <Text key={item} style={{ ...Type.small, color: c.text, marginBottom: Spacing.xs }}>
          {i + 1}. {item}
        </Text>
      ))}
      {!items?.length ? <Text style={{ ...Type.small, color: c.textMuted }}>Not answered.</Text> : null}
    </View>
  );
}

function Written({ name, text, color }: { name: string; text: string | null; color: string }) {
  if (!text) return null;
  return (
    <View style={{ borderLeftWidth: 2, borderLeftColor: color, paddingLeft: Spacing.md, marginBottom: Spacing.md }}>
      <Text style={{ ...Type.small, color: c.textMuted, marginBottom: Spacing.xs }}>{name}</Text>
      <Text style={{ ...Type.body, color: c.text }}>{text}</Text>
    </View>
  );
}

function pickChip(openings: { start: number | null; middle: number | null; oldTopics: number | null }, id: string) {
  if (id === 'c1') return openings.start;
  if (id === 'c2') return openings.middle;
  return openings.oldTopics;
}

function chipText(chips: { A: string; B: string } | undefined, value: number | null) {
  if (!chips || value == null) return 'Not answered';
  return value === 0 ? chips.A : chips.B;
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
