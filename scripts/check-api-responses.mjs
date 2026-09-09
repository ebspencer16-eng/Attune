// Fails the build on wildcard CORS, or on a raw exception message returned to
// a caller, anywhere under api/.
//
// Both had spread quietly. Six endpoints answered
// `Access-Control-Allow-Origin: *`, and around thirty places returned the
// exception or the PostgREST error straight to the client. Those strings name
// tables, columns and constraints, and on a constraint violation can quote
// back the value that collided, which may be another person's data.
//
// The fix is in api/_lib/http.js: corsHeaders() adds an origin header only for
// an origin we own, and safeError() logs the detail server-side and returns a
// sentence that gives nothing away.
//
// Neither of these is the kind of mistake that shows up in testing. A wildcard
// CORS header works perfectly, and so does a leaked error message.

import { readFileSync, readdirSync } from 'fs';

const apiDir = new URL('../api/', import.meta.url);
const problems = [];

// The helper itself defines and documents both patterns.
const EXEMPT = new Set(['_lib/http.js']);

// Sending a failure to a log or to an internal email is not returning it to a
// caller. These are checked by hand rather than by pattern, because the
// difference is where the string goes, not how it is written.
const NOT_A_RESPONSE = [
  // Builds the Sentry event body.
  '_lib/sentry-edge.js',
  // Goes into the internal weekly digest email, escaped, not to a client.
  'cron-feedback-synthesis.js',
];

function scan(dir, prefix = '') {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) { scan(new URL(`${entry.name}/`, dir), `${prefix}${entry.name}/`); continue; }
    if (!entry.name.endsWith('.js')) continue;
    const rel = `${prefix}${entry.name}`;
    if (EXEMPT.has(rel)) continue;

    const text = readFileSync(new URL(entry.name, dir), 'utf8');
    text.split('\n').forEach((line, i) => {
      const at = `api/${rel}:${i + 1}`;
      if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;

      if (/['"]Access-Control-Allow-Origin['"]\s*:\s*['"]\*['"]/.test(line)) {
        problems.push({ at, why: 'wildcard CORS', line: line.trim().slice(0, 90) });
      }

      if (NOT_A_RESPONSE.some((f) => rel.endsWith(f))) return;

      // A message reaching a response body. Logging it is fine and common, so
      // a console call on the same line is not a finding.
      const returnsIt = /(?:JSON\.stringify|json\(|\.json\(|new Response\()/.test(line);
      // Any identifier's .message, not a list of the names that happened to
      // be in use when this was written. The first version named e, err, error
      // and firstErr.error, and missed findErr.message and callerErr.message
      // in partner-sync.js, which is the same failure this file exists to stop.
      const hasMessage = /[A-Za-z_$][A-Za-z0-9_$.]*\.message\b|String\(\s*e\s*(?:&&|\))/.test(line);
      if (returnsIt && hasMessage && !/console\.(error|warn|log)/.test(line) && !/safeError\(/.test(line)) {
        problems.push({ at, why: 'raw error message returned', line: line.trim().slice(0, 90) });
      }
    });
  }
}
scan(apiDir);

if (problems.length) {
  console.error('[check-api-responses] endpoints leaking to callers:');
  for (const p of problems) console.error(`  ${p.at}  ${p.why}\n    ${p.line}`);
  console.error('');
  console.error('Use corsHeaders(req) and safeError(where, e, message) from');
  console.error('api/_lib/http.js. safeError logs the real failure and returns a');
  console.error('sentence that names nothing from the database.');
  process.exit(1);
}

console.log('[check-api-responses] no wildcard CORS, no raw error messages returned.');
