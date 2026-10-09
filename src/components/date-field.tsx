// A date (or month) field backed by the platform's own picker: SwiftUI's compact
// DatePicker on iOS (tap for the calendar popover), the Material date dialog on
// Android. Values stay the app's ISO strings end to end: 'YYYY-MM-DD', or
// 'YYYY-MM' with granularity="month" (the picker shows the 1st; its day is dropped).
import { Ionicons } from '@expo/vector-icons';
import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { formatDateLabel, isoToPickerDate, pickerDateToISO, todayISO } from '@/lib/dates';
import { colors, space, ui } from '@/theme';
import { tapFeedback } from './glass';

interface Props {
  /** '' when unset. */
  value: string;
  onChange: (value: string) => void;
  granularity?: 'day' | 'month';
  /** Shown while empty, e.g. "Add date". */
  placeholder?: string;
  /** Optional fields get a clear button; required ones cannot be emptied. */
  clearable?: boolean;
  accessibilityLabel: string;
  testID?: string;
  /** Layout only, e.g. flex: 1 when two fields share a row. */
  style?: StyleProp<ViewStyle>;
}

export function DateField({
  value,
  onChange,
  granularity = 'day',
  placeholder = 'Add date',
  clearable = false,
  accessibilityLabel,
  testID,
  style,
}: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const date = isoToPickerDate(value);

  const emit = (picked: Date) => {
    const iso = pickerDateToISO(picked);
    onChange(granularity === 'month' ? iso.slice(0, 7) : iso);
  };

  const clearButton =
    clearable && value ? (
      <Pressable
        onPress={() => {
          tapFeedback();
          onChange('');
        }}
        hitSlop={10}
        accessibilityLabel={`Clear ${accessibilityLabel}`}
        accessibilityRole="button"
      >
        <Ionicons name="close-circle" size={20} color={colors.mist} />
      </Pressable>
    ) : null;

  // iOS: the compact picker is its own control, so it sits in the field as-is.
  // It cannot be empty, so an unset field is a button that starts it at today.
  if (process.env.EXPO_OS === 'ios' && date) {
    return (
      <View style={[styles.field, style]} testID={testID} accessibilityLabel={accessibilityLabel}>
        <Ionicons name="calendar-outline" size={18} color={colors.brass} />
        <DateTimePicker
          value={date}
          onValueChange={(_, picked) => emit(picked)}
          display="compact"
          accentColor={colors.brass}
          themeVariant="light"
          style={styles.compactPicker}
        />
        {clearButton}
      </View>
    );
  }

  const open = () => {
    tapFeedback();
    if (process.env.EXPO_OS === 'ios') emit(new Date());
    else setDialogOpen(true);
  };

  return (
    <>
      <Pressable
        style={[styles.field, style]}
        onPress={open}
        testID={testID}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        accessibilityValue={{ text: value ? formatDateLabel(value) : 'Not set' }}
      >
        <Ionicons name="calendar-outline" size={18} color={colors.brass} />
        <Text style={value ? styles.value : styles.placeholder}>{value ? formatDateLabel(value) : placeholder}</Text>
        {clearButton}
      </Pressable>
      {dialogOpen ? (
        // Android: the dialog opens on mount and reports once; unmount either way.
        <DateTimePicker
          value={date ?? isoToPickerDate(todayISO())!}
          presentation="dialog"
          onValueChange={(_, picked) => {
            setDialogOpen(false);
            emit(picked);
          }}
          onDismiss={() => setDialogOpen(false)}
          accentColor={colors.brass as string}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    ...ui.input,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  // Sits next to the icon like typed text, not centred in the field. The native
  // capsule's font cannot be set, so it is scaled down to read at body size; the
  // margin pulls it back beside the icon after the scale shrinks it inward.
  compactPicker: { width: 140, height: 36, transform: [{ scale: 0.86 }], marginLeft: -12 },
  value: { flex: 1, fontSize: 16, color: colors.ink },
  placeholder: { flex: 1, fontSize: 16, color: colors.mist },
});
