import { createServer } from 'node:http';
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from 'esbuild';
import { launch } from '/Users/Ellie/Projects/unison/scripts/_lib/browser.mjs';
const ROOT = '/Users/Ellie/Projects/unison/';
const { resultsNav, EXERCISE_RESULTS_EYEBROW } = await import(ROOT + 'api/_lib/results-sections.js');
const groups = resultsNav({ hasReflection: true, intimacyReady: true, conflictListed: true });
const dir = mkdtempSync(join(tmpdir(), 'attune-menu-'));
const harness = `
import { createRoot } from 'react-dom/client';
import { AppInsightsMenu } from ${JSON.stringify(ROOT + 'src/App.jsx')};
createRoot(document.getElementById('root')).render(
  <div style={{ width: 420, margin: '0 auto', padding: 20, height: 900, display: 'flex', flexDirection: 'column' }}>
    <AppInsightsMenu groups={${JSON.stringify(groups)}} isMobile={false}
      eyebrow={${JSON.stringify(EXERCISE_RESULTS_EYEBROW)}} onOpen={() => {}} />
  </div>);
`;
await build({
  stdin: { contents: harness, resolveDir: ROOT, loader: 'jsx', sourcefile: 'menu.jsx' },
  bundle: true, format: 'iife', jsx: 'automatic', outfile: join(dir, 'menu.js'),
  define: { 'process.env.NODE_ENV': '"production"', 'process.env': '{}' },
  plugins: [{ name: 'stub', setup(b) {
    b.onResolve({ filter: /(^|\/)supabase\.js$/ }, () => ({ path: 'sb', namespace: 'stub' }));
    b.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({ contents: 'export const hasSupabase=false; export const supabase={auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}};', loader: 'js' }));
  } }],
  logLevel: 'silent',
});
writeFileSync(join(dir, 'menu.html'), `<!doctype html><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700&family=Playfair+Display:wght@500;700&display=swap" rel="stylesheet">
<body style="margin:0;background:#FBF8F3"><div id="root"></div><script>window.onerror=m=>{window.__err=String(m)}</script><script src="./menu.js"></script>`);
const server = createServer((req, res) => {
  const n = (req.url || '/').split('?')[0];
  let body;
  try { body = readFileSync(join(dir, n === '/' ? 'menu.html' : n.replace(/^\//, ''))); }
  catch { res.writeHead(404); res.end('no'); return; }
  res.writeHead(200, { 'Content-Type': n.endsWith('.js') ? 'text/javascript' : 'text/html' });
  res.end(body);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const page = await launch({ width: 520, height: 980 });
await page.goto(`http://127.0.0.1:${server.address().port}/`);
await new Promise(r => setTimeout(r, 2200));
const err = await page.evaluate(() => window.__err || null);
if (err) console.log('ERROR:', err);
const shot = await page.screenshot({ fullPage: true });
writeFileSync(process.env.OUT || 'menu.png', Buffer.from(shot, 'base64'));
console.log('rendered');
await page.close(); server.close(); rmSync(dir, { recursive: true, force: true });
