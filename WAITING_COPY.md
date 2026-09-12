# "This opens when you have both finished" — every version, for review

One message, written by hand in 22 places. A couple moving between the
dashboard, an exercise footer, a locked section and Settings is told the
same thing four ways in four minutes.

**Nothing here is missing.** These all render today. You have not seen most
of them because they only appear when a section is *locked*, and as a
finished demo couple you never hit that state. A real couple hits it
constantly.

Grouped by **situation**, because that is the decision: does the product
say one sentence everywhere, or one per situation? There are six
situations, not 22.

Write your line under each group, or write one line at the top and I will
use it everywhere. Either way I do the wiring and add a gate so a new one
cannot be typed inline again.

---

## 1. Before they have bought, on the marketing pages

    Website  App.jsx:10002   Create your account to get started. Your answers stay
                             private until both of you are done, then your results
                             unlock together.
    Website  App.jsx:13228   Answer on your own. Results unlock when both of you finish.

**Your line:**

---

## 2. The dashboard, before the exercises are done

    Website  App.jsx:13168   Once both of you complete your exercises, your results
                             will unlock.
    Website  App.jsx:13293   Unlocks when both of you finish all exercises.
    Website  App.jsx:13339   Unlocks once both of you finish.
    Website  App.jsx:13517   Share your Attune link so they can complete their side.
                             Results unlock when both of you are done.
    Website  App.jsx:14369   Your results open when both of you finish all exercises.
                             You'll both see everything at the same time.

**Your line:**

---

## 3. An exercise footer, once you have finished your half

    Website  App.jsx:1383            Your answers are saved. Your results open when you
                                     have both finished everything, and what you said
                                     about your own patterns stays private.
    App      exercise.tsx:99         Your answers are saved. Results open once you have
                                     both finished.
    App      intimacy-exercise.tsx:85 Your answers are saved. These results open once
                                     you have both finished.
    App      reflection-exercise.tsx:94 Your answers are saved. This section opens once
                                     you have both finished.
    App      insights.tsx:175        Results open once you have both finished.
                                     {N} left for you.

**Your line:**

---

## 4. A locked section, where YOU are the one who has not finished

    App      results.tsx:42   Finish the exercise to open this

**Your line:**

---

## 5. A locked section, where your PARTNER has not finished

    App      results.tsx:43    Waiting on your partner
    App      results.tsx:459   This opens when you have both finished Expectations.
    App      results.tsx:1032  This opens when you have both finished the exercise.
    App      results.tsx:1083  This opens when you have both finished writing.
    Website  App.jsx:7312      This section opens once you have finished Conflict Patterns.
    Website  App.jsx:7313      This section opens when you have both finished Conflict
                               Patterns. {Partner} has not completed it yet.

Note: 4 and 5 are the only pair that genuinely say different things. If
every other group collapses to one sentence, these two probably still need
two, because "finish yours" and "wait for them" are different instructions.

**Your line, for a section you are holding up:**

**Your line, for a section they are holding up:**

---

## 6. Settings

    App      settings.tsx:70  Results open when both of you finish everything owned.

"everything owned" is doing real work there: it means the exercises this
couple has actually bought, not all five. If that distinction matters to a
reader, it needs saying in words. If it does not, this is group 2.

**Your line:**

---

## Two that are a different message and may want leaving alone

    App  screen-states.tsx:44  Finish setting up on the website and this will fill in.
    App  results.tsx:1492      This fills in as you finish the exercises in your package.

Neither is about waiting for a partner. The first is about an account that
was never completed; the second is about your own unfinished exercises.
