# App Store Connect: App Privacy answers

What to enter in App Store Connect under **App Privacy**, for
`com.attunerelationships.app`.

This was written by reading the app's code, not by guessing from the website.
The website and the app collect different things, and answering for the website
would overstate what the binary does. Where a line says "not collected", the
audit note under it says how that was checked.

**Rule for every answer here:** the question is what the *app* sends off the
device. The exercises are answered on the website, not in the app, so exercise
answers are not collected by this binary even though Attune holds them.

---

## Step 1: "Do you or your third-party partners collect data from this app?"

**Yes.**

---

## Step 2: Data types to tick

Tick exactly these three. Everything else is left unticked.

### 1. Contact Info → Email Address

- **Collected:** Yes
- **Linked to the user:** Yes
- **Used for tracking:** No
- **Purposes:** App Functionality

*Why:* sign-in sends an email address and password to Supabase.
`attune-app/src/api/auth.ts`, `signIn()`.

### 2. Identifiers → User ID

- **Collected:** Yes
- **Linked to the user:** Yes
- **Used for tracking:** No
- **Purposes:** App Functionality

*Why:* every API call carries a bearer token containing the Supabase user id.
`attune-app/src/api/client.ts`, `request()`.

### 3. User Content → Other User Content

- **Collected:** Yes
- **Linked to the user:** Yes
- **Used for tracking:** No
- **Purposes:** App Functionality

*Why:* notes a person writes are sent to the server, with an optional title and
body, and a per-note choice to share with their partner.
`attune-app/src/api/client.ts`, `createNote()` and `updateNote()`.

---

## Step 3: What to leave unticked, and why

Do not tick these. Each line says how the audit confirmed it.

| Data type | Why not |
|---|---|
| Health and Fitness | No health data is collected or sent. |
| Financial Info | Card details never touch the app. There is no purchase flow in the app at all: Get Started opens the website in Safari. |
| Location | No location permission is requested and no location API is used. |
| Sensitive Info | The app does not send exercise answers. It reads results the server has already computed. |
| Contacts | No contacts permission and no contacts API. |
| Browsing History | Not collected. |
| Search History | There is no search in the app. |
| Identifiers → Device ID | No IDFA, no IDFV sent, no advertising SDK. |
| Usage Data | No analytics SDK. `grep -riE "sentry\|analytics\|amplitude\|firebase\|posthog" attune-app/src` returns nothing. |
| Diagnostics | No crash reporting SDK in the app. Sentry exists on the server only, in `api/_lib/sentry-edge.js`. |
| Purchases | The app never sees a purchase. |
| Photos, Audio, Video, Gameplay, Customer Support, Other Data | None. |

**Marking a "read" is not collection.** `markPostRead` and
`markNotificationRead` send an id to record that something was opened. That is
app state on the server, not usage analytics, and Apple's Usage Data category is
about product interaction analytics. If a reviewer questions it, the honest
description is App Functionality.

---

## Step 4: Tracking

**"Do you use data for tracking purposes?" → No.**

No advertising SDK, no IDFA, no App Tracking Transparency prompt, and no data
shared with a data broker. Nothing is combined with data from other companies'
apps or websites.

This matches `NSPrivacyTracking: false` and the empty `NSPrivacyTrackingDomains`
in the privacy manifest, in `attune-app/app.json` under `ios.privacyManifests`.
**These two have to agree.** If tracking is ever added, change both.

---

## Step 5: Privacy policy URL

```
https://www.attune-relationships.com/legal
```

That page carries the Privacy Policy, Terms, Cookies, Refunds, Data Retention
and EULA. **It is not ready to publish yet**: the liability section of the Terms
is a marked placeholder awaiting a lawyer, and the AES-256 claim needs the
confirmation described in `ENCRYPTION_SETUP.md`. Both should be settled before
this URL is submitted.

---

## Step 6: Account deletion (Guideline 5.1.1(v))

App Review checks that an account can be deleted from inside the app, and that
the path is not just a link to an email address.

**Where it is:** Home, top right, the **Settings** button. Settings has a Delete
account section that says what is removed, then asks the person to type DELETE
before the button does anything. It calls `POST /api/delete-account`.

Put this in **App Review Information → Notes**:

> Account deletion is in the app. Sign in, then on the Home tab tap Settings in
> the top right. The Delete account section is at the bottom. It asks you to
> type DELETE to confirm, then permanently deletes the account.

---

## Step 7: Reviewer sign-in

App Review cannot get past the sign-in screen without an account, and they will
not create one or pair a partner. Run
`supabase/migrations/054_reviewer_account.sql` and enter the credentials it sets
up under **App Review Information → Sign-In Required**.

That account is a couple who have both finished, so the reviewer sees real
results rather than an empty state.

---

## Keeping this true

If any of the following changes, this document and
`app.json → ios.privacyManifests` both need updating in the same commit:

- The app starts sending exercise answers rather than only reading results.
- Any analytics, attribution, or crash reporting SDK is added.
- The app gains a purchase flow.
- A new endpoint is called that sends something not listed above.

The place to check is `attune-app/src/api/client.ts`. Every request the app
makes goes through that one file, by design, which is what makes an audit like
this possible.
