/**
 * Insights.
 *
 * One tab, two lives. Before both partners finish, it shows the exercises and
 * what is left. Once results exist, it becomes the results experience.
 *
 * The label never changes. A tab bar is spatial memory, and a label that
 * changes underneath someone is disorienting in a way that is hard to
 * attribute to anything. What changes is what the tab holds, which is the
 * honest version of the same idea: the place grows up rather than moving.
 */

import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fetchHome } from '@/api/client';
import type { ExerciseState, HomeResponse } from '@/api/client';
import { ScreenLoading } from '@/components/screen-states';
import {
  AccentFallback, AccentFor, Colors, MaxContentWidth, Radius, Spacing, Type,
} from '@/constants/attune-theme';

const c = Colors.light;

export default function InsightsScreen() {
  const [home, setHome] = useState<HomeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const res = await fetchHome();
    if (res.ok) setHome(res.data);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Shell><ScreenLoading label="Checking where you both are" /></Shell>;

  // What exercises exist, in what order, under what name: all of it comes from
  // /api/home, which builds it from api/_exercises.js. This screen used to keep
  // its own copy, so adding an exercise changed the site and left the app
  // showing four of five with nothing failing.
  // Falls back to the key for a label and to 0 for order, so an app talking to
  // an API that predates those fields shows a plainly-named row rather than a
  // blank one. A fallback, not a second copy of the list.
  const owned = Object.values(home?.exercises ?? {})
    .filter((e) => e.owned)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const partner = home?.partnerName || 'your partner';

  // Results are the payoff, so once they exist the tab is about them. Until
  // then it is about getting there, which is the only useful thing it can say.
  const ready = !!home?.resultsReady;

  const mineLeft = owned.filter((e) => !e.mine).length;
  const theirsLeft = owned.filter((e) => !e.theirs).length;

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
              : mineLeft === 0 && theirsLeft === 0
                ? 'Both finished. Your results are being prepared.'
                : `Results open once you have both finished. ${mineLeft} left for you.`}
        </Text>

        {owned.map((e) => (
          <ExerciseRow
            key={e.key}
            label={e.label || e.key}
            color={AccentFor[e.key] ?? AccentFallback}
            state={e}
            partner={partner}
          />
        ))}

        {ready ? (
          <Text style={{ ...Type.small, color: c.textMuted, marginTop: Spacing.xl }}>
            The full results experience opens here next.
          </Text>
        ) : null}
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
 * One exercise, both sides.
 *
 * Shows each partner separately rather than a single combined state, because
 * "waiting on them" and "waiting on you" call for completely different things
 * and a merged badge hides which it is.
 */
function ExerciseRow({
  label, color, state, partner,
}: { label: string; color: string; state?: ExerciseState; partner: string }) {
  const mine = !!state?.mine;
  const theirs = !!state?.theirs;

  return (
    <View
      style={{
        backgroundColor: c.surface, borderColor: c.border, borderWidth: 1,
        borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.md,
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
        <View style={{ width: 10, height: 10, borderRadius: Radius.pill, backgroundColor: color }} />
        <Text style={{ ...Type.cardTitle, color: c.textStrong, flex: 1 }}>{label}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md }}>
        <Pill done={mine} label={mine ? 'You: done' : 'You: not started'} />
        <Pill done={theirs} label={theirs ? `${partner}: done` : `${partner}: waiting`} />
      </View>
    </View>
  );
}

function Pill({ done, label }: { done: boolean; label: string }) {
  return (
    <View
      style={{
        paddingVertical: Spacing.xs + 2, paddingHorizontal: Spacing.md,
        borderRadius: Radius.pill,
        backgroundColor: done ? '#E7F3EC' : c.background,
        borderColor: done ? '#B7DCC6' : c.border, borderWidth: 1,
      }}>
      <Text style={{ ...Type.small, fontWeight: '700', color: done ? '#2E7D5B' : c.textMuted }}>
        {label}
      </Text>
    </View>
  );
}
