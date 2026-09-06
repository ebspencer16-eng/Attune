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

import { useCallback, useEffect, useState } from 'react';
import {
  Linking, Pressable, RefreshControl, ScrollView, Text, View, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { fetchHome, fetchPosts } from '@/api/client';
import type { CatalogueItem, HomeResponse, PostSummary } from '@/api/client';
import { ScreenLoading } from '@/components/screen-states';
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
  const { width } = useWindowDimensions();
  const [home, setHome] = useState<HomeResponse | null>(null);
  const [posts, setPosts] = useState<PostSummary[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [category, setCategory] = useState<string>(ALL);

  const load = useCallback(async () => {
    const [h, p] = await Promise.all([fetchHome(), fetchPosts()]);
    if (h.ok) setHome(h.data);
    if (p.ok) { setPosts(p.data.posts); setCategories(p.data.categories ?? []); }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Shell><ScreenLoading label="Loading your resources" /></Shell>;

  // The server tells us what is owned. If the field is absent, everything shows
  // as explorable rather than the screen guessing and getting it wrong.
  const ownedKeys = new Set<string>(home?.owned ?? []);
  // The catalogue comes from the server too. The app used to carry its own copy
  // with prices typed out, so a repriced or newly added add-on changed the site
  // and left the app selling the old one.
  const catalogue = home?.catalogue ?? [];
  const owned = catalogue.filter((r) => ownedKeys.has(r.key));
  const more = catalogue.filter((r) => !ownedKeys.has(r.key));

  // Posts carry `category` when the author set one. Anything uncategorised
  // still shows under All, so a missing field never hides a piece.
  const visible = category === ALL
    ? posts
    : posts.filter((p) => p.category === category);

  // All, then whatever shelves the server says exist.
  const shelves = [ALL, ...categories];

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
                Included with your package
              </Text>
              {/* Wraps to as many rows as it needs: two up at phone widths. */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, marginBottom: Spacing.xxl }}>
                {owned.map((r) => <OwnedTile key={r.key} item={r} />)}
              </View>
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
            <EdgeFadedRow width={width}>
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
                    {visible.map((p, i) => <PostRow key={p.id} post={p} first={i === 0} />)}
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
                Nothing published yet. New pieces will appear here.
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

/**
 * A horizontal strip whose contents fade into the margins.
 *
 * The fade is the affordance: a hard edge looks like the row has ended, while
 * a fade says there is more sideways. Gradients sit above the scroller and
 * ignore touches so they never eat a swipe.
 */
function EdgeFadedRow({ children, width }: { children: React.ReactNode; width: number }) {
  const fade = Math.min(28, width * 0.08);
  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        // paddingRight is deliberately short of the left inset so the last
        // tile sits partly under the fade. A row that ends flush looks
        // complete; one that is visibly cut invites the swipe.
        contentContainerStyle={{ paddingLeft: Spacing.xl, paddingRight: Spacing.xxxl, gap: Spacing.md }}>
        {children}
      </ScrollView>
      <LinearGradient
        pointerEvents="none"
        colors={[c.background, 'rgba(251,248,243,0)']}
        start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
        style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: fade }}
      />
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(251,248,243,0)', c.background]}
        start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }}
        style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: fade }}
      />
    </View>
  );
}

type Item = CatalogueItem;

/** Owned: full colour, a coloured spine, and it opens. */
function OwnedTile({ item }: { item: Item }) {
  const color = AccentFor[item.key] ?? AccentFallback;
  return (
    <Pressable
      style={{
        flexGrow: 1, flexBasis: '46%',
        // The tile carries the resource's colour as a wash rather than a
        // stripe down the side. A coloured bar bolted onto a white box is
        // decoration standing in for design; a tinted surface makes the tile
        // itself the thing you recognise.
        backgroundColor: color + '14',
        borderColor: color + '33', borderWidth: 1,
        borderRadius: Radius.lg, padding: Spacing.lg,
      }}>
      <View
        style={{
          width: 30, height: 30, borderRadius: Radius.sm,
          backgroundColor: color, alignItems: 'center', justifyContent: 'center',
          marginBottom: Spacing.md,
        }}>
        <Text style={{ ...Type.cardTitle, color: Palette.white }}>{item.label.charAt(0)}</Text>
      </View>
      <Text style={{ ...Type.cardTitle, color: c.textStrong }}>{item.label}</Text>
      <Text numberOfLines={2} style={{ ...Type.small, color: c.textMuted, marginTop: Spacing.xs }}>
        {item.blurb}
      </Text>
    </Pressable>
  );
}

/** Not owned: priced, and it opens the site rather than selling in-app. */
function ExploreTile({ item }: { item: Item }) {
  const color = AccentFor[item.key] ?? AccentFallback;
  return (
    <Pressable
      onPress={() => Linking.openURL(`${SITE}/offerings`)}
      style={{
        width: 190, backgroundColor: c.surface,
        borderColor: c.border, borderWidth: 1, borderRadius: Radius.lg,
        padding: Spacing.lg,
      }}>
      <View style={{ width: 26, height: 4, borderRadius: Radius.pill, backgroundColor: color, marginBottom: Spacing.md }} />
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

function PostRow({ post, first }: { post: PostSummary; first: boolean }) {
  return (
    <Pressable
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
