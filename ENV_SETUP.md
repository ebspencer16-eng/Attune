# Attune — Environment Variables Setup Guide

Set all of these in **Vercel Dashboard → Project → Settings → Environment Variables**.
Set them for Production, Preview, and Development environments.

---

## 1. Stripe

| Variable | Where to find it | Example |
|---|---|---|
| `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API keys | `sk_live_...` or `sk_test_...` |
| `STRIPE_PUBLISHABLE_KEY` | Stripe Dashboard → Developers → API keys | `pk_live_...` or `pk_test_...` |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → Developers → Webhooks → (your endpoint) → Signing secret | `whsec_...` |

**Stripe webhook setup:**
1. Go to Stripe Dashboard → Developers → Webhooks → Add endpoint
2. URL: `https://attune-relationships.com/api/stripe-webhook`
3. Events to listen for: `payment_intent.succeeded`, `payment_intent.payment_failed`
4. Copy the signing secret → paste as `STRIPE_WEBHOOK_SECRET`

---

## 2. Supabase

| Variable | Where to find it |
|---|---|
| `VITE_SUPABASE_URL` | Supabase Dashboard → Project Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase Dashboard → Project Settings → API → anon key |
| `SUPABASE_URL` | Same as VITE_SUPABASE_URL |
| `SUPABASE_SERVICE_KEY` | Supabase Dashboard → Project Settings → API → service_role key (**keep private**) |

**Supabase setup steps:**
1. Create project at supabase.com
2. Go to SQL Editor → New query
3. Paste and run the contents of `supabase-migration.sql` (in this repo root)
4. Go to Authentication → URL Configuration → set Site URL to `https://attune-relationships.com`
5. Set Redirect URLs: `https://attune-relationships.com/**`

---

## 3. Email (Resend)

| Variable | Where to find it |
|---|---|
| `RESEND_API_KEY` | resend.com → API Keys → Create API Key |
| `FROM_EMAIL` | The verified sender address, e.g. `hello@attune-relationships.com` |
| `SUPPORT_EMAIL` | Where admin feedback notifications go, e.g. `hello@attune-relationships.com` |

**Resend setup steps:**
1. Create account at resend.com
2. Add domain → add DNS records from Resend to your domain registrar
3. Wait for verification (usually <5 min)
4. Create API key with Send access
5. Set `FROM_EMAIL` to a verified address on your domain

---

## 4. Anthropic (workbook generation)

| Variable | Where to find it |
|---|---|
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys |

---

## All together (copy-paste list for Vercel)

```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
RESEND_API_KEY=re_...
FROM_EMAIL=hello@attune-relationships.com
SUPPORT_EMAIL=hello@attune-relationships.com
ANTHROPIC_API_KEY=sk-ant-...
```
