import { describe, expect, it } from 'vitest';
import {
  getTokenRemainingMs,
  isSessionInactive,
  SESSION_IDLE_TIMEOUT_MS,
} from './session-timeout.js';

const tokenWithExpiration = (expiresAt) => {
  const payload = btoa(JSON.stringify({ exp: Math.floor(expiresAt / 1000) }));
  return `header.${payload}.signature`;
};

describe('session timeout rules', () => {
  it('expires a session after fifteen minutes without activity', () => {
    const now = 1_800_000_000_000;
    const session = { lastActivityAt: now - SESSION_IDLE_TIMEOUT_MS };

    expect(isSessionInactive(session, now)).toBe(true);
    expect(isSessionInactive({ lastActivityAt: now - SESSION_IDLE_TIMEOUT_MS + 1 }, now)).toBe(
      false,
    );
  });

  it('calculates the access-token lifetime remaining', () => {
    const now = 1_800_000_000_000;
    expect(getTokenRemainingMs(tokenWithExpiration(now + 240_000), now)).toBe(240_000);
  });
});
