#!/usr/bin/env node
/**
 * A native call that can reject is inside a try.
 *
 * ── THE BUG IT CAME FROM ──────────────────────────────────────────────────
 * Ellie: "Just went back to the app and there's an error banner on the bottom
 * with a red 3 then 'Uncaught (in promise, id:2) Error: Unable t...'"
 *
 * That is React Native's own report of a promise that rejected with nobody
 * listening. The workbook tap was the source: an async handler bound straight
 * to onPress, awaiting Linking.openURL on a URL carrying the whole workbook
 * payload in its query string. iOS rejects that call rather than throwing
 * anywhere a handler can see it, and an onPress does not await what it calls,
 * so the rejection had nowhere to go but the screen.
 *
 * In development that is a red counter in the corner. In a TestFlight build
 * there is no counter and no message: the tap simply does nothing, which is
 * exactly what she described before she saw the banner.
 *
 * ── WHY THESE CALLS AND NOT ALL OF THEM ───────────────────────────────────
 * Nearly everything else in this app returns a result object. api/client.ts
 * answers { ok: false, error } and never throws, which is deliberate and is
 * why most handlers need no try at all. Requiring one everywhere would be a
 * gate that matches too much: it would be satisfied by a hundred empty
 * catches, which is worse than no gate, because an empty catch hides the
 * failure this one exists to surface.
 *
 * So the list below is the calls that hand back a promise the platform can
 * reject: opening a URL, a browser, a share sheet, a screenshot, the keychain,
 * the passcode. Each is a thing outside the app saying no.
 *
 * ── HOW IT IS CHECKED ─────────────────────────────────────────────────────
 * By brace depth from the call upward: if any enclosing block is a `try`, it
 * is covered. A `.catch(` on the same expression counts too, which is how a
 * fire-and-forget call says it has thought about failing.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;

/** Calls the platform can reject. Each is something outside the app saying no. */
const RISKY = [
  'Linking.openURL',
  'openBrowserAsync',
  'Sharing.shareAsync',
  'captureRef',
  'SecureStore.getItemAsync',
  'SecureStore.setItemAsync',
  'SecureStore.deleteItemAsync',
  'authenticateAsync',
];

const files = [];
(function walk(dir) {
  let entries;
  try { entries = readdirSync(dir); } catch { return; }
  for (const name of entries) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (/node_modules|\.expo|ios|android/.test(p)) continue;
      walk(p);
      continue;
    }
    if (name.endsWith('.tsx') || name.endsWith('.ts')) files.push(p);
  }
})(join(ROOT, 'attune-app/src'));

if (files.length < 20) {
  console.error(`[check-native-rejections] only scanned ${files.length} files; refusing to pass.`);
  process.exit(1);
}

const fails = [];

for (const file of files) {
  const rel = file.slice(ROOT.length);
  const src = readFileSync(file, 'utf8');
  /* Comments name these calls when explaining them. Stripped, or this reads
     its own documentation as code, which check-fonts.mjs once did. */
  const code = src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/^(\s*)\/\/.*$/gm, (m, i) => i + ' '.repeat(Math.max(0, m.length - i.length)));

  for (const call of RISKY) {
    let at = 0;
    for (;;) {
      at = code.indexOf(call, at);
      if (at < 0) break;
      const found = at;
      at += call.length;

      /**
       * An import or a type declaration names the call without making it.
       *
       * The first version flagged the `import { openBrowserAsync }` line and a
       * `authenticateAsync: (o) => Promise<...>` in a type, which are three of
       * fourteen reports about nothing. A gate that reports things that are
       * not there gets ignored, and then the eleven real ones are ignored with
       * them.
       */
      const lineStart = code.lastIndexOf('\n', found) + 1;
      const lineEnd = code.indexOf('\n', found);
      const whole = code.slice(lineStart, lineEnd < 0 ? code.length : lineEnd);
      if (/^\s*import\b/.test(whole)) continue;
      if (/:\s*\(/.test(whole) && /=>\s*Promise</.test(whole)) continue;

      /* A .catch on this expression is a handled rejection. */
      const tail = code.slice(found, found + 400);
      if (/\)\s*\.catch\s*\(/.test(tail)) continue;

      /* Walk up counting braces. An unclosed `try {` above means covered. */
      const before = code.slice(0, found);
      let depth = 0;
      let covered = false;
      for (let i = before.length - 1; i >= 0; i -= 1) {
        const ch = before[i];
        if (ch === '}') depth += 1;
        else if (ch === '{') {
          if (depth === 0) {
            /* An open block. Is it a try? */
            if (/\btry\s*$/.test(before.slice(Math.max(0, i - 12), i))) { covered = true; break; }
          } else depth -= 1;
        }
      }
      if (covered) continue;

      const line = before.split('\n').length;
      fails.push(`${rel}:${line} awaits ${call} with nothing catching it. The`
        + ' platform rejects that promise when it says no, and an onPress does'
        + ' not await what it calls, so the rejection reaches the screen as'
        + ' "Uncaught (in promise)" in development and as a tap that did nothing'
        + ' in a real build.');
    }
  }
}

if (fails.length) {
  console.error('\n check-native-rejections: a rejection has nowhere to go.\n');
  for (const f of fails) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}
console.log(`[check-native-rejections] ${files.length} app files;`
  + ` every one of the ${RISKY.length} calls that can reject is caught.`);
