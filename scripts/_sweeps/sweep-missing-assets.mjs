/* Sweep: every asset a surface references, and whether the file is there.
   A require() of a missing image fails the Metro build loudly; an <img src>
   or a url() that is wrong fails silently and leaves a hole on the page. */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';

const files = [];
function walk(d) {
  for (const e of readdirSync(d)) {
    const p = `${d}/${e}`;
    if (e === 'node_modules' || e.startsWith('.')) continue;
    if (statSync(p).isDirectory()) walk(p);
    else if (/\.(tsx?|jsx?|html|css)$/.test(p)) files.push(p);
  }
}
['attune-app/src', 'src', 'public'].forEach((d) => existsSync(d) && walk(d));

const PUBLIC = resolve('public');
const refs = [];
for (const f of files) {
  const src = readFileSync(f, 'utf8');
  for (const m of src.matchAll(/require\(['"]([^'"]+\.(?:png|jpg|jpeg|svg|webp|ttf|otf|woff2?))['"]\)/g)) {
    refs.push({ f, kind: 'require', spec: m[1], line: src.slice(0, m.index).split('\n').length });
  }
  for (const m of src.matchAll(/(?:src|href)=["'](\/[^"'>]+\.(?:png|jpg|jpeg|svg|webp|ico|woff2?))["']/g)) {
    refs.push({ f, kind: 'url', spec: m[1], line: src.slice(0, m.index).split('\n').length });
  }
  for (const m of src.matchAll(/url\((['"]?)(\/[^)'"]+\.(?:png|jpg|jpeg|svg|webp|woff2?))\1\)/g)) {
    refs.push({ f, kind: 'css', spec: m[2], line: src.slice(0, m.index).split('\n').length });
  }
}

const missing = [];
for (const r of refs) {
  /* `@/` is a tsconfig path alias, not a relative path. The first run of this
     sweep resolved it against the importing file's folder and reported all 17
     of its findings as missing, every one of them present. tsconfig maps
     `@/assets/*` to the project's own assets folder and `@/*` to src. */
  let target;
  if (r.kind !== 'require') target = join(PUBLIC, r.spec.replace(/^\//, '').split('?')[0]);
  else if (r.spec.startsWith('@/assets/')) target = resolve('attune-app', r.spec.slice(2));
  else if (r.spec.startsWith('@/')) target = resolve('attune-app/src', r.spec.slice(2));
  else target = resolve(dirname(r.f), r.spec);
  if (!existsSync(target)) missing.push(r);
}

console.log(`asset references found: ${refs.length}`);
console.log(`  require(): ${refs.filter((r) => r.kind === 'require').length}`);
console.log(`  src/href:  ${refs.filter((r) => r.kind === 'url').length}`);
console.log(`  css url(): ${refs.filter((r) => r.kind === 'css').length}`);
console.log(missing.length ? `\nMISSING (${missing.length}):` : '\nnothing: every referenced asset is on disk.');
for (const m of missing) console.log(`  ${m.f}:${m.line}  ${m.spec}`);
