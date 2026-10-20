/**
 * Sweep: a catch that discards the error and says nothing.
 *
 * `catch {}` and `catch (e) {}` turn a failure into a value, which is how a
 * write to a column that does not exist reported success, and how a feedback
 * endpoint wrote to a host that no longer resolves for months.
 *
 * Most empty catches here are deliberate and correct: localStorage throws in a
 * private window, JSON.parse throws on a cached string, a measurement that
 * cannot be taken is not an error. Those are the ones with a comment saying
 * so. This separates the two and reports the silent ones.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';

const ROOT = new URL('../../', import.meta.url).pathname;
const TREES = ['api', 'src', 'attune-app/src'];

function walk(dir, out = []) {
  for (const n of readdirSync(`${ROOT}${dir}`)) {
    if (n === 'node_modules' || n.startsWith('.')) continue;
    const rel = `${dir}/${n}`;
    if (statSync(`${ROOT}${rel}`).isDirectory()) walk(rel, out);
    else if (/\.(js|jsx|ts|tsx)$/.test(n)) out.push(rel);
  }
  return out;
}

const silent = [];
const explained = [];
let total = 0;

/**
 * Which silent ones can actually hide a failure that matters.
 *
 * A catch round `localStorage` or `JSON.parse` turning into a fallback is
 * correct and there are over a hundred of them. The shape that has cost this
 * product is a catch round a DATABASE or NETWORK call that returns a
 * success-looking value: a write to a column that does not exist reported
 * success for months, and a feedback endpoint wrote to a host that no longer
 * resolves without anybody hearing about it.
 */
const risky = [];

for (const rel of TREES.flatMap((t) => walk(t))) {
  const src = readFileSync(ROOT + rel, 'utf8');
  const lines = src.split('\n');
  /* An empty catch, or one whose body only returns a fallback. */
  for (const m of src.matchAll(/catch\s*(?:\(([^)]*)\))?\s*\{([^{}]*)\}/g)) {
    total += 1;
    const body = (m[2] || '').trim();
    const line = src.slice(0, m.index).split('\n').length;
    /* Does it do anything with the failure: log it, report it, re-throw,
       or set an error state a screen can draw? */
    const handles = /console\.|throw|report|setError|captureException|logError|fails\.push|problems\.push/.test(body);
    if (handles) continue;
    /**
     * Is it explained? Inside the catch OR within three lines above it.
     *
     * The first version looked only above, and classified
     * `catch { // A keychain read can fail while the device is locked. }` as
     * silent. Most of the explanations in this codebase are written inside the
     * block, which is the natural place for them, so the sweep was calling the
     * documented ones undocumented.
     */
    const above = lines.slice(Math.max(0, line - 4), line).join('\n');
    const explainedHere = /\/\/|\/\*/.test(body) || /\/\/|\/\*|^\s*\*/m.test(above);
    const entry = { rel, line, body: body.replace(/\s+/g, ' ').slice(0, 60) };
    /* What was being attempted: the 400 characters before the catch. */
    const attempted = src.slice(Math.max(0, m.index - 400), m.index);
    const touchesTheWorld = /\bfetch\(|\.from\(|supabase|await\s+\w+\.(insert|update|upsert|delete|select)/.test(attempted);
    if (!explainedHere && touchesTheWorld) risky.push(entry);
    (explainedHere ? explained : silent).push(entry);
  }
}

console.log(`${total} catch blocks across api, the website and the app`);
console.log(`${explained.length} swallow the error with a comment above saying why`);
console.log(`${silent.length} swallow it with nothing said\n`);
console.log(`of the silent ones, ${risky.length} sit round a database or network call,`);
console.log('which is the shape that has actually cost this product something:\n');
for (const r of risky) console.log(`  ${r.rel}:${r.line}  catch { ${r.body} }`);
console.log('');

const byFile = {};
for (const s of silent) (byFile[s.rel] ||= []).push(s);
for (const [rel, list] of Object.entries(byFile).sort((a, b) => b[1].length - a[1].length)) {
  console.log(`  ${rel}  (${list.length})`);
  for (const s of list.slice(0, 4)) console.log(`      :${s.line}  catch { ${s.body} }`);
  if (list.length > 4) console.log(`      ... and ${list.length - 4} more`);
}
