import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const roles = Array.from({ length: 6 }, (_value, index) => ({
    uuid: `role-${index + 1}`,
    name: `Rôle ${index + 1}`,
    description: '',
    permissions: [],
  }));
  return {
    users: Array.from({ length: 6 }, (_value, index) => ({
      uuid: `user-${index + 1}`,
      firstName: 'Utilisateur',
      lastName: String(index + 1),
      email: `user${index + 1}@example.test`,
      isActive: true,
      roles: [],
      lastLoginAt: null,
    })),
    roles,
    referenceApis: {
      roles: { list: vi.fn().mockResolvedValue({ data: { data: roles } }) },
      permissions: { list: vi.fn().mockResolvedValue({ data: { data: [] } }) },
    },
  };
});

vi.mock('../api/users.api.js', () => ({
  listUsers: vi.fn().mockImplementation(() =>
    Promise.resolve({
      data: { data: mocks.users },
    }),
  ),
  createUser: vi.fn(),
  updateUser: vi.fn(),
  deleteUser: vi.fn(),
}));
vi.mock('../api/reference.api.js', () => ({
  createReferenceApi: (resource) => mocks.referenceApis[resource],
}));
vi.mock('../notifications/useNotification.js', () => ({
  default: () => ({ notify: vi.fn() }),
}));

import RolesPage from './RolesPage.jsx';
import UsersPage from './UsersPage.jsx';

describe('administrator table pagination', () => {
  afterEach(cleanup);

  it('paginates users at five items by default', async () => {
    const user = userEvent.setup();
    render(<UsersPage />);

    expect(await screen.findByText('user5@example.test')).toBeInTheDocument();
    expect(screen.queryByText('user6@example.test')).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Nombre d’éléments par page'), 'all');

    expect(screen.getByText('user6@example.test')).toBeInTheDocument();
  });

  it('paginates roles at five items by default', async () => {
    const user = userEvent.setup();
    render(<RolesPage />);

    expect(await screen.findByText('Rôle 5')).toBeInTheDocument();
    expect(screen.queryByText('Rôle 6')).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Nombre d’éléments par page'), 'all');

    expect(screen.getByText('Rôle 6')).toBeInTheDocument();
  });
});
