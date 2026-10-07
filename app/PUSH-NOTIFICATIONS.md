# Push notifications: what they would be

Ellie: "what push notifications are we talking about? Let's build a list of what
those should be then build them. Include things like partner sent a note,
journal streak is about to expire, etc."

Nothing sends a push today. `shouldNotify` in `api/_lib/notifications.js` is a
considered ruleset — a cooldown, a monthly cap, a quiet class, and nothing to
someone who opened the app that day — and it is the only mention of push in the
tree. There is no token storage and no sender.

This is the list to approve before any of it is built. Every one is something
the product already knows; nothing here needs new data.

## Already written, already raised in the app

These five are alerts today. Pushing them needs no new copy, because the words
exist and you have seen them.

| Event | What happens | Today's words |
|--|--|--|
| Partner joined | They accept the invite | "Preston joined Attune" / "You can both start your exercises now" |
| Partner finished | They complete their exercises, which unlocks results | "Preston completed their exercises" / "Explore your results" |
| Partner nudged you | They press the nudge button | "Preston sent you a nudge" / "Complete your exercises to unlock your results" |
| **Partner shared a note** | They share a note from their results. This is your "partner sent a note" | "Preston shared something with you" / "A note from your results." |
| Partner deleted | They delete their account | Already written, and quiet by design: no sound |

## New, and each needs copy from you

| Event | When it fires | What it has to say |
|--|--|--|
| **Journal streak ending** | You have a streak of two or more days and today has no entry. Fires in the evening, local time | That the streak is alive and today is missing. One sentence |
| Results ready | Both of you have finished and nobody has opened the results | That they are there. The home screen already carries a card, so this is only for someone not in the app |
| Workbook ready | The workbook finishes building | That it is ready to open |
| Exercise left unfinished | You answered some of an exercise and have not been back for several days | Not a telling-off. One line that makes it easy to pick up |
| A new In Practice article | A post is published | The lowest urgency of the ten. The existing rules already say nothing is pushed to someone who did not read the last one |

## What is NOT on the list, and why

Anything that is only a restatement of what the home screen already shows. The
home tile carries a card for an unread post and a card for results that are
ready, and an alert above it saying the same sentence is one prompt printed
twice. That is why `new_post` and `results_ready` are not raised in the app
today, and it is why both appear above only in the case where the person is
*not* in the app.

Nothing about the other person's answers. A push that says what your partner
said is the product telling you something they chose to tell you themselves.

## What building it needs

1. **An Apple push key**, from your developer account, added to Expo. I cannot
   create it; it is tied to your Apple login.
2. **Somewhere to keep a token**, which is a migration: a column for the Expo
   push token and a column for the answer to being asked. I write it, you run it
   in the SQL editor, as always.
3. **When the app asks.** Asking on first launch is the worst moment and the
   usual one. My suggestion is to ask the first time something would actually
   have been sent, with the reason in front of the question, but it is your call.

The ruleset itself is already written and does not need to change.
