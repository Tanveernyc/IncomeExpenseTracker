// Signing out, or a different person signing in, must drop every cached query so
// nobody sees the previous user's books. A token refresh for the same user must not.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render } from '@testing-library/react-native';
import { Text } from 'react-native';
import { SessionProvider, useSession } from '@/components/session-provider';

type Listener = (event: string, session: unknown) => void;
let mockListener: Listener;
let mockInitial: Promise<{ data: { session: unknown } }>;

jest.mock('../src/db/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(() => mockInitial),
      onAuthStateChange: jest.fn((cb: Listener) => {
        mockListener = cb;
        return { data: { subscription: { unsubscribe: jest.fn() } } };
      }),
    },
  },
}));

const session = (id: string) => ({ user: { id } });

function Probe() {
  const { session: s, isLoading } = useSession();
  return <Text>{isLoading ? 'loading' : ((s as { user: { id: string } } | null)?.user.id ?? 'signed-out')}</Text>;
}

async function mount() {
  const client = new QueryClient();
  client.setQueryData(['properties'], [{ name: 'Alice Duplex' }]);
  const screen = await render(
    <QueryClientProvider client={client}>
      <SessionProvider>
        <Probe />
      </SessionProvider>
    </QueryClientProvider>
  );
  // Let the initial getSession() settle before any auth event arrives.
  await act(async () => {
    await mockInitial.catch(() => {});
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  return { client, screen };
}

beforeEach(async () => {
  await AsyncStorage.clear();
  mockInitial = Promise.resolve({ data: { session: session('alice') } });
});

it('keeps the cache across a token refresh for the same user', async () => {
  const { client } = await mount();
  await act(async () => mockListener('TOKEN_REFRESHED', session('alice')));
  expect(client.getQueryData(['properties'])).toEqual([{ name: 'Alice Duplex' }]);
});

it('drops the cache and per-user preferences on sign-out', async () => {
  await AsyncStorage.setItem('add:last-property-id', 'alice-property');
  await AsyncStorage.setItem('review:saved-entry-count', '3');
  const { client, screen } = await mount();
  await act(async () => mockListener('SIGNED_OUT', null));
  expect(client.getQueryData(['properties'])).toBeUndefined();
  expect(screen.getByText('signed-out')).toBeTruthy();
  await act(async () => {});
  expect(await AsyncStorage.getItem('add:last-property-id')).toBeNull();
  expect(await AsyncStorage.getItem('review:saved-entry-count')).toBe('3');
});

it('drops the cache when a different user signs in', async () => {
  const { client } = await mount();
  await act(async () => mockListener('SIGNED_IN', session('bob')));
  expect(client.getQueryData(['properties'])).toBeUndefined();
});

it('lands on signed-out instead of hanging when the session cannot be read', async () => {
  mockInitial = Promise.reject(new Error('keychain unavailable'));
  const { screen } = await mount();
  expect(screen.getByText('signed-out')).toBeTruthy();
});
