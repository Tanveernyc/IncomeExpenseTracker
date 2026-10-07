// Liquid glass primitives - every surface in the app is one of these.
// iOS 26+: real liquid glass (expo-glass-effect). Older iOS: a frosted blur.
// Android/web: a translucent fill. Reduce Transparency on: a solid card, which
// is what Apple asks for. Never clip a GlassView or animate its opacity; glass
// clips itself by borderRadius and loses the effect at opacity 0.
import { BlurView } from 'expo-blur';
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { useEffect, useState, type ReactNode } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type AccessibilityRole,
  type ColorValue,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colors, glass, radius, space } from '@/theme';

function detectLiquidGlass(): boolean {
  if (process.env.EXPO_OS !== 'ios') return false;
  try {
    return isLiquidGlassAvailable() && isGlassEffectAPIAvailable();
  } catch {
    return false;
  }
}

const LIQUID_GLASS = detectLiquidGlass();

function useReduceTransparency(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceTransparencyEnabled()
      .then((value) => mounted && setReduced(value))
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceTransparencyChanged', setReduced);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);
  return reduced;
}

/** iOS-only tap feedback; a no-op elsewhere. */
export function tapFeedback() {
  if (process.env.EXPO_OS === 'ios') Haptics.selectionAsync().catch(() => {});
}

interface SurfaceProps {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** Native press response (the glass flexes under the finger). Controls only. */
  interactive?: boolean;
  /** Coloured glass: selected chips, the primary action. */
  tint?: ColorValue;
  testID?: string;
}

/** A pane of glass. Content goes inside; size and padding come from `style`. */
export function GlassSurface({ children, style, interactive, tint, testID }: SurfaceProps) {
  const reduced = useReduceTransparency();
  const shape: ViewStyle = { borderRadius: radius.card, borderCurve: 'continuous' };

  if (reduced) {
    return (
      <View testID={testID} style={[shape, styles.solid, tint ? { backgroundColor: tint } : null, style]}>
        {children}
      </View>
    );
  }
  if (LIQUID_GLASS) {
    return (
      <GlassView
        testID={testID}
        glassEffectStyle="regular"
        colorScheme="light"
        isInteractive={interactive}
        tintColor={tint}
        style={[shape, style]}
      >
        {children}
      </GlassView>
    );
  }
  if (process.env.EXPO_OS === 'ios') {
    return (
      <BlurView
        testID={testID}
        tint="systemThinMaterialLight"
        intensity={80}
        style={[shape, styles.frost, tint ? { backgroundColor: tint } : null, style, styles.clip]}
      >
        {children}
      </BlurView>
    );
  }
  return (
    <View testID={testID} style={[shape, styles.frost, { backgroundColor: tint ?? glass.fill }, style]}>
      {children}
    </View>
  );
}

interface PressableGlassProps extends SurfaceProps {
  onPress?: () => void;
  disabled?: boolean;
  /** Padding and layout of the tappable content. */
  contentStyle?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  accessibilityRole?: AccessibilityRole;
  accessibilityState?: { selected?: boolean; disabled?: boolean };
}

/** A glass card or control you can tap: interactive glass with a Pressable filling it. */
export function GlassPressable({
  onPress,
  disabled,
  contentStyle,
  children,
  accessibilityLabel,
  accessibilityRole = 'button',
  accessibilityState,
  testID,
  ...surface
}: PressableGlassProps) {
  // testID goes on the Pressable: it is what tests and UI automation press.
  return (
    <GlassSurface interactive={!disabled} {...surface}>
      <Pressable
        testID={testID}
        onPress={() => {
          tapFeedback();
          onPress?.();
        }}
        disabled={disabled}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole={accessibilityRole}
        accessibilityState={{ disabled, ...accessibilityState }}
        // Liquid glass answers the press itself; fallbacks dim the content instead.
        style={({ pressed }) => [contentStyle, pressed && !LIQUID_GLASS && styles.pressed]}
      >
        {children}
      </Pressable>
    </GlassSurface>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'destructive';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  testID?: string;
  /** Optional leading element, e.g. a provider logo. */
  icon?: ReactNode;
}

const BUTTON_TINT: Record<ButtonVariant, ColorValue | undefined> = {
  primary: glass.inkTint,
  secondary: undefined,
  destructive: colors.dangerSoft,
};

const BUTTON_TEXT: Record<ButtonVariant, ColorValue> = {
  primary: colors.onInk,
  secondary: colors.ink,
  destructive: colors.danger,
};

/** Capsule glass button. Primary is midnight glass; secondary is clear glass. */
export function GlassButton({
  label,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  accessibilityLabel,
  style,
  testID,
  icon,
}: ButtonProps) {
  return (
    <GlassPressable
      testID={testID}
      onPress={onPress}
      disabled={disabled || loading}
      tint={BUTTON_TINT[variant]}
      accessibilityLabel={accessibilityLabel ?? label}
      style={[{ borderRadius: radius.pill }, disabled && styles.disabled, style]}
      contentStyle={styles.button}
    >
      {loading ? (
        <ActivityIndicator color={BUTTON_TEXT[variant]} />
      ) : (
        <View style={styles.buttonRow}>
          {icon}
          <Text style={[styles.buttonText, { color: BUTTON_TEXT[variant] }]}>{label}</Text>
        </View>
      )}
    </GlassPressable>
  );
}

interface ChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
  /** Optional leading element, e.g. an icon. */
  icon?: ReactNode;
}

/** A selectable glass capsule; selected chips are champagne-tinted glass. */
export function GlassChip({ label, selected, onPress, accessibilityLabel, icon }: ChipProps) {
  return (
    <GlassPressable
      onPress={onPress}
      tint={selected ? glass.brassTint : undefined}
      style={[{ borderRadius: radius.pill }, selected && styles.chipSelected]}
      contentStyle={styles.chip}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected }}
    >
      {icon}
      <Text style={selected ? styles.chipTextSelected : styles.chipText}>{label}</Text>
    </GlassPressable>
  );
}

interface SegmentedProps<T extends string> {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
}

/** A glass track with a midnight thumb on the selected option. */
export function GlassSegmented<T extends string>({ options, value, onChange, style }: SegmentedProps<T>) {
  return (
    <GlassSurface style={[styles.segmentTrack, style]}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => {
              if (!selected) tapFeedback();
              onChange(option.value);
            }}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            style={[styles.segment, selected && styles.segmentSelected]}
          >
            <Text style={selected ? styles.segmentTextSelected : styles.segmentText}>{option.label}</Text>
          </Pressable>
        );
      })}
    </GlassSurface>
  );
}

const styles = StyleSheet.create({
  solid: {
    backgroundColor: glass.solid,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
  },
  frost: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: glass.rim,
    boxShadow: '0 10px 30px rgba(14, 26, 43, 0.08)',
  },
  clip: { overflow: 'hidden' },
  pressed: { opacity: 0.6 },
  disabled: { opacity: 0.5 },
  button: {
    minHeight: 54,
    paddingHorizontal: space.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  buttonText: { fontSize: 16, fontWeight: '600', letterSpacing: 0.3 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  chipSelected: { boxShadow: `0 0 0 1px ${colors.brassBright}` },
  chipText: { color: colors.slate, fontSize: 14, fontWeight: '500' },
  chipTextSelected: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  segmentTrack: { flexDirection: 'row', padding: 4, borderRadius: radius.pill },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 11,
    borderRadius: radius.pill,
  },
  segmentSelected: { backgroundColor: colors.ink },
  segmentText: { color: colors.slate, fontSize: 15, fontWeight: '500' },
  segmentTextSelected: { color: colors.onInk, fontSize: 15, fontWeight: '600' },
});
