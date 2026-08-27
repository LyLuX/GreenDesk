import { render, screen } from '@testing-library/react';
import { MemoryRouter, Outlet } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { referencePage } = vi.hoisted(() => ({
  referencePage: vi.fn(),
}));

vi.mock('./auth/ProtectedRoute.jsx', () => ({
  default: () => <Outlet />,
}));
vi.mock('./auth/PermissionRoute.jsx', () => ({
  default: ({ children, permission }) => <div data-testid={permission}>{children}</div>,
}));
vi.mock('./layouts/AppLayout.jsx', () => ({
  default: () => <Outlet />,
}));
vi.mock('./pages/DashboardPage.jsx', () => ({
  default: () => <h1>Tableau de bord</h1>,
}));
vi.mock('./pages/RelationsPage.jsx', () => ({
  default: () => <h1>Relations des entités</h1>,
}));
vi.mock('./pages/MaintenanceOperationsPage.jsx', () => ({
  default: () => <h1>Opérations de maintenance</h1>,
}));
vi.mock('./pages/MaintenancePartsPage.jsx', () => ({
  default: () => <h1>Pièces de maintenance</h1>,
}));
vi.mock('./pages/HistoryPage.jsx', () => ({
  default: ({ section }) => <h1>Historique {section}</h1>,
}));
vi.mock('./pages/UsersPage.jsx', () => ({
  default: () => <h1>Utilisateurs</h1>,
}));
vi.mock('./pages/RolesPage.jsx', () => ({
  default: () => <h1>Rôles</h1>,
}));
vi.mock('./pages/PermissionsPage.jsx', () => ({
  default: () => <h1>Permissions</h1>,
}));
vi.mock('./pages/ReferencePage.jsx', () => ({
  default: (properties) => {
    referencePage(properties);
    return <h1>{properties.title}</h1>;
  },
}));

import App from './App.jsx';

describe('root route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects the root address to the dashboard', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Tableau de bord' })).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });

  it.each([
    ['/relations', 'Relations des entités', 'relations.read'],
    ['/maintenance/operations', 'Opérations de maintenance', 'maintenance.operations.read'],
    ['/maintenance/parts', 'Pièces de maintenance', 'maintenance.parts.read'],
  ])('protects %s with its dedicated permission', async (path, heading, permission) => {
    render(
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument();
    expect(screen.getByTestId(permission)).toBeInTheDocument();
  });

  it.each([
    ['/history/fleet', 'fleet', 'history.fleet.read'],
    ['/history/maintenance', 'maintenance', 'history.maintenance.read'],
    ['/history/administration', 'administration', 'history.administration.read'],
  ])('protects %s with its history permission', async (path, section, permission) => {
    render(
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole('heading', { name: `Historique ${section}` }),
    ).toBeInTheDocument();
    expect(screen.getByTestId(permission)).toBeInTheDocument();
  });

  it('uses a permission dedicated to material status actions', async () => {
    render(
      <MemoryRouter initialEntries={['/materials']}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Matériels' })).toBeInTheDocument();
    expect(referencePage).toHaveBeenCalledWith(
      expect.objectContaining({
        resource: 'materials',
        updatePermission: 'materials.update',
        statusPermission: 'materials.status.update',
        statusAction: true,
      }),
    );
  });

  it.each([
    ['/users', 'Utilisateurs', 'users.read'],
    ['/roles', 'Rôles', 'roles.read'],
    ['/permissions', 'Permissions', 'permissions.read'],
  ])('protects %s with its administration read permission', async (path, heading, permission) => {
    render(
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument();
    expect(screen.getByTestId(permission)).toBeInTheDocument();
  });
});
