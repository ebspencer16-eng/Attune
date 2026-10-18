/**
 * The margin mark icons have to beat the page's tap-to-page gesture.
 *
 * ── THE PROMISE ───────────────────────────────────────────────────────────
 * Ellie: "If I tap a tag in the margin, the text that is tagged should select
 * so I can see it. Also, if I hold down on the tag, I should have an option to
 * delete that tag."
 *
 * The rail of note and tag icons is drawn in the results card's right padding.
 * A results page also pages forward on a tap in the right sixth of the screen,
 * which is Ellie's rule from the storycards, and the rail is inside it. So the
 * two want the same touch.
 *
 * The first version lost. The icons were a Pressable, the page's tap is a
 * gesture handler on an ancestor, and the two do not compete: both fired and
 * the page turned. Wrapping the Pressable in
 * `Gesture.Native().blocksExternalGesture()` changed nothing, because a native
 * gesture blocks an external one only once it activates, and a Pressable is a
 * plain View with JS handlers. Both were measured on the simulator before
 * anything was changed, and the page turned both times.
 *
 * What works is a Tap and a LongPress on the icon itself, each naming the page
 * gesture as the one it blocks. That is a chain of four links:
 *
 *   1. the results page gives its edge tap a ref
 *   2. and hands that ref to the annotation provider
 *   3. which passes it to the rail
 *   4. where each icon's gestures block it
 *
 * Break any one and the tap turns the page again, silently: nothing throws and
 * the icon still draws.
 *
 * ── WHAT THIS DOES NOT COVER ──────────────────────────────────────────────
 * It does not drive the gesture. Only the simulator can, and a check that
 * needs a booted simulator is a check that does not run in a chain. So this
 * holds the structure that the measurement proved, and the measurement is
 * written down above rather than repeated.
 */

import { readFileSync } from 'fs';

const RAIL = 'attune-app/src/components/annotation-context.tsx';
const PAGE = 'attune-app/src/components/results.tsx';

const fail = [];
const rail = readFileSync(RAIL, 'utf8');
const page = readFileSync(PAGE, 'utf8');

/** The body of `useMarkRail`, which is the only part of that file this is about. */
function useMarkRailBody(src) {
  const at = src.indexOf('export function useMarkRail');
  if (at < 0) return null;
  /* To the next top-level declaration, rather than by brace depth: a walk that
     miscounts runs on and takes the rest of the file with it. */
  const rest = src.slice(at + 10);
  const end = rest.search(/\n(export (function|const|type)|function|const) /);
  return end < 0 ? rest : rest.slice(0, end);
}

const body = useMarkRailBody(rail);
if (!body) {
  console.error(`FAIL ${RAIL}: useMarkRail is not there any more. This check has lost its subject.`);
  process.exit(1);
}

/* Comments are blanked: this file explains the bug in prose, and a scan that
   reads the explanation as code punishes it for being written down. */
const code = body
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^[ \t]*\/\/.*$/gm, ' ');

// 1. The page names its edge tap.
if (!/const\s+pageGestureRef\s*=\s*useRef/.test(page)) {
  fail.push(`${PAGE}: no pageGestureRef. The edge tap has nothing to be blocked by.`);
}
if (!/Gesture\.Tap\(\)[\s\S]{0,400}?\.withRef\(pageGestureRef\)/.test(page)) {
  fail.push(`${PAGE}: the edge tap does not carry .withRef(pageGestureRef), so no icon can block it.`);
}

// 2. And hands it to the provider.
if (!/<AnnotationProvider[\s\S]{0,600}?pageGesture=\{pageGestureRef\}/.test(page)) {
  fail.push(`${PAGE}: AnnotationProvider is not given pageGesture, so the rail cannot block the page.`);
}

// 3. The rail takes it off the context.
/* The name on either side of the `=`: it is destructured off the context,
   which puts it before `useAnnotations()` rather than after it. */
if (!/pageGesture[\s\S]{0,200}?useAnnotations\(\)/.test(code)) {
  fail.push(`${RAIL}: useMarkRail does not read pageGesture from the context.`);
}

// 4. And both gestures block it.
for (const g of ['Tap', 'LongPress']) {
  if (!new RegExp(`Gesture\\.${g}\\(`).test(code)) {
    fail.push(`${RAIL}: the rail has no Gesture.${g}. A tap and a hold are different gestures and the icons answer both.`);
  }
}
const blocks = (code.match(/blocksExternalGesture\(pageGesture\)/g) || []).length;
if (blocks < 2) {
  fail.push(`${RAIL}: ${blocks} of the rail's gestures block the page gesture, and both have to. A composed gesture takes no relations of its own, so each half declares it.`);
}

// And the shape that lost, named so it cannot come back.
if (/<Pressable/.test(code)) {
  fail.push(`${RAIL}: the rail draws a Pressable. That is what this check exists about: a Pressable does not compete with the page's gesture, so the tap turned the page instead of showing the words.`);
}
if (/Gesture\.Native\(\)/.test(code)) {
  fail.push(`${RAIL}: the rail uses Gesture.Native(). It was tried and it does not block: a native gesture blocks only once it activates, which a plain View never does.`);
}

if (fail.length) {
  for (const f of fail) console.error(`FAIL ${f}`);
  process.exit(1);
}
console.log('ok  the margin mark icons block the results page tap (4 links checked)');
