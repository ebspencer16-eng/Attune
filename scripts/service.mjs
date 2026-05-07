/**
 * Attune Workbook PDF Service — HTTP wrapper
 * ==========================================
 *
 * Single endpoint: POST /render
 *   Header: X-Service-Secret: <shared secret matching env WORKBOOK_SERVICE_SECRET>
 *   Body:   COUPLE-shaped JSON (see scripts/SERVICE_INTEGRATION.md)
 *   Returns: application/pdf bytes
 *
 * Pipes the JSON through:
 *   python3 build_workbook.py --from-stdin   (JSON → HTML on stdout)
 *   node    render_workbook.mjs --from-stdin (HTML → PDF on stdout)
 *
 * Healthcheck: GET /health → 200 "ok"
 *
 * Designed to run in a single Docker container with both Python 3 and
 * Node + Playwright installed. See ../Dockerfile in this repo.
 */

import http from 'node:http';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const PORT = parseInt(process.env.PORT || '8080', 10);
const SHARED_SECRET = process.env.WORKBOOK_SERVICE_SECRET || '';
const BUILD_PY = path.join(ROOT, 'scripts', 'build_workbook.py');
const RENDER_MJS = path.join(ROOT, 'scripts', 'render_workbook.mjs');
// Generous limit — the Python+Node round trip plus Playwright startup
// can take 20–30s on a cold container. Render's Starter tier sleeps
// after 15min idle; first request after sleep is slowest.
const RENDER_TIMEOUT_MS = 60_000;
// Reject obviously-too-large payloads up front (limit is conservative;
// real payloads are well under 100KB).
const MAX_BODY_BYTES = 1_000_000;

function badRequest(res, status, msg) {
  res.writeHead(status, { 'Content-Type': 'text/plain' });
  res.end(msg);
}

async function readBody(req) {
  const chunks = [];
  let total = 0;
  for await (const chunk of req) {
    total += chunk.length;
    if (total > MAX_BODY_BYTES) throw new Error('payload too large');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

function renderPdf(jsonBuffer) {
  return new Promise((resolve, reject) => {
    const py = spawn('python3', [BUILD_PY, '--from-stdin'], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    const node = spawn('node', [RENDER_MJS, '--from-stdin'], {
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Wire pipes: jsonBuffer → py.stdin; py.stdout → node.stdin; node.stdout → buffer
    const out = [];
    const errs = [];
    py.stderr.on('data', d => errs.push(`[py] ${d}`));
    node.stderr.on('data', d => errs.push(`[node] ${d}`));
    py.stdout.on('error', () => {});
    node.stdin.on('error', () => {});
    py.stdout.pipe(node.stdin);
    node.stdout.on('data', d => out.push(d));

    let done = false;
    const finish = (err, buf) => {
      if (done) return;
      done = true;
      try { py.kill('SIGTERM'); } catch {}
      try { node.kill('SIGTERM'); } catch {}
      if (err) reject(err); else resolve(buf);
    };

    py.on('error', e => finish(new Error('py spawn failed: ' + e.message)));
    node.on('error', e => finish(new Error('node spawn failed: ' + e.message)));

    py.on('close', code => {
      if (code !== 0) finish(new Error(`build_workbook exited ${code}: ${Buffer.concat(errs).toString().slice(0, 500)}`));
    });
    node.on('close', code => {
      if (code !== 0) finish(new Error(`render_workbook exited ${code}: ${Buffer.concat(errs).toString().slice(0, 500)}`));
      else finish(null, Buffer.concat(out));
    });

    // Timeout
    const t = setTimeout(() => finish(new Error('render timed out')), RENDER_TIMEOUT_MS);
    py.on('close', () => clearTimeout(t));
    node.on('close', () => clearTimeout(t));

    // Feed the JSON in
    py.stdin.end(jsonBuffer);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    return res.end('ok');
  }
  if (req.method !== 'POST' || req.url !== '/render') {
    return badRequest(res, 404, 'not found');
  }
  if (!SHARED_SECRET) {
    return badRequest(res, 500, 'service misconfigured: WORKBOOK_SERVICE_SECRET unset');
  }
  if (req.headers['x-service-secret'] !== SHARED_SECRET) {
    return badRequest(res, 401, 'unauthorized');
  }

  let buf;
  try {
    buf = await readBody(req);
  } catch (e) {
    return badRequest(res, 413, 'payload too large');
  }
  if (!buf || buf.length === 0) return badRequest(res, 400, 'empty body');

  // Validate it parses as JSON before forking child processes.
  try { JSON.parse(buf.toString('utf-8')); }
  catch { return badRequest(res, 400, 'body must be valid JSON'); }

  try {
    const pdf = await renderPdf(buf);
    if (!pdf || pdf.length < 1000) {
      return badRequest(res, 502, 'render produced empty/short PDF');
    }
    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Length': pdf.length,
      'Cache-Control': 'no-store',
    });
    res.end(pdf);
  } catch (e) {
    console.error('[render]', e.message);
    badRequest(res, 502, 'render failed: ' + (e.message || 'unknown'));
  }
});

server.listen(PORT, () => {
  console.log(`workbook-pdf service listening on :${PORT}`);
  if (!SHARED_SECRET) console.warn('WARNING: WORKBOOK_SERVICE_SECRET is unset — the /render endpoint will reject all requests.');
});
