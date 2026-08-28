import { afterEach, describe, expect, it } from 'vitest';
import {
  clearReturnLocation,
  readReturnLocation,
  rememberReturnLocation,
  resolveReturnLocation,
  sanitizeReturnLocation,
} from './return-location.js';

describe('return location', () => {
  afterEach(() => sessionStorage.clear());

  it('preserves an internal path with its query string and hash', () => {
    const destination = '/maintenance/parts?stockStatus=LOW#inventory';

    expect(rememberReturnLocation(destination)).toBe(true);
    expect(readReturnLocation()).toBe(destination);
  });

  it.each([
    'https://malicious.example/maintenance',
    '//malicious.example/maintenance',
    '/\\malicious.example/maintenance',
    '/login',
    '/register',
  ])('rejects an unsafe or public destination: %s', (destination) => {
    expect(sanitizeReturnLocation(destination)).toBeNull();
  });

  it('prefers the current router destination and clears an older stored path', () => {
    rememberReturnLocation('/materials');

    expect(resolveReturnLocation('/roles')).toBe('/roles');
    clearReturnLocation();
    expect(readReturnLocation()).toBeNull();
  });

  it('resolves a destination without consuming it during a render', () => {
    rememberReturnLocation('/maintenance/parts');

    expect(resolveReturnLocation()).toBe('/maintenance/parts');
    expect(readReturnLocation()).toBe('/maintenance/parts');
  });
});
