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


/* ── Privacy notice ─────────────────────────────────────────────────────────
 * A slim bar at the bottom of every static page, shown once.
 *
 * Notice, not a gate. US state privacy law is opt-out: consent is not required
 * before storing what the site already stores, so a wall that blocks the page
 * until someone clicks Accept would be asking permission we do not need and
 * cannot honour a refusal of. It also trains people to click Accept without
 * reading, which is worse for them than no banner.
 *
 * So this says what happens and points at the controls. It does not have an
 * Accept button, because there is nothing to accept.
 *
 * It is careful about what it claims. This site sets no cookies and runs no
 * analytics or advertising trackers, so the banner says local storage rather
 * than borrowing cookie-banner language for something that is not a cookie.
 *
 * Dismissal is remembered the same way the app banner above remembers it: a
 * notice that returns on every visit is the thing people resent about these.
 */
(function () {
  var KEY = 'attune_privacy_notice_dismissed';
  try {
    if (localStorage.getItem(KEY) === '1') return;
  } catch (e) { return; }   // storage blocked: no banner rather than every load

  document.addEventListener('DOMContentLoaded', function () {
    // Not on the pages that explain this, where it would be telling someone
    // what they are already reading.
    var here = (location.pathname || '').replace(/\/$/, '');
    if (here === '/privacy' || here === '/privacy-choices' || here === '/terms') return;

    var bar = document.createElement('div');
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', 'Privacy notice');
    bar.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:9998;display:flex;'
      + 'align-items:center;gap:.9rem;padding:.85rem 1.1rem;background:#1E1610;color:rgba(255,255,255,.82);'
      + 'font-family:"DM Sans",system-ui,sans-serif;font-size:.8rem;line-height:1.5;'
      + 'box-shadow:0 -2px 20px rgba(14,11,7,.18)';
    bar.innerHTML =
      '<span style="flex:1;min-width:0">Attune stores a little data in your browser to keep the site working. '
      + 'We set no cookies and run no advertising or analytics trackers. '
      + '<a href="/privacy" style="color:#E8A87A;text-decoration:underline">Privacy</a>'
      + ' &middot; '
      + '<a href="/privacy-choices" style="color:#E8A87A;text-decoration:underline">Your privacy choices</a>'
      + '</span>'
      + '<button type="button" style="flex-shrink:0;background:#E8673A;color:#fff;border:none;'
      + 'border-radius:8px;padding:.45rem .9rem;font-weight:700;font-size:.78rem;cursor:pointer;'
      + 'font-family:inherit">Got it</button>';

    bar.querySelector('button').addEventListener('click', function () {
      try { localStorage.setItem(KEY, '1'); } catch (e) {}
      bar.remove();
    });

    document.body.appendChild(bar);
  });
})();
