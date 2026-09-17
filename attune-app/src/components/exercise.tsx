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

import { useScreenTime } from '@/hooks/use-screen-time';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fetchQuestions, saveExercise } from '@/api/client';
import type { ApiError, QuestionItem, QuestionSet } from '@/api/client';
import { ScreenError, ScreenLoading } from '@/components/screen-states';
import {
  ExerciseComplete, ExerciseEyebrow, ExerciseNav, ExerciseOpening, exerciseColor,
} from '@/components/exercise-chrome';
import {
  BottomTabInset, Colors, MaxContentWidth, Palette, Radius, Spacing, Type,
} from '@/constants/attune-theme';
import { WAITING } from '@/constants/waiting';
import { LOADING } from '@/constants/loading-copy';

const c = Colors.light;

/**
 * The heights that keep the controls still.
 *
 * Both are the tallest case in the exercise rather than a guess: the longest
 * question runs to three lines of the title face, and the longest pair of
 * options to six of the small one. A shorter question leaves space above the
 * options rather than pulling them up the screen.
 */
const QUESTION_HEIGHT = 104;
const OPTIONS_HEIGHT = 170;

export default function Exercise({
  exerciseKey, onClose, onFinished,
}: { exerciseKey: string; onClose: () => void; onFinished: () => void }) {
  /**
   * Whether the opening screen is still showing.
   *
   * `started` is what makes it skippable: someone resuming a half-answered
   * exercise has read this page and wants the question they left off on.
   */
  const [opening, setOpening] = useState(true);
  const [set, setSet] = useState<QuestionSet | null>(null);
  // Keyed by whichever exercise this is rendering, not by the file. The key
  // is the registry's view, so the app and the website file their time under
  // the same name.
  useScreenTime(set?.exercise.view ?? null);
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

  if (loading) return <Shell onClose={onClose}><ScreenLoading label={LOADING.exercise} /></Shell>;
  if (error) {
    return (
      <Shell onClose={onClose}>
        <ScreenError error={error} onRetry={() => { setError(null); setLoading(true); setAttempt((n) => n + 1); }} />
      </Shell>
    );
  }
  if (!set || !items.length) return <Shell onClose={onClose}><ScreenLoading /></Shell>;

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
          exerciseKey="ex1"
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
          exerciseKey={set.exercise.key}
          completion={set.complete}
          onDone={onFinished}
        />
      </Shell>
    );
  }

  // The divider between the two halves.
  if (item?.__partBreak) {
    return (
      <Shell onClose={onClose}>
        <View style={{ padding: Spacing.xl, flex: 1, justifyContent: 'center' }}>
          {/* Ellie's words, and her structure: no eyebrow above it and no
              paragraph under it. The site said one thing here and the app said
              another; this is what both say now. */}
          <Text style={{ ...Type.hero, color: c.textStrong }}>
            {item.text}
          </Text>
          <Pressable
      accessibilityRole="button"
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
  // Where they are, not how much they have done: going back to question three
  // should say three, and it said "40 of 50" because forty were answered.
  const questionNumber = questions.findIndex((q) => q.answerKey === item.answerKey) + 1;
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
        {/* Ellie: the counter says "question 6 of 50" on both surfaces now,
            "that way there's no misunderstanding that each section might be 50
            questions". The eyebrow is the exercise's full name in its own
            colour, on every exercise, from one component. */}
        <ExerciseEyebrow
          exerciseKey={set.exercise.key}
          label={set.exercise.fullLabel || set.exercise.label}
          right={`Question ${questionNumber} of ${questions.length}`}
        />

        <View style={{ height: 3, borderRadius: Radius.pill, backgroundColor: c.border, marginTop: Spacing.sm, overflow: 'hidden' }}>
          <View style={{ width: `${(answeredCount / Math.max(1, questions.length)) * 100}%`, height: 3, backgroundColor: exerciseColor(set.exercise.key) }} />
        </View>

        {/* ── EVERYTHING BELOW THIS STAYS PUT ─────────────────────────────
            Ellie: "I'd like to have A and B and the answer choices in a fixed
            position regardless of the size of the questions."

            A question is one line or three, and without a floor under it the
            two options and the scale walk up and down the screen between
            questions. Answering twenty-five of those means re-finding the
            controls every time. The question block is given the height of its
            longest case, and the options are given the height of theirs, so
            the scale lands in the same place on every screen. */}
        <View style={{ minHeight: QUESTION_HEIGHT, justifyContent: 'flex-start', marginTop: Spacing.xl }}>
          {/* ── "YOUR PARTNER", IN ITALICS ──────────────────────────────
              Ellie: "Part 2 in the app needs to italicize 'your partner' in
              each question's text just like the online experience." The
              website splits the question on those two words and emphasises
              them; this does the same thing with the same split, because the
              emphasis is what tells someone this half is not about them. */}
          <Text style={{ ...Type.title, color: c.textStrong }}>
            {item.text.split(/(your partner)/i).map((seg, i) => (
              /^your partner$/i.test(seg)
                ? <Text key={i} style={{ fontStyle: 'italic' }}>{seg}</Text>
                : seg
            ))}
          </Text>
        </View>

        {/* The two ends, side by side and given equal space. Lettered rather
            than ordered, so neither reads as the first or the better one.
            Ellie: "I want A and B options to be listed side by side not
            vertically." */}
        <View style={{ flexDirection: 'row', alignItems: 'stretch', gap: Spacing.md, minHeight: OPTIONS_HEIGHT }}>
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
                  // Ellie: "A and B tiles are white, and the answer choices
                  // are slightly greyed out. Can we flip that?" She is right:
                  // the white cards were the two things you cannot tap. The
                  // weight belongs on the five you can.
                  flex: 1, paddingVertical: Spacing.md, borderRadius: Radius.md,
                  alignItems: 'center', justifyContent: 'center',
                  backgroundColor: on ? c.textStrong : Palette.white,
                  borderColor: on ? c.textStrong : c.accentQuiet, borderWidth: on ? 1 : 1.5,
                }}>
                <Text
                  numberOfLines={2}
                  style={{
                    ...Type.small, fontSize: 11, lineHeight: 14, textAlign: 'center',
                    fontWeight: '700', color: on ? Palette.white : c.text,
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

        <ExerciseNav
          onBack={idx > 0 ? () => setIdx(idx - 1) : undefined}
          onNext={advance}
          nextLabel={isLast ? 'Finish' : 'Next'}
          disabled={chosen == null || (saving && isLast)}
          busy={saving && isLast}
        />

      </ScrollView>
    </Shell>
  );
}

/**
 * One end of the scale, as a card.
 *
 * Side by side now rather than stacked, so the letter goes above its words
 * instead of beside them: two columns of text with a letter in the left margin
 * of each leaves almost nothing for the words.
 */
function Option({ letter, text }: { letter: string; text: string }) {
  return (
    <View
      style={{
        // Flat on the page rather than a white card. These two are what the
        // question means, not what to press.
        flex: 1,
        backgroundColor: 'transparent', borderColor: c.border, borderWidth: 1,
        borderRadius: Radius.lg, padding: Spacing.lg,
      }}>
      <Text style={{ ...Type.cardTitle, color: c.accentQuiet, marginBottom: Spacing.xs }}>{letter}</Text>
      <Text style={{ ...Type.small, color: c.textMuted, lineHeight: 19 }}>{text}</Text>
    </View>
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
