import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
/* expo-router re-exports this, so there is no second navigation dependency to
   keep in step with the router's own. */
import { useIsFocused } from 'expo-router';

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
 * ── AND NOT "MOUNTED", EITHER ─────────────────────────────────────────────
 * Ellie: "Is the results time spent graphic correct? 2000 seconds on app
 * highlights? That feels super high."
 *
 * It was not correct and 2000 seconds is the shape of the bug. Every tab in
 * this app mounts at launch and stays mounted, which is what makes switching
 * instant. So a screen that is behind another tab is still mounted, AppState
 * is still `active`, and this clock went on running. Open Highlights, switch
 * to Learn, read for half an hour, come back: thirty minutes landed on
 * Highlights.
 *
 * Focus is the missing signal. `useIsFocused` is false while another tab is in
 * front, and that is treated exactly like backgrounding: the elapsed time so
 * far is banked and the clock stops until the screen is in front again.
 *
 * The figure this produces is lower than the old one for every screen, and
 * every bit of the difference was time somebody spent somewhere else.
 *
 * ── THE KEY ───────────────────────────────────────────────────────────────
 * `view` is the registry's view name for an exercise, so the app and the
 * website file their time under the same key and the Engagement tab does one
 * calculation rather than two.
 */
export function useScreenTime(view: string | null) {
  const openedAt = useRef<number | null>(null);
  const total = useRef(0);
  const focused = useIsFocused();

  /* Banking and resuming are the same two moves whichever signal fired, so
     they are written once. A second copy is how the background path and the
     focus path come to disagree about whether a stopped clock is stopped. */
  const bank = () => {
    if (openedAt.current != null) {
      total.current += Date.now() - openedAt.current;
      openedAt.current = null;
    }
  };
  const resume = () => {
    if (openedAt.current == null) openedAt.current = Date.now();
  };

  useEffect(() => {
    if (!view) return undefined;
    total.current = 0;
    /* Only start if this screen is actually in front. A tab that mounts behind
       another one must not begin counting, which is the same bug arriving at
       mount rather than at a switch. */
    openedAt.current = focused ? Date.now() : null;

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') { if (focusedRef.current) resume(); } else bank();
    });

    return () => {
      sub.remove();
      bank();
      const ms = total.current;
      total.current = 0;
      // Not awaited: the screen is going away and nothing here can wait.
      void trackScreenTime(view, ms);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  /* `focused` is read inside the AppState listener, which is created once, so
     it has to come from a ref rather than from the closure: a listener holding
     the first render's value would resume a screen that is behind a tab. */
  const focusedRef = useRef(focused);
  useEffect(() => {
    focusedRef.current = focused;
    if (!view) return;
    if (focused) resume(); else bank();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focused, view]);
}
