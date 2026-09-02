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
