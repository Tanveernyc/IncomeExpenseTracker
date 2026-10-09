// Phase 13 tests — the delete confirmation screen. The button must stay
// disabled until the word is typed, and a failed delete must surface the error
// rather than leaving the user with a silent no-op.
jest.mock('../src/db/account', () => ({ deleteAccount: jest.fn() }));
jest.mock('../src/lib/social-auth', () => ({ getAppleAuthorizationCode: jest.fn() }));
jest.mock('../src/components/session-provider', () => ({ useSession: jest.fn() }));

import { fireEvent, render, waitFor } from '@testing-library/react-native';
import DeleteAccountScreen from '../app/delete-account';
import { deleteAccount } from '../src/db/account';
import { getAppleAuthorizationCode } from '../src/lib/social-auth';
import { useSession } from '../src/components/session-provider';

const mockDeleteAccount = deleteAccount as jest.Mock;
const mockAppleCode = getAppleAuthorizationCode as jest.Mock;
const mockUseSession = useSession as jest.Mock;

const signedInWith = (provider: string) =>
  mockUseSession.mockReturnValue({ session: { user: { identities: [{ provider }] } }, isLoading: false });

beforeEach(() => {
  mockDeleteAccount.mockReset();
  mockDeleteAccount.mockResolvedValue({ error: null });
  mockAppleCode.mockReset();
  signedInWith('email');
});

describe('DeleteAccountScreen', () => {
  it('disables the button until the confirmation word is typed', async () => {
    const { getByTestId } = await render(<DeleteAccountScreen />);
    expect(getByTestId('delete-button').props.accessibilityState.disabled).toBe(true);

    await fireEvent.changeText(getByTestId('confirmation-input'), 'DELE');
    expect(getByTestId('delete-button').props.accessibilityState.disabled).toBe(true);

    await fireEvent.changeText(getByTestId('confirmation-input'), 'DELETE');
    expect(getByTestId('delete-button').props.accessibilityState.disabled).toBe(false);
  });

  it('does not call deleteAccount while the button is disabled', async () => {
    const { getByTestId } = await render(<DeleteAccountScreen />);
    await fireEvent.press(getByTestId('delete-button'));
    expect(mockDeleteAccount).not.toHaveBeenCalled();
  });

  it('calls deleteAccount once confirmed', async () => {
    const { getByTestId } = await render(<DeleteAccountScreen />);
    await fireEvent.changeText(getByTestId('confirmation-input'), 'DELETE');
    await fireEvent.press(getByTestId('delete-button'));
    await waitFor(() => expect(mockDeleteAccount).toHaveBeenCalledTimes(1));
  });

  it('shows the error and stays put when the delete fails', async () => {
    mockDeleteAccount.mockResolvedValue({ error: 'Network unreachable' });
    const { getByTestId, getByText } = await render(<DeleteAccountScreen />);
    await fireEvent.changeText(getByTestId('confirmation-input'), 'DELETE');
    await fireEvent.press(getByTestId('delete-button'));
    await waitFor(() => expect(getByText('Network unreachable')).toBeTruthy());
  });

  describe('an account that used Sign in with Apple', () => {
    const confirmAndPress = async () => {
      const screen = await render(<DeleteAccountScreen />);
      await fireEvent.changeText(screen.getByTestId('confirmation-input'), 'DELETE');
      await fireEvent.press(screen.getByTestId('delete-button'));
      return screen;
    };

    beforeEach(() => signedInWith('apple'));

    it("passes Apple's code along so the server can revoke the Apple tokens", async () => {
      mockAppleCode.mockResolvedValue({ ok: true, code: 'apple-code' });
      await confirmAndPress();
      await waitFor(() => expect(mockDeleteAccount).toHaveBeenCalledWith('apple-code'));
    });

    it('does not delete when the user backs out of the Apple sheet', async () => {
      mockAppleCode.mockResolvedValue({ ok: false, outcome: { kind: 'cancelled' } });
      const { getByText } = await confirmAndPress();
      await waitFor(() => expect(getByText('Confirm with Apple to delete your account.')).toBeTruthy());
      expect(mockDeleteAccount).not.toHaveBeenCalled();
    });

    it('still deletes when Apple fails, without a code', async () => {
      mockAppleCode.mockResolvedValue({ ok: false, outcome: { kind: 'error', message: 'offline' } });
      await confirmAndPress();
      await waitFor(() => expect(mockDeleteAccount).toHaveBeenCalledWith(undefined));
    });
  });

  it('does not ask Apple for an email or Google account', async () => {
    signedInWith('google');
    const { getByTestId } = await render(<DeleteAccountScreen />);
    await fireEvent.changeText(getByTestId('confirmation-input'), 'DELETE');
    await fireEvent.press(getByTestId('delete-button'));
    await waitFor(() => expect(mockDeleteAccount).toHaveBeenCalledWith(undefined));
    expect(mockAppleCode).not.toHaveBeenCalled();
  });
});
