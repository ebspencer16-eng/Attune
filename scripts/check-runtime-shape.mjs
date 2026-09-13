// Fails the build when a handler's runtime does not match the way it answers.
//
// ── WHAT HAPPENED ──────────────────────────────────────────────────────────
// Vercel's two runtimes take different handlers. Edge functions receive (req)
// and return a Response. Node functions receive (req, res) and write to res.
// Mix them and the function does not fail politely: it answers
// FUNCTION_INVOCATION_FAILED, a 500 with no message, before any code in the
// file runs.
//
// Two endpoints were shipped that way and neither has ever worked:
//
//   api/admin-posts.js    declared runtime 'nodejs', returns a Response.
//                         Writing, scheduling and publishing In Practice posts
//                         has 500'd since the commit that created it, so the
//                         admin has never been able to publish a post.
//   api/admin-presets.js  declared no runtime at all, which means Node, and
//                         returns a Response. Its commit message says it would
//                         "degrade gracefully" until its migration was run. It
//                         degraded to a 500.
//
// Found by asking the network rather than reading the code: probing every
// admin endpoint unauthenticated, expecting 401s, and getting two 500s.
// CLAUDE.md already says to reach for curl before theorising.
//
// ── WHAT THIS CHECKS ───────────────────────────────────────────────────────
// Every handler under api/ that constructs a Response declares runtime 'edge'.
// A file that writes to `res` instead is a Node handler and is left alone.
//
// ── WHAT IT DOES NOT COVER ─────────────────────────────────────────────────
// Whether an edge handler only uses APIs the edge runtime has. That failure
// looks different, it is loud at deploy, and no scan of imports would settle
// it anyway.

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const ROOT = new URL('..', import.meta.url).pathname;

const handlers = readdirSync(join(ROOT, 'api'))
  .filter((f) => f.endsWith('.js'))
  .filter((f) => {
    const s = readFileSync(join(ROOT, 'api', f), 'utf8');
    return /export default (async )?function/.test(s);
  });

if (handlers.length < 20) {
  console.error(`[check-runtime-shape] only found ${handlers.length} handlers; refusing to pass.`);
  process.exit(1);
}

const problems = [];
let edge = 0;
let node = 0;

for (const f of handlers) {
  const src = readFileSync(join(ROOT, 'api', f), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/(^|\s)\/\/[^\n]*/g, (m) => m.replace(/[^\n]/g, ' '));

  const answersWithResponse = /new Response\s*\(/.test(src);
  const answersWithRes = /\bres\.(status|json|end|send|setHeader)\s*\(/.test(src);
  const declared = (src.match(/runtime:\s*'(\w+)'/) || [])[1] || null;

  if (!answersWithResponse) { if (answersWithRes) node += 1; continue; }
  edge += 1;

  if (declared === 'edge') continue;

  problems.push(
    `api/${f} returns a Response and declares runtime ${declared ? `'${declared}'` : 'nothing, which means nodejs'}.\n`
    + '      Vercel answers FUNCTION_INVOCATION_FAILED to every request, a 500\n'
    + '      with no message, before any code in the file runs.');
}

if (problems.length) {
  console.error('[check-runtime-shape] a handler cannot answer at all:');
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

console.log(
  `[check-runtime-shape] ${handlers.length} handlers; ${edge} return a Response and all declare edge`
  + `${node ? `, ${node} write to res` : ''}.`);
