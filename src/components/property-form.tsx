// Shared property create/edit form (Phase 3). The caller supplies initial values
// and receives the validated NewProperty payload on save.
import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import type { NewProperty, Property, LedgerKind, PropertySubtype } from '@/types';
import { ui } from '@/theme';
import {
  PROPERTY_SUBTYPES,
  parsePriceInput,
  validateProperty,
  type PropertyValidation,
} from '@/lib/property-validation';
import { nounFor, propertySubtypeLabel } from '@/lib/ledger-copy';

interface Props {
  /** Existing property when editing; undefined when creating. */
  initial?: Property;
  /** Called with a validated payload; the caller performs the insert/update. */
  onSubmit: (values: NewProperty) => void;
  submitting: boolean;
  /** Fixed text, or a function of the currently selected kind ("Create Property" / "Create Budget"). */
  submitLabel: string | ((kind: LedgerKind) => string);
}

export function PropertyForm({ initial, onSubmit, submitting, submitLabel }: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [propertyType, setPropertyType] = useState<LedgerKind>(
    initial?.ledger_kind ?? 'property'
  );
  const [propertySubtype, setPropertySubtype] = useState<PropertySubtype>(
    initial?.property_subtype ?? 'rental'
  );
  const [address, setAddress] = useState(initial?.address ?? '');
  const [purchaseDate, setPurchaseDate] = useState(initial?.purchase_date ?? '');
  const [priceText, setPriceText] = useState(
    initial?.purchase_price != null ? String(initial.purchase_price) : ''
  );
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [errors, setErrors] = useState<PropertyValidation['errors'] & { price?: string }>({});

  const isRental = propertyType === 'property';
  const resolvedSubmitLabel = typeof submitLabel === 'function' ? submitLabel(propertyType) : submitLabel;

  // Editing a ledger whose use sits off the right edge would otherwise open with
  // an apparently unselected row. Scroll from the chip's own onLayout, which is
  // the first moment its position is known.
  const useRowRef = useRef<ScrollView>(null);
  const initialUse = useRef(initial?.property_subtype ?? 'rental').current;
  const didRevealUse = useRef(false);

  const submit = () => {
    const validation = validateProperty({ name, ledger_kind: propertyType });
    const price = parsePriceInput(priceText);
    const nextErrors: typeof errors = { ...validation.errors };
    // Price is only validated for rentals; a personal budget hides the field.
    if (isRental && price === undefined) nextErrors.price = 'Price must be a positive number.';
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    // Spec §4.2: switching a ledger to personal hides the property fields but
    // never clears them, so the values are sent from state regardless of kind.
    // Personal + unparseable non-empty text keeps whatever was stored.
    const purchasePrice =
      price !== undefined ? price : priceText.trim() === '' ? null : initial?.purchase_price ?? null;

    onSubmit({
      name: name.trim(),
      ledger_kind: propertyType,
      property_subtype: isRental ? propertySubtype : null,
      address: address.trim() || null,
      purchase_date: purchaseDate.trim() || null,
      purchase_price: purchasePrice,
      notes: notes.trim() || null,
    });
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      // Scroll the focused field (and the Save button) above the keyboard instead of hiding them.
      automaticallyAdjustKeyboardInsets
      keyboardDismissMode="interactive"
    >
      <Text style={styles.label}>Type *</Text>
      <ScrollView horizontal contentContainerStyle={styles.typeRow}>
        {(
          [
            ['property', 'Property'],
            ['budget', 'Budget'],
          ] as const
        ).map(([type, label]) => (
          <Pressable
            key={type}
            style={[styles.typeChip, propertyType === type && styles.typeChipActive]}
            onPress={() => setPropertyType(type)}
          >
            <Text style={propertyType === type ? styles.typeChipTextActive : styles.typeChipText}>{label}</Text>
          </Pressable>
        ))}
      </ScrollView>
      {errors.ledger_kind ? <Text style={styles.error}>{errors.ledger_kind}</Text> : null}

      <Text style={styles.label}>Name *</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder={propertyType === 'budget' ? 'e.g. Household' : 'e.g. 12 Maple St'}
        accessibilityLabel={`${nounFor(propertyType).one} name`}
      />
      {errors.name ? <Text style={styles.error}>{errors.name}</Text> : null}

      {isRental ? (
        <>
          <Text style={styles.label}>Property type</Text>
          <ScrollView ref={useRowRef} horizontal contentContainerStyle={styles.typeRow}>
            {PROPERTY_SUBTYPES.map((use) => (
              <Pressable
                key={use}
                style={[styles.typeChip, propertySubtype === use && styles.typeChipActive]}
                onPress={() => setPropertySubtype(use)}
                onLayout={({ nativeEvent }) => {
                  if (didRevealUse.current || use !== initialUse) return;
                  didRevealUse.current = true;
                  if (nativeEvent.layout.x > 0) {
                    useRowRef.current?.scrollTo({ x: nativeEvent.layout.x - 16, animated: false });
                  }
                }}
              >
                <Text style={propertySubtype === use ? styles.typeChipTextActive : styles.typeChipText}>
                  {propertySubtypeLabel(use)}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          <Text style={styles.label}>Address</Text>
          <TextInput
            style={styles.input}
            value={address}
            onChangeText={setAddress}
            placeholder="Street, city, state"
          />

          <Text style={styles.label}>Purchase date</Text>
          <TextInput
            style={styles.input}
            value={purchaseDate}
            onChangeText={setPurchaseDate}
            placeholder="YYYY-MM-DD"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Purchase price ($)</Text>
          <TextInput
            style={styles.input}
            value={priceText}
            onChangeText={setPriceText}
            placeholder="e.g. 250000"
            keyboardType="decimal-pad"
          />
          {errors.price ? <Text style={styles.error}>{errors.price}</Text> : null}
        </>
      ) : null}

      <Text style={styles.label}>Notes</Text>
      <TextInput
        style={[styles.input, styles.notes]}
        value={notes}
        onChangeText={setNotes}
        multiline
      />

      <Pressable style={styles.button} onPress={submit} disabled={submitting}>
        <Text style={styles.buttonText}>{submitting ? 'Saving…' : resolvedSubmitLabel}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, gap: 6, paddingBottom: 48 },
  label: { ...ui.label },
  input: { ...ui.input, fontSize: 16 },
  notes: { minHeight: 80, textAlignVertical: 'top' },
  typeRow: { gap: 8 },
  typeChip: { ...ui.chip, paddingHorizontal: 16 },
  typeChipActive: { ...ui.chipActive },
  typeChipText: { ...ui.chipText, fontSize: 14 },
  typeChipTextActive: { ...ui.chipTextActive, fontSize: 14 },
  error: { ...ui.error, fontSize: 13 },
  button: { ...ui.buttonPrimary, marginTop: 20 },
  buttonText: { ...ui.buttonPrimaryText },
});
