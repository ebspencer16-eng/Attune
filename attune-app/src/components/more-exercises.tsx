/**
 * The exercises this couple do not own, at the foot of the Insights tab.
 *
 * ── WHAT SHE ASKED FOR ────────────────────────────────────────────────────
 * Ellie: "Let's call the section 'More Attune Exercises' and just do the
 * greyed out thing with the lock icon over it if users haven't purchased.
 * That's what we do for the resources on learn too, right? Should be fine?"
 *
 * Learn dims an unowned tool to half and mutes its icon. It has no lock. The
 * dimming here is the same number so the two tabs read alike, and the lock is
 * the half she asked for that Learn does not have yet.
 *
 * ── WHY IT IS NOT A LIST OF THREE EXERCISES ───────────────────────────────
 * Which exercises are additional is not typed here. /api/home sends every
 * exercise in api/_exercises.js with `owned` already worked out from the
 * couple's capabilities, so an exercise added to the registry appears here
 * without anyone remembering to, and one renamed cannot be renamed in only one
 * place. The website's AdditionalExercises reads the same rule off the same
 * registry.
 *
 * ── WHY TAPPING OPENS THE WEBSITE ─────────────────────────────────────────
 * The app does not sell. This opens /offerings in the system browser, which is
 * the website's own marketing page and exactly what Get Started already does.
 * check-app-does-not-sell.mjs holds that line.
 */

import { Text, View } from 'react-native';
import { Pressable } from '@/components/pressable';
import { SymbolView } from 'expo-symbols';

import type { ExerciseState } from '@/api/client';
import { SITE_URL } from '@/api/client';
import { openExternal } from '@/api/open-external';
import { Colors, Fonts, Palette, Radius, Spacing, Type } from '@/constants/attune-theme';

const c = Colors.light;

/** Her heading, and the only words in this file. */
export const MORE_EXERCISES_LABEL = 'More Attune Exercises';

/**
 * Half, the same as an unowned tool on Learn. Written once because the tile
 * and its label both take it and two numbers drifting apart is this
 * codebase's whole failure mode.
 */
const DIMMED = 0.5;

export default function MoreExercises({ exercises }: { exercises: ExerciseState[] }) {
  const extras = exercises.filter((e) => !e.owned);
  if (!extras.length) return null;

  return (
    <View style={{ marginTop: Spacing.xl }}>
      <Text
        style={{
          ...Type.eyebrow,
          color: c.accentQuiet,
          marginBottom: Spacing.md,
          marginLeft: Spacing.xs,
        }}>
        {MORE_EXERCISES_LABEL}
      </Text>
      {/* ── ALWAYS THREE COLUMNS, HOWEVER MANY TILES ────────────────────
          Ellie, of the website's version: "3 rounded square tiles, one for
          each additional exercise. If they own one additional but not two,
          they should only see 2 in that section."

          The count is hers; the SIZE should not follow it. A row of flexed
          children makes one missing exercise a tile three times the width of
          three, and the tile is square, so it becomes a huge box. A third of
          the row each, with the spare cells empty, keeps a tile the same tile
          whether you are missing one exercise or all of them. */}
      <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
        {extras.map((e) => (
          <Pressable
            key={e.key}
            accessibilityRole="button"
            accessibilityLabel={`${e.fullLabel || e.label}, not yours yet. Opens the packages page.`}
            onPress={() => openExternal(`${SITE_URL}/offerings#add-ons`)}
            style={{
              flex: 1,
              aspectRatio: 1,
              alignItems: 'center',
              justifyContent: 'center',
              gap: Spacing.sm,
              padding: Spacing.md,
              borderRadius: Radius.lg,
              backgroundColor: Palette.warm,
              borderWidth: 1,
              borderColor: c.border,
              opacity: DIMMED,
            }}>
            <View
              style={{
                width: 30, height: 30, borderRadius: 15,
                alignItems: 'center', justifyContent: 'center',
                backgroundColor: c.border,
              }}>
              <SymbolView
                name={'lock' as never}
                size={16}
                tintColor={c.textMuted}
                style={{ width: 18, height: 18 }}
              />
            </View>
            <Text
              numberOfLines={3}
              style={{
                ...Type.small,
                fontFamily: Fonts.body,
                fontWeight: '600',
                /* The dimming is the tile's opacity, once. Muting the ink as
                   well leaves a label at about two to one against the cream.
                   Learn does it this way too: half opacity, full-strength
                   label, muted icon. */
                color: c.textStrong,
                textAlign: 'center',
              }}>
              {e.label}
            </Text>
          </Pressable>
        ))}
        {/* The empty cells. Three columns always: see the note above. */}
        {Array.from({ length: Math.max(0, 3 - extras.length) }).map((_, i) => (
          <View key={`gap-${i}`} style={{ flex: 1 }} />
        ))}
      </View>
    </View>
  );
}
