import { describe, expect, it } from 'vitest';
import { navigationItems, navigationSections } from './navigation.js';
import client from './api/client.js';

describe('frontend navigation', () => {
  it('declares every business and history route', () => {
    expect(navigationItems.map((item) => item.path)).toEqual([
      '/dashboard',
      '/materials',
      '/categories',
      '/manufacturers',
      '/suppliers',
      '/maintenance',
      '/maintenance/operations',
      '/maintenance/parts',
      '/history/fleet',
      '/history/maintenance',
      '/history/administration',
      '/users',
      '/roles',
      '/permissions',
    ]);
  });

  it('groups the sidebar into business, history and administration dropdowns', () => {
    expect(navigationSections.map((section) => section.item?.label ?? section.label)).toEqual([
      'Tableau de bord',
      'Gestion du parc',
      'Maintenance',
      'Historique',
      'Administration',
    ]);
    expect(navigationSections.find((section) => section.key === 'history').items).toEqual([
      {
        label: 'Gestion du parc',
        path: '/history/fleet',
        permission: 'history.fleet.read',
      },
      {
        label: 'Maintenance',
        path: '/history/maintenance',
        permission: 'history.maintenance.read',
      },
      {
        label: 'Administration',
        path: '/history/administration',
        permission: 'history.administration.read',
      },
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
    expect(navigationSections.find((section) => section.key === 'administration').items).toEqual([
      { label: 'Utilisateurs', path: '/users', permission: 'users.read' },
      { label: 'Rôles', path: '/roles', permission: 'roles.read' },
      { label: 'Permissions', path: '/permissions', permission: 'permissions.read' },
    ]);
  });

  it('uses the centralized API prefix', () => {
    expect(client.defaults.baseURL).toBe('/api');
  });
});
