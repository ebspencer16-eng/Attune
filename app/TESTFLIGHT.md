# Getting the app onto your phone, through TestFlight

Written for you, not for a developer. Every command is one line; copy one,
press Enter, wait for it to finish, then come back here for the next one.

If anything asks a question I have not listed, stop and send me what it said. A
wrong answer at some of these steps is slow to undo.

---

## What this gets you

A real Attune app, installed on your iPhone from TestFlight, the same way a
customer will get it from the App Store. Not the simulator: your actual phone,
signed in, with notifications and the real keyboard.

TestFlight is Apple's testing app. You install builds through it, and so can
anyone else you invite, up to a hundred people, without the app being public.

## What you need first

1. **An Apple Developer account.** You have one: the team is HX5FX68K6L. It is
   $99 a year and it has to be current, so if Apple has emailed about renewal,
   deal with that first.
2. **An Expo account.** Free. This is the service that builds the app for us,
   because building an iPhone app needs a Mac with Xcode and a lot of
   configuration, and this rents one by the minute instead.
3. **The terminal, in the app's folder.** Every command below assumes you are
   there. To get there, open Terminal and run this one first:

       cd ~/Projects/unison/attune-app

   You only need that once per terminal window.

---

## Step 1. Make the Expo account

Go to **expo.dev/signup** in a browser. Use your work email. Pick any username;
it becomes part of the project's address, so something like `attune` is tidy.

Nothing to do in the terminal yet.

## Step 2. Log in

    npx eas-cli login

It asks for the email or username and the password from step 1. The password
will not appear as you type it. That is normal, not a frozen screen.

To check it worked:

    npx eas-cli whoami

It should print your username. If it says "Not logged in", run the login again.

## Step 3. Link this app to your Expo account

    npx eas-cli init

What it asks:

- **"Would you like to create a project?"** Yes.
- **The name.** It suggests `attune-relationships`, which matches what is in
  the app already. Take the suggestion.

This writes a project id into `app.json`. That is expected, and it is the one
change you should tell me about so I can commit it.

## Step 4. Give the build the two settings the app needs

The app talks to Supabase, and it needs the address and the public key to do
it. They are not in the repo on purpose, so the build service needs its own
copy. Both are safe to hand over: they are in the website's public bundle
already, and they grant nothing on their own.

Find them in **Vercel → the Attune project → Settings → Environment
Variables**. They are called `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
Copy the values somewhere you can paste from.

Then run this, once per value:

    npx eas-cli env:create --name EXPO_PUBLIC_SUPABASE_URL --scope project --visibility plaintext

It asks for the value: paste the one from `VITE_SUPABASE_URL`. When it asks
which environments, choose **production** (space to select, Enter to confirm).

Then the second one:

    npx eas-cli env:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --scope project --visibility plaintext

Same thing, with the value from `VITE_SUPABASE_ANON_KEY`.

To check both landed:

    npx eas-cli env:list --environment production

## Step 5. Make the app record at Apple

Apple needs somewhere to put the build before TestFlight can hand it out.

1. Go to **appstoreconnect.apple.com** and sign in with the Apple ID that owns
   the developer account.
2. **Apps → the blue + → New App.**
3. Fill in:
   - **Platform:** iOS
   - **Name:** Attune Relationships (this is the App Store name; it has to be
     unique across the whole store, so if it is taken, tell me before changing
     it, because the name is in the app too)
   - **Primary language:** English (U.S.)
   - **Bundle ID:** pick `com.attunerelationships.app` from the list. If it is
     not in the list, stop and tell me: it means the identifier has not been
     registered to the team yet, which is a two minute fix on my side.
   - **SKU:** `attune-ios` (this is an internal reference, nobody sees it)
   - **User Access:** Full Access
4. Create.

You do not have to fill in screenshots, descriptions or pricing yet. Those are
for the public App Store listing, not for TestFlight.

## Step 6. Build it

    npx eas-cli build --platform ios --profile production

This is the long one: usually ten to twenty minutes, and it runs on Expo's
machines, so you can close the laptop lid once it says the build is queued.

What it asks, in order:

- **"Do you want to log in to your Apple account?"** Yes. It asks for the
  Apple ID, the password, and then the six digit code Apple sends to your
  phone. This is Apple's own two factor, not something Expo invented.
- **"Generate a new Apple Distribution Certificate?"** Yes. A certificate is
  how Apple knows a build is really from you. Expo stores it and reuses it
  for every future build, so this question only comes up once.
- **"Generate a new Apple Provisioning Profile?"** Yes, for the same reason.

Then it prints a link. Open it: that page shows the build happening, line by
line. When it finishes, the page has a green tick and the file is stored on
Expo's servers. You do not need to download it.

**If it fails,** copy the whole red section and send it to me. Almost every
first build failure is a native module needing a line of configuration, which
is my job, not yours.

## Step 7. Send it to Apple

    npx eas-cli submit --platform ios --profile production --latest

`--latest` means "the build you just made". It asks for the Apple ID again,
uploads, and finishes in a couple of minutes.

## Step 8. TestFlight

1. In App Store Connect, open the app, then the **TestFlight** tab. The build
   says **Processing** for five to thirty minutes. Apple is scanning it.
2. When processing ends, Apple asks one question: **export compliance**. The
   honest answer for this app is that it uses only standard HTTPS encryption,
   so tick **"None of the algorithms mentioned above"** and continue. If it
   words it as a yes or no question about encryption, the answer is that you
   use exempt standard encryption.
3. **Internal Testing → the + beside Testers → add yourself.** Internal testers
   get builds immediately with no Apple review.
4. On your phone, install **TestFlight** from the App Store, sign in with the
   same Apple ID, and Attune will be waiting there. Tap Install.

That is it. The app on your phone is the real thing.

---

## Every build after the first one

Two commands, and none of the questions above:

    npx eas-cli build --platform ios --profile production
    npx eas-cli submit --platform ios --profile production --latest

The version number takes care of itself: `autoIncrement` in `eas.json` bumps
the build number every time, which is the thing Apple refuses a repeat of.

## When you want other people to test it

Internal testers have to be on the team in App Store Connect. **External**
testers can be anyone with an email address, up to ten thousand, but the first
external build goes through a short Apple review, usually a day. Set that up in
TestFlight → External Testing when you are ready, and tell me if you want the
invite copy written.

## What I cannot do for you, and why

Making the Expo account, logging into Apple, and answering Apple's questions
all need credentials that are yours. I will not ask you for them and you should
not paste them into a chat with me or anyone else. Everything that does not
need them is already done: `eas.json` is written and committed, the bundle
identifier, the team id, the icons, the splash screen and the privacy manifest
are all in place.
