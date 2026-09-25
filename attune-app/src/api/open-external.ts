/**
 * Opening something outside the app, without the rejection reaching the screen.
 *
 * ── WHY THIS EXISTS ───────────────────────────────────────────────────────
 * Ellie: "Just went back to the app and there's an error banner on the bottom
 * with a red 3 then 'Uncaught (in promise, id:2) Error: Unable t...'"
 *
 * `Linking.openURL` hands back a promise the platform rejects when it will not
 * open something: a URL longer than iOS will take, a scheme nothing handles, a
 * file that has gone. An onPress does not await what it calls, so that
 * rejection has nowhere to go. In development it is a red counter in the
 * corner; in a real build there is no counter and no message, and the tap
 * simply does nothing, which is what she saw first.
 *
 * Fourteen call sites did this. One helper rather than fourteen try blocks,
 * because fourteen try blocks is a rule written fourteen times and the
 * fifteenth call site will not have one.
 *
 * ── IT RETURNS WHETHER IT WORKED ──────────────────────────────────────────
 * Rather than throwing or swallowing. A caller that has something to say when
 * a link will not open can say it; a caller that has nothing to say can ignore
 * the answer, and the failure still cannot reach the screen as an unhandled
 * rejection. That is the difference between catching and hiding.
 *
 * check-native-rejections.mjs holds every one of these calls to being caught.
 */

import { Linking } from 'react-native';

/**
 * Open a URL outside the app.
 *
 * @returns true if the platform took it, false if it refused.
 */
export async function openExternal(url: string): Promise<boolean> {
  try {
    await Linking.openURL(url);
    return true;
  } catch (e) {
    /* Logged rather than shown. A link that will not open is worth knowing
       about in a log and is not worth a dialog: the reader tapped a thing and
       nothing happened, and an alert about a URL scheme explains nothing. */
    console.warn('[openExternal] would not open', url.slice(0, 120), e);
    return false;
  }
}
