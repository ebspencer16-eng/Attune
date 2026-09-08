/**
 * Answering an exercise.
 *
 * One question at a time, on a five point scale between two options. Neither
 * option is better than the other and the screen never suggests one is: no
 * colour runs from bad to good, and the two options are given equal weight and
 * equal space.
 *
 * The app holds no question text. Everything comes from /api/questions, which
 * assembles it from the same modules the website uses. Two surfaces asking
 * slightly different questions and scoring them the same way is a quiet way to
 * make results wrong.
 *
 * Progress is saved to the server as you go, so answering on a phone and
 * finishing on a laptop works. `completedAt` is only sent on the last answer:
 * a record-shaped exercise counts as done the moment that field appears, and
 * sending it early marks an exercise complete that someone has barely started.
 */

import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fetchQuestions, saveExercise } from '@/api/client';
import type { ApiError, QuestionItem, QuestionSet } from '@/api/client';
import { ScreenError, ScreenLoading } from '@/components/screen-states';
import {
  BottomTabInset, Colors, MaxContentWidth, Palette, Radius, Spacing, Type,
} from '@/constants/attune-theme';

const c = Colors.light;

export default function Exercise({
  exerciseKey, onClose, onFinished,
}: { exerciseKey: string; onClose: () => void; onFinished: () => void }) {
  const [set, setSet] = useState<QuestionSet | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(true);
  // Bumped by the retry button. Without it the button set loading and nothing
  // refetched, because the effect's dependencies had not changed, so Try again
  // led to a spinner that never resolved.
  const [attempt, setAttempt] = useState(0);

  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetchQuestions(exerciseKey);
      if (cancelled) return;
      if (res.ok) {
        setSet(res.data);
        setError(null);
        // Pick up where they left off. Answers were saved on every question and
        // read by nobody until now, so stopping at question forty meant
        // starting again at one.
        const saved = res.data.saved;
        if (saved?.answers) {
          const restored = saved.answers as Record<string, number>;
          setAnswers(restored);
          // First unanswered question, not the count: a skipped question in the
          // middle would otherwise drop them past questions they never saw.
          const next = res.data.items.findIndex(
            (i) => !i.__partBreak && restored[i.answerKey] == null);
          setIdx(next === -1 ? res.data.items.length - 1 : next);
        }
      } else setError(res.error);
      setLoading(false);
    })();
    return () => { cancelled = true; };
    // Only the exercise and the retry counter. `set` must never be in here: the
    // effect calls setSet, so depending on it re-runs the effect on every
    // response, and every response is a new object, which is an endless fetch
    // loop against /api/questions.
    //
    // It was in here, from an over-eager find and replace, and the fixture used
    // to check this screen hid it: require returns the same object every time,
    // so React bailed out and the loop never started.
  }, [exerciseKey, attempt]);

  const items = set?.items ?? [];
  const item: QuestionItem | undefined = items[idx];

  // Questions only, for numbering. The break is a screen, not a question, and
  // counting it would make the total wrong by one.
  const questions = items.filter((i) => !i.__partBreak);
  const answeredCount = questions.filter((q) => answers[q.answerKey] != null).length;

  const persist = useCallback(async (next: Record<string, number>, completed: boolean) => {
    setSaving(true);
    const res = await saveExercise({ exercise: exerciseKey, answers: next, completed, shape: set?.exercise.shape });
    setSaving(false);
    setSaveFailed(!res.ok);
    return res.ok;
  }, [exerciseKey, set]);

  if (loading) return <Shell onClose={onClose}><ScreenLoading label="Getting your questions" /></Shell>;
  if (error) {
    return (
      <Shell onClose={onClose}>
        <ScreenError error={error} onRetry={() => { setError(null); setLoading(true); setAttempt((n) => n + 1); }} />
      </Shell>
    );
  }
  if (!set || !items.length) return <Shell onClose={onClose}><ScreenLoading /></Shell>;

  if (done) {
    return (
      <Shell onClose={onClose}>
        <View style={{ padding: Spacing.xl }}>
          <Text style={{ ...Type.hero, color: c.textStrong }}>That is everything</Text>
          <Text style={{ ...Type.body, color: c.textMuted, marginTop: Spacing.sm }}>
            Your answers are saved. Results open once you have both finished.
          </Text>
          <Pressable
            onPress={onFinished}
            style={{
              marginTop: Spacing.xl, backgroundColor: c.textStrong, borderRadius: Radius.md,
              paddingVertical: Spacing.md, alignItems: 'center',
            }}>
            <Text style={{ ...Type.small, color: Palette.white, fontWeight: '700' }}>Done</Text>
          </Pressable>
        </View>
      </Shell>
    );
  }

  // The divider between the two halves.
  if (item?.__partBreak) {
    return (
      <Shell onClose={onClose}>
        <View style={{ padding: Spacing.xl, flex: 1, justifyContent: 'center' }}>
          <Text style={{ ...Type.eyebrow, color: c.accentQuiet }}>Part two</Text>
          <Text style={{ ...Type.hero, color: c.textStrong, marginTop: Spacing.sm }}>
            Now the same questions, about your partner
          </Text>
          <Text style={{ ...Type.body, color: c.textMuted, marginTop: Spacing.md }}>
            Answer how you think they would. Nobody is marked right or wrong on
            these, and your partner never sees what you guessed.
          </Text>
          <Pressable
            onPress={() => setIdx(idx + 1)}
            style={{
              marginTop: Spacing.xl, backgroundColor: c.accent, borderRadius: Radius.md,
              paddingVertical: Spacing.md, alignItems: 'center',
            }}>
            <Text style={{ ...Type.small, color: Palette.white, fontWeight: '700' }}>Continue</Text>
          </Pressable>
        </View>
      </Shell>
    );
  }

  if (!item) return <Shell onClose={onClose}><ScreenLoading /></Shell>;

  const chosen = answers[item.answerKey] ?? null;
  const isLast = idx === items.length - 1;

  const choose = (val: number) => {
    setAnswers((prev) => ({ ...prev, [item.answerKey]: val }));
    setSaveFailed(false);
  };

  const advance = async () => {
    if (chosen == null) return;
    const next = { ...answers, [item.answerKey]: chosen };

    if (isLast) {
      const ok = await persist(next, true);
      if (ok) setDone(true);
      return;
    }
    // Saved as we go so a closed app does not lose the last twenty answers.
    // Not blocking: a failed save is reported and retried on the next answer
    // rather than trapping someone mid-exercise.
    persist(next, false);
    setIdx(idx + 1);
  };

  return (
    <Shell onClose={onClose}>
      <ScrollView contentContainerStyle={{ padding: Spacing.xl, paddingBottom: BottomTabInset, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ ...Type.eyebrow, color: c.accentQuiet }}>
            {item.isPV ? 'About your partner' : set.exercise.label}
          </Text>
          <Text style={{ ...Type.small, color: c.textMuted }}>
            {answeredCount} of {questions.length}
          </Text>
        </View>

        <View style={{ height: 3, borderRadius: Radius.pill, backgroundColor: c.border, marginTop: Spacing.sm, overflow: 'hidden' }}>
          <View style={{ width: `${(answeredCount / Math.max(1, questions.length)) * 100}%`, height: 3, backgroundColor: c.accent }} />
        </View>

        <Text style={{ ...Type.title, color: c.textStrong, marginTop: Spacing.xl }}>{item.text}</Text>

        {/* The two ends, given equal space. Lettered rather than ordered, so
            neither reads as the first or the better one. */}
        <View style={{ marginTop: Spacing.lg, gap: Spacing.md }}>
          <Option letter="A" text={item.a} />
          <Option letter="B" text={item.b} />
        </View>

        <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.xl }}>
          {set.scale.map((s) => {
            const on = chosen === s.val;
            return (
              <Pressable
                key={s.val}
                onPress={() => choose(s.val)}
                accessibilityLabel={s.label}
                style={{
                  flex: 1, paddingVertical: Spacing.md, borderRadius: Radius.md,
                  alignItems: 'center', justifyContent: 'center',
                  backgroundColor: on ? c.textStrong : c.surface,
                  borderColor: on ? c.textStrong : c.border, borderWidth: 1,
                }}>
                <Text
                  numberOfLines={2}
                  style={{
                    ...Type.small, fontSize: 11, lineHeight: 14, textAlign: 'center',
                    fontWeight: '700', color: on ? Palette.white : c.textMuted,
                  }}>
                  {s.label}
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

        <Pressable
          onPress={advance}
          disabled={chosen == null || saving}
          style={{
            marginTop: Spacing.xl, borderRadius: Radius.md, paddingVertical: Spacing.md,
            alignItems: 'center',
            backgroundColor: chosen == null ? c.border : c.accent,
          }}>
          {saving && isLast ? (
            <ActivityIndicator color={Palette.white} />
          ) : (
            <Text style={{ ...Type.small, color: Palette.white, fontWeight: '700' }}>
              {isLast ? 'Finish' : 'Next'}
            </Text>
          )}
        </Pressable>

        {idx > 0 ? (
          <Pressable onPress={() => setIdx(idx - 1)} style={{ marginTop: Spacing.sm, paddingVertical: Spacing.sm, alignItems: 'center' }}>
            <Text style={{ ...Type.small, color: c.textMuted, fontWeight: '600' }}>Back</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </Shell>
  );
}

function Option({ letter, text }: { letter: string; text: string }) {
  return (
    <View
      style={{
        flexDirection: 'row', gap: Spacing.md,
        backgroundColor: c.surface, borderColor: c.border, borderWidth: 1,
        borderRadius: Radius.lg, padding: Spacing.lg,
      }}>
      <Text style={{ ...Type.cardTitle, color: c.accentQuiet }}>{letter}</Text>
      <Text style={{ ...Type.body, color: c.text, flex: 1 }}>{text}</Text>
    </View>
  );
}

function Shell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={['top']}>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: Spacing.xl, paddingTop: Spacing.md }}>
        <Pressable onPress={onClose} hitSlop={10}>
          <Text style={{ ...Type.body, color: c.textMuted }}>Close</Text>
        </Pressable>
      </View>
      {children}
    </SafeAreaView>
  );
}
