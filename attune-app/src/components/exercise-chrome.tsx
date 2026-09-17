/**
 * The parts every exercise screen has, written once.
 *
 * ── WHY ───────────────────────────────────────────────────────────────────
 * Ellie, of the arrows: "Do that on all exercises." Of the eyebrow: "Eyebrow
 * in top left on every question page across all exercises should say the full
 * name of the exercise in that exercise's appropriate color."
 *
 * Five screens carried their own version of both, which is why one of them had
 * a category where the exercise's name belongs and another had two centred
 * buttons where the other four now have arrows. A change asked for once should
 * not have to be made five times and remembered five times.
 */

import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import {
  AccentFallback, AccentFor, Colors, Palette, Radius, Spacing, Type,
} from '@/constants/attune-theme';

const c = Colors.light;

/** The exercise's own colour, from the one place that maps them. */
export function exerciseColor(key?: string | null) {
  return (key && AccentFor[key]) || AccentFallback;
}

/**
 * The name of the exercise, top left, in its own colour.
 *
 * The full name rather than the short one: this is a heading with a line to
 * itself, not a column in a three-column table.
 */
export function ExerciseEyebrow({
  exerciseKey, label, right,
}: { exerciseKey?: string | null; label: string; right?: string | null }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Text style={{ ...Type.eyebrow, color: exerciseColor(exerciseKey), flex: 1 }} numberOfLines={1}>
        {label}
      </Text>
      {right ? (
        <Text style={{ ...Type.small, color: c.textMuted, marginLeft: Spacing.md }}>{right}</Text>
      ) : null}
    </View>
  );
}

/**
 * Back on the left, Next on the right, both as arrows.
 *
 * Ellie: "a small arrow on the left that says back and arrow on the right that
 * says next." The row keeps its shape when there is nothing to go back to, so
 * Next does not move between the first question and the second.
 */
export function ExerciseNav({
  onBack, onNext, nextLabel, disabled, busy, color,
}: {
  onBack?: () => void;
  onNext: () => void;
  nextLabel: string;
  disabled?: boolean;
  busy?: boolean;
  color?: string;
}) {
  const tint = color || c.accent;
  return (
    <View
      style={{
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        marginTop: Spacing.xl,
      }}>
      {onBack ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to the previous question"
          onPress={onBack}
          hitSlop={12}
          style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingVertical: Spacing.md, paddingRight: Spacing.lg }}>
          <Text style={{ ...Type.body, color: c.textMuted }}>{'‹'}</Text>
          <Text style={{ ...Type.small, color: c.textMuted, fontWeight: '600' }}>Back</Text>
        </Pressable>
      ) : <View />}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={nextLabel}
        onPress={disabled ? undefined : onNext}
        accessibilityState={{ disabled: !!disabled }}
        hitSlop={12}
        style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingVertical: Spacing.md, paddingLeft: Spacing.lg }}>
        {busy ? (
          <ActivityIndicator color={tint} />
        ) : (
          <>
            <Text style={{ ...Type.small, fontWeight: '700', color: disabled ? c.border : tint }}>
              {nextLabel}
            </Text>
            <Text style={{ ...Type.body, color: disabled ? c.border : tint }}>{'›'}</Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

/** What the server sends to open an exercise. */
export type ExerciseIntro = {
  title: string;
  body: string[];
  note?: string | null;
  cta: string;
};

/**
 * The screen that opens an exercise.
 *
 * ── WHY EVERY EXERCISE HAS ONE NOW ────────────────────────────────────────
 * Ellie: "Rel Relf jumps right in to the questioning and I don't like that.
 * Need the flow to match exactly for web and app."
 *
 * The website opens all five with a page like this and the app opened none of
 * them, which is two products rather than one. The words come from the server
 * so they cannot be a third version: api/_lib/exercise-intro.js.
 */
export function ExerciseOpening({
  exerciseKey, label, intro, onBegin,
}: {
  exerciseKey?: string | null;
  label: string;
  intro: ExerciseIntro;
  onBegin: () => void;
}) {
  const tint = exerciseColor(exerciseKey);
  return (
    <ScrollView
      contentContainerStyle={{
        padding: Spacing.xl, paddingBottom: Spacing.xxxl, flexGrow: 1, justifyContent: 'center',
      }}>
      <Text style={{ ...Type.eyebrow, color: tint }}>{label}</Text>
      <Text style={{ ...Type.hero, color: c.textStrong, marginTop: Spacing.md }}>{intro.title}</Text>
      {intro.body.map((para) => (
        <Text key={para.slice(0, 24)} style={{ ...Type.body, color: c.textMuted, marginTop: Spacing.lg, lineHeight: 24 }}>
          {para}
        </Text>
      ))}
      {intro.note ? (
        <Text style={{ ...Type.small, color: c.textMuted, marginTop: Spacing.xl }}>{intro.note}</Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        onPress={onBegin}
        style={{
          marginTop: Spacing.xxl, borderRadius: Radius.md, paddingVertical: Spacing.lg,
          alignItems: 'center', backgroundColor: tint,
        }}>
        <Text style={{ ...Type.small, color: Palette.white, fontWeight: '700' }}>{intro.cta}</Text>
      </Pressable>
    </ScrollView>
  );
}
