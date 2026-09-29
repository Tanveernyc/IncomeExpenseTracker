// Jest global setup — mocks for native modules that have no implementation in Node.
// Referenced from package.json "jest.setupFiles".

// AsyncStorage is a native module; use the in-memory mock the package ships for Jest.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// jest-expo stubs expo-crypto's native digest to an empty string, which would make the
// nonce pair look valid while hashing nothing. Back it with Node's crypto so the Apple
// nonce is exercised for real; getRandomBytes already works under jest-expo.
jest.mock('expo-crypto', () => {
  const actual = jest.requireActual('expo-crypto');
  const nodeCrypto = require('crypto');
  return {
    ...actual,
    digestStringAsync: jest.fn(async (algorithm, data) =>
      nodeCrypto
        .createHash(String(algorithm).toLowerCase().replace('-', ''))
        .update(data)
        .digest('hex')
    ),
  };
});

// Sign in with Apple is a native module; Jest gets a stub whose availability is
// off by default so screen tests opt in explicitly.
jest.mock('expo-apple-authentication', () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(false),
  signInAsync: jest.fn(),
  AppleAuthenticationButton: 'AppleAuthenticationButton',
  AppleAuthenticationButtonType: { SIGN_IN: 0, CONTINUE: 1, SIGN_UP: 2 },
  AppleAuthenticationButtonStyle: { WHITE: 0, WHITE_OUTLINE: 1, BLACK: 2 },
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
}));

// Google's SDK is native too; hasPlayServices resolves so the iOS path is exercised.
// v16 resolves signIn() to a tagged { type, data } response instead of throwing on cancel.
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn().mockResolvedValue(true),
    signIn: jest.fn(),
    signOut: jest.fn(),
  },
  statusCodes: { SIGN_IN_CANCELLED: '-5', IN_PROGRESS: 'IN_PROGRESS' },
}));
