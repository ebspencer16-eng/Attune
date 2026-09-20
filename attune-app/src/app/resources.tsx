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

import { useScreenTime } from '@/hooks/use-screen-time';
import { useFocusEffect } from 'expo-router';
import { useTabReset } from '@/hooks/use-tab-reset';
import {
  Image, Linking, Pressable, RefreshControl, ScrollView, Text, TextInput, View,
} from 'react-native';
import { SymbolView } from 'expo-symbols';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fetchWorkbookView, savePost } from '@/api/client';
import { fetchHome, fetchNotes, fetchPosts, fetchTags, SITE_URL } from '@/api/client';
import type { ApiError, CatalogueItem, HomeResponse, Note, PostSummary, Tag } from '@/api/client';
import Budget from '@/components/budget';
import PostReader from '@/components/post-reader';
import Checklist from '@/components/checklist';
import TabScreen from '@/components/tab-screen';
import PageWash from '@/components/page-wash';
import ShareButton from '@/components/share-button';
import { buildWorkbook, fetchToolData, type ToolData } from '@/api/client';
import { ScreenError, ScreenLoading } from '@/components/screen-states';
import SignIn from '@/components/sign-in';
import { LOADING } from '@/constants/loading-copy';
import {
  AccentFallback, AccentFor, BlueGround, BottomTabInset, Colors, Fonts, inputType, Lift, MaxContentWidth, Palette, Radius, SectionColor, Spacing, Type,
} from '@/constants/attune-theme';

const c = Colors.light;
const SITE = SITE_URL;

/**
 * The shelf shown before any filtering. Not a category: it is the absence of
 * one, which is why it is not in the server's list.
 */
const ALL = 'All';

/**
 * Open an In Practice article from another tab.
 *
 * Ellie: a mark in the Notes tab should take you to where it lives, and for a
 * mark on an article that means the article. The same one-slot handle the
 * results screen uses for sections: a value for the next mount, and a setter
 * for the mount that is already there behind the tab bar.
 */
let pendingPost: string | null = null;
let openPostHandle: ((id: string) => void) | null = null;

export function showPost(id: string) {
  pendingPost = id;
  openPostHandle?.(id);
}

export default function ResourcesScreen() {
  useScreenTime('resources');
  const [home, setHome] = useState<HomeResponse | null>(null);
  const [posts, setPosts] = useState<PostSummary[]>([]);
  /**
   * ── SEARCHING, AND THE TWO LISTS ────────────────────────────────────────
   * Ellie: "Can we have a search bar for the articles?" and "My lists" with
   * Saved and Read, which is how the app she showed me organises its Learn
   * tab. The words a search matches come from the server, per post: title,
   * standfirst, shelf, tags and whatever keywords she adds in the admin.
   */
  const [query, setQuery] = useState('');
  const [list, setList] = useState<'all' | 'saved' | 'read'>('all');
  /** Which shelf is open as a page of its own, if any. */
  const [openShelf, setOpenShelf] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [category, setCategory] = useState<string>(ALL);
  const [sort, setSort] = useState<PostSort>('featured');
  const [error, setError] = useState<ApiError | null>(null);

  /**
   * Which tool is open in the app, if any.
   *
   * Only the ones the app has. Everything else still hands off to the website,
   * and the list is here rather than inside the handler so adding the budget
   * is one line in one place.
   */
  const [openTool_, setOpenTool] = useState<string | null>(null);
  const [openPost, setOpenPost] = useState<string | null>(pendingPost);
  /**
   * The reader's own marks and tags, for marking inside an article.
   *
   * Fetched with everything else rather than when an article opens: a reader
   * who long-presses a sentence should not wait on two requests to find out
   * whether the gesture did anything.
   */
  const [notes, setNotes] = useState<Note[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [partnerName, setPartnerName] = useState('your partner');
  const [tools, setTools] = useState<ToolData | null>(null);
  const [workbookNote, setWorkbookNote] = useState<string | null>(null);

  // The workbook is a file, so the tab needs to know whether it exists before
  // a tap. Fetched alongside everything else rather than on press: a tap that
  // waits on a request reads as a tap that did nothing.
  //
  // This ran once, on mount, and dropped a failure silently. Nothing here reads
  // as broken when it fails, which is the problem: the Workbook tile stays on
  // screen and does nothing at all when tapped. It loads with the rest now, so
  // focusing the tab or pulling to refresh is a real retry.

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
  /**
   * ── THE WORKBOOK IS THE WEBSITE'S PAGE ──────────────────────────────────
   * Ellie: "This does not look like the workbook we render on the site. Please
   * use the exact same pdf builder."
   *
   * She was right. What I had built converted the .docx into a PDF of its own,
   * which is a second renderer: the thing this codebase is organised against,
   * and it looked like it. public/workbook-render.html is the workbook the
   * website draws and prints, and it has been there all along.
   *
   * So the app opens that page, full screen and in the app's own colours, with
   * the payload from /api/workbook-view. It zooms, it prints, and it saves as
   * a PDF through the share sheet, all of which is the phone's own. There is
   * one workbook and one renderer.
   */
  const openWorkbook = async () => {
    const view = await fetchWorkbookView();
    if (!view.ok) { setWorkbookNote(tools?.workbook?.copy.generating || null); return false; }
    const data = encodeURIComponent(JSON.stringify(view.data));
    /**
     * ── THE BROWSER BUILDS IT, AS IT DOES FOR THE WEBSITE ─────────────────
     * Ellie: "the pdf generater opens in the browser. That's fine, let's just
     * have it do that and open the same pdf as the website in the browser."
     *
     * So the app opens the website's workbook page with ?auto=1 and the
     * browser builds the file the moment it is drawn, with the same builder
     * and the same options a customer gets on the website. The system browser
     * rather than a sheet inside the app, because this ends in a PDF the phone
     * displays, saves and prints, and that is the browser's own job.
     */
    await Linking.openURL(`${SITE}/workbook-render?data=${data}&auto=1`);
    return true;
  };

  const openTool = async (key: string) => {
    if (IN_APP.includes(key)) { setOpenTool(key); return; }
    if (key === 'workbook') {
      // If the load failed there is no url and no copy, and the old code
      // answered a tap by setting the note to null, which renders nothing.
      // Ask again on the tap instead.
      if (await openWorkbook()) return;
      let wb = tools?.workbook;
      if (!wb) {
        const r = await fetchToolData();
        if (r.ok) { setTools(r.data); wb = r.data.workbook; }
      }
      /**
       * The file, for anyone whose page could not be built.
       *
       * The page needs both partners' answers; the .docx is already on the
       * order for a couple who bought it, so it is still the fallback rather
       * than a dead end.
       */
      if (wb?.url) { Linking.openURL(wb.url); return; }

      /**
       * ── ASK FOR IT, RATHER THAN WAITING FOR SOMETHING ELSE TO ──────────
       * Ellie: "My workbook still says building your workbook check back
       * shortly. This should build as soon as results unlock and should be
       * ready for users to click immediately."
       *
       * It is built when results unlock now, which fixes it for every couple
       * from here on. It does nothing for a couple whose results opened months
       * ago, which is every couple that exists today. So a tap on a workbook
       * that is not there asks for one and waits: it takes a few seconds and
       * the tile says what is happening.
       */
      setWorkbookNote(wb?.copy.generating || null);
      const made = await buildWorkbook();
      if (made.ok && made.data.url) {
        setWorkbookNote(null);
        const again = await fetchToolData();
        if (again.ok) setTools(again.data);
        Linking.openURL(made.data.url);
      }
      return;
    }
    Linking.openURL(`${SITE}/app?view=${key}`);
  };
  /**
   * Saved on the screen first, then on the server.
   *
   * A bookmark that waits for a round trip reads as a tap that missed. A
   * failed write puts it back, which is the only honest thing to do with a
   * list someone is building.
   */
  const toggleSave = async (post: PostSummary) => {
    const next = !post.saved;
    setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, saved: next } : p)));
    const res = await savePost(post.id, next);
    if (!res.ok) {
      setPosts((prev) => prev.map((p) => (p.id === post.id ? { ...p, saved: !next } : p)));
    }
  };

  // Tracked separately from the catalogue: In Practice failing is not the same
  // as In Practice being empty, and the screen said the same thing for both.
  const [postsFailed, setPostsFailed] = useState(false);

  const loadingRef = useRef(false);
  const load = useCallback(async () => {
    loadingRef.current = true;
    // The last two are for marking inside an article: this reader's own marks,
    // so they paint on the words, and their tags, so the sheet can offer them.
    // Fetched here rather than when an article opens, because a reader who
    // long-presses a sentence should not wait on two requests to find out
    // whether the gesture did anything.
    const [h, p, t, n, g] = await Promise.all([
      fetchHome(), fetchPosts(), fetchToolData(), fetchNotes(), fetchTags(),
    ]);
    if (h.ok) { setHome(h.data); setError(null); setPartnerName(h.data.partnerName || 'your partner'); }
    else setError(h.error);
    if (t.ok) setTools(t.data);
    if (p.ok) { setPosts(p.data.posts); setCategories(p.data.categories ?? []); setPostsFailed(false); }
    else setPostsFailed(true);
    // A failed read here costs marking, not the tab, so it is not an error
    // state: the articles still open and still read.
    if (n.ok) setNotes([...n.data.notes, ...n.data.annotations]);
    if (g.ok) setTags(g.data.tags);
    setLoading(false);
    setRefreshing(false);
    loadingRef.current = false;
  }, []);

  useEffect(() => { load(); }, [load]);

  // The handle showPost() moves, and the slot it left behind for this mount.
  useEffect(() => {
    pendingPost = null;
    openPostHandle = (id: string) => { setOpenTool(null); setOpenPost(id); };
    return () => { openPostHandle = null; };
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
   * Tapping Resources while already on Resources closes whatever is open and
   * leaves you on the tab's own page: an article, the budget, the checklist.
   */
  useTabReset(useCallback(() => {
    setOpenPost(null);
    setOpenTool(null);
    setCategory(ALL);
  }, []));

  if (loading) return <Shell><ScreenLoading label={LOADING.resources} /></Shell>;

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

  // Posts carry `category` when the author set one. Anything uncategorised
  // still shows under All, so a missing field never hides a piece.
  const inCategory = category === ALL
    ? posts
    : posts.filter((p) => p.category === category);
  const inList = list === 'all'
    ? inCategory
    : inCategory.filter((p) => (list === 'saved' ? p.saved : p.read));
  /**
   * Every word typed has to appear somewhere in the post's terms, so two words
   * narrow rather than widen. Matching on the start of a word rather than the
   * whole one, because someone typing "argu" is looking for arguments.
   */
  /**
   * ── WHAT A SEARCH MATCHES ───────────────────────────────────────────────
   * The server indexes every word of an article, not just its title, so the
   * work here is only in reading the query the way someone means it.
   *
   * Words of one or two letters go: they are "in", "to", "my", which the index
   * drops as well, and keeping them would mean "in laws" finds nothing while
   * "laws" finds two. Matching is on the start of a word, so "argu" finds
   * arguments and "repair" finds repairing.
   *
   * Every word has to appear, which is how someone expects two words to
   * behave. If that finds nothing, the pieces that match any of them come back
   * instead, most matches first: an empty screen is a worse answer than a near
   * one.
   */
  const terms = query.trim().toLowerCase().split(/[^a-z0-9']+/).filter((t) => t.length > 2);
  const score = (post: PostSummary) => {
    const words = `${post.search || ''} ${post.title} ${post.subtitle || ''}`
      .toLowerCase().split(/[^a-z0-9']+/);
    return terms.filter((t) => words.some((w) => w.startsWith(t))).length;
  };
  const everyTerm = terms.length ? inList.filter((p) => score(p) === terms.length) : inList;
  const found = !terms.length || everyTerm.length
    ? everyTerm
    : inList.filter((p) => score(p) > 0).sort((a, b) => score(b) - score(a));
  const visible = sortPosts(found, sort);

  // All, then whatever shelves the server says exist.
  const shelves = [ALL, ...categories];

  if (openTool_ === 'checklist') {
    return <Checklist onClose={() => setOpenTool(null)} />;
  }
  if (openPost) {
    // Reloading on close so a post that has just been read stops showing as
    // new without the reader having to know what the feed looks like.
    return (
      <PostReader
        id={openPost}
        onClose={() => { setOpenPost(null); load(); }}
        /* What marking needs: this reader's own marks so they paint on the
           words, and their tags so the sheet can offer them. */
        notes={notes}
        tags={tags}
        partnerName={partnerName}
        onCreated={(note) => setNotes((prev) => [note, ...prev])}
        onRemoved={(id) => setNotes((prev) => prev.filter((n) => n.id !== id))}
        onChanged={(note) => setNotes((prev) => prev.map((n) => (n.id === note.id ? note : n)))}
      />
    );
  }
  if (openTool_ === 'budget') {
    return (
      <Budget onClose={() => setOpenTool(null)} />
    );
  }

  /**
   * ── THE SHELF PAGE ──────────────────────────────────────────────────────
   * Ellie: "Each section should also have an arrow that opens to a page with
   * all the articles for that section organized in rows."
   *
   * Same cards, one per row, and the search and the lists stay behind on the
   * tab: this page is one shelf and nothing else.
   */
  if (openShelf) {
    const inShelf = posts.filter((p) => p.category === openShelf);
    return (
      <Shell>
        <ScrollView contentContainerStyle={{ paddingBottom: Spacing.xxxl }}>
          <View style={{ paddingHorizontal: Spacing.xl, paddingTop: Spacing.sm, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back to Learn"
              onPress={() => setOpenShelf(null)}
              hitSlop={12}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingVertical: Spacing.sm }}>
              <Text style={{ ...Type.body, color: c.accent, lineHeight: 22 }}>{'\u2039'}</Text>
              <Text style={{ ...Type.small, fontWeight: '600', color: c.accent }}>Back to Learn</Text>
            </Pressable>
            <Text style={{ ...Type.display, color: c.textStrong, marginTop: Spacing.sm, marginBottom: Spacing.lg }}>
              {openShelf}
            </Text>
            {inShelf.map((post) => (
              <PostCard key={post.id} post={post} shelves={categories} onOpenPost={setOpenPost} onToggleSave={toggleSave} />
            ))}
          </View>
        </ScrollView>
      </Shell>
    );
  }

  /**
   * Whether the reader is narrowing rather than browsing.
   *
   * Searching or picking a list is a question with an answer, so it gets one
   * list of answers. Browsing is a shelf at a time.
   */
  const narrowing = terms.length > 0 || list !== 'all';

  return (
    <Shell>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 0 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={c.accentQuiet} />
        }>

        <View style={{ paddingHorizontal: Spacing.xl, paddingTop: Spacing.sm, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}>
          {/* Ellie: "I want the section labels on that page to be hero text not
              eyebrow text." So the sections carry the page rather than a title
              above them repeating the tab's own name. */}
          {/* Ellie: "Rename 'yours to explore' section to 'Resources'." */}
          <Text style={{ ...Type.display, color: c.textStrong, marginBottom: Spacing.lg }}>
            Resources
          </Text>
          {owned.length ? (
            <>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.lg }}>
                {owned.map((r) => <OwnedTile key={r.key} item={r} onOpen={openTool} />)}
              </View>
              {workbookNote ? (
                <Text style={{ ...Type.small, color: c.textMuted, marginTop: Spacing.md }}>
                  {workbookNote}
                </Text>
              ) : null}
            </>
          ) : null}

          {/* ── ONLY WHEN THERE IS MORE ────────────────────────────────────
              Ellie: "I shouldn't have an explore more resources arrow if I own
              all the resources."

              She is right and it was worse than redundant: it is a link to the
              offerings page, so a customer who has bought everything was being
              pointed at a shop with nothing in it for them. Derived from the
              catalogue the server already sends rather than from a count, so a
              new resource appearing makes the link come back on its own. */}
          {owned.length < catalogue.length ? (
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Explore more resources on the website"
            onPress={() => Linking.openURL(`${SITE}/offerings`)}
            hitSlop={8}
            style={{
              alignSelf: 'flex-end', marginTop: Spacing.lg,
              flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
            }}>
            <Text style={{ ...Type.small, color: c.textMuted }}>Explore more resources</Text>
            <Text style={{ ...Type.small, color: c.textMuted }}>{'\u2192'}</Text>
          </Pressable>
          ) : null}
        </View>

        {/* ── THE INSIGHT, ON THE HOME SCREEN'S OWN BLUE ──────────────────
            Ellie: "then the insight of the day in a tile with the blue
            homescreen gradient". The same finding the home screen opens with,
            and the same ground, which is the one piece of strong colour this
            app has. It is what stops this tab reading as a list of lists. */}
        {home?.research ? (
          <View style={{ paddingHorizontal: Spacing.xl, marginTop: Spacing.xxl, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}>
            {/* ── THE SECTION IS NAMED ON THE PAGE ───────────────────────
                Ellie: "Add insight of the day as a hero and remove the eyebrow
                from the insight tile on the learn tab."

                Every other section of this tab is named by a hero above it and
                this one named itself inside its own tile, which made it the one
                block on the page whose label sat in a different place. */}
            <Text style={{ ...Type.display, color: c.textStrong, marginBottom: Spacing.lg }}>
              Insight of the day
            </Text>
            <LinearGradient
              colors={[...BlueGround]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={{ borderRadius: Radius.card, padding: Spacing.xl, ...Lift }}>
              <Text style={{ ...Type.title, fontSize: 18, lineHeight: 27, fontWeight: '400', color: Palette.white }}>
                {home.research.body}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md, marginTop: Spacing.lg }}>
                <Text style={{ ...Type.small, color: 'rgba(255,255,255,0.55)', fontFamily: Fonts.bodyItalic, flex: 1 }}>
                  {home.research.source}
                </Text>
                {/* Ellie: "I want a share button on the insight of the day tile
                    on learn tab." The finding and where it came from, which is
                    the whole of what the tile says. */}
                <ShareButton
                  tone="light"
                  label="Share"
                  accessibilityLabel="Share the insight of the day"
                  /* Ellie: "if they're sharing the insight can we have the text
                     say insight of the day?" The subject is the product's name
                     everywhere else, which is right for a storycard and for a
                     link; this one is a named thing and says which. */
                  title="Insight of the day"
                  message={`${home.research.body}\n\n${home.research.source}`}
                  url={SITE}
                />
              </View>
            </LinearGradient>
          </View>
        ) : null}

        {/* ── THE FILTERS SIT ON THE COLOUR ──────────────────────────────
            Ellie: "The all, saved, read, and search bar should be above the
            bottom tile just like the all, design, fantasy, and mystery in the
            screenshot."

            In that reference the counted pills are the last thing on the
            coloured ground and the white panel starts under them, so they read
            as choosing what the panel holds rather than as part of it. They
            were inside the sheet, under its heading, which is the other way
            round. Nothing about them changed but where they are. */}
        {posts.length ? (
              <View style={{ paddingHorizontal: Spacing.xl, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}>
                {/* Search first, then the two lists, then the shelves. Someone
                    who knows what they are looking for should not have to walk
                    past four shelves to ask for it. */}
                <View
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
                    backgroundColor: c.surface, borderColor: c.border, borderWidth: 1,
                    borderRadius: Radius.pill, paddingHorizontal: Spacing.lg,
                    marginBottom: Spacing.lg,
                  }}>
                  <SymbolView
                    name={'magnifyingglass' as never}
                    size={15}
                    tintColor={c.textMuted}
                    fallback={<Text style={{ color: c.textMuted }}>{'\u2315'}</Text>}
                  />
                  <TextInput
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Search a topic"
                    placeholderTextColor={c.textMuted}
                    returnKeyType="search"
                    clearButtonMode="while-editing"
                    /* Ellie: "Text cuts off on bottom in the in practice
                       search tab." Type.body carries a line height set for
                       paragraphs, and a single-line input clips its descenders
                       against it. inputType strips that, which is what it is
                       for: every other field in the app already uses it. */
                    style={{ ...inputType(Type.body), color: c.text, flex: 1, paddingVertical: Spacing.md }}
                  />
                </View>

                <View style={{ flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xl }}>
                  {/* ── COUNTED ──────────────────────────────────────────
                      Straight out of the reference she sent: "All 23 · Design
                      10 · Fantasy 5". A filter that says how much is behind it
                      is a filter someone can choose without tapping it first,
                      and the numbers are the ones the screen already has. */}
                  {([['all', 'All'], ['saved', 'Saved'], ['read', 'Read']] as const).map(([key, label]) => {
                    const on = list === key;
                    const n = key === 'all' ? posts.length
                      : key === 'saved' ? posts.filter((p) => p.saved).length
                        : posts.filter((p) => p.read).length;
                    return (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ selected: on }}
                        key={key}
                        onPress={() => setList(key)}
                        style={{
                          paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg,
                          borderRadius: Radius.pill,
                          backgroundColor: on ? c.accent : Palette.white,
                          ...(on ? {} : Lift),
                        }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}>
                          <Text style={{ ...Type.small, fontWeight: '700', color: on ? Palette.white : c.textMuted }}>
                            {label}
                          </Text>
                          <Text
                            style={{
                              ...Type.small, fontSize: 11, fontWeight: '700',
                              color: on ? 'rgba(255,255,255,0.75)' : c.accentQuiet,
                            }}>
                            {n}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
        ) : null}

        {/* ── THE SHEET ──────────────────────────────────────────────────
            Ellie: "Can the learn page have the layout/design of the image with
            the books, with a gradient page bg that lists the resources and the
            insight, then what looks like a tab pulling up over the page down
            below with the in practice articles?"

            So everything above sits on the ground, and the reading is a panel
            that comes up over it: a large radius on the top two corners only,
            the full width, and no bottom at all, because in the reference it
            runs off the end of the screen rather than finishing. The shadow
            points upward so the ground reads as being behind it.

            It cannot be a separate scroll view. Two scrolling surfaces on one
            screen is the control that makes a phone feel like it is fighting
            you, and this one only has to look like it lifts. */}
        <View
          style={{
            marginTop: Spacing.xxxl,
            backgroundColor: Palette.white,
            borderTopLeftRadius: 34, borderTopRightRadius: 34,
            /* Ellie: "decrease the white space above in practice in the bottom
               tile on learn." */
            paddingTop: Spacing.md,
            paddingBottom: BottomTabInset + Spacing.xxxl,
            shadowColor: '#2A1B10', shadowOpacity: 0.12,
            shadowRadius: 24, shadowOffset: { width: 0, height: -10 },
          }}>
          {/* The grab handle the reference draws at the top of its panel. Not
              a control: it is what says this thing came up from below. */}
          <View
            style={{
              alignSelf: 'center', width: 44, height: 5, borderRadius: 3,
              backgroundColor: c.border, marginBottom: Spacing.lg,
            }}
          />
          {/* ── THE SHEET OPENS IN TWO COLUMNS ─────────────────────────
              Ellie: "I also want the in practice hero on the left of the
              bottom tile with article previews visible on the right just like
              the screenshot."

              In that reference the panel's left half is the heading and a
              large number, and its right half is a grid of covers running off
              the edge. So: the heading and the count on the left, four
              previews on the right. The four are the newest, which is the
              order this screen already sorts by, so nothing here decides what
              is interesting. The number is a count rather than a word, which
              is the one thing on this block that is not Ellie's to write. */}
          <View
            style={{
              flexDirection: 'row', gap: Spacing.lg,
              paddingLeft: Spacing.xl, paddingRight: Spacing.lg,
              maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center',
              marginBottom: Spacing.xxl,
            }}>
            <View style={{ flex: 1 }}>
              <Text style={{ ...Type.display, color: c.textStrong }}>In Practice</Text>
              <Text
                style={{
                  ...Type.display, fontSize: 52, lineHeight: 74,
                  color: c.accent, marginTop: Spacing.sm,
                }}>
                {posts.length}
              </Text>
            </View>
            <View style={{ width: '50%', flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
              {posts.slice(0, 4).map((post) => (
                <Pressable
                  key={post.id}
                  accessibilityRole="button"
                  accessibilityLabel={post.title}
                  onPress={() => { if (post.external) { Linking.openURL(post.external); return; } setOpenPost(post.id); }}
                  style={{ width: '47%', aspectRatio: 0.78 }}>
                  <View
                    style={{
                      flex: 1, borderRadius: Radius.lg, overflow: 'hidden',
                      backgroundColor: `${CARD_TINTS[Math.max(0, categories.indexOf(post.category || '')) % CARD_TINTS.length]}2e`,
                      padding: Spacing.sm, justifyContent: 'flex-end',
                    }}>
                    <Text numberOfLines={3} style={{ ...Type.small, fontSize: 11, lineHeight: 14, fontWeight: '700', color: c.textStrong }}>
                      {post.title}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>

          {posts.length ? (
            <>
              {narrowing ? (
                /* One list, because this is an answer to a question. */
                <View style={{ paddingHorizontal: Spacing.xl, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}>
                  {visible.length ? (
                    visible.map((post) => (
                      <PostCard key={post.id} post={post} shelves={categories} onOpenPost={setOpenPost} onToggleSave={toggleSave} />
                    ))
                  ) : (
                    <Text style={{ ...Type.body, color: c.textMuted }}>
                      {terms.length
                        ? `Nothing matches ${query.trim()}.`
                        : list === 'saved'
                          ? 'Nothing saved yet. Tap the bookmark on an article to keep it here.'
                          : 'Nothing read yet.'}
                    </Text>
                  )}
                </View>
              ) : (
                /**
                 * ── A SHELF AT A TIME ────────────────────────────────────
                 * Ellie: "have them organized in sections with eyebrow text for
                 * each section... Each section should have articles side by
                 * side, and users can swipe to see them."
                 *
                 * The shelves come from the server, so this list is whatever
                 * the website's own categories are. A shelf with nothing on it
                 * is not drawn, which is why this maps over what is there
                 * rather than over the four names.
                 */
                categories.map((shelf) => {
                  const inShelf = sortPosts(posts.filter((post) => post.category === shelf), sort);
                  if (!inShelf.length) return null;
                  return (
                    <View key={shelf} style={{ marginBottom: Spacing.xl }}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`See everything in ${shelf}`}
                        onPress={() => setOpenShelf(shelf)}
                        style={{
                          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                          paddingHorizontal: Spacing.xl, marginBottom: Spacing.md,
                          maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center',
                        }}>
                        <Text style={{ ...Type.eyebrow, color: c.textMuted }}>{shelf}</Text>
                        <Text style={{ ...Type.body, color: c.accent }}>{'\u2192'}</Text>
                      </Pressable>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ paddingHorizontal: Spacing.xl, gap: Spacing.md }}>
                        {inShelf.map((post) => (
                          <View key={post.id} style={{ width: 260 }}>
                            <PostCard post={post} shelves={categories} onOpenPost={setOpenPost} onToggleSave={toggleSave} />
                          </View>
                        ))}
                      </ScrollView>
                    </View>
                  );
                })
              )}
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
  /* ── COLOUR ON LEARN ──────────────────────────────────────────────────
     Ellie: "Insights landing menu, learn tab, and notes tab all feel very
     plain. Please add a lot more color and visual appeal to those pages."

     The wash the other tabs use, in the two ends of the brand: the indigo
     coming down from the top right and the orange up from the bottom left.
     Learn was the one tab with no ground at all. */
  /* ── AND BOTH COLOURS FROM THE TOP ────────────────────────────────
     The books reference is one coloured ground at the top of the screen with
     a white panel coming up over it. A wash with a colour at the top right
     and another at the bottom left cannot do that: the bottom half is where
     the panel goes. Both at the top, as on Notes, so the ground is a sky and
     the sheet is what sits on it. */
  /* ── A FULL COLOUR, NOT A WASH ────────────────────────────────────
     Ellie: "I want learn page to match that books screenshot, with the full
     color bg page." That reference is a lavender ground from edge to edge
     with black type on it, not cream with a tint in the corners. So this is a
     painted ground that keeps the ink: light enough to read on, saturated
     enough that the white sheet coming up over it is a different surface. */
  return <TabScreen groundColors={LEARN_GROUND} groundTone="ink">{children}</TabScreen>;
}

/** The books reference's ground, in this product's blue rather than its own. */
const LEARN_GROUND = ['#C9D2F2', '#E6E3F0'] as const;

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
    /* ── A CARD, NOT A DOT ────────────────────────────────────────────
       Ellie's reference apps put a row of tools in soft rounded tiles with
       the name inside the tile, not a circle with a word under it. A circle
       with a word under it is the iOS home screen's shape, which is why the
       row read as three app icons rather than three things this product
       gives you. Same colour, same icon, in the shape the rest of this
       redesign uses. */
    <Pressable
      accessibilityRole="button"
      onPress={() => onOpen(item.key)}
      style={{
        flex: 1, minWidth: 96,
        backgroundColor: Palette.white,
        borderRadius: Radius.card,
        paddingVertical: Spacing.lg, paddingHorizontal: Spacing.md,
        alignItems: 'flex-start', gap: Spacing.md,
        ...Lift,
      }}>
      <View
        style={{
          width: 40, height: 40, borderRadius: Radius.lg,
          backgroundColor: color + '1A',
          alignItems: 'center', justifyContent: 'center',
        }}>
        <SymbolView
          name={(ICON[item.key] || 'square.grid.2x2') as never}
          size={22}
          tintColor={color}
          style={{ width: 24, height: 24 }}
        />
      </View>
      {/* One word. The catalogue's own short name, from the server. */}
      <Text numberOfLines={1} style={{ ...Type.small, fontWeight: '700', color: c.textStrong }}>
        {item.short || item.label}
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
/**
 * How the In Practice list is ordered.
 *
 * Ellie: "I want a 'sort by' dropdown that defaults to 'featured' but also
 * offers newest to oldest, shortest to longest, or longest to shortest.
 * Featured should promote the most popular articles first (and out of those
 * should promote unread first)."
 *
 * Featured is read literally: most read first, and where two are level, the
 * one this reader has not opened. Popularity is the server's count of how many
 * people have read each piece, not an editorial flag, so nothing has to be
 * maintained for this to stay true.
 */
export type PostSort = 'featured' | 'newest' | 'shortest' | 'longest';

const POST_SORTS: { key: PostSort; label: string }[] = [
  { key: 'featured', label: 'Featured' },
  { key: 'newest', label: 'Newest to oldest' },
  { key: 'shortest', label: 'Shortest to longest' },
  { key: 'longest', label: 'Longest to shortest' },
];

function sortPosts(list: PostSummary[], sort: PostSort): PostSummary[] {
  const out = [...list];
  const minutes = (p: PostSummary) => p.read_minutes ?? 0;
  const when = (p: PostSummary) => (p.published_at ? Date.parse(p.published_at) || 0 : 0);
  switch (sort) {
    // A piece with no reading time sorts last rather than first: a missing
    // number is not a short article.
    case 'shortest': return out.sort((a, b) => (minutes(a) || 1e6) - (minutes(b) || 1e6));
    case 'longest': return out.sort((a, b) => minutes(b) - minutes(a));
    case 'newest': return out.sort((a, b) => when(b) - when(a));
    default:
      return out.sort((a, b) =>
        (b.reads ?? 0) - (a.reads ?? 0)
        || Number(!!a.read) - Number(!!b.read)
        || when(b) - when(a));
  }
}

/** The dropdown itself, the same shape as the one on the Notes tag list. */
function SortControl({ value, onChange }: { value: PostSort; onChange: (v: PostSort) => void }) {
  const [open, setOpen] = useState(false);
  const current = POST_SORTS.find((o) => o.key === value)?.label || '';
  return (
    <View style={{ marginBottom: Spacing.md }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Change how articles are sorted"
        onPress={() => setOpen((v) => !v)}
        style={{
          flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, alignSelf: 'flex-start',
          paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs,
          borderRadius: Radius.pill, borderWidth: 1, borderColor: c.border,
          backgroundColor: c.surface,
        }}>
        <Text style={{ ...Type.small, fontSize: 11, color: c.textMuted }}>{`Sort by: ${current}`}</Text>
        <Text style={{ color: c.textMuted, fontSize: 10 }}>{open ? '\u25B4' : '\u25BE'}</Text>
      </Pressable>

      {/* ── A POPUP, NOT A PANEL ────────────────────────────────────────
          Ellie: "it doesn't need to drop down into a full tile, just a small
          popup menu below the arrow, not full rows, there's currently too much
          white space."

          So it hangs under the control at the control's own width rather than
          the column's, with rows the height of the thing they name. It is
          absolutely positioned, which keeps the list from pushing the articles
          down the page every time someone opens it. */}
      {open ? (
        <View
          style={{
            position: 'absolute', top: 30, left: 0, zIndex: 10,
            minWidth: 168,
            backgroundColor: c.surface, borderColor: c.border, borderWidth: 1,
            borderRadius: Radius.md, overflow: 'hidden',
            shadowColor: Palette.ink, shadowOpacity: 0.12, shadowRadius: 12,
            shadowOffset: { width: 0, height: 6 }, elevation: 4,
          }}>
          {POST_SORTS.map((o) => (
            <Pressable
              key={o.key}
              accessibilityRole="button"
              onPress={() => { onChange(o.key); setOpen(false); }}
              style={{ paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md }}>
              <Text
                style={{
                  ...Type.small, fontSize: 12,
                  color: o.key === value ? c.textStrong : c.textMuted,
                  fontWeight: o.key === value ? '700' : '400',
                }}>
                {o.label}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** The tints a card's ground can take, in the order the shelves come back. */
const CARD_TINTS = [SectionColor.communication, SectionColor.expectations, SectionColor.reflection, SectionColor.intimacy];

/**
 * One article, as a card.
 *
 * ── WHY A CARD AND NOT A ROW ──────────────────────────────────────────────
 * Ellie, with the Natural Cycles app open: "I want articles to have a little
 * image like the natural cycles app... I like that natural cycles has a little
 * 'article' box on the image."
 *
 * So: the illustration with its label and its bookmark, then the title, then
 * how long it takes. A post with no illustration gets its own tinted ground
 * rather than a grey box, so the shelf looks finished before every piece has
 * been drawn for.
 */
function PostCard({
  post, shelves, onOpenPost, onToggleSave,
}: {
  post: PostSummary;
  /** The shelves in the server's order, which is where a card's tint comes from. */
  shelves: string[];
  onOpenPost: (id: string) => void;
  onToggleSave: (post: PostSummary) => void;
}) {
  /**
   * ── THE GROUND, UNTIL THERE ARE ILLUSTRATIONS ─────────────────────────
   * Not one flat colour for every card, which reads as a picture that failed
   * to load, and not a new palette either. The shelf decides: its position in
   * the server's own list picks one of the section colours this app already
   * uses, at a tint. Twelve pieces across four shelves come out as four
   * families, which is what the shelves are.
   */
  const shelfIndex = Math.max(0, shelves.indexOf(post.category || ''));
  const ground = post.hero_color || `${CARD_TINTS[shelfIndex % CARD_TINTS.length]}1f`;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        /**
         * A post from the posts table opens in the app. An In Practice page is
         * a static page on the website whose body is generated into
         * api/_in-practice-bodies.js, so those open here too; `external` is
         * only set when a body did not come through. Reading is marked by the
         * reader, on open, not here.
         */
        if (post.external) { Linking.openURL(post.external); return; }
        onOpenPost(post.id);
      }}
      /* Radius and a soft shadow rather than a hairline: the cards in every
         one of her references float on the ground rather than being drawn on
         it. `Lift` is shared, so these cannot drift from the tool tiles. */
      style={{
        backgroundColor: Palette.white,
        borderRadius: Radius.card, overflow: 'hidden', marginBottom: Spacing.lg,
        ...Lift,
      }}>
      <View style={{ height: 132, backgroundColor: ground, justifyContent: 'space-between' }}>
        {post.hero_image ? (
          <Image
            source={{ uri: post.hero_image }}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            resizeMode="cover"
          />
        ) : (
          /* The mark, quietly, so a card with no illustration still looks like
             something rather than like something missing. */
          <Image
            source={require('@/assets/images/attune-mark.png')}
            style={{
              position: 'absolute', right: Spacing.lg, bottom: Spacing.md,
              width: 64, height: 64 * (64 / 88), opacity: 0.22,
            }}
            resizeMode="contain"
          />
        )}

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: Spacing.md }}>
          {/* The label, so a reader knows what kind of thing they are about to
              open before they read the title. */}
          <View style={{ backgroundColor: 'rgba(255,253,249,0.92)', borderRadius: Radius.sm, paddingVertical: 3, paddingHorizontal: Spacing.sm }}>
            <Text style={{ ...Type.eyebrow, fontSize: 9, color: c.textStrong }}>Article</Text>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={post.saved ? `Remove ${post.title} from your list` : `Save ${post.title} to your list`}
            hitSlop={12}
            onPress={() => onToggleSave(post)}
            style={{
              width: 30, height: 30, borderRadius: 15,
              backgroundColor: 'rgba(255,253,249,0.92)',
              alignItems: 'center', justifyContent: 'center',
            }}>
            <SymbolView
              name={(post.saved ? 'bookmark.fill' : 'bookmark') as never}
              size={14}
              tintColor={post.saved ? c.accent : c.textStrong}
              fallback={<Text style={{ fontSize: 13, color: post.saved ? c.accent : c.textStrong }}>{post.saved ? '\u2605' : '\u2606'}</Text>}
            />
          </Pressable>
        </View>
      </View>

      <View style={{ padding: Spacing.lg }}>
        {/* Ellie: "No description of articles in the tiles on learn tab, that
            should make them all uniformed height, right?" Right, as long as the
            title is given the room for two lines whether or not it needs them:
            a one-line title beside a two-line one is the same ragged edge the
            standfirst was making. */}
        <Text numberOfLines={2} style={{ ...Type.cardTitle, color: c.textStrong, minHeight: 46 }}>
          {post.title}
        </Text>
        <Text style={{ ...Type.small, color: c.textMuted, marginTop: Spacing.sm }}>
          {post.read_minutes ? (
            <Text style={{ color: c.accent }}>{`${post.read_minutes} min read`}</Text>
          ) : null}
          {post.revised ? '  \u00b7  Updated' : post.read ? '  \u00b7  Read' : ''}
        </Text>
      </View>
    </Pressable>
  );
}
