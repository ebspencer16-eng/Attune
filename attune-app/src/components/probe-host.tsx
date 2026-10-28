import { Platform, View } from 'react-native';
import { SafeAreaFrameContext, SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { ExerciseOpening, ExerciseShell } from '@/components/exercise-chrome';

/**
 * A screen mounted on its own, in the web build, for a browser check to
 * measure.
 *
 * ── WHY THIS IS IN THE APP ────────────────────────────────────────────────
 * The app's screens are Expo components, and the only browser that can draw
 * them is the Expo web build. Until this existed, a probe had to swap the
 * `<AppTabs />` line in _layout.tsx for a host by hand and swap it back, and a
 * check that edits app source is a check that leaves the repo modified when it
 * throws. CLAUDE.md records that costing work five times.
 *
 * So the layout asks `probeName()` and draws this instead of the tabs when it
 * answers. It answers only on the web, and only with `?probe=` in the address.
 * On a phone `Platform.OS` is 'ios' and this is never drawn.
 *
 * What to draw arrives as `window.__PROBE__`, set by the check before the page
 * loads, built from the server's own modules. Nothing here invents content.
 */
export function probeName(): string | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  try {
    return new URLSearchParams(window.location.search).get('probe');
  } catch {
    return null;
  }
}

type CoverProbe = {
  /** The exercise, and what /api/questions sends for it. */
  key: string;
  label: string;
  intro: Parameters<typeof ExerciseOpening>[0]['intro'];
  resultsGroup: string | null;
  /** The phone: its window, its insets, and the tab bar that stays on screen. */
  width: number;
  height: number;
  insets: { top: number; bottom: number };
  tabBar: number;
};

export default function ProbeHost() {
  const name = probeName();
  const data = (globalThis as { __PROBE__?: CoverProbe }).__PROBE__;
  if (name !== 'cover' || !data) return null;

  /* The tab bar stays on screen while an exercise is open: insights.tsx draws
     the exercise in place of the tab's content, inside NativeTabs, and a tab
     screen runs the full height with the bar drawn over its bottom. Every tab
     screen pads by BottomTabInset for that. So the screen here is the whole
     window, and the check asks where the bar's top edge is. The top inset is
     SafeAreaView's to take, which is why it goes in through the context. */
  const room = data.height;
  /* The real bottom inset too. ExerciseShell's SafeAreaView takes only the
     top edge, and the cover reads the bottom to clear the tab bar. */
  const insets = { top: data.insets.top, bottom: data.insets.bottom, left: 0, right: 0 };
  return (
    <SafeAreaFrameContext.Provider value={{ x: 0, y: 0, width: data.width, height: room }}>
      <SafeAreaInsetsContext.Provider value={insets}>
        <View testID="probe-room" style={{ height: room, width: data.width, overflow: 'hidden' }}>
          <ExerciseShell exerciseKey={data.key} onClose={() => {}}>
            <ExerciseOpening
              exerciseKey={data.key}
              label={data.label}
              intro={data.intro}
              resultsGroup={data.resultsGroup}
              onBegin={() => {}}
            />
          </ExerciseShell>
        </View>
      </SafeAreaInsetsContext.Provider>
    </SafeAreaFrameContext.Provider>
  );
}
