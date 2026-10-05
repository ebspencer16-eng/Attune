/**
 * Send something to someone, through the phone's own sheet.
 *
 * ── WHY IT IS A COMPONENT ─────────────────────────────────────────────────
 * Ellie: "I want the share button to pull up apple's list like other platforms
 * do." That sheet is the system's, and every place we offer it should offer the
 * same thing: a line of text and the address it came from. Three screens want
 * one now, so the control is written once rather than three times with three
 * slightly different messages.
 */

import { useState } from 'react';
import { ActivityIndicator, Share, Text, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { Pressable } from '@/components/pressable';
import { SymbolView } from 'expo-symbols';

import { Colors, Radius, Spacing, Type } from '@/constants/attune-theme';

const c = Colors.light;

/**
 * ── WHAT THE SHEET CALLS THIS ─────────────────────────────────────────────
 * Ellie: "I want the subject text to be attune relationships instead of
 * insight of the day."
 *
 * It is the product's name everywhere, not the name of the screen the share
 * came from. Someone receiving a mail with the subject "Insight of the day"
 * has no idea who sent it or what it is.
 *
 * It is the default rather than something each caller passes, because the
 * answer is the same at every call site and a default is one fewer place to
 * get it wrong.
 */
const SUBJECT = 'Attune Relationships';

/**
 * ── THE INSIGHT GOES AS A PICTURE ─────────────────────────────────────────
 * Ellie: "I want the message to be titled Attune Relationships Insight of the
 * Day, and include a link to the site, but I want the image to be a picture of
 * the insight of the day storycard that people can view, download, screenshot,
 * etc. I want that storycard to be visible in the text, not just the written
 * quote."
 *
 * So a caller can hand this the view holding the card. It is captured to a PNG
 * and that file is what the sheet carries, which is what makes the card appear
 * in a message rather than a line of text and a link. The same capture the Save
 * button on a storycard already does.
 *
 * iOS takes one url, and when there is a picture the picture is it, so the
 * address rides in the message. That is the trade and it is the right way
 * round: a link is readable as text and an image is not.
 */
export default function ShareButton({
  message, url, title = SUBJECT, label, tone = 'ink', accessibilityLabel, capture, pictureName,
}: {
  /** What lands in the message. */
  message: string;
  /**
   * The address, as its own item rather than inside the message.
   *
   * iOS builds the preview card, and the little image on it, from the Open
   * Graph tags of this address. Left inside the message text it is a string
   * the system may or may not decide to look at; passed here it is a link,
   * and the card is reliable. public/home.html carries the square lockup for
   * exactly this.
   */
  url?: string;
  /** The sheet's own title, and the subject of a mail. Defaults to the name. */
  title?: string;
  /** Shown beside the icon. Omitted for a bare icon. */
  label?: string;
  tone?: 'ink' | 'light';
  accessibilityLabel?: string;
  /**
   * A view to send as a picture.
   *
   * When it is given and the capture works, the sheet carries the image and the
   * address moves into the message. When it is not, or the capture fails, this
   * is exactly what it was before: a line of text and a link.
   */
  capture?: { current: View | null };
  /**
   * What the picture is called.
   *
   * Ellie: "When I click share, I'm seeing that the title is a long string of
   * letters and numbers (1F3E11DE-3DBE-4552-BD9E-5C6A6...)."
   *
   * That string is the capture's temporary filename, and the sheet puts the
   * file's name at the top because a file is what it is being handed.
   * react-native-view-shot takes a `fileName`, so the fix is to name it rather
   * than to try to talk the sheet out of reading it. No colon: it is a path on
   * disk and the Finder draws a colon as a slash.
   */
  pictureName?: string;
}) {
  const tint = tone === 'light' ? 'rgba(255,255,255,0.9)' : c.accent;
  const [busy, setBusy] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || 'Share'}
      hitSlop={12}
      disabled={busy}
      onPress={async () => {
        if (busy) return;
        setBusy(true);
        let picture: string | null = null;
        if (capture?.current) {
          try {
            picture = await captureRef(capture.current, {
              format: 'png', quality: 1, ...(pictureName ? { fileName: pictureName } : null),
            });
          } catch (e) {
            /* No picture is not no share. The text and the link still go. */
            console.warn('[share] could not capture the card', e);
          }
        }
        /* With a picture, the address goes in the words, because iOS takes one
           url and the picture has to be it. */
        const body = picture && url ? `${message}\n\n${url}` : message;
        try {
          await Share.share(
            { title, message: body, ...(picture || url ? { url: picture || url } : null) },
            // `subject` rides in the options rather than the content, which is
            // where React Native puts it and why the wrong words were showing:
            // iOS reads the subject and ignores the title entirely.
            { subject: title },
          );
        } catch {
          /* dismissed, which is not a failure */
        }
        setBusy(false);
      }}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
        alignSelf: 'flex-start',
        ...(label ? {
          borderRadius: Radius.pill, borderWidth: 1, borderColor: tone === 'light' ? 'rgba(255,255,255,0.35)' : c.border,
          paddingVertical: Spacing.xs, paddingHorizontal: Spacing.md,
        } : null),
      }}>
      {busy ? (
        <ActivityIndicator color={tint} style={{ width: 17, height: 19 }} />
      ) : (
        <SymbolView
          name={'square.and.arrow.up' as never}
          size={15}
          tintColor={tint}
          fallback={<Text style={{ ...Type.small, color: tint }}>{'\u21E7'}</Text>}
          style={{ width: 17, height: 19 }}
        />
      )}
      {label ? (
        <Text style={{ ...Type.small, fontWeight: '700', color: tint }}>{label}</Text>
      ) : null}
    </Pressable>
  );
}
