/**
 * The scroll view every results page uses, and the one thing that needs it.
 *
 * ── WHY THIS EXISTS ───────────────────────────────────────────────────────
 * Ellie, of opening a mark from the Notes tab: "yes, on the line not just on
 * the page." Landing on the section and leaving someone at the top of it is
 * only half the job when the thing they tapped is eight paragraphs down.
 *
 * Scrolling to a paragraph needs two things that live far apart: the
 * paragraph, which is a Prose somewhere inside a section, and the scroll view,
 * which each section owns. There are about a dozen of them across three files.
 * Threading a ref through every section to every paragraph would be a prop in
 * twenty places that nineteen of them ignore.
 *
 * So the scroll view registers itself here as it mounts. One results page is
 * on screen at a time, so one slot is enough, and it is cleared on unmount so
 * a scroll can never be sent to a view that has gone. Same arrangement as the
 * jump-to-top handle in results.tsx, for the same reason.
 */

import { forwardRef, useCallback, useRef } from 'react';
import { findNodeHandle, ScrollView, type ScrollViewProps } from 'react-native';

/** The results scroll view currently on screen, if there is one. */
let active: { scroll: ScrollView | null } | null = null;

/** How far above the marked words to stop, so they are not against the edge. */
const HEADROOM = 90;

export const ResultsScroll = forwardRef<ScrollView, ScrollViewProps>(
  function ResultsScroll(props, forwarded) {
    const own = useRef<ScrollView | null>(null);

    const attach = useCallback((node: ScrollView | null) => {
      own.current = node;
      active = node ? { scroll: node } : null;
      if (typeof forwarded === 'function') forwarded(node);
      else if (forwarded) (forwarded as { current: ScrollView | null }).current = node;
    }, [forwarded]);

    return <ScrollView {...props} ref={attach} />;
  },
);

/**
 * Put a view inside the current results page on screen.
 *
 * Measured against the scroll view rather than the window, because the answer
 * has to be a scroll offset and the window's coordinates are not one.
 * Silently does nothing when no results page is mounted, which is the right
 * answer to "scroll to something that is not being shown".
 */
export function scrollIntoResultsView(view: { measureLayout?: unknown } | null) {
  const scroll = active?.scroll;
  if (!scroll || !view || typeof (view as never as { measureLayout: unknown }).measureLayout !== 'function') return;
  const node = findNodeHandle(scroll);
  if (node == null) return;
  (view as never as {
    measureLayout: (n: number, ok: (x: number, y: number) => void, fail: () => void) => void;
  }).measureLayout(
    node,
    (_x, y) => { scroll.scrollTo({ y: Math.max(0, y - HEADROOM), animated: true }); },
    () => { /* the view went away between the layout and the measure */ },
  );
}
