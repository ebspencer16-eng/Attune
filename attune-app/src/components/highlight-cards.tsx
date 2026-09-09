/**
 * The highlight storycards.
 *
 * Swipe through, one at a time, before any results page. The website shows the
 * same nine cards in the same order with the same words; only the drawing is
 * native here.
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

import { useRef, useState } from 'react';
import {
  Dimensions, NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, Text, View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import type { HighlightCard } from '@/api/client';
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

export default function HighlightCards({
  cards, onDone,
}: { cards: HighlightCard[]; onDone: () => void }) {
  const [index, setIndex] = useState(0);
  const pager = useRef<ScrollView>(null);
  const [width, setWidth] = useState(Dimensions.get('window').width);

  const goTo = (i: number) => {
    const next = Math.max(0, Math.min(cards.length - 1, i));
    setIndex(next);
    pager.current?.scrollTo({ x: next * width, animated: true });
  };

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / Math.max(1, width));
    if (i !== index) setIndex(i);
  };

  if (!cards.length) return null;

  return (
    <View
      style={{ flex: 1 }}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <ScrollView
        ref={pager}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        style={{ flex: 1 }}>
        {cards.map((card, i) => (
          <Pressable
            key={card.id}
            // Tapping advances, the way the website's cards do. The last card
            // has its own button instead, because tapping into nothing is how
            // someone decides the thing is broken.
            onPress={() => (i === cards.length - 1 ? onDone() : goTo(i + 1))}
            style={{ width, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg }}>
            <Card card={card} onDone={onDone} />
          </Pressable>
        ))}
      </ScrollView>

      {/* Where you are, and a way back to any of them. Tappable because
          swiping back through nine cards to reread one is a chore. */}
      <View
        style={{
          flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
          gap: Spacing.xs, paddingTop: Spacing.md,
          // Clear of the tab bar. The results pages used to have a previous
          // and next row under them that carried this; removing it left the
          // dots, and the bottom of the card, underneath Home and Insights.
          // This view does not scroll, so it cannot borrow the clearance the
          // other sections got from their content padding.
          paddingBottom: BottomTabInset,
        }}>
        {cards.map((card, i) => (
          <Pressable key={card.id} onPress={() => goTo(i)} hitSlop={8}>
            <View
              style={{
                height: 4, width: i === index ? 28 : 18, borderRadius: 2,
                backgroundColor: i === index ? c.accent : i < index ? c.textMuted : c.border,
              }}
            />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function Card({ card, onDone }: { card: HighlightCard; onDone: () => void }) {
  const tone = TONES[card.tone] || TONES.night;
  return (
    <LinearGradient
      colors={tone}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        flex: 1, borderRadius: Radius.lg, overflow: 'hidden',
        padding: Spacing.xl, justifyContent: 'center',
      }}>
      <Body card={card} onDone={onDone} />
    </LinearGradient>
  );
}

function Body({ card, onDone }: { card: HighlightCard; onDone: () => void }) {
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
      return (
        <View style={{ alignItems: 'center' }}>
          <Text style={[title, { textAlign: 'center' }]}>{card.title}</Text>
          {card.typeName ? (
            <Text style={[hero, { textAlign: 'center', marginTop: Spacing.xl, color: card.accent || Palette.white }]}>
              {card.typeName}
            </Text>
          ) : null}
          <Text style={[label, { marginTop: Spacing.sm }]}>{card.typeLabel}</Text>
          <Text style={[body, { textAlign: 'center', marginTop: Spacing.xl, maxWidth: 260 }]}>{card.body}</Text>
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
          {(card.callouts || []).filter((x) => x.value).map((x) => (
            <View
              key={x.label}
              style={{
                backgroundColor: `${WHITE}0.08)`, borderColor: `${WHITE}0.18)`, borderWidth: 1,
                borderRadius: Radius.md, padding: Spacing.lg, marginBottom: Spacing.md,
              }}>
              <Text style={label}>{x.label}</Text>
              <Text style={[title, { fontSize: 20, marginTop: Spacing.xs }]}>{x.value}</Text>
            </View>
          ))}
          <Text style={[body, { marginTop: Spacing.md }]}>{card.body}</Text>
        </View>
      );

    case 'stat-rings':
      return (
        <View style={{ alignItems: 'center' }}>
          <Eyebrow>{card.eyebrow}</Eyebrow>
          <Text style={[stat, { fontSize: 72 }]}>{card.stat}</Text>
          <Text style={[body, { marginBottom: Spacing.xxl }]}>{card.statLabel}</Text>
          <View style={{ flexDirection: 'row', gap: Spacing.xxl }}>
            {(card.rings || []).map((r) => (
              <View key={r.label} style={{ alignItems: 'center' }}>
                <Text style={[hero, { fontSize: 32 }]}>{r.pct}%</Text>
                <Text style={[small, { marginTop: Spacing.xs }]}>{r.label}</Text>
              </View>
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
const stat = {
  ...Type.hero, color: Palette.white, fontSize: 64, lineHeight: 66,
  marginTop: Spacing.sm,
} as const;
