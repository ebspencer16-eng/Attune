#!/usr/bin/env node
/**
 * A cut made the way a person makes one: open the panel, walk down, click.
 *
 * ── THE BUG THIS ENCODES ──────────────────────────────────────────────────
 * Ellie: "Just made a slicer selection but the chart didnt change and slicer
 * still says everyone."
 *
 * Seven slicers were like that, and every gate here passed. The reason is the
 * same one in all of them: every test of a cut ASSIGNED `sel.value` in code,
 * which skips the panel, the walk, pick(), the label and the event. Nothing
 * had ever driven the control a person uses, so nothing could see that the
 * list the panel offered and the list the select could hold were different
 * lists.
 *
 * Two faults underneath. Some tiles do not filter anything: they read a
 * bundle the server pre-computed per segment, and offering a cut with no
 * bundle meant falling back to the whole population, which looks exactly like
 * a click that did nothing. And `initAllSlicers`, which fills every slicer so
 * none sits empty while its tile draws, went on replacing the tile's own list
 * with its wider one every time the page was opened.
 *
 * ── WHAT IT DRIVES ────────────────────────────────────────────────────────
 * Every slicer on every admin page, in one browser: open it, walk to the
 * first real leaf, click it, then read what the select holds, what the button
 * says, and whether the tile behind it moved. A choice that does not stick is
 * the failure; a tile that does not move is reported but not failed, because
 * a cut can legitimately leave a chart looking the same.
 */
import { execFileSync } from 'node:child_process';

const fail = [];
let lines = [];
try {
  const out = execFileSync('node', ['scripts/probe-admin.mjs', 'overview'], {
    env: { ...process.env, OUT: '/dev/null', CLICKCUT: 'every' },
    encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 600000,
  });
  lines = out.split('\n').map((l) => l.trim()).filter((l) => l.startsWith('clickcut '));
} catch (e) {
  fail.push('could not drive the admin: ' + String(e.message).split('\n')[0]);
}

/* A run that found a handful of slicers has lost its subject: the admin has
   dozens, and a selector that stops matching them would otherwise pass. */
if (!fail.length && lines.length < 30) {
  fail.push(`only ${lines.length} slicers were driven; the admin has many more, so this gate is looking at the wrong thing`);
}

let ok = 0;
for (const line of lines) {
  if (line.startsWith('clickcut ok')) { ok += 1; continue; }
  const m = /^clickcut FAIL (\S+) (.*)$/.exec(line);
  if (!m) { fail.push('could not read: ' + line.slice(0, 90)); continue; }
  let d = {};
  try { d = JSON.parse(m[2]); } catch (e) { /* the id alone is enough to report */ }
  fail.push(`${m[1]}: the choice did not stick. The button says "${d.button}" and the select holds "${d.value}". `
    + `Steps: ${(d.steps || []).join(' -> ')}`);
}

if (fail.length) {
  console.error('check-slicer-click FAILED');
  for (const f of fail) console.error('  - ' + f);
  process.exit(1);
}
console.log(`[check-slicer-click] ${ok} slicers across the admin, every one of them opened, walked and clicked, and every choice stuck.`);
