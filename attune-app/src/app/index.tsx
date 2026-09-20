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

import ProfileSetup from '@/components/profile-setup';
import { useCallback, useEffect, useRef, useState } from 'react';

import { useScreenTime } from '@/hooks/use-screen-time';
import { useFocusEffect } from 'expo-router';
import { useTabReset } from '@/hooks/use-tab-reset';
import { Image, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { fetchHome, markNotificationRead, nudgePartner, SITE_URL } from '@/api/client';
import type { ApiError, HomeAlert, HomeCard, HomeResponse } from '@/api/client';
import { ScreenError, ScreenLoading, needsProfileSetup } from '@/components/screen-states';
import SignIn from '@/components/sign-in';
import Feedback from '@/components/feedback';
import Settings from '@/components/settings';
import { forgetLastSection, showResultsFromStart } from '@/components/results';
import { forgetLastSeen, keepLastSeen, lastSeen } from '@/api/last-seen';
import BrandHeader from '@/components/brand-header';
import GhostTile, { GhostInk, GhostInkQuiet, GhostRule } from '@/components/ghost-tile';
import { BRAND_NAME } from '@/components/brand-header';
import { showSection } from '@/components/results';
import { showJournal } from '@/app/notes';
import PageWash, { withAlpha } from '@/components/page-wash';
import { LOADING } from '@/constants/loading-copy';
import {
  BlueGround, BottomTabInset, Colors, Fonts, Lift, MaxContentWidth, Palette, Radius, Spacing, Type,
} from '@/constants/attune-theme';

const c = Colors.light;
const SITE = SITE_URL;

/**
 * The routes this app actually has, matching the tab triggers in app-tabs.tsx.
 *
 * These are the app's own facts rather than a rule the server owns, so keeping
 * them here is right. What matters is that a route the server sends which is
 * not in this set falls through to the website instead of navigating nowhere.
 */
const APP_ROUTES = new Set(['/', '/insights', '/resources', '/notes']);

export default function HomeScreen() {
  useScreenTime('home');
  const router = useRouter();
  // Where the tile starts. Just over half the screen, so the reading has the
  // top of the page and the tile sits in the lower half without being pinned
  // to the bottom, which would leave a band of blue under it on a tall phone.
  // A floor, not a fixed height. The blue block grows to fill whatever the tile
  // leaves, so the tile always sits just above the tab bar whether it has two
  // rows or three, and the reading gets the rest. A fixed height put the third
  // row underneath the tab bar on the day a third row first existed.
  const topHeight = useWindowDimensions().height * 0.38;
  /**
   * ── THE SCREEN BEFORE THE NETWORK ───────────────────────────────────────
   * Ellie: "When I open the testflight attune app, it takes a long time to
   * load my dashboard each time."
   *
   * It did, and the reason was measurable: warm, /api/home answers in a third
   * of a second; cold, it took between one and three and a half seconds, and a
   * function nobody has called for an hour is always cold. The app asked for it
   * on every launch and drew a spinner until it came back.
   *
   * So the last payload is read from the keychain on mount and drawn as soon
   * as it arrives, with the request running behind it. The read is a few
   * milliseconds against a cold start of seconds, so on any launch after the
   * first the dashboard is simply there. See api/last-seen.ts.
   */
  const [data, setData] = useState<HomeResponse | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const loadingRef = useRef(false);
  const load = useCallback(async () => {
    loadingRef.current = true;
    const res = await fetchHome();
    if (res.ok) { setData(res.data); setError(null); keepLastSeen('home', res.data); }
    else { setError(res.error); }
    setLoading(false);
    setRefreshing(false);
    loadingRef.current = false;
  }, []);

  useEffect(() => { load(); }, [load]);

  /**
   * The cache, drawn if it gets here before the network does.
   *
   * `setData((cur) => cur ?? seen)` rather than a plain set: if the request
   * won the race, the fresh answer is already on screen and must not be
   * replaced by an older one. Same for the spinner.
   */
  useEffect(() => {
    let cancelled = false;
    lastSeen<HomeResponse>('home').then((seen) => {
      if (cancelled || !seen) return;
      setData((cur) => cur ?? seen);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

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
    /**
     * A card that does something rather than going somewhere.
     *
     * "Send them a reminder" has been on this screen since the card engine was
     * written, pointing at '/?view=home', which is the screen it is already
     * on: it said it would send something and sent nothing. The server now
     * marks that card with an action, and this runs it.
     *
     * Still not a branch on kind. One action name, run by name, so another can
     * be added server-side without an app release.
     */
    if (card.action === 'nudge') { sendNudge(); return; }
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
        // Some cards land on a tab and open something on it. "Finish setting
        // up your profile" is home plus Settings, because the editor lives
        // there rather than on a route of its own.
        if (target.settings) { setSettingsOpen(true); return; }
        if (target.feedback) { setFeedbackOpen(true); return; }
        /**
         * "Your results are ready" opens the storycards, not the menu.
         *
         * Ellie asked for the cards to be the first thing this card shows, and
         * the landing page to be where they end. The Insights tab on its own
         * still opens the menu; the difference is which sentence brought you
         * here, which is why the server says so rather than the app guessing
         * from the route.
         */
        if (target.results) { showResultsFromStart(); }
        /**
         * An exercise card opens the exercise, not the tab it lives on.
         *
         * appTargetFor has been sending which exercise the card is for since
         * it was written, and nothing read it: "Continue Expectations" put
         * someone on the Insights tab and left them to find the row and tap
         * the count beside their own name. The server said where to go and the
         * app went halfway.
         */
        if (target.exercise) {
          router.push({ pathname: target.route, params: { exercise: target.exercise } } as never);
          return;
        }
        router.push(target.route as never);
        return;
      }
    }
    // No app target at all means an older payload. Opening the website is the
    // honest fallback: the thing exists, just not here.
    // A path-shaped deepLink is a page of its own; a query-shaped one is a view
    // inside the portal. The one builder turned '/feedback' into '/appfeedback'.
    if (card.deepLink) {
      Linking.openURL(card.deepLink.startsWith('/?')
        ? `${SITE}/app${card.deepLink.slice(1)}`
        : `${SITE}${card.deepLink}`);
    }
  };

  /**
   * Alerts, and what a tap does to one.
   *
   * ── WHY THEY LIVE ON THIS SCREEN ──────────────────────────────────────
   * The server has recorded alerts since the notifications table was added and
   * nothing in the app has ever read one. A bell and an inbox would be a
   * second place to look for things to do, beside a home screen whose whole
   * job is to say what is next. So they are rows in the same tile, above the
   * cards, and they route through the same open().
   *
   * Tapping marks it read and takes the row away at once. The request is not
   * waited on: a row that hangs about while a PATCH goes through reads as a
   * tap that missed. If it fails, the alert is still unread on the server and
   * comes back on the next load, which is the right way round.
   */
  const [readIds, setReadIds] = useState<string[]>([]);
  const alerts = (data?.alerts ?? []).filter(a => !readIds.includes(a.id));

  const openAlert = (a: HomeAlert) => {
    setReadIds(ids => [...ids, a.id]);
    markNotificationRead(a.id);
    open({ id: a.id, kind: a.kind, title: a.title, body: a.body || '', cta: '', deepLink: a.deepLink || '', app: a.app });
  };

  /**
   * Tell a partner you are waiting on them.
   *
   * On success the screen reloads, and the card the tap came from comes back
   * as "Waiting on them", greyed, on the server's own cooldown. That is the
   * confirmation: no toast, and no second copy of the cooldown rule here to
   * decide what to show.
   */
  const [nudgeFailed, setNudgeFailed] = useState(false);
  const sendNudge = async () => {
    setNudgeFailed(false);
    const res = await nudgePartner();
    if (!res.ok) { setNudgeFailed(true); return; }
    setLoading(true);
    load();
  };

  /**
   * Home has no sub-pages, so tapping its tab again does the other thing that
   * gesture means everywhere else: back to the top. Without it Home would be
   * the one tab in the bar where a repeat tap does nothing, which is the
   * inconsistency Ellie reported about Resources and Notes.
   */
  const scroller = useRef<ScrollView | null>(null);
  useTabReset(useCallback(() => {
    scroller.current?.scrollTo({ y: 0, animated: true });
  }, []));

  if (loading) return <Shell><ScreenLoading label={LOADING.home} /></Shell>;

  if (error?.kind === 'unauthorized') {
    return (
      <Shell>
        <SignIn onSignedIn={() => { setLoading(true); load(); }} rejectedReason={error.detail} />
      </Shell>
    );
  }
  /**
   * Signed in, no profile row. Every endpoint answers 404 for this, so home is
   * where it surfaces and home is where it gets answered.
   *
   * It used to render "Finish setting up on the website and this will fill
   * in", which is a dead end inside an app someone has just downloaded.
   */
  if (needsProfileSetup(error)) {
    return <Shell><ProfileSetup onDone={() => { setLoading(true); load(); }} /></Shell>;
  }
  if (error && !data) {
    return <Shell><ScreenError error={error} onRetry={() => { setLoading(true); load(); }} /></Shell>;
  }
  if (!data) return <Shell><ScreenLoading /></Shell>;

  /**
   * ── ALWAYS TWO ─────────────────────────────────────────────────────────
   * Ellie: "currently 2-3 items, but let's just do 2 always that populate
   * based on the prioritized list we have."
   *
   * The engine's own order, taken from the top: the primary, then whatever it
   * put next, then the pick-up row it always has one of. Cut to two here,
   * once, so "always two" is a slice rather than three conditionals that can
   * each independently be true or not.
   *
   * The icon comes with each one, because it is the label: the rows lost their
   * uppercase captions long ago and the glyph is what says why a card is
   * there. A pick-up row has two states and two icons, which the server
   * decides.
   */
  const prompts: PromptItem[] = [
    data.primary && {
      key: 'primary', icon: 'star.fill' as const,
      title: data.primary.title, body: data.primary.body,
      disabled: !!data.primary.disabled,
      onPress: () => open(data.primary as HomeCard),
    },
    (data.secondary ?? [])[0] && {
      key: 'secondary', icon: 'checklist' as const,
      title: (data.secondary ?? [])[0].title, body: (data.secondary ?? [])[0].body,
      disabled: !!(data.secondary ?? [])[0].disabled,
      onPress: () => open((data.secondary ?? [])[0]),
    },
    data.pickUp && {
      key: 'pickup',
      icon: data.pickUp.kind === 'discover' ? 'text.book.closed' : 'square.and.pencil',
      title: data.pickUp.title, body: data.pickUp.preview,
      disabled: false,
      onPress: () => open(data.pickUp as unknown as HomeCard),
    },
  ].filter(Boolean).slice(0, 2) as PromptItem[];

  /** Where a quick link goes. Four destinations that all already exist. */
  const goQuick = (q: QuickLinkItem) => {
    if (q.id === 'insight') { router.push('/resources'); return; }
    if (q.id === 'journal') { showJournal(); router.push('/notes'); return; }
    showSection(q.section as string);
    router.push('/insights');
  };

  return (
    /* ── CREAM, WITH THE BLUE COMING OFF THE TOP ──────────────────────
       Ellie: "should be cream with blue tinted hues, like the luxury page."

       That reference is a near-white page with a cool tint falling out of the
       top corners, not a coloured screen. So this stops painting the navy and
       takes the same ground the other three tabs have, with the brand indigo
       in both corners.

       Everything on it turns over with it. White type and a glass pane only
       work on a dark ground: on cream the pane is invisible and the type is
       gone. The tiles are white cards with the shared lift, and the ink is the
       ink every other cream page uses. */
    <View style={{ flex: 1, backgroundColor: c.background }}>
      {/* The ground. Two shades of one blue, from BlueGround, which the results
          glance paints its lead panel with. Monochrome on purpose: the three
          hue version of this screen was the app inventing a palette the site
          does not have. */}
      <PageWash tint={Palette.indigo} second={Palette.indigo} corners />

      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Ellie: "I want the lockup in the top to be at the exact same
            position across all screens." So it sits outside the scroll view
            here exactly as TabScreen puts it on the other three: same element,
            same padding, and it does not slide away when the page moves. */}
        {/* The lockup is the page's first line now, at headline size. This
            row draws the profile control alone: two lockups on one screen is
            the same thing said twice. */}
        <BrandHeader
          tone="ink"
          lockup={false}
          right={(
            <Pressable
              onPress={() => setSettingsOpen(true)}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Your profile and settings"
              style={{ padding: Spacing.xs }}>
              <SymbolView
                name="person.crop.circle"
                size={28}
                tintColor={c.textStrong}
                fallback={(
                  <View
                    style={{
                      width: 28, height: 28, borderRadius: 14, borderWidth: 1.5,
                      borderColor: c.border,
                    }}
                  />
                )}
              />
            </Pressable>
          )}
        />
        <ScrollView
          ref={scroller}
          contentContainerStyle={{
            flexGrow: 1,
            paddingBottom: BottomTabInset + Spacing.lg,
            maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center',
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
              tintColor={c.accentQuiet}
            />
          }>
          {/* ── ON THE BLUE ──────────────────────────────────────────────
              Given a minimum height rather than a fixed one, so the tile
              starts around half way down on a normal phone and is pushed
              further only by a long finding. A fixed height would either crop
              the reading or leave a hole above the tile on a small screen. */}
          {/* ── HOW THIS IS DISTRIBUTED ──────────────────────────────────
              The profile control sits on its own line at the top, where a nav
              control belongs. The greeting and the finding are one centred
              group below it.

              This was justifyContent: 'space-between' over two children, which
              pinned the greeting to the top of the blue and the finding to the
              bottom, as far apart as the block is tall. Ellie asked for the
              greeting lower and the finding higher, and neither could move:
              a marginTop on a top-pinned child and a paddingTop on a
              bottom-pinned one are both pushing against the thing holding
              them. Centring the pair is the change that actually moves them,
              and it moves them toward each other, which is what was asked. */}
          {/* ── PACKED FROM THE TOP ──────────────────────────────────────
              Ellie: "I want you to look at the referenced screenshots as
              templates... build the format to match the screenshots exactly."

              The reference stacks its five blocks one under the next with
              nothing between them. This had flexGrow and a minimum height, so
              the two cards were pushed to the bottom of the screen and a third
              of the page was empty blue. The blocks were right and the spacing
              was what made it read as a different screen. */}
          <View style={{ paddingHorizontal: Spacing.xl }}>
            {/* The wordmark is gone. It named the app to someone already
                inside it, on the one screen where the whole ground is the
                brand colour. Settings keeps the row: it is where account
                deletion lives, which App Review has to be able to find
                without being told where it is. */}
            {/* ── THE LOCKUP IS THE HEADLINE ─────────────────────────────
                Ellie: "Instead of luxury, have that be a large lockup with
                logo and attune relationships, then where they have the random
                text line... let's add our 'welcome back' line in the same size
                as on this reference image."

                So the screen opens the way the reference she sent opens: the
                product's own name at headline size with the mark beside it,
                and one quiet line under it. The row above draws the profile
                control alone, because two lockups on one screen is the same
                thing said twice. */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginTop: Spacing.lg }}>
              {/* The cream variant, because the page is cream now. The
                  inverse one Ellie asked for on home was for the navy; the
                  rule underneath it is the same one it always was, which is
                  that the mark takes the ground it is on. */}
              <Image
                source={require('@/assets/images/attune-mark-light.png')}
                style={{ width: 58, height: 58 * (76 / 103) }}
                resizeMode="contain"
              />
              <Text style={{ ...Type.display, color: c.textStrong, flex: 1 }}>
                {BRAND_NAME}
              </Text>
            </View>

            {/* The greeting, at the size of the small line under the
                reference's headline. It was the headline itself; the lockup
                is the headline now, and a second thing that size beside it
                was the exact clash Ellie reported the last time these two
                were close in weight. */}
            {/* The small row under the headline. In the reference it is a
                word with a thin rule under it, which is what separates it from
                the headline above without another size change. */}
            <View style={{ marginTop: Spacing.lg, marginBottom: Spacing.xl, alignSelf: 'flex-start' }}>
              <Text style={{ ...Type.body, color: c.textMuted }}>
                {data.greeting}
              </Text>
              <View
                style={{ height: 1, marginTop: Spacing.sm, backgroundColor: c.border }}
              />
            </View>

            {/* ── ONE TILE BEHIND BOTH BLOCKS ───────────────────────────
                Ellie: "Home should have that additional tile behind the ones
                I'm seeing now."

                In the reference the four squares and the two cards sit inside
                one panel rather than loose on the page, which is what gives
                that screen its edges. So this is that panel: the page's own
                near-white, a generous radius, and the shared lift, with both
                blocks inside it. */}
            <View
              style={{
                backgroundColor: Palette.white,
                borderRadius: Radius.card + 6,
                padding: Spacing.lg,
                ...Lift,
              }}>
            {/* ── FOUR WAYS IN ───────────────────────────────────────────
                Ellie: "Instead of the 4 rounded squares above the two main
                ones, let's add quick links to insight of the day, action plan
                (what comes next page), insights highlights, and relationship
                journal."

                Four rounded squares in a row, as the reference has them, each
                landing somewhere that already exists. */}
            <View style={{ flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.xl }}>
              {QUICK_LINKS.map((q) => (
                <QuickLink key={q.id} item={q} onGo={() => goQuick(q)} />
              ))}
            </View>

            {/* ── WHAT HAPPENED, BEFORE WHAT IS NEXT ──────────────────────
                Unread alerts, newest first, at most five and usually none.
                They are the one thing on this screen the reader could not have
                known: a partner finishing, a note shared, an account deleted.
                Inside the tile with everything else, above the two cards, so
                the cards can be only the two prompts Ellie asked them to be. */}
            {alerts.length ? (
              <View style={{ marginBottom: Spacing.lg }}>
                {alerts.map((a, i) => (
                  <TileRow
                    key={a.id}
                    icon="bell.badge.fill"
                    title={a.title}
                    body={a.body}
                    first={i === 0}
                    onPress={() => openAlert(a)}
                  />
                ))}
              </View>
            ) : null}

            {/* ── THE TWO PROMPTS ────────────────────────────────────────
                Ellie: "the two boxes with images for each of the two things
                you're prompted with... let's just do 2 always that populate
                based on the prioritized list we have, we can use the icons
                from the current bars as the image in the shape's rounded
                square."

                Two, always: the priority engine's own order, taken from the
                top. `prompts` is where that list is cut, so "always two" is a
                slice rather than three conditionals that can each be true. */}
            <View style={{ flexDirection: 'row', gap: Spacing.md }}>
              {prompts.map((p) => (
                <PromptCard key={p.key} item={p} onPress={p.onPress} />
              ))}
            </View>
            </View>
          </View>

          {/* The reminder did not go. Said here rather than on the row,
              because the row is back at the top of the tile by the time this
              renders and a message inside it would be attached to a card that
              now says something else. */}
          {nudgeFailed ? (
            <Text style={{ ...Type.small, color: c.textMuted, marginTop: Spacing.lg, paddingHorizontal: Spacing.xl }}>
              That reminder did not send. Pull down and try again.
            </Text>
          ) : null}

          {error ? (
            <Text style={{ ...Type.small, color: c.textMuted, marginTop: Spacing.lg, paddingHorizontal: Spacing.xl }}>
              Showing what we last loaded. Pull down to refresh.
            </Text>
          ) : null}
        </ScrollView>
      </SafeAreaView>

      {feedbackOpen ? (
        <Feedback onDone={() => setFeedbackOpen(false)} />
      ) : null}

      {settingsOpen ? (
        <Settings
          onClose={() => setSettingsOpen(false)}
          onSignedOut={() => {
            forgetLastSection();
            /* The next person to open this phone is not necessarily this one. */
            forgetLastSeen();
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
/**
 * The glow behind the research finding.
 *
 * GLOW_ALPHA is per ring and deliberately tiny: the whole point is that no
 * single ring has a findable edge. Cumulative opacity at the centre is
 * 1 - (1 - GLOW_ALPHA) ** GLOW_RINGS, which at these values is about 0.21.
 */
const GLOW_RINGS = 30;
const GLOW_DIAMETER = 330;
/**
 * Ellie: "Can we make the glow a little more visible? Currently it's slightly
 * too subtle."
 *
 * Raised per ring rather than by adding rings, because ring count controls
 * smoothness and alpha controls brightness, and the thing she is asking for is
 * brightness. Cumulative opacity at the centre is
 * 1 - (1 - GLOW_ALPHA) ** GLOW_RINGS, so this moves it from about 0.21 to
 * about 0.33. Still well under a half, which is where the couple map's dots
 * sit, and no single ring is near the threshold where its own edge is
 * findable, which is what made the first two attempts read as circles.
 */
const GLOW_ALPHA = 0.0133;

/**
 * Whether the white glow is painted at all.
 *
 * Ellie, of the mark behind the finding: "Can we try this without the original
 * circle glow? Just the mark glow?" The rings are what the screen had before
 * the mark existed, so this is the switch that turns them off without deleting
 * the thing that took three attempts to get right. Both switches are here
 * together: WHITE_GLOW true and MARK_BEHIND_INSIGHT false is exactly the
 * screen she had two days ago.
 */
const WHITE_GLOW = true;

/**
 * ── WHERE THE MARK ENDED UP ───────────────────────────────────────────────
 * Ellie, having seen both: "revert to the glow behind the insight of the day,
 * and add the logo below the 'good afternoon' line and above the insight. Not
 * the glow-y logo, just the regular mark."
 *
 * So the white glow is back on, the stack behind the finding is off, and the
 * mark is a plain image under the greeting. Every version is still one switch
 * away, which is the point of having them as switches.
 */

/**
 * The mark behind the finding.
 *
 * Ellie: "I like the idea of a mark-only attune logo behind the insight of the
 * day. Maybe 'glow-y' in a way that feels unfocused and not too distracting. I
 * want the text over it to be easy to read, but I want the landing page to
 * feel branded. Build this, but be able to revert quickly to what we have."
 *
 * So it is one switch. MARK_BEHIND_INSIGHT = false is exactly the screen she
 * has now, with nothing else to undo.
 *
 * It sits under the glow rather than over it: the rings brighten toward the
 * centre, which washes the middle of the mark out and leaves its edges soft.
 * That is the unfocused part, and it costs no blur, which this app cannot do
 * without a dependency. The asset is the same PNG the rest of the app uses, at
 * a size where its own resolution helps rather than hurts.
 */
const MARK_BEHIND_INSIGHT = false;
const MARK_WIDTH = 300;
/**
 * Out of focus, without a blur.
 *
 * One copy of the mark has the edges the artwork has, and she asked for
 * something unfocused. A few copies at slightly different sizes, each too
 * faint to find on its own, leave no single edge anywhere: the same argument
 * as the glow rings above, applied to a picture instead of a circle. The
 * opacities sum to about a tenth, which is where the text over it stays the
 * easiest thing on the screen to read.
 */
const MARK_LAYERS = 5;
// Ellie, of the first attempt: "I can't see this at all if it's there." It was
// a tenth of full strength across five copies, which on a mid-blue ground is
// nothing. Three times that, and the mark is visible as a shape behind the
// finding while the text over it is still the sharpest thing on the screen.
const MARK_LAYER_OPACITY = 0.07;
const MARK_LAYER_STEP = 0.045;

/**
 * Ellie: "Let's call it insight of the day for now, we can adjust later if we
 * decide to." Her words, so they live in one place rather than inline.
 */
const INSIGHT_TITLE = 'Insight of the day';

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
          A circular light behind the finding, brightest in the middle and
          falling off to nothing: the same thing the website paints behind each
          dot on the couple map, which is an SVG radialGradient from the dot's
          colour at 0.5 opacity out to the same colour at 0.

          React Native has no radial gradient, and this app has no SVG library.
          Two attempts failed before this one and both failed the same way:
          three big circles at falling opacity, then two circles casting wide
          shadows. Ellie, twice: "still looks like concentric circles."

          She was right both times. A translucent circle has a hard edge
          wherever its fill starts, and a shadow does not hide that edge, it
          sits outside it. Three or four of anything with an edge reads as
          rings, because it is rings.

          What removes the banding is step size, not cleverness. Many rings,
          each so faint that its own edge is below the threshold where an eye
          can find it, stacked so the alpha accumulates toward the middle. With
          linear radii and a constant per-ring alpha the cumulative opacity
          falls off linearly from the centre, which is a radial gradient.

          RINGS steps across RADIUS points is about four points per edge at
          just under one per cent each. Raising RINGS makes it smoother and
          costs nothing but plain Views that never re-render. */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          {MARK_BEHIND_INSIGHT ? Array.from({ length: MARK_LAYERS }, (_, i) => {
            const width = MARK_WIDTH * (1 + i * MARK_LAYER_STEP);
            return (
              <Image
                key={i}
                source={require('@/assets/images/attune-mark.png')}
                style={{
                  position: 'absolute',
                  width, height: width * (64 / 88),
                  opacity: MARK_LAYER_OPACITY,
                }}
                resizeMode="contain"
              />
            );
          }) : null}
          {(WHITE_GLOW ? Array.from({ length: GLOW_RINGS }, (_, i) => {
            // Largest first, so each smaller ring paints on top and the alpha
            // builds toward the centre.
            const size = GLOW_DIAMETER * (1 - i / GLOW_RINGS);
            return (
              <View
                key={i}
                style={{
                  position: 'absolute',
                  width: size, height: size, borderRadius: size / 2,
                  backgroundColor: `rgba(255,255,255,${GLOW_ALPHA})`,
                }}
              />
            );
          }) : null)}
        </View>
      </View>

      {/* ── THE SECTION HAS A NAME NOW ─────────────────────────────────
          Ellie: "Please title the insight of the day section. Maybe title is
          above and left-aligned, and citation is below and right-aligned."

          So the block reads top-left to bottom-right: what this is, the
          finding, who said it. The words are hers, from her own message. */}
      <Text
        style={{
          ...Type.eyebrow, color: 'rgba(255,255,255,0.55)',
          textAlign: 'left', marginBottom: Spacing.md,
        }}>
        {INSIGHT_TITLE}
      </Text>
      <Text
        style={{
          ...Type.title, fontSize: 19, lineHeight: 29, fontWeight: '400',
          color: Palette.white, textAlign: 'center',
        }}>
        {finding.body}
      </Text>
      <Text
        style={{
          ...Type.small, color: 'rgba(255,255,255,0.55)', fontFamily: Fonts.bodyItalic,
          marginTop: Spacing.lg, textAlign: 'right',
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
/**
 * The home tile's icon, and the glow behind it.
 *
 * Same shape as the cover pages': a field, a ring count, and the peak the
 * stack comes to, with the per-ring alpha solved from the peak so the count
 * can change without changing how bright it is. The field is wider than the
 * glyph so it fades out well before it stops.
 */
const ICON_ORANGE = '#FF8F5E';
/** The pale square behind a quick link's icon and behind a prompt's picture.
 *  One constant, because the reference uses one tone for both and two numbers
 *  a hundred lines apart is how they stop being the same tone. */
const TILE_FILL = '#F1EEE9';
const ICON_GLOW_SIZE = 44;
const ICON_GLOW_RINGS = 24;
const ICON_GLOW_PEAK = 0.30;
const ICON_GLOW_ALPHA = 1 - (1 - ICON_GLOW_PEAK) ** (1 / ICON_GLOW_RINGS);

/**
 * ── THE FOUR QUICK LINKS ──────────────────────────────────────────────────
 * Ellie named all four and where each goes: "quick links to insight of the
 * day, action plan (what comes next page), insights highlights, and
 * relationship journal."
 *
 * The labels are hers. They are longer than the one-word labels the reference
 * uses, so the tile gives them two lines rather than cutting them: a truncated
 * label on a control is worse than a taller row.
 */
export type QuickLinkItem = {
  id: 'insight' | 'plan' | 'highlights' | 'journal';
  label: string;
  icon: string;
  /** For the two that land in the results, which page. */
  section?: string;
};

const QUICK_LINKS: QuickLinkItem[] = [
  { id: 'insight', label: 'Insight of the day', icon: 'lightbulb' },
  { id: 'plan', label: 'Action plan', icon: 'flag', section: 'what-comes-next' },
  { id: 'highlights', label: 'Highlights', icon: 'sparkles', section: 'highlights' },
  { id: 'journal', label: 'Journal', icon: 'book.closed' },
];

function QuickLink({ item, onGo }: { item: QuickLinkItem; onGo: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={item.label}
      onPress={onGo}
      style={{ flex: 1, alignItems: 'center', gap: Spacing.sm }}>
      {/* A pale square with a thin icon in it, which is what the reference
          has: four of them in a row, the tile light against the panel rather
          than a different colour from it. */}
      <View
        style={{
          width: '100%', aspectRatio: 1, borderRadius: Radius.xl,
          backgroundColor: TILE_FILL,
          alignItems: 'center', justifyContent: 'center',
        }}>
        <SymbolView
          name={item.icon as never}
          size={22}
          tintColor={c.accent}
          fallback={<View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c.accent }} />}
          style={{ width: 24, height: 24 }}
        />
      </View>
      <Text
        numberOfLines={2}
        style={{
          ...Type.small, fontSize: 11, lineHeight: 15,
          color: c.textMuted, textAlign: 'center',
        }}>
        {item.label}
      </Text>
    </Pressable>
  );
}

/** One of the two things the priority engine is asking for. */
export type PromptItem = {
  key: string;
  icon: string;
  title: string;
  body?: string | null;
  disabled: boolean;
  onPress: () => void;
};

/**
 * ── A CARD, NOT A ROW ─────────────────────────────────────────────────────
 * Ellie: "the two boxes with images for each of the two things you're prompted
 * with... we can use the icons from the current bars as the image in the
 * shape's rounded square."
 *
 * So the icon that used to sit at the start of a row is the card's picture: a
 * rounded square filling the top of the card, with the title under it. Same
 * glass material the tile had, because she asked for that by name.
 */
function PromptCard({ item, onPress }: { item: PromptItem; onPress: () => void }) {
  const dim = item.disabled;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: dim }}
      disabled={dim}
      onPress={onPress}
      style={{ flex: 1 }}>
      <View style={{ opacity: dim ? 0.55 : 1 }}>
        {/* The picture. A tint of the accent behind the glyph rather than a
            photograph: this product has no artwork, and a grey rectangle
            waiting for one reads as an image that failed to load. */}
        <View
          style={{
            width: '100%', aspectRatio: 1.15, borderRadius: Radius.xl,
            backgroundColor: TILE_FILL,
            alignItems: 'center', justifyContent: 'center',
            marginBottom: Spacing.md,
          }}>
          <SymbolView
            name={item.icon as never}
            size={34}
            tintColor={dim ? c.textMuted : c.accent}
            fallback={<View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: c.accent }} />}
            style={{ width: 36, height: 36 }}
          />
        </View>
        {/* Title, a hairline, then one small line. That is the reference's
            own card: the rule is what makes the second line read as a note
            about the first rather than as more of the same sentence. */}
        <Text numberOfLines={2} style={{ ...Type.cardTitle, color: c.textStrong }}>
          {item.title}
        </Text>
        {item.body ? (
          <>
            <View style={{ height: 1, backgroundColor: c.border, marginVertical: Spacing.md }} />
            <Text numberOfLines={2} style={{ ...Type.small, color: c.textMuted, lineHeight: 19 }}>
              {item.body}
            </Text>
          </>
        ) : null}
      </View>
    </Pressable>
  );
}

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
      {/* ── THE ICON, BARE AND ORANGE ─────────────────────────────────
          Ellie: "Icons on home page should not be in circles", and "Icons on
          home page should be orange not white."

          The disc was added when this tile became glass, to stop a row of
          glyphs reading as bullet points. It reads as dots instead, which she
          has now said about this tile and about the Insights menu, so the
          answer is the same in both places: the icon carries the colour and
          nothing sits behind it. Orange on the glass is the brand's accent
          doing the work the disc was doing. */}
      {/* ── AND A GLOW BEHIND IT ──────────────────────────────────────
          Ellie: "can we add a little glow behind the icons to make them pop
          even more?"

          The cover pages' trick, at this scale: rings of the same orange, each
          too faint for its own edge to be findable, stacked so the alpha
          builds toward the middle. A single translucent circle would be a
          disc, which is the thing she asked to get rid of on this tile twice.

          The alpha is solved from the peak, so the ring count can change
          without the glow getting brighter. A disabled row has no glow: it is
          not there to pop. */}
      {/* ── NO GLOW ON CREAM ──────────────────────────────────────────
          The glow was for a bright icon inside a glass tile on the navy, where
          it made the icon pop. On a near-white page it is a smudge: light
          against light. The icon carries itself here. The constants stay, with
          this note, because the ground is the reason and grounds change. */}
      <View style={{ width: 23, height: 23, alignItems: 'center', justifyContent: 'center' }}>
        <SymbolView
          name={icon as never}
          size={21}
          /* Ellie: "The orange is hard to see, can we make it brighter?" The
             brand orange is made to sit on cream; inside a ghost tile on the
             navy it loses most of its contrast. This is that orange lifted for
             the dark ground, the same move the partner's blue made on the
             results tiles. */
          tintColor={disabled ? c.textMuted : c.accent}
          style={{ width: 23, height: 23 }}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ ...Type.cardTitle, color: c.textStrong }}>{title}</Text>
        {body ? (
          <Text numberOfLines={1} style={{ ...Type.small, color: c.textMuted, marginTop: 2 }}>
            {body}
          </Text>
        ) : null}
      </View>
      {!disabled ? <Text style={{ ...Type.body, color: c.textMuted }}>{'\u203A'}</Text> : null}
    </Pressable>
  );
}
