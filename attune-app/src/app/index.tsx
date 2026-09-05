/**
 * Home.
 *
 * Renders whatever `/api/home` returns and nothing else. Ordering is the
 * priority engine's job, server-side and covered by 26 tests, so this screen
 * has no opinion about which card matters most.
 *
 * The rule worth stating: do NOT branch on `kind` for layout beyond an accent.
 * Every card is `{ id, kind, title, body, cta, deepLink }`, so adding a card
 * kind server-side should never require an app release. A switch statement
 * here would quietly make that untrue.
 */

import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { fetchHome } from '@/api/client';
import type { ApiError, HomeCard, HomeResponse } from '@/api/client';
import { ScreenError, ScreenLoading } from '@/components/screen-states';
import SignIn from '@/components/sign-in';
import { Colors, MaxContentWidth, Radius, Spacing, Type } from '@/constants/attune-theme';

const c = Colors.light;

export default function HomeScreen() {
  const router = useRouter();
  const [data, setData] = useState<HomeResponse | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const res = await fetchHome();
    if (res.ok) { setData(res.data); setError(null); }
    else { setError(res.error); }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const open = (card: HomeCard) => {
    if (card.disabled || !card.deepLink) return;
    router.push(card.deepLink as never);
  };

  if (loading) return <Shell><ScreenLoading label="Getting your dashboard" /></Shell>;

  // Stale-while-error: with data already in hand, keep showing it and let
  // pull-to-refresh retry. Replacing a working screen with an error because a
  // background refresh failed is worse than the failure.
  if (error?.kind === 'unauthorized') {
    return (
      <Shell>
        <SignIn onSignedIn={() => { setLoading(true); load(); }} />
      </Shell>
    );
  }
  if (error && !data) {
    return (
      <Shell>
        <ScreenError error={error} onRetry={() => { setLoading(true); load(); }} />
      </Shell>
    );
  }
  if (!data) return <Shell><ScreenLoading /></Shell>;

  return (
    <Shell>
      <ScrollView
        contentContainerStyle={{ padding: Spacing.xl, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={c.accentQuiet} />
        }>
        <Text style={{ ...Type.hero, color: c.textStrong, marginBottom: Spacing.xl }}>
          {data.greeting}
        </Text>

        {data.primary ? <Card card={data.primary} primary onPress={() => open(data.primary)} /> : null}

        {data.secondary?.length ? (
          <View style={{ marginTop: Spacing.lg, gap: Spacing.md }}>
            {data.secondary.map((s) => <Card key={s.id} card={s} onPress={() => open(s)} />)}
          </View>
        ) : null}

        {error ? (
          <Text style={{ ...Type.small, color: c.textMuted, marginTop: Spacing.xl }}>
            Showing what we last loaded. Pull down to refresh.
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

function Card({ card, primary, onPress }: { card: HomeCard; primary?: boolean; onPress: () => void }) {
  const dim = !!card.disabled;
  return (
    <Pressable
      onPress={onPress}
      disabled={dim}
      style={{
        backgroundColor: c.surface,
        borderColor: dim ? c.border : primary ? c.accent : c.border,
        borderWidth: 1,
        // The primary card takes a left rule in the accent rather than a
        // heavier border all round: emphasis without shouting.
        borderLeftWidth: primary ? 4 : 1,
        borderRadius: Radius.lg,
        padding: Spacing.lg,
        opacity: dim ? 0.55 : 1,
      }}>
      <Text style={{ ...Type.cardTitle, color: c.textStrong }}>{card.title}</Text>
      {card.body ? (
        <Text style={{ ...Type.body, color: c.textMuted, marginTop: Spacing.xs }}>{card.body}</Text>
      ) : null}
      {card.cta && !dim ? (
        <Text style={{ ...Type.small, color: c.accent, fontWeight: '700', marginTop: Spacing.md }}>
          {card.cta}
        </Text>
      ) : null}
    </Pressable>
  );
}
