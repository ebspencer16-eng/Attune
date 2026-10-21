/**
 * SWEEP: a default that stands in for a FAILED read and looks like data.
 *
 * CLAUDE.md, on both admin CSV exports reporting N for every couple since the
 * day they shipped: "`const { data: rows = [] } = await ...` cannot tell an
 * empty table from a failed query, because a PostgREST error puts its message
 * in a field nobody reads and leaves `data` null, so the default fires either
 * way. If it matters which, read the error."
 *
 * The property measured: for every database read, is `error` looked at before
 * the rows are used?
 *
 * Three answers, counted separately, because only the third is a fault:
 *   READS ERROR    - the error is named in the destructure or the lines after
 *   NO DEFAULT     - data is used as-is, so a failure is a null and will throw
 *                    or render as absent, which is at least honest
 *   MASQUERADES    - a default supplies an empty list or object AND the error
 *                    is never named, so a broken query is indistinguishable
 *                    from a true empty answer
 *
 * The window after a read is bounded by the next `await` or the end of the
 * enclosing block, not by a line count: a fixed window reaches into the next
 * query's handling, which is the swallowing failure this repo keeps hitting.
 */
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const files = execSync("git ls-files 'api/*.js' 'api/**/*.js'", { encoding: 'utf8' })
  .trim().split('\n').filter(Boolean);

/** A read: a PostgREST builder, a fetch of the REST endpoint, or the one
 *  GATEWAY every profile read goes through.
 *
 *  The first version matched `.from(` and `/rest/v1/` only, and was therefore
 *  blind to three reads in the very file this sweep's lesson came from:
 *  `selectProfiles(admin, (q) => q.select(...))` names no table, because
 *  excluding the demo accounts moved the table name inside one module. That is
 *  CLAUDE.md's own rule about a scanner and the indirection for the thing it
 *  looks for, and it cost this sweep an undercount of three. */
const READ = /\.(from|rpc)\s*\(|\/rest\/v1\/|\bselectProfiles\s*\(/;
/** A default standing in for the answer. */
const DEFAULT = /(data\s*:\s*[\w$]+\s*=\s*(\[\]|\{\})|\}\s*=\s*[^;]*\|\|\s*\{\}|\|\|\s*\[\]|\?\?\s*\[\]|\|\|\s*\{\})/;

let reads = 0, readsError = 0, noDefault = 0;
const masquerade = [];

for (const file of files) {
  const lines = readFileSync(file, 'utf8').split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (/^\s*(\/\/|\*|\/\*)/.test(lines[i])) continue;
    if (!READ.test(lines[i])) continue;
    reads++;

    /* The statement: forward to the first `;` at paren depth zero. */
    let stmt = '', depth = 0, end = i;
    outer: for (let j = i; j < Math.min(i + 14, lines.length); j++) {
      for (const ch of lines[j]) {
        stmt += ch;
        if ('([{'.includes(ch)) depth++;
        else if (')]}'.includes(ch)) depth--;
        else if (ch === ';' && depth <= 0) { end = j; break outer; }
      }
      stmt += '\n'; end = j;
    }
    /* The statement plus everything up to the next await or the block's end,
       which is where this codebase handles a read's error. */
    let after = '';
    for (let j = end + 1; j < Math.min(end + 9, lines.length); j++) {
      if (/\bawait\b/.test(lines[j])) break;
      if (/^\s*\}\s*$/.test(lines[j])) { after += lines[j] + '\n'; break; }
      after += lines[j] + '\n';
    }

    const scope = stmt + '\n' + after;
    /* The statement may start above the matched line, so look back one for
       the destructure that opens it. */
    const back = i > 0 ? lines[i - 1] : '';
    const whole = back + '\n' + scope;

    if (/\berror\b/.test(whole)) { readsError++; continue; }
    if (!DEFAULT.test(whole)) { noDefault++; continue; }
    masquerade.push({
      file, line: i + 1,
      text: (back.trim() + ' ' + lines[i].trim()).replace(/\s+/g, ' ').slice(-100),
    });
  }
}

console.log(`[sweep-masquerading-defaults] ${files.length} server files, ${reads} database reads.`);
console.log(`  ${readsError} name the error. ${noDefault} supply no default, so a failure is visibly absent.`);
console.log(`  ${masquerade.length} supply an empty default AND never name the error.`);
console.log('');
if (!masquerade.length) {
  console.log('  nothing: no read turns a broken query into an empty answer.');
} else {
  for (const m of masquerade) console.log(`  ${m.file}:${m.line}  ${m.text}`);
  console.log(`\n  ${masquerade.length} to read.`);
}
