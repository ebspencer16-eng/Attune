// Build guard: parse every inline <script> in public/admin.html and fail the
// build if any has a syntax error. The admin dashboard is a single large inline
// script; one stray brace makes EVERY function undefined and silently bricks the
// whole dashboard in the browser. This caught two such bugs (a missing brace on
// loadRealFunnel and an undefined `addon`) that had shipped unnoticed. Runs
// before vite build. Zero dependencies — uses Function() to parse without
// executing.
import { readFileSync } from 'fs';

const files = ['public/admin.html'];
let failed = false;

for (const file of files) {
  let html;
  try { html = readFileSync(file, 'utf-8'); }
  catch { console.error(`[check-admin-html] cannot read ${file}`); process.exit(1); }

  // Inline scripts only (skip <script src=...>).
  const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
  let m, i = 0;
  while ((m = re.exec(html))) {
    i++;
    const code = m[1];
    if (!code.trim()) continue;
    try {
      // Parses (compiles) without running. Throws SyntaxError on imbalance.
      // eslint-disable-next-line no-new-func
      new Function(code);
    } catch (e) {
      failed = true;
      const upto = html.slice(0, m.index).split('\n').length;
      console.error(`[check-admin-html] SYNTAX ERROR in ${file} inline script #${i} (starts ~line ${upto}): ${e.message}`);
    }
  }
}

if (failed) {
  console.error('[check-admin-html] FAILED — fix the syntax error above before building.');
  process.exit(1);
}
console.log('[check-admin-html] admin.html inline scripts parse OK');
