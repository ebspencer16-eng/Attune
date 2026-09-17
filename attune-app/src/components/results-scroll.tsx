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
import { ScrollView, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollViewProps } from 'react-native';

/**
 * The results scroll view currently on screen, and how far down it is.
 *
 * The offset is kept here because scrolling to a paragraph needs it: the
 * paragraph can say where it is on the screen, and where it is in the document
 * is that plus wherever the page has been scrolled to.
 */
let active: { scroll: ScrollView | null; offsetY: number } | null = null;

/** How far above the marked words to stop, so they are not against the edge. */
const HEADROOM = 90;

export const ResultsScroll = forwardRef<ScrollView, ScrollViewProps>(
  function ResultsScroll(props, forwarded) {
    const own = useRef<ScrollView | null>(null);

    const attach = useCallback((node: ScrollView | null) => {
      own.current = node;
      active = node ? { scroll: node, offsetY: 0 } : null;
      if (typeof forwarded === 'function') forwarded(node);
      else if (forwarded) (forwarded as { current: ScrollView | null }).current = node;
    }, [forwarded]);

    const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (active && active.scroll === own.current) active.offsetY = e.nativeEvent.contentOffset.y;
      props.onScroll?.(e);
    }, [props]);

    return (
      <ScrollView
        {...props}
        ref={attach}
        onScroll={onScroll}
        // Often enough to keep the offset honest, rarely enough to cost
        // nothing: this is only read when someone opens a mark.
        scrollEventThrottle={props.scrollEventThrottle ?? 64}
      />
    );
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
export function scrollIntoResultsView(view: { measureInWindow?: unknown } | null) {
  const scroll = active?.scroll;
  const measure = (view as never as { measureInWindow?: (cb: (x: number, y: number) => void) => void })
    ?.measureInWindow;
  if (!scroll || typeof measure !== 'function') return;

  /**
   * ── WHY NOT measureLayout ───────────────────────────────────────────────
   * It used to measure the paragraph against the scroll view by node handle,
   * which the new React Native architecture warns about on every call: Ellie
   * caught it on screen. "ref.measureLayout must be called with a ref to a
   * native component."
   *
   * Two window measurements and the page's own offset give the same number
   * with nothing deprecated in it: where the paragraph is on the screen, minus
   * where the page starts on the screen, plus how far the page is already
   * scrolled.
   */
  const scrollMeasure = (scroll as never as {
    measureInWindow?: (cb: (x: number, y: number) => void) => void;
  }).measureInWindow;
  if (typeof scrollMeasure !== 'function') return;

  scrollMeasure.call(scroll, (_sx: number, scrollTop: number) => {
    measure.call(view, (_x: number, y: number) => {
      const offset = active?.offsetY ?? 0;
      const target = offset + (y - scrollTop) - HEADROOM;
      scroll.scrollTo({ y: Math.max(0, target), animated: true });
    });
  });
}
