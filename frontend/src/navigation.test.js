import { describe, expect, it } from 'vitest';
import { navigationItems, navigationSections } from './navigation.js';
import client from './api/client.js';

describe('frontend reference navigation', () => {
  it('declares the three business reference routes', () => {
    expect(navigationItems.map((item) => item.path)).toEqual([
      '/dashboard',
      '/materials',
      '/categories',
      '/manufacturers',
      '/suppliers',
      '/maintenance',
      '/maintenance/operations',
      '/maintenance/parts',
      '/users',
      '/roles',
      '/permissions',
    ]);
  });

  it('groups the sidebar into fleet, maintenance and administration dropdowns', () => {
    expect(navigationSections.map((section) => section.item?.label ?? section.label)).toEqual([
      'Tableau de bord',
      'Gestion du parc',
      'Maintenance',
      'Administration',
    ]);
    expect(navigationSections.find((section) => section.key === 'maintenance').items).toEqual([
      {
        label: 'Plans de maintenance',
        path: '/maintenance',
        permission: 'maintenance.read',
      },
      {
        label: 'Opérations',
        path: '/maintenance/operations',
        permission: 'maintenance.operations.read',
      },
      {
        label: 'Pièces',
        path: '/maintenance/parts',
        permission: 'maintenance.parts.read',
      },
    ]);
  });

  it('uses the centralized API prefix', () => {
    expect(client.defaults.baseURL).toBe('/api');
  });
});
