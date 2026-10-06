// Phase 2 tests — sign-in form validation (spec §5 Phase 2):
// empty email rejected, malformed email rejected, password < 6 rejected.
import {
  MIN_PASSWORD_LENGTH,
  NEW_PASSWORD_MIN_LENGTH,
  validateEmail,
  validatePassword,
  validateSignIn,
} from '../src/lib/auth-validation';

describe('validateEmail', () => {
  it('rejects an empty email', () => {
    expect(validateEmail('')).toBeDefined();
    expect(validateEmail('   ')).toBeDefined(); // whitespace-only is still empty
  });

  it('rejects malformed emails', () => {
    for (const bad of ['plainaddress', 'missing@tld', '@nouser.com', 'two words@x.com', 'a@b@c.com']) {
      expect(validateEmail(bad)).toBeDefined();
    }
  });

  it('accepts a well-formed email', () => {
    expect(validateEmail('owner@example.com')).toBeUndefined();
    expect(validateEmail('  owner@example.com  ')).toBeUndefined(); // trims padding
  });
});

describe('validatePassword', () => {
  it('rejects an empty password', () => {
    expect(validatePassword('')).toBeDefined();
  });

  it(`rejects passwords shorter than ${MIN_PASSWORD_LENGTH} characters`, () => {
    expect(validatePassword('12345')).toBeDefined();
  });

  it(`accepts passwords of ${MIN_PASSWORD_LENGTH}+ characters`, () => {
    expect(validatePassword('123456')).toBeUndefined();
    expect(validatePassword('a-long-passphrase')).toBeUndefined();
  });
});

describe('new-account passwords', () => {
  it(`need ${NEW_PASSWORD_MIN_LENGTH}+ characters to sign up`, () => {
    expect(validatePassword('1234567', 'sign-up')).toBeDefined();
    expect(validatePassword('12345678', 'sign-up')).toBeUndefined();
    expect(validateSignIn('owner@example.com', 'short1', 'sign-up').valid).toBe(false);
  });

  it('still let an existing 6-character password sign in', () => {
    expect(validateSignIn('owner@example.com', '123456', 'sign-in').valid).toBe(true);
  });
});

describe('validateSignIn', () => {
  it('reports both field errors together', () => {
    const result = validateSignIn('', 'abc');
    expect(result.valid).toBe(false);
    expect(result.errors.email).toBeDefined();
    expect(result.errors.password).toBeDefined();
  });

  it('is valid with a good email and password, with no errors attached', () => {
    const result = validateSignIn('owner@example.com', 'secret-pass');
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual({});
  });
});
