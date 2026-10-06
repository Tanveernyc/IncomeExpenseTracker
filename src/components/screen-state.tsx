// Whole-screen loading and error states. Headers are transparent glass, so these
// sit in a scroll view that insets itself below the header like every screen does.
import { ActivityIndicator, ScrollView, StyleSheet, Text } from 'react-native';
import { colors, space, ui } from '@/theme';

export function ScreenLoading() {
  return (
    <ScrollView style={ui.screen} contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
      <ActivityIndicator color={colors.brass} />
    </ScrollView>
  );
}

export function ScreenError({ message }: { message: string }) {
  return (
    <ScrollView style={ui.screen} contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
      <Text style={styles.error} selectable>
        {message}
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: space.xl, alignItems: 'center' },
  error: { ...ui.error, fontSize: 15, textAlign: 'center' },
});
