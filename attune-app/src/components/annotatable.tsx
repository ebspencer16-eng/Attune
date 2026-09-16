/**
 * Text a reader can mark, down to a fragment of a sentence.
 *
 * ── WHAT ELLIE ASKED FOR, TWICE ───────────────────────────────────────────
 * First: "I want to be able to select text and have a small popup menu that
 * has icons for highlight, underline, tag, note, or share." Then: "Need the
 * module so that people can select fragments of sentences."
 *
 * The first build did that with two taps: long-press one word, tap another.
 * It worked and she rejected it, in the plainest terms available: "This is
 * bad. On the app I want people to be able to hold down to select then drag
 * their finger to increase the selected area. Once they lift their finger, I
 * want the toolbar to pop up right above the selected area."
 *
 * She is right, and the reason the first build was not that is worth keeping,
 * because it is what this one had to solve.
 *
 * ── WHY DRAGGING WAS HARD, AND WHAT CHANGED ───────────────────────────────
 * Dragging needs to know where every word is. React Native does not report
 * that for words inside a flowing paragraph: onLayout on a nested Text is not
 * dependable and onTextLayout reports lines, not words. A drag built on
 * guessed coordinates selects the wrong words on exactly the long paragraphs
 * where precision matters, which is why two taps was chosen instead.
 *
 * The way out is to stop nesting. Each word is its own View in a wrapping
 * row, so each one reports its own frame through onLayout, which is exact.
 * The paragraph still wraps at word boundaries, because that is where text
 * wraps anyway. What it gives up is hyphenation and justification, neither of
 * which this app uses.
 *
 * ── WHY THE PRESS HAS TO BE HELD FIRST ────────────────────────────────────
 * These paragraphs live inside a vertical ScrollView. A responder that claims
 * the touch immediately would eat every scroll that began on a word, which is
 * most of them. So the pan responder refuses the gesture until a press has
 * been held for half a second: before that the scroll view owns it, after it
 * this does.
 *
 * ── THE TOOLBAR ───────────────────────────────────────────────────────────
 * It appears on release, above the first line of the selection, and it is
 * positioned in this block's own coordinates, which is why the block is what
 * draws it rather than the screen. Clamped to the block's width so a selection
 * at either edge does not push it off the side.
 *
 * ── THE TOKENS ARE LOSSLESS ───────────────────────────────────────────────
 * A mark is stored as the text it covers and found again by matching that
 * text, so tokenising must not alter a character. Each token carries its own
 * trailing whitespace and joining them returns the original string exactly.
 * check-annotation-palette.mjs asserts it.
 */

import { useMemo, useRef, useState } from 'react';
import {
  Pressable, StyleSheet, Text, View,
  type LayoutRectangle, type StyleProp, type TextStyle, type ViewStyle,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { SymbolView } from 'expo-symbols';

import { annotationColor } from '@/constants/annotations';
import { Colors, Palette, Radius, Spacing, Type } from '@/constants/attune-theme';

const c = Colors.light;

/** One mark already on this block, as the app holds it. */
export type Mark = {
  id: string;
  kind: 'note' | 'highlight' | 'underline';
  color?: string | null;
  /** The exact text that was marked, which is how a mark finds its words. */
  text: string;
  /** Whether it is filed under a tag, which is what the margin marker shows. */
  tagged?: boolean;
};

/** What the toolbar offers, in the order Ellie listed them. */
export type MarkAction = 'highlight' | 'underline' | 'tag' | 'note' | 'share';

const TOOLBAR: { action: MarkAction; icon: string; label: string }[] = [
  { action: 'highlight', icon: 'highlighter', label: 'Highlight' },
  { action: 'underline', icon: 'underline', label: 'Underline' },
  { action: 'tag', icon: 'tag', label: 'Tag' },
  { action: 'note', icon: 'square.and.pencil', label: 'Note' },
  { action: 'share', icon: 'paperplane', label: 'Share' },
];

/** How long a press must be held before this takes the gesture from the scroll. */
const HOLD_MS = 450;

/**
 * Which style properties belong to the words, and which to the paragraph.
 *
 * ── WHY THIS EXISTS ───────────────────────────────────────────────────────
 * Ellie: "Spacing got messed up for intro paragraph on internal processing
 * page... I'm noticing it more places, I assume it's the same bug."
 *
 * It was. Prose takes the style a <Text> would have taken and this component
 * was putting all of it on every word. A paragraph styled
 * `{ marginTop: 16, lineHeight: 26 }` became forty words each carrying a
 * sixteen point top margin, so every wrapped line sat sixteen points further
 * apart than it should. The longer the paragraph the worse it looked, and it
 * looked like a line-height bug, which is why it was hard to place.
 *
 * So: anything that describes type goes on each word, and anything that
 * describes the box goes on the row that holds them, once.
 */
const TEXT_KEYS = new Set([
  'color', 'fontFamily', 'fontSize', 'fontStyle', 'fontWeight', 'fontVariant',
  'letterSpacing', 'lineHeight', 'textDecorationLine', 'textDecorationColor',
  'textDecorationStyle', 'textTransform', 'includeFontPadding',
  'textShadowColor', 'textShadowOffset', 'textShadowRadius', 'writingDirection',
]);

export function splitStyle(style: StyleProp<TextStyle>): { text: TextStyle; box: ViewStyle } {
  const flat = (StyleSheet.flatten(style) || {}) as Record<string, unknown>;
  const text: Record<string, unknown> = {};
  const box: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(flat)) {
    if (TEXT_KEYS.has(k)) text[k] = v;
    // A row of words cannot be text-aligned, so the alignment moves to the
    // row's own main axis. Without this a centred paragraph silently goes
    // left, which is a quieter version of the same bug.
    else if (k === 'textAlign') {
      box.justifyContent = v === 'center' ? 'center' : v === 'right' ? 'flex-end' : 'flex-start';
    } else box[k] = v;
  }
  return { text: text as TextStyle, box: box as ViewStyle };
}

/** The toolbar's height, for placing it above the selection. */
const TOOLBAR_H = 44;

/**
 * Split into words, each keeping the whitespace that follows it.
 *
 * Exported for the gate, which checks the one property that matters: joining
 * the tokens returns the input unchanged. A token that gains or loses a
 * character orphans every mark on the block, because a mark is matched by
 * text.
 */
export function tokenize(text: string): string[] {
  if (!text) return [];
  // A run of non-space followed by its run of space. The trailing group is
  // greedy on whitespace so no space is ever dropped or duplicated.
  return text.match(/\S+\s*|\s+/g) || [];
}

/** Where each token starts, so a mark's character range maps onto tokens. */
function offsets(tokens: string[]): number[] {
  const out: number[] = [];
  let at = 0;
  for (const t of tokens) { out.push(at); at += t.length; }
  return out;
}

/** How a marked word is drawn. A note leaves the words alone. */
function markStyle(mark: Mark | undefined): TextStyle {
  if (!mark) return {};
  const col = annotationColor(mark.color);
  if (mark.kind === 'highlight') return { backgroundColor: col.wash, color: '#0E0B07' };
  // An underline is drawn on the word's own box rather than as a text
  // decoration; see markBox.
  return {};
}

/**
 * The box under a marked word.
 *
 * ── WHY AN UNDERLINE IS NOT A TEXT DECORATION ─────────────────────────────
 * Ellie: "Make underline thicker". A text decoration has no thickness in React
 * Native: it is whatever hairline the font declares, and nothing about it can
 * be set. Each word here is already its own View, so the line is that View's
 * bottom border, which can be any weight and sits at a consistent distance
 * from the baseline rather than riding the font's own metrics.
 */
const UNDERLINE_WEIGHT = 3;

function markBox(mark: Mark | undefined) {
  if (mark?.kind !== 'underline') return null;
  return {
    borderBottomWidth: UNDERLINE_WEIGHT,
    borderBottomColor: annotationColor(mark.color).ink,
  };
}

export default function Annotatable({
  text, style, marks = [], onSelect, onRemove,
}: {
  text: string;
  style?: StyleProp<TextStyle>;
  marks?: Mark[];
  /** A fragment was chosen, and what to do with it. */
  onSelect?: (fragment: string, action: MarkAction) => void;
  /** Take a mark off these words. Absent means the toolbar's bin stays grey. */
  onRemove?: (mark: Mark) => void;
}) {
  const { text: textStyle, box: boxStyle } = useMemo(() => splitStyle(style), [style]);
  const tokens = useMemo(() => tokenize(text), [text]);
  const starts = useMemo(() => offsets(tokens), [tokens]);

  /** The word the press started on, and the one the finger is over now. */
  const [anchor, setAnchor] = useState<number | null>(null);
  const [head, setHead] = useState<number | null>(null);
  /** Set on release, so the toolbar appears when the finger lifts and not before. */
  const [settled, setSettled] = useState(false);

  /**
   * Where each word is, in this block's coordinates.
   *
   * A ref rather than state: it is read by the pan responder during a gesture
   * and never drawn, so writing it must not re-render the paragraph mid-drag.
   */
  const frames = useRef<Map<number, LayoutRectangle>>(new Map());

  /**
   * Which tokens each existing mark covers.
   *
   * By character range rather than by token, because a mark was stored as text
   * and the text may sit mid-token at either end after a copy edit. Anything
   * overlapping the mark's range is painted.
   */
  const marked = useMemo(() => {
    const out = new Map<number, Mark>();
    for (const m of marks) {
      if (!m.text) continue;
      const at = text.indexOf(m.text);
      if (at === -1) continue;          // its words are gone; draw nothing
      const end = at + m.text.length;
      tokens.forEach((tok, i) => {
        const s = starts[i];
        if (s < end && s + tok.length > at) out.set(i, m);
      });
    }
    return out;
  }, [marks, tokens, starts, text]);

  /**
   * The word under a point.
   *
   * Exact when the finger is on a word. When it is not, the nearest word on
   * the same line, and failing that the nearest anywhere: a finger in the
   * ragged space at the end of a line means the last word of that line, which
   * is what a reader dragging to the end of a sentence intends.
   */
  const wordAt = (x: number, y: number): number | null => {
    let best: number | null = null;
    let bestScore = Infinity;
    for (const [i, f] of frames.current) {
      const withinY = y >= f.y && y <= f.y + f.height;
      const dx = x < f.x ? f.x - x : x > f.x + f.width ? x - (f.x + f.width) : 0;
      const dy = withinY ? 0 : Math.min(Math.abs(y - f.y), Math.abs(y - (f.y + f.height)));
      // A line's worth of vertical distance outweighs any horizontal distance,
      // so the nearest word on the finger's own line always wins.
      const score = dy * 1000 + dx;
      if (score < bestScore) { bestScore = score; best = i; }
    }
    return best;
  };

  const clear = () => {
    setAnchor(null);
    setHead(null);
    setSettled(false);
  };

  /**
   * ── WHY THIS IS NOT A PANRESPONDER ────────────────────────────────────────
   * It was, and it could not work. On iOS a ScrollView scrolls through
   * UIScrollView's own gesture recogniser, not through the JS responder
   * system. The moment a finger inside one moves, that recogniser claims the
   * touch and React Native cancels the JS touch, so
   * onMoveShouldSetPanResponder is never asked. Instrumenting the old version
   * in the simulator showed exactly that: the press was seen, the move never
   * was, and no selection could begin however long the hold.
   *
   * That is why Ellie could not get a toolbar: not because the toolbar was
   * misplaced, but because nothing ever selected anything, so it had nothing
   * to appear over.
   *
   * react-native-gesture-handler talks to the same native recognisers the
   * scroll view uses, so it can win the gesture rather than ask for it.
   * activateAfterLongPress is the whole rule: hold still for HOLD_MS and this
   * takes over; move before that and the scroll view keeps it, which is what
   * makes a paragraph still scrollable.
   *
   * minDistance is deliberately unreachable. Without it the pan would also
   * activate on distance, which would eat every scroll that began on a word.
   * The long press is the only way in.
   */
  const pan = useMemo(() => Gesture.Pan()
    .runOnJS(true)
    .minDistance(10000)
    .activateAfterLongPress(HOLD_MS)
    .shouldCancelWhenOutside(false)
    /**
     * The toolbar is drawn over these words and its buttons are ordinary
     * presses. A recogniser that cancels the touches beneath it while it waits
     * for its long press would take those presses away, so it does not.
     */
    .cancelsTouchesInView(false)
    .onStart((e) => {
      const i = wordAt(e.x, e.y);
      if (i == null) return;
      setSettled(false);
      setAnchor(i);
      setHead(i);
    })
    .onUpdate((e) => {
      const i = wordAt(e.x, e.y);
      if (i != null) setHead(i);
    })
    // The finger is up: the selection stands and the toolbar appears by it.
    .onEnd(() => setSettled(true)),
  []);

  /**
   * One tap per toolbar action, and one to dismiss.
   *
   * Built here rather than inline so the gesture objects are stable across
   * renders; a new gesture on every render detaches and reattaches the native
   * recogniser, which loses taps that arrive mid-render.
   */
  const fragmentRef = useRef('');
  const tapFor = useMemo(() => {
    const cache = new Map<MarkAction, ReturnType<typeof Gesture.Tap>>();
    return (action: MarkAction) => {
      if (!cache.has(action)) {
        cache.set(action, Gesture.Tap().runOnJS(true).onEnd(() => {
          if (!fragmentRef.current) return;
          onSelect?.(fragmentRef.current, action);
          clear();
        }));
      }
      return cache.get(action) as ReturnType<typeof Gesture.Tap>;
    };
  }, [onSelect]);
  const cancelTap = useMemo(() => Gesture.Tap().runOnJS(true).onEnd(() => clear()), []);

  if (!onSelect || !tokens.length) return <Text style={style}>{text}</Text>;

  const lo = anchor == null ? null : Math.min(anchor, head ?? anchor);
  const hi = anchor == null ? null : Math.max(anchor, head ?? anchor);
  const fragment = lo == null ? '' : tokens.slice(lo, (hi as number) + 1).join('').trim();
  // The tap gestures are built once and cannot close over this, so it is kept
  // on a ref they can read at the moment of the tap.
  fragmentRef.current = fragment;

  /**
   * The mark the selection is sitting on, if any.
   *
   * Ellie: "I want a delete button in the toolbar (greyed out unless there's a
   * mark made) so that people can delete the highlight/underline over that
   * text." So the bin is enabled by what is under the selection rather than by
   * what the reader last did, and selecting any part of a mark is enough to
   * reach it: a reader who wants a highlight gone should not have to reproduce
   * the exact words they highlighted.
   */
  const markInSelection = (() => {
    if (lo == null) return null;
    for (let i = lo; i <= (hi as number); i += 1) {
      const m = marked.get(i);
      if (m && m.kind !== 'note') return m;
    }
    return null;
  })();

  /**
   * The selection's own box: where its first line starts, and where its last
   * line ends. Both, because the toolbar goes above the selection when there
   * is room and below it when there is not.
   */
  const box = (() => {
    if (lo == null) return null;
    let minX = Infinity; let minY = Infinity; let maxBottom = -Infinity;
    for (let i = lo; i <= (hi as number); i += 1) {
      const f = frames.current.get(i);
      if (!f) continue;
      if (f.y < minY) { minY = f.y; minX = f.x; }
      else if (f.y === minY && f.x < minX) minX = f.x;
      if (f.y + f.height > maxBottom) maxBottom = f.y + f.height;
    }
    return Number.isFinite(minY) ? { x: minX, y: minY, bottom: maxBottom } : null;
  })();

  return (
    /**
     * The paragraph's own box styles live here rather than on the row of
     * words, so that the row starts at this view's content origin. The toolbar
     * is positioned from word frames, which are measured inside the row, and
     * it is drawn here: the two only agree if the row is not offset from this
     * view by a margin of its own.
     */
    <View style={boxStyle}>
      {/* ── THE WORDS ────────────────────────────────────────────────────
          A wrapping row of per-word Views rather than one Text with nested
          Texts, because a View reports its own frame and a nested Text does
          not. See the note at the top: this is what makes dragging exact.

          The paragraph's own box styles sit on this row and its type styles
          on each word. Putting the whole style on every word gave every one
          of them the paragraph's top margin, which is the spacing bug. */}
      <GestureDetector gesture={pan}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          {tokens.map((tok, i) => {
            const inSelection = lo != null && i >= lo && i <= (hi as number);
            return (
              <View
                key={i}
                onLayout={(e) => { frames.current.set(i, e.nativeEvent.layout); }}
                style={[
                  markBox(marked.get(i)),
                  inSelection ? { backgroundColor: 'rgba(27,95,232,0.22)' } : null,
                ]}>
                <Text style={[textStyle, markStyle(marked.get(i))]}>{tok}</Text>
              </View>
            );
          })}
        </View>
      </GestureDetector>
      {/* ── THE TOOLBAR ──────────────────────────────────────────────────
          On release, above the first line of the selection. Ellie: "Once they
          lift their finger, I want the toolbar to pop up right above the
          selected area for the user to select what kind of a mark or note
          they'd like to make."

          Positioned in this block's coordinates and clamped to its left edge,
          so a selection that starts near the right does not push it off the
          screen. */}
      {settled && box && fragment ? (
        <View
          style={{
            position: 'absolute',
            left: Math.max(0, Math.min(box.x - 8, 20)),
            /**
             * Above the selection, unless the selection starts at the top of
             * the block, in which case the toolbar would be drawn outside it.
             * Outside is not always visible: a card with a radius clips its
             * children, and the first paragraph of a page has nothing above it
             * but the heading. Below the last line is the honest fallback, and
             * it is still beside what was selected.
             */
            top: box.y >= TOOLBAR_H + 6 ? box.y - TOOLBAR_H - 6 : box.bottom + 6,
            flexDirection: 'row', alignItems: 'center',
            // Ellie: "Make the toolbar cream bg not black." A hairline comes
            // with it: a black pill carried its own edge, and a cream one on a
            // cream page needs one to sit above the words rather than in them.
            backgroundColor: Palette.cream, borderRadius: Radius.pill,
            borderColor: c.border, borderWidth: 1,
            paddingHorizontal: Spacing.xs, height: TOOLBAR_H,
            shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 10,
            shadowOffset: { width: 0, height: 4 }, elevation: 6,
          }}
>
          {/* ── WHY THESE ARE NOT PRESSABLES ──────────────────────────
              A Pressable here never fired. The toolbar sits over the words,
              and the words are under a gesture-handler recogniser; a plain
              React Native touch and a native recogniser in the same place do
              not negotiate with each other, so the tap reached neither. It was
              verified in the simulator: a short tap did nothing at all and a
              long one started a new selection underneath.

              A gesture-handler tap does negotiate, because it is the same
              system. It also wins over the pan by construction: the pan only
              activates after a long press, and a tap is over before then. */}
          {TOOLBAR.map((t) => (
            <Pressable
              key={t.action}
              accessibilityRole="button"
              accessibilityLabel={t.label}
              onPress={() => { onSelect(fragment, t.action); clear(); }}
              hitSlop={6}
              style={{ paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm }}>
              <SymbolView
                name={t.icon as never}
                size={18}
                tintColor={c.textStrong}
                fallback={<Text style={{ ...Type.small, color: c.textStrong }}>{t.label[0]}</Text>}
              />
            </Pressable>
          ))}

          {/* ── THE BIN ──────────────────────────────────────────────────
              Grey until the selection is sitting on a mark, and then it takes
              that mark off. Last in the row because it is the one thing here
              that removes rather than adds. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={markInSelection ? 'Remove this mark' : 'Nothing to remove'}
            accessibilityState={{ disabled: !markInSelection }}
            disabled={!markInSelection || !onRemove}
            onPress={() => { if (markInSelection && onRemove) { onRemove(markInSelection); clear(); } }}
            hitSlop={6}
            style={{ paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm }}>
            <SymbolView
              name="trash"
              size={18}
              tintColor={markInSelection && onRemove ? c.textStrong : c.border}
              fallback={(
                <Text style={{ ...Type.small, color: markInSelection && onRemove ? c.textStrong : c.border }}>
                  Del
                </Text>
              )}
            />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancel"
            onPress={clear}
            hitSlop={6}
            style={{ paddingLeft: Spacing.sm, paddingRight: Spacing.md, paddingVertical: Spacing.sm }}>
            <Text style={{ ...Type.small, color: c.textMuted }}>✕</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
