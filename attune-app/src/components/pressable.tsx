/**
 * `Pressable`, with the one thing React Native does not give it: feedback.
 *
 * ── THE BUG ───────────────────────────────────────────────────────────────
 * Ellie: "nothing happened the first few times I clicked the personalized
 * workbook button, then I saw the same 'service did not answer' error... add on
 * the site and the web some sense of a button push, whether that's a click, a
 * grey-out, a 'push down' visual effect, or something to signal to the user
 * that the button was tapped."
 *
 * React Native's `Pressable` has no default pressed appearance. `TouchableOpacity`
 * does, which is why this is easy to miss: of the ninety-odd Pressables in this
 * app, exactly one reacted to being pressed. So every tap in the product looked
 * identical to a tap that did nothing, and on anything slow, which is most of
 * the tools, the only sensible reading is that it was not registered.
 *
 * ── WHY A WRAPPER AND NOT NINETY EDITS ────────────────────────────────────
 * A rule applied one component at a time is a list that is never finished, and
 * the next control someone adds will not have it. This is one import away from
 * being everywhere, and `check-press-feedback.mjs` holds the app to importing
 * it rather than react-native's.
 *
 * ── IT COMPOSES ───────────────────────────────────────────────────────────
 * A caller may already pass a style, an object or a function of `{ pressed }`.
 * Both are honoured: the caller's style is resolved first and the pressed
 * effect is layered on top, so nothing that already handles `pressed` loses
 * what it does.
 */
import { forwardRef } from 'react';
import { Pressable as RNPressable } from 'react-native';
import type { PressableProps, StyleProp, View, ViewStyle } from 'react-native';

/** How far a pressed control sinks, and how much it dims. */
const PRESSED = { opacity: 0.62, transform: [{ scale: 0.985 }] } as const;

type Style = StyleProp<ViewStyle>;
type Props = Omit<PressableProps, 'style'> & {
  style?: Style | ((state: { pressed: boolean }) => Style);
  /**
   * Opt out, for a control where sinking would be wrong: a row inside a
   * scrolling list that is only a drag handle, say. Named rather than silent,
   * so an exception is a decision someone wrote down.
   */
  noPressFeedback?: boolean;
};

/* forwardRef because one caller measures the control it wraps. A wrapper that
   silently swallows a ref is a wrapper that breaks a measurement without
   saying so. */
export const Pressable = forwardRef<View, Props>(
  ({ style, noPressFeedback, disabled, ...rest }, ref) => (
    <RNPressable
      ref={ref}
      disabled={disabled}
      style={(state) => {
        const base = typeof style === 'function' ? style(state) : style;
        /* A disabled control is already saying it will not respond; dimming it
           further on touch would suggest it did. */
        if (noPressFeedback || disabled || !state.pressed) return base;
        return [base, PRESSED];
      }}
      {...rest}
    />
  ),
);
Pressable.displayName = 'Pressable';

export default Pressable;
