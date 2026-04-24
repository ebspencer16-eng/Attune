/**
 * Lightweight Sentry reporter for Vercel edge API routes.
 *
 * @sentry/node can't run in edge runtime. Rather than pulling in the full
 * SDK, this file posts directly to Sentry's Envelope API. Covers the 90%
 * case: caught exceptions on API routes that we want to surface without
 * breaking the response flow.
 *
 * Usage in an API route:
 *   import { reportToSentry } from '../lib/sentry-edge.js';
 *   try { ... } catch (e) {
 *     reportToSentry(e, { route: '/api/foo', request: req }).catch(() => {});
 *     return new Response('error', { status: 500 });
 *   }
 *
 * The .catch(()=>{}) ensures Sentry reporting never breaks the response
 * path — if Sentry is down, the user still gets a response.
 */

// Sentry DSN is split into project + key + ingest host.
// Example DSN: https://KEY@PROJECT.ingest.us.sentry.io/PROJECT_ID
function parseDsn(dsn) {
  try {
    const url = new URL(dsn);
    const publicKey = url.username;
    const projectId = url.pathname.slice(1);
    const host = url.host;
    return { publicKey, projectId, host };
  } catch {
    return null;
  }
}

export async function reportToSentry(error, context = {}) {
  const dsn = process.env.SENTRY_DSN || process.env.VITE_SENTRY_DSN;
  if (!dsn) return; // No-op when unconfigured

  const parsed = parseDsn(dsn);
  if (!parsed) return;
  const { publicKey, projectId, host } = parsed;

  // Build a minimal Sentry event envelope
  const eventId = crypto.randomUUID().replace(/-/g, '');
  const timestamp = Date.now() / 1000;

  // Normalize error → Sentry exception value
  const err = error instanceof Error ? error : new Error(String(error));
  const stackLines = (err.stack || '').split('\n').slice(1).map(line => {
    const match = line.match(/at\s+(.+?)\s+\((.+?):(\d+):(\d+)\)/) || line.match(/at\s+(.+?):(\d+):(\d+)/);
    if (!match) return null;
    if (match.length === 5) {
      return { function: match[1], filename: match[2], lineno: parseInt(match[3], 10), colno: parseInt(match[4], 10), in_app: true };
    }
    return { filename: match[1], lineno: parseInt(match[2], 10), colno: parseInt(match[3], 10), in_app: true };
  }).filter(Boolean).reverse();

  const event = {
    event_id: eventId,
    timestamp,
    platform: 'javascript',
    level: 'error',
    logger: 'edge-api',
    environment: process.env.VERCEL_ENV === 'production' ? 'production' : 'preview',
    release: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'unknown',
    server_name: 'vercel-edge',
    tags: {
      route: context.route || 'unknown',
      runtime: 'edge',
    },
    extra: context.extra || {},
    exception: {
      values: [{
        type: err.name || 'Error',
        value: err.message || String(err),
        stacktrace: stackLines.length > 0 ? { frames: stackLines } : undefined,
      }],
    },
    request: context.request ? (() => {
      try {
        const url = new URL(context.request.url);
        return {
          url: `${url.origin}${url.pathname}`, // strip query (may contain invite codes)
          method: context.request.method,
        };
      } catch { return undefined; }
    })() : undefined,
  };

  // Sentry Envelope format: three JSON lines separated by newlines.
  //   line 1: envelope header
  //   line 2: item header
  //   line 3: item payload
  const envelope = [
    JSON.stringify({ event_id: eventId, sent_at: new Date().toISOString(), dsn }),
    JSON.stringify({ type: 'event' }),
    JSON.stringify(event),
  ].join('\n');

  const endpoint = `https://${host}/api/${projectId}/envelope/?sentry_key=${publicKey}&sentry_version=7`;

  try {
    await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-sentry-envelope' },
      body: envelope,
    });
  } catch {
    // Silently swallow — never let Sentry reporting break the API response
  }
}
