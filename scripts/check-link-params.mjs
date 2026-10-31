#!/usr/bin/env node
/**
 * check-link-params: every internal link's ?parameter and #anchor is read by
 * the page it opens.
 *
 * Runs scripts/_sweeps/sweep-dead-link-params.mjs, which was written for A222
 * and found three: the app's locked-tool sheet sent /offerings?add=<key>,
 * nothing read `add`, and the reader landed at the top of the shop (A235); the
 * new-article card sent /practice?post=<id>, which opened the list and not
 * the article; and a deleted account landed on /home?deleted=1 with no word
 * that it had gone. One rule, so the gate runs the sweep rather than a copy
 * of it.
 *
 * Not covered: links built at run time from pieces the sweep cannot see,
 * and parameters read by a script the page loads from somewhere other than
 * public/.
 */
import { execFileSync } from 'node:child_process';

const ROOT = new URL('..', import.meta.url).pathname;
let out = '';
try {
  out = execFileSync('node', [`${ROOT}scripts/_sweeps/sweep-dead-link-params.mjs`], { encoding: 'utf8' });
} catch (e) {
  console.error('[check-link-params] the sweep did not run:', e.message);
  process.exit(1);
}
const m = /(\d+) internal links with a parameter or anchor; (\d+) name a page this could not find; (\d+) leads\./.exec(out);
if (!m) { console.error('[check-link-params] could not read the sweep\'s summary. Refusing to pass.\n' + out.slice(-500)); process.exit(1); }
const [, links, missing, leads] = m.map(Number);
const fails = [];
/* A walk that found nothing passes everything. 124 when written. */
if (links < 60) fails.push(`only ${links} internal links with a parameter or anchor were found; the walk has lost its files.`);
if (missing) fails.push(`${missing} link(s) name a page that does not exist.`);
if (leads) fails.push(`${leads} link(s) carry a parameter or anchor the page never reads:\n    ` + out.split('\n').filter((l) => l.includes(' -> ')).join('\n    '));
if (fails.length) { console.error('[check-link-params] FAILED:\n  ' + fails.join('\n  ')); process.exit(1); }
console.log(`[check-link-params] ${links} internal links with a parameter or anchor, each read by the page it opens.`);
