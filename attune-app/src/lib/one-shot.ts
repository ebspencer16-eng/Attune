/**
 * A value handed to a screen that may not be mounted yet.
 *
 * ── THE BUG ───────────────────────────────────────────────────────────────
 * Ellie: "for some reason on the app when I click download it opens the how to
 * review your results together article."
 *
 * The Learn tab carried two module-level slots, `pendingPost` and
 * `pendingTool`, so a tap in the Notes tab could say "open this article" to a
 * screen that might be behind the tab bar or might not exist yet. Each setter
 * wrote the slot AND called the live screen:
 *
 *   export function showPost(id) { pendingPost = id; openPostHandle?.(id); }
 *
 * When a screen was already mounted it took the value and the slot kept a copy
 * that nothing ever emptied, because the only thing that cleared it was the
 * mount effect, which had already run. So after one tap on a mark in Notes,
 * that article's slug sat in module memory for the rest of the session. The
 * next time iOS rebuilt the Learn tab, which it does when it releases a tab
 * while something else is in front, the rebuilt screen read the slot and opened
 * an article nobody had asked for.
 *
 * That is why it happened on her phone and not in the simulator: the simulator
 * never had to release the tab.
 *
 * ── WHY A MODULE RATHER THAN TWO MORE PAIRS OF VARIABLES ──────────────────
 * The same pattern is wanted in at least three places and was written by hand
 * each time, which is the failure this repo is organised against. The rule is
 * three lines and the whole bug was in which of them was missing:
 *
 *   a live screen takes the value and the slot is not written at all;
 *   a slot is emptied by whoever reads it, not by somebody later;
 *   a cleanup only removes the handle if it is still its own.
 *
 * `takePendingMark` in components/results.tsx is the one that was already
 * right, and this is that, made reusable.
 *
 * check-one-shot-slots.mjs runs the three scenarios against this file.
 */

export type OneShot<T> = {
  /** Give the value to the mounted screen, or to the next one to mount. */
  send: (value: T) => void;
  /**
   * What the next mount should open, if anything.
   *
   * Non-destructive, because it is read in a `useState` initialiser and a
   * destructive read there is consumed twice under a double render. `register`
   * is the consumption point: a screen that has registered has read it.
   */
  pending: () => T | null;
  /**
   * Install the mounted screen's setter, and return its cleanup.
   *
   * The slot is emptied here, so the value cannot reach a second mount.
   */
  register: (fn: (value: T) => void) => () => void;
};

export function oneShot<T>(): OneShot<T> {
  let slot: T | null = null;
  let live: ((value: T) => void) | null = null;

  return {
    send(value) {
      /* A mounted screen takes it, and then there is nothing to leave behind.
         Writing the slot as well is the bug this file exists for. */
      if (live) { live(value); return; }
      slot = value;
    },
    pending() {
      return slot;
    },
    register(fn) {
      live = fn;
      slot = null;
      /* Only if it is still ours. Two screens overlap for a moment when a tab
         is rebuilt, and an unguarded cleanup running after the new screen
         registered leaves the handle null for the rest of the session, which
         is the same bug the results screen's jumpToTop already guards. */
      return () => { if (live === fn) live = null; };
    },
  };
}
