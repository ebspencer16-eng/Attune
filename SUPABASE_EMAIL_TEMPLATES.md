# Supabase Confirm-Signup Email Template

This is the HTML body for Supabase's "Confirm signup" email template. Paste it into your Supabase dashboard:

**Authentication → Email Templates → Confirm signup → "Source" tab**

The template uses Supabase's merge tags (`{{ .ConfirmationURL }}`, `{{ .Email }}`) which Supabase replaces server-side when sending.

## Subject line

```
Confirm your Attune account
```

## Sender name

In **Authentication → Email Templates → SMTP Settings** (or Auth Settings, depends on dashboard version):

- **Sender name:** `Attune`
- **Sender email:** `hello@attune-relationships.com` (or whichever verified address you're using with Supabase's SMTP)

## HTML body

Paste this into the Source/HTML editor for the Confirm signup template:

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  body { margin:0; padding:0; background:#F3EDE6; font-family:'Helvetica Neue',Arial,sans-serif; }
  .wrap { max-width:560px; margin:0 auto; padding:32px 16px; }
  .card { background:#FFFDF9; border-radius:20px; padding:40px 36px; box-shadow:0 4px 24px rgba(14,11,7,0.08); }
  .logo { display:flex; align-items:center; gap:8px; margin-bottom:32px; }
  .logo-text { font-size:1.1rem; font-weight:700; color:#0E0B07; letter-spacing:-0.01em; }
  .grad-bar { height:3px; background:linear-gradient(90deg,#E8673A,#1B5FE8); border-radius:2px; margin-bottom:28px; }
  h1 { font-size:1.5rem; font-weight:700; color:#0E0B07; margin:0 0 12px; line-height:1.2; }
  p { font-size:0.9rem; color:#5C4D3C; line-height:1.75; margin:0 0 16px; }
  .btn { display:inline-block; padding:14px 28px; background:linear-gradient(135deg,#E8673A,#1B5FE8); color:#FFFFFF !important; text-decoration:none; border-radius:12px; font-weight:700; font-size:0.88rem; letter-spacing:0.03em; }
  .btn-wrap { text-align:center; margin:28px 0; }
  .divider { height:1px; background:#E8DDD0; margin:24px 0; }
  .small { font-size:0.78rem; color:#8C7A68; line-height:1.7; }
  .url-fallback { font-size:0.72rem; color:#8C7A68; word-break:break-all; line-height:1.5; }
  .footer { text-align:center; font-size:0.7rem; color:#C17F47; margin-top:24px; line-height:1.8; }
  .footer a { color:#C17F47; }
</style>
</head>
<body>
<div class="wrap">
  <div class="card">
    <div class="logo">
      <svg width="28" height="20" viewBox="0 0 103 76" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs><linearGradient id="eg" x1="0" y1="0" x2="103" y2="76" gradientUnits="userSpaceOnUse"><stop offset="0%" stop-color="#E8673A"/><stop offset="100%" stop-color="#1B5FE8"/></linearGradient></defs>
        <path d="M14,4 L44,4 A9,9 0 0,1 53,13 L53,42 A9,9 0 0,1 44,51 L20,51 L6,61 L11,51 A6,6 0 0,1 5,45 L5,13 A9,9 0 0,1 14,4 Z" fill="url(#eg)"/>
        <path d="M22 11 C20 8.5 16.5 5 11.5 5 C5.5 5 2 9.5 2 14.5 C2 23 11 30 22 40 C33 30 42 23 42 14.5 C42 9.5 38.5 5 32.5 5 C27.5 5 24 8.5 22 11 Z" fill="white" opacity="0.93" transform="translate(13.16,11.3) scale(0.72)"/>
        <path d="M89,14 L59,14 A9,9 0 0,0 50,23 L50,52 A9,9 0 0,0 59,61 L83,61 L97,71 L92,61 A6,6 0 0,0 98,55 L98,23 A9,9 0 0,0 89,14 Z" fill="none" stroke="url(#eg)" stroke-width="2.2" stroke-linejoin="round"/>
        <path d="M22 11 C20 8.5 16.5 5 11.5 5 C5.5 5 2 9.5 2 14.5 C2 23 11 30 22 40 C33 30 42 23 42 14.5 C42 9.5 38.5 5 32.5 5 C27.5 5 24 8.5 22 11 Z" fill="url(#eg)" transform="translate(58.16,21.3) scale(0.72)"/>
      </svg>
      <span class="logo-text">Attune</span>
    </div>
    <div class="grad-bar"></div>

    <h1>One click and you're in.</h1>
    <p>Confirm your email to finish setting up your Attune account. Click the button below.</p>

    <div class="btn-wrap">
      <a href="{{ .ConfirmationURL }}" class="btn">Confirm my email →</a>
    </div>

    <p class="small">If the button doesn't work, paste this link into your browser:</p>
    <p class="url-fallback">{{ .ConfirmationURL }}</p>

    <div class="divider"></div>

    <p class="small">If you didn't create an Attune account, you can ignore this email. Your address won't be added.</p>
  </div>

  <div class="footer">
    Attune · <a href="https://attune-relationships.com">attune-relationships.com</a><br/>
    Questions? Reply to this email or write to hello@attune-relationships.com
  </div>
</div>
</body>
</html>
```

## Why this works

- **Voice-aligned:** "One click and you're in." is short and declarative. No em dashes, no hedging, no AI tells.
- **Visual continuity:** Uses the same warm cream card on `#F3EDE6` background as every other Attune email. Same gradient brand bar. Same Playfair-style logo SVG. Looks like one product.
- **Scam-resistant:** Includes a fallback link so users can verify the URL before clicking. Footer has a real "from" identity (your domain). No "Click here" without context.
- **Single CTA:** One button, one job. The earlier default Supabase template had multiple links and a generic robot-voice subject line. This is one decision: confirm or don't.

## Steps to install

1. **Supabase dashboard → Authentication → Email Templates → Confirm signup**
2. Paste the HTML above into the **Source** (or HTML, depending on UI) editor
3. Update the **Subject** field to: `Confirm your Attune account`
4. **Authentication → Email Templates** → check the **SMTP Settings** section (or Auth Settings → SMTP)
5. Set **Sender name** to `Attune`
6. Confirm the **Sender email** is your verified domain (e.g. `hello@attune-relationships.com`). Without a verified custom domain, Supabase sends from `noreply@mail.app.supabase.io` which looks like spam.
7. Click **Save** at the bottom

## Verify it works

After saving, do a real test:

1. In incognito, go through your signup flow with a fresh email
2. Check your inbox — you should see:
   - **From:** `Attune <hello@attune-relationships.com>` (not "Supabase Auth")
   - **Subject:** "Confirm your Attune account"
   - Body matches the layout in the screenshot/preview, looks consistent with your other emails

If sender shows as `noreply@mail.app.supabase.io`, you haven't connected your custom SMTP. Supabase has free SMTP via Resend that you can set up in a few minutes — let me know if you want walkthrough.

## Other templates worth updating in Supabase

While you're in the Email Templates section, the other defaults are also bland and worth replacing. Same template structure, different headline + body. I can write these next session if needed:

- **Magic Link** (if you ever enable passwordless login)
- **Change Email Address** confirmation
- **Reset Password** — actually used by your password-reset flow! Worth updating.
- **Invite User** (not used in your flow)
- **Reauthentication** (not used)

Tell me which to do first.
