import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { trackScreenTime } from '@/api/client';

/**
 * How long this screen was actually looked at.
 *
 * ── WHY A HOOK ────────────────────────────────────────────────────────────
 * Five exercise screens, four tabs and a handful of components would otherwise
 * each carry their own timer, and the day one of them measured something
 * slightly different is the day the average stops meaning anything.
 *
 * ── LOOKED AT, NOT OPEN ───────────────────────────────────────────────────
 * The clock stops when the app goes to the background and starts again when it
 * comes back. A phone in a pocket is not reading, and "average time on the
 * exercise" that includes overnight is the number these things usually report
 * and the reason nobody trusts them.
 *
 * ── THE KEY ───────────────────────────────────────────────────────────────
 * `view` is the registry's view name for an exercise, so the app and the
 * website file their time under the same key and the Engagement tab does one
 * calculation rather than two.
 */
export function useScreenTime(view: string | null) {
  const openedAt = useRef<number | null>(null);
  const total = useRef(0);

  useEffect(() => {
    if (!view) return undefined;
    openedAt.current = Date.now();
    total.current = 0;

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        if (openedAt.current == null) openedAt.current = Date.now();
      } else if (openedAt.current != null) {
        total.current += Date.now() - openedAt.current;
        openedAt.current = null;
      }
    });

    return () => {
      sub.remove();
      if (openedAt.current != null) total.current += Date.now() - openedAt.current;
      const ms = total.current;
      openedAt.current = null;
      total.current = 0;
      // Not awaited: the screen is going away and nothing here can wait.
      void trackScreenTime(view, ms);
    };
  }, [view]);
}
