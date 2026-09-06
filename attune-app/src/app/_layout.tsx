import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
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
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <AppTabs />
    </ThemeProvider>
  );
}
