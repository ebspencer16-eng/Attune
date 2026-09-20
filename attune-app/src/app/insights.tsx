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

import { useScreenTime } from '@/hooks/use-screen-time';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useTabReset } from '@/hooks/use-tab-reset';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fetchHome, fetchResults } from '@/api/client';
import type { ApiError, ExerciseState, HomeResponse, ResultsResponse } from '@/api/client';
import { ScreenError, ScreenLoading } from '@/components/screen-states';
import ResultsExperience, { showFirstSection } from '@/components/results';
import Exercise from '@/components/exercise';
import Expectations from '@/components/expectations';
import ConflictExercise from '@/components/conflict-exercise';
import ReflectionExercise from '@/components/reflection-exercise';
import IntimacyExercise from '@/components/intimacy-exercise';
import SignIn from '@/components/sign-in';
import {
  Colors, MaxContentWidth, Palette, Radius, Spacing, StatusColor, Type,
} from '@/constants/attune-theme';
import { WAITING } from '@/constants/waiting';
import TabScreen from '@/components/tab-screen';
import { LOADING } from '@/constants/loading-copy';

const c = Colors.light;

/**
 * The table's three columns, as widths rather than as flex.
 *
 * Ellie: "Table rendering weirdly, the column lines need to match up." They
 * did not: the header was three flex children and so was every row, and flex
 * distributes what is left after each child's own content is measured. A blank
 * header cell and a cell holding "01 Relationship Reflection" do not measure
 * the same, so the two rows divided the width differently and the rules
 * between the columns stepped sideways.
 *
 * Percentages take the negotiation away. The header and the rows are given the
 * same three numbers from one place, so they cannot disagree.
 */
const COL = { label: '46%', person: '27%' } as const;


export default function InsightsScreen() {
  useScreenTime('insights');
  const [home, setHome] = useState<HomeResponse | null>(null);
  const [results, setResults] = useState<ResultsResponse | null>(null);
  /** The colour of the results section on screen, for the wash behind it. */
  const [accent, setAccent] = useState<string | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  // Which exercise is open, if any. Only ex1 is answerable in the app so far;
  // the rest still live on the website and the row says so rather than opening
  // a screen that cannot ask anything.
  const [openExercise, setOpenExercise] = useState<string | null>(null);

  /**
   * The exercise a home card asked for, if any.
   *
   * Consumed once and cleared. Leaving it on the route would reopen the
   * exercise every time someone closed it, which is a screen you cannot get
   * out of.
   */
  const { exercise: requestedExercise } = useLocalSearchParams<{ exercise?: string }>();
  useEffect(() => {
    if (!requestedExercise) return;
    setOpenExercise(requestedExercise);
    /**
     * ── CLEARING THE PARAM CANNOT TAKE THE SCREEN DOWN ────────────────────
     * "Attempted to navigate before mounting the Root Layout component."
     * This tab is mounted by the tab bar as the app starts, which can be
     * before the navigator is ready, and setParams then throws: a red screen
     * on a cold start, from a line whose only job is tidying up after itself.
     *
     * Deferred a tick so the navigator exists, and wrapped, because the worst
     * case of failing to clear it is that closing the exercise reopens it
     * once. That is a great deal better than the app not starting.
     */
    const tidy = setTimeout(() => {
      try { router.setParams({ exercise: undefined }); } catch { /* not mounted */ }
    }, 0);
    return () => clearTimeout(tidy);
  }, [requestedExercise]);

  const loadingRef = useRef(false);
  // Which load is current. A load that finishes after a newer one started must
  // not write its results over the newer answer.
  const runRef = useRef(0);

  const load = useCallback(async () => {
    loadingRef.current = true;
    const run = ++runRef.current;
    const current = () => runRef.current === run;
    try {
      const res = await fetchHome();
      if (!current()) return;
      if (res.ok) { setHome(res.data); setError(null); }
      else { setError(res.error); }

      // ── WHY THIS DOES NOT CLEAR RESULTS ON FAILURE ──────────────────────
      // It used to be `setResults(r.ok ? r.data : null)`, with a plain
      // `setResults(null)` when /api/home failed. Either path threw away a
      // good payload the moment one request did not come back.
      //
      // That is what the screen reporting "Your results are ready. They could
      // not be loaded just now." on returning to the tab was: `home` was still
      // populated from the previous load, so the ready branch still rendered,
      // but `results` had been nulled by a transient failure. One dropped
      // request turned a working screen into an error that only a pull to
      // refresh could clear.
      //
      // Results are only cleared when the server actually says there are none.
      // A failure leaves the last good payload on screen, which is both true
      // and what the reader wants.
      if (!res.ok) return;

      if (!res.data.resultsReady) {
        setResults(null);
        return;
      }

      // Only asked for once the server says there is something to ask for.
      // Fetching results before both partners finish returns a not-ready
      // payload this screen has no use for, on a call that is not free.
      const r = await fetchResults();
      if (!current()) return;
      if (r.ok) setResults(r.data);
    } finally {
      // In a finally so a thrown request cannot leave the guard stuck on,
      // which would stop every later focus from reloading anything.
      if (current()) {
        setLoading(false);
        setRefreshing(false);
      }
      loadingRef.current = false;
    }
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
      if (loadingRef.current) return;
      /**
       * ── WHY A STALE SIGN-IN SCREEN NEEDS THE SPINNER BACK ──────────────
       * Ellie: "clicking the insights tab initially showed the sign in page
       * again, but then I tried again and it worked."
       *
       * All four tabs mount when the app starts, so a tab loaded while signed
       * out holds an unauthorized error. Signing in on one tab reloads that
       * one; this one reloads when it is next focused, and until that request
       * lands it goes on rendering the sign-in screen it stored earlier. The
       * reload was already happening. What was missing is that the screen said
       * nothing about it, so a session that was fine looked like one that had
       * ended.
       */
      if (error?.kind === 'unauthorized') setLoading(true);
      load();
    }, [load, error?.kind]),
  );

  /**
   * Tapping Insights while already on Insights goes back to Highlights, and
   * closes an exercise if one is open. See useTabReset.
   */
  useTabReset(useCallback(() => {
    setOpenExercise(null);
    showFirstSection();
  }, []));

  if (loading) return <Shell><ScreenLoading label={LOADING.insights} /></Shell>;

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
  /**
   * Results, unless something asked for an exercise by name.
   *
   * A home card can ask for one, and once results are ready this branch used
   * to swallow that: the tab drew results and the exercise never opened. Every
   * exercise being finished is the usual reason results are ready, so it did
   * not come up often, but "open this exercise" answered with a different
   * screen is a request that silently went nowhere.
   */
  if (ready && !openExercise) {
    return (
      <Shell tint={accent}>
        {/* The "Your results" hero moved inside Results, because it belongs to
            the landing menu rather than to every page under it. A detail page
            says where it is in one line, which is what Ellie asked the header
            to do: "[Section]:[detailed page]". Two headings above that, one of
            them the same on all twenty-nine pages, is the nav repeating
            itself. */}
        <Results
          results={results}
          owned={home?.owned ?? []}
          /* The section's colour, which the wash behind it takes. See the
             note on onAccent: the tab paints one wash, so the page has to
             say what colour it is rather than painting its own. */
          onAccent={setAccent}
        />
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
        {/* ── BEFORE THERE ARE RESULTS ───────────────────────────────────
            Ellie: "Ensure that when exercises are unfinished, insights page
            hero says 'Insights generate once your exercises are complete' and
            the orange page shows the exercise status table instead of the
            insights menu."

            Her line, word for word. The page it sits on is the same orange
            ground the landing menu is on, so the tab looks like one place
            whether or not the results exist yet. */}
        <Text style={{ ...Type.hero, color: c.textStrong }}>
          Insights generate once your exercises are complete
        </Text>
        <Text style={{ ...Type.body, color: c.textMuted, marginTop: Spacing.sm, marginBottom: Spacing.xl }}>
          {/* Both branches were written in the app. The first named the partner,
              the second counted what was left, and neither is in Ellie's
              lines. Two of hers, from the shared module. */}
          {mineLeft === 0 && theirsLeft > 0 ? WAITING.LOCKED_BY_THEM : WAITING.DASHBOARD}
        </Text>

        <StatusTable exercises={exercises} you={you} partner={partner} onOpen={setOpenExercise} />
      </ScrollView>
    </Shell>
  );
}

function Shell({ children, tint }: { children: React.ReactNode; tint?: string | null }) {
  /* ── THE TAB'S OWN COLOUR ──────────────────────────────────────────────
     Ellie: "The home page is the attune blue, please try making the landing
     page for insights the attune orange. Similar gradient as the home page
     has please."

     So the default is the orange, and a results page still overrides it with
     its section's colour. The landing menu, the exercise table and every
     waiting state are on the orange, which is what makes the tab one place. */
  /* ── VISUAL COHESION, PER SECTION ──────────────────────────────────────
     Ellie: "What can we do to create some visual cohesion for each section?
     Maybe a bg tint in the gradient?"

     The wash behind every page of a section is that section's colour, so
     Expectations reads blue and Physical Intimacy reads rose whichever of
     their pages you are on. It is behind the tile rather than in it, which
     costs nothing in legibility: nothing is read on it. */
  return <TabScreen tint={tint || Palette.orange} second={tint ? undefined : Palette.clay}>{children}</TabScreen>;
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
        <View style={{ width: COL.label }} />
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
          <View style={{ width: COL.label, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.md, paddingLeft: Spacing.md, paddingRight: Spacing.sm }}>
            <Text style={{ ...Type.small, fontWeight: '700', color: c.textMuted }}>
              {String(i + 1).padStart(2, '0')}
            </Text>
            {/* Ellie: "please call ex1 communication styles in the status
                table". The fuller name from the registry, with the short one
                as the fallback for anything that has not been given one. */}
            <Text style={{ ...Type.small, color: c.textStrong, fontWeight: '500', flex: 1 }}>
              {e.fullLabel || e.label || e.key}
            </Text>
          </View>
          {/* Only your own column is actionable, and only for exercises the
              app can actually ask. A cell that opens nothing is worse than a
              plain status. */}
          <StatusCell
            done={e.mine}
            started={e.started}
            answered={e.answered}
            total={e.total}
            onPress={!e.mine && e.inApp ? () => onOpen(e.key) : undefined}
          />
          <StatusCell done={e.theirs} muted />
        </View>
      ))}
    </View>
  );
}

function HeaderCell({ label }: { label: string }) {
  return (
    <View style={{ width: COL.person, padding: Spacing.md, borderLeftWidth: 1, borderLeftColor: c.border }}>
      <Text numberOfLines={1} style={{ ...Type.small, fontWeight: '700', color: c.textStrong, textAlign: 'center' }}>
        {label}
      </Text>
    </View>
  );
}

/**
 * How much of an exercise is done, as a ring that fills round.
 *
 * ── WHY IT IS DRAWN THIS WAY ──────────────────────────────────────────────
 * Ellie: "Progress pie chart on status table should look like a circular
 * loading bar not a circle filling in from the bottom up."
 *
 * An arc needs a path, and a path needs a drawing library this app does not
 * carry. What it does have is two windows and a rotation. Each window shows
 * one half of a circle; inside each sits a ring with only two of its four
 * borders painted, which renders as a half-circle arc, and rotating that arc
 * inside its window leaves exactly the swept part visible.
 *
 * The maths, once: a ring with its top and right borders painted covers 10:30
 * to 4:30, which is a 180 degree arc centred on 45 degrees. Rotating it by
 * `a - 135` puts its end at `a` degrees clockwise from twelve. The right
 * window clips that to 0 to 180, so the first half of the sweep is the first
 * arc; the left window clips the second arc to 180 to 360, which is the rest.
 */
function ProgressRing({
  portion, size = 17, thickness = 2.5, color, track,
}: { portion: number; size?: number; thickness?: number; color: string; track: string }) {
  const deg = Math.max(0, Math.min(1, portion)) * 360;
  const half = size / 2;

  const arc = (rotate: number) => (
    <View
      style={{
        position: 'absolute', width: size, height: size, borderRadius: half,
        borderWidth: thickness,
        borderTopColor: color, borderRightColor: color,
        borderBottomColor: 'transparent', borderLeftColor: 'transparent',
        transform: [{ rotate: `${rotate}deg` }],
      }}
    />
  );

  return (
    <View style={{ width: size, height: size }}>
      {/* The unfilled ring, so an exercise barely started still reads as a
          circle rather than as a dash floating on its own. */}
      <View
        style={{
          position: 'absolute', width: size, height: size, borderRadius: half,
          borderWidth: thickness, borderColor: track,
        }}
      />
      {/* First half of the sweep. */}
      <View style={{ position: 'absolute', left: half, width: half, height: size, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', left: -half, width: size, height: size }}>
          {arc(Math.min(deg, 180) - 135)}
        </View>
      </View>
      {/* The rest of it, once past halfway. */}
      {deg > 180 ? (
        <View style={{ position: 'absolute', left: 0, width: half, height: size, overflow: 'hidden' }}>
          <View style={{ position: 'absolute', left: 0, width: size, height: size }}>
            {arc(deg - 135)}
          </View>
        </View>
      ) : null}
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
function StatusCell({
  done, started, answered, total, muted, onPress,
}: {
  done: boolean; started?: boolean; answered?: number; total?: number;
  muted?: boolean; onPress?: () => void;
}) {
  const Wrap: React.ElementType = onPress ? Pressable : View;
  return (
    <Wrap
      onPress={onPress}
      style={{
        width: COL.person, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: Spacing.xs, paddingVertical: Spacing.md, paddingHorizontal: Spacing.sm,
        borderLeftWidth: 1, borderLeftColor: c.border,
      }}>
      {/* ── THREE STATES, AND THE MIDDLE ONE IS A COUNT ──────────────────
          Ellie: "I don't like that in progress fits differently in the status
          table. What if we just listed the progress count like 6/50, and used
          the circle icon as a pie chart to show portion complete?"

          So the circle is the same size in all three states and the words
          beside it are short in all three: a tick and Done, a filled wedge and
          6/50, an empty circle and Start. Nothing reflows between rows. */}
      {done || !started ? (
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
      ) : (
        <ProgressRing
          portion={(answered || 0) / Math.max(total || 1, 1)}
          color={StatusColor.inProgress}
          track={c.border}
        />
      )}
      <Text
        style={{
          ...Type.small, fontWeight: done ? '700' : '600',
          color: done ? StatusColor.done : muted ? StatusColor.waitingText : c.accentQuiet,
        }}>
        {done ? 'Done' : started ? `${answered}/${total}` : onPress ? 'Start' : 'Pending'}
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
function Results({ results, owned, onAccent }: {
  results: ResultsResponse | null; owned: string[];
  /** Passed straight through: the section's colour, for the wash. */
  onAccent?: (color: string | null) => void;
}) {
  if (!results) {
    return (
      <Text style={{ ...Type.body, color: c.textMuted }}>
        Your results are ready. They could not be loaded just now. Pull down to try again.
      </Text>
    );
  }
  if (!results.ready) {
    /**
     * The server disagrees with /api/home about readiness.
     *
     * Rare, and worth naming rather than shrugging at: both answers come from
     * api/_lib/results-gate.js, so a disagreement means one of the two calls
     * saw older data. The endpoint says what it is waiting on, so this says it
     * too instead of "still being prepared", which tells a reader nothing they
     * can act on.
     *
     * The labels are the exercise registry's own, from the server.
     */
    const waiting = results.waitingOn || [];
    return (
      <View>
        <Text style={{ ...Type.body, color: c.textMuted }}>
          Your results are still being prepared.
        </Text>
        {waiting.map((w) => (
          <Text key={w.key} style={{ ...Type.small, color: c.textMuted, marginTop: Spacing.sm }}>
            {w.label}
            {w.who === 'both' ? ': neither of you has finished this yet.'
              : w.who === 'you' ? ': you have not finished this yet.'
              : ': your partner has not finished this yet.'}
          </Text>
        ))}
      </View>
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
      commDomains={results.commDomains ?? []}
      commResponses={results.commResponses ?? []}
      storycardStyle={results.storycardStyle ?? null}
      reflectionPlan={results.reflectionPlan}
      expectations={results.expectations}
      intimacy={results.intimacy}
      reflection={results.reflection}
      whatComesNext={results.whatComesNext}
      pageTitles={results.pageTitles ?? null}
      pageCopy={results.pageCopy ?? null}
      onAccent={onAccent}
    />
  );
}
