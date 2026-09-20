// not markable, whole file: the cards are a horizontally swiping deck, and the
// long-press that starts a word range fights the pan responder that moves
// them. A reader who meant to swipe would select a word instead, on the one
// screen in the results built to be swiped. The same copy is markable on the
// section pages the cards summarise.

/**
 * The highlight storycards.
 *
 * ── WHAT THIS IS MATCHING ─────────────────────────────────────────────────
 * The website's full-screen reel, not its inline one. Same nine cards, same
 * order, same words, and now the same presentation:
 *
 *   a dark full-screen ground with the card floating on it, not a card on the
 *   cream results page under a header and a row of section pills;
 *   a fixed portrait 9:16, because these are made to be screenshotted and
 *   shared and a card whose shape depends on the phone is not;
 *   the gradient stripe across the top of the opener;
 *   the couple's own colour as the couple-type card's ground;
 *   the wordmark bottom left and the site address bottom right on every card,
 *   which is what makes a screenshot of one still say where it came from;
 *   progress above the card, in the couple's colour;
 *   an entrance for each card rather than an instant swap.
 *
 * ── WHY THAT LIST EXISTS ──────────────────────────────────────────────────
 * An earlier audit of mine checked that every field the server sends gets
 * drawn, found that it does, and reported that the storycards needed no work.
 * Every field being drawn says nothing about whether the two look alike. They
 * did not, and Ellie found it by looking, three times.
 *
 * If you change how a card is presented here, change it on the website in the
 * same commit, or the same thing happens again.
 *
 * ── WHY A PAGER AND NOT A LIST ────────────────────────────────────────────
 * These are read in sequence, once. A scrolling list lets someone skim to the
 * end, and the order is doing the work: who you are, what you look like
 * together, how you each show up, where you meet and where you do not, then
 * one conversation to actually have. A pager makes reading them the only way
 * through.
 *
 * Every card is dark. That is the website's design and it is also the point:
 * these are the one part of results meant to be shown to someone else.
 */

import { useEffect, useRef, useState } from 'react';
import {
  Dimensions, Modal, NativeScrollEvent, NativeSyntheticEvent, Pressable, SafeAreaView,
  ScrollView, StyleSheet, Text, View,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

import type { HighlightCard, PersonResults } from '@/api/client';
import { SITE_URL } from '@/api/client';
import ShareButton from '@/components/share-button';
import CoupleMap from '@/components/couple-map';
import { ResultsScroll } from '@/components/results-scroll';

/** What the couple type card needs to draw the same map the website's does. */
export type MapData = {
  a: PersonResults | null;
  b: PersonResults | null;
  aName: string;
  bName: string;
  quadrants?: { code: string; name: string; color: string; fill: string }[];
};
import {
  BottomTabInset, Colors, Palette, Radius, Spacing, Type,
  Fonts,
} from '@/constants/attune-theme';

const c = Colors.light;

/** The gradients, by the tone each card asks for. */
const TONES: Record<string, [string, string, string]> = {
  night: ['#0E0B1E', '#1A1040', '#0E0B1E'],
  type: ['#3B2A6B', '#241A5E', '#14102E'],
  'deep-blue': ['#0A1226', '#16233F', '#0A1226'],
  green: ['#07130F', '#0E2A1D', '#07130F'],
  blue: ['#060D1A', '#0D2545', '#060D1A'],
  violet: ['#0F0C29', '#241A5E', '#0F0C29'],
  rose: ['#2A0F1A', '#4A1C30', '#2A0F1A'],
  indigo: ['#120D2E', '#2A1A5E', '#120D2E'],
};

const WHITE = 'rgba(255,255,255,';

/**
 * Presentation values, from the server.
 *
 * api/_lib/storycard-style.js is the single copy, the website imports it
 * directly and /api/results sends it here on content.storycardStyle. This
 * module-level object is set from the payload once the results screen has it.
 *
 * The literals below are a last resort for a payload written before that field
 * existed, the same shape of fallback couple-map.tsx keeps for its axis names.
 * They are not a second opinion: if they ever disagree with the module, the
 * module is right.
 */
let SC = {
  ratio: 9 / 16,
  stripe: ['#E8673A', '#9B5DE5', '#1B5FE8'] as string[],
  wordmark: 'Attune',
  siteLabel: 'attune-relationships.com',
  /**
   * The grounds were NOT here, so the server sent `tones` on every results
   * payload and this file kept its own table and used that instead. Two
   * copies of eight gradients, one of them unread, under a module whose
   * opening comment says neither surface holds its own copy of a colour.
   *
   * They are here now, so the payload's win like every other value does, and
   * the table below is what it always claimed to be: a fallback for a screen
   * rendering before the style arrives.
   */
  tones: null as Record<string, unknown> | null,
  /**
   * The type scale, which is the thing Ellie has reported three times:
   * "Highlights storycards on app still don't match the ones on the website."
   *
   * She was right each time. This file had a six-token scale of its own while
   * the website styled each card inline, so the opener's names were 30 points
   * here against 41.6 to 60.8 pixels there, body copy was weight 400 against
   * 300, and the eyebrow was tracked 1.6 against 0.32em. Neither file was
   * wrong; there were two of them.
   *
   * The website's numbers now live in api/_lib/storycard-style.js and arrive
   * on the payload. Null until the first payload lands, and `t()` falls back
   * to the old tokens for that one render.
   */
  type: null as Record<string, TypeSpec> | null,
  typeRefWidth: 390,
  /**
   * The faces' own line boxes, from api/_lib/font-metrics.js by way of the
   * payload. See the note on `t()`: without these the app clips its own
   * numbers from the top.
   */
  lineBox: { display: 1.41, body: 1.33 } as Record<string, number>,
  rule: { gradient: ['#E8673A', '#1B5FE8'], width: 40, height: 2 },
  /**
   * Which colour each person is. The app drew the partner's placement dot in a
   * lighter blue than the website's, so the same person was two colours
   * depending on the screen. Ellie spotted it from two screenshots.
   */
  people: { you: '#E8673A', them: '#1B5FE8' },
  padding: 2.5,
};

type TypeSpec = {
  size: number | [number, number, number];
  family: 'display' | 'body';
  weight: number; track?: number; lh?: number; alpha: number;
  upper?: boolean; lower?: boolean;
};

/**
 * One role of the shared scale, as React Native style.
 *
 * A triple is the website's clamp(min, vw, max) and is evaluated against the
 * card's width, because on these cards that is what vw always meant: a fixed
 * 9:16 box whose text should size to the box, not to the screen around it.
 */
function t(role: string, cardWidth: number, over?: Partial<TypeSpec>): Record<string, unknown> {
  const base = SC.type?.[role];
  /**
   * ── LEGIBLE WITHOUT THE SCALE ─────────────────────────────────────────
   * The comment on SC.type says t() falls back for that one render. It did
   * not: it returned nothing at all, so a card drawn before a payload arrived
   * was fourteen point BLACK on a navy ground. Nobody saw it because the reel
   * only ever renders after /api/results, and the insight card opening from
   * the home screen is the first thing that does not.
   *
   * This is not a second scale, which is what this file's header is about. It
   * is one colour, so a card that is early is readable rather than invisible.
   */
  if (!base) return { color: '#FFFFFF' };
  const spec = over ? { ...base, ...over } : base;
  const px = Array.isArray(spec.size)
    ? Math.min(Math.max(spec.size[0] * 16, (spec.size[1] / 100) * cardWidth), spec.size[2] * 16)
    : spec.size * 16;
  const fontSize = Math.round(px * 10) / 10;
  const FACES: Record<number, string> = {
    300: Fonts.bodyLight, 400: Fonts.body, 500: Fonts.bodyMedium,
    600: Fonts.bodySemiBold, 700: Fonts.bodyBold,
  };
  return {
    fontFamily: spec.family === 'display' ? Fonts.display : (FACES[spec.weight] || Fonts.body),
    fontSize,
    fontWeight: String(spec.weight),
    ...(spec.track != null ? { letterSpacing: Math.round(spec.track * fontSize * 10) / 10 } : {}),
    /**
     * ── THE LINE BOX NEVER GOES BELOW THE FACE'S OWN ──────────────────────
     * Ellie: "Percentages are cut off on some storycards."
     *
     * `stat` is set at 0.9 of its size and `statBig` at 0.85. On the web that
     * is leading and a browser lets the glyph overflow. React Native clips,
     * from the top, which is where a % keeps its upper ring, so 90% lost it.
     *
     * api/_lib/storycard-style.js has floored this since the last time she
     * reported it, and check-card-type-clipping proved it. Both were true and
     * neither helped: that floor is inside cardTypeNative, and this function
     * is the app's own copy of the same arithmetic, written because an Expo
     * project cannot import from api/. The gate was testing the function the
     * phone never runs.
     *
     * The ratios arrive on the payload rather than being typed here, and the
     * gate now runs THIS function as well.
     */
    ...(spec.lh != null
      ? {
          lineHeight: Math.max(
            Math.ceil(fontSize * spec.lh),
            Math.ceil(fontSize * (SC.lineBox?.[spec.family] ?? 1.33)),
          ),
        }
      : {}),
    ...(spec.upper ? { textTransform: 'uppercase' as const } : {}),
    ...(spec.lower ? { textTransform: 'lowercase' as const } : {}),
    color: spec.alpha >= 1 ? '#FFFFFF' : `rgba(255,255,255,${spec.alpha})`,
  };
}

/**
 * The couple-type card's ground, from the couple's own colour.
 *
 * The website builds this gradient from the type colour, so every couple type
 * gets a different card. The app used one fixed purple for everyone and spent
 * the colour on the type name instead, which is the one place it was least
 * visible.
 */
/**
 * A card's ground. The payload's table first, this file's as the fallback.
 *
 * Typed as a three-stop tuple because LinearGradient wants at least two known
 * colours, and every ground in the product is three. A payload that sends
 * something shorter falls back rather than being spread in half.
 */
type Ground = [string, string, string];

const isGround = (v: unknown): v is Ground =>
  Array.isArray(v) && v.length === 3 && v.every((x) => typeof x === 'string');

function ground(tone: string): Ground {
  const sent = SC.tones?.[tone];
  if (isGround(sent)) return sent;
  return TONES[tone] || TONES.night;
}

/**
 * The orange half of the admired card, which is the card's own ground.
 *
 * The navy half is a rotated square laid over it. Two gradients rather than
 * one so the divide is a hard edge: a single gradient between the two hues
 * would be a blend, and Ellie asked for a divide.
 */
const ADMIRED_GROUND: Ground = ['#F08A4B', Palette.orange, '#C2410C'];

/**
 * The last card: the brand's two ends, orange into blue.
 *
 * Ellie: "full page should be the attune gradient orange to blue". The same
 * pair the storycard rule and the email header run between, so the reel closes
 * on the colours it opened with.
 */
const SENDOFF_GROUND: Ground = [Palette.orange, '#9B5DE5', Palette.indigo];

/** The alignment card: the home screen's own blue, with a sunrise over it. */
const STAT_PAIR_GROUND: Ground = ['#1B2A5E', '#24357A', '#2F55C4'];

/**
 * The sunrise, as a peak and a count rather than a per-ring number.
 *
 * Stacking n layers of alpha a comes to 1 - (1 - a)^n, so the per-ring alpha
 * is that solved backwards. 0.773 is what twenty-six rings at 0.055 came to,
 * and the brightness was right; what Ellie could see was the steps between
 * them. Raising the count alone would have made it brighter as well as
 * smoother, which is why the peak is the number that is written down.
 */
const SUNRISE_RINGS = 56;
const SUNRISE_PEAK = 0.773;
const SUNRISE_ALPHA = (1 - (1 - SUNRISE_PEAK) ** (1 / SUNRISE_RINGS)).toFixed(4);

function typeGround(accent?: string | null): Ground {
  if (!accent) return ground('type');
  return [`${accent}CC`, `${accent}66`, '#14102E'];
}

/** Portrait, the ratio a story is. */


/**
 * The section as it sits on the results page: card one, and a way in.
 *
 * Ellie asked for tapping to begin to open a full screen card. That is also
 * what the website does: its results page carries an inline reel and its
 * dedicated view is full bleed with the way out in the top right. Inline, the
 * card is under a page header and a row of section pills, and a story card
 * with product chrome above it is not a story card.
 */
/**
 * A storycard, as something you can send someone.
 *
 * The cards are pictures of numbers and prose, and a share sheet takes text, so
 * this is the card's own words in the order it shows them. Whatever a card
 * happens to carry: they are not all the same shape, and a card that gained a
 * field later should not need this changed.
 */
function shareTextFor(card: HighlightCard | undefined) {
  if (!card) return '';
  const lines = [card.title, card.typeName, card.lead, card.body, card.footer]
    .filter((line): line is string => typeof line === 'string' && line.trim().length > 0);
  // The address is passed to the sheet as a link now rather than pasted on the
  // end here, so iOS builds a preview card from it instead of guessing.
  return [...new Set(lines)].join('\n\n');
}

/**
 * The insight of the day, as a card.
 *
 * ── WHY IT IS BUILT HERE ──────────────────────────────────────────────────
 * Ellie: "If a person clicks insight of the day can they see a full storycard
 * with the insight of the day? Also if you click on the tile on learn you
 * should see the full size storycard."
 *
 * Two surfaces want the same card, so neither of them builds it: they ask for
 * it here, in the file that already knows what a card is. A second place that
 * assembled one from a finding is a second storycard renderer, which is the
 * thing this file's own header is about.
 *
 * `quote` is the kind, because that is what a finding is: a sentence in a
 * panel with a label over it and a source under it.
 */
export function insightCard(
  finding: { title?: string; body: string; source: string },
  label: string,
): HighlightCard {
  return {
    id: 'insight-of-the-day',
    kind: 'quote',
    tone: 'night',
    eyebrow: label,
    quote: finding.body,
    body: finding.source,
  } as HighlightCard;
}

/**
 * One card, full size, over whatever opened it.
 *
 * The reel's own sizing, so this is the same card at the same proportions a
 * person sees in Highlights rather than a second idea of how big a card is.
 */
export function StoryCard({ card, onClose, style }: {
  card: HighlightCard;
  onClose: () => void;
  /**
   * How a card is set, from the payload. Without it every role falls back to
   * the colour below and nothing else, which is legible and is not the
   * website's card. /api/home carries it for exactly this reason.
   */
  style?: Partial<typeof SC> | null;
}) {
  if (style) SC = { ...SC, ...style };
  const [box, setBox] = useState({ width: Dimensions.get('window').width, height: 0 });
  const cardW = Math.min(box.width - Spacing.lg * 2, box.height ? box.height * SC.ratio : 9999);
  const cardH = cardW / SC.ratio;
  return (
    <Modal visible animationType="fade" presentationStyle="fullScreen" onRequestClose={onClose}>
      <SafeAreaView
        style={{ flex: 1, backgroundColor: '#0B0918' }}
        onLayout={(e) => setBox({
          width: e.nativeEvent.layout.width,
          height: e.nativeEvent.layout.height - 96,
        })}>
        <View style={{ paddingHorizontal: Spacing.xl, paddingTop: Spacing.md }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} hitSlop={12}>
            <Text style={{ ...Type.eyebrow, color: 'rgba(255,255,255,0.7)' }}>{'\u2039  Close'}</Text>
          </Pressable>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Card card={card} onDone={onClose} w={cardW} h={cardH} active />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

export default function HighlightCards({
  cards, onDone, accent, style, map,
}: {
  cards: HighlightCard[];
  onDone: () => void;
  accent?: string | null;
  style?: Partial<typeof SC> | null;
  /**
   * What the couple type card draws its map from.
   *
   * Passed in rather than carried on the card, because the coordinates and
   * the quadrant table are already on the results payload for the couple type
   * page and a second copy on the card is a second copy of the same rule. The
   * cards stay what they are: copy plus numbers.
   */
  map?: MapData | null;
}) {
  if (style) SC = { ...SC, ...style };
  const [open, setOpen] = useState(false);
  const [box, setBox] = useState({ width: Dimensions.get('window').width, height: 0 });
  if (!cards.length) return null;

  const cardW = Math.min(box.width - Spacing.lg * 2, box.height ? box.height * SC.ratio : 9999);
  const cardH = cardW / SC.ratio;

  return (
    <View
      style={{ flex: 1, alignItems: 'center', paddingTop: Spacing.md }}
      onLayout={(e) => setBox({
        width: e.nativeEvent.layout.width,
        height: e.nativeEvent.layout.height - BottomTabInset - Spacing.xl,
      })}>
      <Pressable onPress={() => setOpen(true)} accessibilityRole="button">
        <Card card={cards[0]} onDone={() => setOpen(true)} w={cardW} h={cardH} active map={map} />
      </Pressable>

      <Modal
        visible={open}
        animationType="fade"
        presentationStyle="fullScreen"
        onRequestClose={() => setOpen(false)}>
        <Reel
          cards={cards}
          accent={accent}
          map={map}
          onClose={() => setOpen(false)}
          onDone={() => { setOpen(false); onDone(); }}
        />
      </Modal>
    </View>
  );
}

function Reel({
  cards, onDone, onClose, accent, map,
}: {
  cards: HighlightCard[]; onDone: () => void; onClose: () => void;
  accent?: string | null; map?: MapData | null;
}) {
  const [index, setIndex] = useState(0);
  const pager = useRef<ScrollView>(null);
  const [box, setBox] = useState({ width: Dimensions.get('window').width, height: 0 });
  const width = box.width;
  // Portrait, capped by the height available. A card that fills whatever space
  // is left is a different shape on every phone, and these are made to be
  // screenshotted.
  const cardW = Math.min(width - Spacing.lg * 2, box.height ? box.height * SC.ratio : 9999);
  const cardH = cardW / SC.ratio;
  const tint = accent || c.accent;

  const goTo = (i: number) => {
    const next = Math.max(0, Math.min(cards.length - 1, i));
    setIndex(next);
    pager.current?.scrollTo({ x: next * width, animated: true });
  };

  /**
   * Save the card on screen.
   *
   * One ref per card, so what is captured is the card that is showing rather
   * than whichever one mounted last. Failures are swallowed on purpose: a
   * share sheet the person dismissed is not an error, and neither is a device
   * with no share targets, and putting an alert in front of either would be
   * the app complaining about something nobody did wrong.
   */
  const shots = useRef<Record<number, React.RefObject<View | null>>>({});
  const refFor = (i: number) => {
    if (!shots.current[i]) shots.current[i] = { current: null };
    return shots.current[i];
  };
  const [saving, setSaving] = useState(false);
  const save = async () => {
    const node = shots.current[index]?.current;
    if (!node || saving) return;
    setSaving(true);
    try {
      const uri = await captureRef(node, { format: 'png', quality: 1 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', UTI: 'public.png' });
      }
    } catch { /* dismissed, or nowhere to share to. Neither is a failure. */ }
    setSaving(false);
  };

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / Math.max(1, width));
    if (i !== index) setIndex(i);
  };

  if (!cards.length) return null;

  return (
    <View
      style={{ flex: 1, backgroundColor: '#0B0918' }}
      onLayout={(e) => setBox({
        width: e.nativeEvent.layout.width,
        // Room for the top bar, the progress row and the controls. No tab bar
        // inset: this is a modal and the tab bar is not under it. Reserving
        // for one clipped the bottom of the card, which is exactly where the
        // wordmark and the address sit, so the two things that make a
        // screenshot say where it came from were the two things cut off.
        height: e.nativeEvent.layout.height - 190,
      })}>
      {/* The way out, top right, where the website puts it. Without it the
          only exit from a full screen reel is the last card, and someone who
          has seen enough has no way to say so. */}
      <SafeAreaView>
        <View
          style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm,
          }}>
          <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
            <Text style={{ ...Type.eyebrow, color: `${WHITE}0.5)` }}>{'\u2039'}  Close</Text>
          </Pressable>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.lg }}>
            {/* Ellie: "I also want a share button on highlight storycards."
                What it sends is the card in front of them, in words: these are
                made to be shown to someone, which is what a storycard is for. */}
            <ShareButton
              tone="light"
              accessibilityLabel="Share this card"
              message={shareTextFor(cards[index]) }
              url={SITE_URL}
            />
            <Pressable onPress={onDone} hitSlop={12} accessibilityRole="button">
              <Text style={{ ...Type.eyebrow, color: Palette.white }}>Full results  {'\u2192'}</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>

      {/* block: highlights/progress */}
      {/* ── PROGRESS, ABOVE THE CARD ────────────────────────────────────
          The website puts it here and paints the active bar in the couple's
          colour. The app had it underneath in a generic orange, so the one
          piece of chrome telling you where you are in the sequence was in a
          different place and a different colour. */}
      <View
        style={{
          flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
          gap: Spacing.xs, paddingTop: Spacing.lg, paddingBottom: Spacing.md,
        }}>
        {cards.map((card, i) => (
          <Pressable
      accessibilityRole="button" key={card.id} onPress={() => goTo(i)} hitSlop={8}>
            <View
              style={{
                height: 4, width: i === index ? 28 : 18, borderRadius: 2,
                backgroundColor: i === index ? tint
                  : i < index ? `${WHITE}0.35)` : `${WHITE}0.15)`,
              }}
            />
          </Pressable>
        ))}
      </View>

      <ResultsScroll
        ref={pager}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        style={{ flex: 1 }}>
        {cards.map((card, i) => (
          <Pressable
            accessibilityRole="button"
            key={card.id}
            /**
             * ── WHICH SIDE WAS TAPPED ──────────────────────────────────────
             * Ellie: "On storycards, if I tap the left hand side of the page I
             * want it to go back a page."
             *
             * Which is how every story reel works, and the app only went
             * forward. A third of the width is the back half: it has to be
             * clearly a side rather than a sliver, and it has to leave the
             * middle to the card, where the buttons on the first and last card
             * are.
             *
             * The last card does not advance on tap. Tapping into nothing is
             * how someone decides a thing is broken, and it has its own button.
             */
            onPress={(e) => {
              const backward = e.nativeEvent.locationX < width / 3;
              if (backward) { goTo(i - 1); return; }
              if (i === cards.length - 1) return;
              goTo(i + 1);
            }}
            style={{ width, alignItems: 'center', justifyContent: 'flex-start' }}>
            <Card card={card} onDone={onDone} w={cardW} h={cardH} active={i === index} shotRef={refFor(i)} map={map} />
          </Pressable>
        ))}
      </ResultsScroll>

      {/* block: highlights/controls */}
      {/* ── PREVIOUS AND NEXT ───────────────────────────────────────────
          The website has both. Swiping is fine going forward and a chore
          going back, and on the last card a button is the only thing that
          says the sequence has an end. */}
      <View
        style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          paddingHorizontal: Spacing.xxl, paddingTop: Spacing.lg,
          paddingBottom: Spacing.xl,
        }}>
        <Round label="Previous" hidden={index === 0} onPress={() => goTo(index - 1)}>
          {'\u2039'}
        </Round>

        {/* ── SAVE ────────────────────────────────────────────────────────
            The website has a Download button on every card and its own copy
            says "Download any to share or save". The app had none, so the one
            thing these cards exist for was the one thing it could not do.

            Captured from the card's own view rather than the screen, so the
            image is the card and not the card plus a tab bar. It goes to the
            share sheet, which is the platform's way to save to Photos, send
            it, or put it in a message. */}
        <Pressable
          onPress={save}
          disabled={saving}
          accessibilityRole="button"
          style={{
            flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
            paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg,
            borderRadius: Radius.pill,
            backgroundColor: `${WHITE}0.1)`, borderColor: `${WHITE}0.15)`, borderWidth: 1,
            opacity: saving ? 0.5 : 1,
          }}>
          <Text style={{ ...Type.eyebrow, color: Palette.white }}>
            {saving ? 'Saving' : 'Save'}
          </Text>
        </Pressable>
        <Round
          label={index === cards.length - 1 ? 'Full results' : 'Next'}
          onPress={() => (index === cards.length - 1 ? onDone() : goTo(index + 1))}>
          {'\u203A'}
        </Round>
      </View>
    </View>
  );
}

/** One of the two round controls under the reel. */
function Round({
  children, label, onPress, hidden,
}: { children: string; label: string; onPress: () => void; hidden?: boolean }) {
  if (hidden) return <View style={{ width: 44, height: 44 }} />;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={{
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: `${WHITE}0.1)`, borderColor: `${WHITE}0.15)`, borderWidth: 1,
        alignItems: 'center', justifyContent: 'center',
      }}>
      <Text style={{ color: Palette.white, fontSize: 20, lineHeight: 24 }}>{children}</Text>
    </Pressable>
  );
}

function Card({
  card, onDone, w, h, active, shotRef, map,
}: {
  card: HighlightCard; onDone: () => void; w: number; h: number; active: boolean;
  shotRef?: React.RefObject<View | null>;
  map?: MapData | null;
}) {
  const tone = card.kind === 'couple-type'
    ? typeGround(card.accent)
    /* The admired card's ground is the orange half of its diagonal; the navy
       half is laid over it below. */
    : card.kind === 'admired'
      ? ADMIRED_GROUND
      : card.kind === 'sendoff'
        ? SENDOFF_GROUND
        /* The alignment card is the brand blue now, with the sunrise over it.
           It was green, which belonged to nothing. */
        : card.kind === 'stat-pair'
          ? STAT_PAIR_GROUND
          : ground(card.tone);

  // The entrance the website gives every card: up and in, once, on arrival.
  // An instant swap is what made the app's reel feel like a carousel of
  // panels rather than something being shown to you.
  const enter = useSharedValue(0);
  useEffect(() => {
    if (active) {
      enter.value = 0;
      enter.value = withTiming(1, { duration: 380 });
    }
  }, [active, enter]);
  const anim = useAnimatedStyle(() => ({
    opacity: enter.value,
    transform: [
      { translateY: (1 - enter.value) * 18 },
      { scale: 0.97 + enter.value * 0.03 },
    ],
  }));

  return (
    <Animated.View ref={shotRef} collapsable={false} style={[{ width: w, height: h }, anim]}>
      <LinearGradient
        colors={tone}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ flex: 1, borderRadius: Radius.xl, overflow: 'hidden' }}>
        {/* ── THE SUNRISE ON THE ALIGNMENT CARD ────────────────────────
            Ellie asked for "a circular, attune-orange glow from the bottom
            middle of the page". React Native has no radial gradient and this
            project has no SVG library, so it is the same trick the home
            screen's glow uses: many circles, each so faint its own edge is
            below the threshold an eye can find, stacked so the alpha builds
            toward the middle. Linear radii and a constant per-ring alpha give
            a cumulative falloff, which is a radial gradient.

            ── FAINTER, AND MANY MORE OF THEM ─────────────────────────────
            Ellie: "the sunrise effect looks great except that I can see the
            lines eminating, but I want it to look much more blended."

            Twenty-six rings at five and a half per cent each is a five and a
            half per cent step at every edge, and that is above the threshold.
            The peak is kept, because the brightness was right; it is reached
            in SUNRISE_RINGS steps instead, and the per-ring alpha is solved
            from the peak rather than typed, so changing the count cannot
            quietly change how bright the sunrise is. */}
        {card.kind === 'stat-pair' ? (
          <View pointerEvents="none" style={StyleSheet.absoluteFill}>
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
              {Array.from({ length: SUNRISE_RINGS }, (_, i) => {
                const size = w * 1.6 * (1 - i / SUNRISE_RINGS);
                return (
                  <View
                    key={i}
                    style={{
                      position: 'absolute',
                      bottom: -w * 0.45,
                      width: size, height: size, borderRadius: size / 2,
                      backgroundColor: `rgba(232,103,58,${SUNRISE_ALPHA})`,
                    }}
                  />
                );
              })}
            </View>
          </View>
        ) : null}

        {/* ── THE DIAGONAL ON THE ADMIRED CARD ─────────────────────────
            Ellie: "Diagonal divide from bottom left to top right of the
            screen, top left is the attune orange gradient and bottom right is
            the attune navy gradient."

            Drawn as one square rotated forty-five degrees, which is the only
            way to get a hard diagonal edge without an SVG library, and this
            project has none. The orange is the card's ground underneath.

            The first version put the square in the bottom right corner by eye
            and got the other diagonal: the divide ran from the top left corner
            down to the bottom right, so the orange was the top RIGHT and the
            navy the bottom LEFT. Both halves were on the wrong side of the
            line she asked for, and the name in the top left sat across both of
            them.

            So the placement is derived rather than nudged. Rotating a square
            by -45 degrees turns its top edge into a line running up and to the
            right, with the square itself covering everything below and right
            of that line, which is the navy half. The square is then placed so
            that edge passes through the card's bottom left corner: its centre
            has to sit at (0, h) plus half a side along the inward normal
            (0.7071, 0.7071), and `left`/`top` are that centre less half a
            side. Hence the 0.14645, which is 0.5 - 0.35355 and nothing else.

            SIDE is twice the card's perimeter-ish so the square's own corners
            are always far outside the card.

            ── AND IT PASSES THROUGH THE MIDDLE ───────────────────────────
            Ellie: "the blue and orange are currently very uneven. Can we make
            those 50/50 (move the diagonal split up a lot)."

            The edge ran through the bottom left corner, which put about four
            fifths of the card in the orange. Any straight line through a
            rectangle's centre cuts it into two equal halves, whatever its
            angle, so the fix is the centre point and nothing else: the
            geometry below is unchanged except for which point the edge is
            made to pass through. */}
        {card.kind === 'admired' ? (() => {
          const SIDE = (w + h) * 2;
          /**
           * Where the card sits along the square's own gradient.
           *
           * The square is several times the card's width, so without this the
           * card sees a sliver of the ramp and the navy reads as one flat
           * blue. The stops have to follow the square: moving it to the centre
           * for the 50/50 split shifted the card's slice by half a card width,
           * which clamped most of the visible half to the first colour and
           * turned the navy bright. Derived from LEFT rather than written down
           * so the next time the placement moves, this moves with it.
           */
          const LEFT = w / 2 - 0.14645 * SIDE;
          const FROM = -LEFT / SIDE;
          const SPAN = w / SIDE;
          return (
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              <LinearGradient
                colors={[Palette.indigo, '#2A3C86', '#16224F']}
                /* The square's own diagonal, rotated back by 45 degrees, runs
                   left to right in the card's space. But the square is several
                   times the card's width, so without locations the card sees a
                   sliver of the ramp and the navy reads as one flat blue. The
                   stops are pinned to the slice the card actually covers,
                   which is from the square's left inset to one card width
                   further along it. */
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                locations={[FROM, FROM + SPAN / 2, FROM + SPAN]}
                style={{
                  position: 'absolute',
                  width: SIDE, height: SIDE,
                  left: LEFT,
                  top: h / 2 - 0.14645 * SIDE,
                  transform: [{ rotate: '-45deg' }],
                }}
              />
            </View>
          );
        })() : null}

        {/* The stripe across the top. It is on the website's opener and it is
            the first thing anyone sees of this product. */}
        {card.kind === 'opener' ? (
          /* block: highlights/stripe */
          <LinearGradient
            colors={SC.stripe as [string, string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ height: 5 }}
          />
        ) : null}

        {/* The website pads a card 2.5rem; this was Spacing.xl, which is 24.
            Forty against twenty-four is most of why the app's cards looked
            tighter than the website's even where the type matched. */}
        <View style={{ flex: 1, padding: SC.padding * 16, justifyContent: 'center' }}>
          <Body card={card} onDone={onDone} map={map} w={w} />
        </View>

        {/* ── WHAT MAKES A SCREENSHOT STILL SAY WHERE IT CAME FROM ──────
            These cards exist to be shown to someone else. Without the
            wordmark and the address, a screenshot of one is an anonymous
            quote on a dark background. The website puts both on every card;
            the app had neither. */}
        <View
          style={{
            position: 'absolute', left: Spacing.lg, right: Spacing.lg, bottom: Spacing.md,
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          }}>
          {/* Ellie, from two screenshots: "the bottom left logo is different".
              The website sets the mark beside the word, at 45 per cent, and the
              app had the word on its own. A screenshot of a card is the thing
              these exist to make, and half of them were carrying half a logo.
              The mark is the PNG the rest of the app already uses, so this
              needs no new dependency. */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, opacity: 0.45 }}>
            <Image
              source={require('@/assets/images/attune-mark.png')}
              style={{ width: 22, height: 16 }}
              resizeMode="contain"
            />
            <Text style={t('wordmark', w)}>{SC.wordmark}</Text>
          </View>
          {/* block: highlights/watermark */}
          <Text style={t('siteLabel', w)}>
            {SC.siteLabel}
          </Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

function Body({ card, onDone, map, w }: {
  card: HighlightCard; onDone: () => void; map?: MapData | null; w: number;
}) {
  // Every size on this card comes from the shared scale, evaluated against
  // this card's width. Nothing below sets a font size of its own.
  const S = cardStyles(w);
  switch (card.kind) {
    case 'opener':
      return (
        <View style={{ alignItems: 'center' }}>
          <Eyebrow w={w}>{card.eyebrow}</Eyebrow>
          <Text style={[S.hero, { textAlign: 'center', marginTop: Spacing.lg }]}>
            {card.names?.you}
          </Text>
          <Text style={[S.amp, { marginVertical: Spacing.xs }]}>&</Text>
          <Text style={[S.hero, { textAlign: 'center' }]}>{card.names?.them}</Text>
          <Rule />
          {/* ── HER SECOND LINE, ON ONE LINE ──────────────────────────
              Ellie, twice: "Widen margins so that use insights to learn and
              grow together fit on one line", and then "Widen margin on
              storycard 1 so that 'use insights to learn and grow together'
              fits on one row."

              300 was a flat number, and it never bound: the card's own padding
              is forty points a side, so on this phone the line had 256 points
              whatever the maxWidth said, and 300 was simply never reached.

              A share of the card instead, which is what everything else on
              these cards is measured in, and wide enough to step outside the
              padding. The type scales with the card too, so the line fits at
              every width rather than at the one it was measured on. */}
          <Text style={[S.body, { textAlign: 'center', width: w * 0.92 }]}>{card.body}</Text>
          <Text style={[S.footer, { marginTop: Spacing.xxl }]}>{card.footer}</Text>
        </View>
      );

    case 'couple-type':
      /**
       * The website's card is built around the map. The app's drew the type
       * name in hero type and no map at all, so the card that is supposed to
       * show a couple where they sit showed them a label. Every string matched
       * and the card was a different card, which is why it survived the block
       * gate: presence is not shape.
       *
       * The map comes from the same coordinates and the same quadrant table
       * the couple type page uses. It is not on the card data, because the
       * card data is copy and the app already holds the numbers.
       */
      return (
        <View style={{ alignItems: 'center' }}>
          <Text style={[S.titleSm, { textAlign: 'center', maxWidth: 320 }]}>{card.title}</Text>
          {map ? (
            <View style={{ marginTop: Spacing.md, marginBottom: Spacing.sm }}>
              {/* The map is what this card is built around, so it takes a
                  fixed share of the card rather than a number of points. The
                  share is api/_lib/storycard-style.js's, which the website
                  draws from too: it was 168 here and 184 there. */}
              <CoupleMap
                a={map.a}
                b={map.b}
                aName={map.aName}
                bName={map.bName}
                quadrants={map.quadrants}
                size={Math.round(w * CARD_MAP_PCT)}
                /* Ellie: the axis labels were "way too small and very low
                   contrast" here. The map is drawn on cream on the couple type
                   page and on a dark gradient on this card, and it had one
                   label colour for both. */
                onDark
              />
            </View>
          ) : null}
          {/* "Your couple type: The Orbit" on one line, the way the website
              writes it, rather than a label under a headline. */}
          <Text style={[S.lead, { textAlign: 'center', marginTop: map ? Spacing.sm : Spacing.xl }]}>
            {card.typeLabel}
            {card.typeName ? ': ' : ''}
            {card.typeName ? (
              <Text style={{ fontWeight: '700', color: Palette.white }}>{card.typeName}</Text>
            ) : null}
          </Text>
          <Text style={[S.bodySm, { textAlign: 'center', marginTop: Spacing.sm, maxWidth: 260 }]}>{card.body}</Text>
        </View>
      );

    case 'dimensions': {
      /**
       * ── THE MARKS ON THIS CARD ────────────────────────────────────────
       * Ellie: "storycard 3 on the web has the dots with initials in them, but
       * on the app they are just smaller, colored dots", and "the app isn't
       * offsetting the overlapping dots, so I can't see mine."
       *
       * Both are the website's rules, and the app had neither: a flat 12 point
       * dot with no letter, no outline and no stagger, so a couple who answered
       * alike saw one dot and a couple who did not saw two anonymous ones.
       *
       * When the two initials are the same a letter says nothing, so the marks
       * lose their letters and the pair is named in a legend under the track,
       * which is what the website does and what she asked for.
       */
      const you = card.names?.you || '';
      const them = card.names?.them || '';
      const sameInitial = !!you && !!them
        && you.trim()[0]?.toUpperCase() === them.trim()[0]?.toUpperCase();
      return (
        <View>
          <Text style={[S.title, { marginBottom: Spacing.xl }]}>{card.title}</Text>
          {(card.dimensions || []).map((d) => {
            const [dyYou, dyThem] = cardNudge(markPct(d.a), markPct(d.b));
            return (
              <View key={d.key} style={{ marginBottom: Spacing.lg }}>
                <Text style={[S.label, { marginBottom: Spacing.xs }]}>{d.label}</Text>
                {/* ── THE POLES SIT EITHER SIDE ──────────────────────────
                    Ellie: "I want pole labels on the left and right of the rows
                    on storycard 3, not below like they currently are."

                    Which is also how the results pages draw the same thing, so
                    the card and the page a reader opens next now agree. The
                    track is tall enough for a staggered pair: the marks step up
                    and down off the line and a short row clipped them. */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                  <Text style={[S.small, { width: 76, textAlign: 'right' }]} numberOfLines={2}>
                    {d.left}
                  </Text>
                  <View style={{ flex: 1, height: 34, justifyContent: 'center' }}>
                    <View style={{ height: 6, borderRadius: 3, backgroundColor: `${WHITE}0.12)` }} />
                    <Dot value={d.a} colour={SC.people.you} label={sameInitial ? '' : you} dy={dyYou} w={w} />
                    <Dot value={d.b} colour={SC.people.them} label={sameInitial ? '' : them} dy={dyThem} w={w} />
                  </View>
                  <Text style={[S.small, { width: 76 }]} numberOfLines={2}>{d.right}</Text>
                </View>
              </View>
            );
          })}
          {sameInitial ? (
            <View style={{ flexDirection: 'row', justifyContent: 'center', gap: Spacing.lg, marginTop: Spacing.xs }}>
              {[{ n: you, col: SC.people.you }, { n: them, col: SC.people.them }].map((x) => (
                <View key={x.n} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: x.col }} />
                  <Text style={S.small}>{x.n}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      );
    }

    case 'stat-pair':
      /**
       * ── THE SUNRISE ────────────────────────────────────────────────────
       * Ellie: "I'd like the page to be attune blue gradient, and have a
       * 'sunrise' effect with a circular, attune-orange glow from the bottom
       * middle of the page."
       *
       * The glow is drawn by the card face, so it reaches the edges; see the
       * note there. This is the content: the lead, the figure, and the two
       * call-outs under it in her words.
       */
      return (
        <View>
          <Text style={[S.leadLg, { textAlign: 'center' }]}>{card.lead}</Text>
          <Text style={[S.stat, { textAlign: 'center' }]}>{card.stat}</Text>
          <Text style={[S.statLabel, { textAlign: 'center', marginBottom: Spacing.xl }]}>{card.statLabel}</Text>
          {/* Green for closest, orange for furthest, from the server. Both
              tiles were the same grey here, so the card named two dimensions
              and left the reader to guess which was the one they agree on. */}
          {(card.callouts || []).filter((x) => x.value).map((x) => (
            <View
              key={x.label}
              style={{
                backgroundColor: x.tint || `${WHITE}0.08)`,
                borderColor: x.border || `${WHITE}0.18)`, borderWidth: 1,
                borderRadius: Radius.md, padding: Spacing.lg, marginBottom: Spacing.md,
              }}>
              <Text style={[S.label, x.color ? { color: x.color } : null]}>{x.label}</Text>
              <Text style={[S.value, { marginTop: Spacing.xs }]}>{x.value}</Text>
            </View>
          ))}
          <Text style={[S.bodySmDim, { marginTop: Spacing.md }]}>{card.body}</Text>
        </View>
      );

    case 'stat-rings':
      /* The figure is stepped by the same thresholds the website steps it by,
         and the two rings carry their own colours. Both came from the server
         rather than being written here, so there is no second palette. The app
         printed all three in white, which meant 82% and 34% looked alike and
         the two rings read as one measurement drawn twice. */
      return (
        <View style={{ alignItems: 'center' }}>
          <Eyebrow w={w} role="eyebrowMd">{card.eyebrow}</Eyebrow>
          <Text style={[S.statBig, card.statColor ? { color: card.statColor } : null]}>{card.stat}</Text>
          <Text style={[S.statLabelSm, { marginBottom: Spacing.xxl }]}>{card.statLabel}</Text>
          <View style={{ flexDirection: 'row', gap: Spacing.xl }}>
            {(card.rings || []).map((r) => (
              <Donut key={r.label} pct={r.pct} label={r.label} color={r.color} />
            ))}
          </View>
        </View>
      );

    case 'admired':
      /**
       * ── A DIAGONAL, NOT TWO CARDS ──────────────────────────────────────
       * Ellie: "Diagonal divide from bottom left to top right of the screen,
       * top left is the attune orange gradient and bottom right is the attune
       * navy gradient. Top left says ellie is most admired for her steadiness.
       * Bottom right says preston is most admired for his patience. All text in
       * playfair display."
       *
       * The two grounds are drawn by the card face itself rather than here, so
       * they reach the edges: see `admiredGrounds` below. This lays the two
       * sentences into the two halves, each pulled toward its own corner.
       *
       * The sentences arrive whole, with the possessive already resolved from
       * each person's pronouns. Building them here would be a second copy of
       * that rule in a file that cannot see a profile.
       */
      return (
        /* Ellie: "move the text so it isn't so close to the corners of the
           card." Inset from the top and the bottom as well as pulled in from
           the side each sentence is aligned to, so neither reads as having
           been pushed into a corner. */
        <View style={{ flex: 1, justifyContent: 'space-between', paddingVertical: Spacing.xl }}>
          {(card.rows || []).slice(0, 2).map((r, i) => (
            <View
              key={r.name}
              style={{
                maxWidth: '74%',
                alignSelf: i === 0 ? 'flex-start' : 'flex-end',
                paddingLeft: i === 0 ? 0 : Spacing.md,
                paddingRight: i === 0 ? Spacing.md : 0,
              }}>
              <Text
                style={[
                  S.titleMd,
                  { textAlign: i === 0 ? 'left' : 'right' },
                ]}>
                {r.line || `${r.name} is most admired for ${(r.admired || '').toLowerCase()}`}
              </Text>
            </View>
          ))}
        </View>
      );

    case 'named-dimension':
      return (
        <View style={{ alignItems: 'center' }}>
          <Eyebrow w={w} role="eyebrowTint">{card.eyebrow}</Eyebrow>
          <Text style={[S.bodyMd, { marginTop: Spacing.md }]}>{card.title}</Text>
          <Text style={[S.statMid, { textAlign: 'center', marginTop: Spacing.sm }]}>{card.value}</Text>
          {card.body ? (
            <Text style={[S.bodyMd, { textAlign: 'center', marginTop: Spacing.xl, fontFamily: Fonts.bodyItalic, maxWidth: 280 }]}>
              {card.body}
            </Text>
          ) : null}
        </View>
      );

    case 'quote':
      return (
        <View style={{ alignItems: 'center' }}>
          <Text style={[S.bodyLg, { textAlign: 'center', maxWidth: 300 }]}>{card.lead}</Text>
          <Text style={[S.listLabel, { textAlign: 'center', marginTop: Spacing.xl }]}>{card.eyebrow}</Text>
          <View
            style={{
              backgroundColor: `${WHITE}0.1)`, borderColor: `${WHITE}0.22)`, borderWidth: 1,
              borderRadius: Radius.lg, padding: Spacing.xl, marginTop: Spacing.md,
            }}>
            {/* Playfair's italic, by name. `fontStyle` draws nothing on a
                registered family; the face is bundled now. */}
            <Text style={[S.quote, { fontFamily: Fonts.displayItalic, textAlign: 'center' }]}>
              {card.quote}
            </Text>
          </View>
          {/* The citation, when there is one. A claim about research with no
              source on it is the one thing this product must not print, and
              the insight of the day is exactly that kind of claim. */}
          {card.body ? (
            <Text style={[S.footer, { textAlign: 'center', marginTop: Spacing.lg }]}>
              {card.body}
            </Text>
          ) : null}
        </View>
      );

    case 'sendoff':
      /**
       * ── THE LAST CARD IS THE BUTTON ────────────────────────────────────
       * Ellie: "Change final storycard. full page should be the attune
       * gradient orange to blue, large button in the middle that says explore
       * your full results."
       *
       * So the two sentences that were here are gone and the card is one
       * thing. The gradient is the card's own ground, from SENDOFF_GROUND; the
       * button is white on it, because a coloured button on a coloured ground
       * is two colours arguing and this is the one control in the whole reel.
       */
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Pressable
            accessibilityRole="button"
            onPress={onDone}
            style={{
              backgroundColor: Palette.white, borderRadius: Radius.pill,
              paddingVertical: Spacing.lg, paddingHorizontal: Spacing.xxl,
              alignItems: 'center',
            }}>
            <Text style={[t('cta', w), { color: Palette.ink }]}>
              {card.cta}
            </Text>
          </Pressable>
        </View>
      );

    default:
      return null;
  }
}

/**
 * One ring, filled to a percentage.
 *
 * ── WHY IT IS BUILT OUT OF HALF CIRCLES ───────────────────────────────────
 * The website draws these as an SVG arc. react-native-svg is not a dependency
 * of this app and the couple map already made the call that a two by two grid
 * with two dots on it is not worth adding one. Neither is a ring.
 *
 * So: a grey ring, then two half-circle masks rotated to expose the arc. Up to
 * fifty per cent one half rotates; past it, the first half is pinned open and
 * the second rotates the rest. That is the standard trick and it is exact, not
 * an approximation.
 *
 * The app printed a bare percentage here instead, which reads as a statistic
 * rather than a share of something, and is the one card where the website's
 * shape is doing the explaining.
 */
function Donut({ pct, label, color }: { pct: number; label: string; color?: string | null }) {
  const SIZE = 84;
  const RING = 9;
  const clamped = Math.max(0, Math.min(100, pct));
  const deg = (clamped / 100) * 360;

  /**
   * Where each half has to be rotated, derived rather than guessed.
   *
   * On a circular View, each border side paints a 90 degree arc: top spans
   * -45 to +45 measuring clockwise from twelve o'clock, right spans 45 to 135,
   * and so on. So top plus right paints the 180 degree arc from -45 to 135.
   *
   * Clip that to the right half, [0, 180], and require the visible part to be
   * exactly [0, d]. Then 135 + r = d, so r = d - 135. The same element clipped
   * to the left half, [180, 360], gives [180, deg] under the same rotation.
   *
   * The right half has to stop at 180 or it rotates out of its own clip and
   * the ring vanishes at high percentages: the first version of this drew a
   * gap at 100 per cent, which is the one value that has to look complete.
   */
  const rRight = Math.min(deg, 180) - 135;
  const rLeft = deg - 135;

  const arc = (rotate: number) => (
    <View
      style={{
        width: SIZE, height: SIZE, borderRadius: SIZE / 2,
        borderWidth: RING, borderColor: 'transparent',
        borderTopColor: color || Palette.white, borderRightColor: color || Palette.white,
        transform: [{ rotate: `${rotate}deg` }],
      }}
    />
  );

  return (
    <View style={{ alignItems: 'center' }}>
      <View style={{ width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' }}>
        <View
          style={{
            position: 'absolute', width: SIZE, height: SIZE, borderRadius: SIZE / 2,
            borderWidth: RING, borderColor: `${WHITE}0.14)`,
          }}
        />
        {/* Right half of the sweep. */}
        <View style={{ position: 'absolute', left: SIZE / 2, width: SIZE / 2, height: SIZE, overflow: 'hidden' }}>
          <View style={{ marginLeft: -SIZE / 2 }}>{arc(rRight)}</View>
        </View>
        {/* Left half, only once past halfway. */}
        {deg > 180 ? (
          <View style={{ position: 'absolute', left: 0, width: SIZE / 2, height: SIZE, overflow: 'hidden' }}>
            {arc(rLeft)}
          </View>
        ) : null}
        <Text style={t('calloutValue', SC.typeRefWidth)}>{clamped}%</Text>
      </View>
      <Text style={[t('bodySm', SC.typeRefWidth), { marginTop: Spacing.sm, textAlign: 'center', maxWidth: 110 }]}>{label}</Text>
    </View>
  );
}

/** A partner's position on a scale, 1 to 5. */
/**
 * The placement rule, from api/_lib/track-marks.js.
 *
 * Named here rather than imported because this is a separate Expo project that
 * does not build against api/. check-track-marks.mjs fails the build if these
 * stop matching that file, which is the documented arrangement: derive where
 * you can, gate where you genuinely cannot.
 */
const CARD_SCALE_MAX = 5;
const CLOSE_PCT = 8;
const STAGGER = 7;

/** The couple map's width as a share of the card. api/_lib/storycard-style.js. */
const CARD_MAP_PCT = 0.72;

/**
 * Where a mark sits on a storycard track, as a percentage.
 *
 * The scale's top is api/_lib/track-marks.js's, which the website's copy of
 * this card also divides by. It divided by 5 there and this divided by 4 after
 * subtracting 1, so the same answer sat in two different places on what is
 * meant to be one card. check-track-marks.mjs holds the number.
 */
function markPct(value: number | null): number | null {
  if (value == null) return null;
  return Math.max(0, Math.min(1, value / CARD_SCALE_MAX)) * 100;
}

/** Two marks that land close together step off the line, in opposite directions. */
function cardNudge(a: number | null, b: number | null): [number, number] {
  if (a == null || b == null || Math.abs(a - b) >= CLOSE_PCT) return [0, 0];
  return a <= b ? [-STAGGER, STAGGER] : [STAGGER, -STAGGER];
}

/**
 * One person's mark: their colour, their initial, and a white outline so the
 * front one of a staggered pair stays legible over the back one.
 */
function Dot({ value, colour, label = '', dy = 0, w }: {
  value: number | null; colour: string; label?: string; dy?: number;
  /** The card's width, which every size on a card is measured against. */
  w: number;
}) {
  const pct = markPct(value);
  if (pct == null) return null;
  return (
    <View
      style={{
        // Centred on the track and then stepped, rather than left to its
        // static position: an absolutely positioned child of a centred row has
        // no defined top in React Native, and `dy` is points, not a multiple.
        position: 'absolute', top: '50%', left: `${pct}%`,
        marginLeft: -11, marginTop: -11 + dy,
        width: 22, height: 22, borderRadius: 11, backgroundColor: colour,
        borderWidth: 2.5, borderColor: Palette.white,
        alignItems: 'center', justifyContent: 'center',
      }}>
      {label ? (
        <Text style={t('mark', w)}>{label.trim()[0]?.toUpperCase()}</Text>
      ) : null}
    </View>
  );
}

/**
 * The line under the couple's names.
 *
 * Ellie, from two screenshots side by side: "the line is colored differently".
 * The website draws it as a gradient from the orange to the indigo, the two
 * ends of the brand; this drew it in one flat accent, so the one element on
 * the card that is pure brand was the wrong colour on half the product.
 *
 * Its colours and its size come from the payload with everything else.
 */
function Rule() {
  const r = SC.rule || { gradient: ['#E8673A', '#1B5FE8'], width: 40, height: 2 };
  return (
    <LinearGradient
      colors={r.gradient as [string, string]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={{
        width: r.width, height: r.height, borderRadius: r.height,
        marginVertical: Spacing.xl,
      }}
    />
  );
}

function Eyebrow({ children, w, role = 'eyebrow' }: { children?: string; w: number; role?: string }) {
  if (!children) return null;
  return <Text style={t(role, w)}>{children}</Text>;
}

/**
 * Every text role on a card, from the shared scale, at this card's width.
 *
 * These were six constants built from the app's own Type tokens, which is how
 * the two surfaces drifted: the tokens are right for the rest of the app and
 * were never the website's storycard sizes.
 */
function cardStyles(w: number) {
  return {
    hero: t('names', w),
    amp: t('amp', w),
    title: t('title', w),
    titleSm: t('titleSm', w),
    titleMd: t('titleMd', w),
    titleLg: t('titleLg', w),
    body: t('body', w),
    bodySm: t('bodySm', w),
    // The same role a shade quieter, the way the website writes it on the card
    // that closes with a sentence under two call-outs.
    bodySmDim: t('bodySm', w, { alpha: 0.5 }),
    bodyMd: t('bodyMd', w),
    bodyLg: t('bodyLg', w),
    lead: t('lead', w),
    leadLg: t('leadLg', w),
    small: t('bodySm', w),
    caption: t('caption', w),
    ctaAlt: t('ctaAlt', w),
    label: t('calloutLabel', w),
    listLabel: t('listLabel', w),
    value: t('calloutValue', w),
    quote: t('quote', w),
    eyebrow: t('eyebrow', w),
    footer: t('footer', w),
    stat: t('stat', w),
    statMid: t('statMid', w),
    statBig: t('statBig', w),
    statLabel: t('statLabel', w),
    statLabelSm: t('statLabelSm', w),
  };
}
/*
 * The stat figure and its line box were computed here, with a ratio kept so a
 * card that was already right would not move. Both live in the shared scale
 * now, as `stat` and `statBig`, with the line height derived from the size the
 * same way on both surfaces. The bug the ratio was written for, a line box
 * shorter than the glyph clipping "80%" from the top, cannot come back from an
 * override, because there are no overrides left.
 */
