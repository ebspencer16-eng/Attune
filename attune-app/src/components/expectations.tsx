/**
 * Expectations.
 *
 * Who does what, and what each of you assumed the answer was. The exercise is
 * the assumptions, not the chores: two people can run a household happily for
 * years without ever saying out loud who they thought was responsible for what.
 *
 * Three stages. How you were each raised, then the responsibilities a category
 * at a time, then the longer questions about where life is going.
 *
 * The answer shape matches what the website writes exactly:
 *
 *   { responsibilities: { "<catId>__<raw item>": choice },
 *     bothDetail:       { "<catId>__<raw item>": detail },
 *     childhood: {}, childhoodBothDetail: {},
 *     life: { "<question id>": option },
 *     childhoodStructure: "<structure id>" }
 *
 * The keys use the raw item text, not the text a person reads. Two partners
 * substitute their own names into the same item, and a key that moved with the
 * name would stop lining up between them, which is the whole comparison.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fetchExpectations, saveExercise } from '@/api/client';
import type { ApiError, ExpectationsSet } from '@/api/client';
import { ScreenError, ScreenLoading } from '@/components/screen-states';
import {
  BottomTabInset, Colors, MaxContentWidth, Palette, Radius, Spacing, Type,
} from '@/constants/attune-theme';

const c = Colors.light;

type Answers = {
  responsibilities: Record<string, string>;
  bothDetail: Record<string, string>;
  childhood: Record<string, string>;
  childhoodBothDetail: Record<string, string>;
  life: Record<string, string>;
  childhoodStructure?: string;
};

const EMPTY: Answers = {
  responsibilities: {}, bothDetail: {}, childhood: {},
  childhoodBothDetail: {}, life: {},
};

export default function Expectations({
  onClose, onFinished,
}: { onClose: () => void; onFinished: () => void }) {
  const [set, setSet] = useState<ExpectationsSet | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(true);
  // Bumped by the retry button. Without it the button set loading and nothing
  // refetched, because the effect's dependencies had not changed, so Try again
  // led to a spinner that never resolved.
  const [attempt, setAttempt] = useState(0);

  const [answers, setAnswers] = useState<Answers>(EMPTY);
  const [stage, setStage] = useState<'structure' | 'responsibilities' | 'life' | 'done'>('structure');
  const [catIdx, setCatIdx] = useState(0);
  const [lifeIdx, setLifeIdx] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetchExpectations();
      if (cancelled) return;
      if (res.ok) {
        setSet(res.data);
        setError(null);
        const saved = res.data.saved?.answers as Partial<Answers> | undefined;
        if (saved) {
          const restored = { ...EMPTY, ...saved };
          setAnswers(restored);
          if (saved.childhoodStructure) {
            setStage('responsibilities');
            // Land on the first unfinished category rather than the first one.
            // Otherwise someone who stopped in Extended Family reopens on
            // Household and has to press Next past four finished pages.
            const firstOpen = res.data.categories.findIndex((cat) =>
              cat.items.some((it) => {
                const k = `${cat.id}__${it.key}`;
                const choice = restored.responsibilities[k];
                if (!choice) return true;
                return choice === 'Both of us' && !restored.bothDetail[k];
              }));
            if (firstOpen === -1) {
              // Every category done, so the remaining work is the life
              // questions. Same idea there: first unanswered.
              setStage('life');
              const firstLife = res.data.lifeQuestions.findIndex((q) => !restored.life[q.id]);
              setLifeIdx(firstLife === -1 ? res.data.lifeQuestions.length - 1 : firstLife);
            } else {
              setCatIdx(firstOpen);
            }
          }
        }
      } else setError(res.error);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [attempt]);

  const persist = useCallback(async (next: Answers, completed: boolean) => {
    setSaving(true);
    const res = await saveExercise({ exercise: 'ex2', answers: next, completed, shape: set?.exercise.shape });
    setSaving(false);
    return res.ok;
  }, [set]);

  const cats = set?.categories ?? [];
  const cat = cats[catIdx];
  const life = set?.lifeQuestions ?? [];
  const lifeQ = life[lifeIdx];

  const catDone = useMemo(() => {
    if (!cat) return false;
    return cat.items.every((it) => {
      const key = `${cat.id}__${it.key}`;
      const choice = answers.responsibilities[key];
      if (!choice) return false;
      // "Both of us" is not an answer on its own. Both rarely means exactly
      // half, and which way it leans is the part worth knowing.
      if (choice === 'Both of us' && !answers.bothDetail[key]) return false;
      return true;
    });
  }, [cat, answers]);

  if (loading) return <Shell onClose={onClose}><ScreenLoading label="Getting your questions" /></Shell>;
  if (error) return <Shell onClose={onClose}><ScreenError error={error} onRetry={() => { setError(null); setLoading(true); setAttempt((n) => n + 1); }} /></Shell>;
  if (!set) return <Shell onClose={onClose}><ScreenLoading /></Shell>;

  if (stage === 'done') {
    return (
      <Shell onClose={onClose}>
        <View style={{ padding: Spacing.xl }}>
          <Text style={{ ...Type.hero, color: c.textStrong }}>That is everything</Text>
          <Text style={{ ...Type.body, color: c.textMuted, marginTop: Spacing.sm }}>
            Your answers are saved. Results open once you have both finished.
          </Text>
          <Primary label="Done" onPress={onFinished} />
        </View>
      </Shell>
    );
  }

  // ── Stage 1: how you were raised ─────────────────────────────────────────
  if (stage === 'structure') {
    return (
      <Shell onClose={onClose}>
        <ScrollView contentContainerStyle={pad}>
          <Text style={{ ...Type.eyebrow, color: c.accentQuiet }}>Expectations</Text>
          <Text style={{ ...Type.title, color: c.textStrong, marginTop: Spacing.xs }}>
            Who ran the household you grew up in?
          </Text>
          <Text style={{ ...Type.body, color: c.textMuted, marginTop: Spacing.sm, marginBottom: Spacing.lg }}>
            This sets the labels for the next questions. Most of what people
            expect at home traces back to what they saw growing up.
          </Text>
          {set.childhoodStructures.map((st) => {
            const on = answers.childhoodStructure === st.id;
            return (
              <Choice
                key={st.id}
                label={st.label}
                selected={on}
                onPress={() => setAnswers((a) => ({ ...a, childhoodStructure: st.id }))}
              />
            );
          })}
          <Primary
            label="Continue"
            disabled={!answers.childhoodStructure}
            onPress={() => setStage('responsibilities')}
          />
        </ScrollView>
      </Shell>
    );
  }

  // ── Stage 2: responsibilities, a category at a time ──────────────────────
  if (stage === 'responsibilities' && cat) {
    return (
      <Shell onClose={onClose}>
        <ScrollView contentContainerStyle={pad}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ ...Type.eyebrow, color: c.accentQuiet }}>{cat.label}</Text>
            <Text style={{ ...Type.small, color: c.textMuted }}>
              {catIdx + 1} of {cats.length}
            </Text>
          </View>
          <Text style={{ ...Type.title, color: c.textStrong, marginTop: Spacing.xs, marginBottom: Spacing.lg }}>
            In your home, who does this?
          </Text>

          {cat.items.map((it) => {
            const key = `${cat.id}__${it.key}`;
            const choice = answers.responsibilities[key];
            return (
              <View key={key} style={{ ...card, marginBottom: Spacing.md }}>
                <Text style={{ ...Type.cardTitle, color: c.textStrong, marginBottom: Spacing.md }}>
                  {it.label}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
                  {set.futureCols.map((col, i) => (
                    <Pill
                      key={col}
                      label={set.futureColsDisplay[i] || col}
                      selected={choice === col}
                      onPress={() => setAnswers((a) => ({
                        ...a,
                        responsibilities: { ...a.responsibilities, [key]: col },
                        // Dropping the detail when the answer moves away from
                        // Both, so a stale refinement cannot survive.
                        bothDetail: col === 'Both of us'
                          ? a.bothDetail
                          : Object.fromEntries(Object.entries(a.bothDetail).filter(([k]) => k !== key)),
                      }))}
                    />
                  ))}
                </View>

                {choice === 'Both of us' ? (
                  <View style={{ marginTop: Spacing.md, borderTopWidth: 1, borderTopColor: c.border, paddingTop: Spacing.md }}>
                    <Text style={{ ...Type.small, color: c.textMuted, marginBottom: Spacing.sm }}>
                      Both, meaning:
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
                      {set.futureDetailOpts.map((opt) => (
                        <Pill
                          key={opt}
                          label={opt}
                          small
                          selected={answers.bothDetail[key] === opt}
                          onPress={() => setAnswers((a) => ({
                            ...a, bothDetail: { ...a.bothDetail, [key]: opt },
                          }))}
                        />
                      ))}
                    </View>
                  </View>
                ) : null}
              </View>
            );
          })}

          <Primary
            label={catIdx + 1 < cats.length ? 'Next' : 'Continue'}
            disabled={!catDone}
            onPress={() => {
              persist(answers, false);
              if (catIdx + 1 < cats.length) setCatIdx(catIdx + 1);
              else setStage('life');
            }}
          />
          {catIdx > 0 ? <Secondary label="Back" onPress={() => setCatIdx(catIdx - 1)} /> : null}
        </ScrollView>
      </Shell>
    );
  }

  // ── Stage 3: the longer questions ────────────────────────────────────────
  if (stage === 'life' && lifeQ) {
    const chosen = answers.life[lifeQ.id];
    const isLast = lifeIdx === life.length - 1;
    return (
      <Shell onClose={onClose}>
        <ScrollView contentContainerStyle={pad}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ ...Type.eyebrow, color: c.accentQuiet }}>{lifeQ.topic}</Text>
            <Text style={{ ...Type.small, color: c.textMuted }}>
              {lifeIdx + 1} of {life.length}
            </Text>
          </View>
          <Text style={{ ...Type.title, color: c.textStrong, marginTop: Spacing.xs, marginBottom: Spacing.lg }}>
            {lifeQ.text}
          </Text>
          {lifeQ.options.map((opt) => (
            <Choice
              key={opt}
              label={opt}
              selected={chosen === opt}
              onPress={() => setAnswers((a) => ({ ...a, life: { ...a.life, [lifeQ.id]: opt } }))}
            />
          ))}

          <Primary
            label={isLast ? 'Finish' : 'Next'}
            disabled={!chosen || saving}
            busy={saving && isLast}
            onPress={async () => {
              if (isLast) {
                const ok = await persist(answers, true);
                if (ok) setStage('done');
                return;
              }
              persist(answers, false);
              setLifeIdx(lifeIdx + 1);
            }}
          />
          {lifeIdx > 0 ? <Secondary label="Back" onPress={() => setLifeIdx(lifeIdx - 1)} /> : null}
        </ScrollView>
      </Shell>
    );
  }

  return <Shell onClose={onClose}><ScreenLoading /></Shell>;
}

const pad = {
  padding: Spacing.xl, paddingBottom: BottomTabInset + Spacing.xxl,
  maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center',
} as const;

const card = {
  backgroundColor: c.surface, borderColor: c.border, borderWidth: 1,
  borderRadius: Radius.lg, padding: Spacing.lg,
} as const;

function Pill({
  label, selected, onPress, small,
}: { label: string; selected: boolean; onPress: () => void; small?: boolean }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingVertical: small ? Spacing.xs : Spacing.sm,
        paddingHorizontal: small ? Spacing.md : Spacing.lg,
        borderRadius: Radius.pill,
        backgroundColor: selected ? c.textStrong : c.background,
        borderColor: selected ? c.textStrong : c.border, borderWidth: 1,
      }}>
      <Text style={{ ...Type.small, fontSize: small ? 11 : 13, fontWeight: '600', color: selected ? Palette.white : c.textMuted }}>
        {label}
      </Text>
    </Pressable>
  );
}

function Choice({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        ...card, marginBottom: Spacing.sm,
        borderColor: selected ? c.accent : c.border,
        borderWidth: selected ? 2 : 1,
      }}>
      <Text style={{ ...Type.body, color: selected ? c.textStrong : c.text, fontWeight: selected ? '700' : '400' }}>
        {label}
      </Text>
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
