#!/usr/bin/env node
/**
 * The website builds without the app's dependencies installed.
 *
 * ── THE BUG ───────────────────────────────────────────────────────────────
 * src/App.jsx imported attune-app/src/lib/insight-fit.ts, which is the right
 * instinct: one copy of a rule both surfaces need. The file extension broke the
 * deploy.
 *
 * vite runs a .ts file through esbuild, esbuild looks for the nearest
 * tsconfig.json, and attune-app's says `"extends": "expo/tsconfig.base"`. The
 * website's own `npm ci` installs the root package only, so on Vercel `expo`
 * resolved to nothing and the build stopped with:
 *
 *   failed to resolve "extends":"expo/tsconfig.base" in attune-app/tsconfig.json
 *
 * `npx vite build` passed on my machine every time, because a developer's
 * machine has attune-app/node_modules. The site went two commits without
 * deploying and the only symptom was that her fixes were not there.
 *
 * ── THE RULE ──────────────────────────────────────────────────────────────
 * Anything the website imports from attune-app has to be reachable with only
 * the root install. In practice: plain JavaScript, no tsconfig lookup, and no
 * import of its own that lives in the app's dependencies.
 *
 * ── WHY NOT BUILD IN A CLEAN CLONE ────────────────────────────────────────
 * That is the real test and it is what found this, but it is a clone and an
 * `npm ci` per run: minutes, every time, for a rule that is about which files
 * are named what. This is the fast half and it says so. The honest version runs
 * once, by hand, and is written up in the commit that needed it.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Anything else that could make a deploy fail and a local build pass:
 * environment variables, a case-sensitive filesystem, a dependency that only
 * resolves from a hoisted node_modules. This is scoped to the one boundary that
 * has actually broken, and widening it to "the build works" would mean doing
 * the build.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const fails = [];

const SRC = 'src/App.jsx';
const WEB_FILES = ['src/App.jsx', 'src/main.jsx', 'src/notes-web.jsx', 'src/attune-mark.jsx'];

/* The app's tsconfig is the thing that cannot be read without the app's
   install. If it ever stops extending a package, this check is about a problem
   that no longer exists and should be re-read rather than trusted. */
const appTsconfig = join(ROOT, 'attune-app/tsconfig.json');
if (!existsSync(appTsconfig)) {
  console.error('[check-deploy-build] attune-app/tsconfig.json is gone.'
    + ' Refusing to pass: a gate that has lost its subject must never report success.');
  process.exit(1);
}
const extendsPkg = /"extends"\s*:\s*"([^"./][^"]*)"/.exec(readFileSync(appTsconfig, 'utf8'));

let crossed = 0;
for (const rel of WEB_FILES) {
  const path = join(ROOT, rel);
  if (!existsSync(path)) continue;
  const src = readFileSync(path, 'utf8');

  for (const m of src.matchAll(/from\s+["'](\.\.\/attune-app\/[^"']+)["']/g)) {
    const spec = m[1];
    crossed += 1;
    const line = src.slice(0, m.index).split('\n').length;

    if (/\.tsx?$/.test(spec) || !/\.[a-z]+$/.test(spec)) {
      fails.push(`${rel}:${line} imports ${spec} from the app.\n`
        + `      vite sends a .ts file through esbuild, which reads attune-app/tsconfig.json,\n`
        + `      which extends ${extendsPkg ? `"${extendsPkg[1]}"` : 'a package'} and that is not\n`
        + '      installed by the website\'s npm ci. The build fails on Vercel and passes here.\n'
        + '      Make it plain .js with JSDoc types, and name the extension outright so nothing\n'
        + '      has to guess.');
      continue;
    }

    /* And the file it reaches has to stand alone. One import of its own that
       lives in the app's dependencies puts the deploy back where it was. */
    const target = join(ROOT, 'src', spec);
    if (!existsSync(target)) {
      fails.push(`${rel}:${line} imports ${spec}, which does not exist.`);
      continue;
    }
    const imports = [...readFileSync(target, 'utf8').matchAll(/from\s+["']([^"']+)["']/g)]
      .map((x) => x[1]);
    if (imports.length) {
      fails.push(`${spec} is imported by the website and imports ${imports.join(', ')}.\n`
        + '      It has to stand alone: the website\'s install has none of the app\'s\n'
        + '      dependencies, and an import resolved from attune-app/node_modules works on a\n'
        + '      developer\'s machine and nowhere else.');
    }
  }
}

if (fails.length) {
  console.error('\n check-deploy-build: the website reaches into the app in a way that only'
    + ' builds here.\n');
  for (const f of fails) console.error(`  ✗ ${f}\n`);
  process.exit(1);
}

console.log(`[check-deploy-build] the website imports ${crossed} file${crossed === 1 ? '' : 's'}`
  + ' from attune-app, all plain JavaScript with no imports of their own, so the deploy needs'
  + ' only the root install.');
