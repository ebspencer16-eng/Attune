# Fonts

Playfair Display and DM Sans, the two families the website uses. Both are
licensed under the SIL Open Font License 1.1, which permits bundling them in an
application.

They are here rather than pulled from a package because `expo-font` was already
installed and `@expo-google-fonts/*` would have been two new dependencies for
six files that never change.

## Why these exist at all

The app was using `ui-serif` and `system-ui`, which on iOS are New York and SF.
The website sets Playfair Display and DM Sans. So every screen in the app was
in a different typeface from the same screen on the website, and the storycards
made it obvious because they are the one place the two are read side by side.

Ellie reported the storycards looking different four times. Colour, spacing and
layout were fixed each time; the typeface never was, because nothing in the app
named a font that could be wrong.

## Weights

DM Sans in 300, 400, 500, 600 and 700, which is the set the website loads.
Playfair Display in 700 only, which is the only weight the website uses for
headings.
