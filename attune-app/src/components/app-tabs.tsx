/**
 * The four tabs.
 *
 * Uses NativeTabs.Trigger.Label and .Icon, the nested form the scaffold
 * shipped with. My first version imported bare Label and Icon from the same
 * module; they resolved to nothing, so no label rendered and iOS fell back to
 * the route names, which is why the bar read "index" and "practice".
 *
 * SF Symbols rather than the starter's PNGs: vector, Dynamic Type aware, and
 * what makes a tab bar read as native rather than a website in a shell.
 */

import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { Palette } from '@/constants/attune-theme';

export default function AppTabs() {
  return (
    <NativeTabs
      backgroundColor={Palette.cream}
      // The accent is load-bearing: it is the only thing telling you which tab
      // you are on, so it takes the brand orange rather than iOS blue.
      tintColor={Palette.orange}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="insights">
        <NativeTabs.Trigger.Label>Insights</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'chart.bar', selected: 'chart.bar.fill' }} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="resources">
        <NativeTabs.Trigger.Label>Resources</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'square.grid.2x2', selected: 'square.grid.2x2.fill' }} />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="notes">
        <NativeTabs.Trigger.Label>Notes</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'bookmark', selected: 'bookmark.fill' }} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
