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
  PanResponder, Pressable, Text, View,
  type LayoutRectangle, type StyleProp, type TextStyle,
} from 'react-native';
import { SymbolView } from 'expo-symbols';

import { annotationColor } from '@/constants/annotations';
import { Colors, Radius, Spacing, Type } from '@/constants/attune-theme';

const c = Colors.light;

/** One mark already on this block, as the app holds it. */
export type Mark = {
  id: string;
  kind: 'note' | 'highlight' | 'underline';
  color?: string | null;
  /** The exact text that was marked, which is how a mark finds its words. */
  text: string;
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
  if (mark.kind === 'underline') {
    return { textDecorationLine: 'underline', textDecorationColor: col.ink, textDecorationStyle: 'solid' };
  }
  // A note leaves the words alone. The margin marker says it is there, because
  // a note is about the text rather than a change to it.
  return {};
}

export default function Annotatable({
  text, style, marks = [], onSelect,
}: {
  text: string;
  style?: StyleProp<TextStyle>;
  marks?: Mark[];
  /** A fragment was chosen, and what to do with it. */
  onSelect?: (fragment: string, action: MarkAction) => void;
}) {
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
  /** Whether a press has been held long enough for this to take the gesture. */
  const armed = useRef(false);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const clearHold = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = null;
  };

  const clear = () => {
    setAnchor(null);
    setHead(null);
    setSettled(false);
    armed.current = false;
    clearHold();
  };

  const responder = useMemo(() => PanResponder.create({
    // The scroll view keeps the gesture until a press has been held. Arming is
    // started here and cancelled by any movement before it fires.
    onStartShouldSetPanResponder: () => {
      armed.current = false;
      clearHold();
      holdTimer.current = setTimeout(() => { armed.current = true; }, HOLD_MS);
      return false;
    },
    onMoveShouldSetPanResponder: (_e, g) => {
      // Moving before the hold fires is a scroll, not a selection.
      if (!armed.current && (Math.abs(g.dy) > 4 || Math.abs(g.dx) > 4)) clearHold();
      return armed.current;
    },
    onPanResponderGrant: (e) => {
      const i = wordAt(e.nativeEvent.locationX, e.nativeEvent.locationY);
      if (i == null) return;
      setSettled(false);
      setAnchor(i);
      setHead(i);
    },
    onPanResponderMove: (e) => {
      const i = wordAt(e.nativeEvent.locationX, e.nativeEvent.locationY);
      if (i != null) setHead(i);
    },
    // The finger is up: the selection stands and the toolbar appears above it.
    onPanResponderRelease: () => { armed.current = false; clearHold(); setSettled(true); },
    onPanResponderTerminate: () => { armed.current = false; clearHold(); },
  }), []);

  if (!onSelect || !tokens.length) return <Text style={style}>{text}</Text>;

  const lo = anchor == null ? null : Math.min(anchor, head ?? anchor);
  const hi = anchor == null ? null : Math.max(anchor, head ?? anchor);
  const fragment = lo == null ? '' : tokens.slice(lo, (hi as number) + 1).join('').trim();

  /** The selection's own box, for placing the toolbar over its first line. */
  const box = (() => {
    if (lo == null) return null;
    let minX = Infinity; let minY = Infinity;
    for (let i = lo; i <= (hi as number); i += 1) {
      const f = frames.current.get(i);
      if (!f) continue;
      if (f.y < minY) { minY = f.y; minX = f.x; }
      else if (f.y === minY && f.x < minX) minX = f.x;
    }
    return Number.isFinite(minY) ? { x: minX, y: minY } : null;
  })();

  return (
    <View>
      {/* ── THE WORDS ────────────────────────────────────────────────────
          A wrapping row of per-word Views rather than one Text with nested
          Texts, because a View reports its own frame and a nested Text does
          not. See the note at the top: this is what makes dragging exact. */}
      <View
        {...responder.panHandlers}
        style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {tokens.map((tok, i) => {
          const inSelection = lo != null && i >= lo && i <= (hi as number);
          return (
            <View
              key={i}
              onLayout={(e) => { frames.current.set(i, e.nativeEvent.layout); }}
              style={inSelection ? { backgroundColor: 'rgba(27,95,232,0.22)', borderRadius: 3 } : null}>
              <Text style={[style, markStyle(marked.get(i))]}>{tok}</Text>
            </View>
          );
        })}
      </View>

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
            top: box.y - TOOLBAR_H - 6,
            flexDirection: 'row', alignItems: 'center',
            backgroundColor: c.textStrong, borderRadius: Radius.pill,
            paddingHorizontal: Spacing.xs, height: TOOLBAR_H,
            shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 12,
            shadowOffset: { width: 0, height: 6 }, elevation: 6,
          }}>
          {TOOLBAR.map((t) => (
            <Pressable
              key={t.action}
              accessibilityRole="button"
              accessibilityLabel={t.label}
              onPress={() => { onSelect(fragment, t.action); clear(); }}
              style={{ paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm }}>
              <SymbolView
                name={t.icon as never}
                size={18}
                tintColor="#FFFFFF"
                fallback={<Text style={{ ...Type.small, color: '#FFFFFF' }}>{t.label[0]}</Text>}
              />
            </Pressable>
          ))}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cancel"
            onPress={clear}
            style={{ paddingLeft: Spacing.sm, paddingRight: Spacing.md, paddingVertical: Spacing.sm }}>
            <Text style={{ ...Type.small, color: 'rgba(255,255,255,0.6)' }}>✕</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}
