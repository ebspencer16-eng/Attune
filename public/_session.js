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

  /* ── SIGNED IN, THE NAV SAYS SO (A243) ──────────────────────────────────
     Ellie: "it's misleading because I see sign in on the top toolbar. Maybe,
     if the user is signed in, they should instead see the profile icon in the
     circle up there and that should take them to their dashboard?"

     Every static page's nav has `a.nav-signin` and a mobile menu link to
     /app?signin=1. With a session, the first becomes the dashboard's circle
     (their initial, the same colours) and the second goes to the dashboard.
     The name is the one the dashboard keeps in attune_account; with none, a
     plain circle. */
  function signedInNav() {
    if (!attuneToken()) return;
    var name = '';
    try { name = (JSON.parse(localStorage.getItem('attune_account') || 'null') || {}).name || ''; } catch (e) {}
    var initial = String(name).trim().charAt(0).toUpperCase();
    var links = document.querySelectorAll('a[href="/app?signin=1"]');
    for (var i = 0; i < links.length; i++) {
      var a = links[i];
      a.href = '/app';
      if (a.classList.contains('nav-signin')) {
        a.textContent = initial || '';
        a.setAttribute('aria-label', 'Your dashboard');
        a.setAttribute('data-signed-in', '1');
        a.style.cssText = 'width:34px;height:34px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;'
          + 'background:linear-gradient(135deg,#E8673A22,#1B5FE822);border:1.5px solid rgba(232,103,58,.3);'
          + 'color:#E8673A;font-weight:700;font-size:.78rem;text-decoration:none';
      } else {
        a.textContent = 'Your dashboard';
      }
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', signedInNav);
  else signedInNav();
})(window);
