/**
 * The Attune email layout, and the escaper that goes with it.
 *
 * ── WHY IT MOVED ──────────────────────────────────────────────────────────
 * It lived inside api/send-order-email.js, which meant every other sender
 * either looked nothing like an Attune email or would have needed its own
 * copy of two hundred lines of table markup. Deletion has two emails to send
 * and neither belongs in the order mailer.
 *
 * Moved verbatim. The design is unchanged.
 *
 * The image at the top is loaded from the live site, which is why
 * check-email-links.mjs insists on the www: a mail client's image proxy is
 * not a browser and may not follow the apex's redirect.
 */

import { unsubscribeUrl } from './email-footer.js';
import { SITE_URL } from './site.js';

/** Escape HTML: names and notes are buyer-controlled and flow into these templates. */
export const _esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

export function brandedEmail({ preheader = '', title, subtitle, bodyHtml, ctaLabel, ctaUrl, ctaColor = '#E8673A', footerNote = 'Questions? Reply to this email or reach us at hello@attune-relationships.com', userId = null }) {
  const cta = ctaLabel && ctaUrl
    ? `<tr><td style="padding:0 40px 28px;text-align:center">
         <a href="${ctaUrl}" style="display:inline-block;background:linear-gradient(135deg,${ctaColor},#d45a2e);color:#ffffff;padding:14px 34px;border-radius:12px;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:.04em;font-family:'DM Sans',Arial,sans-serif">${_esc(ctaLabel)}</a>
       </td></tr>`
    : '';

  // One implementation, in api/_lib/email-footer.js. It was here alone, and
  // the two crons that email customers on a schedule had no unsubscribe at all.
  const unsubUrl = unsubscribeUrl(userId);

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<!--[if mso]><style>body,table,td,a,p,h1,h2,h3{font-family:Arial,sans-serif!important}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background:#FBF8F3;font-family:'DM Sans',Helvetica,Arial,sans-serif;color:#1E1610;-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all">${preheader}</div>
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#FBF8F3">
<tr><td align="center" style="padding:32px 16px">
<table role="presentation" cellpadding="0" cellspacing="0" width="560" style="max-width:560px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 18px rgba(14,11,7,.08)">

  <!-- Navy header with mark + tagline -->
  <tr><td style="background:#162040;padding:28px 40px 26px" align="left">
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr>
      <td width="50" valign="middle" style="vertical-align:middle;padding-right:16px">
        <img src="${SITE_URL}/attune-mark-navy.png" width="44" height="32" alt="Attune" style="display:block;border:0;outline:none">
      </td>
      <td valign="middle" style="vertical-align:middle;border-left:1px solid rgba(255,255,255,.3);padding-left:16px">
        <div style="font-family:Georgia,'Playfair Display',serif;font-style:italic;font-size:18px;font-weight:400;color:#ffffff;line-height:1.2">Understanding takes intention.</div>
        <div style="font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:10px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:rgba(255,255,255,.55);margin-top:4px">Attune Relationships</div>
      </td>
    </tr></table>
  </td></tr>

  <!-- Gradient rule under header -->
  <tr><td style="height:4px;background:linear-gradient(90deg,#E8673A 0%,#9B5DE5 50%,#1B5FE8 100%);font-size:0;line-height:0">&nbsp;</td></tr>

  <!-- Title -->
  <tr><td style="padding:32px 40px 8px">
    <h1 style="font-family:Georgia,'Playfair Display',serif;font-size:24px;font-weight:700;color:#1E1610;margin:0;line-height:1.2;letter-spacing:-.02em">${title}</h1>
    ${subtitle ? `<p style="font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:14px;color:#8C7A68;line-height:1.65;margin:10px 0 0;font-weight:400">${subtitle}</p>` : ''}
  </td></tr>

  <!-- Body content -->
  <tr><td style="padding:20px 40px 12px;font-family:'DM Sans',Helvetica,Arial,sans-serif">
    ${bodyHtml}
  </td></tr>

  ${cta}

  <!-- Footer note -->
  <tr><td style="padding:18px 40px 24px;border-top:1px solid #F3EDE6">
    <p style="font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:12px;color:#8C7A68;margin:0;line-height:1.6;text-align:center">${footerNote}</p>
    <p style="font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:11px;color:#B8A898;margin:10px 0 0;text-align:center"><a href="${unsubUrl}" style="color:#B8A898;text-decoration:underline">Manage email preferences</a></p>
  </td></tr>

</table>
<p style="font-family:'DM Sans',Helvetica,Arial,sans-serif;font-size:11px;color:#B8A898;margin:16px 0 0;text-align:center">© 2026 Attune Relationships · attune-relationships.com</p>
</td></tr>
</table>
</body>
</html>`;
}
