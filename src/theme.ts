// Design tokens - the only place colours, type, radii and glass are defined.
// Direction: a private-bank ledger. Midnight ink for words and money, champagne
// brass for the few things you can tap, a serif for the numbers that matter, and
// liquid glass for every surface, floating over a warm ivory backdrop whose soft
// glows give the glass something to refract. Light mode only (app.json).
import { Platform, StyleSheet, type TextStyle, type ViewStyle } from 'react-native';

export const colors = {
  ink: '#0E1A2B',
  inkSoft: '#22324D',
  slate: '#556074',
  mist: '#8A93A4',
  line: 'rgba(14, 26, 43, 0.08)',
  paper: '#F5F1E8',
  card: '#FFFFFF',
  brass: '#9C7A34',
  brassBright: '#C9A45C',
  brassSoft: 'rgba(201, 164, 92, 0.16)',
  gain: '#1E7550',
  danger: '#A3322D',
  dangerSoft: 'rgba(163, 50, 45, 0.08)',
  /** Text on the midnight hero surface. */
  onInk: '#FFFFFF',
  onInkMuted: 'rgba(255, 255, 255, 0.66)',
  onInkDanger: '#F4B4AF',
} as const;

/** What a glass surface falls back to when liquid glass or blur is unavailable. */
export const glass = {
  /** Fallback fill over the backdrop: frosted, not opaque. */
  fill: 'rgba(255, 255, 255, 0.62)',
  /** Fallback when Reduce Transparency is on: solid, per Apple's guidance. */
  solid: colors.card,
  rim: 'rgba(255, 255, 255, 0.9)',
  /** Tints for coloured glass: selected chips and the primary action. */
  brassTint: 'rgba(201, 164, 92, 0.28)',
  inkTint: 'rgba(14, 26, 43, 0.88)',
} as const;

/** Ivory with a champagne glow top-left and a midnight haze bottom-right. */
export const backdrop: ViewStyle = {
  backgroundColor: colors.paper,
  experimental_backgroundImage: [
    'radial-gradient(circle at 0% 0%, rgba(214, 178, 106, 0.38) 0%, rgba(214, 178, 106, 0) 55%)',
    'radial-gradient(circle at 100% 100%, rgba(34, 50, 77, 0.20) 0%, rgba(34, 50, 77, 0) 60%)',
    'radial-gradient(circle at 100% 18%, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0) 45%)',
  ].join(', '),
};

export const radius = { card: 22, control: 16, pill: 999 } as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;

/**
 * Display serif, embedded at build time by the expo-font plugin (app.json). iOS
 * resolves it by PostScript name, Android by file name.
 */
export const serif = {
  semibold: Platform.select({ ios: 'PlayfairDisplay-SemiBold', default: 'PlayfairDisplay_600SemiBold' }),
  bold: Platform.select({ ios: 'PlayfairDisplay-Bold', default: 'PlayfairDisplay_700Bold' }),
} as const;

/** Type scale: serif for display and headings, system sans for everything you read in a row. */
export const type = {
  display: { fontFamily: serif.bold, fontSize: 34, color: colors.ink, letterSpacing: -0.4 },
  title: { fontFamily: serif.semibold, fontSize: 22, color: colors.ink },
  section: { fontFamily: serif.semibold, fontSize: 19, color: colors.ink },
  body: { fontSize: 16, color: colors.ink },
  label: { fontSize: 14, color: colors.slate },
  /** Small caps-style section label above a group of fields or cards. */
  eyebrow: { fontSize: 12, fontWeight: '600', color: colors.slate, letterSpacing: 0.8, textTransform: 'uppercase' },
  hint: { fontSize: 13, color: colors.mist },
} as const satisfies Record<string, TextStyle>;

/** Money is always set in tabular figures so a column of amounts lines up like a ledger. */
export const money: TextStyle = { fontVariant: ['tabular-nums'], fontWeight: '600', fontSize: 16, color: colors.ink };

/** Headline money: the serif, still tabular, for the one number a screen is about. */
export const moneyDisplay: TextStyle = {
  fontFamily: serif.bold,
  fontVariant: ['tabular-nums'],
  fontSize: 42,
  color: colors.ink,
  letterSpacing: -0.6,
};

/** Shared navigator chrome: transparent so the backdrop and glass show through. */
export const navigation = {
  headerTitleStyle: { fontFamily: serif.semibold, fontSize: 18, color: colors.ink },
  headerLargeTitleStyle: { fontFamily: serif.bold, color: colors.ink },
  contentStyle: backdrop,
} as const;

/** Shared building blocks; screens compose these instead of re-declaring them. */
export const ui = StyleSheet.create({
  // The navigator paints the backdrop; screens stay transparent over it.
  screen: { flex: 1, backgroundColor: 'transparent' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(14, 26, 43, 0.14)',
    borderRadius: radius.control,
    borderCurve: 'continuous',
    backgroundColor: 'rgba(255, 255, 255, 0.72)',
    paddingHorizontal: space.lg,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.ink,
  },
  link: { color: colors.brass, fontSize: 14, fontWeight: '600' },
  label: { ...type.eyebrow, marginTop: space.lg, marginBottom: space.sm, marginLeft: space.xs },
  error: { color: colors.danger, fontSize: 13, marginTop: space.xs },
  empty: { textAlign: 'center', color: colors.mist, marginTop: 40, fontSize: 15 },
});
