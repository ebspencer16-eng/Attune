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
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fetchConflictQuestions, saveExercise } from '@/api/client';
import type { ApiError, ConflictQuestion, ConflictQuestionSet } from '@/api/client';
import { ScreenError, ScreenLoading } from '@/components/screen-states';
import {
  BottomTabInset, Colors, MaxContentWidth, Palette, Radius, Spacing, Type,
} from '@/constants/attune-theme';

const c = Colors.light;

type Answer = number | string | string[];

export default function ConflictExercise({
  onClose, onFinished,
}: { onClose: () => void; onFinished: () => void }) {
  const [set, setSet] = useState<ConflictQuestionSet | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(true);
  const [intro, setIntro] = useState(true);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetchConflictQuestions();
      if (cancelled) return;
      if (res.ok) { setSet(res.data); setError(null); }
      else setError(res.error);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const persist = useCallback(async (next: Record<string, Answer>, completed: boolean) => {
    setSaving(true);
    const res = await saveExercise({
      exercise: 'conflict', answers: next, completed, shape: set?.exercise.shape,
    });
    setSaving(false);
    return res.ok;
  }, [set]);

  if (loading) return <Shell onClose={onClose}><ScreenLoading label="Getting your questions" /></Shell>;
  if (error) return <Shell onClose={onClose}><ScreenError error={error} onRetry={() => setLoading(true)} /></Shell>;
  if (!set) return <Shell onClose={onClose}><ScreenLoading /></Shell>;

  if (done) {
    return (
      <Shell onClose={onClose}>
        <View style={{ padding: Spacing.xl }}>
          <Text style={{ ...Type.hero, color: c.textStrong }}>That is everything</Text>
          <Text style={{ ...Type.body, color: c.textMuted, marginTop: Spacing.sm }}>
            Your answers are saved. Your patterns stay private to you, always.
          </Text>
          <Primary label="Done" onPress={onFinished} />
        </View>
      </Shell>
    );
  }

  if (intro && set.intro) {
    return (
      <Shell onClose={onClose}>
        <ScrollView contentContainerStyle={pad}>
          <Text style={{ ...Type.eyebrow, color: c.accentQuiet }}>{set.exercise.label}</Text>
          <Text style={{ ...Type.body, color: c.text, marginTop: Spacing.lg }}>{set.intro}</Text>
          <View style={{ ...card, marginTop: Spacing.lg }}>
            <Text style={{ ...Type.body, color: c.text }}>
              Answer honestly. The section about your own patterns is never shown
              to your partner.
            </Text>
          </View>
          <Primary label="Start" onPress={() => setIntro(false)} />
        </ScrollView>
      </Shell>
    );
  }

  const q = set.items[idx];
  if (!q) return <Shell onClose={onClose}><ScreenLoading /></Shell>;

  const value = answers[q.id];
  const answered = q.kind === 'openText'
    // Written answers are optional. Requiring prose to continue turns a
    // reflection into a toll gate and produces filler.
    ? true
    : q.kind === 'rank'
      ? Array.isArray(value) && value.length === (q.options?.length ?? 0)
      : value !== undefined && value !== '';
  const isLast = idx === set.items.length - 1;

  const set1 = (v: Answer) => setAnswers((a) => ({ ...a, [q.id]: v }));

  return (
    <Shell onClose={onClose}>
      <ScrollView contentContainerStyle={pad} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ ...Type.eyebrow, color: c.accentQuiet }}>{set.exercise.label}</Text>
          <Text style={{ ...Type.small, color: c.textMuted }}>{idx + 1} of {set.items.length}</Text>
        </View>
        <View style={{ height: 3, borderRadius: Radius.pill, backgroundColor: c.border, marginTop: Spacing.sm, overflow: 'hidden' }}>
          <View style={{ width: `${((idx + 1) / set.items.length) * 100}%`, height: 3, backgroundColor: c.accent }} />
        </View>

        <Text style={{ ...Type.title, color: c.textStrong, marginTop: Spacing.xl, marginBottom: Spacing.lg }}>
          {q.text}
        </Text>

        <Body q={q} value={value} onChange={set1} frequencyOptions={set.frequencyOptions} />

        <Primary
          label={isLast ? 'Finish' : 'Next'}
          disabled={!answered || saving}
          busy={saving && isLast}
          onPress={async () => {
            const next = { ...answers };
            if (isLast) {
              const ok = await persist(next, true);
              if (ok) setDone(true);
              return;
            }
            persist(next, false);
            setIdx(idx + 1);
          }}
        />
        {idx > 0 ? <Secondary label="Back" onPress={() => setIdx(idx - 1)} /> : null}
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
    const opts = (q.options ?? []) as string[];
    const order = Array.isArray(value) ? (value as string[]) : [];
    return (
      <View>
        <Text style={{ ...Type.small, color: c.textMuted, marginBottom: Spacing.md }}>
          Tap in order, best first. Tap a chosen one again to take it back out.
        </Text>
        <View style={{ gap: Spacing.sm }}>
          {opts.map((o) => {
            const rank = order.indexOf(o);
            const chosen = rank >= 0;
            return (
              <Pressable
                key={o}
                onPress={() => onChange(chosen ? order.filter((x) => x !== o) : [...order, o])}
                style={{
                  ...card, flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
                  borderColor: chosen ? c.accent : c.border, borderWidth: chosen ? 2 : 1,
                }}>
                <View
                  style={{
                    width: 24, height: 24, borderRadius: Radius.pill,
                    alignItems: 'center', justifyContent: 'center',
                    backgroundColor: chosen ? c.accent : c.background,
                    borderColor: c.border, borderWidth: chosen ? 0 : 1,
                  }}>
                  <Text style={{ ...Type.small, fontWeight: '700', color: chosen ? Palette.white : c.textMuted }}>
                    {chosen ? rank + 1 : ''}
                  </Text>
                </View>
                <Text style={{ ...Type.body, color: c.text, flex: 1 }}>{o}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }

  // openText
  return (
    <TextInput
      value={typeof value === 'string' ? value : ''}
      onChangeText={onChange}
      placeholder={q.placeholder || 'Optional'}
      placeholderTextColor={c.textMuted}
      multiline
      textAlignVertical="top"
      style={{
        ...Type.body, color: c.text, minHeight: 140,
        backgroundColor: c.surface, borderColor: c.border, borderWidth: 1,
        borderRadius: Radius.lg, padding: Spacing.lg,
      }}
    />
  );
}

function Choice({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
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
    <Pressable onPress={onPress} style={{ marginTop: Spacing.sm, paddingVertical: Spacing.sm, alignItems: 'center' }}>
      <Text style={{ ...Type.small, color: c.textMuted, fontWeight: '600' }}>{label}</Text>
    </Pressable>
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

const pad = {
  padding: Spacing.xl, paddingBottom: BottomTabInset + Spacing.xxl,
  maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center',
} as const;

const card = {
  backgroundColor: c.surface, borderColor: c.border, borderWidth: 1,
  borderRadius: Radius.lg, padding: Spacing.lg,
} as const;
