// Shared ledger create/edit form. Property or Budget is the master choice; a
// property then picks its subtype (rental, primary residence, investment, flip).
// The caller supplies initial values and receives the validated NewProperty payload.
import { Ionicons } from '@expo/vector-icons';
import { useState, type ComponentProps, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { LedgerKind, NewProperty, Property, PropertySubtype } from '@/types';
import { colors, glass, radius, space, type, ui } from '@/theme';
import {
  PROPERTY_SUBTYPES,
  parsePriceInput,
  validateProperty,
  type PropertyValidation,
} from '@/lib/property-validation';
import { nounFor, propertySubtypeHint, propertySubtypeLabel } from '@/lib/ledger-copy';
import { DateField } from './date-field';
import { GlassButton, GlassPressable, GlassSegmented, GlassSurface } from './glass';

interface Props {
  /** Existing ledger when editing; undefined when creating. */
  initial?: Property;
  /** Called with a validated payload; the caller performs the insert/update. */
  onSubmit: (values: NewProperty) => void;
  submitting: boolean;
  /** Fixed text, or a function of the currently selected kind ("Create Property" / "Create Household"). */
  submitLabel: string | ((kind: LedgerKind) => string);
  /** Rendered under the submit button, inside the scroll view (e.g. Archive). */
  footer?: ReactNode;
}

const KIND_OPTIONS = [
  { value: 'property', label: 'Property' },
  { value: 'budget', label: 'Household' },
] as const;

const SUBTYPE_ICONS: Record<PropertySubtype, ComponentProps<typeof Ionicons>['name']> = {
  rental: 'key-outline',
  primary_residence: 'home-outline',
  investment: 'trending-up-outline',
  flip: 'hammer-outline',
};

export function PropertyForm({ initial, onSubmit, submitting, submitLabel, footer }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [ledgerKind, setLedgerKind] = useState<LedgerKind>(initial?.ledger_kind ?? 'property');
  const [subtype, setSubtype] = useState<PropertySubtype>(initial?.property_subtype ?? 'rental');
  const [address, setAddress] = useState(initial?.address ?? '');
  const [purchaseDate, setPurchaseDate] = useState(initial?.purchase_date ?? '');
  const [priceText, setPriceText] = useState(
    initial?.purchase_price != null ? String(initial.purchase_price) : ''
  );
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [errors, setErrors] = useState<PropertyValidation['errors'] & { price?: string }>({});

  const isProperty = ledgerKind === 'property';
  const resolvedSubmitLabel = typeof submitLabel === 'function' ? submitLabel(ledgerKind) : submitLabel;

  const submit = () => {
    const validation = validateProperty({ name, ledger_kind: ledgerKind });
    const price = parsePriceInput(priceText);
    const nextErrors: typeof errors = { ...validation.errors };
    // Price is only validated for a property; a budget hides the field.
    if (isProperty && price === undefined) nextErrors.price = 'Price must be a positive number.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    // Spec §4.2: switching a ledger to a budget hides the property fields but
    // never clears them, so the values are sent from state regardless of kind.
    // Budget + unparseable non-empty text keeps whatever was stored.
    const purchasePrice =
      price !== undefined ? price : priceText.trim() === '' ? null : initial?.purchase_price ?? null;

    onSubmit({
      name: name.trim(),
      ledger_kind: ledgerKind,
      property_subtype: isProperty ? subtype : null,
      address: address.trim() || null,
      purchase_date: purchaseDate.trim() || null,
      purchase_price: purchasePrice,
      notes: notes.trim() || null,
    });
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      // Scroll the focused field (and the Save button) above the keyboard instead of hiding them.
      automaticallyAdjustKeyboardInsets
      keyboardDismissMode="interactive"
    >
      <GlassSegmented options={KIND_OPTIONS} value={ledgerKind} onChange={setLedgerKind} />
      {errors.ledger_kind ? <Text style={styles.error}>{errors.ledger_kind}</Text> : null}

      {isProperty ? (
        <>
          <Text style={styles.label}>Property type</Text>
          <View style={styles.subtypeGrid}>
            {PROPERTY_SUBTYPES.map((value) => {
              const selected = subtype === value;
              return (
                <GlassPressable
                  key={value}
                  onPress={() => setSubtype(value)}
                  tint={selected ? glass.brassTint : undefined}
                  style={[styles.subtypeTile, selected && styles.subtypeTileSelected]}
                  contentStyle={styles.subtypeContent}
                  accessibilityLabel={propertySubtypeLabel(value)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                >
                  <View style={[styles.subtypeIcon, selected && styles.subtypeIconSelected]}>
                    <Ionicons
                      name={SUBTYPE_ICONS[value] ?? 'business-outline'}
                      size={18}
                      color={selected ? colors.onInk : colors.ink}
                    />
                  </View>
                  <Text style={styles.subtypeTitle}>{propertySubtypeLabel(value)}</Text>
                  <Text style={styles.subtypeHint}>{propertySubtypeHint(value)}</Text>
                </GlassPressable>
              );
            })}
          </View>
        </>
      ) : null}

      <Text style={styles.label}>Details</Text>
      <GlassSurface style={styles.section}>
        <Field label="Name" required>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder={isProperty ? 'e.g. 12 Maple St' : 'e.g. Household'}
            placeholderTextColor={colors.mist}
            accessibilityLabel={`${nounFor(ledgerKind).one} name`}
          />
        </Field>
        {errors.name ? <Text style={styles.error}>{errors.name}</Text> : null}

        {isProperty ? (
          <Field label="Address">
            <TextInput
              style={styles.input}
              value={address}
              onChangeText={setAddress}
              placeholder="Street, city, state"
              placeholderTextColor={colors.mist}
            />
          </Field>
        ) : null}
      </GlassSurface>

      {isProperty ? (
        <>
          <Text style={styles.label}>Purchase</Text>
          <GlassSurface style={styles.section}>
            <View style={styles.pair}>
              <View style={styles.pairItem}>
                <Field label="Date">
                  <DateField
                    value={purchaseDate}
                    onChange={setPurchaseDate}
                    placeholder="Add date"
                    clearable
                    accessibilityLabel="Purchase date"
                  />
                </Field>
              </View>
              <View style={styles.pairItem}>
                <Field label="Price ($)">
                  <TextInput
                    style={styles.input}
                    value={priceText}
                    onChangeText={setPriceText}
                    placeholder="250000"
                    placeholderTextColor={colors.mist}
                    keyboardType="decimal-pad"
                    accessibilityLabel="Purchase price"
                  />
                </Field>
              </View>
            </View>
            {errors.price ? <Text style={styles.error}>{errors.price}</Text> : null}
          </GlassSurface>
        </>
      ) : null}

      <Text style={styles.label}>Notes</Text>
      <GlassSurface style={styles.section}>
        <TextInput
          style={[styles.input, styles.notes]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Anything worth remembering"
          placeholderTextColor={colors.mist}
          multiline
          accessibilityLabel="Notes"
        />
      </GlassSurface>

      <GlassButton
        label={submitting ? 'Saving…' : resolvedSubmitLabel}
        onPress={submit}
        disabled={submitting}
        style={styles.button}
      />
      {footer}
    </ScrollView>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>
        {label}
        {required ? <Text style={styles.required}> *</Text> : null}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: space.lg, gap: space.sm, paddingBottom: 56 },
  label: { ...ui.label },
  section: { padding: space.md, gap: space.md },
  field: { gap: 6 },
  fieldLabel: { ...type.hint, fontSize: 13, fontWeight: '500', color: colors.slate, marginLeft: space.xs },
  required: { color: colors.brass },
  input: { ...ui.input },
  notes: { minHeight: 96, textAlignVertical: 'top' },
  pair: { flexDirection: 'row', gap: space.md },
  pairItem: { flex: 1 },
  subtypeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  subtypeTile: { flexBasis: '47%', flexGrow: 1, borderRadius: radius.card },
  subtypeTileSelected: { boxShadow: `0 0 0 1.5px ${colors.brassBright}` },
  subtypeContent: { padding: space.lg, gap: 4, minHeight: 116 },
  subtypeIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(14, 26, 43, 0.06)',
    marginBottom: space.sm,
  },
  subtypeIconSelected: { backgroundColor: colors.ink },
  subtypeTitle: { ...type.body, fontWeight: '600' },
  subtypeHint: { ...type.hint, fontSize: 12 },
  error: { ...ui.error, marginLeft: space.xs },
  button: { marginTop: space.xl },
});
