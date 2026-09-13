/* Attune launch flags — shared by every static page.
 *
 * Flip these to change what the site offers. Nothing physical-related
 * is deleted; these flags gate it so it can be re-enabled in one place.
 *
 *   PHYSICAL_ENABLED  false = digital-only (phase 1). Hides the digital/physical
 *                     toggle, shipping, and physical pricing; forces every order
 *                     to the digital variant. Set true for phase 2.
 *
 *   APP_BANNER_ENABLED  false = no "get the app" banner anywhere. Off until
 *                     the app is in the App Store: a banner promising an app
 *                     that does not exist is worse than no banner, and a store
 *                     link that 404s reads as a broken product. When it ships,
 *                     flip this and set APP_STORE_URL, here and in src/App.jsx.
 *
 * The React app (src/App.jsx) carries the same flags; keep them in sync.
 */
window.ATTUNE_FLAGS = {
  PHYSICAL_ENABLED: false,
  APP_BANNER_ENABLED: false,
  APP_STORE_URL: 'https://apps.apple.com/app/attune-relationships/idPENDING',
};

/* ── "Get the app" banner ───────────────────────────────────────────────────
 * A slim bar at the top of every marketing page, phones only. The portal has
 * its own version inside the React app; this covers the static site, where a
 * visitor previously saw nothing.
 *
 * Dismissal is remembered, because a banner that returns on every visit is the
 * thing people resent about these. Hidden when the page is already running as
 * an installed app, since prompting someone to get the app they are using is
 * the clearest possible sign nobody checked.
 */
(function () {
  var F = window.ATTUNE_FLAGS || {};
  if (!F.APP_BANNER_ENABLED) return;
  // Not inside the React app, which draws its own version of this bar. This
  // file is loaded there now, for the privacy notice below, and without this
  // the portal would carry two identical bars.
  if (document.getElementById('root')) return;
  try {
    if (localStorage.getItem('attune_app_banner_dismissed') === '1') return;
    var standalone = window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true;
    if (standalone) return;
    if (!window.matchMedia('(max-width: 720px)').matches) return;
  } catch (e) { return; }

  document.addEventListener('DOMContentLoaded', function () {
    var bar = document.createElement('div');
    bar.setAttribute('role', 'complementary');
    bar.style.cssText = 'position:sticky;top:0;z-index:9999;display:flex;align-items:center;gap:.7rem;'
      + 'padding:.6rem .9rem;background:#0E0B07;color:#fff;font-family:"DM Sans",system-ui,sans-serif;font-size:.82rem;';
    bar.innerHTML =
      '<span style="flex:1;line-height:1.35">Get the full experience in the Attune app.</span>'
      + '<a href="' + (F.APP_STORE_URL || '#') + '" style="flex-shrink:0;background:#E8673A;color:#fff;'
      + 'border-radius:8px;padding:.4rem .8rem;font-weight:700;text-decoration:none">Get</a>'
      + '<button aria-label="Dismiss" style="flex-shrink:0;background:none;border:none;color:rgba(255,255,255,.6);'
      + 'font-size:1.1rem;line-height:1;cursor:pointer;padding:.2rem .3rem">&times;</button>';
    bar.querySelector('button').addEventListener('click', function () {
      try { localStorage.setItem('attune_app_banner_dismissed', '1'); } catch (e) {}
      bar.remove();
    });
    document.body.insertBefore(bar, document.body.firstChild);
  });
})();


/* ── Privacy notice, and a consent gate where one is required ───────────────
 * A slim bar at the bottom of every static page, shown once.
 *
 * TWO JURISDICTIONS, TWO ANSWERS
 *
 * In the US this is notice, not a gate. State privacy law is opt-out: consent
 * is not required before storing what the site already stores, so a wall that
 * blocks the page until someone clicks Accept would be asking permission we do
 * not need and cannot honour a refusal of. It also trains people to click
 * Accept without reading, which is worse for them than no banner.
 *
 * In the EU, the UK, the EEA and Switzerland it is a real choice, with Accept
 * and Decline, because the privacy policy promises one: "If you are accessing
 * the Service from the European Union or United Kingdom, a consent banner will
 * be presented to you upon first visit." For a long time the notice above was
 * the whole of that promise and it had no Accept button.
 *
 * WHICH ONE IS DECIDED BY /api/region, which reads Vercel's country header. A
 * country we cannot determine is treated as needing consent: unknown is not
 * the same as the US. api/_lib/consent-region.js holds the list and the rule.
 *
 * WHAT A DECLINE ACTUALLY STOPS
 *
 * This site sets no cookies and runs no advertising or analytics trackers, so
 * the banner says local storage rather than borrowing cookie language for
 * something that is not a cookie. The one thing that is not strictly necessary
 * is Sentry, which reports errors and records a replay when one fires, and a
 * replay can contain what someone typed. src/main.jsx reads the answer stored
 * here and does not start Sentry when consent is required and not given. A
 * banner whose Decline changes nothing is worse than no banner.
 *
 * The answer is remembered, the same way the app banner above remembers its
 * dismissal: a question that returns on every visit is the thing people resent
 * about these.
 */
(function () {
  var KEY = 'attune_privacy_notice_dismissed';
  var CONSENT_KEY = 'attune_consent';   // 'granted' | 'declined', EU/UK only
  try {
    if (localStorage.getItem(KEY) === '1') return;
  } catch (e) { return; }   // storage blocked: no banner rather than every load

  document.addEventListener('DOMContentLoaded', function () {
    // Not on the pages that explain this, where it would be telling someone
    // what they are already reading.
    var here = (location.pathname || '').replace(/\/$/, '');
    if (here === '/privacy' || here === '/privacy-choices' || here === '/terms') return;

    // Ask which rule applies before drawing anything. A failed request is
    // treated as consent-required, for the same reason an unknown country is.
    fetch('/api/region', { headers: { Accept: 'application/json' } })
      .then(function (r) { return r.ok ? r.json() : { consentRequired: true }; })
      .catch(function () { return { consentRequired: true }; })
      .then(function (region) { draw(!!region.consentRequired); });
  });

  function draw(needsConsent) {
    if (needsConsent) {
      try { if (localStorage.getItem(CONSENT_KEY)) return; } catch (e) { return; }
    }

    var bar = document.createElement('div');
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', 'Privacy notice');
    bar.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:9998;display:flex;'
      + 'align-items:center;gap:.9rem;padding:.85rem 1.1rem;background:#1E1610;color:rgba(255,255,255,.82);'
      + 'font-family:"DM Sans",system-ui,sans-serif;font-size:.8rem;line-height:1.5;'
      + 'box-shadow:0 -2px 20px rgba(14,11,7,.18)';
    var btn = function (label, bg, color) {
      return '<button type="button" data-a="' + label + '" style="flex-shrink:0;background:' + bg
        + ';color:' + color + ';border:' + (bg === 'transparent' ? '1px solid rgba(255,255,255,.35)' : 'none')
        + ';border-radius:8px;padding:.45rem .9rem;font-weight:700;font-size:.78rem;cursor:pointer;'
        + 'font-family:inherit">' + label + '</button>';
    };

    var links = '<a href="/privacy" style="color:#E8A87A;text-decoration:underline">Privacy</a>'
      + ' &middot; '
      + '<a href="/privacy-choices" style="color:#E8A87A;text-decoration:underline">Your privacy choices</a>';

    bar.innerHTML = needsConsent
      ? '<span style="flex:1;min-width:0">Attune stores a little data in your browser to keep the site working. '
        + 'We set no cookies and run no advertising or analytics trackers. With your consent we also report '
        + 'errors to help us fix them, which can include what was on screen when one happened. '
        + links + '</span>'
        + btn('Decline', 'transparent', '#fff')
        + btn('Accept', '#E8673A', '#fff')
      : '<span style="flex:1;min-width:0">Attune stores a little data in your browser to keep the site working. '
        + 'We set no cookies and run no advertising or analytics trackers. '
        + links + '</span>'
        + btn('Got it', '#E8673A', '#fff');

    [].forEach.call(bar.querySelectorAll('button'), function (b) {
      b.addEventListener('click', function () {
        try {
          localStorage.setItem(KEY, '1');
          if (needsConsent) {
            localStorage.setItem(CONSENT_KEY, b.getAttribute('data-a') === 'Accept' ? 'granted' : 'declined');
          }
        } catch (e) {}
        bar.remove();
      });
    });

    document.body.appendChild(bar);
  }
})();
