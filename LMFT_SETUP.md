# LMFT Scheduling Setup Checklist

The LMFT booking flow uses Calendly for self-scheduling. Calendly handles the
schedule UI, time-zone math, the LMFT's calendar invite + video link, and
reminder emails. We layer our brand on top with a custom confirmation email
and store the booking in our database so it shows up in the admin dashboard.

This doc lists every action item required to turn the system on.

---

## 1. Calendly account setup

1. **Create the Calendly account** at calendly.com. Use the Attune email
   (hello@attune-relationships.com or similar — not Ellie's personal email).
2. **Connect the LMFT's calendar** (Google or Outlook) so Calendly sees their
   real availability and adds bookings to their actual calendar.
   - In Calendly: Account → Calendar Connection → connect.
   - The LMFT will need to grant calendar access — they can do this themselves
     after we send them an invite.
3. **Connect a video provider** (Zoom or Google Meet).
   - Account → Integrations → connect Zoom / Meet.
   - This auto-generates a unique video link per booking.

## 2. Create the event type

In Calendly, create a new event type:

- **Name:** `Attune LMFT Session`
- **Slug:** `lmft-session` (full URL becomes `calendly.com/USERNAME/lmft-session`)
- **Duration:** 50 minutes
- **Location:** Zoom / Google Meet (whichever you connected above)
- **Buffer time:** 15 min before, 15 min after (optional but recommended)
- **Date range:** Rolling 60 days into the future
- **Minimum scheduling notice:** 24 hours

### Custom question (REQUIRED)

Calendly's default booking form asks for name + email. Add **one** custom
question so we know who the partner is:

- **Question 1 (required):** "Partner's name"
- **Type:** One-line text
- **Required:** Yes

This question shows up as `a1=` in the embed URL — our `/lmft-booking` page
sets it programmatically when the user comes from the portal, so they don't
have to retype it. The webhook reads it back as `payload.questions_and_answers[0].answer`.

> If you add MORE custom questions later, the partner name moves out of `a1`
> and into a different slot. Update `public/lmft-booking.html` and
> `api/calendly-webhook.js` accordingly.

### Email notification settings (CRITICAL)

This is the most important configuration step. Calendly sends emails by default.
We want only the LMFT to get Calendly's email — the user gets our branded one.

In Event Type → Notifications and reminders:

- **"Calendar invitation" to invitee:** ON  ← they need this for the .ics file
- **"Confirmation email" to invitee:** **OFF**  ← we send our own (lmft_confirmed)
- **Reminder emails:** ON (24 hours before, 1 hour before)
- **"New event" notification to host (LMFT):** ON  ← THIS IS THE LMFT NOTIFICATION
- **"Cancellation" to invitee:** ON
- **"Cancellation" to host:** ON

> Note: the calendar invite (.ics) carries the video link and time. That's how
> the user gets the join link. Our branded email duplicates this info but adds
> the prep guidance and portal link.

## 3. Set up the webhook

In Calendly: Integrations → Webhooks → Create webhook subscription.

- **URL:** `https://attune-relationships.com/api/calendly-webhook`
- **Events:**
  - `invitee.created` ← fires when someone books
  - `invitee.canceled` ← fires when someone cancels
- **Scope:** User (so it covers all of your Calendly events)
- **Signing key:** Calendly will display a signing key. **Copy it.**

Add the signing key to Vercel env vars (next step).

## 4. Vercel environment variables

Add these to the Vercel project → Settings → Environment Variables:

```
CALENDLY_WEBHOOK_SECRET = <signing key from step 3>
PUBLIC_BASE_URL = https://attune-relationships.com
```

These should already exist (used elsewhere in the app):
```
SUPABASE_URL
SUPABASE_SERVICE_KEY
SUPABASE_ANON_KEY
RESEND_API_KEY
FROM_EMAIL
```

After adding env vars, **redeploy** so the webhook picks up the new secret.

## 5. Update the embed URL

In `public/lmft-booking.html`, find this line near the bottom and update it
with your real Calendly event-type URL:

```js
const CALENDLY_URL = 'https://calendly.com/attune-relationships/lmft-session';
```

Replace with whatever the real URL is from Calendly → Event Types → Share.

## 6. Run the database migration

In Supabase SQL Editor, paste the contents of:
`supabase/migrations/009_calendly_lmft_scheduling.sql`

Run it. This adds the new columns (event_uri, scheduled_start, video_url, etc.)
to the existing `lmft_requests` table.

## 7. Test end-to-end

1. Go to `https://attune-relationships.com/lmft-booking?order=TEST-001&p1=Test&p2=Person&email=your@email.com`
2. Pick a time. Book it with a real email you can check.
3. Verify: Calendly sends the invite + reminder. We send the confirmation.
4. Open admin → LMFT Requests. The booking should show up with scheduled time,
   therapist name, and video link.
5. Cancel the booking from Calendly's email. Refresh admin — status should
   change to Cancelled.

---

## How the pieces fit together

```
     User clicks "Book LMFT" in their portal or order email
                          ↓
            /lmft-booking?order=AT-XXXX&p1=...&p2=...
                          ↓
              Calendly inline widget (this page)
                          ↓
                  User picks a time, books
                          ↓
        Calendly sends the LMFT a "new event" email + cal invite
        Calendly sends the user a calendar invite (.ics with video link)
        Calendly sends a webhook to /api/calendly-webhook
                          ↓
        Webhook writes to lmft_requests + sends our branded confirmation email
                          ↓
                  Admin sees it in /admin → LMFT Requests
```

## Why two emails to the user?

The user gets:
1. **Calendar invite** (from Calendly, has video link, .ics file) — "your meeting"
2. **Branded confirmation** (from us via Resend) — "you booked, here's the prep"

These do different jobs. The cal invite goes on their calendar with the join
link. Ours has prep guidance, the link back to their Attune portal, and our
brand voice. Turning off Calendly's separate "confirmation email" (different
from the cal invite) keeps it from feeling like spam.

## What if Calendly is down?

The /lmft-booking page degrades to the fallback box at the bottom: "Don't see
a time? Email hello@". Old form-based requests still work via the existing
`/api/lmft-request` endpoint (kept around for backward compat) and show up in
the admin LMFT page as legacy rows.
