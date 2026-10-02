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
import { openBrowserAsync, WebBrowserPresentationStyle } from 'expo-web-browser';

import { Palette } from '@/constants/attune-theme';

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

/**
 * Open something inside the app, in a browser the app presents itself.
 *
 * ── WHY NOT openExternal ──────────────────────────────────────────────────
 * Ellie, of the workbook: "app simulator still downloads the pdf". The tile
 * called `Linking.openURL`, which leaves the app and hands the file to Safari,
 * and Safari's answer to a document is a download prompt rather than a page.
 * So the one thing the workbook is for, reading it, happened outside the
 * product if it happened at all.
 *
 * She had already asked for the opposite and approved it (R173): the workbook
 * opens in the browser from the app rather than throwing someone out to Safari.
 * That was lost when the local rendering path was removed, because the removal
 * took the in-app browser with it and left the Linking call behind.
 *
 * A PDF renders in this, full screen, with the system's own share control for
 * saving it to Files or sending it on. Nobody leaves the app.
 *
 * @returns true if it opened, false if the platform refused.
 */
export async function openInApp(url: string): Promise<boolean> {
  try {
    await openBrowserAsync(url, {
      presentationStyle: WebBrowserPresentationStyle.FULL_SCREEN,
      toolbarColor: Palette.cream,
      controlsColor: Palette.orange,
    });
    return true;
  } catch (e) {
    console.warn('[openInApp] would not open', url.slice(0, 120), e);
    return false;
  }
}
