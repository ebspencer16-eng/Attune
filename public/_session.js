/**
 * The signed-in person's access token, for a static page.
 *
 * The React site calls `sb.auth.getSession()`, which means loading the Supabase
 * client. A static page under public/ does not otherwise need it, so it reads
 * the key supabase-js keeps the session in: sb-<project-ref>-auth-token. The
 * ref is found by prefix rather than hardcoded, so this survives a project
 * change.
 *
 * It lives here because it was written twice. privacy-choices.html had it and
 * /feedback needed it, and a second copy of a rule is this codebase's whole
 * failure mode. check-session-reader.mjs fails the build on any other file
 * under public/ reading that key.
 *
 * Returning null means the page shows its signed-out state, which is the safe
 * way to be wrong.
 */
(function (w) {
  function attuneToken() {
    try {
      for (var i = 0; i < localStorage.length; i++) {
        var k = localStorage.key(i);
        if (!k || k.indexOf('sb-') !== 0 || k.indexOf('-auth-token') < 0) continue;
        var v = JSON.parse(localStorage.getItem(k) || 'null');
        if (!v) continue;
        /* Two shapes: supabase-js v2 stores the session at the top level,
           older versions wrapped it in currentSession. */
        var t = v.access_token || (v.currentSession && v.currentSession.access_token);
        if (t) return t;
      }
    } catch (e) { /* unreadable storage reads as signed out */ }
    return null;
  }

  /** JSON headers, with a Bearer token when there is one. */
  function attuneHeaders() {
    var h = { 'Content-Type': 'application/json' };
    var t = attuneToken();
    if (t) h.Authorization = 'Bearer ' + t;
    return h;
  }

  w.attuneToken = attuneToken;
  w.attuneHeaders = attuneHeaders;
})(window);
