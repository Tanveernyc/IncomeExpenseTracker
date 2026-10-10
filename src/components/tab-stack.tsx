// The stack inside each native tab. NativeTabs draws no header of its own, so
// every tab root gets a transparent large-title header over the backdrop; on
// iOS 26 its bar buttons render as liquid glass. Screens pushed from a tab go to
// the root stack (app/_layout.tsx), which shares the same chrome.
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { Pressable } from 'react-native';
import { colors, navigation } from '@/theme';

// Only iOS insets scroll content under a transparent header (contentInsetAdjustmentBehavior).
// Android would draw the title and buttons over the first card, so it gets a solid
// header in the backdrop's colour instead.
const TRANSPARENT_HEADER = process.env.EXPO_OS === 'ios';

export const stackChrome = {
  headerTransparent: TRANSPARENT_HEADER,
  headerStyle: TRANSPARENT_HEADER ? undefined : { backgroundColor: colors.paper },
  headerShadowVisible: false,
  headerLargeTitleShadowVisible: false,
  headerLargeStyle: { backgroundColor: 'transparent' },
  headerBackButtonDisplayMode: 'minimal',
  headerTintColor: colors.ink,
  headerTitleStyle: navigation.headerTitleStyle,
  headerLargeTitleStyle: navigation.headerLargeTitleStyle,
  contentStyle: navigation.contentStyle,
} as const;

// Account lives behind this, one tap from the top of every tab.
function SettingsButton() {
  return (
    <Pressable
      onPress={() => router.push('/settings')}
      accessibilityLabel="Settings"
      accessibilityRole="button"
      hitSlop={12}
    >
      <Ionicons name="person-circle-outline" size={28} color={colors.ink} />
    </Pressable>
  );
}

export function TabStack({ screen, title }: { screen: string; title: string }) {
  return (
    <Stack screenOptions={stackChrome}>
      <Stack.Screen name={screen} options={{ title, headerLargeTitleEnabled: true, headerRight: SettingsButton }} />
    </Stack>
  );
}
