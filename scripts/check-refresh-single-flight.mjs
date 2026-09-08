// The token refresh must be single-flight, and this checks the logic still is.
//
// Screens load several things at once. Notes asks for notes, tags and home
// together, so an expired access token comes back as three 401s at the same
// moment. Refreshing per-request means three refreshes with the same stored
// token, and Supabase rotates those: the first spends it, the rest arrive
// holding a token that no longer exists, fail, and report the person as signed
// out. The session refreshed successfully and they are bounced to sign-in
// anyway, which reads as an expiry that keeps happening for no reason.
//
// The logic below mirrors refreshOnce in attune-app/src/api/client.ts. It is
// duplicated rather than imported because that file is TypeScript inside a
// separate package with its own bundler; a copy checked on every build is worth
// more than no check at all. If it drifts, this stops describing the real
// behaviour, so change both together.

let refresh = null;
let refreshInFlight = null;
function refreshOnce() {
  if (!refresh) return Promise.resolve(false);
  if (!refreshInFlight) {
    refreshInFlight = refresh().finally(() => { refreshInFlight = null; });
  }
  return refreshInFlight;
}

let fails = 0;
const ok = (name, cond) => { console.log((cond ? '  ok    ' : '  FAIL  ') + name); if (!cond) fails++; };

// Three requests 401 at once, as Notes does.
let calls = 0;
refresh = async () => { calls++; await new Promise(r => setTimeout(r, 30)); return true; };
let out = await Promise.all([refreshOnce(), refreshOnce(), refreshOnce()]);
ok('three concurrent refreshes collapse into one', calls === 1);
ok('all three get the same answer', out.every(v => v === true));

// The next expiry, later, refreshes again rather than reusing a finished one.
calls = 0;
out = await Promise.all([refreshOnce(), refreshOnce()]);
ok('a later expiry starts a fresh refresh', calls === 1);

// A failing refresh must not stick around and poison the next attempt.
calls = 0;
refresh = async () => { calls++; return false; };
ok('failure reported', (await refreshOnce()) === false);
refresh = async () => { calls++; return true; };
ok('a later attempt after failure can succeed', (await refreshOnce()) === true);
ok('the failed attempt did not block the next', calls === 2);

// A throwing refresh must clear the slot too, or every later call hangs.
refresh = async () => { throw new Error('network'); };
try { await refreshOnce(); } catch { /* expected */ }
refresh = async () => true;
ok('a throwing refresh does not wedge the next one', (await refreshOnce()) === true);

console.log(fails
  ? `[check-refresh-single-flight] ${fails} failed`
  : '[check-refresh-single-flight] concurrent refreshes collapse into one.');
process.exit(fails ? 1 : 0);
