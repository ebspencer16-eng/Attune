/**
 * Text a reader can mark.
 *
 * ── WHAT ELLIE ASKED FOR ──────────────────────────────────────────────────
 * "I want to be able to select text and have a small popup menu that has icons
 * for highlight, underline, tag, note, or share."
 *
 * ── WHY SENTENCES AND NOT CHARACTERS ──────────────────────────────────────
 * React Native gives you two options for selectable text and neither does
 * this. `selectable` on a Text hands the selection to the operating system,
 * which then shows the system's own menu: Copy, Look Up, Share. There is no
 * supported way to put our own items in it. A TextInput has the same problem.
 * Arbitrary character-range selection with our own menu needs a native module,
 * and that is a dependency, a build change, and a thing to maintain per iOS
 * release.
 *
 * So the unit of selection is a sentence. Each one is its own inline Text with
 * its own onLongPress, and they flow together as one paragraph because nested
 * Text lays out inline. Press and hold any sentence and it is chosen.
 *
 * On a phone this is arguably the better trade even setting the native module
 * aside: dragging two handles to pick an exact range on a moving scroll view is
 * fiddly, and a sentence is the unit people actually mark.
 *
 * What it cannot do is mark half a sentence, or a phrase spanning two. If that
 * turns out to matter, the native module is the honest answer and it should be
 * a decision rather than something I slid in.
 *
 * ── WHY THE SPLIT IS CONSERVATIVE ─────────────────────────────────────────
 * Splitting prose into sentences by punctuation is famously wrong on
 * abbreviations and decimals. This product's results copy has neither in
 * quantity, but the failure mode still matters: a bad split shows a reader a
 * fragment as if it were a sentence. So the rule only breaks on a terminator
 * followed by a space and a capital, and anything shorter than a clause is
 * joined onto its neighbour rather than standing alone.
 */

import { useMemo } from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';

import { annotationColor } from '@/constants/annotations';

/** One mark already on this block, as the app holds it. */
export type Mark = {
  id: string;
  kind: 'note' | 'highlight' | 'underline';
  color?: string | null;
  /** The exact text that was marked, which is how a mark finds its sentence. */
  text: string;
};

/**
 * Break a paragraph into the pieces a reader can mark.
 *
 * Exported for the gate, which checks the property that matters: every piece
 * joined back together is the original string, unchanged. A splitter that
 * loses or duplicates a character would silently rewrite someone's results.
 */
export function toSentences(text: string): string[] {
  if (!text) return [];
  const parts: string[] = [];
  let buf = '';
  const chars = [...text];
  for (let i = 0; i < chars.length; i += 1) {
    buf += chars[i];
    const isTerminator = chars[i] === '.' || chars[i] === '?' || chars[i] === '!';
    if (!isTerminator) continue;
    // A terminator only ends a sentence when a space and a capital follow it.
    // "e.g." and "3.5" fail that test, which is the point.
    const next = chars[i + 1];
    const after = chars[i + 2];
    if (next !== ' ' || !after || after !== after.toUpperCase() || after === after.toLowerCase()) continue;
    // Too short to stand alone: keep accumulating. An "Oh." on its own line is
    // a fragment, not a thing to highlight.
    if (buf.trim().length < 24) continue;
    parts.push(buf + ' ');
    buf = '';
    i += 1;   // the space now belongs to the piece just pushed
  }
  if (buf) parts.push(buf);
  return parts;
}

/**
 * How a marked sentence is painted.
 *
 * A highlight fills behind the words; an underline draws under them. Both take
 * their colour from the shared palette, so a mark made on the website and read
 * here is the same colour.
 */
function markStyle(mark: Mark | undefined): TextStyle {
  if (!mark) return {};
  const c = annotationColor(mark.color);
  if (mark.kind === 'highlight') return { backgroundColor: c.wash, color: '#0E0B07' };
  if (mark.kind === 'underline') {
    return { textDecorationLine: 'underline', textDecorationColor: c.ink, textDecorationStyle: 'solid' };
  }
  // A note leaves the words alone. The margin marker is what says it is there,
  // because a note is about the text rather than a change to it.
  return {};
}

export default function Annotatable({
  text, style, marks = [], onSelect,
}: {
  text: string;
  style?: StyleProp<TextStyle>;
  /** Marks already on this block. Matched to sentences by their exact text. */
  marks?: Mark[];
  /** A sentence was chosen. The menu is the caller's, so this component has no
   *  opinion about what can be done with it. */
  onSelect?: (sentence: string) => void;
}) {
  const sentences = useMemo(() => toSentences(text), [text]);

  // A mark belongs to the sentence whose text it matches. Trimmed on both
  // sides, because the split keeps the trailing space and a mark stored from
  // another surface will not have it.
  const byText = useMemo(() => {
    const m = new Map<string, Mark>();
    for (const mark of marks) if (mark.text) m.set(mark.text.trim(), mark);
    return m;
  }, [marks]);

  // Nothing to mark, or no handler: render the string and add no interaction.
  // A long-press that does nothing is worse than no long-press.
  if (!onSelect || sentences.length === 0) return <Text style={style}>{text}</Text>;

  return (
    <Text style={style}>
      {sentences.map((s, i) => {
        const mark = byText.get(s.trim());
        return (
          <Text
            key={`${i}:${s.slice(0, 12)}`}
            onLongPress={() => onSelect(s.trim())}
            suppressHighlighting
            style={markStyle(mark)}>
            {s}
          </Text>
        );
      })}
    </Text>
  );
}
