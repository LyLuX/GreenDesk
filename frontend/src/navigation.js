import maintenancePermissions from './maintenance/maintenance.permissions.js';
import historyPermissions from './history/history.permissions.js';
import dashboardPermissions from './dashboard/dashboard.permissions.js';
import administrationPermissions from './permissions/administration.permissions.js';
import companyPermissions from './permissions/company.permissions.js';
import relationsPermissions from './relations/relations.permissions.js';

/** Hierarchical navigation model shared by the sidebar and its tests. */
export const navigationSections = [
  {
    key: 'dashboard',
    item: {
      label: 'Tableau de bord',
      path: '/dashboard',
      permission: dashboardPermissions.read,
    },
  },
  {
    key: 'relations',
    item: {
      label: 'Relations des entités',
      path: '/relations',
      permission: relationsPermissions.read,
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
    key: 'history',
    label: 'Historique',
    items: [
      {
        label: 'Gestion du parc',
        path: '/history/fleet',
        permission: historyPermissions.fleet,
      },
      {
        label: 'Maintenance',
        path: '/history/maintenance',
        permission: historyPermissions.maintenance,
      },
      {
        label: 'Administration',
        path: '/history/administration',
        permission: historyPermissions.administration,
      },
    ],
  },
  {
    key: 'administration',
    label: 'Administration',
    items: [
      { label: 'Sociétés', path: '/companies', permission: companyPermissions.read },
      { label: 'Utilisateurs', path: '/users', permission: administrationPermissions.users.read },
      { label: 'Rôles', path: '/roles', permission: administrationPermissions.roles.read },
      {
        label: 'Permissions',
        path: '/permissions',
        permission: administrationPermissions.permissions.read,
      },
    ],
  },
];

/** Flat route list kept available for route-level checks and other consumers. */
export const navigationItems = navigationSections.flatMap((section) =>
  section.item ? [section.item] : section.items,
);
