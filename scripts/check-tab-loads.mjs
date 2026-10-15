#!/usr/bin/env node
/**
 * A tab does not fetch anything until somebody opens it.
 *
 * ── WHAT ELLIE REPORTED ───────────────────────────────────────────────────
 * "What's the problem now, because I have no marks so my notes page shouldn't
 * be so slow?"
 *
 * Right about the data and right that something else was wrong. The app's tab
 * bar is the UIKit one, so all four screens mount when the app starts, and each
 * of them called its loader from a mount effect. Opening the app therefore
 * fired every tab's requests at once, ten of them across four screens, each one
 * a serverless function and several of them cold, on one phone's connection.
 * The tab she was waiting for was queued behind three she had not asked for.
 *
 * Every screen already reloads on focus, and a focus effect fires on mount for
 * the screen that IS focused. So the mount effect did one useful thing and
 * three wasteful ones.
 *
 * ── WHAT IT CHECKS ────────────────────────────────────────────────────────
 * By parsing, not by grep: in each of the four tab screens, no useEffect
 * callback may call the screen's loader, and a useFocusEffect must. Babel
 * resolves the call inside nested arrows, which a line-based scan cannot: the
 * loader is reached through `useCallback(() => { ... load(); ... })` inside the
 * focus effect, and `/load()/` alone matches both the good and the bad form.
 *
 * ── THE PLANT THAT GOT THROUGH, AND WHAT WAS ADDED FOR IT ─────────────────
 * Four plants. Three were caught: the mount effect put back, the same reached
 * through a nested arrow, and a fetch in the render body. The fourth passed:
 *
 *     useFocusEffect(useCallback(() => {
 *       if (loadingRef.current) return; if (true) return;   <- still passed
 *
 * Because asking whether load() APPEARS under the focus effect cannot see a
 * branch turned off by a constant. CLAUDE.md names this as one of the two ways
 * a gate gets defeated without deleting anything, and it has recurred six
 * times in this repo. So the focus effect is also refused a condition made of
 * constants: `if (true)`, `if (1)`, `if (!0)`. A guard is checked by what it
 * compares.
 *
 * ── WHAT IT DELIBERATELY DOES NOT COVER ───────────────────────────────────
 * Whether the focus effect's own guards are right. `loadingRef` and the
 * unauthorized reload are the subject of check-refresh-single-flight and
 * check-session-recovery.
 *
 * How many requests a load makes once it starts, which is check-waterfalls.
 *
 * And it cannot see a fetch issued straight from the body of the component, or
 * from a module's top level, which would run at mount with no effect at all.
 * The four screens are checked for that too, below, because it is the shape a
 * refactor would reach for next.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { parse } from '@babel/parser';
import _traverse from '@babel/traverse';

const traverse = _traverse.default || _traverse;
const DIR = new URL('../attune-app/src/app/', import.meta.url).pathname;

/* The tabs, derived from the tab bar rather than typed out, so a fifth tab is
   covered the day it is added. */
const bar = readFileSync(new URL('../attune-app/src/components/app-tabs.tsx', import.meta.url).pathname, 'utf8');
const tabs = [...bar.matchAll(/NativeTabs\.Trigger\s+name="([^"]+)"/g)].map((m) => m[1]);

if (!tabs.length) {
  console.error('[check-tab-loads] found no tabs in app-tabs.tsx, so this checked nothing.'
    + ' A gate that has lost its subject must never report success.');
  process.exit(1);
}

const onDisk = readdirSync(DIR).filter((f) => f.endsWith('.tsx')).map((f) => f.replace(/\.tsx$/, ''));
const missing = tabs.filter((t) => !onDisk.includes(t));
if (missing.length) {
  console.error(`[check-tab-loads] the tab bar names ${missing.join(', ')} and there is no`
    + ' screen file by that name.');
  process.exit(1);
}

/** The name each screen gives the function that fetches its data. */
const LOADERS = ['load', 'reload', 'refresh'];

const problems = [];
let focusEffects = 0;

for (const tab of tabs) {
  const src = readFileSync(`${DIR}${tab}.tsx`, 'utf8');
  const ast = parse(src, {
    sourceType: 'module',
    plugins: ['typescript', 'jsx'],
    errorRecovery: true,
  });

  /** Does anything under this node call one of the loaders? */
  const callsLoader = (path) => {
    let found = null;
    path.traverse({
      CallExpression(p) {
        const c = p.node.callee;
        if (c.type === 'Identifier' && LOADERS.includes(c.name)) found = c.name;
      },
    });
    return found;
  };

  let sawFocus = false;
  traverse(ast, {
    CallExpression(path) {
      const callee = path.node.callee;
      if (callee.type !== 'Identifier') return;
      if (callee.name === 'useFocusEffect') {
        const via = callsLoader(path);
        if (via) { sawFocus = true; focusEffects += 1; }
        /* A constant condition here switches the whole load off and leaves
           every name in place, which is what the fourth plant did. */
        path.traverse({
          IfStatement(p) {
            const t = p.node.test;
            const literal = (n) => n && (n.type === 'BooleanLiteral' || n.type === 'NumericLiteral'
              || n.type === 'StringLiteral' || n.type === 'NullLiteral');
            const constant = literal(t)
              || (t.type === 'UnaryExpression' && literal(t.argument))
              || (t.type === 'BinaryExpression' && literal(t.left) && literal(t.right));
            if (constant) {
              problems.push(`${tab}.tsx line ${p.node.loc?.start.line}: the focus effect has`
                + ' a branch on a constant. That switches the load off while leaving every'
                + ' name where it was, which is the one plant this gate did not catch'
                + ' until it was taught to look at what a guard compares.');
            }
          },
        });
        return;
      }
      if (callee.name !== 'useEffect') return;
      const via = callsLoader(path);
      if (via) {
        problems.push(`${tab}.tsx line ${path.node.loc?.start.line}: a mount effect calls`
          + ` ${via}(). All four tabs mount when the app starts, so this one fetches on`
          + ' launch whether or not anybody opened it. The focus effect already loads it.');
      }
    },
  });

  if (!sawFocus) {
    problems.push(`${tab}.tsx has no useFocusEffect that calls its loader, so opening the`
      + ' tab would show whatever it had when the app started.');
  }

  /* A fetch straight from the component body, which needs no effect to run. */
  traverse(ast, {
    CallExpression(path) {
      const c = path.node.callee;
      const name = c.type === 'Identifier' ? c.name : '';
      if (!/^fetch[A-Z]/.test(name)) return;
      /* Inside any function is fine: a handler, an effect, the loader itself.
         What is not fine is being evaluated while the component renders. */
      const fn = path.getFunctionParent();
      const isRender = fn && fn.node.id && /^[A-Z]/.test(fn.node.id.name || '');
      if (!fn || isRender) {
        problems.push(`${tab}.tsx line ${path.node.loc?.start.line}: ${name}() is called`
          + ' while the component renders, so it runs at mount with no effect to gate it.');
      }
    },
  });
}

if (problems.length) {
  console.error('[check-tab-loads] a tab fetches before anybody opens it:');
  for (const p of problems) console.error(`  ✗ ${p}`);
  console.error('');
  console.error('  The tab bar is the UIKit one, so every screen mounts at launch. Load from');
  console.error('  useFocusEffect, which fires on mount for the focused tab and on first open');
  console.error('  for the rest.');
  process.exit(1);
}

console.log(`[check-tab-loads] ${tabs.length} tabs (${tabs.join(', ')}): none loads from a`
  + ` mount effect, ${focusEffects} load when they are opened, and no screen fetches while`
  + ' it renders.');
