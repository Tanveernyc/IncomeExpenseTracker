import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable } from 'react-native';
import { TabStack } from '@/components/tab-stack';
import { colors } from '@/theme';

export default function HomeStack() {
  return (
    <TabStack
      screen="index"
      title="Dashboard"
      // Account lives behind this, off the Dashboard itself.
      headerRight={() => (
        <Pressable
          onPress={() => router.push('/settings')}
          accessibilityLabel="Settings"
          accessibilityRole="button"
          hitSlop={12}
        >
          <Ionicons name="person-circle-outline" size={28} color={colors.ink} />
        </Pressable>
      )}
    />
  );
}
