/**
 * Relationship Reflection, answered in the app.
 *
 * Four kinds of question in one exercise: scales, free text, one pick and one
 * ranking. Each item says what it is and this renders what it says, so adding
 * a question of an existing kind needs nothing here.
 *
 * The app holds no question text. Everything comes from /api/questions, which
 * reads the same module the website does. Two surfaces asking slightly
 * different questions and scoring them the same way is how this product starts
 * lying to people.
 *
 * ── WHAT IS REQUIRED ──────────────────────────────────────────────────────
 * The scales and the pick. The free text is the point of the exercise and is
 * still optional, because a required text box gets "n/a" typed into it, and
 * the results treat that as no answer anyway. The server decides which ids are
 * required and sends them; this screen never works it out.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, Pressable,
  ScrollView, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fetchExerciseQuestions, saveExercise } from '@/api/client';
import type { ApiError, ReflectionQuestionSet } from '@/api/client';
import { ScreenError, ScreenLoading } from '@/components/screen-states';
import {
  BottomTabInset, Colors, MaxContentWidth, Palette, Radius, Spacing, Type, inputType,
} from '@/constants/attune-theme';
import { WAITING } from '@/constants/waiting';

const c = Colors.light;

type Answers = Record<string, number | string | string[]>;

export default function ReflectionExercise({
  onClose, onFinished,
}: { onClose: () => void; onFinished: () => void }) {
  const [set, setSet] = useState<ReflectionQuestionSet | null>(null);
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
      const res = await fetchExerciseQuestions<ReflectionQuestionSet>('ex3');
      if (cancelled) return;
      if (res.ok) {
        setSet(res.data);
        setError(null);
        const saved = res.data.saved?.answers as Answers | undefined;
        if (saved) {
          setAnswers(saved);
          // First unanswered question rather than the count: a skipped free
          // text in the middle would otherwise drop someone past questions
          // they never saw.
          const next = res.data.items.findIndex((i) => saved[i.id] == null);
          setIdx(next === -1 ? res.data.items.length - 1 : next);
        }
      } else setError(res.error);
      setLoading(false);
    })();
    return () => { cancelled = true; };
    // Never `set`: this effect calls setSet, and every response is a new
    // object, so depending on it is an endless fetch loop.
  }, [attempt]);

  const items = set?.items ?? [];
  const item = items[idx];
  const required = set?.requiredIds ?? [];
  const answeredRequired = required.filter((id) => answers[id] != null).length;

  const persist = useCallback(async (next: Answers, completed: boolean) => {
    setSaving(true);
    const res = await saveExercise({
      exercise: 'ex3', answers: next, completed, shape: set?.exercise.shape,
    });
    setSaving(false);
    setSaveFailed(!res.ok);
    return res.ok;
  }, [set]);

  if (loading) return <Shell onClose={onClose}><ScreenLoading label="Getting your questions" /></Shell>;
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

  if (done) {
    return (
      <Shell onClose={onClose}>
        <View style={{ padding: Spacing.xl }}>
          <Text style={{ ...Type.hero, color: c.textStrong }}>That is everything</Text>
          <Text style={{ ...Type.body, color: c.textMuted, marginTop: Spacing.sm }}>
            {WAITING.EXERCISE_FOOTER}</Text>
          <Pressable
      accessibilityRole="button"
            onPress={onFinished}
            style={{
              marginTop: Spacing.xl, backgroundColor: c.textStrong,
              borderRadius: Radius.md, paddingVertical: Spacing.md, alignItems: 'center',
            }}>
            <Text style={{ ...Type.small, color: Palette.white, fontWeight: '700' }}>Done</Text>
          </Pressable>
        </View>
      </Shell>
    );
  }

  const value = answers[item.id];
  const isRequired = required.includes(item.id);
  const canAdvance = !isRequired || value != null;
  const isLast = idx === items.length - 1;

  const setValue = (v: number | string | string[]) => {
    setAnswers((prev) => ({ ...prev, [item.id]: v }));
    setSaveFailed(false);
  };

  const advance = async () => {
    if (!canAdvance) return;
    const next = { ...answers };
    if (isLast) {
      const ok = await persist(next, true);
      if (ok) setDone(true);
      return;
    }
    // Saved as we go so a closed app does not lose an evening's writing. Not
    // blocking: a failed save is reported and retried on the next answer
    // rather than trapping someone mid-exercise.
    persist(next, false);
    setIdx(idx + 1);
  };

  return (
    <Shell onClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            padding: Spacing.xl, paddingBottom: BottomTabInset,
            maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center',
          }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ ...Type.eyebrow, color: c.accentQuiet }}>{item.category}</Text>
            <Text style={{ ...Type.small, color: c.textMuted }}>
              {idx + 1} of {items.length}
            </Text>
          </View>

          <View style={{ height: 3, borderRadius: Radius.pill, backgroundColor: c.border, marginTop: Spacing.sm, overflow: 'hidden' }}>
            <View
              style={{
                width: `${((idx + 1) / items.length) * 100}%`,
                height: 3, backgroundColor: c.accent,
              }}
            />
          </View>

          <Text style={{ ...Type.title, color: c.textStrong, marginTop: Spacing.xl }}>{item.text}</Text>

          {item.type === 'scale' && item.scaleLabels ? (
            <ScaleChoice
              labels={item.scaleLabels}
              chosen={typeof value === 'number' ? value : null}
              onChoose={setValue}
            />
          ) : null}

          {item.type === 'pick' && item.options ? (
            <PickChoice
              options={item.options}
              chosen={typeof value === 'string' ? value : null}
              onChoose={setValue}
            />
          ) : null}

          {item.type === 'rank' && item.options ? (
            <RankChoice
              options={item.options}
              order={Array.isArray(value) ? value : null}
              onChange={setValue}
            />
          ) : null}

          {item.type === 'text' ? (
            <FreeText
              value={typeof value === 'string' ? value : ''}
              placeholder={item.placeholder || ''}
              onChange={setValue}
            />
          ) : null}

          {saveFailed ? (
            <Text style={{ ...Type.small, color: c.accentQuiet, marginTop: Spacing.md }}>
              That answer has not saved yet. It will try again on the next one.
            </Text>
          ) : null}

          <Pressable
      accessibilityRole="button"
            onPress={advance}
            disabled={!canAdvance || saving}
            style={{
              marginTop: Spacing.xl, borderRadius: Radius.md, paddingVertical: Spacing.md,
              alignItems: 'center',
              backgroundColor: canAdvance ? c.accent : c.border,
            }}>
            {saving && isLast
              ? <ActivityIndicator color={Palette.white} />
              : (
                <Text style={{ ...Type.small, color: Palette.white, fontWeight: '700' }}>
                  {isLast ? 'Finish' : canAdvance && value == null ? 'Skip' : 'Next'}
                </Text>
              )}
          </Pressable>

          {/* Said plainly rather than hidden behind a greyed button. Someone
              who has nothing to write for a question should know they can
              move on rather than inventing something. */}
          {!isRequired ? (
            <Text style={{ ...Type.small, color: c.textMuted, textAlign: 'center', marginTop: Spacing.sm }}>
              You can leave this one blank.
            </Text>
          ) : null}

          {idx > 0 ? (
            <Pressable
      accessibilityRole="button"
              onPress={() => setIdx(idx - 1)}
              style={{ marginTop: Spacing.sm, paddingVertical: Spacing.sm, alignItems: 'center' }}>
              <Text style={{ ...Type.small, color: c.textMuted, fontWeight: '600' }}>Back</Text>
            </Pressable>
          ) : null}

          <Text style={{ ...Type.small, color: c.textMuted, textAlign: 'center', marginTop: Spacing.lg }}>
            {answeredRequired} of {required.length} required answered
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Shell>
  );
}

/**
 * A five-point scale with its ends named.
 *
 * Stacked rather than in a row. These labels are sentences, not words, and a
 * row of five would give each of them about six characters.
 */
function ScaleChoice({
  labels, chosen, onChoose,
}: { labels: string[]; chosen: number | null; onChoose: (i: number) => void }) {
  return (
    <View style={{ marginTop: Spacing.lg, gap: Spacing.sm }}>
      {labels.map((label, i) => {
        const on = chosen === i;
        return (
          <Pressable
      accessibilityRole="button"
            key={label}
            onPress={() => onChoose(i)}
            style={{
              paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg,
              borderRadius: Radius.md,
              backgroundColor: on ? c.textStrong : c.surface,
              borderColor: on ? c.textStrong : c.border, borderWidth: 1,
            }}>
            <Text style={{ ...Type.body, color: on ? Palette.white : c.text }}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function PickChoice({
  options, chosen, onChoose,
}: { options: string[]; chosen: string | null; onChoose: (v: string) => void }) {
  return (
    <View style={{ marginTop: Spacing.lg, flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
      {options.map((o) => {
        const on = chosen === o;
        return (
          <Pressable
      accessibilityRole="button"
            key={o}
            onPress={() => onChoose(o)}
            style={{
              paddingVertical: Spacing.sm + 2, paddingHorizontal: Spacing.lg,
              borderRadius: Radius.pill,
              backgroundColor: on ? c.textStrong : c.surface,
              borderColor: on ? c.textStrong : c.border, borderWidth: 1,
            }}>
            <Text style={{ ...Type.small, fontWeight: '600', color: on ? Palette.white : c.text }}>
              {o}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * Ranking, by tapping in order.
 *
 * Not drag and drop. Reordering by dragging on a phone is fiddly enough that
 * people give up and accept whatever order they land on, which produces a
 * ranking nobody meant. Tapping in order is slower to describe and faster to
 * do, and tapping again takes it back.
 */
function RankChoice({
  options, order, onChange,
}: { options: string[]; order: string[] | null; onChange: (v: string[]) => void }) {
  const picked = order ?? [];
  const remaining = options.filter((o) => !picked.includes(o));

  return (
    <View style={{ marginTop: Spacing.lg }}>
      <Text style={{ ...Type.small, color: c.textMuted, marginBottom: Spacing.md }}>
        Tap them in order, most important first. Tap one again to take it back.
      </Text>

      {picked.map((o, i) => (
        <Pressable
      accessibilityRole="button"
          key={o}
          onPress={() => onChange(picked.filter((p) => p !== o))}
          style={{
            flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
            paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg,
            borderRadius: Radius.md, marginBottom: Spacing.sm,
            backgroundColor: c.textStrong,
          }}>
          <Text style={{ ...Type.cardTitle, color: Palette.white }}>{i + 1}</Text>
          <Text style={{ ...Type.body, color: Palette.white, flex: 1 }}>{o}</Text>
        </Pressable>
      ))}

      {remaining.map((o) => (
        <Pressable
      accessibilityRole="button"
          key={o}
          onPress={() => onChange([...picked, o])}
          style={{
            paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg,
            borderRadius: Radius.md, marginBottom: Spacing.sm,
            backgroundColor: c.surface, borderColor: c.border, borderWidth: 1,
          }}>
          <Text style={{ ...Type.body, color: c.text }}>{o}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function FreeText({
  value, placeholder, onChange,
}: { value: string; placeholder: string; onChange: (v: string) => void }) {
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={c.textMuted}
      multiline
      textAlignVertical="top"
      style={{
        marginTop: Spacing.lg,
        minHeight: 160,
        backgroundColor: c.surface,
        borderColor: c.border, borderWidth: 1, borderRadius: Radius.md,
        padding: Spacing.lg,
        // No lineHeight: it clips a focused input on iOS. See inputType.
        ...inputType(Type.body),
        color: c.text,
      }}
    />
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
