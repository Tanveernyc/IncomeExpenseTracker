// The rating prompt fires once, on the fifth saved entry, and never breaks a save.
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';
import { recordSavedEntry, shouldAskForReview } from '@/lib/review-prompt';

jest.mock('expo-store-review', () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  requestReview: jest.fn().mockResolvedValue(undefined),
}));

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

describe('shouldAskForReview', () => {
  it('is true only on the fifth entry', () => {
    expect([1, 4, 5, 6, 50].map(shouldAskForReview)).toEqual([false, false, true, false, false]);
  });
});

describe('recordSavedEntry', () => {
  it('asks once, on the fifth save', async () => {
    for (let i = 0; i < 7; i++) await recordSavedEntry();
    expect(StoreReview.requestReview).toHaveBeenCalledTimes(1);
  });

  it('does not ask where the store sheet is unavailable', async () => {
    (StoreReview.isAvailableAsync as jest.Mock).mockResolvedValueOnce(false);
    for (let i = 0; i < 5; i++) await recordSavedEntry();
    expect(StoreReview.requestReview).not.toHaveBeenCalled();
  });

  it('swallows errors from the store', async () => {
    (StoreReview.requestReview as jest.Mock).mockRejectedValueOnce(new Error('boom'));
    for (let i = 0; i < 4; i++) await recordSavedEntry();
    await expect(recordSavedEntry()).resolves.toBeUndefined();
  });
});
