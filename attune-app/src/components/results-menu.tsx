/**
 * The way into the results: a stack of coloured bands, one per section.
 *
 * ── WHAT ELLIE ASKED FOR ──────────────────────────────────────────────────
 * "I think I want a landing page in insights to look like the menu screenshot
 * I sent, with tabs for each of the main sections (colors match the attune
 * brand). When you are on that menu and you click one of the tabs, it should
 * open and the others should shrink like the example image, and it should list
 * the detailed pages in that section. Then the user can click into a detailed
 * section."
 *
 * And, separately: "Just like the website left nav does, when you open one
 * category, the other closes." And: "I want to stay away from eyebrow text in
 * the app's nav."
 *
 * ── WHAT IT REPLACED ──────────────────────────────────────────────────────
 * Two rows of chips across the top of every page: the sections in one, the
 * pages of the section you were in below it. Twenty-nine entries through a
 * window four wide, which meant the nav was a thing you scrolled sideways to
 * search rather than a thing you read. The band you are looking for is on the
 * screen here, all seven of them at once.
 *
 * ── WHERE THE COLOURS COME FROM ───────────────────────────────────────────
 * The server, on the nav it already sends: `color` per group, the same hex the
 * website's sidebar paints. Nothing here picks a colour. A group that arrives
 * without one wears the brand's clay, which is the neutral everything else in
 * the app falls back to.
 *
 * The icons are this file's, as a lookup rather than a list: a group the server
 * adds tomorrow appears in the right place wearing the fallback glyph, rather
 * than vanishing because the app had never heard of it. Same argument as
 * AccentFor in the theme.
 *
 * ── ONE COMPONENT, TWO PLACES ─────────────────────────────────────────────
 * The landing page and the dropdown under the hamburger are the same menu.
 * Ellie: "same colors, banners, functionality as the landing page but in a
 * dropdown from the hamburger nav." So it is one component with a density,
 * not two components that have to be kept looking alike.
 */

import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import type { ResultsNavGroup } from '@/api/client';
import { AccentFallback, BottomTabInset, Palette, Spacing, Type } from '@/constants/attune-theme';

/**
 * A glyph per section. A lookup, so an unknown group still draws.
 *
 * These are the only strings in this file that are not the server's, and they
 * carry no meaning the label does not already carry: an icon here is rhythm,
 * not information.
 */
const GROUP_ICON: Record<string, string> = {
  highlights: 'sparkles',
  'couple-type': 'person.2.fill',
  comm: 'bubble.left.and.bubble.right.fill',
  exp: 'checklist',
  reflection: 'heart.text.square.fill',
  intimacy: 'heart.fill',
  conflict: 'arrow.triangle.branch',
  'what-comes-next': 'flag.fill',
};

const ICON_FALLBACK = 'circle.fill';

export default function ResultsMenu({
  groups, current, onOpenSection, density = 'page',
}: {
  groups: ResultsNavGroup[];
  /** The page being read, so its band opens and its row is marked. */
  current?: string | null;
  onOpenSection: (id: string) => void;
  /**
   * How much room a band takes. The landing page is the whole screen and can
   * afford presence; the dropdown is over a page someone is reading and should
   * not cover all of it.
   */
  density?: 'page' | 'sheet';
}) {
  /** Which group this menu has open. One, or none. */
  const groupHolding = (id: string | null | undefined) =>
    groups.find((g) => g.id === id || g.children?.some((ch) => ch.id === id))?.id ?? null;

  const [open, setOpen] = useState<string | null>(groupHolding(current));

  const big = density === 'page';
  const bandPad = big ? Spacing.lg : Spacing.md;
  const titleSize = big ? 22 : 18;

  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: big ? BottomTabInset : 0 }}
      showsVerticalScrollIndicator={false}>
      {groups.map((g, i) => {
        const color = g.color || AccentFallback;
        /**
         * ── WHY EACH BAND IS A LITTLE DARKER THAN THE ONE ABOVE ────────────
         * The server gives seven groups five colours: Highlights and Couple
         * Type are both the brand orange, Expectations and Relationship
         * Reflection are both the brand blue. Stacked edge to edge, two
         * neighbours sharing a colour are one band with two labels in it, and
         * the reader has no way to see that the second is a separate thing.
         *
         * A veil rather than a second set of hexes: the brand colours stay
         * exactly what the website paints, and the step down the stack is the
         * same shape as the reference Ellie sent, which is one colour walking
         * darker as it goes.
         */
        const step = `rgba(0,0,0,${(i * 0.055).toFixed(3)})`;
        const isOpen = open === g.id;
        const kids = g.children || [];
        const holdsCurrent = g.id === current || kids.some((ch) => ch.id === current);

        return (
          <View key={g.id}>
            {/* ── THE BAND ──────────────────────────────────────────────
                Its own colour, edge to edge, with the label in Playfair over
                it. Not an eyebrow: the sections are the largest thing on this
                screen because choosing one is the only thing to do on it. */}
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: kids.length ? isOpen : undefined }}
              accessibilityLabel={g.label}
              onPress={() => {
                // A group with no pages of its own is not a folder. Opening it
                // would show an empty band, so it just goes there.
                if (!kids.length) { onOpenSection(g.id); return; }
                setOpen(isOpen ? null : g.id);
              }}
              style={{
                backgroundColor: color,
                paddingVertical: isOpen ? bandPad * 0.8 : bandPad,
                paddingHorizontal: Spacing.xl,
                flexDirection: 'row', alignItems: 'center', gap: Spacing.lg,
              }}>
              <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: step }]} />
              <SymbolView
                name={(GROUP_ICON[g.id] || ICON_FALLBACK) as never}
                size={big ? 24 : 19}
                tintColor={Palette.white}
                fallback={<View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: Palette.white }} />}
                style={{ width: big ? 28 : 22, height: big ? 28 : 22 }}
              />
              <Text
                numberOfLines={1}
                style={{
                  ...Type.title, fontSize: titleSize, lineHeight: Math.ceil(titleSize * 1.41),
                  color: Palette.white, flex: 1,
                }}>
                {g.label}
              </Text>
              {/* A dot rather than a tick: it says "you are in here" without
                  claiming the section is finished. */}
              {holdsCurrent && !isOpen ? (
                <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: Palette.white }} />
              ) : null}
              {kids.length ? (
                <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: big ? 15 : 13 }}>
                  {isOpen ? '▴' : '▾'}
                </Text>
              ) : null}
            </Pressable>

            {/* ── THE PAGES INSIDE IT ───────────────────────────────────
                On the band's own colour, darkened by a veil rather than by a
                second hex, so a section that changes colour on the website
                changes here in one place and its rows follow. */}
            {isOpen && kids.length ? (
              <View style={{ backgroundColor: color }}>
                <View style={{ backgroundColor: step }}>
                <View style={{ backgroundColor: 'rgba(0,0,0,0.22)' }}>
                  {kids.map((ch) => {
                    const on = ch.id === current;
                    return (
                      <Pressable
                        key={ch.id}
                        accessibilityRole="button"
                        accessibilityState={{ selected: on }}
                        onPress={() => onOpenSection(ch.id)}
                        style={{
                          flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
                          paddingVertical: big ? Spacing.md + 2 : Spacing.md,
                          paddingLeft: Spacing.xl + (big ? 28 : 22) + Spacing.lg,
                          paddingRight: Spacing.xl,
                        }}>
                        <Text
                          numberOfLines={1}
                          style={{
                            ...Type.body,
                            fontWeight: on ? '700' : '400',
                            color: on ? Palette.white : 'rgba(255,255,255,0.86)',
                            flex: 1,
                          }}>
                          {ch.label}
                        </Text>
                        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 15 }}>{'›'}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                </View>
              </View>
            ) : null}
          </View>
        );
      })}
    </ScrollView>
  );
}
