/**
 * "How was your experience?", in the app.
 *
 * ── WHY IT EXISTS ─────────────────────────────────────────────────────────
 * Nothing in the product asks this any more. The questionnaire was a
 * component in src/App.jsx, already disconnected, and it was deleted in
 * d54d7c2 as unreferenced. /api/send-feedback, /api/get-feedback and the
 * admin's Feedback Overview all survived it, so three surfaces report on a
 * question nobody is asked.
 *
 * The card on the home screen, "How is Attune working for you?", opened the
 * browser. Ellie: everything should run in the app.
 *
 * ── THE WORDS ARE HERS ────────────────────────────────────────────────────
 * Every sentence and every question comes from api/_lib/feedback-copy.js,
 * recovered from the deleted component rather than rewritten. The question
 * ids are the ones already stored, so answers given now sit alongside
 * whatever was collected before.
 */
import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { fetchFeedbackForm, sendFeedback, type ApiError, type FeedbackForm } from '@/api/client';
import { ScreenError, ScreenLoading } from '@/components/screen-states';
import { useScreenTime } from '@/hooks/use-screen-time';
import { LOADING } from '@/constants/loading-copy';
import {
  Colors, MaxContentWidth, Palette, Radius, Spacing, Type, inputType,
} from '@/constants/attune-theme';

const c = Colors.light;

export default function Feedback({ onDone }: { onDone: () => void }) {
  useScreenTime('feedback');
  const [form, setForm] = useState<FeedbackForm | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    fetchFeedbackForm().then((r) => {
      if (!live) return;
      if (r.ok) { setForm({ copy: r.data.copy, scale: r.data.scale, questions: r.data.questions }); setError(null); }
      else setError(r.error);
    });
    return () => { live = false; };
  }, [attempt]);

  const submit = useCallback(async () => {
    if (sending || !form) return;
    setSending(true);
    setFailed(null);
    const r = await sendFeedback({
      questionAnswers: answers,
      message: (answers.q_open as string) || null,
      stage: (answers.q_stage as string) || null,
      howHeard: (answers.q_source as string) || null,
    });
    setSending(false);
    if (!r.ok) {
      setFailed(
        r.error.kind === 'offline'
          ? 'No connection. Your answers are still here; try again in a moment.'
          : 'That did not send. Try again in a moment.',
      );
      return;
    }
    setSent(true);
  }, [answers, form, sending]);

  if (error) {
    return <ScreenError error={error} onRetry={() => { setError(null); setAttempt((n) => n + 1); }} />;
  }
  if (!form) return <ScreenLoading label={LOADING.moment} />;

  if (sent) {
    return (
      <View style={{ padding: Spacing.xl, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}>
        <Text style={{ ...Type.title, color: c.textStrong }}>{form.copy.thanks}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={onDone}
          style={{
            marginTop: Spacing.xl, backgroundColor: c.textStrong, borderRadius: Radius.md,
            paddingVertical: Spacing.md, alignItems: 'center',
          }}>
          <Text style={{ ...Type.small, color: Palette.white, fontWeight: '700' }}>Done</Text>
        </Pressable>
      </View>
    );
  }

  const chip = (id: string, value: string, label: string) => {
    const on = answers[id] === value;
    return (
      <Pressable
        key={value}
        accessibilityRole="button"
        accessibilityState={{ selected: on }}
        onPress={() => setAnswers((a) => ({ ...a, [id]: on ? '' : value }))}
        style={{
          paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md,
          borderRadius: Radius.sm, borderWidth: 1,
          borderColor: on ? c.accent : c.border,
          backgroundColor: on ? c.accent : c.surface,
        }}>
        <Text style={{ ...Type.small, color: on ? Palette.white : c.textMuted }}>{label}</Text>
      </Pressable>
    );
  };

  const scaleAnswered = form.questions
    .filter((q) => q.type === 'scale')
    .every((q) => answers[q.id] != null && answers[q.id] !== '');

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl, paddingBottom: Spacing.xxxl,
        maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center',
      }}>
      <Text style={{ ...Type.hero, color: c.textStrong }}>{form.copy.title}</Text>
      <Text style={{ ...Type.small, color: c.textMuted, marginTop: Spacing.xs }}>
        {form.copy.reassurance}
      </Text>

      <Text style={{ ...Type.eyebrow, color: c.accentQuiet, marginTop: Spacing.xl }}>
        {form.copy.scaleHeading}
      </Text>

      {form.questions.map((q) => (
        <View key={q.id} style={{ marginTop: Spacing.lg }}>
          <Text style={{ ...Type.body, color: c.text, marginBottom: Spacing.xs }}>{q.label}</Text>

          {q.type === 'scale' ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs }}>
              {form.scale.map((label, i) => chip(q.id, String(i + 1), label))}
            </View>
          ) : null}

          {q.type === 'choice' ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs }}>
              {(q.options || []).map((opt) => chip(q.id, opt, opt))}
            </View>
          ) : null}

          {q.type === 'text' ? (
            <TextInput
              value={(answers[q.id] as string) || ''}
              onChangeText={(t) => setAnswers((a) => ({ ...a, [q.id]: t }))}
              multiline
              placeholder=""
              style={{
                ...inputType(Type.body), color: c.textStrong, borderColor: c.border, borderWidth: 1,
                borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
                minHeight: 96, textAlignVertical: 'top',
              }}
            />
          ) : null}
        </View>
      ))}

      {failed ? (
        <Text style={{ ...Type.small, color: '#B4463A', marginTop: Spacing.lg }}>{failed}</Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        disabled={!scaleAnswered || sending}
        onPress={submit}
        style={{
          marginTop: Spacing.xl, paddingVertical: Spacing.md, borderRadius: Radius.md,
          alignItems: 'center',
          backgroundColor: scaleAnswered && !sending ? c.accent : c.border,
        }}>
        <Text style={{ ...Type.small, fontWeight: '700', color: scaleAnswered && !sending ? Palette.white : c.textMuted }}>
          {sending ? form.copy.submitting : form.copy.submit}
        </Text>
      </Pressable>

      <Text style={{ ...Type.small, color: c.textMuted, marginTop: Spacing.md, lineHeight: 20 }}>
        {form.copy.privacy}
      </Text>
    </ScrollView>
  );
}
