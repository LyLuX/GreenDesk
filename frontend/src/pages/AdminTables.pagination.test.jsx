import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const roles = Array.from({ length: 6 }, (_value, index) => ({
    uuid: `role-${index + 1}`,
    name: `Rôle ${index + 1}`,
    description: '',
    permissions: index === 5 ? [{ uuid: 'permission-admin', name: 'ADMIN', description: '' }] : [],
  }));
  return {
    users: Array.from({ length: 6 }, (_value, index) => ({
      uuid: `user-${index + 1}`,
      firstName: 'Utilisateur',
      lastName: String(index + 1),
      email: `user${index + 1}@example.test`,
      isActive: index !== 5,
      roles: index === 5 ? [roles[5]] : [],
      lastLoginAt: null,
    })),
    roles,
    referenceApis: {
      roles: { list: vi.fn().mockResolvedValue({ data: { data: roles } }) },
      permissions: {
        list: vi.fn().mockResolvedValue({
          data: {
            data: [{ uuid: 'permission-admin', name: 'ADMIN', description: '' }],
          },
        }),
      },
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

  it('shows active users by default and paginates all users after clearing the status', async () => {
    const user = userEvent.setup();
    render(<UsersPage />);

    expect(await screen.findByText('user5@example.test')).toBeInTheDocument();
    expect(screen.queryByText('user6@example.test')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Filtrer par statut')).toHaveValue('true');

    await user.selectOptions(screen.getByLabelText('Filtrer par statut'), '');
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

  it('filters users with the shared search, status and role controls', async () => {
    const user = userEvent.setup();
    render(<UsersPage />);

    await screen.findByText('user5@example.test');
    expect(
      screen.getByLabelText('Rechercher un utilisateur').closest('.filter-panel'),
    ).toBeVisible();
    expect(screen.getByLabelText('Filtrer par statut')).toHaveValue('true');
    expect(screen.queryByText('user6@example.test')).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Filtrer par statut'), 'false');
    expect(screen.getByText('user6@example.test')).toBeVisible();
    expect(screen.queryByText('user5@example.test')).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Filtrer par rôle'), 'role-6');
    expect(screen.getByText('user6@example.test')).toBeVisible();
  });

  it('uses the shared password input in the user creation modal', async () => {
    const user = userEvent.setup();
    render(<UsersPage />);

    await screen.findByText('user5@example.test');
    await user.click(screen.getByRole('button', { name: 'Créer un utilisateur' }));

    const dialog = within(screen.getByRole('dialog', { name: 'Créer un utilisateur' }));
    const password = dialog.getByLabelText('Mot de passe');
    expect(password).toHaveAttribute('type', 'password');
    expect(password.closest('.input-group')).toBeVisible();
    expect(dialog.getByRole('button', { name: 'Afficher le mot de passe' })).toHaveClass(
      'password-visibility-toggle',
    );

    await user.click(dialog.getByRole('button', { name: 'Afficher le mot de passe' }));

    expect(password).toHaveAttribute('type', 'text');
    expect(dialog.getByRole('button', { name: 'Masquer le mot de passe' })).toBeVisible();
  });

  it('filters roles by search and permission', async () => {
    const user = userEvent.setup();
    render(<RolesPage />);

    await screen.findByText('Rôle 5');
    expect(screen.getByLabelText('Rechercher un rôle').closest('.filter-panel')).toBeVisible();

    await user.selectOptions(screen.getByLabelText('Filtrer par permission'), 'permission-admin');
    expect(screen.getByText('Rôle 6')).toBeVisible();
    expect(screen.queryByText('Rôle 5')).not.toBeInTheDocument();
  });

  it('presents permissions by description and sorts their technical names', async () => {
    const user = userEvent.setup();
    mocks.referenceApis.permissions.list.mockResolvedValueOnce({
      data: {
        data: [
          {
            uuid: 'permission-zeta',
            name: 'zeta.read',
            description: 'Consulter les éléments Zeta.',
          },
          {
            uuid: 'permission-alpha',
            name: 'alpha.create',
            description: 'Créer les éléments Alpha.',
          },
        ],
      },
    });
    render(<RolesPage />);

    await screen.findByText('Rôle 5');
    await user.click(screen.getByRole('button', { name: 'Créer un rôle' }));

    const dialog = within(screen.getByRole('dialog', { name: 'Créer un rôle' }));
    expect(dialog.getByText('Créer les éléments Alpha.')).toBeVisible();
    expect(dialog.getByText('Consulter les éléments Zeta.')).toBeVisible();
    expect(
      dialog.getAllByText(/^(alpha|zeta)\./, { selector: 'code' }).map((node) => node.textContent),
    ).toEqual(['alpha.create', 'zeta.read']);
    expect(dialog.getByText('0 sur 2')).toBeVisible();
  });
});
