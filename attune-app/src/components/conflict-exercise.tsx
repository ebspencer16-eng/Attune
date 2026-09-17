/**
 * Conflict Patterns, the exercise.
 *
 * Six kinds of question, each rendered from the `kind` the question carries
 * rather than from a map of which id is which shape. Adding a question
 * server-side then needs no app change unless it introduces a new kind.
 *
 * This exercise asks people to report on things they are not proud of. Two
 * consequences for how it looks. Nothing is scored on screen, so nobody watches
 * a number get worse as they answer honestly. And the frequency options are
 * plain words in a neutral row, with no colour running from good to bad, since
 * a red button for "Often" is a nudge to under-report and under-reporting is
 * the one thing that makes this exercise useless.
 *
 * Saved as a record, because conflict_data holds { answers, completedAt } in a
 * single column and is only done when completedAt is set.
 */

import { useCallback, useEffect, useState } from 'react';

import { useScreenTime } from '@/hooks/use-screen-time';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fetchConflictQuestions, saveExercise } from '@/api/client';
import type { ApiError, ConflictQuestion, ConflictQuestionSet } from '@/api/client';
import { ScreenError, ScreenLoading } from '@/components/screen-states';
import PageWash from '@/components/page-wash';
import { LOADING } from '@/constants/loading-copy';
import {
  ExerciseComplete, ExerciseEyebrow, ExerciseNav, ExerciseOpening, RankInOrder, exerciseColor,
} from '@/components/exercise-chrome';
import {
  BottomTabInset, Colors, MaxContentWidth, Palette, Radius, Spacing, Type, inputType,
} from '@/constants/attune-theme';

const c = Colors.light;

type Answer = number | string | string[];

export default function ConflictExercise({
  onClose, onFinished,
}: { onClose: () => void; onFinished: () => void }) {
  useScreenTime('conflict');
  const [set, setSet] = useState<ConflictQuestionSet | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(true);
  // Bumped by the retry button. Without it the button set loading and nothing
  // refetched, because the effect's dependencies had not changed, so Try again
  // led to a spinner that never resolved.
  const [attempt, setAttempt] = useState(0);
  const [intro, setIntro] = useState(true);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [saving, setSaving] = useState(false);
  // Three of the five exercises told someone when an answer had not saved and
  // two did not, so the same dropped request either warned you or said nothing
  // depending on which exercise you were in. Same state, same sentence.
  const [saveFailed, setSaveFailed] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetchConflictQuestions();
      if (cancelled) return;
      if (res.ok) {
        setSet(res.data);
        setError(null);
        const saved = res.data.saved?.answers as Record<string, Answer> | undefined;
        if (saved && Object.keys(saved).length) {
          setAnswers(saved);
          setIntro(false);
          const next = res.data.items.findIndex((i) => saved[i.id] === undefined);
          setIdx(next === -1 ? res.data.items.length - 1 : next);
        }
      } else setError(res.error);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [attempt]);

  const persist = useCallback(async (next: Record<string, Answer>, completed: boolean) => {
    setSaving(true);
    const res = await saveExercise({
      exercise: 'conflict', answers: next, completed, shape: set?.exercise.shape,
    });
    setSaving(false);
    setSaveFailed(!res.ok);
    return res.ok;
  }, [set]);

  if (loading) return <Shell onClose={onClose}><ScreenLoading label={LOADING.exercise} /></Shell>;
  if (error) return <Shell onClose={onClose}><ScreenError error={error} onRetry={() => { setError(null); setLoading(true); setAttempt((n) => n + 1); }} /></Shell>;
  if (!set) return <Shell onClose={onClose}><ScreenLoading /></Shell>;

  /**
   * ── THE SAME CLOSING SCREEN AS EVERY OTHER EXERCISE ──────────────────────
   * Ellie: "Build a nice completion page for each exercise." There were six of
   * these across the two surfaces saying four different things. The words come
   * from api/_lib/exercise-complete.js and the screen is the mirror of the one
   * that opened the exercise.
   */
  if (done && set.complete) {
    return (
      <Shell onClose={onClose}>
        <ExerciseComplete
          exerciseKey={'conflict'}
          completion={set.complete}
          onDone={onFinished}
        />
      </Shell>
    );
  }

  if (intro && set.intro) {
    return (
      <Shell onClose={onClose}>
        <ExerciseOpening
          exerciseKey="conflict"
          label={set.exercise.fullLabel || set.exercise.label}
          intro={set.intro}
          onBegin={() => setIntro(false)}
        />
      </Shell>
    );
  }

  const q = set.items[idx];
  if (!q) return <Shell onClose={onClose}><ScreenLoading /></Shell>;

  const value = answers[q.id];
  // Required means required by the server, which is what reads these back and
  // decides whether the exercise is finished. Treating the free-text questions
  // as optional here wrote completedAt for an answer set the server considered
  // incomplete: the exercise read Done and the results never opened.
  const required = set.requiredIds?.includes(q.id) ?? true;
  const hasValue = q.kind === 'rank'
    ? Array.isArray(value) && value.length === (q.options?.length ?? 0)
    : typeof value === 'string'
      ? value.trim() !== ''
      : value !== undefined;
  const answered = hasValue || !required;
  const isLast = idx === set.items.length - 1;

  const set1 = (v: Answer) => setAnswers((a) => ({ ...a, [q.id]: v }));

  return (
    <Shell onClose={onClose}>
      <ScrollView contentContainerStyle={pad} keyboardShouldPersistTaps="handled">
        <ExerciseEyebrow
          exerciseKey="conflict"
          label={set.exercise.fullLabel || set.exercise.label}
          right={`Question ${idx + 1} of ${set.items.length}`}
        />
        <View style={{ height: 3, borderRadius: Radius.pill, backgroundColor: c.border, marginTop: Spacing.sm, overflow: 'hidden' }}>
          <View style={{ width: `${((idx + 1) / set.items.length) * 100}%`, height: 3, backgroundColor: exerciseColor('conflict') }} />
        </View>

        <Text style={{ ...Type.title, color: c.textStrong, marginTop: Spacing.xl, marginBottom: Spacing.lg }}>
          {q.text}
        </Text>

        <Body q={q} value={value} onChange={set1} frequencyOptions={set.frequencyOptions} />

        <ExerciseNav
          onBack={idx > 0 ? () => setIdx(idx - 1) : undefined}
          nextLabel={isLast ? 'Finish' : 'Next'}
          disabled={!answered || (saving && isLast)}
          busy={saving && isLast}
          color={exerciseColor('conflict')}
          onNext={async () => {
            const next = { ...answers };
            if (isLast) {
              // Checked across the whole set, not just this screen. Back lets
              // someone move around, so the last question being answered does
              // not mean the rest are.
              const outstanding = (set.requiredIds ?? []).filter((id) => {
                const v = next[id];
                if (v === undefined) return true;
                if (Array.isArray(v)) return v.length === 0;
                if (typeof v === 'string') return v.trim() === '';
                return false;
              });
              if (outstanding.length) {
                const firstIdx = set.items.findIndex((i) => i.id === outstanding[0]);
                if (firstIdx >= 0) setIdx(firstIdx);
                return;
              }
              const ok = await persist(next, true);
              if (ok) setDone(true);
              return;
            }
            persist(next, false);
            setIdx(idx + 1);
          }}
        />
        {saveFailed ? (
          <Text style={{ ...Type.small, color: c.accentQuiet, marginTop: Spacing.md }}>
            That answer has not saved yet. It will try again on the next one.
          </Text>
        ) : null}
      </ScrollView>
    </Shell>
  );
}

/** The question itself, chosen by the kind it declares. */
function Body({
  q, value, onChange, frequencyOptions,
}: {
  q: ConflictQuestion;
  value: Answer | undefined;
  onChange: (v: Answer) => void;
  frequencyOptions: { value: number; label: string }[];
}) {
  if (q.kind === 'forcedAB') {
    return (
      <View style={{ gap: Spacing.md }}>
        {[['A', q.a, 0], ['B', q.b, 1]].map(([letter, text, val]) => (
          <Choice
            key={String(letter)}
            label={String(text ?? '')}
            selected={value === val}
            onPress={() => onChange(val as number)}
          />
        ))}
      </View>
    );
  }

  if (q.kind === 'scale' || q.kind === 'pickOne') {
    const opts = (q.options ?? []) as ({ value: number; label: string } | string)[];
    return (
      <View style={{ gap: Spacing.sm }}>
        {opts.map((o) => {
          const label = typeof o === 'string' ? o : o.label;
          const val = typeof o === 'string' ? o : o.value;
          return (
            <Choice key={String(label)} label={label} selected={value === val} onPress={() => onChange(val)} />
          );
        })}
      </View>
    );
  }

  if (q.kind === 'frequency') {
    // Plain and equal. No colour ramp from good to bad: a red button for
    // "Often" teaches people to answer "Rarely", and this exercise is worthless
    // if it is answered strategically.
    return (
      <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
        {frequencyOptions.map((o) => {
          const on = value === o.value;
          return (
            <Pressable
      accessibilityRole="button"
              key={o.value}
              onPress={() => onChange(o.value)}
              style={{
                flex: 1, paddingVertical: Spacing.md, borderRadius: Radius.md, alignItems: 'center',
                backgroundColor: on ? c.textStrong : c.surface,
                borderColor: on ? c.textStrong : c.border, borderWidth: 1,
              }}>
              <Text style={{ ...Type.small, fontWeight: '700', color: on ? Palette.white : c.textMuted }}>
                {o.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
  }

  if (q.kind === 'rank') {
    return (
      <RankInOrder
        options={(q.options ?? []) as string[]}
        order={Array.isArray(value) ? (value as string[]) : null}
        onChange={onChange}
        color={exerciseColor('conflict')}
        hint="Tap them in order, best first. Tap one again to take it back."
      />
    );
  }

  // openText
  return (
    <TextInput
      value={typeof value === 'string' ? value : ''}
      onChangeText={onChange}
      placeholder={q.placeholder || 'Your answer'}
      placeholderTextColor={c.textMuted}
      multiline
      textAlignVertical="top"
      style={{
        ...inputType(Type.body), color: c.text, minHeight: 140,
        backgroundColor: c.surface, borderColor: c.border, borderWidth: 1,
        borderRadius: Radius.lg, padding: Spacing.lg,
      }}
    />
  );
}

function Choice({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={{ ...card, borderColor: selected ? c.accent : c.border, borderWidth: selected ? 2 : 1 }}>
      <Text style={{ ...Type.body, color: c.text, fontWeight: selected ? '700' : '400' }}>{label}</Text>
    </Pressable>
  );
}

function Primary({
  label, onPress, disabled, busy,
}: { label: string; onPress: () => void; disabled?: boolean; busy?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      style={{
        marginTop: Spacing.xl, borderRadius: Radius.md, paddingVertical: Spacing.md,
        alignItems: 'center', backgroundColor: disabled ? c.border : c.accent,
      }}>
      {busy ? <ActivityIndicator color={Palette.white} /> : (
        <Text style={{ ...Type.small, color: Palette.white, fontWeight: '700' }}>{label}</Text>
      )}
    </Pressable>
  );
}

function Secondary({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button" onPress={onPress} style={{ marginTop: Spacing.sm, paddingVertical: Spacing.sm, alignItems: 'center' }}>
      <Text style={{ ...Type.small, color: c.textMuted, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

function Shell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={['top']}>
      {/* Ellie: "Exercise screens should have a hue gradient like the learn and
          notes, but the hue gradient should be the exercise color." Its own
          colour, from the same place its progress bar and its arrows take
          theirs, so an exercise renamed or recoloured takes this with it. */}
      <PageWash tint={exerciseColor('conflict')} />
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: Spacing.xl, paddingTop: Spacing.md }}>
        <Pressable
      accessibilityRole="button" onPress={onClose} hitSlop={10}>
          <Text style={{ ...Type.body, color: c.textMuted }}>Close</Text>
        </Pressable>
      </View>
      {children}
    </SafeAreaView>
  );
}

const pad = {
  padding: Spacing.xl, paddingBottom: BottomTabInset + Spacing.xxl,
  maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center',
} as const;

const card = {
  backgroundColor: c.surface, borderColor: c.border, borderWidth: 1,
  borderRadius: Radius.lg, padding: Spacing.lg,
} as const;
