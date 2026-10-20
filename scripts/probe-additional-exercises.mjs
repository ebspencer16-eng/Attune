/* READ ONLY probe: a picture of the Additional exercises section.
   Ellie owns every exercise, so it does not draw on her account. The section
   lives inside the signed-in dashboard, which no demo URL reaches, so it is
   mounted on its own the way check-learn-peek mounts the In Practice sheet. */
import { createServer } from 'node:http';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from 'esbuild';
import { launch } from './_lib/browser.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const dir = mkdtempSync(join(tmpdir(), 'attune-extras-'));
const OUT = process.env.SHOT_DIR || '.';

/* Three ownership shapes, which is the whole of what she asked to see:
   owning none of the three, owning one, and owning two. */
const CASES = [
  ['owns-none', {}],
  ['owns-one', { hasConflict: true }],
  ['owns-two', { hasConflict: true, hasIntimacy: true }],
];

const harness = `
import { createRoot } from 'react-dom/client';
import { AdditionalExercises } from ${JSON.stringify(`${ROOT}src/App.jsx`)};
const CASES = ${JSON.stringify(CASES)};
function Harness() {
  return (
    <div style={{ width: 760, margin: '0 auto', padding: '1.5rem 2rem', fontFamily: 'DM Sans, system-ui, sans-serif' }}>
      {CASES.map(([name, pkg]) => (
        <div key={name} data-case={name} style={{ marginBottom: '2.5rem' }}>
          <div style={{ fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#A8997F', marginBottom: '0.4rem' }}>
            {name.replace(/-/g, ' ')}
          </div>
          <AdditionalExercises pkg={pkg} />
        </div>
      ))}
    </div>
  );
}
createRoot(document.getElementById('root')).render(<Harness />);
`;

try {
  await build({
    stdin: { contents: harness, resolveDir: ROOT, loader: 'jsx', sourcefile: 'extras.jsx' },
    bundle: true, format: 'iife', jsx: 'automatic',
    outfile: join(dir, 'extras.js'),
    define: { 'process.env.NODE_ENV': '"production"', 'process.env': '{}' },
    plugins: [{
      name: 'stub-env',
      setup(b) {
        b.onResolve({ filter: /(^|\/)supabase\.js$/ }, () => ({ path: 'sb', namespace: 'stub' }));
        b.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({
          contents: 'export const hasSupabase = false;'
            + ' export const supabase = { auth: { getSession: async () => ({ data: { session: null } }),'
            + ' onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) } };',
          loader: 'js',
        }));
      },
    }],
    logLevel: 'silent',
  });
} catch (e) {
  console.error('could not bundle the section:', String(e.message || e).split('\n').slice(0, 4).join('\n'));
  rmSync(dir, { recursive: true, force: true });
  process.exit(1);
}

writeFileSync(join(dir, 'extras.html'), `<!doctype html><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<body style="margin:0;background:#FBF8F3"><div id="root"></div>
<script>window.onerror = (m) => { window.__err = String(m); };</script>
<script src="./extras.js"></script>
`);

const server = createServer((req, res) => {
  const name = (req.url || '/').split('?')[0];
  try {
    const body = readFileSync(join(dir, name === '/' ? 'extras.html' : name.replace(/^\//, '')));
    res.writeHead(200, { 'Content-Type': name.endsWith('.js') ? 'text/javascript' : 'text/html' });
    res.end(body);
  } catch { res.writeHead(404); res.end('no'); }
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const PORT = server.address().port;

const page = await launch({ width: 860, height: 1200 });
await page.goto(`http://127.0.0.1:${PORT}/`);
await new Promise((r) => setTimeout(r, 2500));
const seen = await page.evaluate(() => {
  if (window.__err) return { err: window.__err };
  return [...document.querySelectorAll('[data-case]')].map((d) => ({
    cse: d.dataset.case,
    tiles: [...d.querySelectorAll('a[href="/offerings#add-ons"]')].map((a) => (a.textContent || '').replace('+', '').trim()),
  }));
});
console.log(JSON.stringify(seen, null, 1));
const shot = await page.screenshot({ fullPage: true });
writeFileSync(join(OUT, 'additional-exercises.png'), Buffer.from(shot, 'base64'));
console.log('picture:', join(OUT, 'additional-exercises.png'));
await page.close(); server.close(); rmSync(dir, { recursive: true, force: true });
