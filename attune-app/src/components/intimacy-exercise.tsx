/**
 * Physical Intimacy Expectations, answered in the app.
 *
 * ── THREE KINDS OF QUESTION ───────────────────────────────────────────────
 * scale    pick one option
 * selfref  pick one, but the options describe you relative to your partner
 * multi    pick as many as are true
 *
 * The app renders what each item says it is. It does not know which id is
 * which kind, and it does not know what any of them mean: the scoring lives on
 * the server and the app never reproduces it.
 *
 * ── DECLINING IS AN ANSWER ────────────────────────────────────────────────
 * Every question carries a "Prefer not to say" option, with a null value, sent
 * by the server as part of the question rather than added here. It is stored,
 * and the results treat a dimension one person declined differently from one
 * they simply have not reached. So this screen never hides that option, never
 * makes it look like a failure to answer, and never requires anything.
 *
 * ── WHAT THIS SCREEN DOES NOT DO ──────────────────────────────────────────
 * It shows no running total, no score, and nothing about the partner. Someone
 * answering questions about their own sex life should not be watching a number
 * move while they do it. That is about this screen, not a privacy claim: once
 * both partners finish, the results compare their answers side by side, which
 * is what the exercise is sold as.
 */

import { useCallback, useEffect, useState } from 'react';

import { useScreenTime } from '@/hooks/use-screen-time';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fetchExerciseQuestions, saveExercise } from '@/api/client';
import type { ApiError, IntimacyQuestionSet } from '@/api/client';
import { ScreenError, ScreenLoading } from '@/components/screen-states';
import { ExerciseComplete, ExerciseEyebrow, ExerciseNav, exerciseColor, ExerciseOpening } from '@/components/exercise-chrome';
import {
  BottomTabInset, Colors, MaxContentWidth, Palette, Radius, Spacing, Type,
} from '@/constants/attune-theme';
import { WAITING } from '@/constants/waiting';
import { LOADING } from '@/constants/loading-copy';

const c = Colors.light;

/**
 * A question and the instruction tacked onto the end of it.
 *
 * The question bank writes "(select all that are true)" after the question
 * itself. Ellie asked for "Select all that apply", italic, on any question
 * with a phrase like it. Splitting rather than rewriting means the question
 * bank stays one source and every phrasing of that instruction gets the same
 * treatment, including ones written later.
 */
function splitInstruction(text: string): { text: string; instruction: string | null } {
  const m = /^(.*?)\s*\((select all[^)]*|choose as many[^)]*)\)\s*$/i.exec(text || '');
  if (!m) return { text: text || '', instruction: null };
  return { text: m[1], instruction: 'Select all that apply' };
}

/** A scalar answer is stored as the option label; a multi as an array of values. */
type Answers = Record<string, string | (string | null)[]>;

export default function IntimacyExercise({
  onClose, onFinished,
}: { onClose: () => void; onFinished: () => void }) {
  useScreenTime('intimacy');
  /**
   * Whether the opening screen is still showing.
   *
   * `started` is what makes it skippable: someone resuming a half-answered
   * exercise has read this page and wants the question they left off on.
   */
  const [opening, setOpening] = useState(true);
  const [set, setSet] = useState<IntimacyQuestionSet | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetchExerciseQuestions<IntimacyQuestionSet>('intimacy');
      if (cancelled) return;
      if (res.ok) {
        setSet(res.data);
        setError(null);
        const saved = res.data.saved?.answers as Answers | undefined;
        if (saved) {
          setAnswers(saved);
          const next = res.data.items.findIndex((i) => saved[i.id] == null);
          setIdx(next === -1 ? res.data.items.length - 1 : next);
        }
      } else setError(res.error);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [attempt]);

  const items = set?.items ?? [];
  const item = items[idx];

  const persist = useCallback(async (next: Answers, completed: boolean) => {
    setSaving(true);
    const res = await saveExercise({
      exercise: 'intimacy', answers: next, completed, shape: set?.exercise.shape,
    });
    setSaving(false);
    setSaveFailed(!res.ok);
    return res.ok;
  }, [set]);

  if (loading) return <Shell onClose={onClose}><ScreenLoading label={LOADING.exercise} /></Shell>;
  if (error) {
    return (
      <Shell onClose={onClose}>
        <ScreenError
          error={error}
          onRetry={() => { setError(null); setLoading(true); setAttempt((n) => n + 1); }}
        />
      </Shell>
    );
  }
  if (!set || !items.length || !item) return <Shell onClose={onClose}><ScreenLoading /></Shell>;

  /**
   * ── THE SCREEN THAT OPENS IT ────────────────────────────────────────────
   * Ellie: "Need the flow to match exactly for web and app." The website opens
   * every exercise with its name and what it is for; the app opened none of
   * them. Skipped for someone coming back to a half-finished exercise, who has
   * read it already and wants their place.
   */
  const started = Object.keys(answers || {}).length > 0;

  if (opening && set.intro && !started) {
    return (
      <Shell onClose={onClose}>
        <ExerciseOpening
          exerciseKey="intimacy"
          label={set.exercise.fullLabel || set.exercise.label}
          intro={set.intro}
          onBegin={() => setOpening(false)}
        />
      </Shell>
    );
  }

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
          exerciseKey={'intimacy'}
          completion={set.complete}
          onDone={onFinished}
        />
      </Shell>
    );
  }

  const value = answers[item.id];
  const isMulti = item.kind === 'multi';
  const isLast = idx === items.length - 1;
  const chosenMulti = Array.isArray(value) ? value : [];

  const dimension = set.dimensions.find((d) => d.id === item.dimension);

  const choose = (optionValue: string | number | null, label: string) => {
    setSaveFailed(false);
    if (!isMulti) {
      setAnswers((prev) => ({ ...prev, [item.id]: label }));
      return;
    }
    // Multi-select stores values. "Prefer not to say" is a null in the array
    // and is exclusive: declining and also naming three things is not a
    // coherent answer, and the scorer reads the null as a decline.
    setAnswers((prev) => {
      const current = Array.isArray(prev[item.id]) ? (prev[item.id] as (string | null)[]) : [];
      if (optionValue === null) return { ...prev, [item.id]: [null] };
      const without = current.filter((v) => v !== null);
      const next = without.includes(optionValue as string)
        ? without.filter((v) => v !== optionValue)
        : [...without, optionValue as string];
      return { ...prev, [item.id]: next };
    });
  };

  const advance = async () => {
    const next = { ...answers };
    if (isLast) {
      const ok = await persist(next, true);
      if (ok) setDone(true);
      return;
    }
    persist(next, false);
    setIdx(idx + 1);
  };

  return (
    <Shell onClose={onClose}>
      <ScrollView
        contentContainerStyle={{
          padding: Spacing.xl, paddingBottom: BottomTabInset,
          maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center',
        }}>
        <ExerciseEyebrow
          exerciseKey="intimacy"
          label={set.exercise.fullLabel || set.exercise.label}
          right={`Question ${idx + 1} of ${items.length}`}
        />

        <View style={{ height: 3, borderRadius: Radius.pill, backgroundColor: c.border, marginTop: Spacing.sm, overflow: 'hidden' }}>
          <View style={{ width: `${((idx + 1) / items.length) * 100}%`, height: 3, backgroundColor: exerciseColor('intimacy') }} />
        </View>

        {/* ── THE INSTRUCTION AT THE END OF A QUESTION ─────────────────
            Ellie: change "(select all that are true)" to an italicised "Select
            all that apply", "on any question with a similar phrase at the
            end". So it is split off the question rather than edited into the
            question text: the same treatment works for every phrasing the
            question bank has, and the questions stay one source. */}
        <Text style={{ ...Type.title, color: c.textStrong, marginTop: Spacing.xl }}>
          {splitInstruction(item.text).text}
          {splitInstruction(item.text).instruction ? (
            <Text style={{ fontStyle: 'italic' }}>{`\n${splitInstruction(item.text).instruction}`}</Text>
          ) : null}
        </Text>

        <View style={{ marginTop: Spacing.lg, gap: Spacing.sm }}>
          {item.options.map((o) => {
            const declining = o.value === null;
            const on = isMulti
              ? (declining ? chosenMulti.includes(null) : chosenMulti.includes(o.value as string))
              : value === o.label;
            return (
              <Pressable
      accessibilityRole="button"
                key={o.label}
                onPress={() => choose(o.value, o.label)}
                style={{
                  paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg,
                  borderRadius: Radius.md,
                  backgroundColor: on ? c.textStrong : c.surface,
                  borderColor: on ? c.textStrong : c.border, borderWidth: 1,
                  // Declining is set apart, not played down. It reads as one of
                  // the options rather than as giving up on the question.
                  ...(declining ? { marginTop: Spacing.md } : {}),
                }}>
                <Text
                  style={{
                    ...Type.body,
                    color: on ? Palette.white : declining ? c.textMuted : c.text,
                  }}>
                  {o.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {saveFailed ? (
          <Text style={{ ...Type.small, color: c.accentQuiet, marginTop: Spacing.md }}>
            That answer has not saved yet. It will try again on the next one.
          </Text>
        ) : null}

        {/* Never disabled. Nothing here is required, and a greyed Next on a
            question someone does not want to answer is the app insisting. */}
        <ExerciseNav
          onBack={idx > 0 ? () => setIdx(idx - 1) : undefined}
          onNext={advance}
          nextLabel={isLast ? 'Finish' : value == null ? 'Skip' : 'Next'}
          disabled={saving && isLast}
          busy={saving && isLast}
          color={exerciseColor('intimacy')}
        />


      </ScrollView>
    </Shell>
  );
}

function Shell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={['top']}>
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
