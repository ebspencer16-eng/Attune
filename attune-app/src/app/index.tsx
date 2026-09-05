/**
 * Home.
 *
 * One prompt, not a list. The priority engine already decides what matters
 * most, and stacking four cards throws that away: a list of four things to do
 * is a list to feel behind on, which is the wrong feeling for a product about
 * a relationship.
 *
 * So the primary card is the screen. Everything else the engine returned sits
 * underneath as quiet one-line links, available without competing.
 *
 * Renders whatever /api/home returns and routes on deepLink, never branching
 * on card kind, so adding a card kind server-side never needs an app release.
 */

import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

import { fetchHome } from '@/api/client';
import type { ApiError, HomeCard, HomeResponse } from '@/api/client';
import { ScreenError, ScreenLoading } from '@/components/screen-states';
import SignIn from '@/components/sign-in';
import { Colors, MaxContentWidth, Palette, Radius, Spacing, Type } from '@/constants/attune-theme';

const c = Colors.light;

export default function HomeScreen() {
  const router = useRouter();
  const { height } = useWindowDimensions();
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

  if (error?.kind === 'unauthorized') {
    return (
      <Shell>
        <SignIn onSignedIn={() => { setLoading(true); load(); }} rejectedReason={error.detail} />
      </Shell>
    );
  }
  if (error && !data) {
    return <Shell><ScreenError error={error} onRetry={() => { setLoading(true); load(); }} /></Shell>;
  }
  if (!data) return <Shell><ScreenLoading /></Shell>;

  const rest = data.secondary ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      {/* The gradient is the screen's ground, not a decorative band: it runs
          behind the greeting and the one prompt, so the first thing you see is
          the brand rather than a cream page with boxes on it. Deep indigo to
          the site's blue, the same family the results glance pages use. */}
      <LinearGradient
        colors={['#1B2A5E', '#2F55C4', '#2B6FD6']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: height * 0.62 }}
      />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView
          contentContainerStyle={{
            padding: Spacing.xl, paddingBottom: Spacing.xxxl,
            maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center',
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
              tintColor="rgba(255,255,255,0.8)"
            />
          }>
          <Text style={{ ...Type.eyebrow, color: 'rgba(255,255,255,0.55)', marginTop: Spacing.sm }}>
            Attune
          </Text>
          <Text
            style={{
              ...Type.hero, color: Palette.white, marginTop: Spacing.sm, marginBottom: Spacing.xl,
            }}>
            {data.greeting}
          </Text>

          {data.primary ? <PrimaryCard card={data.primary} onPress={() => open(data.primary)} /> : null}

          {rest.length ? (
            <View style={{ marginTop: Spacing.xxl }}>
              <Text style={{ ...Type.eyebrow, color: c.textMuted, marginBottom: Spacing.sm }}>
                Also waiting
              </Text>
              <View
                style={{
                  backgroundColor: c.surface, borderColor: c.border, borderWidth: 1,
                  borderRadius: Radius.lg, overflow: 'hidden',
                }}>
                {rest.map((s, i) => (
                  <SecondaryRow key={s.id} card={s} first={i === 0} onPress={() => open(s)} />
                ))}
              </View>
            </View>
          ) : null}

          {error ? (
            <Text style={{ ...Type.small, color: c.textMuted, marginTop: Spacing.xl }}>
              Showing what we last loaded. Pull down to refresh.
            </Text>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </View>
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
 * The one prompt. White card on the gradient, so it lifts off the ground
 * without needing a shadow, and the call to action is a real button rather
 * than a line of coloured text: this is the single thing the screen is asking
 * for, and it should look like it.
 */
function PrimaryCard({ card, onPress }: { card: HomeCard; onPress: () => void }) {
  const dim = !!card.disabled;
  return (
    <View
      style={{
        backgroundColor: c.surface, borderRadius: Radius.xl,
        padding: Spacing.xl, opacity: dim ? 0.6 : 1,
      }}>
      <Text style={{ ...Type.eyebrow, color: Palette.orange }}>Next for you</Text>
      <Text style={{ ...Type.title, color: c.textStrong, marginTop: Spacing.sm }}>{card.title}</Text>
      {card.body ? (
        <Text style={{ ...Type.body, color: c.textMuted, marginTop: Spacing.sm }}>{card.body}</Text>
      ) : null}
      {card.cta && !dim ? (
        <Pressable
          onPress={onPress}
          style={{
            marginTop: Spacing.lg, alignSelf: 'flex-start',
            backgroundColor: Palette.orange, borderRadius: Radius.md,
            paddingVertical: Spacing.md, paddingHorizontal: Spacing.xl,
          }}>
          <Text style={{ ...Type.cardTitle, color: Palette.white }}>{card.cta}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Everything else: one line each, present but not competing. */
function SecondaryRow({ card, first, onPress }: { card: HomeCard; first: boolean; onPress: () => void }) {
  const dim = !!card.disabled;
  return (
    <Pressable
      onPress={onPress}
      disabled={dim}
      style={{
        paddingVertical: Spacing.lg, paddingHorizontal: Spacing.lg,
        borderTopWidth: first ? 0 : 1, borderTopColor: c.border,
        flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
        opacity: dim ? 0.5 : 1,
      }}>
      <View style={{ flex: 1 }}>
        <Text style={{ ...Type.cardTitle, color: c.textStrong }}>{card.title}</Text>
        {card.body ? (
          <Text numberOfLines={1} style={{ ...Type.small, color: c.textMuted, marginTop: 2 }}>
            {card.body}
          </Text>
        ) : null}
      </View>
      {!dim ? <Text style={{ ...Type.body, color: Palette.orange }}>{'\u203A'}</Text> : null}
    </Pressable>
  );
}
