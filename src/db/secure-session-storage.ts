// Where Supabase keeps the signed-in session: the iOS Keychain, not AsyncStorage.
// The session holds a refresh token that unlocks someone's books, so it must not
// sit in a plain file that device backups copy. Keychain items are encrypted by
// the OS, and THIS_DEVICE_ONLY keeps them out of backups and off other devices.
//
// Some iOS releases reject Keychain values over ~2 KB and a session can be
// larger, so values are split into chunks under `${key}.0`, `${key}.1`, ... with
// the chunk count stored under `key`.
//
// Builds before 1.2 kept the session in AsyncStorage. The first read moves it
// here and deletes the plain copy, so nobody is signed out by the upgrade.
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};
export const CHUNK_SIZE = 1800;

// Keychain keys may only use letters, digits, '.', '-' and '_'.
const safeKey = (key: string) => key.replace(/[^A-Za-z0-9._-]/g, '_');

async function readChunks(key: string): Promise<string | null> {
  const base = safeKey(key);
  const count = Number(await SecureStore.getItemAsync(base, OPTIONS));
  if (!count) return null;
  const parts: string[] = [];
  for (let i = 0; i < count; i++) {
    const part = await SecureStore.getItemAsync(`${base}.${i}`, OPTIONS);
    if (part === null) return null; // a half-written value is no value
    parts.push(part);
  }
  return parts.join('');
}

async function removeChunks(key: string): Promise<void> {
  const base = safeKey(key);
  const count = Number(await SecureStore.getItemAsync(base, OPTIONS));
  await SecureStore.deleteItemAsync(base, OPTIONS);
  for (let i = 0; i < count; i++) await SecureStore.deleteItemAsync(`${base}.${i}`, OPTIONS);
}

async function writeChunks(key: string, value: string): Promise<void> {
  await removeChunks(key);
  const base = safeKey(key);
  const count = Math.max(1, Math.ceil(value.length / CHUNK_SIZE));
  for (let i = 0; i < count; i++) {
    await SecureStore.setItemAsync(`${base}.${i}`, value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE), OPTIONS);
  }
  // The count goes last, so a crash mid-write leaves no readable partial value.
  await SecureStore.setItemAsync(base, String(count), OPTIONS);
}

/** Supabase auth storage adapter (getItem / setItem / removeItem). */
export const secureSessionStorage = {
  async getItem(key: string): Promise<string | null> {
    const stored = await readChunks(key);
    if (stored !== null) return stored;
    const legacy = await AsyncStorage.getItem(key);
    if (legacy === null) return null;
    await writeChunks(key, legacy);
    await AsyncStorage.removeItem(key);
    return legacy;
  },
  async setItem(key: string, value: string): Promise<void> {
    await writeChunks(key, value);
  },
  async removeItem(key: string): Promise<void> {
    await removeChunks(key);
    await AsyncStorage.removeItem(key);
  },
};
