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

import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fetchHome, fetchResults } from '@/api/client';
import type { ApiError, ExerciseState, HomeResponse, ResultsResponse } from '@/api/client';
import { ScreenError, ScreenLoading } from '@/components/screen-states';
import SignIn from '@/components/sign-in';
import {
  AccentFallback, AccentFor, Colors, MaxContentWidth, Palette, Radius, Spacing,
  StatusColor, Type,
} from '@/constants/attune-theme';

const c = Colors.light;

export default function InsightsScreen() {
  const [home, setHome] = useState<HomeResponse | null>(null);
  const [results, setResults] = useState<ResultsResponse | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
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
  }, []);

  useEffect(() => { load(); }, [load]);

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
        <Text style={{ ...Type.hero, color: c.textStrong }}>
          {ready ? 'Your results' : 'Your exercises'}
        </Text>
        <Text style={{ ...Type.body, color: c.textMuted, marginTop: Spacing.sm, marginBottom: Spacing.xl }}>
          {ready
            ? 'Everything you both answered, side by side.'
            : mineLeft === 0 && theirsLeft > 0
              ? `You're done. Results open once ${partner} finishes.`
              : `Results open once you have both finished. ${mineLeft} left for you.`}
        </Text>

        {ready
          ? <Results results={results} coupleType={home?.state?.coupleType ?? null} />
          : <StatusTable exercises={exercises} you={you} partner={partner} />}
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
  exercises, you, partner,
}: { exercises: ExerciseState[]; you: string; partner: string }) {
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
        <View style={{ flex: 1.15 }} />
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
          <View style={{ flex: 1.15, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md }}>
            <Text style={{ ...Type.small, fontWeight: '700', color: c.textMuted }}>
              {String(i + 1).padStart(2, '0')}
            </Text>
            {/* The accent dot keeps each exercise recognisable by its colour,
                the way it is everywhere else in the app. */}
            <View style={{ width: 7, height: 7, borderRadius: Radius.pill, backgroundColor: AccentFor[e.key] ?? AccentFallback }} />
            <Text style={{ ...Type.small, color: c.textStrong, fontWeight: '500', flexShrink: 1 }}>
              {e.label || e.key}
            </Text>
          </View>
          <StatusCell done={e.mine} />
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
function StatusCell({ done, muted }: { done: boolean; muted?: boolean }) {
  return (
    <View
      style={{
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: Spacing.xs, padding: Spacing.md,
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
        {done ? 'Done' : 'Pending'}
      </Text>
    </View>
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
function Results({
  results, coupleType,
}: { results: ResultsResponse | null; coupleType: string | null }) {
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

  const { results: couple } = results;
  const type = couple.coupleType || coupleType;

  return (
    <View>
      {type ? (
        <View
          style={{
            backgroundColor: c.surface, borderColor: c.border, borderWidth: 1,
            borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.lg,
          }}>
          <Text style={{ ...Type.eyebrow, color: c.accentQuiet, marginBottom: Spacing.sm }}>
            Your couple type
          </Text>
          <Text style={{ ...Type.title, color: c.textStrong }}>{type}</Text>
        </View>
      ) : null}

      {/* The widest gaps, which is the one thing the payload can already say
          without any of the section screens existing. Ordered by the server. */}
      {couple.rankedGaps?.length ? (
        <View
          style={{
            backgroundColor: c.surface, borderColor: c.border, borderWidth: 1,
            borderRadius: Radius.lg, padding: Spacing.lg,
          }}>
          <Text style={{ ...Type.eyebrow, color: c.accentQuiet, marginBottom: Spacing.md }}>
            Where you differ most
          </Text>
          {couple.rankedGaps.slice(0, 3).map((g) => (
            <Text key={g.dim} style={{ ...Type.body, color: c.text, marginBottom: Spacing.xs }}>
              {g.dim}
            </Text>
          ))}
        </View>
      ) : null}

      <Text style={{ ...Type.small, color: c.textMuted, marginTop: Spacing.xl }}>
        The full results experience opens here next.
      </Text>
    </View>
  );
}
