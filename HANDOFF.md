# Attune — Session Handoff

> This file is updated at the end of every build session. Read this first.

---

## Stack
- **Frontend:** React/Vite → `/src/App.jsx` (8900+ lines, single file)
- **Public pages:** `/public/*.html` (static HTML, no framework)
- **API:** Vercel serverless functions → `/api/*.js` (Edge runtime unless noted)
- **DB:** Supabase (Postgres) — project `xixzdigqhmzuxymzezve.supabase.co`
- **Payments:** Stripe
- **Email:** Resend → `FROM_EMAIL=hello@attune-relationships.com`
- **Deploy:** Git push to `ebspencer16-eng/Attune` → Vercel auto-deploys
- **Live:** `attune-relationships.com` + `attune-six.vercel.app`

---

## Session Setup (do this first, every session)
The container is always fresh. Run this before anything else:

```bash
mkdir -p /home/claude/unison && cd /home/claude/unison
GH_TOKEN="[TOKEN]"
git clone "https://${GH_TOKEN}@github.com/ebspencer16-eng/Attune.git" . 2>/dev/null || (git remote set-url origin "https://${GH_TOKEN}@github.com/ebspencer16-eng/Attune.git" && git pull)
npm install --silent 2>/dev/null
```

The GitHub token is provided in the session prompt. Do not embed it in any committed file — GitHub secret scanning will block the push.

## Deployment (end of session)
```bash
cd /home/claude/unison
git add -A && git commit -m "description" && git push
```
Vercel auto-deploys on push. Takes ~30 seconds.

---

## Supabase Tables
| Table | Purpose |
|---|---|
| `profiles` | One row per user — names, pronouns, invite_code, pkg, email_opt_in, checkin_sent_at |
| `partner_sessions` | Partner B's exercise answers, keyed by invite_code |
| `orders` | Stripe orders — pkg, physical/digital, addons, shipping |
| `exercise_sessions` | (legacy, unused by current code) |
| `feedback` | Beta survey submissions |
| `workbooks` | (legacy, unused by current code) |
| `partner_sync` | (legacy, unused — `partner_sessions` is the live table) |

**Key:** Code uses `profiles` (not `user_profiles`). Partner B data writes to `partner_sessions`.

---

## Package Config
| Key | Name | Price | Features |
|---|---|---|---|
| `core` | The Attune Assessment | — | Ex1 + Ex2 only |
| `newlywed` | Starting Out Collection | $154 physical / $109 digital | + Checklist |
| `anniversary` | Anniversary Collection | $174 physical / $129 digital | + Reflection (Ex3) |
| `premium` | Attune Premium | $350 | + Budget tool + LMFT |

**LMFT add-on:** $150, available on any package. Stored as `addonLmft` in localStorage order and `addon_lmft` in Supabase orders.

---

## Key Flows

### Purchase → Account → Exercises → Results
1. `offerings.html` (cart) → `checkout.html` (Stripe)
2. On payment success: saves order to localStorage, redirects to `/app?signup=1&pkg=...&p1=...&p2=...`
3. App auto-opens auth modal (signup mode), pre-fills names from URL
4. Signup creates Supabase auth user + `profiles` row + fires partner invite email
5. Partner A does Ex1 + Ex2 → results unlock with demo partner data until Partner B submits
6. Partner B receives invite email → `/app?invite=CODE&from=NAME&pae=PARTNER_A_EMAIL`
7. Partner B creates account → independence warning → Ex1 + Ex2 → syncs to `partner_sessions`
8. Partner A's app polls `/api/partner-sync` every 15s → real results unlock

### Email triggers
| Event | Type | Where it fires |
|---|---|---|
| Purchase | Order confirmation | `stripe-webhook.js` |
| Purchase | Get-started + partner invite | `checkout.html` → `send-order-email.js` |
| Signup with partner email | Partner invite | `App.jsx` handleSignup |
| Profile save with new partner email | Partner invite | `App.jsx` profile save handler |
| Workbook generated | Workbook ready | `App.jsx` after generate-workbook call |
| Results page opt-in | Beta survey | `App.jsx` stay-in-touch form |
| 6 months post-signup | Check-in | Vercel cron daily 09:00 UTC → `api/cron-checkin.js` |

### Partner session lock
`partner_sessions` is write-once. Second POST to same `invite_code` returns 409. No re-submission possible.

---

## Account Integrity Protections
1. **Email uniqueness:** `pae=` (Partner A email) in invite URL → Partner B signup rejects matching email
2. **Session lock:** `partner_sessions.completed_at` set on first write → 409 on re-submit
3. **Independence warning:** Partner B intro screen warns explicitly against Partner A using the link
4. **Retake removed:** Both ex1 + ex2 retake buttons deleted. Results are final.
5. **Email confirmation:** Enabled in Supabase Auth — accounts require verified email

---

## Vercel Env Vars (all set)
`STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`
`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`
`RESEND_API_KEY`, `FROM_EMAIL`, `SUPPORT_EMAIL`
`KV_REST_API_URL`, `KV_REST_API_TOKEN`
`CRON_SECRET`

---

## Known Limitations / Next Up
- **Couple portrait:** UI exists (initials + color circles). Planned: integrate external silhouette rendering platform (Ellie to provide API). Session: TBD
- **Print workbook POD:** Digital workbook auto-generates. Print orders flag in admin but no POD API (Lulu/Mixam). Out of scope for now.
- **Partner B workbook scores:** Workbook generates from Partner A's localStorage data. Partner B's real Supabase scores not yet wired into workbook generation.
- **Google Drive:** Share Attune Gmail Drive with personal Gmail to enable Drive access in sessions.

---

## Code Conventions
- **Table names:** `profiles`, `partner_sessions`, `orders` — never `user_profiles`
- **Package key:** `pkg` column in Supabase (not `pkg_key` in profiles; `pkg_key` in orders is correct)
- **Editing App.jsx:** Use Python `str.replace()` on full file content — not sed (breaks on JSX)
- **Build:** `cd /home/claude/unison && npx vite build`
- **Push:** `git add -A && git commit -m "..." && git push`
- **Admin credentials:** Runtime fetch from `/api/admin-config` (not build-time injection)

---

## Tone / Style (Ellie's voice)
Short declarative sentences. No em dashes. No hedging language. No AI-sounding constructions. Catches off-tone copy immediately.

---

*Last updated: Session 15 — April 2026*
