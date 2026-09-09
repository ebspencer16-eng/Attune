// `npm run smoke`: build, serve, render every results section, stop.
//
// It used to be `node scripts/check-render.mjs` and assumed someone had
// already run a preview server on port 4173. If they had not, the run failed
// in a way that looked like a broken test rather than a missing server, which
// is part of why it stopped being run at all.

import { spawn } from 'child_process';
import { once } from 'events';

const PORT = process.env.PORT || '4173';

// localhost, not 127.0.0.1. `vite preview` binds to whatever localhost
// resolves to, which on macOS is the IPv6 loopback, so a hardcoded IPv4
// address gets connection refused while the server is running perfectly.
// Hardcoded hosts are the same mistake as the hardcoded browser paths this
// script was rescued from.
const BASE = process.env.BASE || `http://localhost:${PORT}`;

const run = (cmd, args, opts = {}) => new Promise((resolve, reject) => {
  const p = spawn(cmd, args, { stdio: 'inherit', shell: false, ...opts });
  p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))));
});

console.log('[smoke] building');
await run('npx', ['vite', 'build', '--logLevel', 'error']);

console.log(`[smoke] serving on ${BASE}`);
const preview = spawn('npx', ['vite', 'preview', '--port', PORT, '--strictPort'], {
  stdio: ['ignore', 'pipe', 'pipe'],
});

const stop = () => { try { preview.kill('SIGTERM'); } catch { /* already gone */ } };
process.on('exit', stop);
process.on('SIGINT', () => { stop(); process.exit(130); });

// Wait for it to answer rather than sleeping a fixed amount.
const deadline = Date.now() + 30000;
for (;;) {
  try {
    const r = await fetch(BASE + '/', { method: 'HEAD' });
    if (r.ok || r.status === 404) break;
  } catch { /* not up yet */ }
  if (Date.now() > deadline) { stop(); throw new Error('preview server did not start within 30s'); }
  await new Promise((r) => setTimeout(r, 250));
}

let code = 0;
try {
  await run(process.execPath, ['scripts/check-render.mjs'], { env: { ...process.env, BASE } });
} catch {
  code = 1;
}
stop();
// Give the child a moment to die before the process exits.
await Promise.race([once(preview, 'exit'), new Promise((r) => setTimeout(r, 2000))]);
process.exit(code);
