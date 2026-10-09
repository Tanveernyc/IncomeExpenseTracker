// Settings — everything that is about the account rather than the money.
// These used to sit in a button block on the Dashboard, where five unrelated
// actions competed with the data and "Delete account" was one tap from home.
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSession } from '@/components/session-provider';
import { supabase } from '@/db/supabase';
import { GlassSurface, tapFeedback } from '@/components/glass';
import { colors, radius, rhythm, serif, space, type } from '@/theme';

const SUPPORT_EMAIL = 'support@trueorganichub.com';
const SUPPORT_URL = 'https://tanveernyc.github.io/PropertyLedger/support.html';
const PRIVACY_URL = 'https://tanveernyc.github.io/PropertyLedger/privacy.html';
const TERMS_URL = 'https://tanveernyc.github.io/PropertyLedger/terms.html';

/** Email first; if no mail app is set up, fall back to the support page. */
async function contactSupport() {
  const mailto = `mailto:${SUPPORT_EMAIL}?subject=Income%20Expense%20Tracker%20support`;
  if (await Linking.canOpenURL(mailto)) return Linking.openURL(mailto);
  return Linking.openURL(SUPPORT_URL);
}

export default function SettingsScreen() {
  const { session } = useSession();
  const email = session?.user.email ?? '';

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} contentInsetAdjustmentBehavior="automatic">
      <GlassSurface style={styles.identity}>
        <View style={styles.avatar}>
          <Text style={styles.avatarLetter}>{(email[0] ?? '?').toUpperCase()}</Text>
        </View>
        <View style={styles.identityText}>
          <Text style={styles.identityLabel}>Signed in as</Text>
          <Text style={styles.identityEmail} numberOfLines={1}>
            {email}
          </Text>
        </View>
      </GlassSurface>

      <Section title="Your ledger">
        <Row icon="pricetags-outline" label="Categories" onPress={() => router.push('/categories')} />
        <Row icon="download-outline" label="Export data" onPress={() => router.push('/export')} last />
      </Section>

      <Section title="Help">
        <Row
          icon="help-buoy-outline"
          label="Contact support"
          trailing="external"
          onPress={contactSupport}
        />
        <Row
          icon="shield-checkmark-outline"
          label="Privacy Policy"
          trailing="external"
          onPress={() => Linking.openURL(PRIVACY_URL)}
        />
        <Row
          icon="document-text-outline"
          label="Terms of Use"
          trailing="external"
          onPress={() => Linking.openURL(TERMS_URL)}
          last
        />
      </Section>

      <Section>
        {/* No chevron: this acts here rather than opening anything. */}
        <Row icon="log-out-outline" label="Sign out" trailing="none" onPress={() => supabase.auth.signOut()} last />
      </Section>

      {/* Findable, as the App Store requires, but never competing with the rest. */}
      <Pressable
        style={styles.deleteLink}
        onPress={() => router.push('/delete-account')}
        accessibilityRole="button"
      >
        <Text style={styles.deleteText}>Delete account</Text>
      </Pressable>
    </ScrollView>
  );
}

function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      {title ? <Text style={styles.sectionTitle}>{title}</Text> : null}
      <GlassSurface style={styles.group}>{children}</GlassSurface>
    </View>
  );
}

function Row({
  icon,
  label,
  onPress,
  last = false,
  trailing = 'chevron',
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  last?: boolean;
  trailing?: 'chevron' | 'external' | 'none';
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={() => {
        tapFeedback();
        onPress();
      }}
      accessibilityRole="button"
    >
      <Ionicons name={icon} size={20} color={colors.brass} />
      {/* The divider lives on this inner view so it starts at the label, not the icon. */}
      <View style={[styles.rowBody, !last && styles.rowBodyDivided]}>
        <Text style={styles.rowLabel}>{label}</Text>
        {trailing === 'chevron' ? (
          <Ionicons name="chevron-forward" size={18} color={colors.mist} />
        ) : trailing === 'external' ? (
          <Ionicons name="open-outline" size={16} color={colors.mist} />
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingVertical: space.lg, paddingBottom: 48 },

  // Who you are, stated once and properly — not a stray line of grey text.
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    marginHorizontal: space.lg,
    padding: space.lg,
    marginBottom: rhythm.section,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarLetter: { color: colors.brassBright, fontSize: 20, fontFamily: serif.bold },
  identityText: { flex: 1 },
  identityLabel: { ...type.hint },
  identityEmail: { ...type.body, fontWeight: '600', marginTop: 1 },

  section: { marginBottom: rhythm.section },
  sectionTitle: {
    ...type.eyebrow,
    marginBottom: rhythm.item,
    paddingHorizontal: space.lg,
  },
  // One pane of glass per group, rows ruled inside it.
  group: { marginHorizontal: space.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingLeft: space.lg,
    borderRadius: radius.card,
  },
  rowPressed: { backgroundColor: 'rgba(14, 26, 43, 0.04)' },
  rowBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 52,
    paddingRight: space.lg,
  },
  rowBodyDivided: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  rowLabel: { ...type.body, flex: 1 },

  deleteLink: { alignSelf: 'center', paddingVertical: space.md, paddingHorizontal: space.lg },
  deleteText: { ...type.label, color: colors.danger, fontWeight: '600' },
});
