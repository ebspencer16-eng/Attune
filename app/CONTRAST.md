# Text that is hard to read, measured

Run `npx vite build` then `node scripts/report-contrast.mjs` to reproduce this.

Ellie, once before, about the results pages: "The content is hard to read
against these colors. How can we adjust the bgs to make the content readable?"
That produced `check-ground-contrast`, which holds every results ground and now
the app's own. The marketing pages, the checkout, the feedback form and the In
Practice articles were never measured. This is that measurement.

**37 pages. 181 runs of text below the ratio, across 35 distinct colour pairs.**

The standard is the one the results grounds are already held to: 4.5 to 1 for
body text, 3 to 1 for large or bold. Text sitting over an image or a gradient is
skipped rather than guessed at.

## The ones that are nearly there

Four colours miss by so little that the fix is invisible. A two per cent
darkening carries each of them over.

| Colour | Where | Now | Would need to be |
|--|--|--|--|
| Clay `#A66534` | "View all posts", section labels on cream | 4.37 | `#A36333` |
| Pink `#E91E63` | the Conflict and Repair shelf label | 4.35 | `#E41D61` |
| Teal `#00897B` | the Methodology shelf label | 4.08 | `#008174` |
| Periwinkle `#5B6DF8` | "Most Complete" on the packages page | 3.73 | `#5161DD` |

**My recommendation: take these four.** Nobody will see the difference and four
of the thirty-five pairs go away.

## The ones that are a real decision

| Colour | Where | Now | Would need to be |
|--|--|--|--|
| Accent orange `#E8673A` | small links and eyebrows on white and cream: "Find this book", "Add to registry", the email address on /contact and /faq, every "In Practice ·" label | 3.08 to 3.26 | `#BA522E` on cream, `#C15530` on white |
| Muted grey `#9C9890` | every eyebrow on /feedback: "Pick all that apply", "0 of 26 complete", the section numbers | 2.42 to 2.62 | `#726F69` |
| Faint grey `#B8AC9C` | "calculated from billing ZIP" on checkout | 2.23 | `#7D756A` |

The orange is the brand colour and I am not changing it on your site without
you. Two things worth knowing before you decide:

- It only fails as **small text**. As a button fill with white on it, or as a
  large heading, it passes. Nothing about the brand has to change; what changes
  is the colour of the small print that happens to be set in it.
- A darker orange for small text is the usual answer, and it would live beside
  the existing one rather than replacing it.

## Not a palette question at all

| What | Where | Now |
|--|--|--|
| White at 35 per cent | "Sign in to continue" on /admin, the intro on /email-preview | 3.19 |
| White at 40 per cent | the copyright line in the footer, every page | 3.82 |
| White at 45 per cent | "Email template preview" | 4.40 |

These are white type dimmed with opacity on a dark ground. `check-ground-contrast`
says in its own header that it deliberately does not cover "type set at less than
full white", and this is that case: the ground is fine and the text on it is
faded past readable. Raising those three to 55, 60 and 55 per cent would clear
the ratio without changing any colour.

**My recommendation: take these three too.** They are not design, they are a
number that was picked by eye.

## What is not in here

Text over a photograph or a gradient, which cannot be measured against a single
colour. And the app, which has its own grounds and is covered by
check-ground-contrast.
