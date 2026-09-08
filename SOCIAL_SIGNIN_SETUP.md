# Turning on Google and Apple sign-in

The code is written and deployed. None of it works until the four steps below
are done, because Attune does not talk to Google or Apple directly. Supabase
does, and Supabase needs to be told the credentials.

Nothing here can be done from the repo. All four are console work, and all four
are yours to do because they involve accounts only you can sign in to.

Until then, the buttons appear and return an error. If you would rather they
not appear at all in the meantime, say so and I will hide them behind a flag.

---

## 1. Run the two migrations

Supabase dashboard → SQL Editor → New query. Paste one file, run it, then the
other.

- `supabase/migrations/055_social_signin.sql`
- `supabase/migrations/056_beta_survey_at.sql`

Each one ends with a SELECT that shows you what it created, so you can see it
worked rather than trust that it did.

055 adds three columns: where an account's purchase email is recorded, which
provider it signs in with, and which order it claimed. 056 fixes an unrelated
column that has been written by the survey endpoint since it was built and
never existed, so finishing the survey on a phone never registered on a laptop.

---

## 2. Google

**Google Cloud Console** → console.cloud.google.com

1. Create a project, or pick the existing one.
2. APIs & Services → OAuth consent screen. External. Fill in the app name
   (Attune), your support email, and the logo. Add `attune-relationships.com`
   under authorised domains.
3. Credentials → Create credentials → OAuth client ID → **Web application**.
4. Under **Authorised redirect URIs**, add exactly one line:

   ```
   https://<your-project-ref>.supabase.co/auth/v1/callback
   ```

   Your project ref is in the Supabase dashboard URL. It is not
   attune-relationships.com. Google sends people back to Supabase, and Supabase
   sends them back to us.

5. Copy the **Client ID** and **Client secret**.

**Supabase dashboard** → Authentication → Providers → Google → enable, paste
both values, save.

---

## 3. Apple

This one costs money and takes longer. It needs the Apple Developer Program
membership you already have for the app.

**developer.apple.com** → Certificates, Identifiers & Profiles

1. Identifiers → your App ID `com.attunerelationships.app` → tick **Sign in
   with Apple** → Save.
2. Identifiers → **+** → **Services IDs**. Description "Attune Web",
   identifier something like `com.attunerelationships.web`. This is the client
   id for the web half, and it must be different from the app's bundle id.
3. Open that Services ID → Configure next to Sign in with Apple:
   - Primary App ID: `com.attunerelationships.app`
   - Domains: `attune-relationships.com`
   - Return URLs: `https://<your-project-ref>.supabase.co/auth/v1/callback`
4. Keys → **+** → tick Sign in with Apple → Configure → pick the primary App
   ID → Register. **Download the .p8 file.** Apple lets you download it once
   and never again. Note the Key ID shown next to it, and your Team ID
   `HX5FX68K6L`.

**Supabase dashboard** → Authentication → Providers → Apple → enable, and fill
in:

- Client IDs: `com.attunerelationships.web` **and** `com.attunerelationships.app`,
  comma separated. Both, because the website uses the Services ID and the app
  uses the bundle id.
- Secret Key: the contents of the .p8 file.
- Team ID, Key ID: from above.

---

## 4. Tell Supabase where people are allowed to come back to

**Supabase dashboard** → Authentication → URL Configuration → Redirect URLs.

Add all of these:

```
https://www.attune-relationships.com/app
https://www.attune-relationships.com/app?*
attune://auth-callback
exp://127.0.0.1:8081/--/auth-callback
```

The first two are the website. The third is the app once it is built properly.
The fourth is the app running in Expo Go on the simulator, which is how it gets
tested before then; the port can differ, and the exact URL is printed in the
terminal when `npx expo start` runs.

A redirect URL that is not on this list is rejected by Supabase with no
explanation on the page, which looks exactly like the sign-in silently failing.
If a button opens Google, you sign in, and you land back on a blank page, this
list is the first thing to check.

---

## What changes for people using Attune

**Buying, then setting up.** The setup email link already carries the order
number. That number now survives the trip out to Google or Apple and back, so
someone can press Continue with Google, come back, and finish the profile
questions with their purchase already attached.

**The demographic questions stay.** Pressing a provider button answers one
question, which is who you are. Names, pronouns, partner, and the optional
questions are all still asked, on the same screen as before. The only fields
that disappear are the email and password ones.

**Signing in later.** Both buttons are on the sign-in screen, on the website
and in the app.

**Someone who presses Google but has no account** is told so, plainly, and
pointed at signing in with the email they bought with. They are not given a
blank new account, which would leave them holding two.

**Apple private relay.** Apple lets people hide their address, handing us a
relay one that matches no order ever written. That used to be enough to lose
the connection between a person and what they paid for. The purchase email is
now recorded on the account at the moment the order is claimed, and
entitlements are resolved against both addresses.
