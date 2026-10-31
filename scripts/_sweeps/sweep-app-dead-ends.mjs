#!/usr/bin/env node
/**
 * sweep-app-dead-ends: a card or alert link that the app routes to its home
 * screen when it means somewhere else.
 *
 * The A245 shape: "Read something from In Practice" linked /practice, which
 * carries no ?view=, so appTargetFor read it as home and the tap did nothing.
 *
 * Method: every `deepLink: '...'` and `deep_link` literal under api/, plus the
 * link each IDLE prompt and alert kind carries, run through the real
 * appTargetFor and webTargetFor. Reported: an app target of the home tab for a
 * link that is not home, and a web target that is unknown.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';

const ROOT = new URL('../..', import.meta.url).pathname;
const { appTargetFor, webTargetFor } = await import(`${ROOT}api/_lib/next-action.js`);
const files = [];
const walk = (d) => { for (const f of readdirSync(`${ROOT}${d}`)) { const p = `${d}/${f}`; if (statSync(`${ROOT}${p}`).isDirectory()) walk(p); else if (f.endsWith('.js')) files.push(p); } };
walk('api');
const RENDER = new Set(['account', 'budget', 'checklist', 'conflict', 'exercise1', 'exercise2', 'exercise3', 'exercises', 'home', 'intimacy', 'notes', 'resources', 'results', 'workbook']);
const links = new Map();
for (const f of files) {
  const code = readFileSync(`${ROOT}${f}`, 'utf8');
  for (const m of code.matchAll(/(?:deepLink|deep_link|link)\s*:\s*['"`]([^'"`$]+)(\$\{[^}]*\}[^'"`]*)?['"`]/g)) {
    const l = m[1] + (m[2] ? 'x' : '');
    if (!l.startsWith('/')) continue;
    if (!links.has(l)) links.set(l, `${f}:${code.slice(0, m.index).split('\n').length}`);
  }
}
const out = [];
for (const [l, where] of links) {
  const app = appTargetFor(l), web = webTargetFor(l, RENDER);
  const isHome = l === '/' || /[?&]view=home\b/.test(l);
  if (!isHome && app?.route === '/' && !app.settings && !app.feedback) out.push(`${where}  ${l}  -> app: home tab`);
  if (web?.unknown || (!web?.href && !web?.view)) out.push(`${where}  ${l}  -> web: ${JSON.stringify(web)}`);
}
console.log(out.join('\n'));
console.log(`\n${links.size} distinct links; ${out.length} leads.`);
