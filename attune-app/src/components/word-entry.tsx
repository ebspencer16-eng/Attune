/**
 * The word of the day, as the Notes tab draws it.
 *
 * ── WHY THIS IS A COMPONENT AND NOT MARKUP IN TWO PLACES ──────────────────
 * Ellie, of the storycard I built from a description of this instead of from
 * this: "word and definition card doesn't look like it does on the notes
 * page."
 *
 * It did not, and it could not have: the card had one centred box where this
 * has two, an entry over a usage note that tucks under it. The second copy
 * was a second idea of what a dictionary entry looks like, which is the
 * failure this codebase is organised against, and I wrote it anyway.
 *
 * So there is one. The Notes tab renders it and so does the storycard, and
 * neither of them describes it.
 *
 * ── IT BRINGS ITS OWN COLOURS ─────────────────────────────────────────────
 * Deliberately, and this is what makes it work on a card. Every other card
 * body draws through `t()`, which returns white because every other card has
 * a dark ground. This one sits on the Notes page's own near-white, so white
 * text would be invisible: that is exactly what happened to the wordmark and
 * the address at the foot of the first version, which is why Ellie could not
 * see the link.
 */

import { Text, View } from 'react-native';
import { Pressable } from '@/components/pressable';
import { SymbolView } from 'expo-symbols';
import type { ViewStyle } from 'react-native';

import { Colors, Fonts, Lift, Palette, Radius, Spacing, Type } from '@/constants/attune-theme';

const c = Colors.light;

/** The label over the second card. Ellie's screen, Ellie's words. */
export const WORD_IN_USE = 'Word in use';

export type WordOfTheDay = { word: string; part?: string; definition: string };

export default function WordEntry({ word, onShare, onKeep, style }: {
  word: WordOfTheDay;
  /**
   * The round control opposite the part of speech, when there is one.
   *
   * On the Notes tab it opens the card. On the card itself there is nothing
   * for it to open, so it is left out rather than drawn and made inert.
   */
  onShare?: (() => void) | null;
  /**
   * Keeps the word in the relationship journal.
   *
   * Ellie: "Word of the day card should have a save to journal button the
   * same as the insight of the day does." The insight carries its Save on the
   * tile itself, beside Share, so this one does too rather than only on the
   * card the share control opens.
   *
   * Optional for the same reason `onShare` is: on the storycard the journal
   * button is drawn below the card by StoryCard, and two of them on one
   * screen is the same control twice.
   */
  onKeep?: (() => void) | null;
  style?: ViewStyle;
}) {
  return (
    <View style={style}>
      {/* The entry sits over the usage note, which is what lets the
          one below tuck under it. */}
      <View
        style={{
          /* Ellie: "Less white space on the noun box with the
             dictionary definition." */
          backgroundColor: Palette.white, borderRadius: Radius.card,
          paddingVertical: Spacing.lg, paddingHorizontal: Spacing.xl,
          zIndex: 2, ...Lift,
        }}>
        {/* ── THE ENTRY'S TOP LINE ──────────────────────────────
            The reference puts the part of speech small and grey at the
            left and a round control opposite it, then the word very
            large under both with air beneath it. The control is a
            speaker there, which this product has nothing to say
            through; sharing the word is a real thing it can do and
            needs no words on the button. */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
          <Text style={{ ...Type.body, color: c.textMuted, flex: 1 }}>{word.part}</Text>
          {onKeep ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Save the word ${word.word} to your relationship journal`}
              hitSlop={10}
              onPress={onKeep}
              style={{
                width: 34, height: 34, borderRadius: 17,
                backgroundColor: Palette.warm,
                alignItems: 'center', justifyContent: 'center',
              }}>
              <SymbolView
                name={'bookmark' as never}
                size={15}
                tintColor={c.textMuted}
                fallback={<Text style={{ ...Type.small, color: c.textMuted }}>{'\u2605'}</Text>}
                style={{ width: 17, height: 17 }}
              />
            </Pressable>
          ) : null}
          {/* Ellie: "When I share the word of the day, I want it to be a
              storycard like the insight of the day." So on the Notes tab this
              opens the card, which has the share that sends a picture.

              On the card there is nothing for it to open, so it is not drawn:
              a control that does nothing is worse than no control. */}
          {onShare ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Open the word ${word.word} as a card`}
              hitSlop={10}
              onPress={onShare}
              style={{
                width: 34, height: 34, borderRadius: 17,
                backgroundColor: Palette.warm,
                alignItems: 'center', justifyContent: 'center',
              }}>
              <SymbolView
                name={'square.and.arrow.up' as never}
                size={15}
                tintColor={c.textMuted}
                fallback={<Text style={{ ...Type.small, color: c.textMuted }}>{'\u2191'}</Text>}
                style={{ width: 17, height: 17 }}
              />
            </Pressable>
          ) : null}
        </View>
        {/* ── THE WORD, IN THE BODY FACE ────────────────────────
            Ellie: "I asked for the 'Connection' text to not be playfair
            display anymore but it still is. you changed the word in use
            body text instead."

            She is right: the instruction was about this line and I
            applied it to the definition. This is DM Sans at its bold
            weight, set large, which is also what the reference's word
            is: a heavy grotesque, not a serif. */}
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          style={{
            fontFamily: Fonts.bodyBold, fontSize: 46, lineHeight: 58,
            fontWeight: '700', color: c.textStrong,
            marginTop: Spacing.xs, marginBottom: Spacing.sm,
          }}>
          {word.word}
        </Text>
      </View>
      {/* ── DARKER THAN THE CARD ABOVE IT ────────────────────────
          In the reference the entry is white and the usage note under
          it is a grey card, which is what makes the second one read as
          a footnote to the first. This was a lighter white than the
          card above, so the two read as one card with a seam. */}
      {/* ── IT DROPS OUT FROM BEHIND THE ENTRY ───────────────────
          Ellie: "Word in use tile should drop down from the word tile.
          Just like the screenshot page, the top of the tile should be
          hidden behind the word tile, and there should be shading
          behind the word in use tile."

          So a negative margin puts its top under the card above, the
          padding puts the text back below that overlap, and it carries
          its own shadow, which is what makes the overlap read as depth
          rather than as a mistake. */}
      <View
        style={{
          /* Ellie: "I can see the top rounded corners on the word in
             use tile, but I don't want to be able to. I want it to
             extend cleanly behind the growth tile."

             Square at the top, rounded at the foot. Both cards are the
             same width, so the grey one's rounded top corners were
             showing in the notch either side of the white one's
             rounded bottom corners. A straight edge has nothing to
             show there. */
          backgroundColor: '#EFEAE3',
          borderBottomLeftRadius: Radius.card,
          borderBottomRightRadius: Radius.card,
          paddingTop: Spacing.xl + Spacing.md,
          paddingBottom: Spacing.lg, paddingHorizontal: Spacing.xl,
          marginTop: -Spacing.xl,
          /* Ellie: "Add shading behind the word in use tile so that
             there's more contrast." Deeper and tighter, so the card
             above it reads as sitting on top of this rather than
             beside it. */
          shadowColor: '#2A1B10', shadowOpacity: 0.22,
          shadowRadius: 14, shadowOffset: { width: 0, height: 10 },
        }}>
        {/* The label is the dark, emphatic half and the meaning is the
            quiet one. Mine had them exactly the wrong way round: a
            muted label over full-strength ink, which reads as a
            paragraph with a caption rather than as a usage note. */}
        <Text
          style={{
            ...Type.body, fontFamily: Fonts.bodyBoldItalic,
            color: c.textStrong,
          }}>
          {WORD_IN_USE}
        </Text>
        {/* Ellie: "Text in the definition tile should be much larger
            and a different font from the hero font. Maybe just large
            and bold body font." The hero face is Playfair; this is DM
            Sans at its bold weight, two sizes up from body. */}
        {/* Back to body type. It was made large and bold by an
            instruction that was about the word above, not this. Grey,
            which the reference's is. */}
        <Text style={{ ...Type.body, color: c.textMuted, marginTop: Spacing.sm, lineHeight: 24 }}>
          {word.definition}
        </Text>
      </View>
    </View>
  );
}
