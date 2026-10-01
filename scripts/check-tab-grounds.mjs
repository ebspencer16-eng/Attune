#!/usr/bin/env node
/**
 * The colour a tab is painted in is one colour, not two hexes.
 *
 * ── WHY THERE ARE TWO COPIES ──────────────────────────────────────────────
 * Ellie: "I want the site to use some of the design elements we've built for
 * the app (section 2 on site should look like the insights menu, section 3 on
 * dashboard should look like learn page but also link to notes)."
 *
 * The grounds were constants in attune-app/src/constants/attune-theme.ts, which
 * was right while they belonged to four screens of an app. Now the website
 * paints two of them, and an Expo project cannot import from api/, so the hexes
 * exist in both places. That is the wall every gate in this directory is about.
 *
 * ── WHAT IT CHECKS ────────────────────────────────────────────────────────
 * The three grounds the two surfaces share, compared as colours rather than as
 * source: Home's blue, Insights' orange, and Learn, which is Home's blue lifted
 * a fifth toward white.
 *
 * Learn is the one worth having a check for. It is not a literal in either
 * place: both sides compute it from the blue with the same `lighten`, written
 * out twice, and two implementations of a colour function agreeing today is not
 * the same as them agreeing after someone tidies one. Comparing the answers
 * means neither side has to keep the other's arithmetic, only its result.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Whether the colours are right. That is Ellie's eye and it is in TASKS.md for
 * her, which is where this pass should have gone in the first place rather than
 * into section 4 as done.
 *
 * Where each ground is used. The app paints whole tabs and the website paints
 * two blocks of a dashboard, which is the point rather than a divergence: she
 * asked for the sections to look like the tabs, not to become them.
 *
 * The results-section grounds, which are already shared properly through
 * SECTION_GROUNDS in the same module and need no mirror.
 */

import { readFileSync } from 'node:fs';

import { transformSync } from 'esbuild';

import { TAB_GROUNDS } from '../api/_lib/section-grounds.js';

const ROOT = new URL('..', import.meta.url).pathname;

const same = (a, b) => a.length === b.length
  && a.every((x, i) => String(x).toLowerCase() === String(b[i]).toLowerCase());

const fails = [];

/**
 * ── COMPARED AGAINST THE SCREEN, NOT AGAINST A CONSTANT'S NAME ────────────
 * The first version of this compared the server's copy to BlueGround,
 * OrangeGround and LearnGround, and passed, while the website painted a home
 * screen that looked nothing like the app's. Home does not use BlueGround. It
 * paints cream, cream again at 58 per cent, then indigo, and the constant with
 * "blue" in its name is used elsewhere.
 *
 * So the gate reads the gradient each screen actually draws. A check that reads
 * the same constant the code reads proves the constant has one value; it proves
 * nothing about what is on screen.
 */
const read = (rel) => readFileSync(`${ROOT}${rel}`, 'utf8');

/**
 * The gradient that is the page, not the first one in the file.
 *
 * A plant found this: renaming the page's `<LinearGradient` tag did not lose
 * the gate its subject, it silently redirected it to a second gradient 240
 * lines further down, the wash inside the home tile. It happened to fail
 * because the colours differed, which is luck rather than coverage. Adding a
 * decorative gradient above the ground would have pointed the gate at it and
 * passed.
 *
 * So the block is chosen by what makes it the page: a full-bleed absolute fill.
 * Both screens write that style identically and neither decoration does. More
 * than one, or none, is an ambiguous subject and fails rather than guessing.
 */
const FULL_BLEED = "position: 'absolute', top: 0, left: 0, right: 0, bottom: 0";

function pageGround(rel) {
  const src = read(rel);
  const blocks = [];
  const re = /<LinearGradient\b/g;
  for (let m = re.exec(src); m; m = re.exec(src)) {
    /* To the end of the tag. These are all self-closing, and stopping at the
       first `/>` keeps a decoration's props out of the ground's block. */
    const end = src.indexOf('/>', m.index);
    if (end !== -1) blocks.push(src.slice(m.index, end));
  }
  const grounds = blocks.filter((b) => b.includes(FULL_BLEED));
  if (grounds.length !== 1) {
    return { error: `${rel} has ${grounds.length} full-bleed LinearGradient blocks.`
      + ' Exactly one is the page ground, and which one cannot be guessed.'
      + ' Refusing to pass: a gate that has lost its subject must never report'
      + ' success.' };
  }
  const block = grounds[0];

  const colours = /colors=\{\[([^\]]*)\]\}/.exec(block);
  const locations = /locations=\{\[([^\]]*)\]\}/.exec(block);
  /* Anchored to a prop boundary. `/start=/` on its own matched `xstart=`, so a
     renamed prop read as still present: the first way a gate gets defeated
     without deleting anything. */
  const points = /(?:^|[\s{])start=\{\{\s*x:\s*([\d.]+),\s*y:\s*([\d.]+)\s*\}\}[\s\S]*?(?:^|[\s{])end=\{\{\s*x:\s*([\d.]+),\s*y:\s*([\d.]+)\s*\}\}/m.exec(block);

  return {
    colours: colours ? colours[1].split(',').map((x) => x.trim()).filter(Boolean) : null,
    locations: locations
      ? locations[1].split(',').map((x) => Number(x.trim())).filter((n) => !Number.isNaN(n))
      : null,
    points: points ? {
      start: { x: Number(points[1]), y: Number(points[2]) },
      end: { x: Number(points[3]), y: Number(points[4]) },
    } : null,
  };
}

const PALETTE = {};
{
  const t = read('attune-app/src/constants/attune-theme.ts');
  for (const m of t.matchAll(/^\s{2}(\w+): '(#[0-9a-fA-F]{3,8})',/gm)) PALETTE[m[1]] = m[2];
}
const resolve = (tok) => {
  const m = /^Palette\.(\w+)$/.exec(tok);
  if (m) return PALETTE[m[1]] || tok;
  return tok.replace(/^'|'$/g, '');
};

/**
 * The CSS angle a React Native two-point sweep comes to.
 *
 * y grows downward in a React Native box and upward in a CSS angle, which is
 * the sign that has to be flipped. Checked against both screens by hand:
 * (0.3,0)->(0.7,1) is 158 and (1,0)->(0,1) is 225. Writing atan2(dx, dy)
 * instead reported 22 and 315, and the first reading was that the server was
 * wrong, which is what a gate with its own arithmetic backwards looks like.
 */
function cssAngle({ start, end }) {
  const dx = end.x - start.x;
  const dy = -(end.y - start.y);
  return Math.round(((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360);
}

/**
 * The app's theme, evaluated rather than read.
 *
 * `LearnGround` is not a literal in either place: both sides compute it from
 * the blue with their own `lighten`. A regex over the source would have had to
 * carry a third copy of that arithmetic, and a gate that reimplements the rule
 * it is checking is comparing itself to one side rather than the two sides to
 * each other. So the module is compiled and run, and what comes back is the
 * colour the app ships.
 */
let appTheme = null;
try {
  const ts = read('attune-app/src/constants/attune-theme.ts');
  const js = transformSync(ts, { loader: 'ts', format: 'esm' }).code;
  appTheme = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
} catch (err) {
  fails.push('attune-app/src/constants/attune-theme.ts would not compile or evaluate here:'
    + ` ${String(err.message || err).slice(0, 140)}. Refusing to pass: a gate that has lost`
    + ' its subject must never report success.');
}

/**
 * Which file paints each tab, and where its colours come from.
 *
 * Home writes its three stops inline. Insights and Learn are both TabScreen,
 * which is handed a pair from the theme, so their colours come from the
 * evaluated module and only their aim comes from the component.
 */
const TABS = [
  { tab: 'home', file: 'attune-app/src/app/index.tsx', inline: true },
  { tab: 'insights', file: 'attune-app/src/components/tab-screen.tsx', from: 'OrangeGround' },
  { tab: 'learn', file: 'attune-app/src/components/tab-screen.tsx', from: 'LearnGround' },
];

for (const { tab, file, inline, from } of TABS) {
  const server = TAB_GROUNDS[tab];
  if (!server) {
    fails.push(`api/_lib/section-grounds.js has no ground for the ${tab} tab, so the`
      + ' website cannot paint that block at all.');
    continue;
  }

  const ground = pageGround(file);
  if (ground.error) { fails.push(ground.error); continue; }

  // ── The colours ───────────────────────────────────────────────────────────
  let want = null;
  if (inline) {
    if (!ground.colours) {
      fails.push(`${file}'s page ground names no colours, so there is nothing to compare`
        + ` the server's ${tab} stops against.`);
    } else {
      want = ground.colours.map(resolve);
    }
  } else if (appTheme) {
    const v = appTheme[from];
    want = v ? [...v] : null;
    if (!want || want.length !== 2 || !want.every((h) => /^#[0-9a-fA-F]{6}$/.test(h))) {
      fails.push(`attune-theme.ts no longer exports ${from} as two hex stops, so there is`
        + ` nothing to compare the server's ${tab} ground against.`);
      want = null;
    }
  }
  if (want && !want.every((h) => /^#[0-9a-fA-F]{3,8}$/.test(h))) {
    fails.push(`the ${tab} ground reads ${JSON.stringify(want)} in the app, which this`
      + ' cannot resolve to colours. Refusing to pass on stops it cannot read.');
    want = null;
  }
  if (want && !same(want, server.stops)) {
    fails.push(`${tab} is ${JSON.stringify(want)} in the app and`
      + ` ${JSON.stringify(server.stops)} on the server. The website draws the server's,`
      + ' so this is one tab being two colours depending on which surface you are on.');
  }

  // ── Where the stops sit ───────────────────────────────────────────────────
  const appLoc = ground.locations;
  const srvLoc = server.locations;
  if (!!appLoc !== !!srvLoc) {
    fails.push(`${tab} ${appLoc ? 'places its stops in the app and not on the server'
      : 'places its stops on the server and not in the app'}. Evenly spaced and placed at`
      + ' 58 per cent are different pictures of the same three colours.');
  } else if (appLoc && !same(appLoc.map(String), srvLoc.map(String))) {
    fails.push(`${tab} puts its stops at ${JSON.stringify(appLoc)} in the app and`
      + ` ${JSON.stringify(srvLoc)} on the server. Cream holding past halfway is the`
      + ' whole look of the home screen.');
  }

  // ── Which way it runs ─────────────────────────────────────────────────────
  if (!ground.points) {
    fails.push(`${file}'s page ground is no longer aimed with start and end points, so`
      + ` the angle the website draws ${tab} at cannot be compared to it. Refusing to`
      + ' pass: a gate that has lost its subject must never report success.');
  } else {
    const angle = cssAngle(ground.points);
    if (angle !== server.angle) {
      fails.push(`${tab} runs its gradient at ${angle} degrees in the app and`
        + ` ${server.angle} on the server. Same colours, different direction, which is`
        + ' most of why the two home screens did not look alike.');
    }
  }
}

if (fails.length) {
  console.error('\n check-tab-grounds: a tab is two colours depending on which surface you'
    + ' are on.\n');
  for (const f of fails) console.error(`  ✗ ${f}\n`);
  console.error('  api/_lib/section-grounds.js is the one the website reads and'
    + ' attune-theme.ts is\n  the one the app reads. They cannot import each other, so they'
    + ' have to be held\n  equal here.\n');
  process.exit(1);
}

console.log("[check-tab-grounds] 3 grounds, read off the screens that draw them: home's"
  + " cream falling to indigo at 58 per cent, Insights' orange, and Learn, which both sides"
  + ' compute from the blue rather than writing it down.');
