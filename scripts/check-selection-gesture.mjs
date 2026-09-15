#!/usr/bin/env node
/**
 * Selecting text is a press, a drag, and a toolbar where the words are.
 *
 * ── WHY THIS IS CHECKED AT ALL ────────────────────────────────────────────
 * The first build of this was two taps: long-press one word, tap another.
 * Ellie: "This is bad. On the app I want people to be able to hold down to
 * select then drag their finger to increase the selected area. Once they lift
 * their finger, I want the toolbar to pop up right above the selected area."
 *
 * Three things have to hold for that to work at all, and none of them is
 * visible in a screenshot or provable by a type:
 *
 *   1. Each word reports its own frame. The whole reason two taps was chosen
 *      first is that React Native does not report per-word geometry inside a
 *      flowing Text. Dragging needs it, so each word is its own View with an
 *      onLayout. If that ever goes back to nested Texts, the drag silently
 *      selects the wrong words.
 *
 *   2. The gesture waits before taking the touch. These paragraphs live in a
 *      vertical ScrollView, and a responder that claims every touch eats every
 *      scroll that starts on a word, which is most of them.
 *
 *   3. The toolbar is placed from the selection's own box rather than pinned
 *      to the screen, because "right above the selected area" is the ask.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Whether the drag feels right, which is a finger on a screen and is R61.
 * This is the structure that makes the feel possible.
 */

import { readFileSync } from 'node:fs';

const ROOT = new URL('..', import.meta.url).pathname;
const file = 'attune-app/src/components/annotatable.tsx';
const src = readFileSync(ROOT + file, 'utf8');
const fails = [];

/** 1. Per-word frames. */
if (!/onLayout=\{\(e\) => \{ frames\.current\.set/.test(src)) {
  fails.push('words do not report their own frames, so a drag cannot know which word it is over');
}
if (!/flexWrap: 'wrap'/.test(src)) {
  fails.push('the words are not laid out as a wrapping row, which is what gives each one a frame');
}

/** 2. The drag, and the wait before it. */
if (!/PanResponder\.create/.test(src)) {
  fails.push('there is no pan responder, so there is no drag');
}
if (!/onPanResponderMove/.test(src)) {
  fails.push('the responder does not handle movement, so dragging cannot extend the selection');
}
const hold = src.match(/const HOLD_MS = (\d+);/);
if (!hold) {
  fails.push('no hold delay is declared, so the paragraph will take touches meant for the scroll view');
} else if (Number(hold[1]) < 200) {
  fails.push(`the hold is ${hold[1]}ms, which is short enough to catch scrolls that start on a word`);
}
if (!/onMoveShouldSetPanResponder/.test(src)) {
  fails.push('the responder claims the gesture on touch rather than on movement after a hold');
}

/** 3. The toolbar, positioned from the selection. */
if (!/onPanResponderRelease[\s\S]{0,120}setSettled\(true\)/.test(src)) {
  fails.push('the toolbar does not wait for the finger to lift');
}
if (!/top: box\.y - TOOLBAR_H/.test(src)) {
  fails.push('the toolbar is not placed above the selection box');
}
// Every action Ellie named has to be on it.
for (const action of ['highlight', 'underline', 'tag', 'note', 'share']) {
  if (!new RegExp(`action: '${action}'`).test(src)) {
    fails.push(`the toolbar has no ${action}`);
  }
}

if (fails.length) {
  console.error('[check-selection-gesture] marking a fragment will not work the way it was asked for:');
  for (const f of fails) console.error(`  ${f}`);
  console.error('');
  console.error(`See the note at the top of ${file}: press, drag, release, toolbar.`);
  process.exit(1);
}

console.log('[check-selection-gesture] per-word frames, a held press before the drag, and a toolbar over the selection with all five actions.');
