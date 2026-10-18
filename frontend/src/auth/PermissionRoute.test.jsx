import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
const mocks = vi.hoisted(() => ({ permissions: [] }));
vi.mock('./useAuth.js', () => ({
  default: () => ({ hasPermission: (permission) => mocks.permissions.includes(permission) }),
}));
import PermissionRoute from './PermissionRoute.jsx';
afterEach(cleanup);
it.each(['users.company.create', 'users.read', 'unrelated'])(
  'guards access with any allowed permission (%s)',
  (permission) => {
    mocks.permissions = [permission];
    render(
      <MemoryRouter initialEntries={['/users']}>
        <Routes>
          <Route
            path="/users"
            element={
              <PermissionRoute permission={['users.read', 'users.company.create']}>
                <h1>Utilisateurs</h1>
              </PermissionRoute>
            }
          />
          <Route path="/403" element={<h1>Interdit</h1>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(
      screen.getByRole('heading', {
        name: permission === 'unrelated' ? 'Interdit' : 'Utilisateurs',
      }),
    ).toBeVisible();
  },
);
