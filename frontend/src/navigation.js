import maintenancePermissions from './maintenance/maintenance.permissions.js';

/** Hierarchical navigation model shared by the sidebar and its tests. */
export const navigationSections = [
  {
    key: 'dashboard',
    item: {
      label: 'Tableau de bord',
      path: '/dashboard',
      permission: 'dashboard.read',
    },
  },
  {
    key: 'fleet',
    label: 'Gestion du parc',
    items: [
      { label: 'Matériels', path: '/materials', permission: 'materials.read' },
      { label: 'Catégories', path: '/categories', permission: 'categories.read' },
      { label: 'Fabricants', path: '/manufacturers', permission: 'manufacturers.read' },
      { label: 'Fournisseurs', path: '/suppliers', permission: 'suppliers.read' },
    ],
  },
  {
    key: 'maintenance',
    label: 'Maintenance',
    items: [
      {
        label: 'Plans de maintenance',
        path: '/maintenance',
        permission: maintenancePermissions.plans.read,
      },
      {
        label: 'Opérations',
        path: '/maintenance/operations',
        permission: maintenancePermissions.operations.read,
      },
      {
        label: 'Pièces',
        path: '/maintenance/parts',
        permission: maintenancePermissions.parts.read,
      },
    ],
  },
  {
    key: 'administration',
    label: 'Administration',
    items: [
      { label: 'Utilisateurs', path: '/users', permission: 'ADMIN' },
      { label: 'Rôles', path: '/roles', permission: 'ADMIN' },
      { label: 'Permissions', path: '/permissions', permission: 'ADMIN' },
    ],
  },
];

/** Flat route list kept available for route-level checks and other consumers. */
export const navigationItems = navigationSections.flatMap((section) =>
  section.item ? [section.item] : section.items,
);
