/** Navigation entries shared by the main menu and frontend tests. */
export const navigationItems = [
  { label: 'Tableau de bord', path: '/dashboard', permission: 'dashboard.read' },
  { label: 'Matériels', path: '/materials', permission: 'materials.read' },
  { label: 'Plans de maintenance', path: '/maintenance', permission: 'maintenance.read' },
  {
    label: 'Opérations de maintenance',
    path: '/maintenance/operations',
    permission: 'maintenance.read',
  },
  {
    label: 'Pièces de maintenance',
    path: '/maintenance/parts',
    permission: 'maintenance.read',
  },
  {
    label: 'Fabricants de pièces',
    path: '/maintenance/manufacturers',
    permission: 'maintenance.read',
  },
  {
    label: 'Fournisseurs',
    path: '/maintenance/suppliers',
    permission: 'maintenance.read',
  },
  { label: 'Catégories', path: '/categories', permission: 'categories.read' },
  { label: 'Marques', path: '/brands', permission: 'brands.read' },
  { label: 'Utilisateurs', path: '/users', permission: 'ADMIN' },
  { label: 'Rôles', path: '/roles', permission: 'ADMIN' },
  { label: 'Permissions', path: '/permissions', permission: 'ADMIN' },
];
