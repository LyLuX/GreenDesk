/** Navigation entries shared by the main menu and frontend tests. */
export const navigationItems = [
  { label: 'Tableau de bord', path: '/dashboard', permission: 'dashboard.read' },
  { label: 'Matériels', path: '/materials', permission: 'materials.read' },
  { label: 'Catégories', path: '/categories', permission: 'categories.read' },
  { label: 'Propriétés', path: '/properties', permission: 'properties.read' },
  { label: 'Marques', path: '/brands', permission: 'brand.read' },
];
