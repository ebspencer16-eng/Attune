/**
 * Put text on the phone's clipboard.
 *
 * ── WHY THIS IS ONE FUNCTION ──────────────────────────────────────────────
 * Ellie: "Can we add the option to copy text when it's selected?"
 *
 * Two surfaces offer it: the floating toolbar over a selection, and the mark
 * sheet's own menu. One line each, which is exactly the size of thing that
 * ends up written twice and then drifts.
 *
 * ── WHY react-native AND NOT expo-clipboard ───────────────────────────────
 * `Clipboard` is deprecated in React Native core and still in it, backed by a
 * native module that ships with React Native itself. expo-clipboard is the
 * modern answer and is a native dependency this project does not have: adding
 * one means a new TestFlight build and a trip through review, rather than an
 * update Ellie can publish in a minute. A deprecation warning is a cheaper
 * price than that, and the day core drops it, this file is the one place to
 * change.
 *
 * The warning is logged once per app launch by React Native, not by us.
 */

// eslint-disable-next-line @typescript-eslint/no-deprecated
import { Clipboard } from 'react-native';

/**
 * Copy, and say whether there was anything to copy.
 *
 * Empty text is not an error and is not a copy either: a selection that
 * resolved to nothing should leave whatever is on the clipboard alone rather
 * than wiping it.
 */
export function copyText(text: string | null | undefined): boolean {
  const s = String(text ?? '').trim();
  if (!s) return false;
  Clipboard.setString(s);
  return true;
}
