/**
 * Text a reader can mark, down to a fragment of a sentence.
 *
 * ── WHAT ELLIE ASKED FOR ──────────────────────────────────────────────────
 * First: "I want to be able to select text and have a small popup menu that has
 * icons for highlight, underline, tag, note, or share."
 * Then: "Need the module so that people can select fragments of sentences."
 *
 * ── WHY THERE IS NO NATIVE MODULE ─────────────────────────────────────────
 * The goal is fragment selection. A native module is one way to get it, and it
 * is expensive here in a way that is not about code: this is a managed Expo
 * project run through Expo Go. Custom native code cannot load in Expo Go, so it
 * would mean a development build, Xcode, `expo run:ios` instead of
 * `expo start --ios`, and a rebuild whenever the native side changes. That is
 * a permanent change to how the app is run every day, by someone who is not a
 * developer, for one gesture.
 *
 * Word ranges give the same result without any of that. A reader long-presses
 * the first word of the fragment and taps the last, and marks anything from one
 * word to several sentences. That is what "a fragment of a sentence" means in
 * practice: nobody highlights half of "communication".
 *
 * What it still cannot do is split a word. If that ever matters, the native
 * module is the honest answer and the cost above is what it costs.
 *
 * ── WHY TAP-TO-EXTEND AND NOT DRAG ────────────────────────────────────────
 * Dragging needs the frame of every word, and React Native does not give
 * reliable per-word layout inside a flowing paragraph: onLayout on a nested
 * Text is not dependable, and onTextLayout reports lines rather than words. A
 * drag built on guessed coordinates selects the wrong words on exactly the
 * long paragraphs where precision matters.
 *
 * Two taps need no measurement at all. onPress on a nested Text is exact,
 * because the text engine decides what was hit.
 *
 * ── THE TOKENS ARE LOSSLESS ───────────────────────────────────────────────
 * A mark is stored as the text it covers and found again by matching that text,
 * so tokenising must not alter a character. Each token carries its own trailing
 * whitespace and joining them returns the original string exactly.
 * check-annotation-palette.mjs asserts it.
 */

import { useMemo, useState } from 'react';
import { Text, View, type StyleProp, type TextStyle } from 'react-native';

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

/**
 * Split into words, each keeping the whitespace that follows it.
 *
 * Exported for the gate, which checks the one property that matters: joining
 * the tokens returns the input unchanged. A token that gains or loses a
 * character orphans every mark on the block, because a mark is matched by text.
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
  /** A fragment was chosen. The menu is the caller's. */
  onSelect?: (fragment: string) => void;
}) {
  const tokens = useMemo(() => tokenize(text), [text]);
  const starts = useMemo(() => offsets(tokens), [tokens]);

  /** The word the reader long-pressed, and the one they tapped after it. */
  const [anchor, setAnchor] = useState<number | null>(null);
  const [head, setHead] = useState<number | null>(null);

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

  if (!onSelect || !tokens.length) return <Text style={style}>{text}</Text>;

  const lo = anchor == null ? null : Math.min(anchor, head ?? anchor);
  const hi = anchor == null ? null : Math.max(anchor, head ?? anchor);
  const fragment = lo == null ? '' : tokens.slice(lo, (hi as number) + 1).join('').trim();

  const clear = () => { setAnchor(null); setHead(null); };

  return (
    <View>
      <Text style={style}>
        {tokens.map((tok, i) => {
          const inSelection = lo != null && i >= lo && i <= (hi as number);
          return (
            <Text
              key={i}
              suppressHighlighting
              // Long press starts a selection. A later tap sets the other end,
              // so the order a reader works in does not matter.
              onLongPress={() => { setAnchor(i); setHead(i); }}
              onPress={anchor == null ? undefined : () => setHead(i)}
              style={[
                markStyle(marked.get(i)),
                inSelection ? { backgroundColor: 'rgba(27,95,232,0.22)' } : null,
              ]}>
              {tok}
            </Text>
          );
        })}
      </Text>

      {/* ── THE SELECTION BAR ──────────────────────────────────────────────
          Appears only while something is selected. It says what will be
          marked, because a word range picked by tapping is easy to get wrong by
          one and the reader should see it before committing.

          "Tap another word" is the only instruction in the flow, and it is
          shown at the moment it applies rather than as a hint nobody reads. */}
      {lo != null ? (
        <View
          style={{
            marginTop: Spacing.sm, padding: Spacing.md, borderRadius: Radius.md,
            backgroundColor: c.surface, borderColor: c.accent, borderWidth: 1,
          }}>
          <Text style={{ ...Type.small, fontSize: 11, color: c.textMuted }}>
            {lo === hi ? 'Tap another word to extend' : `${(hi as number) - lo + 1} words`}
          </Text>
          <Text numberOfLines={2} style={{ ...Type.small, color: c.text, marginTop: 2 }}>
            {fragment}
          </Text>
          <View style={{ flexDirection: 'row', gap: Spacing.lg, marginTop: Spacing.sm }}>
            <Text
              accessibilityRole="button"
              onPress={() => { onSelect(fragment); clear(); }}
              style={{ ...Type.small, fontWeight: '700', color: c.accent }}>
              Mark this
            </Text>
            <Text
              accessibilityRole="button"
              onPress={clear}
              style={{ ...Type.small, color: c.textMuted }}>
              Cancel
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}
