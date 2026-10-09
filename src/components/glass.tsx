// Liquid glass primitives - every surface in the app is one of these.
// iOS 26+: real liquid glass (expo-glass-effect). Older iOS: a frosted blur.
// Android/web: a translucent fill. Reduce Transparency on: a solid card, which
// is what Apple asks for. Never clip a GlassView or animate its opacity; glass
// clips itself by borderRadius and loses the effect at opacity 0.
import { BlurView } from 'expo-blur';
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
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
import { colors, glass, radius, rhythm, space } from '@/theme';

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

/**
 * A glass track with a midnight thumb on the selected option. Built to feel like
 * the old slide to unlock: the thumb lifts under your finger, follows it 1:1,
 * resists past the ends, ticks as it crosses into the other option, and lands
 * with a soft bounce, a tap and a glint. A plain tap glides it over too.
 */
export function GlassSegmented<T extends string>({ options, value, onChange, style }: SegmentedProps<T>) {
  const [trackWidth, setTrackWidth] = useState(0);
  const segmentWidth = trackWidth > 0 ? (trackWidth - SEGMENT_INSET * 2) / options.length : 0;
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const offset = useSharedValue(0);
  const dragStart = useSharedValue(0);
  const lastSegment = useSharedValue(0);
  const lift = useSharedValue(1);
  const stretch = useSharedValue(1);
  const glint = useSharedValue(0);
  const placed = useRef(false);

  // Follow the selection however it changed: a tap, a drag, or the parent. The
  // first placement jumps, so the thumb never slides in as a screen opens.
  useEffect(() => {
    if (segmentWidth === 0) return;
    const target = index * segmentWidth;
    if (placed.current) {
      offset.set(withSpring(target, SEGMENT_SPRING));
      glint.set(0);
      glint.set(withDelay(140, withTiming(1, { duration: 700, easing: Easing.out(Easing.quad) })));
    } else {
      offset.set(target);
      placed.current = true;
    }
  }, [index, segmentWidth, offset, glint]);

  const choose = (i: number) => {
    const option = options[i];
    if (option.value !== value) onChange(option.value);
  };
  const tapped = (i: number) => {
    if (i !== index) tapFeedback();
    choose(i);
  };
  // Letting go is the "unlock" moment, so it gets a firmer tap than a tick.
  const landed = (i: number) => {
    landFeedback();
    choose(i);
  };

  // Horizontal only, so a vertical scroll that starts on the control still scrolls.
  const pan = Gesture.Pan()
    .activeOffsetX([-8, 8])
    .failOffsetY([-10, 10])
    .onStart(() => {
      dragStart.set(offset.get());
      lastSegment.set(Math.round(offset.get() / Math.max(segmentWidth, 1)));
      lift.set(withSpring(1.04, LIFT_SPRING));
    })
    .onUpdate((e) => {
      const max = segmentWidth * (options.length - 1);
      const raw = dragStart.get() + e.translationX;
      // Past either end the thumb gives a little, like pulling against a spring.
      const resisted = raw < 0 ? raw * 0.2 : raw > max ? max + (raw - max) * 0.2 : raw;
      offset.set(resisted);
      // Moving fast, the thumb stretches along its path, like a drop of glass.
      stretch.set(1 + Math.min(Math.abs(e.velocityX) / 5000, 0.1));
      const segment = Math.min(options.length - 1, Math.max(0, Math.round(resisted / Math.max(segmentWidth, 1))));
      if (segment !== lastSegment.get()) {
        lastSegment.set(segment);
        scheduleOnRN(tapFeedback);
      }
    })
    .onEnd((e) => {
      lift.set(withSpring(1, LIFT_SPRING));
      stretch.set(withSpring(1, LIFT_SPRING));
      if (segmentWidth === 0) return;
      // A quick flick counts even if the thumb has not crossed halfway.
      const projected = offset.get() + e.velocityX * 0.1;
      const target = Math.min(options.length - 1, Math.max(0, Math.round(projected / segmentWidth)));
      offset.set(withSpring(target * segmentWidth, { ...SEGMENT_SPRING, velocity: e.velocityX }));
      scheduleOnRN(landed, target);
    });

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: offset.get() },
      { scaleX: lift.get() * stretch.get() },
      { scaleY: lift.get() / Math.sqrt(stretch.get()) },
    ],
  }));
  const glintStyle = useAnimatedStyle(() => {
    const g = glint.get();
    return {
      opacity: g > 0 && g < 1 ? Math.sin(g * Math.PI) * 0.9 : 0,
      transform: [{ translateX: -segmentWidth * 0.6 + g * segmentWidth * 1.6 }, { skewX: '-20deg' }],
    };
  });

  return (
    <GestureDetector gesture={pan}>
      <GlassSurface style={[styles.segmentTrack, style]}>
        <View style={StyleSheet.absoluteFill} onLayout={(e) => setTrackWidth(e.nativeEvent.layout.width)} />
        {segmentWidth > 0 ? (
          <Animated.View style={[styles.segmentThumb, { width: segmentWidth }, thumbStyle]}>
            <Animated.View style={[styles.segmentGlint, { width: segmentWidth * 0.35 }, glintStyle]} />
          </Animated.View>
        ) : null}
        {options.map((option, i) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              onPress={() => tapped(i)}
              accessibilityRole="tab"
              accessibilityState={{ selected }}
              // Before the track is measured there is no thumb, so the option paints its own.
              style={[styles.segment, selected && segmentWidth === 0 && styles.segmentSelected]}
            >
              <SegmentLabel
                label={option.label}
                index={i}
                offset={offset}
                segmentWidth={segmentWidth}
                selected={selected}
              />
            </Pressable>
          );
        })}
      </GlassSurface>
    </GestureDetector>
  );
}

/** A label that turns white as the thumb slides under it, not only once it lands. */
function SegmentLabel({
  label,
  index,
  offset,
  segmentWidth,
  selected,
}: {
  label: string;
  index: number;
  offset: SharedValue<number>;
  segmentWidth: number;
  selected: boolean;
}) {
  const colorStyle = useAnimatedStyle(() => {
    if (segmentWidth === 0) return { color: selected ? colors.onInk : colors.slate };
    const distance = Math.min(1, Math.abs(offset.get() - index * segmentWidth) / segmentWidth);
    return { color: interpolateColor(distance, [0, 0.6], [colors.onInk, colors.slate]) };
  });
  return <Animated.Text style={[styles.segmentText, colorStyle]}>{label}</Animated.Text>;
}

/** The firmer tap for a thumb let go into place. */
function landFeedback() {
  if (process.env.EXPO_OS === 'ios') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

const SEGMENT_INSET = 4;
// A little underdamped, so a landing thumb settles with one soft bounce.
const SEGMENT_SPRING = { damping: 16, stiffness: 240, mass: 0.9 };
const LIFT_SPRING = { damping: 18, stiffness: 320 };

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
    // The same height as a field, so a row of chips keeps the form's rhythm.
    height: rhythm.field,
    paddingHorizontal: 16,
  },
  chipSelected: { boxShadow: `0 0 0 1px ${colors.brassBright}` },
  chipText: { color: colors.slate, fontSize: 15, fontWeight: '500' },
  chipTextSelected: { color: colors.ink, fontSize: 15, fontWeight: '700' },
  segmentTrack: { flexDirection: 'row', padding: SEGMENT_INSET, borderRadius: radius.pill },
  segmentThumb: {
    position: 'absolute',
    top: SEGMENT_INSET,
    bottom: SEGMENT_INSET,
    left: SEGMENT_INSET,
    borderRadius: radius.pill,
    borderCurve: 'continuous',
    backgroundColor: colors.ink,
    // Clips the glint to the thumb's capsule.
    overflow: 'hidden',
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 11,
    borderRadius: radius.pill,
  },
  segmentSelected: { backgroundColor: colors.ink },
  segmentText: { fontSize: 15, fontWeight: '600' },
  segmentGlint: {
    position: 'absolute',
    top: -4,
    bottom: -4,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
  },
});
