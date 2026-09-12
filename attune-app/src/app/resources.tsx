/**
 * Resources.
 *
 * Three bands, in order of what the person can act on right now:
 *   Yours          the add-ons they own, wrapping to as many rows as needed
 *   Explore more   everything else, scrolling sideways with faded edges
 *   In Practice    the reading, newest first
 *
 * Owned things are full-colour and tappable. Unowned things are visible and
 * priced but never sold here: buying happens on the web, and an app that
 * builds a cart and hands it to an external payment page is the pattern Apple
 * rejects for. Tapping one opens the site in the browser.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  Linking, Pressable, RefreshControl, ScrollView, Text, View,
} from 'react-native';
import { SymbolView } from 'expo-symbols';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fetchHome, fetchPosts, markPostRead } from '@/api/client';
import type { ApiError, CatalogueItem, HomeResponse, PostSummary } from '@/api/client';
import Budget from '@/components/budget';
import Checklist from '@/components/checklist';
import { fetchToolData, type ToolData } from '@/api/client';
import { ScreenError, ScreenLoading } from '@/components/screen-states';
import EdgeFadedRow from '@/components/edge-faded-row';
import SignIn from '@/components/sign-in';
import {
  AccentFallback, AccentFor, Colors, MaxContentWidth, Palette, Radius, Spacing, Type,
} from '@/constants/attune-theme';

const c = Colors.light;
const SITE = 'https://www.attune-relationships.com';

/**
 * The shelf shown before any filtering. Not a category: it is the absence of
 * one, which is why it is not in the server's list.
 */
const ALL = 'All';

export default function ResourcesScreen() {
  const [home, setHome] = useState<HomeResponse | null>(null);
  const [posts, setPosts] = useState<PostSummary[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [category, setCategory] = useState<string>(ALL);
  const [error, setError] = useState<ApiError | null>(null);

  /**
   * Which tool is open in the app, if any.
   *
   * Only the ones the app has. Everything else still hands off to the website,
   * and the list is here rather than inside the handler so adding the budget
   * is one line in one place.
   */
  const [openTool_, setOpenTool] = useState<string | null>(null);
  const [tools, setTools] = useState<ToolData | null>(null);
  const [workbookNote, setWorkbookNote] = useState<string | null>(null);

  // The workbook is a file, so the tab needs to know whether it exists before
  // a tap. Fetched alongside everything else rather than on press: a tap that
  // waits on a request reads as a tap that did nothing.
  useEffect(() => { fetchToolData().then((r) => { if (r.ok) setTools(r.data); }); }, []);

  const IN_APP = ['checklist', 'budget'];

  /**
   * What a tile does.
   *
   * The two tools the app has open in the app. The workbook is a generated
   * .docx and is handed to the system, which is what a phone does with a
   * document; `/app?view=workbook` on the website is the page that sells it,
   * and CLAUDE.md is explicit that the app does not sell. Anything else still
   * hands off to the website.
   */
  const openTool = (key: string) => {
    if (IN_APP.includes(key)) { setOpenTool(key); return; }
    if (key === 'workbook') {
      const wb = tools?.workbook;
      if (wb?.url) { Linking.openURL(wb.url); return; }
      setWorkbookNote(wb?.copy.generating || null);
      return;
    }
    Linking.openURL(`${SITE}/app?view=${key}`);
  };
  // Tracked separately from the catalogue: In Practice failing is not the same
  // as In Practice being empty, and the screen said the same thing for both.
  const [postsFailed, setPostsFailed] = useState(false);

  const loadingRef = useRef(false);
  const load = useCallback(async () => {
    loadingRef.current = true;
    const [h, p] = await Promise.all([fetchHome(), fetchPosts()]);
    if (h.ok) { setHome(h.data); setError(null); }
    else setError(h.error);
    if (p.ok) { setPosts(p.data.posts); setCategories(p.data.categories ?? []); setPostsFailed(false); }
    else setPostsFailed(true);
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


  if (loading) return <Shell><ScreenLoading label="Loading your resources" /></Shell>;

  // This screen had no failure handling at all. Signed out, it rendered an
  // empty page with a lone "Nothing published yet", which reads as a product
  // with nothing in it rather than a session that has ended. Every other tab
  // already handled this.
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

  // The server tells us what is owned. If the field is absent, everything shows
  // as explorable rather than the screen guessing and getting it wrong.
  const ownedKeys = new Set<string>(home?.owned ?? []);
  // The catalogue comes from the server too. The app used to carry its own copy
  // with prices typed out, so a repriced or newly added add-on changed the site
  // and left the app selling the old one.
  // ── EXERCISES ARE NOT RESOURCES ─────────────────────────────────────────
  // Conflict Patterns and Relationship Reflection are exercises. They live on
  // Insights, where you answer them. They were appearing here as well, under
  // "Included with your package", which made this page a second and worse
  // version of the exercise list.
  //
  // The split is the server's: each catalogue entry says whether it is an
  // exercise or a tool. Filtering on a list of keys here would be a second
  // copy of that decision, and the two would drift the first time something
  // new was added.
  const catalogue = (home?.catalogue ?? []).filter((r) => r.kind !== 'exercise');
  const owned = catalogue.filter((r) => ownedKeys.has(r.key));
  // Only what they do not have. When they have everything this is empty and
  // the whole section is skipped, so In Practice follows the owned tiles.
  const more = catalogue.filter((r) => !ownedKeys.has(r.key));

  // Posts carry `category` when the author set one. Anything uncategorised
  // still shows under All, so a missing field never hides a piece.
  const visible = category === ALL
    ? posts
    : posts.filter((p) => p.category === category);

  // All, then whatever shelves the server says exist.
  const shelves = [ALL, ...categories];

  if (openTool_ === 'checklist') {
    return <Checklist onClose={() => setOpenTool(null)} />;
  }
  if (openTool_ === 'budget') {
    return (
      <Budget onClose={() => setOpenTool(null)} />
    );
  }

  return (
    <Shell>
      <ScrollView
        contentContainerStyle={{ paddingBottom: Spacing.xxxl }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={c.accentQuiet} />
        }>
        <View style={{ paddingHorizontal: Spacing.xl, paddingTop: Spacing.lg, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}>
          <Text style={{ ...Type.hero, color: c.textStrong, marginBottom: Spacing.xl }}>Resources</Text>

          {owned.length ? (
            <>
              <Text style={{ ...Type.eyebrow, color: c.textMuted, marginBottom: Spacing.md }}>
                Yours to explore
              </Text>
              {/* A row of circles, wrapping only if someone owns more than four. */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.lg }}>
                {owned.map((r) => <OwnedTile key={r.key} item={r} onOpen={openTool} />)}
              </View>
              {/* The workbook is the one tile that can be tapped and have
                  nothing to give yet. Saying so here, under the tiles, rather
                  than in an alert: it is information, not an interruption. */}
              {workbookNote ? (
                <Text style={{ ...Type.small, color: c.textMuted, marginTop: Spacing.md }}>
                  {workbookNote}
                </Text>
              ) : null}
              <View style={{ height: Spacing.xxl }} />
            </>
          ) : null}
        </View>

        {more.length ? (
          <>
            <View
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                paddingHorizontal: Spacing.xl, marginBottom: Spacing.md,
              }}>
              <Text style={{ ...Type.eyebrow, color: c.textMuted }}>Explore more resources</Text>
              {/* Says it outright. The fade alone is a hint people miss, and a
                  row nobody realises is scrollable is a row half seen. */}
              <Text style={{ ...Type.small, color: c.textMuted }}>Swipe {'\u203A'}</Text>
            </View>
            <EdgeFadedRow>
              {more.map((r) => <ExploreTile key={r.key} item={r} />)}
            </EdgeFadedRow>
          </>
        ) : null}

        <View style={{ marginTop: Spacing.xxl }}>
          <View style={{ paddingHorizontal: Spacing.xl, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}>
            <Text style={{ ...Type.eyebrow, color: c.textMuted, marginBottom: Spacing.md }}>In Practice</Text>
          </View>

          {posts.length ? (
            <>
              {/* Same four categories as practice.html, so someone who reads on
                  the web finds the same shelves here. 'All' first and selected,
                  because most people are browsing rather than searching. */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: Spacing.xl, gap: Spacing.sm, paddingBottom: Spacing.md }}>
                {shelves.map((cat) => {
                  const on = cat === category;
                  return (
                    <Pressable
      accessibilityRole="button"
                      key={cat}
                      onPress={() => setCategory(cat)}
                      style={{
                        paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg,
                        borderRadius: Radius.pill,
                        backgroundColor: on ? c.textStrong : c.surface,
                        borderColor: on ? c.textStrong : c.border, borderWidth: 1,
                      }}>
                      <Text style={{ ...Type.small, fontWeight: '700', color: on ? Palette.white : c.textMuted }}>
                        {cat}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>

              <View style={{ paddingHorizontal: Spacing.xl, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}>
                {visible.length ? (
                  <View style={{ backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderRadius: Radius.lg, overflow: 'hidden' }}>
                    {visible.map((p, i) => <PostRow key={p.id} post={p} first={i === 0} onRead={load} />)}
                  </View>
                ) : (
                  <Text style={{ ...Type.body, color: c.textMuted }}>
                    Nothing in {category.toLowerCase()} yet.
                  </Text>
                )}
              </View>
            </>
          ) : (
            <View style={{ paddingHorizontal: Spacing.xl }}>
              <Text style={{ ...Type.body, color: c.textMuted }}>
                {postsFailed
                  ? 'In Practice could not load. Pull down to try again.'
                  : 'Nothing published yet. New pieces will appear here.'}
              </Text>
            </View>
          )}
        </View>
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

type Item = CatalogueItem;

/** Owned: full colour, a coloured spine, and it opens. */
/**
 * Icons for the things a couple can own.
 *
 * ── WHY THIS MAP IS ALLOWED TO LIVE IN THE APP ────────────────────────────
 * The catalogue itself comes from the server, and check-app-derives fails the
 * build if the app grows a second copy of it. This is not a copy of that list:
 * it is a lookup keyed by it, an SF Symbol name per key, and a key with no
 * entry falls back rather than disappearing. SF Symbols do not exist on the
 * web, so there is no shared place for these to live.
 */
const ICON: Record<string, string> = {
  budget: 'tablecells',            // a spreadsheet
  workbook: 'text.book.closed',    // a bound notebook
  checklist: 'checklist',          // a list of things to do
  reflection: 'arrow.triangle.2.circlepath',
  conflict: 'bubble.left.and.bubble.right',
  intimacy: 'heart',
};

/**
 * One thing you own: a circle, an icon, a word.
 *
 * ── WHY A CIRCLE AND ONE WORD ─────────────────────────────────────────────
 * These were tinted rectangles carrying a letter in a rounded square, a title
 * and two lines of blurb, two across. Four of them filled a screen before the
 * shelf below had started. What a reader needs from this row is which of their
 * things is which, and a circle with an icon and its name answers that in a
 * fifth of the height.
 *
 * The blurb is gone rather than shortened. A sentence explaining a thing you
 * already own is the least useful sentence on the page.
 */
function OwnedTile({ item, onOpen }: { item: Item; onOpen: (key: string) => void }) {
  const color = AccentFor[item.key] ?? AccentFallback;
  /**
   * It opens the thing, in the app where the app has it.
   *
   * This was a Pressable with no handler, then a link to the website. Ellie:
   * "I want all of these to open in app if the user is in the app", and:
   * "I clicked the 'start shared budgeting' and it took me to the website but
   * a blank page."
   *
   * What is built in the app opens in the app. What is not still hands off to
   * `/app?view=<key>`, the same link the priority engine uses, which now shows
   * a sign-in form rather than an empty page when the browser has no session.
   */
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onOpen(item.key)}
      style={{ alignItems: 'center', width: 84 }}>
      <View
        style={{
          width: 64, height: 64, borderRadius: 32,
          backgroundColor: color + '1A',
          borderColor: color + '33', borderWidth: 1,
          alignItems: 'center', justifyContent: 'center',
        }}>
        <SymbolView
          name={(ICON[item.key] || 'square.grid.2x2') as never}
          size={26}
          tintColor={color}
          style={{ width: 28, height: 28 }}
        />
      </View>
      {/* One word. The catalogue's own short name, from the server. */}
      <Text numberOfLines={1} style={{ ...Type.small, fontWeight: '700', color: c.textStrong, marginTop: Spacing.sm }}>
        {item.short || item.label}
      </Text>
    </Pressable>
  );
}

function ExploreTile({ item }: { item: Item }) {
  const color = AccentFor[item.key] ?? AccentFallback;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => Linking.openURL(`${SITE}/offerings`)}
      style={{
        width: 190, backgroundColor: c.surface,
        borderColor: c.border, borderWidth: 1, borderRadius: Radius.lg,
        padding: Spacing.lg,
      }}>
      {/* No coloured rule above the title. It was a stripe standing in for a
          design decision, and it put a bar over every tile in a row that is
          already a row of bordered boxes. */}
      <Text style={{ ...Type.cardTitle, color: c.textStrong }}>{item.label}</Text>
      <Text numberOfLines={2} style={{ ...Type.small, color: c.textMuted, marginTop: Spacing.xs, minHeight: 34 }}>
        {item.blurb}
      </Text>
      <Text style={{ ...Type.small, color: Palette.orange, fontWeight: '700', marginTop: Spacing.md }}>
        {`$${item.price}`}
      </Text>
    </Pressable>
  );
}

/**
 * One piece in In Practice.
 *
 * It was a Pressable with no onPress: it gave press feedback and did nothing,
 * which is worse than a plain row because it promises something.
 *
 * The reader itself is not built in the app yet, so this opens the piece on the
 * website. Marking it read is the app's job either way, or the badge and the
 * "new in In Practice" card keep raising something the person has read.
 */
function PostRow({ post, first, onRead }: { post: PostSummary; first: boolean; onRead: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={async () => {
        // Opened first. Marking read is bookkeeping and should never stand
        // between someone and the thing they tapped.
        Linking.openURL(post.external || `${SITE}/practice/${post.id}`);
        // An In Practice page is not a row in the posts table, so there is
        // nothing to record a read against and the write would fail on a
        // foreign key. See api/_in-practice.js.
        if (post.external) return;
        const res = await markPostRead(post.id);
        if (res.ok) onRead();
      }}
      style={{
        paddingVertical: Spacing.lg, paddingHorizontal: Spacing.lg,
        borderTopWidth: first ? 0 : 1, borderTopColor: c.border,
      }}>
      <Text style={{ ...Type.cardTitle, color: c.textStrong }}>{post.title}</Text>
      {post.subtitle ? (
        <Text numberOfLines={2} style={{ ...Type.small, color: c.textMuted, marginTop: 2 }}>
          {post.subtitle}
        </Text>
      ) : null}
      <Text style={{ ...Type.small, color: c.textMuted, marginTop: Spacing.sm }}>
        {post.read_minutes ? `${post.read_minutes} min` : ''}
        {post.revised ? '  ·  Updated' : post.read ? '  ·  Read' : ''}
      </Text>
    </Pressable>
  );
}
