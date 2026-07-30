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
vi.mock('./pages/MaintenanceOperationsPage.jsx', () => ({
  default: () => <h1>Opérations de maintenance</h1>,
}));
vi.mock('./pages/MaintenancePartsPage.jsx', () => ({
  default: () => <h1>Pièces de maintenance</h1>,
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

  it('uses the material update permission for status actions', async () => {
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
        statusAction: true,
      }),
    );
  });
});
