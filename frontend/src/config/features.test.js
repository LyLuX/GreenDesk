import { describe, expect, it } from 'vitest';

import { resolvePublicRegistrationEnabled } from './features.js';

describe('frontend feature configuration', () => {
  it('enables registration by default outside production', () => {
    expect(resolvePublicRegistrationEnabled({ PROD: false })).toBe(true);
  });

  it('disables registration by default in production', () => {
    expect(resolvePublicRegistrationEnabled({ PROD: true })).toBe(false);
  });

  it.each([
    ['true', true],
    ['false', false],
  ])('honors an explicit public registration value (%s)', (value, expected) => {
    expect(
      resolvePublicRegistrationEnabled({
        PROD: true,
        VITE_PUBLIC_REGISTRATION_ENABLED: value,
      }),
    ).toBe(expected);
  });
});
