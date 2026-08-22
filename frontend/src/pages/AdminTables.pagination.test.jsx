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
    updateUser: vi.fn(),
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
  updateUser: mocks.updateUser,
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

    await user.selectOptions(screen.getByLabelText('Nombre d’éléments par page'), '25');

    expect(screen.getByText('user6@example.test')).toBeInTheDocument();
  });

  it('paginates roles at five items by default', async () => {
    const user = userEvent.setup();
    render(<RolesPage />);

    expect(await screen.findByText('Rôle 5')).toBeInTheDocument();
    expect(screen.queryByText('Rôle 6')).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Nombre d’éléments par page'), '25');

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

  it('deactivates and reactivates users with the shared status actions', async () => {
    const user = userEvent.setup();
    render(<UsersPage />);

    await screen.findByText('user5@example.test');
    const deactivateButton = screen.getByRole('button', {
      name: 'Désactiver Utilisateur 1',
    });
    expect(deactivateButton).toHaveClass('btn-outline-secondary', 'flex-fill');

    await user.click(deactivateButton);

    let dialog = within(screen.getByRole('dialog', { name: 'Désactiver l’utilisateur' }));
    expect(dialog.getByText(/ne pourra plus se connecter/)).toBeVisible();
    expect(dialog.getByRole('button', { name: 'Désactiver' })).toHaveClass('btn-danger');
    await user.click(dialog.getByRole('button', { name: 'Désactiver' }));

    expect(mocks.updateUser).toHaveBeenCalledWith('user-1', { isActive: false });

    await user.selectOptions(screen.getByLabelText('Filtrer par statut'), 'false');
    const activateButton = screen.getByRole('button', {
      name: 'Activer Utilisateur 6',
    });
    expect(activateButton).toHaveClass('btn-outline-activation', 'flex-fill');

    await user.click(activateButton);

    dialog = within(screen.getByRole('dialog', { name: 'Activer l’utilisateur' }));
    expect(dialog.getByText(/pourra de nouveau se connecter/)).toBeVisible();
    expect(dialog.getByRole('button', { name: 'Activer' })).toHaveClass('btn-outline-activation');
    await user.click(dialog.getByRole('button', { name: 'Activer' }));

    expect(mocks.updateUser).toHaveBeenCalledWith('user-6', { isActive: true });
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

  it('automatically loads every permission page without a manual load button', async () => {
    const user = userEvent.setup();
    mocks.referenceApis.permissions.list
      .mockResolvedValueOnce({
        data: {
          data: {
            items: [{ uuid: 'permission-alpha', name: 'alpha.read', description: '' }],
            pagination: { page: 1, limit: 25, total: 2, totalPages: 2 },
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: {
            items: [{ uuid: 'permission-beta', name: 'beta.read', description: '' }],
            pagination: { page: 2, limit: 25, total: 2, totalPages: 2 },
          },
        },
      });

    render(<RolesPage />);

    expect(await screen.findByRole('option', { name: 'beta.read' })).toBeVisible();
    expect(mocks.referenceApis.permissions.list).toHaveBeenCalledWith(
      { page: 1, limit: 25 },
      expect.any(AbortSignal),
    );
    expect(mocks.referenceApis.permissions.list).toHaveBeenCalledWith(
      { page: 2, limit: 25 },
      expect.any(AbortSignal),
    );
    expect(
      screen.queryByRole('button', { name: 'Charger plus de permissions' }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Créer un rôle' }));
    const dialog = within(screen.getByRole('dialog', { name: 'Créer un rôle' }));
    expect(dialog.getByLabelText('alpha.read')).toBeVisible();
    expect(dialog.getByLabelText('beta.read')).toBeVisible();
    expect(
      dialog.queryByRole('button', { name: 'Charger plus de permissions' }),
    ).not.toBeInTheDocument();
  });

  it('shows only the first six role permissions followed by an ellipsis', async () => {
    const permissions = Array.from({ length: 8 }, (_value, index) => ({
      uuid: `permission-${index + 1}`,
      name: `permission.${index + 1}`,
      description: '',
    }));
    mocks.referenceApis.roles.list.mockResolvedValueOnce({
      data: {
        data: [
          {
            uuid: 'summarized-role',
            name: 'Rôle résumé',
            description: '',
            permissions,
          },
        ],
      },
    });

    render(<RolesPage />);

    const row = (await screen.findByText('Rôle résumé')).closest('tr');
    expect(row).toHaveTextContent(
      'permission.1, permission.2, permission.3, permission.4, permission.5, permission.6, …',
    );
    expect(row).not.toHaveTextContent('permission.7');
    expect(row).not.toHaveTextContent('permission.8');
    expect(within(row).getByLabelText('2 permissions supplémentaires')).toBeVisible();
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

  it('selects permissions by action while preserving individual adjustments', async () => {
    const user = userEvent.setup();
    mocks.referenceApis.permissions.list.mockResolvedValueOnce({
      data: {
        data: [
          { uuid: 'material-read', name: 'materials.read', description: '' },
          { uuid: 'part-read', name: 'maintenance.parts.read', description: '' },
          { uuid: 'material-create', name: 'materials.create', description: '' },
          {
            uuid: 'maintenance-adjust-on-hand',
            name: 'maintenance.parts.stock.adjust_on_hand',
            description: '',
          },
          {
            uuid: 'maintenance-order',
            name: 'maintenance.parts.stock.order',
            description: '',
          },
          {
            uuid: 'maintenance-consume',
            name: 'maintenance.parts.stock.consume',
            description: '',
          },
          {
            uuid: 'maintenance-execute-without-parts',
            name: 'maintenance.execute.skip_parts',
            description: '',
          },
          { uuid: 'permission-admin', name: 'ADMIN', description: '' },
        ],
      },
    });
    render(<RolesPage />);

    await screen.findByText('Rôle 5');
    await user.click(screen.getByRole('button', { name: 'Créer un rôle' }));

    const dialog = within(screen.getByRole('dialog', { name: 'Créer un rôle' }));
    const actionGroup = within(dialog.getByRole('region', { name: 'Sélection rapide par action' }));
    const readAction = actionGroup.getByRole('checkbox', { name: 'Lecture 0 sur 2' });
    const createAction = actionGroup.getByRole('checkbox', { name: 'Création 0 sur 1' });
    const exceptionalExecutionAction = actionGroup.getByRole('checkbox', {
      name: 'Exécution sans changement de pièce 0 sur 1',
    });
    const adjustOnHandAction = actionGroup.getByRole('checkbox', {
      name: 'Correction du stock 0 sur 1',
    });
    const orderAction = actionGroup.getByRole('checkbox', {
      name: 'Enregistrement des commandes 0 sur 1',
    });
    const consumeAction = actionGroup.getByRole('checkbox', {
      name: 'Utilisation en maintenance 0 sur 1',
    });

    expect(readAction).not.toBeChecked();
    expect(createAction).not.toBeChecked();
    expect(exceptionalExecutionAction).not.toBeChecked();
    expect(adjustOnHandAction).not.toBeChecked();
    expect(orderAction).not.toBeChecked();
    expect(consumeAction).not.toBeChecked();
    expect(actionGroup.queryByText('Admin')).not.toBeInTheDocument();

    await user.click(consumeAction);
    expect(dialog.getByLabelText('maintenance.parts.stock.consume')).toBeChecked();
    expect(
      actionGroup.getByRole('checkbox', { name: 'Utilisation en maintenance 1 sur 1' }),
    ).toBeChecked();

    await user.click(readAction);

    expect(dialog.getByLabelText('materials.read')).toBeChecked();
    expect(dialog.getByLabelText('maintenance.parts.read')).toBeChecked();
    expect(dialog.getByLabelText('materials.create')).not.toBeChecked();
    expect(actionGroup.getByRole('checkbox', { name: 'Lecture 2 sur 2' })).toBeChecked();

    await user.click(dialog.getByLabelText('materials.read'));

    const partialReadAction = actionGroup.getByRole('checkbox', { name: 'Lecture 1 sur 2' });
    expect(partialReadAction).toBePartiallyChecked();

    await user.click(partialReadAction);

    expect(dialog.getByLabelText('materials.read')).toBeChecked();
    expect(dialog.getByLabelText('maintenance.parts.read')).toBeChecked();

    await user.click(actionGroup.getByRole('checkbox', { name: 'Lecture 2 sur 2' }));

    expect(dialog.getByLabelText('materials.read')).not.toBeChecked();
    expect(dialog.getByLabelText('maintenance.parts.read')).not.toBeChecked();
  });
});
