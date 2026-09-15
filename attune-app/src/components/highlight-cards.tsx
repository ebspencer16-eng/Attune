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
  ScrollView, Text, View,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

import type { HighlightCard, PersonResults } from '@/api/client';
import CoupleMap from '@/components/couple-map';

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
  if (!base) return {};
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
    ...(spec.lh != null ? { lineHeight: Math.ceil(fontSize * spec.lh) } : {}),
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
          <Pressable onPress={onDone} hitSlop={12} accessibilityRole="button">
            <Text style={{ ...Type.eyebrow, color: Palette.white }}>Full results  {'\u2192'}</Text>
          </Pressable>
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

      <ScrollView
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
            // Tapping advances, the way the website's cards do. The last card
            // has its own button instead, because tapping into nothing is how
            // someone decides the thing is broken.
            onPress={() => (i === cards.length - 1 ? onDone() : goTo(i + 1))}
            style={{ width, alignItems: 'center', justifyContent: 'flex-start' }}>
            <Card card={card} onDone={onDone} w={cardW} h={cardH} active={i === index} shotRef={refFor(i)} map={map} />
          </Pressable>
        ))}
      </ScrollView>

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
          <Text style={[S.body, { textAlign: 'center', maxWidth: 260 }]}>{card.body}</Text>
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
                {/* Tall enough for a staggered pair: the marks move up and down
                    off the line, and a 20 point row clipped them. */}
                <View style={{ height: 34, justifyContent: 'center' }}>
                  <View style={{ height: 6, borderRadius: 3, backgroundColor: `${WHITE}0.12)` }} />
                  <Dot value={d.a} colour={SC.people.you} label={sameInitial ? '' : you} dy={dyYou} w={w} />
                  <Dot value={d.b} colour={SC.people.them} label={sameInitial ? '' : them} dy={dyThem} w={w} />
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
                  <Text style={S.small}>{d.left}</Text>
                  <Text style={S.small}>{d.right}</Text>
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
      return (
        <View>
          <Text style={[S.title, { marginBottom: Spacing.xl }]}>{card.title}</Text>
          {(card.rows || []).map((r) => (
            <View
              key={r.name}
              style={{
                backgroundColor: `${WHITE}0.06)`, borderColor: `${WHITE}0.12)`, borderWidth: 1,
                borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.md,
              }}>
              <Text style={S.caption}>{r.name} is most admired for</Text>
              <Text style={[S.titleMd, { marginTop: Spacing.xs }]}>
                {(r.admired || '').toLowerCase()}
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
            <Text style={[S.bodyMd, { textAlign: 'center', marginTop: Spacing.xl, fontStyle: 'italic', maxWidth: 280 }]}>
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
            <Text style={[S.quote, { fontStyle: 'italic', textAlign: 'center' }]}>
              {card.quote}
            </Text>
          </View>
        </View>
      );

    case 'sendoff':
      return (
        <View style={{ alignItems: 'center' }}>
          <Rule />
          <Text style={[S.titleLg, { textAlign: 'center' }]}>{card.title}</Text>
          <Text style={[S.bodyLg, { textAlign: 'center', marginTop: Spacing.md, marginBottom: Spacing.xxl }]}>
            {card.body}
          </Text>
          <Pressable
      accessibilityRole="button"
            onPress={onDone}
            style={{
              backgroundColor: c.accent, borderRadius: Radius.md,
              paddingVertical: Spacing.md, paddingHorizontal: Spacing.xxl, width: '100%',
              alignItems: 'center',
            }}>
            <Text style={[t('cta', w), { color: Palette.white }]}>
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
const CARD_MAP_PCT = 0.56;

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
        position: 'absolute', left: `${pct}%`, marginLeft: -11, marginTop: dy * 2,
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
