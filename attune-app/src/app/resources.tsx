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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useScreenTime } from '@/hooks/use-screen-time';
import { useFocusEffect } from 'expo-router';
import { useTabReset } from '@/hooks/use-tab-reset';
import {
  Image, Linking, Modal, Pressable, RefreshControl, ScrollView, Text, TextInput, View,
} from 'react-native';
import { SymbolView } from 'expo-symbols';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { fetchWorkbookView, savePost } from '@/api/client';
import { fetchHome, fetchNotes, fetchPosts, fetchTags, SITE_URL } from '@/api/client';
import type { ApiError, CatalogueItem, HomeResponse, Note, PostSummary, Tag } from '@/api/client';
import Budget from '@/components/budget';
import PostReader from '@/components/post-reader';
import { insightCard, StoryCard } from '@/components/highlight-cards';
import { SaveToJournal } from '@/components/journal';
import Checklist from '@/components/checklist';
import TabScreen from '@/components/tab-screen';
import PageWash from '@/components/page-wash';
import ShareButton from '@/components/share-button';
import { buildWorkbook, fetchToolData, type ToolData } from '@/api/client';
import { ScreenError, ScreenLoading } from '@/components/screen-states';
import SignIn from '@/components/sign-in';
import { LOADING } from '@/constants/loading-copy';
import {
  AccentFallback, AccentFor, BottomTabInset, Colors, Fonts, inputType, Lift, LearnGround, MaxContentWidth, Palette, Radius, SectionColor, Spacing, TabTopInset, Type,
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
  /** The tab's own scroll, so a repeat tab press can take it back to the top. */
  const scroller = useRef<ScrollView>(null);
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
  /** Whether the insight of the day is open as a full card. */
  const [insightOpen, setInsightOpen] = useState(false);
  /** Whether the save-to-journal sheet is up for the insight of the day. */
  const [keepingInsight, setKeepingInsight] = useState(false);
  /** The tool whose "you don't own this" sheet is open, if any. */
  const [locked, setLocked] = useState<Item | null>(null);
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
    /**
     * Ellie: "If I am in the in practice page and tap learn tab again I want
     * it to bring me back to learn landing so that in practice is only a
     * peek."
     *
     * Two things were missing. The shelf page, opened by a section's arrow,
     * was not in this list at all, so tapping Learn from inside one did
     * nothing at all. And the sheet is not a route: it is the bottom of this
     * tab's own scroll, so getting back to the landing means getting back to
     * the top of the page. Closing a screen that was never open would not have
     * done it.
     */
    setOpenShelf(null);
    setQuery('');
    setList('all');
    scroller.current?.scrollTo({ y: 0, animated: true });
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
  /* Every tool the catalogue has, owned or not: the Learn row lists all of
     them and dims the ones this reader does not have. Named `toolTiles`
     because `tools` is already the tool-data payload on this screen. */
  const toolTiles = catalogue.filter((r) => r.kind === 'tool');

  // Posts carry `category` when the author set one. Anything uncategorised
  // still shows under All, so a missing field never hides a piece.
  const inCategory = category === ALL
    ? posts
    : posts.filter((p) => p.category === category);
  const inList = list === 'all'
    ? inCategory
    : inCategory.filter((p) => (list === 'saved' ? p.saved : p.read));
  const inShelf = inList;
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
  const everyTerm = terms.length ? inShelf.filter((p) => score(p) === terms.length) : inShelf;
  const found = !terms.length || everyTerm.length
    ? everyTerm
    : inShelf.filter((p) => score(p) > 0).sort((a, b) => score(b) - score(a));
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
    const onShelf = posts.filter((p) => p.category === openShelf);
    const shown = sortPosts(
      list === 'all' ? onShelf : onShelf.filter((p) => (list === 'saved' ? p.saved : p.read)),
      sort,
    );
    return (
      <Shell>
        <ScrollView contentContainerStyle={{ paddingBottom: BottomTabInset + Spacing.xxxl }}>
          {/* Ellie: "Leave more space up top on the learn tab below the
            lockup." */}
        <View style={{ paddingHorizontal: Spacing.xl, paddingTop: TabTopInset, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back to Learn"
              onPress={() => setOpenShelf(null)}
              hitSlop={12}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingVertical: Spacing.sm }}>
              <Text style={{ ...Type.body, color: Palette.white, lineHeight: 22 }}>{'\u2039'}</Text>
              <Text style={{ ...Type.small, fontWeight: '600', color: Palette.white }}>Back to Learn</Text>
            </Pressable>
            {/* ── THE HERO IS WHITE ───────────────────────────────────────
                Ellie: "The hero text needs to be white."

                It was the ink colour, written for a page that used to sit on
                cream. The ground under it is the Learn blue now, so the name of
                the shelf was the one thing on this screen being read against a
                colour it was not chosen for. */}
            <Text style={{ ...Type.display, color: Palette.white, marginTop: Spacing.sm, marginBottom: Spacing.lg }}>
              {openShelf}
            </Text>

            {/* ── THE CONTROLS SIT OVER THE TABLE ─────────────────────────
                Ellie: "There should be a saved/read toggle above each table and
                a sort button."

                The same two pills the sheet carries, counting this shelf rather
                than the whole feed, and the same sort menu. Both components, so
                the shelf page and the sheet cannot end up with two ideas of
                what Saved means. */}
            <ListPills over={onShelf} list={list} onChange={setList} />
            <PillMenu
              label="Change how articles are sorted"
              prefix="Sort by: "
              value={sort}
              options={POST_SORTS}
              onChange={setSort}
            />

            {/* ── A TABLE, NOT A STACK OF CARDS ───────────────────────────
                Ellie: "The articles should be in a table with rows like the
                insights nav table... Table should list article name and read
                time."

                So one white card holding rows, the shape the Insights menu
                uses: the name on the left, the number on the right, a hairline
                between rows and none under the last. A shelf is a list of
                titles to choose from, and a column of cards makes eleven of
                them a scroll rather than a list. */}
            <View
              style={{
                backgroundColor: Palette.white, borderRadius: Radius.card,
                overflow: 'hidden', ...Lift,
              }}>
              {shown.length ? shown.map((post, i) => (
                <Pressable
                  key={post.id}
                  accessibilityRole="button"
                  accessibilityLabel={post.title}
                  onPress={() => { if (post.external) { Linking.openURL(post.external); return; } setOpenPost(post.id); }}
                  style={{
                    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
                    paddingVertical: Spacing.md, paddingHorizontal: Spacing.lg,
                    borderTopWidth: i ? 1 : 0, borderTopColor: c.border,
                  }}>
                  <Text
                    style={{
                      ...Type.cardTitle, fontSize: 15, lineHeight: 21,
                      color: c.textStrong, flex: 1,
                    }}>
                    {post.title}
                  </Text>
                  {/* The read time, where the Insights menu puts its caret. A
                      piece with none shows nothing rather than a zero: a
                      missing number is not a nought-minute article. */}
                  {post.read_minutes ? (
                    <Text style={{ ...Type.small, fontSize: 11, color: c.textMuted }}>
                      {`${post.read_minutes} min`}
                    </Text>
                  ) : null}
                  {/* Saving from the table, the same control the cards carry. */}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: !!post.saved }}
                    accessibilityLabel={post.saved ? `Remove ${post.title} from saved` : `Save ${post.title}`}
                    hitSlop={10}
                    onPress={() => toggleSave(post)}>
                    <SymbolView
                      name={(post.saved ? 'bookmark.fill' : 'bookmark') as never}
                      size={14}
                      tintColor={post.saved ? c.accent : c.textMuted}
                      fallback={<Text style={{ ...Type.small, color: c.textMuted }}>{post.saved ? '\u2605' : '\u2606'}</Text>}
                      style={{ width: 16, height: 16 }}
                    />
                  </Pressable>
                </Pressable>
              )) : (
                <Text style={{ ...Type.body, color: c.textMuted, padding: Spacing.lg }}>
                  {list === 'saved'
                    ? 'Nothing saved on this shelf yet.'
                    : list === 'read'
                      ? 'Nothing read on this shelf yet.'
                      : 'Nothing on this shelf yet.'}
                </Text>
              )}
            </View>
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

  /**
   * The four most-read pieces, for the sheet's preview grid.
   *
   * `reads` is on the payload: the server counts post_reads rows, which is the
   * first key of its own Featured sort, so this cannot disagree with the
   * website about what is popular. Ties fall back to the order the server
   * already sent, which is stable.
   */
  const mostRead = useMemo<PostSummary[]>(
    () => posts.slice().sort((a, b) => (b.reads || 0) - (a.reads || 0)).slice(0, 4),
    [posts],
  );

  return (
    <Shell>
      <ScrollView
        ref={scroller}
        contentContainerStyle={{ paddingBottom: 0 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={c.accentQuiet} />
        }>

        {/* Ellie: "Please move the resource tiles down so there's more of a
            buffer at the top of the learn page", and before that, "bump the
            resources tiles down to be top aligned with the growth noun
            dictionary definition tile on the notes page".

            TabTopInset is that alignment, shared with Notes. It was on the
            shelf page below and not on this one, so the number existed, the
            comment next to it said the two tabs lined up, and they did not. */}
        <View style={{ paddingHorizontal: Spacing.xl, paddingTop: TabTopInset, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}>
          {/* Ellie: "I want the section labels on that page to be hero text not
              eyebrow text." So the sections carry the page rather than a title
              above them repeating the tab's own name. */}
          {/* Ellie: "Rename 'yours to explore' section to 'Resources'." */}
          {/* No page hero. Ellie: "Remove 'Resources', 'Your results', and
              'notes' Page heroes." The tab bar already says which tab this is
              and the lockup already says which product; a third label above
              them was the page naming itself twice. */}
          {/* ── ALL THREE, OWNED OR NOT ───────────────────────────────────
              Ellie: "List these 3 for everyone and grey out the tile if the
              user doesn't own it. If they click it, have a pop up that says
              'You don't own this' then a button to 'See more details' that
              takes you to the site add ons."

              So the row is the catalogue's tools, not the reader's. A tile
              they do not own is dimmed and says so rather than being absent:
              a resource that is invisible until you buy it cannot be the
              reason anyone buys it. The link that used to sit under this row
              is gone with it, because every tile is now its own way there.

              `tools` filters the catalogue by kind, so a fourth tool arriving
              on the server appears here on its own. */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.lg }}>
            {toolTiles.map((r) => (
              <OwnedTile
                key={r.key}
                item={r}
                owned={ownedKeys.has(r.key)}
                onOpen={openTool}
                onLocked={() => setLocked(r)}
              />
            ))}
          </View>
          {workbookNote ? (
            <Text style={{ ...Type.small, color: c.textMuted, marginTop: Spacing.md }}>
              {workbookNote}
            </Text>
          ) : null}
        </View>

        {/* ── THE INSIGHT, ON THE HOME SCREEN'S OWN BLUE ──────────────────
            Ellie: "then the insight of the day in a tile with the blue
            homescreen gradient". The same finding the home screen opens with,
            and the same ground, which is the one piece of strong colour this
            app has. It is what stops this tab reading as a list of lists. */}
        {/* ── A BANNER, NOT A TILE ────────────────────────────────────
            Ellie: "Make insight of the day a full banner across the learn
            page, not a tile." So no side margins and no radius: it runs from
            edge to edge and the colour meets the page's own at both ends. */}
        {home?.research ? (
          <View style={{ marginTop: Spacing.xxl, maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center' }}>
            {/* ── THE SECTION IS NAMED ON THE PAGE ───────────────────────
                Ellie: "Add insight of the day as a hero and remove the eyebrow
                from the insight tile on the learn tab."

                Every other section of this tab is named by a hero above it and
                this one named itself inside its own tile, which made it the one
                block on the page whose label sat in a different place. */}
            {/* Ellie: "Remove insight of the day hero, add it back as an
                eyebrow in the tile itself." It was an eyebrow inside the tile
                once and she asked for the hero; the reference has no heading
                over this block at all, so it goes back inside. */}
            {/* Ellie: "if you click on the tile on learn you should see the
                full size storycard." The same card the home screen's quick
                link opens, built by the file that knows what a card is. */}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open the insight of the day"
              onPress={() => setInsightOpen(true)}>
            {/* ── AND THEN NOT A BANNER EITHER ───────────────────────
                Ellie: "That way insight of the day isn't in a tile and the
                blue gradient becomes the bg."

                So this block paints nothing. It was a band of BlueGround laid
                over a lighter blue page; the page is BlueGround now, and a
                second copy of the same gradient on top of it would draw a seam
                rather than a banner. No shadow either: a shadow is what a
                surface casts onto the one behind it, and there is only one
                surface here. */}
            <View
              style={{ paddingVertical: Spacing.xl, paddingHorizontal: Spacing.xl }}>
              <Text style={{ ...Type.eyebrow, color: 'rgba(255,255,255,0.7)', marginBottom: Spacing.md }}>
                {INSIGHT_OF_THE_DAY}
              </Text>
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
                {/* Ellie: "This should also be an option on the share button
                    from the insights page." Beside it rather than inside it:
                    the share control opens the phone's own sheet, which this
                    app does not get to add a row to, and a menu in front of a
                    menu is two taps to do what one did. */}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Save the insight of the day to your relationship journal"
                  onPress={() => setKeepingInsight(true)}
                  hitSlop={8}
                  style={{
                    borderRadius: Radius.pill, borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.35)',
                    paddingVertical: Spacing.xs + 2, paddingHorizontal: Spacing.md,
                  }}>
                  <Text style={{ ...Type.small, fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.9)' }}>
                    {KEEP_INSIGHT}
                  </Text>
                </Pressable>
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
            </View>
            </Pressable>
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
            /* Ellie: "In practice should peek the same amount as the autumn
               reads section of the example screenshot." In that screenshot the
               panel's top edge sits about two thirds of the way down, so the
               colour above it is most of the screen. */
            marginTop: SHEET_PEEK,
            backgroundColor: Palette.white,
            borderTopLeftRadius: 34, borderTopRightRadius: 34,
            /* Ellie: "decrease the white space above in practice in the bottom
               tile on learn." */
            paddingTop: Spacing.md,
            paddingBottom: BottomTabInset + Spacing.xxxl,
            /* Ellie: "Add some shading on the learn page bottom tile." */
            shadowColor: '#1B2A5E', shadowOpacity: 0.22,
            shadowRadius: 22, shadowOffset: { width: 0, height: -8 },
          }}>
          {/* ── AND THEN A GRAB LINE AFTER ALL ─────────────────────────
              Ellie: "Add an orange line above the in practice peek on the learn
              tab that shows users that they can pull up on that tile."

              It was left off because the reference panel has none and because
              a handle on something that cannot be dragged is a control that
              lies. Both halves of that have changed: the sheet does move, by
              scrolling, and the caret at the foot of the peek was doing this
              job from the wrong end of the block. A line at the top is the
              thing every sheet on a phone uses, and it is the first thing the
              eye reaches rather than the last. */}
          <View
            pointerEvents="none"
            style={{
              alignSelf: 'center', width: 44, height: 4, borderRadius: 2,
              backgroundColor: c.accent, marginBottom: Spacing.md,
            }}
          />
          {/* ── THE SHEET'S HEAD, PART FOR PART ────────────────────────
              The reference's panel has four things stacked on its left and a
              two by two grid on its right, and Ellie named what each of ours
              says: the two pills are Saved and Read, the heading is In
              Practice, the line under it is Featured publications, and where
              the reference puts a large number she asked for the search.
              Then a caret, because that panel is the bottom of the screen and
              nothing else says it moves.

              The pills toggle rather than select: there are two of them and
              three states, so tapping the one that is on is how you get back
              to all of it. */}
          <View
            style={{
              flexDirection: 'row', gap: Spacing.lg,
              paddingLeft: Spacing.xl, paddingRight: Spacing.lg,
              maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center',
            }}>
            {/* Ellie: "Search articles bar should be bottom aligned with the
                bottom 2 featured articles." The column is as tall as the grid
                beside it and the search is pushed to its foot, so the two
                bottom edges are the same line whatever the titles do. */}
            <View style={{ flex: 1, justifyContent: 'space-between' }}>
              <View>
              <ListPills over={posts} list={list} onChange={setList} />

              <Text style={{ ...Type.display, fontSize: 30, lineHeight: 42, color: c.textStrong }}>
                In Practice
              </Text>
              {/* Ellie: "Make featured publications text smaller, not playfair
                  display." The body face, at a size that reads as a line under
                  the heading rather than a second heading. */}
              <Text
                style={{
                  ...Type.body, fontFamily: Fonts.bodyMedium,
                  color: c.textMuted,
                }}>
                Featured publications
              </Text>
              </View>

              {/* Where the reference has its number. Ellie: "add the search bar
                  with 'Search articles' in grey text that disappears once you
                  start to type", which is what a placeholder is. */}
              <View
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
                  backgroundColor: Palette.warm,
                  borderRadius: Radius.pill, paddingHorizontal: Spacing.md,
                }}>
                <SymbolView
                  name={'magnifyingglass' as never}
                  size={14}
                  tintColor={c.textMuted}
                  fallback={<Text style={{ color: c.textMuted }}>{'\u2315'}</Text>}
                />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search articles"
                  placeholderTextColor={c.textMuted}
                  returnKeyType="search"
                  clearButtonMode="while-editing"
                  /* inputType, not Type.body: a single-line field clips its
                     descenders against a line height set for paragraphs. */
                  style={{ ...inputType(Type.small), color: c.text, flex: 1, paddingVertical: Spacing.sm + 2 }}
                />
              </View>
            </View>

            {/* ── THE FOUR MOST READ ─────────────────────────────────────
                Ellie: "The 4 tiles should be the 4 highest-read articles."
                `reads` is on the payload already: the server counts the rows
                in post_reads, which is also what its own Featured sort uses,
                so this cannot disagree with the website about what is
                popular.

                "Sneak peek article tiles should fit the full name of the
                article, not cut them off", so the tile is sized by its title
                rather than the title cut to the tile: no numberOfLines, and
                the height comes from the text. */}
            <View style={{ width: '48%', flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
              {mostRead.map((post) => (
                <Pressable
                  key={post.id}
                  accessibilityRole="button"
                  accessibilityLabel={post.title}
                  onPress={() => { if (post.external) { Linking.openURL(post.external); return; } setOpenPost(post.id); }}
                  style={{ width: '47%' }}>
                  <View
                    style={{
                      /* Sized so two rows of them clear the tab bar: Ellie,
                         "Pull that tile down so that it cuts off after the 4
                         featured articles." The grid is the tallest thing in
                         the sheet, so it is what decides where the cut is. */
                      borderRadius: Radius.lg, overflow: 'hidden', minHeight: 88,
                      /* Ellie: "Featured publications should be grey tiles not
                         colored." The shelves' colours are on the full cards
                         below, where they mean which shelf; four of them in a
                         grid up here was a palette rather than a signal. */
                      backgroundColor: TILE_GREY,
                      padding: Spacing.sm, justifyContent: 'flex-end',
                    }}>
                    {/* Ellie: "Please include the bookmark option in the top
                        right of the 4 featured publications." The same control
                        the full cards carry, in the same corner, so saving is
                        one gesture wherever a piece is shown. */}
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ selected: !!post.saved }}
                      accessibilityLabel={post.saved ? `Remove ${post.title} from saved` : `Save ${post.title}`}
                      hitSlop={8}
                      onPress={() => toggleSave(post)}
                      style={{ position: 'absolute', top: Spacing.xs, right: Spacing.xs, padding: 4 }}>
                      <SymbolView
                        name={(post.saved ? 'bookmark.fill' : 'bookmark') as never}
                        size={13}
                        tintColor={post.saved ? c.accent : c.textMuted}
                        fallback={<Text style={{ ...Type.small, color: c.textMuted }}>{post.saved ? '\u2605' : '\u2606'}</Text>}
                        style={{ width: 15, height: 15 }}
                      />
                    </Pressable>
                    <Text style={{ ...Type.small, fontSize: 11, lineHeight: 14, fontWeight: '700', color: c.textStrong }}>
                      {post.title}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>

          {/* ── THE CARET IS GONE ──────────────────────────────────────
              Ellie asked for it: "add a carrot arrow downwards at the bottom of
              that so that it's clear the user can scroll down." And then, once
              the grab line was at the top: "Remove down arrow below the 4
              featured articles on in practice, the orange bar up top is doing
              the work."

              She is right, and the reason is worth keeping. Two hints about
              one gesture is not twice as clear: it is a page telling you the
              same thing in two voices, and the second one is at the bottom of
              the block it is describing, which is the wrong end to be told
              from. */}

          {/* ── FILTER AND SORT, UNDER THE PEEK ────────────────────────
              Ellie: "Add filter and sort buttons below the 4 featured article
              to sort all the rest of the content in that tile. I don't want
              those buttons visible on the peek on the learn page."

              Below the caret, which is the line the peek ends on, so neither
              is on screen until the sheet has been pulled up. Both are the
              same component: a pill with a menu under it.

              The filter's options are the shelves the server sent, so this
              cannot offer a shelf that does not exist or miss one that does. */}
          {posts.length ? (
            <View
              style={{
                flexDirection: 'row', gap: Spacing.md, flexWrap: 'wrap',
                paddingHorizontal: Spacing.xl,
                maxWidth: MaxContentWidth, width: '100%', alignSelf: 'center',
              }}>
              <PillMenu
                label="Narrow the articles to one shelf"
                prefix="Filter: "
                value={category}
                options={shelves.map((s) => ({ key: s, label: s }))}
                onChange={setCategory}
              />
              <PillMenu
                label="Change how articles are sorted"
                prefix="Sort by: "
                value={sort}
                options={POST_SORTS}
                onChange={setSort}
              />
            </View>
          ) : null}

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
                /* The filter above narrows to one shelf. It reads `category`,
                   the state that has been in this file all along and that
                   `inCategory` above already filters the searched list with:
                   the chips that used to set it came off the page a while back
                   and nothing has set it since. One filter, two places it is
                   applied, rather than a second one added beside it. */
                categories.filter((shelf) => category === ALL || shelf === category).map((shelf) => {
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

      {/* ── THE PAGE FADES AT THE FOOT ─────────────────────────────────
          Ellie: "Please also show an arrow or show the bottom of the content
          fading out so that the user knows to scroll down." Both: the caret is
          inside the sheet and this is over the last few points of it, so the
          content runs under the tab bar rather than stopping at it. Not
          hit-testable: it is a sign, not a lid. */}
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(255,255,255,0)', Palette.white]}
        style={{
          position: 'absolute', left: 0, right: 0,
          bottom: 0, height: BottomTabInset + Spacing.lg,
        }}
      />

      {/* ── YOU DO NOT OWN THIS ────────────────────────────────────────
          Ellie: "If they click it, have a pop up that says 'You don't own
          this' then a button to 'See more details' that takes you to the site
          add ons." Her words on both.

          The button leaves the app, which is deliberate and is the rule this
          product is built on: the app does not sell. See
          check-app-does-not-sell.mjs. */}
      {locked ? (
        <Modal visible transparent animationType="fade" onRequestClose={() => setLocked(null)}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={() => setLocked(null)}
            style={{ flex: 1, backgroundColor: 'rgba(14,11,7,0.4)', alignItems: 'center', justifyContent: 'center', padding: Spacing.xl }}>
            <View
              style={{
                width: '100%', maxWidth: 340,
                backgroundColor: Palette.white, borderRadius: Radius.card,
                padding: Spacing.xl, alignItems: 'center', gap: Spacing.lg,
                ...Lift,
              }}>
              <Text style={{ ...Type.title, color: c.textStrong, textAlign: 'center' }}>
                {NOT_YOURS}
              </Text>
              <Text style={{ ...Type.small, color: c.textMuted, textAlign: 'center' }}>
                {locked.short || locked.label}
              </Text>
              <Pressable
                accessibilityRole="link"
                onPress={() => { const key = locked.key; setLocked(null); Linking.openURL(`${SITE}/offerings?add=${key}`); }}
                style={{
                  backgroundColor: c.accent, borderRadius: Radius.pill,
                  paddingVertical: Spacing.md, paddingHorizontal: Spacing.xxl,
                }}>
                <Text style={{ ...Type.cardTitle, color: Palette.white }}>{SEE_MORE}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Modal>
      ) : null}

      {keepingInsight && home?.research ? (
        <SaveToJournal
          quote={`${home.research.body}\n\n${home.research.source}`}
          onClose={() => setKeepingInsight(false)}
        />
      ) : null}

      {insightOpen && home?.research ? (
        <StoryCard
          card={insightCard(home.research, INSIGHT_OF_THE_DAY)}
          /* Ellie: "there should be a button on the insight of the day page
             that allows users to save this to relationship journal." The words
             kept are the finding itself with its source under it, which is
             what the card shows and what makes it worth keeping. */
          journal={`${home.research.body}\n\n${home.research.source}`}
          style={home.storycardStyle as never}
          onClose={() => setInsightOpen(false)}
        />
      ) : null}
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
     with black type on it, not cream with a tint in the corners.

     The ground is the insight's blue now, which is dark at the top corner, so
     the lockup takes the light tone. Nothing else is written straight onto it:
     the tools are white cards, the insight is white type, and the sheet is its
     own surface. */
  /* Ellie: "Remove the white outline around the left bubble on the mark on the
     learn page's lockup." It is on for the Insights orange, where she asked for
     it, and off here: on this blue the bubble's fill already has an edge, so
     the ring was an outline around a shape that did not need one. */
  return (
    <TabScreen groundColors={LearnGround} groundTone="light" markOutline={false}>
      {children}
    </TabScreen>
  );
}

/** The books reference's ground, in this product's blue rather than its own. */
/**
 * How much air is left above the sheet.
 *
 * The reference's panel starts about two thirds of the way down its screen;
 * everything above it is the ground. It was 48, and came down by exactly the
 * height of the grab line Ellie asked for plus its margin, so the peek shows
 * the same four articles and the same search bar it did before the line was
 * added rather than pushing the search under the tab bar.
 */
const SHEET_PEEK = 32;

/** The label on the insight, here and on the card it opens. */
/** The four featured previews' ground. One tone, not four. */
const TILE_GREY = '#EFECE7';

const INSIGHT_OF_THE_DAY = 'Insight of the day';

/** Her two lines on the sheet a locked tool opens. */
const NOT_YOURS = "You don't own this";
const SEE_MORE = 'See more details';
/** The control beside Share on the insight banner. A placeholder, like the rest. */
const KEEP_INSIGHT = 'Save';

/**
 * Ellie: "Make sure the learn page bg is an attune-branded blue", then "I
 * changed my mind, I want the bg of the learn tab to be more saturated, I want
 * it to feel more branded than it does right now", and then, having seen the
 * insight banner sitting on it: "Learn bg should just be the bg of the insight
 * of the day banner extended to fill the page. That way insight of the day
 * isn't in a tile and the blue gradient becomes the bg."
 *
 * So it is BlueGround, which is what the banner was painted with, rather than
 * a lighter blue of its own. One fewer colour in the app, and the insight
 * stops being a block of strong colour on a page of weak colour: the page is
 * the strong colour and the insight is written on it.
 *
 * And then softer, which is LearnGround in attune-theme.ts: the same two stops
 * moved a fifth of the way to white, computed from BlueGround rather than
 * typed, so "the same blue, softer" stays true if the blue is ever retuned.
 *
 * There is no LEARN_GROUND constant in this file on purpose. Two hex values
 * here is the thing this codebase keeps getting wrong.
 */

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
function OwnedTile({ item, owned, onOpen, onLocked }: {
  item: Item;
  /** Whether this reader has it. A tile they do not own is dimmed and says so. */
  owned: boolean;
  onOpen: (key: string) => void;
  onLocked: () => void;
}) {
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
      accessibilityState={{ disabled: !owned }}
      accessibilityLabel={owned ? item.short || item.label : `${item.short || item.label}, not yours yet`}
      onPress={() => (owned ? onOpen(item.key) : onLocked())}
      style={{
        flex: 1, minWidth: 96,
        backgroundColor: Palette.white,
        borderRadius: Radius.card,
        paddingVertical: Spacing.lg, paddingHorizontal: Spacing.md,
        alignItems: 'flex-start', gap: Spacing.md,
        opacity: owned ? 1 : 0.5,
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
          tintColor={owned ? color : c.textMuted}
          style={{ width: 24, height: 24 }}
        />
      </View>
      {/* One word. The catalogue's own short name, from the server. */}
      <Text numberOfLines={2} style={{ ...Type.small, fontWeight: '700', color: c.textStrong, lineHeight: 17 }}>
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

/**
 * The Saved and Read pills.
 *
 * Two of them and three states, so tapping the one that is on is how you get
 * back to all of it. `over` is the list the counts are taken from, which is
 * the sheet's whole feed in one place and one shelf in the other: a Saved
 * count of nine on a shelf holding two of them is a count about a different
 * page.
 */
function ListPills({
  over, list, onChange,
}: {
  over: PostSummary[];
  list: 'all' | 'saved' | 'read';
  onChange: (v: 'all' | 'saved' | 'read') => void;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg }}>
      {([['saved', 'Saved'], ['read', 'Read']] as const).map(([key, label]) => {
        const on = list === key;
        const n = key === 'saved'
          ? over.filter((p) => p.saved).length
          : over.filter((p) => p.read).length;
        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            key={key}
            onPress={() => onChange(on ? 'all' : key)}
            style={{
              flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
              paddingVertical: Spacing.xs + 2, paddingHorizontal: Spacing.md,
              borderRadius: Radius.pill,
              backgroundColor: on ? c.accent : Palette.warm,
            }}>
            <Text style={{ ...Type.small, fontSize: 12, fontWeight: '700', color: on ? Palette.white : c.textMuted }}>
              {label}
            </Text>
            <Text
              style={{
                ...Type.small, fontSize: 11, fontWeight: '700',
                color: on ? 'rgba(255,255,255,0.75)' : c.accentQuiet,
              }}>
              {n}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * A pill with a menu under it. The shape the Notes tag list uses.
 *
 * One component for both controls on this page, because Ellie asked for
 * "filter and sort buttons" and two popups written separately is two popups
 * that drift: the second one gets a different padding, or a different way of
 * showing which row is on, and the pair stops reading as a pair.
 */
function PillMenu<T extends string>({
  prefix, value, options, onChange, label,
}: {
  /** What the pill says before the current value. */
  prefix: string;
  value: T;
  options: { key: T; label: string }[];
  onChange: (v: T) => void;
  /** For a screen reader, which cannot read a pill's prefix as a purpose. */
  label: string;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.key === value)?.label || '';
  return (
    <View style={{ marginBottom: Spacing.md }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => setOpen((v) => !v)}
        style={{
          flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, alignSelf: 'flex-start',
          paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs,
          borderRadius: Radius.pill, borderWidth: 1, borderColor: c.border,
          backgroundColor: c.surface,
        }}>
        <Text style={{ ...Type.small, fontSize: 11, color: c.textMuted }}>{`${prefix}${current}`}</Text>
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
          {options.map((o) => (
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
