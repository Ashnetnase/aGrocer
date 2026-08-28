import { describe, expect, it } from 'vitest';
import { describeSignInError } from './SignInScreen';

/**
 * The wording is security-relevant, not just cosmetic. Supabase reports a wrong password and
 * an unknown email identically so that nobody can use the sign-in form to discover which
 * addresses have accounts. These tests exist to stop a well-meaning "more helpful" message
 * from throwing that property away.
 */

describe('describeSignInError', () => {
  it('gives the same answer whether the password is wrong or the account does not exist', () => {
    expect(describeSignInError('Invalid login credentials')).toBe(
      'That email and password do not match.',
    );
  });

  it('never reveals whether an account exists', () => {
    for (const message of [
      'Invalid login credentials',
      'User not found',
      'Email not confirmed',
      'something nobody has seen before',
    ]) {
      const shown = describeSignInError(message);
      expect(shown).not.toMatch(/no account|not found|does not exist|unknown user/i);
    }
  });

  it('says something actionable for a rate limit rather than blaming the password', () => {
    expect(describeSignInError('Request rate limit reached')).toMatch(/wait a minute/i);
  });

  it('does not pass a raw Supabase message through to the screen', () => {
    expect(describeSignInError('AuthApiError: unexpected_failure at /token')).toBe(
      'Could not sign in. Try again.',
    );
  });
});
