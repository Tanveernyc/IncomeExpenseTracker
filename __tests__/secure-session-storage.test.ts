// The session lives in the Keychain, survives values larger than one Keychain
// item, and an older build's plain AsyncStorage copy is moved over and erased.
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { CHUNK_SIZE, secureSessionStorage } from '@/db/secure-session-storage';

jest.mock('expo-secure-store', () => {
  const items = new Map<string, string>();
  return {
    AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY: 7,
    __items: items,
    getItemAsync: jest.fn(async (k: string) => items.get(k) ?? null),
    setItemAsync: jest.fn(async (k: string, v: string, o: { keychainAccessible?: number }) => {
      if (o?.keychainAccessible !== 7) throw new Error('must be this-device-only');
      if (!/^[A-Za-z0-9._-]+$/.test(k)) throw new Error(`invalid key ${k}`);
      if (v.length > 2048) throw new Error('value too large');
      items.set(k, v);
    }),
    deleteItemAsync: jest.fn(async (k: string) => void items.delete(k)),
  };
});

const keychain = (SecureStore as unknown as { __items: Map<string, string> }).__items;
const KEY = 'sb-dxjwyaldmxquuztmnrsb-auth-token';

beforeEach(async () => {
  keychain.clear();
  await AsyncStorage.clear();
});

it('round-trips a session larger than one Keychain item', async () => {
  const session = JSON.stringify({ access_token: 'a'.repeat(CHUNK_SIZE * 2 + 17), refresh_token: 'r' });
  await secureSessionStorage.setItem(KEY, session);
  expect(await secureSessionStorage.getItem(KEY)).toBe(session);
  expect(await AsyncStorage.getItem(KEY)).toBeNull();
});

it('leaves no stale chunks when a smaller value replaces a larger one', async () => {
  await secureSessionStorage.setItem(KEY, 'x'.repeat(CHUNK_SIZE * 3));
  await secureSessionStorage.setItem(KEY, 'short');
  expect(await secureSessionStorage.getItem(KEY)).toBe('short');
  expect([...keychain.keys()].sort()).toEqual([KEY, `${KEY}.0`]);
});

it('removes every chunk on sign-out', async () => {
  await secureSessionStorage.setItem(KEY, 'y'.repeat(CHUNK_SIZE * 2));
  await secureSessionStorage.removeItem(KEY);
  expect(keychain.size).toBe(0);
  expect(await secureSessionStorage.getItem(KEY)).toBeNull();
});

it('moves an older build’s plain session into the Keychain without signing out', async () => {
  await AsyncStorage.setItem(KEY, '{"refresh_token":"old"}');
  expect(await secureSessionStorage.getItem(KEY)).toBe('{"refresh_token":"old"}');
  expect(await AsyncStorage.getItem(KEY)).toBeNull();
  expect(await secureSessionStorage.getItem(KEY)).toBe('{"refresh_token":"old"}');
});

it('treats a half-written value as no value', async () => {
  await secureSessionStorage.setItem(KEY, 'z'.repeat(CHUNK_SIZE * 2));
  keychain.delete(`${KEY}.1`);
  expect(await secureSessionStorage.getItem(KEY)).toBeNull();
});
