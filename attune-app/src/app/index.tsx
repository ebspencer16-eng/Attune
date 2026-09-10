/**
 * Home.
 *
 * ── WHAT THIS SCREEN IS FOR ───────────────────────────────────────────────
 * Somewhere to arrive, not a dashboard to check. The version before this one
 * was a correct dashboard: a greeting, a prompt, a list, a research note, each
 * competing on the same cream ground. Correct and cluttered.
 *
 * So the page is one blue ground with two things on it. At the top, the
 * greeting and one finding from the research, set as something to read, with
 * no header over it. Everything the product wants from you is gathered into a
 * single cream tile in the lower half, as three rows: what is next, what else
 * is waiting, and something to return to.
 *
 * The rows are ordered by the priority engine, not by this file. It renders
 * what /api/home returns and routes on the target it is given, never branching
 * on card kind, so a new kind ships server-side without an app release.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { fetchHome } from '@/api/client';
import type { ApiError, HomeCard, HomeResponse } from '@/api/client';
import { ScreenError, ScreenLoading } from '@/components/screen-states';
import SignIn from '@/components/sign-in';
import Settings from '@/components/settings';
import { forgetLastSection } from '@/components/results';
import {
  BlueGround, BottomTabInset, Colors, MaxContentWidth, Palette, Radius,
  Spacing, Type,
} from '@/constants/attune-theme';

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
  // Where the tile starts. Just over half the screen, so the reading has the
  // top of the page and the tile sits in the lower half without being pinned
  // to the bottom, which would leave a band of blue under it on a tall phone.
  // A floor, not a fixed height. The blue block grows to fill whatever the tile
  // leaves, so the tile always sits just above the tab bar whether it has two
  // rows or three, and the reading gets the rest. A fixed height put the third
  // row underneath the tab bar on the day a third row first existed.
  const topHeight = useWindowDimensions().height * 0.38;
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

  // The engine returns up to three more. The tile shows one: Ellie asked for
  // one other action item, and a tile with five rows is the list this screen
  // was rebuilt to stop being. The rest stay reachable from their own tabs.
  const alsoWaiting = (data.secondary ?? [])[0] || null;

  return (
    <View style={{ flex: 1, backgroundColor: BlueGround[0] }}>
      {/* The ground. Two shades of one blue, from BlueGround, which the results
          glance paints its lead panel with. Monochrome on purpose: the three
          hue version of this screen was the app inventing a palette the site
          does not have. */}
      <LinearGradient
        colors={[...BlueGround]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingBottom: BottomTabInset + Spacing.lg,
            maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center',
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
              tintColor="rgba(255,255,255,0.7)"
            />
          }>
          {/* ── ON THE BLUE ──────────────────────────────────────────────
              Given a minimum height rather than a fixed one, so the tile
              starts around half way down on a normal phone and is pushed
              further only by a long finding. A fixed height would either crop
              the reading or leave a hole above the tile on a small screen. */}
          <View
            style={{
              flexGrow: 1, minHeight: topHeight,
              paddingHorizontal: Spacing.xl, justifyContent: 'space-between',
            }}>
            {/* The wordmark is gone. It named the app to someone already
                inside it, on the one screen where the whole ground is the
                brand colour. Settings keeps the row: it is where account
                deletion lives, which App Review has to be able to find
                without being told where it is. */}
            {/* ── HELLO, AND THE WAY OUT ──────────────────────────────────
                The greeting sits on the top line now, with the profile control
                opposite it, because it was below a row that held nothing but a
                Settings pill: the first thing on the screen was a button, and
                the greeting had been pushed down the page to make room for it.

                Ellie also could not find it. The pill sat under the simulator's
                own gear icon, and "Settings" in a bordered pill reads as
                preferences rather than as the place your account lives. A
                profile glyph in the corner is where people look for that. */}
            <View
              style={{
                flexDirection: 'row', alignItems: 'center',
                justifyContent: 'space-between', gap: Spacing.md,
                marginTop: Spacing.sm,
              }}>
              <Text style={{ ...Type.hero, color: Palette.white, flex: 1 }}>
                {data.greeting}
              </Text>
              <Pressable
                onPress={() => setSettingsOpen(true)}
                hitSlop={12}
                accessibilityRole="button"
                accessibilityLabel="Your profile and settings"
                style={{ padding: Spacing.xs }}>
                <SymbolView
                  name="person.crop.circle"
                  size={30}
                  tintColor={Palette.white}
                  fallback={
                    <View
                      style={{
                        width: 30, height: 30, borderRadius: 15, borderWidth: 1.5,
                        borderColor: 'rgba(255,255,255,0.7)',
                      }}
                    />
                  }
                />
              </Pressable>
            </View>

            <View style={{ paddingTop: Spacing.xxl, paddingBottom: Spacing.xxl }}>
              {data.research ? <ResearchNote finding={data.research} /> : null}
            </View>
          </View>

          {/* ── THE TILE ─────────────────────────────────────────────────
              One container, not three cards. Everything the product is asking
              for lives here, which is what lets the blue above it stay quiet. */}
          <View
            style={{
              backgroundColor: Palette.cream, borderRadius: Radius.xl,
              marginHorizontal: Spacing.lg, paddingHorizontal: Spacing.lg,
              paddingVertical: Spacing.xs,
            }}>
            {data.primary ? (
              <TileRow
                icon="star.fill"
                title={data.primary.title}
                body={data.primary.body}
                disabled={!!data.primary.disabled}
                first
                onPress={() => open(data.primary)}
              />
            ) : null}

            {alsoWaiting ? (
              <TileRow
                icon="checklist"
                title={alsoWaiting.title}
                body={alsoWaiting.body}
                disabled={!!alsoWaiting.disabled}
                onPress={() => open(alsoWaiting)}
              />
            ) : null}

            {/* One row, two states, both decided by the server. See
                api/_lib/pick-up.js: a note to return to, or the newest In
                Practice post when there is none. */}
            {data.pickUp ? (
              <TileRow
                icon="square.and.pencil"
                title={data.pickUp.title}
                body={data.pickUp.preview}
                onPress={() => open(data.pickUp as unknown as HomeCard)}
              />
            ) : null}
          </View>

          {error ? (
            <Text style={{ ...Type.small, color: 'rgba(255,255,255,0.7)', marginTop: Spacing.lg, paddingHorizontal: Spacing.xl }}>
              Showing what we last loaded. Pull down to refresh.
            </Text>
          ) : null}
        </ScrollView>
      </SafeAreaView>

      {settingsOpen ? (
        <Settings
          onClose={() => setSettingsOpen(false)}
          onSignedOut={() => {
            forgetLastSection();
            setSettingsOpen(false); setLoading(true); load();
          }}
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
 * The one prompt.
 *
 * ── WHY THIS CARD IS COLOURED AND THE PAGE IS NOT ─────────────────────────
 * The screen used to run a three-hue gradient behind the top two thirds, which
 * was the app inventing a palette the site does not have. Replacing it with
 * cream made the page correct and made it colourless, which is a different
 * problem: nothing on it said what kind of product this is.
 *
 * So the colour is on the one card the screen is about, in the same shape the
 * results glance already uses for its lead card. That is the product's own
 * language rather than a new one, it puts the colour where the attention is
 * meant to go, and it leaves everything else on the cream ground the rest of
 * the app shares.
 *
 * The call to action stays orange on it. Orange on indigo is the contrast the
 * site uses, and it keeps the button the single loudest thing on the screen.
 */
function PrimaryCard({ card, onPress }: { card: HomeCard; onPress: () => void }) {
  const dim = !!card.disabled;
  return (
    <View
      style={{
        backgroundColor: Palette.indigo, borderRadius: Radius.xl,
        padding: Spacing.xl, opacity: dim ? 0.6 : 1,
      }}>
      <Text style={{ ...Type.eyebrow, color: 'rgba(255,255,255,0.7)' }}>Next for you</Text>
      {/* The heading size, not the card-title size. This is the one thing the
          screen is asking for, and it should be the largest thing on it after
          the greeting. */}
      <Text style={{ ...Type.hero, fontSize: 26, lineHeight: 32, color: Palette.white, marginTop: Spacing.sm }}>
        {card.title}
      </Text>
      {card.body ? (
        <Text style={{ ...Type.body, color: 'rgba(255,255,255,0.82)', marginTop: Spacing.md, lineHeight: 23 }}>{card.body}</Text>
      ) : null}
      {card.cta && !dim ? (
        <Pressable
      accessibilityRole="button"
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

/**
 * One research finding.
 *
 * ── NO HEADER, ON PURPOSE ─────────────────────────────────────────────────
 * The body and the citation, and nothing above them. It had an "FROM THE
 * RESEARCH" label and a headline before, which made it a section of a page.
 * Without them it is a thing to read on the way in, which is what the top half
 * of this screen is for. The finding still carries a title; the website's Our
 * Purpose page uses it, and this screen does not.
 *
 * The words and the citation come from the server, from api/_research.js, so
 * the app and the website cannot attribute different claims to one source.
 *
 * KNOWN GAP: there are three findings and they rotate by day, so this screen
 * repeats every third day. Ellie asked for a long list to rotate through, and
 * that is copy for her to write: a claim about research is exactly the kind of
 * sentence nobody here should be inventing. The shape each one needs is
 * { title, body, source } in api/_research.js, and check-research.mjs holds
 * each of them identical to the website's Our Purpose page.
 */
function ResearchNote({ finding }: { finding: NonNullable<HomeResponse['research']> }) {
  return (
    /* ── WHY INDENTED AND CENTRED ─────────────────────────────────────
       It ran the full measure, flush left, in the same serif as the
       greeting directly above it, so the two read as one paragraph and
       the finding looked like the second line of hello.

       Ellie's read was right: the problem was that they were too similar,
       not that this was too light. So the fix is weight and size before
       emphasis. The greeting stays bold; this drops to regular, steps down
       a size, pulls in from both sides and centres. Same colour, same
       family, different voice. */
    <View style={{ paddingHorizontal: Spacing.xl }}>
      {/* ── THE GLOW ─────────────────────────────────────────────────────
          Ellie asked for a circular glow behind the finding so it reads as
          the spotlit thing on the screen rather than as more text on the
          blue.

          Three concentric circles, not a radial gradient. React Native has
          no radial gradient, and the libraries that add one bring a native
          module for a decoration. Stacked circles at falling opacity give a
          soft edge that is indistinguishable at these values, and each is a
          plain View.

          Behind the text and not around it: absolutely positioned and not
          hit-testable, so it cannot change the layout when the finding is
          long or swallow a touch. */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          {[
            { size: 300, opacity: 0.05 },
            { size: 220, opacity: 0.06 },
            { size: 140, opacity: 0.07 },
          ].map((ring) => (
            <View
              key={ring.size}
              style={{
                position: 'absolute',
                width: ring.size, height: ring.size, borderRadius: ring.size / 2,
                backgroundColor: `rgba(255,255,255,${ring.opacity})`,
              }}
            />
          ))}
        </View>
      </View>

      <Text
        style={{
          ...Type.title, fontSize: 19, lineHeight: 29, fontWeight: '400',
          color: Palette.white, textAlign: 'center',
        }}>
        {finding.body}
      </Text>
      <Text
        style={{
          ...Type.small, color: 'rgba(255,255,255,0.55)', fontStyle: 'italic',
          marginTop: Spacing.lg, textAlign: 'center',
        }}>
        {finding.source}
      </Text>
    </View>
  );
}

/*
 * There is no colour lookup here any more: the rows carry icons.
 *
 * If one ever comes back, the trap it fell into first was AccentFor[card.id].
 * Home card ids are what the priority engine calls them, `finish-ex1`,
 * `use-budget`, `open-results`, and AccentFor is keyed by exercise and
 * catalogue key, so every row fell through to the same neutral brown. A colour
 * that is always the same is worse than no colour: it looks like it means
 * something.
 */

/**
 * One row of the tile.
 *
 * ── WHY AN ICON AND NO LABEL ──────────────────────────────────────────────
 * Each row carried a small uppercase label saying why it was there: next for
 * you, also waiting, pick up where you left off. Three labels above three
 * titles is six lines of text in a tile whose whole job is to be glanceable,
 * and the labels were the half nobody needed to read twice.
 *
 * A star, a checklist and a pencil say the same three things in the space of
 * a dot. The icon is the label now, so the label is gone. If a fourth row ever
 * needs a word to be legible, that row is the one that should not be here.
 *
 * SF Symbols rather than drawn glyphs: they are already how the tab bar is
 * built, they respect Dynamic Type, and they are the platform's own.
 */
function TileRow({
  icon, title, body, disabled, first, onPress,
}: {
  icon: string;
  title: string;
  body?: string | null;
  disabled?: boolean;
  first?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={{
        paddingVertical: Spacing.lg,
        borderTopWidth: first ? 0 : 1, borderTopColor: c.border,
        flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
        opacity: disabled ? 0.5 : 1,
      }}>
      <SymbolView
        name={icon as never}
        size={20}
        tintColor={c.textMuted}
        style={{ width: 22, height: 22 }}
      />
      <View style={{ flex: 1 }}>
        <Text style={{ ...Type.cardTitle, color: c.textStrong }}>{title}</Text>
        {body ? (
          <Text numberOfLines={1} style={{ ...Type.small, color: c.textMuted, marginTop: 2 }}>
            {body}
          </Text>
        ) : null}
      </View>
      {!disabled ? <Text style={{ ...Type.body, color: Palette.orange }}>{'\u203A'}</Text> : null}
    </Pressable>
  );
}
