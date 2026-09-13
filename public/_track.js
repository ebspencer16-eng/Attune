/* Attune engagement measures, browser side.
 *
 * ── WHAT IT SENDS ─────────────────────────────────────────────────────────
 * Two things, to /api/track:
 *
 *   visit      once per page load
 *   page_time  how long the page was actually looked at, on the way out
 *
 * And nothing else. No id of any kind, no referrer, no scroll depth, no
 * clicks. The server refuses anything more than this anyway.
 *
 * ── CONSENT COMES FIRST ───────────────────────────────────────────────────
 * Where consent is required, nothing is sent until it is granted. That is
 * decided by /api/region, the same endpoint the banner in _flags.js asks, and
 * the answer the banner stored. A decline sends nothing, ever, and a person
 * who has not answered yet sends nothing either: "upon first visit" means
 * before the first answer, not after it.
 *
 * The server checks the same rule again. This one can be bypassed by anybody
 * who wants to; that one decides what is stored.
 *
 * ── TIME MEANS TIME LOOKING AT IT ─────────────────────────────────────────
 * A tab in the background is not reading. The clock stops on visibilitychange
 * and starts again on the way back, so "average time on the page" is not
 * "average time the tab existed", which is the number these things usually
 * report and the reason nobody trusts them.
 *
 * Sent with sendBeacon, which survives the page closing. A fetch does not.
 */
(function () {
  var ENDPOINT = '/api/track';
  var CONSENT_KEY = 'attune_consent';
  var REGION_KEY = 'attune_region_consent_required';

  function stored(key) {
    try { return localStorage.getItem(key); } catch (e) { return null; }
  }

  /** Resolves to the consent header value, or null when nothing may be sent. */
  function permission() {
    var answer = stored(CONSENT_KEY);
    if (answer === 'granted') return Promise.resolve('granted');
    if (answer === 'declined') return Promise.resolve(null);

    var cached = null;
    try { cached = sessionStorage.getItem(REGION_KEY); } catch (e) {}
    if (cached === '0') return Promise.resolve('not-required');
    if (cached === '1') return Promise.resolve(null);   // required, unanswered

    return fetch('/api/region', { headers: { Accept: 'application/json' } })
      .then(function (r) { return r.ok ? r.json() : { consentRequired: true }; })
      .catch(function () { return { consentRequired: true }; })
      .then(function (region) {
        var required = !!region.consentRequired;
        try { sessionStorage.setItem(REGION_KEY, required ? '1' : '0'); } catch (e) {}
        return required ? null : 'not-required';
      });
  }

  function send(kind, key, ms) {
    permission().then(function (consent) {
      if (!consent) return;
      var body = JSON.stringify({ kind: kind, key: key, ms: ms });
      // sendBeacon cannot set a header, so the consent answer rides in the
      // body for beacons and the server reads either. A fetch on a page that
      // is not unloading can set it properly.
      var blob = new Blob([body], { type: 'application/json' });
      var sent = false;
      try { sent = navigator.sendBeacon(ENDPOINT + '?c=' + consent, blob); } catch (e) {}
      if (sent) return;
      try {
        fetch(ENDPOINT, {
          method: 'POST', keepalive: true,
          headers: { 'Content-Type': 'application/json', 'X-Attune-Consent': consent },
          body: body,
        });
      } catch (e) {}
    });
  }

  // The single-page app splits its own time by view, and the app's exercises
  // report how long each took. Both go through this sender, so the consent
  // rule above is the only one there is.
  window.__attuneTrack = send;

  var path = (location.pathname || '/').replace(/\/$/, '') || '/';
  send('visit', path);

  // ── The clock ───────────────────────────────────────────────────────────
  var visibleSince = document.visibilityState === 'visible' ? Date.now() : 0;
  var total = 0;
  var reported = false;

  function pause() {
    if (!visibleSince) return;
    total += Date.now() - visibleSince;
    visibleSince = 0;
  }
  function resume() {
    if (visibleSince) return;
    visibleSince = Date.now();
  }
  function report() {
    if (reported) return;
    pause();
    if (total < 1000) return;   // a bounce is not a reading time
    reported = true;
    send('page_time', path, total);
  }

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') resume();
    else { pause(); report(); }
  });
  window.addEventListener('pagehide', report);
})();
