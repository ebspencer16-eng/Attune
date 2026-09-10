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
};

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

        <View style={{ flex: 1, padding: Spacing.xl, justifyContent: 'center' }}>
          <Body card={card} onDone={onDone} map={map} />
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
          <Text style={{ ...Type.cardTitle, fontFamily: Type.title.fontFamily, fontSize: 14, color: `${WHITE}0.55)` }}>
            {SC.wordmark}
          </Text>
          {/* block: highlights/watermark */}
          <Text style={{ ...Type.eyebrow, fontSize: 8, letterSpacing: 1.2, textTransform: 'lowercase', color: `${WHITE}0.35)` }}>
            {SC.siteLabel}
          </Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

function Body({ card, onDone, map }: { card: HighlightCard; onDone: () => void; map?: MapData | null }) {
  switch (card.kind) {
    case 'opener':
      return (
        <View style={{ alignItems: 'center' }}>
          <Eyebrow>{card.eyebrow}</Eyebrow>
          <Text style={[hero, { textAlign: 'center', marginTop: Spacing.lg }]}>
            {card.names?.you}
          </Text>
          <Text style={[hero, { color: `${WHITE}0.45)`, fontSize: 28, marginVertical: Spacing.xs }]}>&</Text>
          <Text style={[hero, { textAlign: 'center' }]}>{card.names?.them}</Text>
          <Rule />
          <Text style={[body, { textAlign: 'center', maxWidth: 260 }]}>{card.body}</Text>
          <Text style={[footer, { marginTop: Spacing.xxl }]}>{card.footer}</Text>
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
          <Text style={[title, { textAlign: 'center', maxWidth: 320 }]}>{card.title}</Text>
          {map ? (
            <View style={{ marginTop: Spacing.md, marginBottom: Spacing.sm }}>
              <CoupleMap
                a={map.a}
                b={map.b}
                aName={map.aName}
                bName={map.bName}
                quadrants={map.quadrants}
                size={168}
              />
            </View>
          ) : null}
          {/* "Your couple type: The Orbit" on one line, the way the website
              writes it, rather than a label under a headline. */}
          <Text style={[body, { textAlign: 'center', marginTop: map ? Spacing.sm : Spacing.xl, color: `${WHITE}0.85)` }]}>
            {card.typeLabel}
            {card.typeName ? ': ' : ''}
            {card.typeName ? (
              <Text style={{ fontWeight: '700', color: Palette.white }}>{card.typeName}</Text>
            ) : null}
          </Text>
          <Text style={[body, { textAlign: 'center', marginTop: Spacing.sm, maxWidth: 260 }]}>{card.body}</Text>
        </View>
      );

    case 'dimensions':
      return (
        <View>
          <Text style={[title, { marginBottom: Spacing.xl }]}>{card.title}</Text>
          {(card.dimensions || []).map((d) => (
            <View key={d.key} style={{ marginBottom: Spacing.lg }}>
              <Text style={[label, { marginBottom: Spacing.xs }]}>{d.label}</Text>
              <View style={{ height: 20, justifyContent: 'center' }}>
                <View style={{ height: 2, borderRadius: 2, backgroundColor: `${WHITE}0.18)` }} />
                <Dot value={d.a} colour="#E8673A" />
                <Dot value={d.b} colour="#7FB2FF" />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 }}>
                <Text style={small}>{d.left}</Text>
                <Text style={small}>{d.right}</Text>
              </View>
            </View>
          ))}
        </View>
      );

    case 'stat-pair':
      return (
        <View>
          <Text style={[body, { textAlign: 'center' }]}>{card.lead}</Text>
          <Text style={[stat, { textAlign: 'center' }]}>{card.stat}</Text>
          <Text style={[body, { textAlign: 'center', marginBottom: Spacing.xl }]}>{card.statLabel}</Text>
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
              <Text style={[label, x.color ? { color: x.color } : null]}>{x.label}</Text>
              <Text style={[title, { fontSize: 20, marginTop: Spacing.xs }]}>{x.value}</Text>
            </View>
          ))}
          <Text style={[body, { marginTop: Spacing.md }]}>{card.body}</Text>
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
          <Eyebrow>{card.eyebrow}</Eyebrow>
          <Text style={[statAt(72), { color: card.statColor || Palette.white }]}>{card.stat}</Text>
          <Text style={[body, { marginBottom: Spacing.xxl }]}>{card.statLabel}</Text>
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
          <Text style={[title, { marginBottom: Spacing.xl }]}>{card.title}</Text>
          {(card.rows || []).map((r) => (
            <View
              key={r.name}
              style={{
                backgroundColor: `${WHITE}0.06)`, borderColor: `${WHITE}0.12)`, borderWidth: 1,
                borderRadius: Radius.lg, padding: Spacing.lg, marginBottom: Spacing.md,
              }}>
              <Text style={small}>{r.name} is most admired for</Text>
              <Text style={[hero, { fontSize: 28, marginTop: Spacing.xs }]}>
                {(r.admired || '').toLowerCase()}
              </Text>
            </View>
          ))}
        </View>
      );

    case 'named-dimension':
      return (
        <View style={{ alignItems: 'center' }}>
          <Eyebrow>{card.eyebrow}</Eyebrow>
          <Text style={[body, { marginTop: Spacing.md }]}>{card.title}</Text>
          <Text style={[hero, { textAlign: 'center', marginTop: Spacing.sm }]}>{card.value}</Text>
          {card.body ? (
            <Text style={[body, { textAlign: 'center', marginTop: Spacing.xl, fontStyle: 'italic', maxWidth: 280 }]}>
              {card.body}
            </Text>
          ) : null}
        </View>
      );

    case 'quote':
      return (
        <View style={{ alignItems: 'center' }}>
          <Text style={[body, { textAlign: 'center', maxWidth: 300 }]}>{card.lead}</Text>
          <Text style={[label, { textAlign: 'center', marginTop: Spacing.xl }]}>{card.eyebrow}</Text>
          <View
            style={{
              backgroundColor: `${WHITE}0.1)`, borderColor: `${WHITE}0.22)`, borderWidth: 1,
              borderRadius: Radius.lg, padding: Spacing.xl, marginTop: Spacing.md,
            }}>
            <Text style={[title, { fontSize: 20, fontStyle: 'italic', textAlign: 'center' }]}>
              {card.quote}
            </Text>
          </View>
        </View>
      );

    case 'sendoff':
      return (
        <View style={{ alignItems: 'center' }}>
          <Rule />
          <Text style={[title, { textAlign: 'center' }]}>{card.title}</Text>
          <Text style={[body, { textAlign: 'center', marginTop: Spacing.md, marginBottom: Spacing.xxl }]}>
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
            <Text style={{ ...Type.small, color: Palette.white, fontWeight: '700' }}>
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
        <Text style={{ ...Type.title, fontSize: 20, color: Palette.white }}>{clamped}%</Text>
      </View>
      <Text style={[small, { marginTop: Spacing.sm, textAlign: 'center', maxWidth: 110 }]}>{label}</Text>
    </View>
  );
}

/** A partner's position on a scale, 1 to 5. */
function Dot({ value, colour }: { value: number | null; colour: string }) {
  if (value == null) return null;
  const pct = Math.max(0, Math.min(1, (value - 1) / 4)) * 100;
  return (
    <View
      style={{
        position: 'absolute', left: `${pct}%`, marginLeft: -6,
        width: 12, height: 12, borderRadius: 6, backgroundColor: colour,
      }}
    />
  );
}

function Rule() {
  return (
    <View
      style={{
        width: 40, height: 2, borderRadius: 2, backgroundColor: c.accent,
        marginVertical: Spacing.xl,
      }}
    />
  );
}

function Eyebrow({ children }: { children?: string }) {
  if (!children) return null;
  return <Text style={{ ...Type.eyebrow, color: `${WHITE}0.45)` }}>{children}</Text>;
}

const hero = { ...Type.hero, color: Palette.white } as const;
const title = { ...Type.title, color: Palette.white } as const;
const body = { ...Type.body, color: `${WHITE}0.68)` } as const;
const small = { ...Type.small, color: `${WHITE}0.55)` } as const;
const label = { ...Type.eyebrow, color: `${WHITE}0.5)` } as const;
const footer = { ...Type.eyebrow, color: `${WHITE}0.32)` } as const;
/**
 * A big figure, with its line box.
 *
 * ── WHY THIS IS A FUNCTION ────────────────────────────────────────────────
 * It was an object with fontSize 64 and lineHeight 66 on it, and the
 * expectations card overrode the size to 72 and left the line height alone. A
 * line box shorter than the glyph clips it, and React Native clips from the
 * top, so "80%" lost its upper edge. Ellie: "Storycard 5 '80%' text is cut off
 * on top."
 *
 * Nothing was wrong on the card that reported it either: card four sets no
 * size and reads correctly at 64 in a 66 box. The bug was only ever in the
 * override, which is the argument for not letting the two be set separately.
 *
 * The ratio is the original's, so the card that was already right does not
 * move.
 */
const STAT_LINE_RATIO = 66 / 64;

const statAt = (size: number) => ({
  ...Type.hero,
  color: Palette.white,
  fontSize: size,
  lineHeight: Math.ceil(size * STAT_LINE_RATIO),
  marginTop: Spacing.sm,
});

const stat = statAt(64);
