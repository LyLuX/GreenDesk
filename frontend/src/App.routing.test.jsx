import { render, screen } from '@testing-library/react';
import { MemoryRouter, Outlet } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

vi.mock('./auth/ProtectedRoute.jsx', () => ({
  default: () => <Outlet />,
}));
vi.mock('./auth/PermissionRoute.jsx', () => ({
  default: ({ children }) => children,
}));
vi.mock('./layouts/AppLayout.jsx', () => ({
  default: () => <Outlet />,
}));
vi.mock('./pages/DashboardPage.jsx', () => ({
  default: () => <h1>Tableau de bord</h1>,
}));

import App from './App.jsx';

describe('root route', () => {
  it('redirects the root address to the dashboard', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Tableau de bord' })).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
  });
});
