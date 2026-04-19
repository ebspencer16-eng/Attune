/**
 * scripts/build_qr_cards.cjs
 *
 * Generates public/qr-cards-print.html
 * 8 pages: 4 packages × (front + back), 7" × 4.25" cards, 8.5 × 5.5 landscape.
 *
 * Design is the ORIGINAL card structure (gradient panel left, cream body
 * right) with the notepad brand polish applied:
 *   - White-backed mark on the gradient panel (coral left bubble + white
 *     heart, white right bubble + coral heart) — replaces the washed-out
 *     translucent mark from the prior version
 *   - Playfair Display + DM Sans type pairing matching the notepad
 *   - Italic Playfair tagline "Understanding takes intention."
 *   - Refined letterspacing and hierarchy on the package label + name
 *
 *   Usage: node scripts/build_qr_cards.cjs
 */

const fs = require('fs');
const path = require('path');

const PUBLIC_HTML = path.join(__dirname, '..', 'public', 'qr-cards-print.html');

/**
 * Returns an inline SVG for a full-panel diagonal gradient.
 * Using SVG means the gradient is a bona fide image and always prints,
 * unlike CSS background-gradient which browsers strip by default.
 */
function gradPanelSvg(id, stops) {
  const stopTags = stops.map((s) => `<stop offset="${s.offset}" stop-color="${s.color}"/>`).join('');
  return `<svg class="gp-bg" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" viewBox="0 0 210 408">
  <defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">${stopTags}</linearGradient></defs>
  <rect width="210" height="408" fill="url(#${id})"/>
</svg>`;
}

/**
 * Returns an inline SVG for a full-width gradient strip (for .back-accent).
 */
function gradStripSvg(id, stops, height = 6) {
  const stopTags = stops.map((s) => `<stop offset="${s.offset}" stop-color="${s.color}"/>`).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" viewBox="0 0 1008 ${height}" style="display:block;width:100%;height:${height}px">
  <defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="0">${stopTags}</linearGradient></defs>
  <rect width="1008" height="${height}" fill="url(#${id})"/>
</svg>`;
}

// ── Mark variant for gradient/dark panel ─────────────────────────────────────
// Same white-backed mark used in the notepad's navy header: coral-filled left
// bubble with white heart, white-filled right bubble with coral heart. On a
// gradient background it reads crisp rather than washed-out.
function markOnDark(w = 44, h = 32) {
  return `<svg width="${w}" height="${h}" viewBox="0 0 103 76" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="mCoral" x1="0" y1="0" x2="103" y2="76" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#E8906F"/>
      <stop offset="100%" stop-color="#C8522E"/>
    </linearGradient>
  </defs>
  <path d="M14,4L44,4A9,9,0,0,1,53,13L53,42A9,9,0,0,1,44,51L20,51L6,61L11,51A6,6,0,0,1,5,45L5,13A9,9,0,0,1,14,4Z" fill="url(#mCoral)"/>
  <path d="M22,11C20,8.5,16.5,5,11.5,5C5.5,5,2,9.5,2,14.5C2,23,11,30,22,40C33,30,42,23,42,14.5C42,9.5,38.5,5,32.5,5C27.5,5,24,8.5,22,11Z" fill="white" transform="translate(13.16,11.3) scale(.72)"/>
  <path d="M89,14L59,14A9,9,0,0,0,50,23L50,52A9,9,0,0,0,59,61L83,61L97,71L92,61A6,6,0,0,0,98,55L98,23A9,9,0,0,0,89,14Z" fill="white"/>
  <path d="M22,11C20,8.5,16.5,5,11.5,5C5.5,5,2,9.5,2,14.5C2,23,11,30,22,40C33,30,42,23,42,14.5C42,9.5,38.5,5,32.5,5C27.5,5,24,8.5,22,11Z" fill="url(#mCoral)" transform="translate(58.16,21.3) scale(.72)"/>
</svg>`;
}

function markFullColor(w = 18, h = 13, gradId = 'lgc') {
  return `<svg width="${w}" height="${h}" viewBox="0 0 103 76" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs><linearGradient id="${gradId}" x1="0" y1="0" x2="103" y2="76" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#E8673A"/><stop offset="100%" stop-color="#1B5FE8"/></linearGradient></defs>
  <path d="M14,4L44,4A9,9,0,0,1,53,13L53,42A9,9,0,0,1,44,51L20,51L6,61L11,51A6,6,0,0,1,5,45L5,13A9,9,0,0,1,14,4Z" fill="url(#${gradId})"/>
  <path d="M22,11C20,8.5,16.5,5,11.5,5C5.5,5,2,9.5,2,14.5C2,23,11,30,22,40C33,30,42,23,42,14.5C42,9.5,38.5,5,32.5,5C27.5,5,24,8.5,22,11Z" fill="white" opacity=".95" transform="translate(13.16,11.3) scale(.72)"/>
  <path d="M89,14L59,14A9,9,0,0,0,50,23L50,52A9,9,0,0,0,59,61L83,61L97,71L92,61A6,6,0,0,0,98,55L98,23A9,9,0,0,0,89,14Z" fill="none" stroke="url(#${gradId})" stroke-width="2.2" stroke-linejoin="round"/>
  <path d="M22,11C20,8.5,16.5,5,11.5,5C5.5,5,2,9.5,2,14.5C2,23,11,30,22,40C33,30,42,23,42,14.5C42,9.5,38.5,5,32.5,5C27.5,5,24,8.5,22,11Z" fill="url(#${gradId})" transform="translate(58.16,21.3) scale(.72)"/>
</svg>`;
}

// ── Packages ─────────────────────────────────────────────────────────────────

const PACKAGES = [
  {
    id: 'core',
    name: 'The Attune Assessment',
    label: 'Assessment',
    accent: '#E8673A',
    panelStops: [{offset:'0%',color:'#C8522E'},{offset:'52%',color:'#6B3FA0'},{offset:'100%',color:'#1B5FE8'}],
    headlineGradient: 'linear-gradient(120deg,#E8673A 0%,#6B3FA0 50%,#1B5FE8 100%)',
    stripStops: [{offset:'0%',color:'#E8673A'},{offset:'50%',color:'#6B3FA0'},{offset:'100%',color:'#1B5FE8'}],
  },
  {
    id: 'newlywed',
    name: 'Starting Out Collection',
    label: 'Starting Out',
    accent: '#C45C2A',
    panelStops: [{offset:'0%',color:'#C8522E'},{offset:'52%',color:'#6B3FA0'},{offset:'100%',color:'#1B5FE8'}],
    headlineGradient: 'linear-gradient(120deg,#C45C2A 0%,#6B3FA0 50%,#1B5FE8 100%)',
    stripStops: [{offset:'0%',color:'#C45C2A'},{offset:'50%',color:'#6B3FA0'},{offset:'100%',color:'#1B5FE8'}],
  },
  {
    id: 'anniversary',
    name: 'Relationship Reflection',
    label: 'Anniversary',
    accent: '#9B5DE5',
    panelStops: [{offset:'0%',color:'#6B3FA0'},{offset:'52%',color:'#9B5DE5'},{offset:'100%',color:'#1B5FE8'}],
    headlineGradient: 'linear-gradient(120deg,#C8522E 0%,#9B5DE5 50%,#1B5FE8 100%)',
    stripStops: [{offset:'0%',color:'#9B5DE5'},{offset:'50%',color:'#6B3FA0'},{offset:'100%',color:'#1B5FE8'}],
  },
  {
    id: 'premium',
    name: 'Attune Premium',
    label: 'Premium',
    accent: '#5B6DF8',
    panelStops: [{offset:'0%',color:'#3E4DD8'},{offset:'52%',color:'#6B3FA0'},{offset:'100%',color:'#1B5FE8'}],
    headlineGradient: 'linear-gradient(120deg,#5B6DF8 0%,#6B3FA0 50%,#1B5FE8 100%)',
    stripStops: [{offset:'0%',color:'#5B6DF8'},{offset:'50%',color:'#6B3FA0'},{offset:'100%',color:'#1B5FE8'}],
  },
];

// ── QR codes: reuse the ones already embedded in the previous HTML ──────────

function extractExistingQrs() {
  try {
    const src = fs.readFileSync(PUBLIC_HTML, 'utf8');
    const matches = Array.from(src.matchAll(/src="(data:image\/png;base64,[^"]+)"/g));
    if (matches.length >= 4) return matches.slice(0, 4).map(m => m[1]);
  } catch (e) {}
  return PACKAGES.map(() => 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=');
}

// ── CSS ──────────────────────────────────────────────────────────────────────

const CSS = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body{background:#D0C9C0;font-family:'DM Sans',Arial,sans-serif}
body{padding:24px;display:flex;flex-direction:column;align-items:center;gap:24px}

.page{display:flex;flex-direction:column;align-items:center;gap:6px}
.page-label{font-size:9px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;color:#8C7A68}

/* Card base */
.card{width:7in;height:4.25in;display:flex;flex-shrink:0;position:relative;border-radius:4px}
.front{background:#FFFEF9;box-shadow:0 16px 48px rgba(0,0,0,.18),0 2px 8px rgba(0,0,0,.07);border:.5px solid rgba(0,0,0,.06)}
.back{background:#FFFEF9;flex-direction:column;box-shadow:0 8px 24px rgba(0,0,0,.10);border:.5px solid rgba(0,0,0,.05)}

/* FRONT — gradient panel (original structure) */
.grad-panel{width:210px;height:100%;flex-shrink:0;align-self:stretch;border-radius:4px 0 0 4px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:32px 26px;color:white;position:relative;overflow:hidden}
.grad-panel>*:not(.gp-bg){position:relative;z-index:1}
.gp-bg{position:absolute;inset:0;width:100%;height:100%;display:block;z-index:0}
.gp-lockup{display:flex;flex-direction:column;align-items:center;gap:6px}
.gp-wordmark{font-family:'Playfair Display',Georgia,serif;font-size:22px;font-weight:700;color:white;letter-spacing:-.015em;line-height:1}
.gp-kicker{font-family:'DM Sans',sans-serif;font-size:7px;font-weight:700;letter-spacing:.28em;text-transform:uppercase;color:rgba(255,255,255,.6)}
.gp-divider{width:28px;height:1px;background:rgba(255,255,255,.45)}
.gp-pkg-label{font-family:'DM Sans',sans-serif;font-size:7px;font-weight:700;letter-spacing:.28em;text-transform:uppercase;color:rgba(255,255,255,.45);margin-bottom:4px;text-align:center}
.gp-pkg-name{font-family:'Playfair Display',Georgia,serif;font-size:12px;font-style:italic;color:rgba(255,255,255,.92);line-height:1.3;text-align:center;max-width:160px}

/* FRONT — right body */
.right{flex:1;display:flex;flex-direction:column;overflow:hidden}
.right-body{flex:1;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;padding:38px 42px 22px}
.right-footer{padding:10px 42px;border-top:1px solid #EDE8E0;display:flex;align-items:center;gap:5px;flex-shrink:0}
.footer-dot{width:3px;height:3px;border-radius:50%;background:#C8B8A8}
.footer-txt{font-size:7px;letter-spacing:.18em;text-transform:uppercase;color:#B8AC9C;font-family:'DM Sans',sans-serif}
.welcome-eye{font-size:7.5px;font-weight:700;letter-spacing:.26em;text-transform:uppercase;color:#B8AC9C;margin-bottom:12px;font-family:'DM Sans',sans-serif}
.welcome-h{font-family:'Playfair Display',Georgia,serif;font-weight:700;font-size:38px;line-height:1.0;letter-spacing:-.03em;margin-bottom:12px;-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.welcome-tag{font-family:'Playfair Display',Georgia,serif;font-size:12px;font-style:italic;color:#4A3C34;line-height:1.65;max-width:310px;margin-bottom:16px}
.get-started{background:#FAF6F0;border-radius:8px;padding:12px 15px;border-left:3px solid}
.gs-eye{font-size:7.5px;font-weight:700;letter-spacing:.22em;text-transform:uppercase;margin-bottom:5px;font-family:'DM Sans',sans-serif}
.gs-body{font-size:9px;color:#4A3C34;font-family:'DM Sans',sans-serif;line-height:1.55}

/* BACK */
.back-accent{height:3px;flex-shrink:0}
.back-inner{flex:1;display:flex;overflow:hidden}
.back-left{flex:1;padding:20px 24px 16px;display:flex;flex-direction:column;border-right:1px solid #F0EBE4}
.back-right{width:180px;flex-shrink:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:18px 16px}
.back-footer{padding:8px 24px;border-top:1px solid #EDE8E0;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;background:#FAF6F0}
.back-steps-head{font-size:7.5px;font-weight:700;letter-spacing:.26em;text-transform:uppercase;color:#B8AC9C;margin-bottom:12px;font-family:'DM Sans',sans-serif;display:flex;align-items:center;gap:8px}
.back-steps-head::after{content:"";flex:1;height:1px;background:#E8E0D4;margin-top:1px}
.step{display:flex;gap:11px;align-items:flex-start;padding-bottom:10px;border-bottom:1px solid #F2EFEB}
.step:last-child{border-bottom:none;padding-bottom:0}
.step-num{font-family:'Playfair Display',Georgia,serif;font-size:15px;font-weight:700;flex-shrink:0;line-height:1.1;width:13px}
.step-t{font-size:9.5px;font-weight:700;color:#0E0B07;margin-bottom:2px;font-family:'DM Sans',sans-serif}
.step-d{font-size:7.5px;color:#8C7A68;line-height:1.5;font-family:'DM Sans',sans-serif}

/* Force ALL gradient/colored backgrounds to render when printing.
   Without this, most browsers strip background colors/images on print
   and the colored panels disappear entirely. */
.grad-panel,.back-accent,.welcome-h,.back-footer,.get-started{
  -webkit-print-color-adjust:exact !important;
  print-color-adjust:exact !important;
  color-adjust:exact !important;
}

@media print{
  @page{size:8.5in 5.5in landscape;margin:.4in .5in}
  html,body{background:white;padding:0;gap:0;display:block;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  *{-webkit-print-color-adjust:exact !important;print-color-adjust:exact !important;color-adjust:exact !important}
  .page{page-break-after:always;page-break-inside:avoid;display:flex;flex-direction:column;align-items:center;justify-content:center;height:4.7in;gap:4px}
  .page:last-child{page-break-after:auto}
  .page-label{display:none}
  .card{box-shadow:none!important;border:0.5px solid #DDD8D0!important}
}
`;

// ── Templates ────────────────────────────────────────────────────────────────

function frontCard(pkg) {
  return `<div class="page front-page">
  <div class="card front">
    <div class="grad-panel">
      ${gradPanelSvg('gp_' + pkg.id, pkg.panelStops)}
      ${markOnDark(44, 32)}
      <div class="gp-lockup">
        <div class="gp-wordmark">Attune</div>
        <div class="gp-kicker">Relationships</div>
      </div>
      <div class="gp-divider"></div>
      <div>
        <div class="gp-pkg-label">Package</div>
        <div class="gp-pkg-name">${pkg.name}</div>
      </div>
    </div>
    <div class="right">
      <div class="right-body">
        <div class="welcome-eye">Welcome to</div>
        <div class="welcome-h" style="background:${pkg.headlineGradient}">Attune<br>Relationships</div>
        <div class="welcome-tag">Understanding takes intention. You've taken the first step.</div>
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
    ${gradStripSvg('gs_' + pkg.id, pkg.stripStops)}
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
        <div style="font-size:7.5px;font-weight:700;letter-spacing:.26em;text-transform:uppercase;color:#B8AC9C;text-align:center;font-family:'DM Sans',sans-serif;margin-bottom:10px">Scan to start</div>
        <img src="${qrDataUri}" width="108" height="108" style="border-radius:6px;border:1px solid #EDE8E0;display:block"/>
        <div style="text-align:center;margin-top:10px">
          <div style="font-size:8px;font-weight:700;color:#0E0B07;font-family:'DM Sans',sans-serif;margin-bottom:3px">attune-relationships.com</div>
          <div style="font-family:'Playfair Display',Georgia,serif;font-size:8px;font-style:italic;color:#8C7A68">Understanding takes intention.</div>
        </div>
      </div>
    </div>
    <div class="back-footer">
      <div style="font-family:'DM Sans',sans-serif;font-size:7px;letter-spacing:.22em;text-transform:uppercase;color:#B8AC9C;font-weight:700">Attune Relationships</div>
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

fs.writeFileSync(PUBLIC_HTML, html);
console.log(`Wrote ${PUBLIC_HTML} (${html.length} bytes, ${PACKAGES.length * 2} pages)`);
