// Fails the build when results copy is resolved without a version.
//
// A couple's results row stamps the CONTENT_VERSION they were computed under,
// and they must keep reading that version. Revising a sentence today must not
// move the sentence a highlight was written against yesterday. That is the
// entire reason api/_content/ is versioned at all.
//
// The website honours it: results render inside a ContentContext carrying the
// stamped version, and useContent() resolves against it. The server passed
// null, which contentFor reads as "newest". With only v1 published the two
// agreed by accident. The day v2 ships they would have disagreed, silently,
// with the website right and the app wrong.
//
// So: contentFor must never be called with a hardcoded null or with nothing.

import { readFileSync, readdirSync, statSync } from 'fs';

const problems = [];

function scan(dir, prefix = '') {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) { scan(new URL(`${entry.name}/`, dir), `${prefix}${entry.name}/`); continue; }
    if (!/\.(js|jsx)$/.test(entry.name)) continue;
    const rel = `${prefix}${entry.name}`;
    // The resolver itself, and the fallback inside the shared copy helpers,
    // which is only reached when a caller passes no snapshot at all.
    if (rel === '_content/index.js') continue;

    const text = readFileSync(new URL(entry.name, dir), 'utf8');
    text.split('\n').forEach((line, i) => {
      if (/^\s*(\/\/|\*)/.test(line)) return;
      // A line marked as having no couple context is exempt: the workbook and
      // the share cards render for nobody in particular, so there is no stamp
      // to honour. Marked rather than guessed, so the exemption is visible.
      if (/content-version: no couple context/.test(text.split('\n')[i - 1] || '')) return;
      if (/contentFor\(\s*null\s*\)/.test(line)) {
        problems.push({ file: rel, line: i + 1, text: line.trim().slice(0, 90) });
      }
    });
  }
}

scan(new URL('../api/', import.meta.url), 'api:');
scan(new URL('../src/', import.meta.url), 'src:');

if (problems.length) {
  console.error('[check-content-version] copy resolved without the version it was stamped with:');
  for (const p of problems) console.error(`  ${p.file}:${p.line}  ${p.text}`);
  console.error('');
  console.error("Pass the couple's contentVersion. /api/results has it from the results");
  console.error('store; the website has it from ContentContext via useContent().');
  process.exit(1);
}

console.log('[check-content-version] results copy always resolves against a stamped version.');
