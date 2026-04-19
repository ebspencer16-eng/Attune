/**
 * Builds public/qr-cards-print.html
 * 8 pages: 4 packages × (front + back), designed for 7" × 4.25" cards
 * printed on 8.5 × 5.5 landscape stock.
 *
 * Design matches the notepad brand:
 *   - Navy #162040 header panel
 *   - White-backed mark (matches attune_lockup_navy_white) — left bubble
 *     pink/coral fill with white heart, right bubble white fill with
 *     coral heart
 *   - White wordmark "Attune" with "RELATIONSHIPS" kicker
 *   - Italic Playfair "Understanding takes intention." tagline
 *   - Orange→purple→blue gradient rule accent
 *   - Body on cream with gradient headline + italic subhead
 */

const fs = require('fs');
const path = require('path');

const NAVY   = '#162040';
const ORANGE = '#E8673A';
const PURPLE = '#6B3FA0';
const BLUE   = '#1B5FE8';
const CLAY   = '#C8522E';

// ── Mark variants ────────────────────────────────────────────────────────────

/** White-backed mark on navy — matches lockup_navy_white reference.
 *  Left bubble: pink/coral gradient fill (gradient stop 1) with WHITE heart.
 *  Right bubble: WHITE fill with coral heart inside.
 *  Used on navy backgrounds. */
function markOnNavy(w = 46, h = 34) {
  return `<svg width="${w}" height="${h}" viewBox="0 0 103 76" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="mNavy" x1="0" y1="0" x2="103" y2="76" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#D9755B"/>
      <stop offset="100%" stop-color="#C8522E"/>
    </linearGradient>
  </defs>
  <!-- Left bubble: coral fill -->
  <path d="M14,4L44,4A9,9,0,0,1,53,13L53,42A9,9,0,0,1,44,51L20,51L6,61L11,51A6,6,0,0,1,5,45L5,13A9,9,0,0,1,14,4Z" fill="url(#mNavy)"/>
  <!-- White heart inside left bubble -->
  <path d="M22,11C20,8.5,16.5,5,11.5,5C5.5,5,2,9.5,2,14.5C2,23,11,30,22,40C33,30,42,23,42,14.5C42,9.5,38.5,5,32.5,5C27.5,5,24,8.5,22,11Z" fill="white" transform="translate(13.16,11.3) scale(.72)"/>
  <!-- Right bubble: WHITE fill -->
  <path d="M89,14L59,14A9,9,0,0,0,50,23L50,52A9,9,0,0,0,59,61L83,61L97,71L92,61A6,6,0,0,0,98,55L98,23A9,9,0,0,0,89,14Z" fill="white"/>
  <!-- Coral heart inside right bubble -->
  <path d="M22,11C20,8.5,16.5,5,11.5,5C5.5,5,2,9.5,2,14.5C2,23,11,30,22,40C33,30,42,23,42,14.5C42,9.5,38.5,5,32.5,5C27.5,5,24,8.5,22,11Z" fill="url(#mNavy)" transform="translate(58.16,21.3) scale(.72)"/>
</svg>`;
}

/** Standard full-color mark for light backgrounds */
function markFullColor(w = 18, h = 13, gradId = 'lgc') {
  return `<svg width="${w}" height="${h}" viewBox="0 0 103 76" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="${gradId}" x1="0" y1="0" x2="103" y2="76" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#E8673A"/><stop offset="100%" stop-color="#1B5FE8"/></linearGradient></defs>
  <path d="M14,4L44,4A9,9,0,0,1,53,13L53,42A9,9,0,0,1,44,51L20,51L6,61L11,51A6,6,0,0,1,5,45L5,13A9,9,0,0,1,14,4Z" fill="url(#${gradId})"/>
  <path d="M22,11C20,8.5,16.5,5,11.5,5C5.5,5,2,9.5,2,14.5C2,23,11,30,22,40C33,30,42,23,42,14.5C42,9.5,38.5,5,32.5,5C27.5,5,24,8.5,22,11Z" fill="white" opacity=".95" transform="translate(13.16,11.3) scale(.72)"/>
  <path d="M89,14L59,14A9,9,0,0,0,50,23L50,52A9,9,0,0,0,59,61L83,61L97,71L92,61A6,6,0,0,0,98,55L98,23A9,9,0,0,0,89,14Z" fill="none" stroke="url(#${gradId})" stroke-width="2.2" stroke-linejoin="round"/>
  <path d="M22,11C20,8.5,16.5,5,11.5,5C5.5,5,2,9.5,2,14.5C2,23,11,30,22,40C33,30,42,23,42,14.5C42,9.5,38.5,5,32.5,5C27.5,5,24,8.5,22,11Z" fill="url(#${gradId})" transform="translate(58.16,21.3) scale(.72)"/>
</svg>`;
}

// ── Package definitions (accent colors + headlines) ──────────────────────────

const PACKAGES = [
  {
    id: 'core',
    name: 'The Attune Assessment',
    label: 'Assessment',
    accent: ORANGE,
    accentDark: CLAY,
    gradient: `linear-gradient(90deg,${ORANGE},${PURPLE},${BLUE})`,
  },
  {
    id: 'newlywed',
    name: 'Starting Out Collection',
    label: 'Starting Out',
    accent: CLAY,
    accentDark: '#A04420',
    gradient: `linear-gradient(90deg,${CLAY},${PURPLE},${BLUE})`,
  },
  {
    id: 'anniversary',
    name: 'Relationship Reflection',
    label: 'Anniversary',
    accent: PURPLE,
    accentDark: '#4E2D7A',
    gradient: `linear-gradient(90deg,${ORANGE},${PURPLE},${BLUE})`,
  },
  {
    id: 'premium',
    name: 'Attune Premium',
    label: 'Premium',
    accent: '#5B6DF8',
    accentDark: '#3E4DD8',
    gradient: `linear-gradient(90deg,#5B6DF8,${PURPLE},${BLUE})`,
  },
];

// ── QR code: read from an existing file or leave placeholder ────────────────
// The existing file has embedded base64 QR codes per package. Preserve them.

function extractExistingQrs() {
  try {
    const src = fs.readFileSync(path.join(__dirname, '..', 'public', 'qr-cards-print.html'), 'utf8');
    const matches = Array.from(src.matchAll(/src="(data:image\/png;base64,[^"]+)"/g));
    if (matches.length >= 4) {
      return matches.slice(0, 4).map(m => m[1]);
    }
  } catch (e) {
    console.warn('Could not read existing QR codes, using placeholders');
  }
  // Placeholder 1x1 transparent if not found
  return PACKAGES.map(() => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=');
}

// ── CSS (shared) ─────────────────────────────────────────────────────────────

const CSS = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body{background:#D0C9C0;font-family:'DM Sans',Arial,sans-serif}
body{padding:24px;display:flex;flex-direction:column;align-items:center;gap:24px}

.page{display:flex;flex-direction:column;align-items:center;gap:6px}
.page-label{font-size:9px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#8C7A68}

/* Card base */
.card{width:7in;height:4.25in;display:flex;flex-shrink:0;position:relative;border-radius:4px;overflow:hidden}
.front{background:#FFFEF9;box-shadow:0 16px 48px rgba(0,0,0,.18),0 2px 8px rgba(0,0,0,.07);border:.5px solid rgba(0,0,0,.06)}
.back{background:#FFFEF9;flex-direction:column;box-shadow:0 8px 24px rgba(0,0,0,.10);border:.5px solid rgba(0,0,0,.05)}

/* FRONT — navy panel on left (notepad style) */
.navy-panel{width:220px;flex-shrink:0;background:${NAVY};color:white;display:flex;flex-direction:column;padding:28px 26px 22px;position:relative}
.navy-panel::after{content:"";position:absolute;bottom:0;left:0;right:0;height:3px;background:linear-gradient(90deg,${ORANGE} 0%,${PURPLE} 50%,${BLUE} 100%)}
.navy-top{display:flex;align-items:center;gap:12px;margin-bottom:18px}
.navy-divider{width:1px;background:rgba(255,255,255,.3);align-self:stretch}
.np-lockup-wordmark{font-family:'Playfair Display',Georgia,serif;font-size:19px;font-weight:700;color:white;letter-spacing:-.015em;line-height:1}
.np-lockup-kicker{font-family:'DM Sans',sans-serif;font-size:7px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:rgba(255,255,255,.55);margin-top:4px}
.np-tagline{font-family:'Playfair Display',Georgia,serif;font-style:italic;font-size:14px;color:rgba(255,255,255,.92);line-height:1.35;letter-spacing:.005em;margin-top:auto;margin-bottom:12px;max-width:168px}
.np-package-label{font-family:'DM Sans',sans-serif;font-size:7px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:rgba(255,255,255,.45);margin-bottom:4px}
.np-package-name{font-family:'Playfair Display',Georgia,serif;font-size:11px;font-style:italic;color:rgba(255,255,255,.82);line-height:1.3}

/* FRONT — right body */
.right{flex:1;display:flex;flex-direction:column;overflow:hidden}
.right-body{flex:1;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;padding:38px 42px 22px}
.right-footer{padding:10px 42px;border-top:1px solid #EDE8E0;display:flex;align-items:center;gap:5px;flex-shrink:0}
.footer-dot{width:3px;height:3px;border-radius:50%;background:#C8B8A8}
.footer-txt{font-size:7px;letter-spacing:.14em;text-transform:uppercase;color:#B8AC9C;font-family:'DM Sans',sans-serif}
.welcome-eye{font-size:7.5px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:#C0B4A8;margin-bottom:10px;font-family:'DM Sans',sans-serif}
.welcome-h{font-family:'Playfair Display',Georgia,serif;font-weight:700;font-size:36px;line-height:1.0;letter-spacing:-.03em;margin-bottom:10px;background:linear-gradient(120deg,${ORANGE} 0%,${PURPLE} 50%,${BLUE} 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.welcome-tag{font-family:'Playfair Display',Georgia,serif;font-size:11.5px;font-style:italic;color:#4A3C34;line-height:1.65;max-width:300px;margin-bottom:16px}
.get-started{background:#F9F5F1;border-radius:8px;padding:11px 14px;border-left:3px solid}
.gs-eye{font-size:7.5px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;margin-bottom:5px;font-family:'DM Sans',sans-serif}
.gs-body{font-size:9px;color:#4A3C34;font-family:'DM Sans',sans-serif;line-height:1.55}

/* BACK */
.back-accent{height:3px;flex-shrink:0}
.back-inner{flex:1;display:flex;overflow:hidden}
.back-left{flex:1;padding:20px 24px 16px;display:flex;flex-direction:column;border-right:1px solid #F0EBE4}
.back-right{width:180px;flex-shrink:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:18px 16px}
.back-footer{padding:8px 24px;border-top:1px solid #EDE8E0;display:flex;justify-content:space-between;flex-shrink:0;background:#FAF6F0}
.back-steps-head{font-size:7.5px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:#C0B4A8;margin-bottom:12px;font-family:'DM Sans',sans-serif;display:flex;align-items:center;gap:8px}
.back-steps-head::after{content:"";flex:1;height:1px;background:#E8E0D4;margin-top:1px}
.step{display:flex;gap:11px;align-items:flex-start;padding-bottom:10px;border-bottom:1px solid #F2EFEB}
.step:last-child{border-bottom:none;padding-bottom:0}
.step-num{font-family:'Playfair Display',Georgia,serif;font-size:15px;font-weight:700;flex-shrink:0;line-height:1.1;width:13px}
.step-t{font-size:9.5px;font-weight:700;color:#0E0B07;margin-bottom:2px;font-family:'DM Sans',sans-serif}
.step-d{font-size:7.5px;color:#8C7A68;line-height:1.5;font-family:'DM Sans',sans-serif}

@media print{
  @page{size:8.5in 5.5in landscape;margin:.4in .5in}
  html,body{background:white;padding:0;gap:0;display:block}
  .page{page-break-after:always;page-break-inside:avoid;display:flex;flex-direction:column;align-items:center;justify-content:center;height:4.7in;gap:4px}
  .page:last-child{page-break-after:auto}
  .page-label{display:none}
  .card{box-shadow:none!important;border:0.5px solid #DDD8D0!important}
}
`;

// ── Front + back templates ───────────────────────────────────────────────────

function frontCard(pkg) {
  return `<div class="page front-page">
  <div class="card front">
    <!-- NAVY PANEL -->
    <div class="navy-panel">
      <div class="navy-top">
        ${markOnNavy(44, 32)}
        <div class="navy-divider"></div>
        <div>
          <div class="np-lockup-wordmark">Attune</div>
          <div class="np-lockup-kicker">Relationships</div>
        </div>
      </div>
      <div class="np-tagline">Understanding takes intention.</div>
      <div>
        <div class="np-package-label">Package</div>
        <div class="np-package-name">${pkg.name}</div>
      </div>
    </div>
    <!-- RIGHT BODY -->
    <div class="right">
      <div class="right-body">
        <div class="welcome-eye">Welcome</div>
        <div class="welcome-h">Attune<br>Relationships</div>
        <div class="welcome-tag">Two exercises, answered independently. Your results unlock when you're both done.</div>
        <div class="get-started" style="border-left-color:${pkg.accent}">
          <div class="gs-eye" style="color:${pkg.accent}">To get started</div>
          <div class="gs-body">Scan the QR code on the back of this card, or visit <strong>attune-relationships.com/app</strong></div>
        </div>
      </div>
      <div class="right-footer">
        ${markFullColor(16, 12, 'fl_' + pkg.id)}
        <div class="footer-dot"></div>
        <div class="footer-txt">attune-relationships.com</div>
        <div class="footer-dot"></div>
        <div class="footer-txt">${pkg.name}</div>
      </div>
    </div>
  </div>
  <div class="page-label">${pkg.label} – Front</div>
</div>`;
}

function backCard(pkg, qrDataUri) {
  return `<div class="page back-page">
  <div class="card back">
    <div class="back-accent" style="background:${pkg.gradient}"></div>
    <div class="back-inner">
      <div class="back-left">
        <div class="back-steps-head">How to get started</div>
        <div style="display:flex;flex-direction:column;gap:9px;flex:1;justify-content:center">
          <div class="step"><div class="step-num" style="color:${pkg.accent}">1</div><div><div class="step-t">Scan the QR code</div><div class="step-d">Use your phone's camera. Opens directly to your Attune account setup.</div></div></div>
          <div class="step"><div class="step-num" style="color:${pkg.accent}">2</div><div><div class="step-t">Create your account</div><div class="step-d">Takes about two minutes. You'll invite your partner from inside the app.</div></div></div>
          <div class="step"><div class="step-num" style="color:${pkg.accent}">3</div><div><div class="step-t">Answer on your own</div><div class="step-d">Both partners answer independently. Your answers stay private until you both finish.</div></div></div>
          <div class="step"><div class="step-num" style="color:${pkg.accent}">4</div><div><div class="step-t">See your results together</div><div class="step-d">Couple type, map, and insights unlock when both of you are done.</div></div></div>
        </div>
      </div>
      <div class="back-right">
        <div style="font-size:7px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:#C0B4A8;text-align:center;font-family:'DM Sans',sans-serif;margin-bottom:10px">Scan to start</div>
        <img src="${qrDataUri}" width="108" height="108" style="border-radius:6px;border:1px solid #EDE8E0;display:block"/>
        <div style="text-align:center;margin-top:10px">
          <div style="font-size:8px;font-weight:700;color:#0E0B07;font-family:'DM Sans',sans-serif;margin-bottom:3px">attune-relationships.com</div>
          <div style="font-family:'Playfair Display',Georgia,serif;font-size:7.5px;font-style:italic;color:#8C7A68">Understanding takes intention.</div>
        </div>
      </div>
    </div>
    <div class="back-footer">
      <div style="font-family:'DM Sans',sans-serif;font-size:7px;letter-spacing:.18em;text-transform:uppercase;color:#B8AC9C;font-weight:700">Attune Relationships</div>
      <div style="font-family:'DM Sans',sans-serif;font-size:7px;color:#B8AC9C">${pkg.name}</div>
    </div>
  </div>
  <div class="page-label">${pkg.label} – Back</div>
</div>`;
}

// ── Assemble ─────────────────────────────────────────────────────────────────

const qrs = extractExistingQrs();
const pages = PACKAGES.map((pkg, i) => frontCard(pkg) + backCard(pkg, qrs[i])).join('\n');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Attune Relationships – QR Cards</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>${CSS}</style>
</head>
<body>
${pages}
</body>
</html>
`;

const out = path.join(__dirname, '..', 'public', 'qr-cards-print.html');
fs.writeFileSync(out, html);
console.log(`Wrote ${out} (${html.length} bytes, ${PACKAGES.length * 2} pages)`);
