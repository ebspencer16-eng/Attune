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

import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Linking, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { fetchHome } from '@/api/client';
import type { ApiError, HomeCard, HomeResponse } from '@/api/client';
import { ScreenError, ScreenLoading } from '@/components/screen-states';
import SignIn from '@/components/sign-in';
import Settings from '@/components/settings';
import { Colors, MaxContentWidth, Palette, Radius, Spacing, Type } from '@/constants/attune-theme';

const c = Colors.light;
const SITE = 'https://www.attune-relationships.com';

/**
 * The routes this app actually has, matching the tab triggers in app-tabs.tsx.
 *
 * These are the app's own facts rather than a rule the server owns, so keeping
 * them here is right. What matters is that a route the server sends which is
 * not in this set falls through to the website instead of navigating nowhere.
 */
const APP_ROUTES = new Set(['/', '/insights', '/resources', '/notes']);

export default function HomeScreen() {
  const router = useRouter();
  const [data, setData] = useState<HomeResponse | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const loadingRef = useRef(false);
  const load = useCallback(async () => {
    loadingRef.current = true;
    const res = await fetchHome();
    if (res.ok) { setData(res.data); setError(null); }
    else { setError(res.error); }
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


  /**
   * Follow a card.
   *
   * Routes on `app`, which the server derives from the same deepLink the site
   * uses. It used to push deepLink itself, a website route like /?view=results
   * that the app has no concept of, so every card on this screen quietly did
   * nothing. The `as never` cast is what let that compile.
   *
   * Nothing here branches on card.kind, so a new kind server-side still needs
   * no app release.
   */
  const open = (card: HomeCard) => {
    if (card.disabled) return;
    const target = card.app;
    if (target?.external) { Linking.openURL(target.external); return; }
    if (target?.route) {
      // Checked against the routes that exist before pushing.
      //
      // expo-router's typed routes cannot check a string decided at runtime, so
      // this push needs a cast, and a cast is exactly what hid the last version
      // of this bug: an unroutable value compiled fine and silently went
      // nowhere. Validating first means an unknown route falls through to the
      // website rather than doing nothing at all.
      if (APP_ROUTES.has(target.route)) {
        router.push(target.route as never);
        return;
      }
    }
    // No app target at all means an older payload. Opening the website is the
    // honest fallback: the thing exists, just not here.
    if (card.deepLink) Linking.openURL(`${SITE}/app${card.deepLink.replace(/^\//, '')}`);
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
      {/* No gradient ground. Three hues running corner to corner behind the
          greeting was the app introducing a palette the site does not have,
          and it made this the only screen in the product with its own
          background. The ground is the site's cream everywhere. Indigo is the
          brand colour and appears once, on the wordmark. Orange is contrast
          and appears once, on the thing the screen is asking you to do. */}
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
              tintColor={c.textMuted}
            />
          }>
          {/* The wordmark and the way into Settings share a row. Settings is
              where account deletion lives, which App Review has to be able to
              find without being told where it is. */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.sm }}>
            <Text style={{ ...Type.eyebrow, color: Palette.indigo }}>
              Attune
            </Text>
            <Pressable
              onPress={() => setSettingsOpen(true)}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Settings"
              style={{
                paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs,
                borderRadius: Radius.pill, borderWidth: 1,
                borderColor: c.border,
              }}>
              <Text style={{ ...Type.small, color: c.text, fontWeight: '700' }}>
                Settings
              </Text>
            </Pressable>
          </View>
          <Text
            style={{
              ...Type.hero, color: c.textStrong, marginTop: Spacing.sm, marginBottom: Spacing.xl,
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

      {settingsOpen ? (
        <Settings
          onClose={() => setSettingsOpen(false)}
          onSignedOut={() => { setSettingsOpen(false); setLoading(true); load(); }}
        />
      ) : null}
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
 * The one prompt. It used to be a white card lifting off a dark gradient. On
 * the cream ground it takes the same hairline border the list below it uses,
 * so the two agree about what a container looks like.
 *
 * The call to action is a real button rather than a line of coloured text:
 * this is the single thing the screen is asking for, and it should look like
 * it. It is also the only orange on the screen, so the eyebrow above it is
 * quiet. Two oranges in one card and neither one means anything.
 */
function PrimaryCard({ card, onPress }: { card: HomeCard; onPress: () => void }) {
  const dim = !!card.disabled;
  return (
    <View
      style={{
        backgroundColor: c.surface, borderRadius: Radius.xl,
        borderColor: c.border, borderWidth: 1,
        padding: Spacing.xl, opacity: dim ? 0.6 : 1,
      }}>
      <Text style={{ ...Type.eyebrow, color: c.textMuted }}>Next for you</Text>
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
