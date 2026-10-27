/**
 * The survey, in the app.
 *
 * ── ONE SURVEY, THREE PLACES TO ANSWER IT ─────────────────────────────────
 * The website shows it at the end of What Comes Next, /feedback shows it to
 * somebody arriving from an email, and this is the app's. All three ask
 * /api/survey rather than carrying a copy of the questions, because carrying a
 * copy is how three different surveys came to exist: a 26-question beta survey
 * on /feedback, a six-question modal over the results, and a seven-question
 * card at the end of What Comes Next.
 *
 * Ellie: "Please use this as the regular survey for everyone at the end of
 * their experience, not just beta users."
 *
 * It is NOT the "How was your experience?" questionnaire, which is a different
 * and shorter thing with its own card and its own admin tile; that one is
 * components/feedback.tsx and asks api/_lib/feedback-copy.js. Overwriting it
 * with this is a mistake I made once: two instruments, two purposes.
 *
 * ── EVERY ANSWER IS SAVED AS IT IS GIVEN ──────────────────────────────────
 * Ellie: "Collect incomplete responses." So each answer posts as it is made,
 * and closing the screen half way through leaves what was written. Only
 * reaching the end marks it finished.
 *
 * Nothing in this file is a question or a sentence a customer reads: it is the
 * drawing of whatever the endpoint says to ask.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { Pressable } from '@/components/pressable';
import { fetchSurvey, saveSurvey, type ApiError, type SurveyForm, type SurveyQuestion } from '@/api/client';
import { RankInOrder } from '@/components/exercise-chrome';
import { ScreenError, ScreenLoading } from '@/components/screen-states';
import { useScreenTime } from '@/hooks/use-screen-time';
import { LOADING } from '@/constants/loading-copy';
import {
  BottomTabInset, Colors, MaxContentWidth, Palette, Radius, Spacing, Type, inputType,
} from '@/constants/attune-theme';

const c = Colors.light;

type Answer = string | number | string[];

/**
 * Should this question be asked?
 *
 * The condition is data on the question itself, from api/_lib/survey.js, so
 * this is a matcher rather than a list of question ids. An Expo project cannot
 * import from api/, which is why these six lines exist at all; what keeps them
 * honest is check-survey, which lifts this function and runs it against the
 * server's `shouldShow` over a sweep of answers.
 *
 * A new conditional question needs no change here.
 */
export function shouldShow(q: SurveyQuestion, answers: Record<string, Answer>) {
  const w = q && q.showWhen;
  if (!w || !w.field) return true;
  const v = answers[w.field];
  if (typeof w.startsWith === 'string') {
    return typeof v === 'string' && v.startsWith(w.startsWith);
  }
  if (w.atLeast !== undefined || w.atMost !== undefined) {
    const n = Number(v);
    if (!Number.isFinite(n) || v === '' || v === null || v === undefined) return false;
    if (w.atLeast !== undefined && n < w.atLeast) return false;
    if (w.atMost !== undefined && n > w.atMost) return false;
    return true;
  }
  return true;
}

export default function Survey({ onDone }: { onDone: () => void }) {
  useScreenTime('survey');
  const [form, setForm] = useState<SurveyForm | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [failed, setFailed] = useState<string | null>(null);
  /* The last thing saved, so the save-as-you-go line is honest rather than
     decorative: it appears once something has actually reached the server. */
  const [savedAt, setSavedAt] = useState(0);
  const latest = useRef<Record<string, Answer>>({});

  useEffect(() => {
    let live = true;
    fetchSurvey().then((r) => {
      if (!live) return;
      if (r.ok) {
        setForm(r.data);
        setAnswers(r.data.answers || {});
        latest.current = r.data.answers || {};
        setError(null);
      } else setError(r.error);
    });
    return () => { live = false; };
  }, [attempt]);

  const setAns = useCallback((id: string, v: Answer) => {
    const next = { ...latest.current, [id]: v };
    latest.current = next;
    setAnswers(next);
    /* Fire and forget. The next answer resaves everything, so a dropped
       request costs nothing and a failed one is not worth a banner. */
    saveSurvey({ answers: next }).then((r) => { if (r.ok) setSavedAt(Date.now()); });
  }, []);

  const submit = useCallback(async () => {
    if (sending) return;
    setSending(true);
    setFailed(null);
    const r = await saveSurvey({ answers: latest.current, done: true });
    setSending(false);
    if (!r.ok) {
      setFailed(r.error.kind === 'offline'
        ? 'No connection. Your answers are still here; try again in a moment.'
        : 'That did not send. Try again in a moment.');
      return;
    }
    setSent(true);
  }, [sending]);

  if (error) {
    return <ScreenError error={error} onRetry={() => { setError(null); setAttempt((n) => n + 1); }} />;
  }
  if (!form) return <ScreenLoading label={LOADING.moment} />;

  if (sent) {
    return (
      <View style={{ padding: Spacing.xl, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}>
        <Text style={{ ...Type.title, color: c.textStrong }}>{form.copy.thanksTitle}</Text>
        <Text style={{ ...Type.body, color: c.textMuted, marginTop: Spacing.sm }}>{form.copy.thanks}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={onDone}
          style={{
            marginTop: Spacing.xl, backgroundColor: c.textStrong, borderRadius: Radius.md,
            paddingVertical: Spacing.md, alignItems: 'center',
          }}>
          <Text style={{ ...Type.small, color: Palette.white, fontWeight: '700' }}>{form.copy.thanksAction ?? 'Back to dashboard'}</Text>
        </Pressable>
      </View>
    );
  }

  const chip = (id: string, value: string | number, label: string) => {
    const on = answers[id] === value;
    return (
      <Pressable
        key={String(value)}
        accessibilityRole="button"
        accessibilityState={{ selected: on }}
        onPress={() => setAns(id, on ? '' : value)}
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

  const shown = form.questions.filter((q) => shouldShow(q, answers));

  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{
        paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl,
        paddingBottom: BottomTabInset + Spacing.xxxl,
        maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center',
      }}>
      <Text style={{ ...Type.hero, color: c.textStrong }}>{form.copy.title}</Text>

      {shown.map((q) => (
        <View key={q.id} style={{ marginTop: Spacing.xl }}>
          <Text style={{ ...Type.body, color: c.text, marginBottom: Spacing.sm }}>{q.label}</Text>

          {q.kind === 'stars' ? (
            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
              {Array.from({ length: q.max || 5 }, (_, i) => i + 1).map((n) => (
                <Pressable
                  key={n}
                  accessibilityRole="button"
                  accessibilityLabel={`${n} of ${q.max || 5}`}
                  onPress={() => setAns(q.id, n)}
                  hitSlop={6}>
                  <SymbolView
                    name={Number(answers[q.id]) >= n ? ('star.fill' as const) : ('star' as const)}
                    size={30}
                    tintColor={Number(answers[q.id]) >= n ? c.accent : c.border}
                    fallback={<Text style={{ fontSize: 26, color: Number(answers[q.id]) >= n ? c.accent : c.border }}>
                      {Number(answers[q.id]) >= n ? '★' : '☆'}
                    </Text>}
                  />
                </Pressable>
              ))}
            </View>
          ) : null}

          {q.kind === 'choice' ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs }}>
              {(q.options || []).map((opt) => chip(q.id, opt, opt))}
            </View>
          ) : null}

          {q.kind === 'scale' ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs }}>
              {(q.scale || []).map((label, i) => chip(q.id, i + 1, label))}
            </View>
          ) : null}

          {q.kind === 'nps' ? (
            <View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs }}>
                {Array.from(
                  { length: (q.max ?? 10) - (q.min ?? 0) + 1 },
                  (_, i) => (q.min ?? 0) + i,
                ).map((n) => chip(q.id, n, String(n)))}
              </View>
              {/* Nought and ten say nothing on their own. Ellie asked for both
                  ends to be named, and the words are on the question. */}
              {q.ends && q.ends.length === 2 ? (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.xs }}>
                  <Text style={{ ...Type.small, color: c.textMuted }}>{q.ends[0]}</Text>
                  <Text style={{ ...Type.small, color: c.textMuted }}>{q.ends[1]}</Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {q.kind === 'rank' ? (
            <RankInOrder
              options={q.options || []}
              order={Array.isArray(answers[q.id]) ? (answers[q.id] as string[]) : null}
              onChange={(v) => setAns(q.id, v)}
              hint={q.hint}
            />
          ) : null}

          {q.kind === 'text' ? (
            <View>
              <TextInput
                value={(answers[q.id] as string) || ''}
                onChangeText={(t) => setAns(q.id, t)}
                multiline
                placeholder={q.placeholder || ''}
                placeholderTextColor={c.textMuted}
                style={{
                  ...inputType(Type.body), color: c.textStrong, borderColor: c.border, borderWidth: 1,
                  borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
                  minHeight: 96, textAlignVertical: 'top',
                }}
              />
              {/* The one piece of fine print, and the reason there is no
                  consent question: nothing we publish carries a name. */}
              <Text style={{ ...Type.small, color: c.textMuted, marginTop: Spacing.xs, lineHeight: 18 }}>
                {form.notice}
              </Text>
            </View>
          ) : null}
        </View>
      ))}

      {failed ? (
        <Text style={{ ...Type.small, color: '#B4463A', marginTop: Spacing.lg }}>{failed}</Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        disabled={sending}
        onPress={submit}
        style={{
          marginTop: Spacing.xl, paddingVertical: Spacing.md, borderRadius: Radius.md,
          alignItems: 'center', backgroundColor: sending ? c.border : c.accent,
        }}>
        <Text style={{ ...Type.small, fontWeight: '700', color: sending ? c.textMuted : Palette.white }}>
          {sending ? form.copy.submitting : form.copy.submit}
        </Text>
      </Pressable>

      {savedAt ? (
        <Text style={{ ...Type.small, color: c.textMuted, marginTop: Spacing.md, textAlign: 'center' }}>
          {form.copy.saved}
        </Text>
      ) : null}
    </ScrollView>
  );
}
