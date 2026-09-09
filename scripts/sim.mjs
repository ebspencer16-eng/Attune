/**
 * Drive the iOS Simulator: tap, swipe, screenshot.
 *
 * ── WHY THIS EXISTS ───────────────────────────────────────────────────────
 * HANDOFF.md said, for several sessions, that "synthetic taps do not register
 * in this simulator, so nothing has been tapped through end to end". That was
 * accepted and worked around: screens were verified by temporarily forcing
 * them to render, then reverting.
 *
 * It is not true. `xcrun simctl` has no input command, which is what that note
 * was really about, but the Simulator is an ordinary macOS window and System
 * Events can click and drag it. Everything below is that.
 *
 * The cost of believing it was a doubled one: bugs that only appear when you
 * interact (scrolling, tab returns, nav) could not be found at all, and every
 * screenshot was of a state that had been forced rather than reached.
 *
 * ── COORDINATES ───────────────────────────────────────────────────────────
 * Arguments are in DEVICE pixels, the same coordinates as a screenshot from
 * `xcrun simctl io booted screenshot`. The mapping to screen coordinates is
 * worked out at run time from the window's real position and size, so it
 * survives the window being moved or the simulator being a different device.
 *
 *   node scripts/sim.mjs tap 474 2470
 *   node scripts/sim.mjs swipe 600 1800 600 900        # drag up = scroll down
 *   node scripts/sim.mjs shot out.png
 *
 * ── LIMITS ────────────────────────────────────────────────────────────────
 * It needs Accessibility permission for whatever runs it, and the Simulator
 * has to be the frontmost window, which this handles by activating it. A swipe
 * is a linear drag with no momentum, so it will not trigger a fling; for a
 * long list, swipe more than once rather than expecting inertia.
 */

import { execFileSync } from 'child_process';
import { readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

const osa = (script) => execFileSync('osascript', ['-e', script], { encoding: 'utf8' }).trim();

/**
 * Where the device screen actually is on the desktop.
 *
 * NOT the window frame. The Simulator window is bigger than the screen it
 * shows: there is a floating toolbar above it and a margin around it, so
 * mapping device pixels onto the window rectangle lands every touch about 65
 * points too high. Large targets still get hit, which is the dangerous part:
 * the tab bar and full-width buttons worked, so the tool looked correct while
 * every small control near the top silently missed. That cost an hour of
 * believing the results nav was broken when it was the test rig.
 *
 * The screen is the one AXGroup inside the window, and asking for it is exact.
 */
function screenRect() {
  osa('tell application "Simulator" to activate');
  const raw = osa(`tell application "System Events" to tell process "Simulator"
    set g to first UI element of window 1 whose role is "AXGroup"
    set p to position of g
    set s to size of g
    return ((item 1 of p) as text) & "," & ((item 2 of p) as text) & "," & ((item 1 of s) as text) & "," & ((item 2 of s) as text)
  end tell`);
  const [x, y, w, h] = raw.split(',').map((n) => parseInt(n.trim(), 10));
  if (![x, y, w, h].every(Number.isFinite) || w < 50 || h < 50) {
    throw new Error(`Could not find the simulator screen. Got: ${raw}`);
  }
  return { x, y, w, h };
}

function deviceSize() {
  // simctl has no way to write a screenshot to stdout: passing "-" creates a
  // file called "-" in the working directory. So: a temp file, read, delete.
  const tmp = join(tmpdir(), `attune-sim-${process.pid}.png`);
  execFileSync('xcrun', ['simctl', 'io', 'booted', 'screenshot', tmp], { stdio: 'ignore' });
  const png = readFileSync(tmp);
  rmSync(tmp, { force: true });
  // The PNG header carries the dimensions, which avoids a dependency.
  return { w: png.readUInt32BE(16), h: png.readUInt32BE(20) };
}

function mapper() {
  const scr = screenRect();
  const dev = deviceSize();
  // A sanity check, because a wrong mapping fails silently on big targets.
  const ratio = (dev.w / scr.w) / (dev.h / scr.h);
  if (ratio < 0.98 || ratio > 1.02) {
    throw new Error(`Screen aspect ${scr.w}x${scr.h} does not match device ${dev.w}x${dev.h}.`);
  }
  return (dx, dy) => [
    Math.round(scr.x + (dx * scr.w) / dev.w),
    Math.round(scr.y + (dy * scr.h) / dev.h),
  ];
}

const [cmd, ...args] = process.argv.slice(2);

if (cmd === 'shot') {
  execFileSync('xcrun', ['simctl', 'io', 'booted', 'screenshot', args[0]], { stdio: 'ignore' });
  console.log(args[0]);
} else if (cmd === 'tap') {
  const [sx, sy] = mapper()(+args[0], +args[1]);
  // Through the same CGEvent path as a swipe. System Events' `click at` does
  // land, but it does not move the cursor first, and the simulator sometimes
  // delivers the touch to whatever was last under the pointer instead.
  const swift = new URL('_lib/drag.swift', import.meta.url).pathname;
  execFileSync('swift', [swift, String(sx), String(sy), String(sx), String(sy), '0'], { stdio: 'inherit' });
  console.log(`tapped device(${args[0]},${args[1]}) -> screen(${sx},${sy})`);
} else if (cmd === 'swipe') {
  const to = mapper();
  const [x1, y1] = to(+args[0], +args[1]);
  const [x2, y2] = to(+args[2], +args[3]);
  // System Events can click but has no mouse-down/move/up, so a drag cannot be
  // written in AppleScript at all. _lib/drag.swift posts real CGEvents.
  const swift = new URL('_lib/drag.swift', import.meta.url).pathname;
  execFileSync('swift', [swift, String(x1), String(y1), String(x2), String(y2), args[4] || '24'],
    { stdio: 'inherit' });
  console.log(`swiped device(${args[0]},${args[1]}) -> (${args[2]},${args[3]})`);
} else {
  console.error('usage: sim.mjs tap <x> <y> | swipe <x1> <y1> <x2> <y2> [steps] | shot <file>');
  process.exit(1);
}
