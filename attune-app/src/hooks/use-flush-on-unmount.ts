import { useEffect, useRef } from 'react';

/**
 * Write what is on the screen when the screen goes away.
 *
 * ── WHY THIS EXISTS ───────────────────────────────────────────────────────
 * Every screen in this app that holds something a person typed saves it on the
 * way forward: the Next button, the Done button, the last question. None of
 * them saved on the way out, and the way out is the back arrow, the tab bar,
 * the Close link, a swipe, a phone call, or iOS reclaiming memory.
 *
 * The Shared Budget lost the last number typed into it that way. The two
 * exercises where an answer is a paragraph, Relationship Reflection and
 * Conflict Patterns, lost the whole paragraph: they persist on advance, so
 * typing an answer and tapping Close wrote nothing, reported nothing, and the
 * question was blank again next time. The three tap-to-select exercises lost
 * the current selection, which is smaller and the same bug.
 *
 * iOS does not promise a TextInput's blur before an unmount, so there is no
 * earlier hook to hang this on. And enumerating the exits is a list that goes
 * stale: a flush on unmount covers every one at once, including the ones nobody
 * has thought of yet.
 *
 * ── WHY A HOOK AND NOT SIX COPIES ─────────────────────────────────────────
 * Because it was one copy, in budget.tsx, and five exercises needed the same
 * thing. What makes it worth sharing is not the three lines of useEffect. It is
 * the two ways the three lines are wrong, both of which fail silently:
 *
 *   The stale closure. A cleanup that closes over the value captures whatever
 *   the value was when the effect was created, which is the empty form. It
 *   writes an empty form over real answers and reports success.
 *
 *   The flush before the load. These screens mount with an empty value and then
 *   fetch what was saved. Close in that window and an unguarded flush posts the
 *   empty value, and `{}` is a valid answers object: /api/save-exercise stores
 *   it over a partly answered exercise. Losing answers is exactly what this
 *   hook is for, so getting that backwards would be worse than not having it.
 *
 * Both are handled here, once, rather than in six places where the fifth one
 * forgets. `ready` is the guard: until it is true there is no baseline and
 * nothing is ever written.
 *
 * check-unmount-flush.mjs holds every screen that saves as it goes to calling
 * this, and holds this file to reading its value from a ref.
 *
 * ── IDEMPOTENCE IS THE CALLER'S JOB ───────────────────────────────────────
 * The baseline is taken once, when `ready` first turns true, so a screen that
 * saved on its own and then unmounted flushes the same value a second time.
 * The writes behind this are upserts, and /api/save-exercise keeps a stored
 * completedAt through a progress save, so a duplicate costs one request and
 * changes nothing. It is not worth the complexity of tracking every save the
 * screen makes for itself.
 *
 * @param value the current state, read fresh at unmount through a ref
 * @param save  what to do with it. Failures are swallowed: there is no screen
 *              left to report them on, and the next open reads the server.
 * @param opts.ready false while the screen is still loading what was saved.
 *              Nothing is written until this has been true at least once.
 * @param opts.when  false to skip the flush, for a screen that has finished.
 */
export function useFlushOnUnmount<T>(
  value: T,
  save: (v: T) => unknown,
  opts: { ready?: boolean; when?: boolean } = {},
) {
  const { ready = true, when = true } = opts;

  const latest = useRef(value);
  latest.current = value;
  const fn = useRef(save);
  fn.current = save;
  const enabled = useRef(when);
  enabled.current = when;

  /**
   * What was on the screen when it finished loading.
   *
   * null until `ready`, which is what stops a flush from writing the empty form
   * over saved answers. Serialised because these values are objects rebuilt on
   * every keystroke, so identity says nothing about whether anything changed.
   */
  const baseline = useRef<string | null>(null);
  if (ready && baseline.current === null) {
    try { baseline.current = JSON.stringify(value); } catch { baseline.current = ''; }
  }

  useEffect(() => () => {
    if (!enabled.current) return;
    if (baseline.current === null) return;
    let now: string;
    try { now = JSON.stringify(latest.current); } catch { return; }
    if (now === baseline.current) return;
    try { void fn.current(latest.current); } catch { /* nothing left to tell */ }
  }, []);
}
