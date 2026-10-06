// The stack inside each native tab. NativeTabs draws no header of its own, so
// every tab root gets a transparent large-title header over the backdrop; on
// iOS 26 its bar buttons render as liquid glass. Screens pushed from a tab go to
// the root stack (app/_layout.tsx), which shares the same chrome.
import { Stack } from 'expo-router/stack';
import type { ReactNode } from 'react';
import { colors, navigation } from '@/theme';

export const stackChrome = {
  headerTransparent: true,
  headerShadowVisible: false,
  headerLargeTitleShadowVisible: false,
  headerLargeStyle: { backgroundColor: 'transparent' },
  headerBackButtonDisplayMode: 'minimal',
  headerTintColor: colors.ink,
  headerTitleStyle: navigation.headerTitleStyle,
  headerLargeTitleStyle: navigation.headerLargeTitleStyle,
  contentStyle: navigation.contentStyle,
} as const;

export function TabStack({
  screen,
  title,
  headerRight,
}: {
  screen: string;
  title: string;
  headerRight?: () => ReactNode;
}) {
  return (
    <Stack screenOptions={stackChrome}>
      <Stack.Screen name={screen} options={{ title, headerLargeTitleEnabled: true, headerRight }} />
    </Stack>
  );
}
