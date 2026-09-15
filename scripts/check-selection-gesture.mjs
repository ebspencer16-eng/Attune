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
 * ── AND WHY THIS FILE WAS REWRITTEN ───────────────────────────────────────
 * The version of this gate that checked the press-and-drag build passed on
 * every run while the feature did not work at all. It asked for a PanResponder
 * with a hold and a move handler, and all three were there. What it could not
 * see is that on iOS a ScrollView scrolls through its own native gesture
 * recogniser, so the moment a finger inside one moves, React Native cancels
 * the JS touch and onMoveShouldSetPanResponder is never asked. Ellie: "In the
 * simulator I can select text but I haven't seen the toolbar yet." Nothing was
 * ever selected; the toolbar had nothing to appear over.
 *
 * That is the failure this project keeps writing down: a gate that describes
 * the shape of an implementation cannot tell whether the implementation works.
 * So this one now checks the one structural fact that decides it, which is
 * that the gesture is a gesture-handler pan and not a pan responder, and it
 * runs the style split rather than reading it.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Whether the drag feels right, which is a finger on a screen. The flow was
 * driven end to end in the simulator with synthetic touches: press, hold,
 * drag, release, tap the highlighter, colour picker open on the right words.
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
const code = src.replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').filter((l) => !/^\s*(\/\/|\*)/.test(l)).join('\n');
if (/PanResponder/.test(code)) {
  fails.push('this is back on a PanResponder, which a ScrollView beats on iOS: the move is never seen');
}
if (!/Gesture\.Pan\(\)/.test(src)) {
  fails.push('there is no gesture-handler pan, so there is no drag that can win against the scroll');
}
if (!/activateAfterLongPress\(HOLD_MS\)/.test(src)) {
  fails.push('the pan does not wait for a long press, so it will eat scrolls that start on a word');
}
if (!/\.onUpdate\(/.test(src)) {
  fails.push('the pan does not handle movement, so dragging cannot extend the selection');
}
const hold = src.match(/const HOLD_MS = (\d+);/);
if (!hold) {
  fails.push('no hold delay is declared, so the paragraph will take touches meant for the scroll view');
} else if (Number(hold[1]) < 200) {
  fails.push(`the hold is ${hold[1]}ms, which is short enough to catch scrolls that start on a word`);
}

/** 3. The toolbar, placed from the selection and tappable. */
if (!/\.onEnd\(\(\) => setSettled\(true\)\)/.test(src)) {
  fails.push('the toolbar does not wait for the finger to lift');
}
if (!/top: box\.y >= TOOLBAR_H \+ 6 \? box\.y - TOOLBAR_H - 6 : box\.bottom \+ 6/.test(src)) {
  fails.push('the toolbar is not placed from the selection box, above it or below it');
}
if (!/cancelsTouchesInView\(false\)/.test(src)) {
  fails.push('the pan cancels the touches under it, which takes the toolbar\'s own presses away');
}
for (const action of ['highlight', 'underline', 'tag', 'note', 'share']) {
  if (!new RegExp(`action: '${action}'`).test(src)) {
    fails.push(`the toolbar has no ${action}`);
  }
}

/**
 * 4. The paragraph's box styles stay off the words. Run, not read.
 *
 * Ellie: "Spacing got messed up for intro paragraph on internal processing
 * page... I'm noticing it more places, I assume it's the same bug." It was.
 * Every word carried the paragraph's own marginTop, so every wrapped line sat
 * that much further apart. It looked like a line-height problem, which is what
 * made it hard to place.
 */
const splitStyle = (() => {
  // Everything between the signature's own opening brace and the closing
  // brace in the first column. The return type is part of the signature, so
  // the match has to start after it rather than at the first brace it sees.
  const m = src.match(/export function splitStyle[\s\S]*?\} \{\n([\s\S]*?)\n\}/);
  if (!m) {
    console.error('[check-selection-gesture] splitStyle is not in annotatable.tsx under that name.');
    process.exit(1);
  }
  const keys = src.match(/const TEXT_KEYS = new Set\(\[([\s\S]*?)\]\);/);
  if (!keys) {
    console.error('[check-selection-gesture] TEXT_KEYS is not declared, so the split has nothing to split on.');
    process.exit(1);
  }
  const body = m[1]
    .replace(/: Record<string, unknown>/g, '')
    .replace(/ as Record<string, unknown>/g, '')
    .replace(/ as TextStyle/g, '')
    .replace(/ as ViewStyle/g, '');
  // eslint-disable-next-line no-new-func
  return new Function('StyleSheet', `const TEXT_KEYS = new Set([${keys[1]}]);\nreturn (style) => {${body}\n};`)(
    { flatten: (s) => Object.assign({}, ...[].concat(s).filter(Boolean)) },
  );
})();

const PARAGRAPH = {
  fontFamily: 'DMSans', fontSize: 15, lineHeight: 26, color: '#1E1610',
  marginTop: 16, paddingLeft: 8, flex: 1, textAlign: 'center',
};
const split = splitStyle(PARAGRAPH);
for (const k of ['marginTop', 'paddingLeft', 'flex']) {
  if (k in (split.text || {})) fails.push(`${k} is put on every word, which is the spacing bug`);
  if (!(k in (split.box || {}))) fails.push(`${k} is dropped entirely rather than moved to the paragraph`);
}
for (const k of ['fontSize', 'lineHeight', 'color', 'fontFamily']) {
  if (!(k in (split.text || {}))) fails.push(`${k} never reaches the words, so the type is wrong`);
}
// A row of words cannot be text-aligned; the alignment has to move to the row.
if (split.box?.justifyContent !== 'center') {
  fails.push('a centred paragraph is not centred, because textAlign does not survive the split');
}

if (fails.length) {
  console.error('[check-selection-gesture] marking a fragment will not work the way it was asked for:');
  for (const f of fails) console.error(`  ${f}`);
  console.error('');
  console.error(`See the note at the top of ${file}: press, drag, release, toolbar.`);
  process.exit(1);
}

console.log('[check-selection-gesture] per-word frames, a held press the scroll view cannot steal, a toolbar over the selection with all five actions, and paragraph styles that stay off the words.');
