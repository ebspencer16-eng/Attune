/**
 * Insights.
 *
 * One tab, two lives. Before both partners finish it shows the status table,
 * the same one the website dashboard shows. Once results exist it becomes the
 * results experience.
 *
 * The label never changes. A tab bar is spatial memory, and a label that
 * changes underneath someone is disorienting in a way that is hard to
 * attribute to anything. What changes is what the tab holds, which is the
 * honest version of the same idea: the place grows up rather than moving.
 *
 * Readiness comes from the server and nothing here recomputes it. This screen
 * used to read a top-level `resultsReady` that /api/home has never sent, so it
 * was always undefined and a couple who had both finished everything were shown
 * their exercise progress instead of their results, forever.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fetchHome, fetchResults } from '@/api/client';
import type { ApiError, ExerciseState, HomeResponse, ResultsResponse } from '@/api/client';
import { ScreenError, ScreenLoading } from '@/components/screen-states';
import ResultsExperience from '@/components/results';
import Exercise from '@/components/exercise';
import Expectations from '@/components/expectations';
import ConflictExercise from '@/components/conflict-exercise';
import ReflectionExercise from '@/components/reflection-exercise';
import IntimacyExercise from '@/components/intimacy-exercise';
import SignIn from '@/components/sign-in';
import {
  Colors, MaxContentWidth, Palette, Radius, Spacing, StatusColor, Type,
} from '@/constants/attune-theme';

const c = Colors.light;


export default function InsightsScreen() {
  const [home, setHome] = useState<HomeResponse | null>(null);
  const [results, setResults] = useState<ResultsResponse | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // Which exercise is open, if any. Only ex1 is answerable in the app so far;
  // the rest still live on the website and the row says so rather than opening
  // a screen that cannot ask anything.
  const [openExercise, setOpenExercise] = useState<string | null>(null);

  const loadingRef = useRef(false);
  const load = useCallback(async () => {
    loadingRef.current = true;
    const res = await fetchHome();
    if (res.ok) { setHome(res.data); setError(null); }
    else { setError(res.error); }

    // Only asked for once the server says there is something to ask for.
    // Fetching results before both partners finish returns a not-ready payload
    // this screen has no use for, on a call that is not free.
    if (res.ok && res.data.resultsReady) {
      const r = await fetchResults();
      setResults(r.ok ? r.data : null);
    } else {
      setResults(null);
    }

    setLoading(false);
    setRefreshing(false);
    loadingRef.current = false;
  }, []);

  useEffect(() => { load(); }, [load]);

  // Reload when this tab comes into focus, not only when it mounts.
  //
  // All four tabs mount when the app starts, so all four load at once. Open the
  // app with an expired session and all four store an unauthorized error and
  // render sign-in. Signing in on one reloaded that one; the other three kept
  // showing their own stale sign-in screen forever, so every tab switch looked
  // like being asked to sign in again.
  //
  // Skipped while a load is already running, so switching tabs quickly does not
  // stack requests.
  useFocusEffect(
    useCallback(() => {
      if (!loadingRef.current) load();
    }, [load]),
  );


  if (loading) return <Shell><ScreenLoading label="Checking where you both are" /></Shell>;

  if (error?.kind === 'unauthorized') {
    return (
      <Shell>
        <SignIn onSignedIn={() => { setLoading(true); load(); }} rejectedReason={error.detail} />
      </Shell>
    );
  }
  if (error && !home) {
    return <Shell><ScreenError error={error} onRetry={() => { setLoading(true); load(); }} /></Shell>;
  }

  // Order and labels come from the exercise registry, by way of /api/home.
  const exercises = Object.values(home?.exercises ?? {})
    .filter((e) => e.owned)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const you = home?.firstName || 'You';
  const partner = home?.partnerName || 'Your partner';
  const ready = !!home?.resultsReady;

  const mineLeft = exercises.filter((e) => !e.mine).length;
  const theirsLeft = exercises.filter((e) => !e.theirs).length;

  // Results own their own scrolling, so they sit outside this one. A vertical
  // ScrollView inside another vertical ScrollView does not scroll: the outer
  // one takes the gesture and the inner one never moves.
  if (ready) {
    return (
      <Shell>
        <View style={{ paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg, paddingBottom: Spacing.lg, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}>
          <Text style={{ ...Type.hero, color: c.textStrong }}>Your results</Text>
          <Text style={{ ...Type.body, color: c.textMuted, marginTop: Spacing.sm }}>
            Everything you both answered, side by side.
          </Text>
        </View>
        <Results results={results} owned={home?.owned ?? []} />
      </Shell>
    );
  }

  if (openExercise) {
    const close = () => setOpenExercise(null);
    const finished = () => { setOpenExercise(null); setLoading(true); load(); };
    /**
     * One screen per exercise, named rather than defaulted.
     *
     * Each asks a genuinely different shape of question, so each is its own
     * screen rather than one screen with four mode flags. Every key in
     * api/_exercises.js appears here, including ex1: a dispatch that names
     * four of five and falls through for the fifth is a list that has stopped
     * matching the registry, and check-exercise-registry.mjs says so.
     */
    const screens: Record<string, React.ReactNode> = {
      ex1: <Exercise exerciseKey="ex1" onClose={close} onFinished={finished} />,
      ex2: <Expectations onClose={close} onFinished={finished} />,
      ex3: <ReflectionExercise onClose={close} onFinished={finished} />,
      intimacy: <IntimacyExercise onClose={close} onFinished={finished} />,
      conflict: <ConflictExercise onClose={close} onFinished={finished} />,
    };
    // An unknown key means /api/home offered something this build cannot ask.
    // Showing the wrong exercise would be worse than saying so.
    return screens[openExercise] ?? (
      <Exercise exerciseKey={openExercise} onClose={close} onFinished={finished} />
    );
  }

  return (
    <Shell>
      <ScrollView
        contentContainerStyle={{
          padding: Spacing.xl, paddingBottom: Spacing.xxxl,
          maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center',
        }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={c.accentQuiet} />
        }>
        <Text style={{ ...Type.hero, color: c.textStrong }}>Your exercises</Text>
        <Text style={{ ...Type.body, color: c.textMuted, marginTop: Spacing.sm, marginBottom: Spacing.xl }}>
          {mineLeft === 0 && theirsLeft > 0
            ? `You're done. Results open once ${partner} finishes.`
            : `Results open once you have both finished. ${mineLeft} left for you.`}
        </Text>

        <StatusTable exercises={exercises} you={you} partner={partner} onOpen={setOpenExercise} />
      </ScrollView>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={['top']}>
      {children}
    </SafeAreaView>
  );
}

/**
 * Who has finished what, both partners at once.
 *
 * The same shape as the dashboard table on the web: a row per exercise, a
 * column per person, positional numbering over what this couple owns. Someone
 * checking progress here and on the site should be reading the same table, not
 * two designs for one fact.
 *
 * Numbering is positional rather than the exercise's own order, so a core
 * package plus Conflict Patterns reads 01, 02, 03 instead of 01, 02, 05. Nobody
 * should see a number for something they did not buy.
 *
 * The web's own column is clickable and reads "Start" or "Resume". This one is
 * not: the exercises live on the website, and a button that cannot do the thing
 * it names is worse than a plain status. Whether these rows should hand off to
 * the browser is a product question, not something to guess at here.
 */
function StatusTable({
  exercises, you, partner, onOpen,
}: { exercises: ExerciseState[]; you: string; partner: string; onOpen: (key: string) => void }) {
  return (
    <View
      style={{
        backgroundColor: c.surface,
        borderColor: c.border, borderWidth: 1,
        // The accent hairline along the top, as on the web.
        borderTopColor: c.accent, borderTopWidth: 3,
        borderRadius: Radius.xl, overflow: 'hidden',
      }}>
      {/* Header: blank, then a column each. */}
      <View style={{ flexDirection: 'row', backgroundColor: Palette.warm, borderBottomWidth: 1, borderBottomColor: c.border }}>
        <View style={{ flex: 1.6 }} />
        <HeaderCell label={you} />
        <HeaderCell label={partner} />
      </View>

      {exercises.map((e, i) => (
        <View
          key={e.key}
          style={{
            flexDirection: 'row', alignItems: 'stretch',
            borderBottomWidth: i < exercises.length - 1 ? 1 : 0, borderBottomColor: c.border,
          }}>
          {/* Wider than the status columns, and by a bigger margin than the
              web needs. "Communication" and "Relationship Reflection" broke
              mid-word at 1.15, which reads as a rendering fault rather than a
              long name. There was an accent dot here too; it cost the label
              about fifteen points and the web table does not have one. */}
          <View style={{ flex: 1.6, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.md, paddingLeft: Spacing.md, paddingRight: Spacing.sm }}>
            <Text style={{ ...Type.small, fontWeight: '700', color: c.textMuted }}>
              {String(i + 1).padStart(2, '0')}
            </Text>
            <Text style={{ ...Type.small, color: c.textStrong, fontWeight: '500', flex: 1 }}>
              {e.label || e.key}
            </Text>
          </View>
          {/* Only your own column is actionable, and only for exercises the
              app can actually ask. A cell that opens nothing is worse than a
              plain status. */}
          <StatusCell done={e.mine} onPress={!e.mine && e.inApp ? () => onOpen(e.key) : undefined} />
          <StatusCell done={e.theirs} muted />
        </View>
      ))}
    </View>
  );
}

function HeaderCell({ label }: { label: string }) {
  return (
    <View style={{ flex: 1, padding: Spacing.md, borderLeftWidth: 1, borderLeftColor: c.border }}>
      <Text numberOfLines={1} style={{ ...Type.small, fontWeight: '700', color: c.textStrong, textAlign: 'center' }}>
        {label}
      </Text>
    </View>
  );
}

/**
 * One person's state for one exercise.
 *
 * Done or not, and nothing in between. /api/home reports completion for both
 * partners but has no notion of an exercise being underway, so an "in progress"
 * state here would be invented rather than observed.
 */
function StatusCell({ done, muted, onPress }: { done: boolean; muted?: boolean; onPress?: () => void }) {
  const Wrap: React.ElementType = onPress ? Pressable : View;
  return (
    <Wrap
      onPress={onPress}
      style={{
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: Spacing.xs, paddingVertical: Spacing.md, paddingHorizontal: Spacing.sm,
        borderLeftWidth: 1, borderLeftColor: c.border,
      }}>
      <View
        style={{
          width: 17, height: 17, borderRadius: Radius.pill,
          alignItems: 'center', justifyContent: 'center',
          backgroundColor: done ? StatusColor.done : StatusColor.waiting,
        }}>
        {done ? (
          <Text style={{ fontSize: 9, lineHeight: 11, color: Palette.white, fontWeight: '700' }}>{'✓'}</Text>
        ) : null}
      </View>
      <Text
        style={{
          ...Type.small, fontWeight: done ? '700' : '600',
          color: done ? StatusColor.done : muted ? StatusColor.waitingText : c.accentQuiet,
        }}>
        {done ? 'Done' : onPress ? 'Start' : 'Pending'}
      </Text>
    </Wrap>
  );
}

/**
 * The results experience.
 *
 * The section list is the spine of it, and it is built from what the server
 * actually returned rather than from a list of every section that could exist.
 * A section nobody owns is not rendered as locked here, because /api/results
 * does not report on things this couple did not buy, and inventing a greyed row
 * from an app-side list is how the app starts describing a product the server
 * disagrees with.
 *
 * The individual section screens are the next piece of work. This renders the
 * couple type and what is available, which is what the payload supports today.
 */
function Results({ results, owned }: { results: ResultsResponse | null; owned: string[] }) {
  if (!results) {
    return (
      <Text style={{ ...Type.body, color: c.textMuted }}>
        Your results are ready. They could not be loaded just now. Pull down to try again.
      </Text>
    );
  }
  if (!results.ready) {
    // The server disagrees with /api/home about readiness. Say so plainly
    // rather than showing an empty results screen.
    return (
      <Text style={{ ...Type.body, color: c.textMuted }}>
        Your results are still being prepared.
      </Text>
    );
  }
  return (
    <ResultsExperience
      results={results.results}
      owned={owned}
      sections={results.sections}
      nav={results.nav}
      highlights={results.highlights}
      commsPlan={results.commsPlan}
      reflectionPlan={results.reflectionPlan}
      expectations={results.expectations}
      intimacy={results.intimacy}
      reflection={results.reflection}
      whatComesNext={results.whatComesNext}
    />
  );
}
