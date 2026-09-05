/**
 * Placeholder so the tab bar works end to end before the screen exists.
 *
 * A tab that opens a blank white page reads as broken; one that says what it
 * will hold reads as unfinished, which is the truth. Replaced by the real
 * screen from SCREENS.md.
 */

import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenEmpty } from '@/components/screen-states';
import { Colors } from '@/constants/attune-theme';

export default function Placeholder() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.light.background }} edges={['top']}>
      <ScreenEmpty title="Insights" body="Your results live here: couple type, communication, expectations, and every exercise you own. Opens once you have both finished." />
    </SafeAreaView>
  );
}
