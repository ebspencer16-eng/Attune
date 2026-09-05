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
import type { HomeResponse, PostSummary } from '@/api/client';
import { ScreenLoading } from '@/components/screen-states';
import {
  Colors, MaxContentWidth, Palette, Radius, SectionColor, Spacing, Type,
} from '@/constants/attune-theme';

const c = Colors.light;
const SITE = 'https://www.attune-relationships.com';

/**
 * Everything purchasable, with the capability that grants it.
 *
 * Mirrors PKG_CAPS on the server rather than deciding anything: the app never
 * works out what someone owns, it only asks. `owned` comes from /api/home.
 */
const CATALOGUE = [
  { key: 'conflict',   label: 'Conflict Patterns',   blurb: 'How conflict actually goes for you.',        price: '$40', color: SectionColor.conflict },
  { key: 'intimacy',   label: 'Physical Intimacy',   blurb: 'What you each expect, answered privately.',  price: '$20', color: SectionColor.intimacy },
  { key: 'reflection', label: 'Relationship Reflection', blurb: 'Where you have been, and where next.',   price: '$40', color: SectionColor.reflection },
  { key: 'budget',     label: 'Build a Budget',      blurb: 'A shared budget, built together.',           price: '$20', color: SectionColor.expectations },
  { key: 'checklist',  label: 'Starting Out',        blurb: 'The practical list for setting up a life.',  price: '$20', color: Palette.clay },
  { key: 'workbook',   label: 'Your Workbook',       blurb: 'Built from your answers.',                   price: '$19', color: Palette.orange },
] as const;

export default function ResourcesScreen() {
  const { width } = useWindowDimensions();
  const [home, setHome] = useState<HomeResponse | null>(null);
  const [posts, setPosts] = useState<PostSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [h, p] = await Promise.all([fetchHome(), fetchPosts()]);
    if (h.ok) setHome(h.data);
    if (p.ok) setPosts(p.data.posts);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <Shell><ScreenLoading label="Loading your resources" /></Shell>;

  // The server tells us what is owned. If the field is absent, everything shows
  // as explorable rather than the screen guessing and getting it wrong.
  const ownedKeys = new Set<string>(home?.owned ?? []);
  const owned = CATALOGUE.filter((r) => ownedKeys.has(r.key));
  const more = CATALOGUE.filter((r) => !ownedKeys.has(r.key));

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
              <Text style={{ ...Type.eyebrow, color: c.textMuted, marginBottom: Spacing.md }}>Yours</Text>
              {/* Wraps to as many rows as it needs: two up at phone widths. */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, marginBottom: Spacing.xxl }}>
                {owned.map((r) => <OwnedTile key={r.key} item={r} />)}
              </View>
            </>
          ) : null}
        </View>

        {more.length ? (
          <>
            <Text
              style={{
                ...Type.eyebrow, color: c.textMuted,
                paddingHorizontal: Spacing.xl, marginBottom: Spacing.md,
              }}>
              Explore more resources
            </Text>
            <EdgeFadedRow width={width}>
              {more.map((r) => <ExploreTile key={r.key} item={r} />)}
            </EdgeFadedRow>
          </>
        ) : null}

        <View style={{ paddingHorizontal: Spacing.xl, marginTop: Spacing.xxl, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}>
          <Text style={{ ...Type.eyebrow, color: c.textMuted, marginBottom: Spacing.md }}>In Practice</Text>
          {posts.length ? (
            <View style={{ backgroundColor: c.surface, borderColor: c.border, borderWidth: 1, borderRadius: Radius.lg, overflow: 'hidden' }}>
              {posts.slice(0, 6).map((p, i) => <PostRow key={p.id} post={p} first={i === 0} />)}
            </View>
          ) : (
            <Text style={{ ...Type.body, color: c.textMuted }}>
              Nothing published yet. New pieces will appear here.
            </Text>
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
        contentContainerStyle={{ paddingHorizontal: Spacing.xl, gap: Spacing.md }}>
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

type Item = (typeof CATALOGUE)[number];

/** Owned: full colour, a coloured spine, and it opens. */
function OwnedTile({ item }: { item: Item }) {
  return (
    <Pressable
      style={{
        flexGrow: 1, flexBasis: '46%',
        backgroundColor: c.surface, borderColor: c.border, borderWidth: 1,
        borderLeftWidth: 4, borderLeftColor: item.color,
        borderRadius: Radius.lg, padding: Spacing.lg,
      }}>
      <Text style={{ ...Type.cardTitle, color: c.textStrong }}>{item.label}</Text>
      <Text numberOfLines={2} style={{ ...Type.small, color: c.textMuted, marginTop: Spacing.xs }}>
        {item.blurb}
      </Text>
    </Pressable>
  );
}

/** Not owned: priced, and it opens the site rather than selling in-app. */
function ExploreTile({ item }: { item: Item }) {
  return (
    <Pressable
      onPress={() => Linking.openURL(`${SITE}/offerings`)}
      style={{
        width: 190, backgroundColor: c.surface,
        borderColor: c.border, borderWidth: 1, borderRadius: Radius.lg,
        padding: Spacing.lg,
      }}>
      <View style={{ width: 26, height: 4, borderRadius: Radius.pill, backgroundColor: item.color, marginBottom: Spacing.md }} />
      <Text style={{ ...Type.cardTitle, color: c.textStrong }}>{item.label}</Text>
      <Text numberOfLines={2} style={{ ...Type.small, color: c.textMuted, marginTop: Spacing.xs, minHeight: 34 }}>
        {item.blurb}
      </Text>
      <Text style={{ ...Type.small, color: Palette.orange, fontWeight: '700', marginTop: Spacing.md }}>
        {item.price}
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
