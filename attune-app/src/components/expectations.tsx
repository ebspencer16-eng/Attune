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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useScreenTime } from '@/hooks/use-screen-time';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fetchExpectations, saveExercise } from '@/api/client';
import type { ApiError, ExpectationsSet } from '@/api/client';
import { ScreenError, ScreenLoading } from '@/components/screen-states';
import {
  ExerciseComplete, ExerciseEyebrow, ExerciseNav, ExerciseOpening, exerciseColor,
} from '@/components/exercise-chrome';
import {
  BottomTabInset, Colors, MaxContentWidth, Palette, Radius, Spacing, Type,
} from '@/constants/attune-theme';
import { WAITING } from '@/constants/waiting';
import PageWash from '@/components/page-wash';
import { LOADING } from '@/constants/loading-copy';

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
  useScreenTime('exercise2');
  /**
   * Whether the opening screen is still showing.
   *
   * `started` is what makes it skippable: someone resuming a half-answered
   * exercise has read this page and wants the question they left off on.
   */
  const [opening, setOpening] = useState(true);
  const [set, setSet] = useState<ExpectationsSet | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(true);
  // Bumped by the retry button. Without it the button set loading and nothing
  // refetched, because the effect's dependencies had not changed, so Try again
  // led to a spinner that never resolved.
  const [attempt, setAttempt] = useState(0);

  const [answers, setAnswers] = useState<Answers>(EMPTY);
  /**
   * ── THE ORDER IS THE WEBSITE'S ──────────────────────────────────────────
   * Ellie: "Hate the setup of this exercise. It needs to be the same as the
   * mobile web experience."
   *
   * The website asks the life and values questions first, then who ran the
   * household you grew up in, then the responsibilities that question sets the
   * labels for. The app asked them backwards: the household question, then
   * responsibilities, then life. Someone doing it on both surfaces was doing
   * two different exercises in two different orders.
   */
  const [stage, setStage] = useState<'life' | 'part-two' | 'structure' | 'responsibilities' | 'done'>('life');
  const [catIdx, setCatIdx] = useState(0);
  const [lifeIdx, setLifeIdx] = useState(0);
  const [saving, setSaving] = useState(false);
  // As the other exercises do. A dropped save was silent here, so someone who
  // lost their connection mid-exercise had no way to know their last answers
  // were only in memory.
  const [saveFailed, setSaveFailed] = useState(false);

  /**
   * ── EVERY PAGE STARTS AT THE TOP ────────────────────────────────────────
   * Ellie: "When I click next on a responsibilities page I should be brought
   * to the top of the next page. Currently brought to the next page then have
   * to scroll to the top."
   *
   * A category is four or five cards long, so Next from the bottom of one page
   * lands at the bottom of the next, under its heading. The website scrolls to
   * the top on every category change and this is the same thing: one ref,
   * because the stages share a scroll view.
   */
  const scroller = useRef<ScrollView>(null);
  const toTop = useCallback(() => {
    scroller.current?.scrollTo({ y: 0, animated: false });
  }, []);

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
    setSaveFailed(!res.ok);
    return res.ok;
  }, [set]);

  const cats = set?.categories ?? [];
  const cat = cats[catIdx];

  // The "growing up" columns are named after the household someone described.
  // Two Dads gives Dad / Papa, grandparents gives Grandma / Grandpa. That is
  // the entire reason the first question is asked, and until now the answer was
  // collected and never used again.
  const structure = set?.childhoodStructures.find((st) => st.id === answers.childhoodStructure);
  const childCols = structure?.cols ?? ['Adult 1', 'Adult 2', 'Both', 'N/A'];
  const childDetailOpts = [
    'Genuinely 50/50',
    `Usually ${childCols[0]}, sometimes ${childCols[1]}`,
    `Usually ${childCols[1]}, sometimes ${childCols[0]}`,
  ];
  const life = set?.lifeQuestions ?? [];
  const lifeQ = life[lifeIdx];

  /**
   * The item is answered, in the sense the page cares about.
   *
   * "Both of us" is not an answer on its own. Both rarely means exactly half,
   * and which way it leans is the part worth knowing, so the item is not done
   * until the follow-up is answered too. The website counts it the same way.
   */
  const itemDone = useCallback((catId: string, itemKey: string) => {
    const key = `${catId}__${itemKey}`;
    const choice = answers.responsibilities[key];
    if (!choice) return false;
    if (choice === 'Both of us' && !answers.bothDetail[key]) return false;
    return true;
  }, [answers]);

  // Across every category, which is what the bar at the top of the page reads,
  // as the website's does.
  const totals = useMemo(() => {
    let total = 0;
    let answered = 0;
    for (const ct of cats) {
      for (const it of ct.items) {
        total += 1;
        if (itemDone(ct.id, it.key)) answered += 1;
      }
    }
    return { total, answered };
  }, [cats, itemDone]);

  const catDone = useMemo(
    () => !!cat && cat.items.every((it) => itemDone(cat.id, it.key)),
    [cat, itemDone]);

  if (loading) return <Shell onClose={onClose}><ScreenLoading label={LOADING.exercise} /></Shell>;
  if (error) return <Shell onClose={onClose}><ScreenError error={error} onRetry={() => { setError(null); setLoading(true); setAttempt((n) => n + 1); }} /></Shell>;
  if (!set) return <Shell onClose={onClose}><ScreenLoading /></Shell>;

  /**
   * ── THE SCREEN THAT OPENS IT ────────────────────────────────────────────
   * Ellie: "Need the flow to match exactly for web and app." The website opens
   * every exercise with its name and what it is for; the app opened none of
   * them. Skipped for someone coming back to a half-finished exercise, who has
   * read it already and wants their place.
   */
  /**
   * ── WHY THIS IS NOT Object.keys(answers) ────────────────────────────────
   * Ellie: "Didn't see an intro page." This exercise's answers start as a
   * shape rather than as nothing: five empty maps, one per part. Counting the
   * keys of that says five, so the screen believed the exercise was already
   * underway and skipped its own opening page, every time, for everyone.
   */
  const started = !!answers.childhoodStructure
    || Object.keys(answers.life || {}).length > 0
    || Object.keys(answers.responsibilities || {}).length > 0
    || Object.keys(answers.childhood || {}).length > 0;

  if (opening && set.intro && !started) {
    return (
      <Shell onClose={onClose}>
        <ExerciseOpening
          exerciseKey="ex2"
          label={set.exercise.fullLabel || set.exercise.label}
          intro={set.intro}
          onBegin={() => setOpening(false)}
        />
      </Shell>
    );
  }

  // The same closing screen as every other exercise, from the server.
  if (stage === 'done' && set.complete) {
    return (
      <Shell onClose={onClose}>
        <ExerciseComplete exerciseKey="ex2" completion={set.complete} onDone={onFinished} />
      </Shell>
    );
  }

  // ── Stage 1: how you were raised ─────────────────────────────────────────
  if (stage === 'structure') {
    return (
      <Shell onClose={onClose}>
        <ScrollView ref={scroller} contentContainerStyle={pad}>
          {/* Ellie: "No eyebrow on the household background question page
              please." The page has one question on it and the question is the
              heading; a label above it repeating the exercise's name is a
              second heading for the same screen. */}
          {/* ── THE SITE'S WORDS, NOT THE APP'S ──────────────────────────
              Ellie: "I don't remember the 'who ran the household you grew up
              in' text. What do we have on the site?" She was right not to: the
              website asks "Who were the primary adults in your home growing
              up?" and this screen had been given its own wording. The site's
              is the one that has been read by customers, so it is the one both
              surfaces use. */}
          <Text style={{ ...Type.title, color: c.textStrong }}>
            Who were the primary adults in your home growing up?
          </Text>
          <Text style={{ ...Type.body, color: c.textMuted, marginTop: Spacing.sm, marginBottom: Spacing.lg }}>
            This shapes how you answer the next section, and helps us give you
            more personalized context in your results.
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
          <ExerciseNav
            onBack={() => setStage('part-two')}
            nextLabel="Continue"
            disabled={!answers.childhoodStructure}
            color={exerciseColor('ex2')}
            onNext={() => setStage('responsibilities')}
          />
        </ScrollView>
      </Shell>
    );
  }

  /**
   * ── THE DIVIDER ─────────────────────────────────────────────────────────
   * Ellie: "Expectations part 2 should have an intro page like comms part 2."
   * Her words, from api/_lib/part-two.js, which is also where the comms one
   * lives now. No eyebrow above it and no paragraph under it, which is the
   * shape she chose for comms.
   */
  if (stage === 'part-two') {
    return (
      <Shell onClose={onClose}>
        <View style={{ padding: Spacing.xl, flex: 1, justifyContent: 'center' }}>
          <Text style={{ ...Type.hero, color: c.textStrong }}>{set.partTwo}</Text>
          <ExerciseNav
            onBack={() => { setStage('life'); setLifeIdx(life.length - 1); }}
            nextLabel="Continue"
            color={exerciseColor('ex2')}
            onNext={() => setStage('structure')}
          />
        </View>
      </Shell>
    );
  }

  // ── Stage 2: responsibilities, a category at a time ──────────────────────
  /**
   * ── THE PAGE THE WEBSITE ASKS ───────────────────────────────────────────
   * Ellie: "Hate the setup of this exercise. It needs to be the same as the
   * mobile web experience."
   *
   * One category to a page, under the category's own name, with the line
   * saying what to do that the website shows. Each responsibility is a card
   * with two rows of four buttons: who handled it growing up, and who handles
   * it now. The columns are fixed widths rather than flexed, so the two rows
   * line up under each other, which is the whole point of asking them that way.
   *
   * Extended Family asks only the second row. Those are each partner's own
   * family, so there is no shared childhood to compare. The server says which
   * categories ask it; see api/_lib/expectations-page.js.
   */
  if (stage === 'responsibilities' && cat) {
    const tint = exerciseColor('ex2');
    const asksChildhood = cat.asksChildhood !== false;
    return (
      <Shell onClose={onClose}>
        <ScrollView ref={scroller} contentContainerStyle={pad}>
          <ExerciseEyebrow
            exerciseKey="ex2"
            label={set.exercise.fullLabel || set.exercise.label}
            right={`${totals.answered} of ${totals.total}`}
          />
          <View style={{ height: 3, borderRadius: Radius.pill, backgroundColor: c.border, marginTop: Spacing.sm, overflow: 'hidden' }}>
            <View style={{ width: `${totals.total ? (totals.answered / totals.total) * 100 : 0}%`, height: 3, backgroundColor: tint }} />
          </View>

          <Text style={{ ...Type.title, color: c.textStrong, marginTop: Spacing.lg }}>
            {cat.label}
          </Text>
          <Text style={{ ...Type.small, color: c.textMuted, marginTop: Spacing.xs, lineHeight: 20 }}>
            {cat.intro}
          </Text>
          <Text style={{ ...Type.small, color: c.textMuted, marginTop: Spacing.xs, marginBottom: Spacing.lg }}>
            {`Category ${catIdx + 1} of ${cats.length}`}
          </Text>

          {cat.items.map((it) => {
            const key = `${cat.id}__${it.key}`;
            const choice = answers.responsibilities[key];
            const needsDetail = choice === 'Both of us' && !answers.bothDetail[key];
            const done = itemDone(cat.id, it.key);
            return (
              <View
                key={key}
                style={{
                  ...card, marginBottom: Spacing.md,
                  borderColor: done ? tint : c.border,
                }}>
                <Text style={{ ...Type.cardTitle, color: c.textStrong, marginBottom: Spacing.md }}>
                  {it.label}
                </Text>

                {asksChildhood ? (
                  <>
                    <RowLabel text={set.growingUpLabel} color={Palette.clay} />
                    <OptionRow
                      options={childCols}
                      value={answers.childhood[key]}
                      color={Palette.clay}
                      onPick={(col) => setAnswers((a) => ({
                        ...a,
                        childhood: { ...a.childhood, [key]: col },
                        childhoodBothDetail: col === 'Both'
                          ? a.childhoodBothDetail
                          : Object.fromEntries(Object.entries(a.childhoodBothDetail).filter(([k]) => k !== key)),
                      }))}
                    />
                    {answers.childhood[key] === 'Both' ? (
                      <DetailRow
                        label={set.bothDetailLabel}
                        options={childDetailOpts}
                        value={answers.childhoodBothDetail[key]}
                        onPick={(opt) => setAnswers((a) => ({
                          ...a, childhoodBothDetail: { ...a.childhoodBothDetail, [key]: opt },
                        }))}
                      />
                    ) : null}
                  </>
                ) : null}

                <View style={{ marginTop: asksChildhood ? Spacing.lg : 0 }}>
                  <RowLabel text={set.futureLabel} color={tint} />
                  <OptionRow
                    options={set.futureCols}
                    labels={set.futureColsDisplay}
                    value={choice}
                    color={tint}
                    onPick={(col) => setAnswers((a) => ({
                      ...a,
                      responsibilities: { ...a.responsibilities, [key]: col },
                      // Dropping the detail when the answer moves away from
                      // Both, so a stale refinement cannot survive.
                      bothDetail: col === 'Both of us'
                        ? a.bothDetail
                        : Object.fromEntries(Object.entries(a.bothDetail).filter(([k]) => k !== key)),
                    }))}
                  />
                  {choice === 'Both of us' ? (
                    <DetailRow
                      label={needsDetail ? set.bothDetailRequiredLabel : set.bothDetailLabel}
                      options={set.futureDetailOpts}
                      value={answers.bothDetail[key]}
                      onPick={(opt) => setAnswers((a) => ({
                        ...a, bothDetail: { ...a.bothDetail, [key]: opt },
                      }))}
                    />
                  ) : null}
                </View>
              </View>
            );
          })}

          <ExerciseNav
            onBack={catIdx > 0
              ? () => { setCatIdx(catIdx - 1); toTop(); }
              : () => { setStage('structure'); toTop(); }}
            nextLabel={catIdx + 1 < cats.length ? 'Next' : 'Finish'}
            disabled={!catDone || (saving && catIdx + 1 === cats.length)}
            busy={saving && catIdx + 1 === cats.length}
            color={tint}
            onNext={async () => {
              if (catIdx + 1 < cats.length) {
                persist(answers, false);
                setCatIdx(catIdx + 1);
                toTop();
                return;
              }
              // Responsibilities is the last part now, so this is the end.
              const ok = await persist(answers, true);
              if (ok) setStage('done');
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

  // ── Stage 3: the longer questions ────────────────────────────────────────
  if (stage === 'life' && lifeQ) {
    const chosen = answers.life[lifeQ.id];
    const isLast = lifeIdx === life.length - 1;
    return (
      <Shell onClose={onClose}>
        <ScrollView ref={scroller} contentContainerStyle={pad}>
          {/* The eyebrow is the exercise's full name in its own colour, on
              every page of every exercise. The question's own category sits
              under it, where it does not compete with the exercise's name. */}
          <ExerciseEyebrow
            exerciseKey="ex2"
            label={set.exercise.fullLabel || set.exercise.label}
            /* Ellie: "counter for pt 1 should say life and values 5/12 or
               something to show that this is part 1." The label is the one the
               results use for these questions, from the server. */
            right={`${set.lifeLabel} ${lifeIdx + 1}/${life.length}`}
          />
          <View style={{ height: 3, borderRadius: Radius.pill, backgroundColor: c.border, marginTop: Spacing.sm, overflow: 'hidden' }}>
            <View style={{ width: `${((lifeIdx + 1) / Math.max(1, life.length)) * 100}%`, height: 3, backgroundColor: exerciseColor('ex2') }} />
          </View>
          <Text style={{ ...Type.small, color: c.textMuted, marginTop: Spacing.lg }}>{lifeQ.topic}</Text>
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

          <ExerciseNav
            onBack={lifeIdx > 0 ? () => { setLifeIdx(lifeIdx - 1); toTop(); } : undefined}
            nextLabel={isLast ? 'Continue' : 'Next'}
            disabled={!chosen}
            color={exerciseColor('ex2')}
            onNext={() => {
              persist(answers, false);
              // Part one done: the divider, then who ran the household, which
              // is what sets the labels for part two.
              if (isLast) setStage('part-two');
              else setLifeIdx(lifeIdx + 1);
              toTop();
            }}
          />
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
      accessibilityRole="button"
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

/**
 * The four-column row of answers.
 *
 * ── WHY THE WIDTHS ARE FIXED ────────────────────────────────────────────
 * Two of these sit one above the other, growing up and now, and the reason to
 * ask them that way is that a person can read straight down a column. Flex
 * distributes free space, so a row holding "Preston" and one holding "Dad"
 * would put their columns in different places and the comparison would be gone.
 * Four fixed widths with the gaps between them is what keeps them aligned.
 */
function OptionRow({
  options, labels, value, color, onPick,
}: {
  options: string[];
  labels?: string[];
  value?: string;
  color: string;
  onPick: (option: string) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      {options.map((opt, i) => {
        const on = value === opt;
        return (
          <Pressable
            key={opt}
            accessibilityRole="button"
            accessibilityLabel={opt}
            accessibilityState={{ selected: on }}
            onPress={() => onPick(opt)}
            style={{
              width: '23.5%', minHeight: 44, borderRadius: Radius.md,
              alignItems: 'center', justifyContent: 'center',
              paddingHorizontal: 3, paddingVertical: Spacing.xs,
              backgroundColor: on ? color : c.background,
              borderColor: on ? color : c.border, borderWidth: 1,
            }}>
            <Text
              numberOfLines={2}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
              style={{
                ...Type.small, fontSize: 11, lineHeight: 14, textAlign: 'center',
                fontWeight: on ? '700' : '600',
                color: on ? Palette.white : c.textMuted,
              }}>
              {labels?.[i] || opt}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** The small heading over one of those rows, in that row's colour. */
function RowLabel({ text, color }: { text: string; color: string }) {
  return (
    <Text style={{ ...Type.eyebrow, fontSize: 10, color, marginBottom: Spacing.sm }}>
      {text}
    </Text>
  );
}

/** What is asked after someone answers Both. Wraps, because these are sentences. */
function DetailRow({
  label, options, value, onPick,
}: {
  label: string;
  options: string[];
  value?: string;
  onPick: (option: string) => void;
}) {
  return (
    <View style={{ marginTop: Spacing.sm }}>
      <Text style={{ ...Type.small, fontSize: 11, color: c.textMuted, marginBottom: Spacing.sm }}>
        {label}
      </Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
        {options.map((opt) => (
          <Pill key={opt} label={opt} small selected={value === opt} onPress={() => onPick(opt)} />
        ))}
      </View>
    </View>
  );
}

function Choice({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
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
      <PageWash tint={exerciseColor('ex2')} />
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
