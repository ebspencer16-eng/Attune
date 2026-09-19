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

import { Pressable, Share, Text, View } from 'react-native';
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

export default function ShareButton({
  message, url, title = SUBJECT, label, tone = 'ink', accessibilityLabel,
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
}) {
  const tint = tone === 'light' ? 'rgba(255,255,255,0.9)' : c.accent;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || 'Share'}
      hitSlop={12}
      onPress={() => {
        Share.share(
          { title, message, ...(url ? { url } : null) },
          // `subject` rides in the options rather than the content, which is
          // where React Native puts it and why the wrong words were showing:
          // iOS reads the subject and ignores the title entirely.
          { subject: title },
        ).catch(() => {
          /* dismissed, which is not a failure */
        });
      }}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
        alignSelf: 'flex-start',
        ...(label ? {
          borderRadius: Radius.pill, borderWidth: 1, borderColor: tone === 'light' ? 'rgba(255,255,255,0.35)' : c.border,
          paddingVertical: Spacing.xs, paddingHorizontal: Spacing.md,
        } : null),
      }}>
      <SymbolView
        name={'square.and.arrow.up' as never}
        size={15}
        tintColor={tint}
        fallback={<Text style={{ ...Type.small, color: tint }}>{'\u21E7'}</Text>}
        style={{ width: 17, height: 19 }}
      />
      {label ? (
        <Text style={{ ...Type.small, fontWeight: '700', color: tint }}>{label}</Text>
      ) : null}
    </Pressable>
  );
}
