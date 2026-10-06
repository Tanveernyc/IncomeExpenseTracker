// Ask for an App Store rating once the user has gotten real value: their fifth
// saved entry. Ratings count drives search ranking. Apple decides whether the
// sheet actually shows (at most three times a year, never on TestFlight), so
// this only has to pick a good moment and never ask twice.
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';

const COUNT_KEY = 'review:saved-entry-count';
export const REVIEW_AFTER_ENTRIES = 5;

/** True exactly when this save is the one that crosses the threshold. */
export function shouldAskForReview(savedCount: number): boolean {
  return savedCount === REVIEW_AFTER_ENTRIES;
}

/** Count a saved entry; on the fifth, ask the system for a rating. Never throws. */
export async function recordSavedEntry(): Promise<void> {
  try {
    const count = Number(await AsyncStorage.getItem(COUNT_KEY)) + 1;
    await AsyncStorage.setItem(COUNT_KEY, String(count));
    if (shouldAskForReview(count) && (await StoreReview.isAvailableAsync())) {
      await StoreReview.requestReview();
    }
  } catch {
    // A rating prompt is never worth surfacing an error over.
  }
}
