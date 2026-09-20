import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import AppTabs from '@/components/app-tabs';
import { initSession } from '@/api/session';
import { refreshSession } from '@/api/auth';

// Once, before any screen renders. Keeps auth out of every call site.
//
// The refresh function is handed in here because this is the one module that
// can see both without closing an import cycle. Without it an expired access
// token, which happens about hourly, dumps the person back at a password
// prompt with a session that could have been renewed silently.
initSession({ refresh: refreshSession });

SplashScreen.preventAutoHideAsync();

export default function TabLayout() {
  const colorScheme = useColorScheme();

  /**
   * The brand faces, before anything renders.
   *
   * ── WHY THIS EXISTS ──────────────────────────────────────────────────────
   * The app was set to `ui-serif` and `system-ui`, which on iOS are New York
   * and San Francisco. The website sets Playfair Display and DM Sans. So every
   * screen was in a different typeface from the same screen on the website,
   * and the storycards made it unmistakable because they are the one place the
   * two are read side by side.
   *
   * Ellie reported the storycards looking different four times. The ratio, the
   * stripe, the grounds, the colours and the couple map were each found and
   * fixed; the typeface never was, because nothing in the app named a font
   * that could be wrong. A generic family name is not a mismatch anything can
   * detect.
   *
   * ── WHY THE SPLASH WAITS ─────────────────────────────────────────────────
   * Rendering before the faces load shows a frame in the system font and then
   * reflows. On a screen made to be screenshotted that is the one thing worth
   * a few hundred milliseconds of splash.
   *
   * `error` is handled the same as loaded on purpose: a font that fails to
   * load is a worse-looking app, and blocking on it forever is a broken one.
   */
  const [fontsReady, fontError] = useFonts({
    PlayfairDisplay: require('../../assets/fonts/PlayfairDisplay-Bold.ttf'),
    DMSans: require('../../assets/fonts/DMSans-Regular.ttf'),
    DMSansLight: require('../../assets/fonts/DMSans-Light.ttf'),
    DMSansMedium: require('../../assets/fonts/DMSans-Medium.ttf'),
    DMSansSemiBold: require('../../assets/fonts/DMSans-SemiBold.ttf'),
    DMSansBold: require('../../assets/fonts/DMSans-Bold.ttf'),
    /* ── THE ITALICS ARE FACES, NOT A FLAG ───────────────────────────────
       iOS does not slant a registered family on request: `fontStyle: 'italic'`
       on a named font draws the upright face and reports no error. Eighteen
       places in this app asked for italic and every one of them was upright,
       including three Ellie had asked for by name. So the faces are bundled,
       and the type scale names them. */
    DMSansItalic: require('../../assets/fonts/DMSans-Italic.ttf'),
    DMSansBoldItalic: require('../../assets/fonts/DMSans-BoldItalic.ttf'),
    /* Ellie: "italicize the final 3." Those three are set in Playfair, which
       was bundled Bold only, so they were the three that could not be fixed by
       naming a face. Now they can. */
    PlayfairDisplayItalic: require('../../assets/fonts/PlayfairDisplay-BoldItalic.ttf'),
  });

  if (!fontsReady && !fontError) return null;

  return (
    /**
     * ── WHY THE GESTURE ROOT IS HERE ────────────────────────────────────
     * Marking a fragment of a sentence is a press, a hold and a drag inside a
     * ScrollView, and on iOS a scroll view claims a moving touch through its
     * own native recogniser before React Native's JS responder system is ever
     * asked. react-native-gesture-handler is what competes with that
     * recogniser, and it needs this root to reach it. Without it the selection
     * gesture does nothing at all, silently, which is how it shipped.
     */
    /**
     * ── WHY THE GESTURE ROOT IS HERE ────────────────────────────────────
     * Marking a fragment of a sentence is a press, a hold and a drag inside a
     * ScrollView, and on iOS a scroll view claims a moving touch through its
     * own native recogniser before React Native's JS responder system is ever
     * asked. react-native-gesture-handler is what competes with that
     * recogniser, and this root is what its documentation asks for.
     */
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AnimatedSplashOverlay />
        <AppTabs />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
