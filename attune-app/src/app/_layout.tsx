import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import { useColorScheme } from 'react-native';

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
  });

  if (!fontsReady && !fontError) return null;

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <AppTabs />
    </ThemeProvider>
  );
}
