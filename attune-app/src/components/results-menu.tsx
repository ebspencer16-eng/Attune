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
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import type { ResultsNavGroup } from '@/api/client';
import { AccentFallback, Colors, Fonts, Palette, Spacing, Type } from '@/constants/attune-theme';
import { withAlpha } from '@/components/page-wash';

const c = Colors.light;

/**
 * A glyph per section. A lookup, so an unknown group still draws.
 *
 * ── OUTLINED, AND ELLIE'S CHOICES ─────────────────────────────────────────
 * She named all eight: "Highlights make it photo strips from a photo booth,
 * couple type make it a couple holding hands, Communication should be the
 * speech bubbles, Expectations should be a brain, Rel relf should be a
 * storybook, Physical intimacy should be a heart, Conflict patterns is good,
 * What comes next should be a checklist. All icons should be white outlined
 * not filled in."
 *
 * Outlined is the base name in SF Symbols; `.fill` is the solid one. So the
 * rule is simply that no name here ends in `.fill`, and check-nav-icons.mjs
 * says so, because "make them outlined" is the kind of change that gets undone
 * one icon at a time.
 *
 * `figure.2.right.holdinghands` is the literal one for a couple. There is no
 * photo-booth symbol, and `film` is the closest thing to a strip of frames.
 *
 * These are the only strings in this file that are not the server's, and they
 * carry no meaning the label does not already carry: an icon here is rhythm,
 * not information. A group the server adds tomorrow appears in the right place
 * wearing the fallback rather than vanishing, which is the difference between
 * a lookup and a list.
 */
export const GROUP_ICON: Record<string, string> = {
  comm: 'bubble.left.and.bubble.right',
  exp: 'brain',
  reflection: 'book',
  intimacy: 'heart',
  conflict: 'arrow.triangle.branch',
};

/*
 * ── AND THE THREE THAT HAVE NONE ──────────────────────────────────────────
 * Ellie: "Maybe only the exercises have icons?"
 *
 * Highlights, Couple Type and What Comes Next are ways of reading the results
 * rather than things you answered. A glyph on them claimed a parity with the
 * five exercises that they do not have, and it made the list read as eight
 * equal things when it is five sections with a way in and a way out.
 *
 * Their labels still line up, because the space is kept whether or not there
 * is anything in it.
 */

const ICON_FALLBACK = 'circle';

export default function ResultsMenu({
  groups, current, onOpenSection, density = 'page',
}: {
  groups: ResultsNavGroup[];
  /** The page being read, so its band opens and its row is marked. */
  current?: string | null;
  onOpenSection: (id: string) => void;
  /**
   * How much room a row takes. The landing page is the whole screen and can
   * afford air; the dropdown is over a page someone is reading and should not
   * cover all of it.
   */
  density?: 'page' | 'sheet';
}) {
  /** Which group this menu has open. One, or none. */
  const groupHolding = (id: string | null | undefined) =>
    groups.find((g) => g.id === id || g.children?.some((ch) => ch.id === id))?.id ?? null;

  const [open, setOpen] = useState<string | null>(groupHolding(current));

  const big = density === 'page';

  return (
    <ScrollView
      /* No bottom inset of its own: on the landing page the tile provides the
         clearance, and in the dropdown the sheet does. */
      contentContainerStyle={{ paddingBottom: 0 }}
      showsVerticalScrollIndicator={false}>
      {groups.map((g, i) => {
        const color = g.color || AccentFallback;
        const isOpen = open === g.id;
        const kids = g.children || [];
        const holdsCurrent = g.id === current || kids.some((ch) => ch.id === current);
        const icon = GROUP_ICON[g.id];
        const isExercise = !!icon;
        /**
         * ── THE EXERCISES GET A HEADING ────────────────────────────────────
         * Ellie: "maybe there's a section called exercise results and the
         * exercises are indented and italicised? Just to provide some visual
         * variation?"
         *
         * The five exercises are contiguous in the nav and always have been,
         * so the heading goes above the first of them rather than being a
         * group the server has to invent. `isExercise` is having an icon,
         * which is already the rule for what an exercise is here.
         */
        const firstExercise = isExercise && !GROUP_ICON[groups[i - 1]?.id];

        return (
          <View key={g.id}>
            {/* ── THE HEADING IS A TOP-LEVEL ROW ──────────────────────────
                Ellie: "I want exercise results title to be listed
                left-aligned with highlights and couple type, and I want the
                content in that section indented further right than that."

                So the heading sits on the same left edge as Highlights and
                Couple Type, and the five exercises step in from it. It was the
                other way round: the heading was indented with them. */}
            {firstExercise ? (
              <View
                style={{
                  paddingTop: big ? Spacing.md : Spacing.sm,
                  paddingBottom: Spacing.xs,
                  paddingHorizontal: Spacing.xl,
                  borderTopWidth: i === 0 ? 0 : 1, borderTopColor: c.border,
                }}>
                <Text style={{ ...Type.eyebrow, color: c.accentQuiet }}>Exercise results</Text>
              </View>
            ) : null}
            {/* ── A ROW, NOT A BAND ──────────────────────────────────────
                Ellie, having asked for the coloured blocks and then seen them:
                "The colors on the insights landing page are so ugly. Can we
                adjust these in some way to be softer/stylized/tints rather
                than full color blocks? I want this to feel attune branded,
                right now it feels juvenile." And: "The more I think about it,
                the more I envision the landing page being more of a TOC that
                doesn't have such harsh colors."

                So the colour left the ground and went into the icon, which is
                what she suggested herself: "the tiles on landing page should
                just be shaded lightly with the attune gradient but the icon
                should match the color of the exercise". The row is cream with
                a hairline under it and a breath of the section's colour at the
                left edge; the section is named in the same ink as everything
                else on the page. */}
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: kids.length ? isOpen : undefined }}
              accessibilityLabel={g.label}
              /**
               * ── THE NAME AND THE ARROW DO DIFFERENT THINGS ──────────────
               * Ellie: "Dropdown for each exercise should not list the cover
               * page. If a user just taps on the exercise from the menu it
               * should take them to the cover page, but if they tap the
               * dropdown then they should see the full list."
               *
               * So the row opens the section and the chevron opens the list.
               * A group with no pages of its own has no chevron and the whole
               * row simply goes there.
               */
              onPress={() => onOpenSection(kids.length ? kids[0].id : g.id)}
              style={{
                /* Ellie: "I also want the full menu to fit on one screen when
                   the dropdowns aren't open, there is way too much vertical
                   space right now." Nine rows and a heading at sixteen points
                   of padding each is more than a phone has. */
                paddingVertical: big ? Spacing.sm + 2 : Spacing.sm,
                /* Ellie: "Further indent the exercise results in the menu,
                   the icon should be indented and the text should come after
                   that." The whole row moves in, icon first, rather than the
                   label moving away from its icon. */
                paddingLeft: isExercise ? Spacing.xl + Spacing.lg : Spacing.xl,
                paddingRight: Spacing.xl,
                flexDirection: 'row', alignItems: 'center', gap: Spacing.lg,
                borderTopWidth: i === 0 ? 0 : 1,
                borderTopColor: c.border,
                backgroundColor: isOpen ? Palette.warm : 'transparent',
              }}>
              {/* ── NO WASH ─────────────────────────────────────────────────
                  Ellie: "Menu should just be attune colors, the only exercise
                  colors should be the icons to the left of the exercise names."

                  Each row carried a gradient of its section's colour at 14 per
                  cent. Eight of those stacked is still eight colours, quieter.
                  The icon is the only coloured thing now, which is what she
                  asked for twice: once as a suggestion and once as a
                  correction. */}
              {/* ── ONLY THE EXERCISES CARRY AN ICON ─────────────────────
                  Ellie: "Maybe only the exercises have icons?" Highlights,
                  Couple Type and What Comes Next are ways of reading the
                  results rather than things you answered, and a glyph on them
                  claimed a parity they do not have. Where there is no icon the
                  label still lines up, because the space is kept. */}
              {/* ── THE ICON IN ITS OWN LIGHT ──────────────────────────────
                  Ellie: "Insights landing menu, learn tab, and notes tab all
                  feel very plain. Please add a lot more color and visual
                  appeal to those pages."

                  The rows stay cream, which is the other thing she asked for.
                  What carries the colour is the disc: the section's own hue at
                  a tenth, with the icon in it at full strength. It is the same
                  shape the home tile's rows use, so the two screens read as
                  one product rather than two lists. */}
              {/* ── NO DISC ─────────────────────────────────────────────────
                  Ellie: "I also don't know why the icons are now in dots, I
                  don't want that." The disc was added the day before to put
                  colour on a menu she had just asked to make quieter, which
                  was solving the wrong half. The icon carries the colour on
                  its own. */}
              <View
                style={{
                  width: big ? 24 : 20,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                {icon ? (
                  <SymbolView
                    name={icon as never}
                    size={big ? 19 : 16}
                    tintColor={color}
                    fallback={<View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />}
                    style={{ width: big ? 21 : 18, height: big ? 21 : 18 }}
                  />
                ) : null}
              </View>
              {/* ── NOT A HERO ───────────────────────────────────────────
                  Ellie: "Landing page shouldn't all be in the hero text, it
                  feels too loud/bold", and "Text should be slightly smaller so
                  that nothing trails off". Physical Intimacy Expectations is
                  the longest label in the product and it now fits on one line
                  on the narrowest phone this app supports. */}
              <Text
                numberOfLines={1}
                style={{
                  ...Type.cardTitle,
                  fontFamily: Fonts.display,
                  /**
                   * ── INDENTED, AND A SHADE SMALLER ──────────────────────
                   * Ellie asked for the exercises "indented and italicised.
                   * Just to provide some visual variation."
                   *
                   * They are indented, under a heading of their own. They are
                   * not italic, and that is a limit rather than a decision:
                   * only PlayfairDisplay-Bold is bundled, there is no italic
                   * face, and iOS does not slant a registered face on request.
                   * Asking for italic here produces nothing at all, which is
                   * worse than not asking. The theme says the same thing about
                   * weights, for the same reason.
                   *
                   * The size step is what stops the longest label truncating
                   * once the indent has taken its width: Physical Intimacy
                   * Expectations is twenty-nine characters and has to fit.
                   */
                  fontSize: big ? (isExercise ? 15 : 16) : 15,
                  lineHeight: Math.ceil((big ? 16 : 15) * 1.41),
                  color: c.textStrong,
                  flex: 1,
                }}>
                {g.label}
              </Text>
              {holdsCurrent && !isOpen ? (
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
              ) : null}
              {/* Ellie: "Make dropdown arrows in hamburger nav larger." */}
              {kids.length ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded: isOpen }}
                  accessibilityLabel={`${g.label}, show pages`}
                  hitSlop={12}
                  onPress={() => setOpen(isOpen ? null : g.id)}>
                  <Text style={{ color: c.textMuted, fontSize: big ? 24 : 22, lineHeight: 28 }}>
                    {isOpen ? '\u25B4' : '\u25BE'}
                  </Text>
                </Pressable>
              ) : null}
            </Pressable>

            {/* The pages inside it, indented under the label they belong to. */}
            {isOpen && kids.length ? (
              <View style={{ backgroundColor: Palette.warm, borderLeftWidth: 3, borderLeftColor: color }}>
                {/* The cover is where the row itself goes, so listing it here
                    would be the same destination twice in one menu. */}
                {kids.filter((ch) => !ch.cover).map((ch) => {
                  const on = ch.id === current;
                  return (
                    <Pressable
                      key={ch.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected: on }}
                      onPress={() => onOpenSection(ch.id)}
                      style={{
                        flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
                        paddingVertical: big ? Spacing.sm + 1 : Spacing.sm,
                        paddingLeft: Spacing.xl + Spacing.lg + (big ? 38 : 30) + Spacing.lg,
                        paddingRight: Spacing.xl,
                        borderTopWidth: 1, borderTopColor: c.border,
                      }}>
                      <Text
                        numberOfLines={1}
                        style={{
                          ...Type.small,
                          fontWeight: on ? '700' : '400',
                          color: on ? color : c.text,
                          flex: 1,
                        }}>
                        {ch.label}
                      </Text>
                      <Text style={{ color: c.textMuted, fontSize: 14 }}>{'\u203A'}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </View>
        );
      })}
    </ScrollView>
  );
}
