/**
 * The couple map: where each of you sits on two axes, together.
 *
 * ── WHY IT LOOKS LIKE THIS ────────────────────────────────────────────────
 * It is the same map as the website's, drawn the same way round. Open is left
 * and Guarded is right; Engage is top and Withdraw is bottom. So the four
 * quadrants read: Initiator top-left, Anchor top-right, Feeler bottom-left,
 * Protector bottom-right.
 *
 * Nothing here decides anything. The two positions arrive from the server as
 * `coords` (0..1 on each axis) and the quadrant names and colours arrive as
 * `mapQuadrants`, because the app never scores and never holds a second copy
 * of a colour table.
 *
 * ── WHY IT IS NOT AN SVG ──────────────────────────────────────────────────
 * The website draws it as one, and the obvious port would be react-native-svg.
 * This is a two by two grid with two dots on it, which plain views do exactly
 * as well, and it is not worth a dependency the app does not otherwise need.
 *
 * ── THE TWO NAME TAGS ─────────────────────────────────────────────────────
 * They are placed above and below by whichever dot is higher, which is what
 * the website does, and for the same reason: when two people sit close
 * together the tags would otherwise land on top of each other. Each name keeps
 * its own colour whichever slot it lands in.
 */

import { useEffect, useState } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
/* The app's own Pressable, which dims and sinks on press. React Native's has
   no pressed appearance, and check-press-feedback is right to insist: a dot
   that does nothing visible when touched reads as a dot that is not a
   control. */
import { Pressable } from '@/components/pressable';

import { Colors, Fonts, Radius, Spacing, Type } from '@/constants/attune-theme';
import { Prose } from '@/components/annotation-context';
import type { AxisCopy, IndividualProfile, PersonResults } from '@/api/client';

const c = Colors.light;

type Quadrant = { code: string; name: string; color: string; fill: string };

/**
 * The margin each rotated axis label sits in.
 *
 * Open and Guarded belong at the left and right of this map, which is where
 * the website puts them, and a phone has no room for them lying flat: the
 * right hand one rendered as "GUARDE". Turned on their sides they need about
 * twenty points each and read as the edges of the field rather than as a third
 * row of labels under it.
 */
const SIDE = 22;

/**
 * How big the map is allowed to be, and why it is not a share of the screen.
 *
 * ── WHAT WAS WRONG WITH A FRACTION ────────────────────────────────────────
 * Ellie: "Can the height adjust based on the device it's being viewed on? So
 * that the max height is used? 227 looks right on the simulator of a 17 but on
 * my pro max it looks small."
 *
 * It was `height * 0.26`, tuned on an iPhone 17 so that the whole couple type
 * tile fits on screen, which is what she asked for before. A fraction is the
 * wrong shape for this. Everything BELOW the map is a fixed number of points:
 * an eyebrow, a tile with two lines of type in it, the tab bar. Those do not
 * get taller on a bigger phone. So a bigger phone has MORE spare height, and a
 * fraction gives the map a smaller share of it rather than the whole of it.
 *
 *   iPhone 17       874 tall     a quarter is 227, and 227 is right
 *   iPhone Pro Max  956 tall     a quarter is 249, and about 309 would fit
 *
 * ── SO IT IS A SUBTRACTION ────────────────────────────────────────────────
 * `height - ROOM_BELOW`. The reserve is derived from the one measurement that
 * has her approval: 227 was right at 874, so the room everything else needs is
 * 874 - 227. If the page above or below the map changes, re-measure on one
 * device and this follows on every other.
 *
 * The assumption is written down because it is the thing that can go wrong:
 * that the chrome and the type tile are the same height on every phone. They
 * are, because their type is set in points and none of it wraps differently at
 * these widths. A phone narrow enough to wrap the tile's tagline onto a third
 * line would need the floor below.
 */
const ROOM_BELOW = 647;

/** Never smaller than this, even if the arithmetic says so. On a phone short
 *  enough to want it, the type tile going below the fold is the lesser of the
 *  two evils: a map too small to read is no money slide at all. */
const MAP_MIN = 200;

/** And never a huge square on a tablet. */
const MAP_MAX = 320;

/** Fallback used only when an older cached payload carries no quadrants. */
const AXIS = { left: 'Open', right: 'Guarded', top: 'Engage', bottom: 'Withdraw' };

export default function CoupleMap({
  a, b, aName, bName, quadrants, size: fixedSize, onDark, axes, profiles, interactive,
}: {
  a: PersonResults | null;
  b: PersonResults | null;
  aName: string;
  bName: string;
  quadrants?: Quadrant[];
  /** Drawn on a storycard rather than on the cream page. */
  onDark?: boolean;
  size?: number;
  /**
   * What the two axes mean, from the payload. The pole names come with them,
   * so the four words on the edges of this map are the same four words the
   * website's map draws rather than a second copy of them.
   */
  axes?: AxisCopy[];
  /** Each person's own paragraph, shown behind their dot. */
  profiles?: { a: IndividualProfile | null; b: IndividualProfile | null };
  /**
   * Whether the dots and the question marks do anything.
   *
   * Off on a storycard, which is a picture somebody screenshots: a control
   * nobody can press is a control that looks broken.
   */
  interactive?: boolean;
}) {
  /* ── B91 AND B92: ONE PANEL, OVER THE MAP ─────────────────────────────
     Ellie, B91: "add the description of each person if you tap on the
     person's dot. Make it like a pop up next to the dot. Tap outside the pop
     up tile to make it go away. Pop up tile should have the paragraph from
     the individual type section but we don't need the axes bars."

     B92: "Put a light grey question mark icon in a circle next to Open and
     Withdraw that pop up with the description of that axis. Remove axis
     descriptions from below the chart."

     Both replaced a block that used to sit under the chart, so the page is
     the map and the couple type now, with everything else a tap away. */
  const [opened, setOpened] = useState<{ kind: 'dot' | 'axis'; id: string } | null>(null);
  /* Nothing stays open across a change of couple or of orientation. */
  useEffect(() => { if (!interactive) setOpened(null); }, [interactive]);
  const { width, height } = useWindowDimensions();
  /**
   * Full width inside the page's 24pt gutters, less the two side margins the
   * rotated axis labels sit in, capped so it does not become a huge square on
   * a tablet.
   *
   * ── AND CAPPED BY THE HEIGHT TOO ──────────────────────────────────────
   * Ellie: "I would love for the 'money slide' when you open the couple type
   * page to fit the full couple type tile on the screen."
   *
   * The square was sized from the width alone, so on a tall phone it took
   * about a third of the screen and pushed the type reveal, which is the
   * thing the page is for, under the fold. A third of the window height is
   * the budget it gets now, which also means a small phone gets a smaller
   * map rather than a map that fits and a tile that does not.
   */
  const size = fixedSize ?? Math.min(
    MAP_MAX,
    width - Spacing.xl * 2 - SIDE * 2,
    Math.max(MAP_MIN, height - ROOM_BELOW),
  );
  const qs = quadrants?.length === 4 ? quadrants : null;
  const pa = a?.coords;
  const pb = b?.coords;
  // Without both positions there is no map to draw, and half a map is worse
  // than none: it would read as one person being placed and the other not.
  if (!qs || pa?.open == null || pa?.engage == null || pb?.open == null || pb?.engage == null) {
    return null;
  }

  // The website draws these at r=15 on a 460 viewBox, with a white ring and a
  // soft halo behind. Sized to the same proportion here, which is much larger
  // than the 16pt dot this started with: at that size two people sitting close
  // together were two indistinguishable specks.
  const dot = Math.round(size * 0.13);
  const halo = Math.round(dot * 1.5);
  // open 1 is Open, which is the LEFT of this map, so x is inverted.
  const xOf = (open: number) => (1 - open) * (size - dot) + dot / 2;
  const yOf = (engage: number) => (1 - engage) * (size - dot) + dot / 2;

  const colourOf = (p: PersonResults | null) =>
    qs.find((q) => q.code === p?.typeCode)?.color || c.textStrong;

  const A = { x: xOf(pa.open), y: yOf(pa.engage), color: colourOf(a), name: aName };
  const B = { x: xOf(pb.open), y: yOf(pb.engage), color: colourOf(b), name: bName };

  /**
   * ── THE SAME MAP ON TWO GROUNDS ────────────────────────────────────────
   * Ellie: "Axis labels on storycard 2 are way too small and very low
   * contrast, I need to be able to read them."
   *
   * This component is drawn twice: on the couple type page, which is cream,
   * and on a storycard, which is a dark gradient. It had one label colour, the
   * page's muted brown, which on the card is about two to one. And ten points
   * is small on a page and smaller on something made to be looked at on
   * someone else's phone.
   *
   * So the card asks for `onDark` and gets white at four fifths and a larger
   * size. The page is unchanged.
   */
  const label = {
    ...Type.small,
    fontSize: onDark ? 12 : 10,
    letterSpacing: onDark ? 1 : 0.6,
    fontWeight: '700' as const,
  };
  const labelInk = onDark ? 'rgba(255,255,255,0.8)' : c.textMuted;

  /* ── THE WORDS ON THE EDGES ─────────────────────────────────────────────
     From the payload, falling back to AXIS for a cached payload that has no
     poles. The vertical axis is Engage over Withdraw and the horizontal one
     is Open to Guarded; which end is which is the server's to say, and the
     inversion for the screen is this component's. */
  const vert = axes?.find((x) => x.id === 'engage');
  const horz = axes?.find((x) => x.id === 'open');
  const words = {
    top: vert?.poles?.high || AXIS.top,
    bottom: vert?.poles?.low || AXIS.bottom,
    left: horz?.poles?.high || AXIS.left,
    right: horz?.poles?.low || AXIS.right,
  };
  /* The axis whose question mark sits at a given pole, or nothing. */
  const helpFor = (axis: AxisCopy | undefined, end: 'high' | 'low') =>
    (interactive && axis?.desc && axis.helpAt === end ? axis : null);
  const helpBottom = helpFor(vert, 'low');
  const helpLeft = helpFor(horz, 'high');

  /* ── WHERE A PANEL GOES ─────────────────────────────────────────────────
     Inside the row that holds the two side labels and the map, because that
     row is exactly `size` tall and the map starts exactly SIDE in from its
     left edge. So a dot at (x, y) on the map is at (SIDE + x, y) here, with
     nothing to measure at runtime.

     The panel goes on the side of the dot with room for it and is clamped to
     the row either way, so a dot in a corner does not push it off screen. */
  const rowW = size + SIDE * 2;
  const panelW = Math.min(240, rowW - 4);
  const panelAt = (x: number, y: number) => {
    const onLeft = x <= size / 2;
    const raw = onLeft ? SIDE + x + dot : SIDE + x - dot - panelW;
    return {
      left: Math.max(2, Math.min(rowW - panelW - 2, raw)),
      top: Math.max(0, Math.min(size - 90, y - 44)),
    };
  };
  const openPanel = (() => {
    if (!interactive || !opened) return null;
    if (opened.kind === 'axis') {
      const ax = axes?.find((x) => x.id === opened.id);
      if (!ax) return null;
      /* Beside the mark that opened it: the foot of the vertical axis sits
         under the middle of the map, the left of the horizontal axis halfway
         down its edge. */
      const place = ax.id === vert?.id
        ? { left: Math.max(2, (rowW - panelW) / 2), top: Math.max(0, size - 150) }
        : { left: 2, top: Math.max(0, size / 2 - 60) };
      return { place, color: ax.color, eyebrow: ax.label, title: null as string | null, body: ax.desc };
    }
    const pp = opened.id === 'a'
      ? { profile: profiles?.a, at: A }
      : { profile: profiles?.b, at: B };
    if (!pp.profile) return null;
    return {
      place: panelAt(pp.at.x, pp.at.y),
      color: pp.profile.color || pp.at.color,
      eyebrow: pp.profile.name || pp.at.name,
      title: pp.profile.typeName,
      body: pp.profile.blurb,
    };
  })();

  return (
    <View style={{ alignItems: 'center', marginTop: Spacing.sm }}>
      <Text style={{ ...label, color: labelInk, marginBottom: Spacing.xs }}>
        {words.top.toUpperCase()}
      </Text>

      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <SideLabel text={words.left.toUpperCase()} side="left" height={size} onDark={onDark}
          help={helpLeft}
          onHelp={() => setOpened((o) => (o?.id === helpLeft?.id ? null : { kind: 'axis', id: helpLeft!.id }))} />
      <View style={{ width: size, height: size, borderRadius: Radius.lg, overflow: 'hidden' }}>
        {/* Four quadrants, in the server's order: W X Y Z. */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: size, height: size }}>
          {/* ── NO QUADRANT NAMES ──────────────────────────────────────
              Ellie: "No ind type labels in the couple map on storycards or
              couple type page."

              Each corner carried an individual type: The Initiator, The
              Anchor, The Feeler, The Protector. This product's subject is the
              gap between two people, and four named boxes invite each of them
              to find their own corner and stop reading. The tints stay, so the
              map still has regions; it just does not tell anyone which one
              they are. Same change on the website. */}
          {qs.map((q) => (
            <View
              key={q.code}
              style={{ width: size / 2, height: size / 2, backgroundColor: q.fill }}
            />
          ))}
        </View>

        {/* The two axis lines, so the quadrants read as one field rather than
            four tiles. */}
        <View style={{ position: 'absolute', left: 0, right: 0, top: size / 2 - 0.5, height: 1, backgroundColor: 'rgba(0,0,0,0.10)' }} />
        <View style={{ position: 'absolute', top: 0, bottom: 0, left: size / 2 - 0.5, width: 1, backgroundColor: 'rgba(0,0,0,0.10)' }} />

        {/* ── THE GLOW ─────────────────────────────────────────────────
            The website draws each dot as a soft radial gradient at 2.4 times
            the dot's radius, then a faint ring at 1.47 times, then the dot.
            The app had the ring and not the glow, so the ring read as a
            circle floating at an odd distance from the dot rather than the
            outer edge of something.

            A native shadow with no offset is a radial glow, which is what a
            radial gradient would have been for. The ring stays, at the
            website's proportion, now that there is something filling the
            space between it and the dot. */}
        {[A, B].map((p) => (
          <View
            key={`halo-${p.name}`}
            pointerEvents="none"
            style={{
              position: 'absolute', left: p.x - halo / 2, top: p.y - halo / 2,
              width: halo, height: halo, borderRadius: halo / 2,
              borderColor: p.color, borderWidth: 1.5, opacity: 0.28,
            }}
          />
        ))}
        {[A, B].map((p, i) => (
          <Pressable
            key={p.name}
            /* B91. The dot is the control. Not a wrapper around the halo and
               the dot both: the drawing stays as it was and only the press
               area is new, which is the dot itself plus its border, about 40
               points on a phone. */
            accessibilityRole={interactive ? 'button' : undefined}
            accessibilityLabel={interactive ? `${p.name}: what this placement means` : undefined}
            disabled={!interactive || !(i === 0 ? profiles?.a : profiles?.b)}
            onPress={() => {
              const id = i === 0 ? 'a' : 'b';
              setOpened((o) => (o?.kind === 'dot' && o.id === id ? null : { kind: 'dot', id }));
            }}
            style={{
              position: 'absolute', left: p.x - dot / 2, top: p.y - dot / 2,
              width: dot, height: dot, borderRadius: dot / 2,
              backgroundColor: p.color, borderColor: '#fff', borderWidth: 3,
              alignItems: 'center', justifyContent: 'center',
              shadowColor: p.color, shadowOpacity: 0.55,
              shadowRadius: dot * 0.5, shadowOffset: { width: 0, height: 0 },
            }}>
            {/* The initial, the same way the reader is identified everywhere
                else in results. Two dots on a map have to say which is which
                without the reader tracing back to a key. */}
            <Text
              style={{
                ...Type.small, color: '#fff', fontWeight: '800',
                fontSize: Math.round(dot * 0.42), lineHeight: Math.round(dot * 0.52),
              }}>
              {(p.name || '?').trim().charAt(0).toUpperCase()}
            </Text>
          </Pressable>
        ))}
      </View>
        <SideLabel text={words.right.toUpperCase()} side="right" height={size} onDark={onDark} />

        {/* ── THE PANEL, AND THE TAP THAT CLOSES IT ──────────────────────
            The sheet covers the map and both margins, which is "tap outside
            the pop up tile" for a finger that has landed near it. It is
            inside the row rather than over the whole screen because a panel
            positioned against the screen would have to measure where the map
            had ended up; this way a dot's coordinates are the panel's. */}
        {openPanel ? (
          <>
            <Pressable
              accessibilityLabel="Close"
              onPress={() => setOpened(null)}
              style={{ position: 'absolute', left: 0, top: 0, right: 0, bottom: 0, zIndex: 5 }} />
            <View
              style={{
                position: 'absolute', zIndex: 10,
                left: openPanel.place.left, top: openPanel.place.top, width: panelW,
                backgroundColor: c.surface, borderRadius: Radius.md,
                borderTopColor: openPanel.color, borderTopWidth: 4,
                paddingVertical: Spacing.md, paddingHorizontal: Spacing.md,
                shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 14,
                shadowOffset: { width: 0, height: 6 }, elevation: 6,
              }}>
              {/* not markable: a label naming whose panel this is. */}
              <Text style={{ ...Type.eyebrow, color: openPanel.color }}>{openPanel.eyebrow}</Text>
              {openPanel.title ? (
                <Prose style={{ ...Type.title, color: c.textStrong, marginTop: 2 }}>{openPanel.title}</Prose>
              ) : null}
              {/* Markable, as it was when it sat in a tile under the chart: a
                  mark made on it draws its margin icon whenever this panel is
                  open, which is the only time the words are on screen. */}
              <Prose style={{ ...Type.small, color: c.text, marginTop: Spacing.xs, fontFamily: Fonts.body }}>
                {openPanel.body}
              </Prose>
            </View>
          </>
        ) : null}
      </View>

      {/* Withdraw alone under the map. Open and Guarded are on their sides in
          the margins, so the bottom row is the foot of the vertical axis
          rather than three labels that look like they belong to one axis.

          And the question mark beside it, which is one of the two poles Ellie
          named. The other is beside Open, in the left margin. */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.xs }}>
        <Text style={{ ...label, color: labelInk }}>
          {words.bottom.toUpperCase()}
        </Text>
        {helpBottom ? (
          <HelpMark
            axis={helpBottom}
            onDark={onDark}
            onPress={() => setOpened((o) => (o?.id === helpBottom.id ? null : { kind: 'axis', id: helpBottom.id }))} />
        ) : null}
      </View>

      {/* No name key. Each dot carries its own initial and each name sits in
          its own colour on the tiles below, so a key underneath was a third
          place to look up something already answered twice. */}
    </View>
  );
}

/**
 * One axis label, turned on its side in the margin.
 *
 * Left reads bottom to top and right reads top to bottom, which is the
 * convention for a chart's vertical margins and keeps both facing outward.
 */
function SideLabel({ text, side, height, onDark, help, onHelp }: {
  text: string; side: 'left' | 'right'; height: number; onDark?: boolean;
  /** The axis this label's question mark opens, if this pole carries one. */
  help?: AxisCopy | null;
  onHelp?: () => void;
}) {
  return (
    <View style={{ width: SIDE, height, alignItems: 'center', justifyContent: 'center' }}>
      <Text
        numberOfLines={1}
        style={{
          ...Type.small,
          fontSize: onDark ? 12 : 10,
          letterSpacing: onDark ? 1 : 0.6,
          fontWeight: '700',
          color: onDark ? 'rgba(255,255,255,0.8)' : Colors.light.textMuted,
          width: height,
          textAlign: 'center',
          transform: [{ rotate: side === 'left' ? '-90deg' : '90deg' }],
        }}>
        {text}
      </Text>
      {/* ── B116: ABOVE THE WORD, AND TURNED THE SAME WAY ──────────────
          Ellie: "On couple type page, move the question icon above the open
          axis label and turn it to have the same orientation as the label."

          It was below it and upright, on the argument that a rotated glyph
          reads as one that has fallen over. Hers is the better call: a mark
          in a rotated margin that is not rotated reads as something that does
          not belong to the label it is beside. */}
      {help && onHelp ? (
        <View style={{
          position: 'absolute',
          bottom: height / 2 + 26,
          transform: [{ rotate: side === 'left' ? '-90deg' : '90deg' }],
        }}>
          <HelpMark axis={help} onDark={onDark} onPress={onHelp} />
        </View>
      ) : null}
    </View>
  );
}

/**
 * The light grey question mark beside a pole label.
 *
 * B92. Ellie: "Put a light grey question mark icon in a circle next to Open
 * and Withdraw." Light grey on the page; on a storycard it would be invisible,
 * which is one of the reasons the card does not draw these at all.
 *
 * The circle is 16 points and the press area is 32, because a 16 point target
 * is half what a finger needs and this map already cost a round of "the dots
 * look fuzzy".
 */
function HelpMark({ axis, onDark, onPress }: {
  axis: AxisCopy; onDark?: boolean; onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`What ${axis.label} means`}
      onPress={onPress}
      hitSlop={8}
      style={{
        width: 16, height: 16, borderRadius: 8,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: onDark ? 'rgba(255,255,255,0.18)' : '#EFE9E1',
        borderWidth: 1,
        borderColor: onDark ? 'rgba(255,255,255,0.3)' : '#CFC5B8',
      }}>
      <Text style={{
        ...Type.small, fontSize: 11, lineHeight: 14, fontWeight: '700',
        color: onDark ? 'rgba(255,255,255,0.85)' : '#8F8071',
      }}>?</Text>
    </Pressable>
  );
}
