// Fails the build when the app is not set in the website's typefaces.
//
// ── WHAT HAPPENED ──────────────────────────────────────────────────────────
// Ellie, four times, escalating: "Storycards still look different than the ones
// online. Killing me. Check font, coloring, all visuals, etc. Am I seeing an
// old version? You've said you've fixed this so many times."
//
// Each report was answered with a real fix. The aspect ratio, the opener's
// stripe, the grounds, the call-out colours, the stepped figure, the donuts,
// the couple map on card two. All of them were genuinely wrong and all of them
// were genuinely fixed.
//
// None of them was the thing she was looking at. The app's type scale named
// `ui-serif` and `system-ui`, which on iOS resolve to New York and San
// Francisco. The website sets Playfair Display and DM Sans. So every screen in
// the app was in a different typeface from the same screen on the website, and
// the storycards made it unmistakable because they are the one place a person
// holds both at once.
//
// It survived four passes because a generic family name is not a mismatch
// anything can detect. `ui-serif` is a valid font. It renders. It is simply not
// the one. Nothing in the app named a font that could be WRONG, so nothing in
// the app could be found to be wrong.
//
// ── WHAT THIS CHECKS ───────────────────────────────────────────────────────
// That the app's families are the website's, that every family the type scale
// names is actually registered and has a file on disk, and that no generic
// family name has crept back in.

import { readFileSync, existsSync, readdirSync } from 'fs';

const ROOT = new URL('..', import.meta.url).pathname;
const theme = readFileSync(ROOT + 'attune-app/src/constants/attune-theme.ts', 'utf8');
const layout = readFileSync(ROOT + 'attune-app/src/app/_layout.tsx', 'utf8');
const site = readFileSync(ROOT + 'src/App.jsx', 'utf8');

const problems = [];

// ── 1. The website's two families, read from the website ───────────────────
const bodyFamily = site.match(/const BFONT = "'([^']+)'/)?.[1];
const displayFamily = site.match(/const HFONT = "'([^']+)'/)?.[1];
if (!bodyFamily || !displayFamily) {
  problems.push('cannot read BFONT/HFONT from src/App.jsx; refusing to pass.');
}

// The app registers them without spaces, which is how a font file is named.
const norm = (s) => (s || '').replace(/\s+/g, '');

// ── 2. No generic families ─────────────────────────────────────────────────
const GENERIC = ['ui-serif', 'ui-sans-serif', 'system-ui', 'serif', 'sans-serif', 'monospace', 'System'];
const fontsBlock = theme.slice(theme.indexOf('export const Fonts'), theme.indexOf('} as const;', theme.indexOf('export const Fonts')));
for (const g of GENERIC) {
  if (!new RegExp(`['"]${g}['"]`).test(fontsBlock)) continue;
  problems.push(
    `the app's Fonts still names '${g}'.\n`
    + '      A generic family is a valid font that renders and is simply not the one\n'
    + '      the website uses, which is why this went unnoticed through four rounds of\n'
    + '      storycard fixes.');
}

// ── 3. The two families are the website's ──────────────────────────────────
if (bodyFamily && !fontsBlock.includes(norm(bodyFamily))) {
  problems.push(`the app does not use the website's body face, ${bodyFamily}.`);
}
if (displayFamily && !fontsBlock.includes(norm(displayFamily))) {
  problems.push(`the app does not use the website's display face, ${displayFamily}.`);
}

// ── 4. Every family named is registered and on disk ────────────────────────
const registered = new Set(
  [...layout.matchAll(/(\w+):\s*require\('\.\.\/\.\.\/assets\/fonts\/([^']+)'\)/g)].map((m) => m[1]),
);
const files = existsSync(ROOT + 'attune-app/assets/fonts')
  ? new Set(readdirSync(ROOT + 'attune-app/assets/fonts'))
  : new Set();

for (const m of fontsBlock.matchAll(/:\s*'([^']+)'/g)) {
  const family = m[1];
  if (!registered.has(family)) {
    problems.push(
      `the type scale names '${family}' and _layout.tsx never registers it.\n`
      + '      An unregistered family silently falls back to the system font, which is\n'
      + '      the bug this gate exists for, one weight at a time.');
  }
}
for (const [family, file] of [...layout.matchAll(/(\w+):\s*require\('\.\.\/\.\.\/assets\/fonts\/([^']+)'\)/g)].map((m) => [m[1], m[2]])) {
  if (files.has(file)) continue;
  problems.push(`'${family}' is registered from assets/fonts/${file}, which is not there.`);
}

// ── 5. And the files are fonts ─────────────────────────────────────────────
// A failed download that lands as an HTML error page is still a file, and
// require() would still resolve it.
for (const file of files) {
  if (!file.endsWith('.ttf') && !file.endsWith('.otf')) continue;
  const head = readFileSync(ROOT + 'attune-app/assets/fonts/' + file).subarray(0, 4);
  const tag = [...head].map((b) => b.toString(16).padStart(2, '0')).join('');
  const ok = tag === '00010000' || head.toString('latin1') === 'true' || head.toString('latin1') === 'OTTO';
  if (!ok) problems.push(`assets/fonts/${file} is not a TrueType or OpenType file.`);
}

if (problems.length) {
  console.error('[check-fonts] the app is not set in the website\'s typefaces:');
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

console.log(
  `[check-fonts] ${registered.size} faces registered and on disk; `
  + `the app uses ${displayFamily} and ${bodyFamily}, the same as the website.`);
