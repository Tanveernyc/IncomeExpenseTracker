// Supabase session context — restores the persisted session on launch and tracks
// auth changes. Everything below the root layout reads auth state through useSession().
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/db/supabase';

/** Per-user conveniences (last ledger, recent categories) that must not outlive the user. */
async function clearUserPreferences(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    await AsyncStorage.multiRemove(keys.filter((k) => k.startsWith('add:')));
  } catch {
    // Only conveniences; never block a sign-in or sign-out over them.
  }
}

interface SessionState {
  /** Null when signed out; a Supabase session when signed in. */
  session: Session | null;
  /** True until the persisted session has been read from the Keychain. */
  isLoading: boolean;
}

const SessionContext = createContext<SessionState>({ session: null, isLoading: true });

/** Read the current auth state anywhere in the app. */
export function useSession(): SessionState {
  return useContext(SessionContext);
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({ session: null, isLoading: true });
  const queryClient = useQueryClient();
  // undefined until the first session is known, then the signed-in user's id or null.
  const lastUserId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const apply = (session: Session | null) => {
      const userId = session?.user.id ?? null;
      // A different person (or nobody) now: drop every cached query so the next
      // user can never see the previous user's books, even for a frame.
      if (lastUserId.current !== undefined && lastUserId.current !== userId) {
        queryClient.clear();
        clearUserPreferences();
      }
      lastUserId.current = userId;
      setState({ session, isLoading: false });
    };

    // Initial restore from the Keychain (why sessions survive app restarts). A
    // storage failure must land on sign-in, not leave the app blank forever.
    supabase.auth
      .getSession()
      .then(({ data }) => apply(data.session))
      .catch(() => apply(null));
    // Live updates: sign-in, sign-out, token refresh all flow through here.
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      apply(session);
    });
    return () => subscription.subscription.unsubscribe();
  }, [queryClient]);

  return <SessionContext.Provider value={state}>{children}</SessionContext.Provider>;
}
