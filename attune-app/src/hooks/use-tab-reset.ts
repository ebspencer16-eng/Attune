/**
 * Tapping the tab you are already on takes you back to where it starts.
 *
 * ── WHY IT IS A HOOK ──────────────────────────────────────────────────────
 * Insights had this first, written into the screen. Ellie: "just like
 * insights, if you are in the category and tap resources or notes again, it
 * should bring you back to the initial landing page for that section." Three
 * screens doing the same thing three ways is how they end up behaving
 * differently, and two of them already had subtly different ideas of what
 * "open" means.
 *
 * ── HOW IT TELLS A RETURN FROM AN ARRIVAL ─────────────────────────────────
 * iOS reports a repeat tap as an ordinary tab selection, so the only thing
 * separating the two is whether this screen was focused when the press
 * arrived. The navigator emits the press before it moves, so arriving from
 * another tab reads as not focused and nothing is reset.
 */

import { useEffect } from 'react';
import { useNavigation } from 'expo-router';

export function useTabReset(reset: () => void) {
  /**
   * Cast because expo-router types navigation against the routes, and
   * `tabPress` is the navigator's event rather than a route.
   */
  const navigation = useNavigation() as unknown as {
    addListener: (type: string, cb: () => void) => () => void;
    isFocused: () => boolean;
  };
  useEffect(
    () => navigation.addListener('tabPress', () => {
      if (navigation.isFocused()) reset();
    }),
    [navigation, reset],
  );
}
