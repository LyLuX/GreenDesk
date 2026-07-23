import { describe, expect, it } from 'vitest';
import { navigationItems } from './navigation.js';
import client from './api/client.js';

describe('frontend reference navigation', () => {
  it('declares the three business reference routes', () => {
    expect(navigationItems.map((item) => item.path)).toEqual([
      '/dashboard',
      '/materials',
      '/maintenance',
      '/categories',
      '/properties',
      '/brands',
    ]);
  });

  it('uses the centralized API prefix', () => {
    expect(client.defaults.baseURL).toBe('/api');
  });
});
