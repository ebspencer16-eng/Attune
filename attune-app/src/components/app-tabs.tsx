/**
 * The four tabs.
 *
 * SF Symbols rather than the starter's PNG icons: they are vector, respect
 * Dynamic Type, and match every other iOS app, which is what makes a tab bar
 * read as native rather than as a website in a shell.
 *
 * Four, not five. Toolbox and Home overlap heavily at this stage, and a tab
 * that duplicates the screen beside it teaches people the bar is not worth
 * reading.
 */

import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';

import { Palette } from '@/constants/attune-theme';

export default function AppTabs() {
  return (
    <NativeTabs
      backgroundColor={Palette.cream}
      // The accent is load-bearing: it is the only thing telling you which
      // tab you are on, so it uses the brand orange rather than iOS blue.
      tintColor={Palette.orange}>
      <NativeTabs.Trigger name="index">
        <Label>Home</Label>
        <Icon sf={{ default: 'house', selected: 'house.fill' }} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="insights">
        <Label>Insights</Label>
        <Icon sf={{ default: 'chart.bar', selected: 'chart.bar.fill' }} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="practice">
        <Label>In Practice</Label>
        <Icon sf={{ default: 'book', selected: 'book.fill' }} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="notes">
        <Label>Notes</Label>
        <Icon sf={{ default: 'bookmark', selected: 'bookmark.fill' }} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
