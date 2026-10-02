/**
 * The Attune mark, drawn once.
 *
 * ── THE BUG ───────────────────────────────────────────────────────────────
 * Ellie, of the Notes loading screen: "Only seeing the left half of the mark."
 *
 * She was describing it exactly. The mark is two speech bubbles, each with a
 * heart, and public/favicon.svg draws all four paths. The website drew it inline
 * twelve times by hand, and five of those twelve drew the left bubble and
 * stopped. The viewBox is 103 wide either way, so a half mark occupies the full
 * box with nothing in the right of it, and at 28 points nobody noticed. The
 * loading screen only gave it away because I had just made it 68.
 *
 * ── WHY A COMPONENT ───────────────────────────────────────────────────────
 * Twelve hand copies of one drawing is the failure this codebase is organised
 * against, and this is the form where the copies are not even the same picture.
 * check-mark-artwork.mjs holds these paths to public/favicon.svg, which is the
 * artwork the browser tab shows, and fails on any file that inlines its own.
 *
 * ── THE GRADIENT ID ───────────────────────────────────────────────────────
 * Unique per instance. An SVG gradient is referenced by id across the whole
 * document, so two marks sharing one id means the second silently paints with
 * the first one's definition, and the first unmounting takes the second's fill
 * with it.
 */

import { useId } from 'react';

/** Orange into blue, down the diagonal. The brand's one gradient. */
const FROM = '#E8673A';
const TO = '#1B5FE8';

/** The left bubble: filled. */
const BUBBLE_L = 'M14,4 L44,4 A9,9 0 0,1 53,13 L53,42 A9,9 0 0,1 44,51 L20,51 L6,61 L11,51 A6,6 0 0,1 5,45 L5,13 A9,9 0 0,1 14,4 Z';
/** The right bubble: outlined, and the half that kept going missing. */
const BUBBLE_R = 'M89,14 L59,14 A9,9 0 0,0 50,23 L50,52 A9,9 0 0,0 59,61 L83,61 L97,71 L92,61 A6,6 0 0,0 98,55 L98,23 A9,9 0 0,0 89,14 Z';
/** One heart, placed twice. */
const HEART = 'M22 11 C20 8.5 16.5 5 11.5 5 C5.5 5 2 9.5 2 14.5 C2 23 11 30 22 40 C33 30 42 23 42 14.5 C42 9.5 38.5 5 32.5 5 C27.5 5 24 8.5 22 11 Z';

export const MARK_PATHS = { BUBBLE_L, BUBBLE_R, HEART };

/**
 * @param {object}  props
 * @param {number}  props.width   in points; the height follows the artwork
 * @param {string}  [props.tone]  'gradient' on paper, 'onColor' over a painted
 *                                ground, where the filled bubble takes a white
 *                                outline so its edge survives the colour behind it
 * @param {string}  [props.title] an accessible name, or nothing for decoration
 */
export function AttuneMark({ width = 28, tone = 'gradient', title, style }) {
  const id = useId().replace(/[^\w-]/g, '');
  const height = Math.round((width * 76) / 103);
  return (
    <svg
      width={width} height={height} viewBox="0 0 103 76" fill="none"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : 'true'}
      style={style}
    >
      {title ? <title>{title}</title> : null}
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="103" y2="76" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={FROM} />
          <stop offset="100%" stopColor={TO} />
        </linearGradient>
      </defs>
      <path
        d={BUBBLE_L}
        fill={`url(#${id})`}
        {...(tone === 'onColor'
          ? { stroke: 'white', strokeWidth: '2.2', strokeLinejoin: 'round' }
          : null)}
      />
      <path d={HEART} fill="white" opacity="0.93" transform="translate(13.16,11.3) scale(0.72)" />
      <path d={BUBBLE_R} fill="white" stroke={`url(#${id})`} strokeWidth="2.2" strokeLinejoin="round" />
      <path d={HEART} fill={`url(#${id})`} transform="translate(58.16,21.3) scale(0.72)" />
    </svg>
  );
}

export default AttuneMark;
