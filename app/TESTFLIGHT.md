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

> **Steps 1 to 3 are done.** You logged in as `attune-relationships` and
> created the project, which is why `app.json` now carries a project id. The
> next thing you need is step 4, and the two variables are not there yet: I
> checked, and the production environment is empty. A build without them
> installs fine and signs nobody in.

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

## Step 4. The two settings the app needs

**Done.** The app talks to Supabase, and the build service needs the address
and the public key to do it. They are not in the repo on purpose, so they live
with EAS instead.

`eas env:create` is gone from the CLI, and the command that replaced it did not
take the environment the way its own prompt implied. There is a third command
that reads the values straight out of `attune-app/.env`, so nothing had to be
copied from Vercel at all:

    npx eas-cli env:push production --path .env

That is what was run, with your session on this machine. To see what is there:

    npx eas-cli env:list --environment production

Both values are public by design: the key ships in the website's bundle already
and grants nothing on its own, because row-level security decides what any
request can touch.

## Step 5. The app record at Apple: let the build make it

An App ID has to be registered to your team before Apple will accept a build
under it, and `com.attunerelationships.app` never has been. That is why the
dropdown in App Store Connect only offers `com.attunerelationships.web`: you
cannot pick an identifier that does not exist yet, and you cannot type one in
there.

**So do not create the app by hand.** The build in step 6 registers the
identifier with your team the first time it sets up credentials, and the submit
in step 7 offers to create the App Store Connect record once it exists. Both
ask before they do it.

Leave `com.attunerelationships.web` alone. It belongs to something else, and
the app's identifier is written into the app itself and into the links that let
attune-relationships.com open it.

If step 7 does not offer to create the app, come back here: at that point the
identifier will exist and **Apps → + → New App** will list it, with the details
in the next paragraph.

For that form, when you get to it: Platform **iOS**, Name **Attune
Relationships**, Primary language **English (U.S.)**, Bundle ID
**com.attunerelationships.app**, SKU **attune-ios**, User Access **Full
Access**. Screenshots and descriptions are for the public listing, not for
TestFlight.

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

## Do my changes reach TestFlight on their own?

You asked, and the answer is: most of them, yes, in about a minute, without
rebuilding or resubmitting anything.

The app is two things in one file. There is the **native shell**, which is
Xcode's part: the icon, the permissions, the libraries that touch the camera or
the keychain. And there is **everything we write**, which is JavaScript: every
screen, every word, every layout, every fix in the lists you send me.

`expo-updates` is now in the app, which means a build you have installed checks
for new JavaScript when it opens. So:

**A change to what we write:** one command, and the app updates itself the next
time it is opened.

    npx eas-cli update --branch production --message "what changed"

**A change to the native shell:** a new build and a new submit. That is adding
a library that touches the phone itself, changing the icon or the app's name,
or moving to a new Expo SDK. It is the same two commands as the first time, and
it is rare.

I will tell you which one a change needs. If I say "this one needs a build", it
needs the two commands below. Otherwise it is the update command, or nothing at
all if I have already run it.

One catch worth knowing: an update only reaches builds made from the same
version of the app. `app.json` says version 1.0.0, so every 1.0.0 build gets
1.0.0 updates. When the version changes, that is a build.

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
