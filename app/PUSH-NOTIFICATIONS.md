# Push notifications

**Status: built, and waiting on three things only Ellie can do.** They are at
the bottom of this file, in order, with the exact commands.

She approved six on 2026-10-10 and wrote the copy for all six. The ruleset
behind them (a four day cooldown, four a month, nothing pushed that the home
screen is already showing) was written months earlier and did not change.

---

## The six, as they will arrive

Her words, with the title and the line under it split at her own punctuation
where her sentence had a break. Two of them did not, and those splits are mine
and need her eye. The wording lives in `api/_lib/notifications.js` and nowhere
else; neither the app nor the website carries a copy of any of it.

| Event | Title | Line under it |
|--|--|--|
| Partner shared a note | Preston shared a note | Review Preston's shared note |
| Results ready | Congratulations! | Both you and Preston have completed your Attune exercises. Open your dashboard to explore your results |
| Workbook ready | Your personalized workbook is ready | For you to explore in your learn tab |
| Journal streak ending | **Your journal streak is about to expire** | Your streak of 6 days of entries in your relationship journal is about to expire. |
| Exercise unfinished | Don't forget to complete Conflict Patterns! | Finish all exercises to access your results. |
| New article | Repair after a fight was just published by Attune Relationships! | Access this 4 minute read in your learn tab |

**The two splits that are mine**, because her sentence had no break in it:

- The journal streak title in bold above. Her sentence is the line under it,
  word for word; the title is a compression of it in her own words.
- The workbook, where "Your personalized workbook is ready" and "for you to
  explore in your learn tab" are the two halves of one of her sentences, and
  the second half is capitalised to stand on its own line.

Change either and nothing else has to change with it.

## When each one fires

| Event | Trigger | Where it lives |
|--|--|--|
| Partner shared a note | They share a note from their results | `api/notes.js` |
| Results ready | The last exercise either of them owed is finished | `api/_lib/completion.js` |
| Workbook ready | The build finishes, and only when it was the automatic build rather than someone pressing download | `api/store-workbook-pdf.js` |
| Journal streak ending | Their last entry is between 20 and 44 hours old and the streak is two days or more | `api/cron-push.js`, daily |
| Exercise unfinished | They own an exercise they have not finished, and the account is at least three days old | `api/cron-push.js`, daily |
| New article | A post published in the last 26 hours, to anyone who read two in the previous week | `api/cron-push.js`, daily |

The last three are a cron because they are about something *not* happening, and
nothing can notice that at the moment it happens. It runs at 17:00 UTC, which
is the middle of the day in the US.

The streak condition is in hours rather than dates on purpose. A journal day is
written in the reader's own timezone and the cron runs in UTC, so "have they
written today" cannot be asked by comparing dates: at the hour this runs, a
reader in California is still on yesterday. How long ago their last entry was
is the same number everywhere.

## Two of the six write no alert row

Results ready and new article arrive as a push and leave nothing on the home
screen. That is Ellie's earlier instruction, kept: the home tile already
carries a card for results that are ready and a card for an unread post, and an
alert above it saying the same sentence is one prompt printed twice. A push is
the other case, where they are not looking at the screen at all.

The other four write a row as well, so they are still there when the phone was
on silent.

## What stops one arriving

In order, and all of it in `api/_lib/notifications.js`:

- **They have not said yes.** `push_opt_in` must be exactly true. Not null,
  which means nobody has asked them yet, and not false.
- **No device.** A token per device, and a token Expo says is dead is deleted
  rather than retried for ever.
- **The cooldown.** Four days since the last push of any kind.
- **The cap.** Four a month.
- **They have already seen it.** Nothing is pushed to someone who opened the
  app in the last day, for the four kinds where the home screen says the same
  thing. The streak and the unfinished exercise are exempt, because opening the
  app is not writing an entry or finishing an exercise.
- **They have been told already.** The same event is not repeated inside a day.

One consequence worth knowing: a streak reminder can be suppressed by the
four-day cooldown. It is not queued for later; it simply does not go. That is
the right trade, because a person who turns notifications off hears nothing
ever again, but say the word and the streak can be exempted.

## What is deliberately not built

- **Per-kind switches.** Settings has one control: on or off. Six switches for
  something that sends at most four a month invites a decision nobody wants to
  make. The kinds are already named, so splitting it later is small.
- **Anything about the other person's answers.** A push that says what your
  partner wrote is the product telling you something they chose to tell you
  themselves. A lock screen is a public place.
- **Anything that is only a restatement.** "You have not opened your results in
  a month" is us wanting their attention rather than them needing ours.

---

# What Ellie has to do

## 1. The Apple key, into Expo

She has made the key and called it "Push key". It does **not** go into Vercel:
Expo sends the notification on our behalf, so Expo is what needs the key, and a
key in two places is a key that expires in one of them.

From the project folder, one command, which asks for her Apple login and
uploads the key itself:

    cd attune-app && npx eas credentials

Choose **iOS**, then **production**, then **Push Notifications: Manage your
Apple Push Notifications Key**, then **Set up a new key** (or upload the one
she made: it will ask for the `.p8` file, the Key ID and the Team ID).

What it needs, so it is to hand:

- The `.p8` file she downloaded when she created the key. Apple allows that
  download **once**; if it is gone, revoke the key in the developer portal and
  make another.
- The **Key ID**, a ten character code, on the key's page in the Apple
  developer portal under Certificates, Identifiers & Profiles → Keys.
- The **Team ID**, which is `HX5FX68K6L`.

Nothing is pasted into a chat. The command reads the file from her machine and
sends it to Expo.

## 2. The migration

`supabase/migrations/078_push.sql`, in the Supabase SQL Editor, as always. It
adds the token table, the three columns on profiles, and the log the rate limit
reads. Nothing can be sent until it has run, and the endpoints say so rather
than failing quietly: `/api/push-token` answers "Push storage is not set up yet
(migration 078)".

## 3. A new build, not an update

This is the one that costs a day rather than a minute. `expo-notifications` is
a native module, and an over-the-air update cannot add one to a build that does
not have it. The build on her phone today has no notifications code in it, so:

    cd attune-app && npm run testflight

and when that finishes, the one that sends it to TestFlight:

    cd attune-app && npm run testflight:send

`app/TESTFLIGHT.md` is the longer walkthrough for both.

Everything in this release is written so that it is **inert** in the current
build rather than broken: the module is loaded inside a try, and if it is not
there, push is simply absent and the Settings row is not drawn. So the next
ordinary update is safe to publish before the build goes out.

## 4. And the decision: when the app asks

iOS allows **one** ask. If someone says no, the app can never ask again; they
have to find it in the Settings app themselves, and almost nobody does. So this
decides, permanently, how many couples can be reached when their partner
finishes.

Three options. The switch is one word in `attune-app/src/constants/push.ts`.

**A. On the first launch after signing in.** The most tokens and the worst
consent: asked before anything has happened, most people say no to an app they
have used for ninety seconds.

**B. Once they finish their first exercise. (Recommended, and what is set
now.)** The moment they finish, the next thing that matters is their partner
finishing, and that is exactly what a notification is for. Fewer asks, far more
yeses, and the ask lands when the reason for it is obvious.

**C. Only from Settings.** The highest intent and the fewest devices. The
toggle is there under all three options, so B and C differ only in whether the
app ever raises it first.

Say A, B or C. B is already in place, so saying B means nothing to do.
