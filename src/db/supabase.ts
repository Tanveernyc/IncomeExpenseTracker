// Supabase client — the single client instance the whole app imports.
// Sessions persist across app restarts in the iOS Keychain (secure-session-storage.ts).

// React Native lacks a full URL implementation; supabase-js needs this polyfill first.
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { secureSessionStorage } from './secure-session-storage';

// EXPO_PUBLIC_* vars are inlined into the client bundle at build time (safe: anon key only,
// RLS protects the data — see supabase/schema.sql). Values come from .env, shape from .env.example.
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Fail loudly at startup instead of producing confusing network errors later.
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase configuration: set EXPO_PUBLIC_SUPABASE_URL and ' +
      'EXPO_PUBLIC_SUPABASE_ANON_KEY in .env (see .env.example), then restart the dev server.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: secureSessionStorage, // persist the session in the Keychain
    autoRefreshToken: true, // refresh JWTs in the background while the app is open
    persistSession: true,
    detectSessionInUrl: false, // no OAuth redirect URLs in a native app
  },
});
