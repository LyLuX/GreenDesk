import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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
      emailVerifiedAt: '2026-08-23T08:00:00.000Z',
      roles: index === 5 ? [roles[5]] : [],
      lastLoginAt: null,
    })),
    roles,
    hasPermission: vi.fn(() => true),
    updateUser: vi.fn(),
    restoreUser: vi.fn(),
    resendUserEmailVerification: vi.fn(),
    referenceApis: {
      roles: {
        list: vi.fn().mockResolvedValue({ data: { data: roles } }),
        create: vi.fn(),
        update: vi.fn(),
        remove: vi.fn(),
      },
      permissions: {
        list: vi.fn().mockResolvedValue({
          data: {
            data: [{ uuid: 'permission-admin', name: 'ADMIN', description: '' }],
          },
        }),
      },
      companies: {
        list: vi.fn().mockResolvedValue({
          data: {
            data: [
              {
                uuid: 'company-1',
                name: 'EI BOURNAZEL Paul',
                active: true,
              },
            ],
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
  restoreUser: mocks.restoreUser,
  resendUserEmailVerification: mocks.resendUserEmailVerification,
}));
vi.mock('../api/reference.api.js', () => ({
  createReferenceApi: (resource) => mocks.referenceApis[resource],
}));
vi.mock('../notifications/useNotification.js', () => ({
  default: () => ({ notify: vi.fn() }),
}));
vi.mock('../auth/useAuth.js', () => ({
  default: () => ({
    hasPermission: mocks.hasPermission,
    activeCompany: { uuid: 'company-1', name: 'EI BOURNAZEL Paul' },
  }),
}));

import RolesPage from './RolesPage.jsx';
import UsersPage from './UsersPage.jsx';

describe('administrator table pagination', () => {
  afterEach(cleanup);
  beforeEach(() => {
    mocks.hasPermission.mockReturnValue(true);
    mocks.referenceApis.roles.update.mockResolvedValue({ data: { success: true } });
    for (const user of mocks.users) {
      delete user.deletedAt;
      user.lastLoginAt = null;
    }
  });

  it('automatically loads every role page without a manual load button', async () => {
    mocks.referenceApis.roles.list
      .mockResolvedValueOnce({
        data: {
          data: {
            items: [{ uuid: 'role-first', name: 'Rôle première page' }],
            pagination: { page: 1, limit: 25, total: 2, totalPages: 2 },
          },
        },
      })
      .mockResolvedValueOnce({
        data: {
          data: {
            items: [{ uuid: 'role-second', name: 'Rôle seconde page' }],
            pagination: { page: 2, limit: 25, total: 2, totalPages: 2 },
          },
        },
      });

    render(<UsersPage />);

    expect(await screen.findByRole('option', { name: 'Rôle seconde page' })).toBeVisible();
    expect(mocks.referenceApis.roles.list).toHaveBeenCalledWith(
      { page: 1, limit: 25 },
      expect.any(AbortSignal),
    );
    expect(mocks.referenceApis.roles.list).toHaveBeenCalledWith(
      { page: 2, limit: 25 },
      expect.any(AbortSignal),
    );
    expect(screen.queryByRole('button', { name: 'Charger plus de rôles' })).not.toBeInTheDocument();
  });

  it('keeps the user order returned by the API instead of sorting in React', async () => {
    mocks.users[0].lastLoginAt = '2026-08-20T08:00:00.000Z';
    mocks.users[1].lastLoginAt = '2026-08-23T08:00:00.000Z';

    render(<UsersPage />);

    const firstUser = await screen.findByText('user1@example.test');
    const secondUser = screen.getByText('user2@example.test');
    expect(
      firstUser.compareDocumentPosition(secondUser) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('filters user actions with their dedicated permissions', async () => {
    mocks.hasPermission.mockImplementation(
      (permission) => permission === 'users.read' || permission === 'users.status.update',
    );

    render(<UsersPage />);

    expect(await screen.findByText('user5@example.test')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Créer un utilisateur' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Modifier Utilisateur/ })).not.toBeInTheDocument();
    expect(
      screen.getAllByRole('button', { name: /Désactiver Utilisateur/ }).length,
    ).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /Supprimer Utilisateur/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Supprimés' })).not.toBeInTheDocument();
  });

  it('shows deleted users as read-only with the dedicated permission', async () => {
    const user = userEvent.setup();
    mocks.users[0].deletedAt = '2026-08-23T08:00:00.000Z';
    mocks.hasPermission.mockImplementation(
      (permission) => permission === 'users.read' || permission === 'users.deleted.read',
    );

    render(<UsersPage />);
    await user.selectOptions(await screen.findByLabelText('Filtrer par statut'), 'deleted');

    expect(await screen.findByText('user1@example.test')).toBeVisible();
    expect(screen.getByText('Supprimé')).toHaveClass('status-badge', 'deleted');
    expect(
      screen.queryByRole('button', { name: 'Modifier Utilisateur 1' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Supprimer Utilisateur 1' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Restaurer Utilisateur 1' }),
    ).not.toBeInTheDocument();
  });

  it('restores a deleted user with the dedicated permission and confirmation', async () => {
    const user = userEvent.setup();
    mocks.users[0].deletedAt = '2026-08-23T08:00:00.000Z';
    mocks.restoreUser.mockResolvedValue({ data: { success: true, data: mocks.users[0] } });
    mocks.hasPermission.mockImplementation((permission) =>
      ['users.read', 'users.deleted.read', 'users.restore'].includes(permission),
    );

    render(<UsersPage />);
    await user.selectOptions(await screen.findByLabelText('Filtrer par statut'), 'deleted');
    await user.click(await screen.findByRole('button', { name: 'Restaurer Utilisateur 1' }));

    const dialog = screen.getByRole('dialog', { name: 'Restaurer l’utilisateur' });
    expect(within(dialog).getByText(/statut, ses rôles et son état de vérification/)).toBeVisible();
    const confirmButton = within(dialog).getByRole('button', { name: 'Restaurer' });
    expect(confirmButton).toHaveClass('btn-outline-activation');
    await user.click(confirmButton);

    expect(mocks.restoreUser).toHaveBeenCalledWith('user-1');
  });

  it('uses the dedicated permission to resend verification emails', async () => {
    const user = userEvent.setup();
    mocks.users[0].emailVerifiedAt = null;
    mocks.hasPermission.mockImplementation(
      (permission) =>
        permission === 'users.read' || permission === 'users.email_verification.resend',
    );
    mocks.resendUserEmailVerification.mockResolvedValue({
      data: { success: true, data: { resendCooldownSeconds: 60 } },
    });

    render(<UsersPage />);
    const button = await screen.findByRole('button', {
      name: 'Renvoyer l’email de vérification à Utilisateur 1',
    });
    await user.click(button);

    expect(mocks.resendUserEmailVerification).toHaveBeenCalledWith('user-1');
    expect(
      screen.getByRole('button', {
        name: 'Renvoyer l’email de vérification à Utilisateur 1 - disponible dans 60 secondes',
      }),
    ).toBeDisabled();
    expect(
      screen.queryByRole('button', { name: 'Modifier Utilisateur 1' }),
    ).not.toBeInTheDocument();
    mocks.users[0].emailVerifiedAt = '2026-08-23T08:00:00.000Z';
  });

  it('filters role actions with their dedicated permissions', async () => {
    mocks.hasPermission.mockImplementation((permission) => permission === 'roles.read');

    render(<RolesPage />);

    expect(await screen.findByText('Rôle 5')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Créer un rôle' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Modifier' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Supprimer' })).not.toBeInTheDocument();
  });

  it('keeps the role name and its readable permission immutable when editing', async () => {
    const user = userEvent.setup();
    const visibilityPermission = {
      uuid: 'permission-role-technicien',
      name: 'users.roles.TECHNICIEN.read',
      description: 'Consulter les utilisateurs rattachés au rôle « TECHNICIEN ».',
    };
    mocks.referenceApis.roles.list.mockResolvedValueOnce({
      data: {
        data: [
          {
            uuid: 'role-technicien',
            name: 'TECHNICIEN',
            description: 'Description initiale',
            permissions: [visibilityPermission],
          },
        ],
      },
    });
    mocks.referenceApis.permissions.list.mockResolvedValueOnce({
      data: { data: [visibilityPermission] },
    });

    render(<RolesPage />);
    await user.click(await screen.findByRole('button', { name: 'Modifier' }));

    const dialog = within(screen.getByRole('dialog', { name: 'Modifier un rôle' }));
    expect(dialog.getByLabelText('Nom')).toBeDisabled();
    expect(dialog.getByText(/ne peut plus être modifié/)).toBeVisible();
    expect(dialog.getByLabelText(/Consulter les utilisateurs rattachés au rôle/)).toBeDisabled();
    expect(dialog.getByText(/Permission automatique requise/)).toBeVisible();

    await user.clear(dialog.getByLabelText('Description'));
    await user.type(dialog.getByLabelText('Description'), 'Description actualisée');
    await user.click(dialog.getByRole('button', { name: 'Enregistrer' }));

    expect(mocks.referenceApis.roles.update).toHaveBeenCalledWith('role-technicien', {
      description: 'Description actualisée',
      permissionUuids: ['permission-role-technicien'],
    });
  });

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
          { uuid: 'manufacturer-upload', name: 'manufacturers.logo.upload', description: '' },
          { uuid: 'material-update', name: 'materials.update', description: '' },
          {
            uuid: 'material-primary-photo',
            name: 'materials.photos.set_primary',
            description: '',
          },
          {
            uuid: 'dashboard-financial',
            name: 'dashboard.read.financial',
            description: '',
          },
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
            uuid: 'maintenance-execute',
            name: 'maintenance.execute',
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
    const readAction = actionGroup.getByRole('checkbox', { name: 'Consultation 0 sur 2' });
    const createAction = actionGroup.getByRole('checkbox', {
      name: 'Création et ajout 0 sur 2',
    });
    const updateAction = actionGroup.getByRole('checkbox', {
      name: 'Modification et paramétrage 0 sur 2',
    });
    const financialAction = actionGroup.getByRole('checkbox', {
      name: 'Données financières 0 sur 1',
    });
    const executionAction = actionGroup.getByRole('checkbox', {
      name: 'Exécution de maintenance 0 sur 2',
    });
    const stockAction = actionGroup.getByRole('checkbox', { name: 'Gestion du stock 0 sur 3' });

    expect(actionGroup.getAllByRole('checkbox')).toHaveLength(6);
    expect(readAction).not.toBeChecked();
    expect(createAction).not.toBeChecked();
    expect(updateAction).not.toBeChecked();
    expect(financialAction).not.toBeChecked();
    expect(executionAction).not.toBeChecked();
    expect(stockAction).not.toBeChecked();
    expect(actionGroup.queryByText('Admin')).not.toBeInTheDocument();

    await user.click(createAction);
    expect(dialog.getByLabelText('materials.create')).toBeChecked();
    expect(dialog.getByLabelText('manufacturers.logo.upload')).toBeChecked();
    expect(actionGroup.getByRole('checkbox', { name: 'Création et ajout 2 sur 2' })).toBeChecked();

    await user.click(stockAction);
    expect(dialog.getByLabelText('maintenance.parts.stock.adjust_on_hand')).toBeChecked();
    expect(dialog.getByLabelText('maintenance.parts.stock.order')).toBeChecked();
    expect(dialog.getByLabelText('maintenance.parts.stock.consume')).toBeChecked();
    expect(actionGroup.getByRole('checkbox', { name: 'Gestion du stock 3 sur 3' })).toBeChecked();

    await user.click(readAction);

    expect(dialog.getByLabelText('materials.read')).toBeChecked();
    expect(dialog.getByLabelText('maintenance.parts.read')).toBeChecked();
    expect(dialog.getByLabelText('materials.create')).toBeChecked();
    expect(dialog.getByLabelText('dashboard.read.financial')).not.toBeChecked();
    expect(actionGroup.getByRole('checkbox', { name: 'Consultation 2 sur 2' })).toBeChecked();

    await user.click(dialog.getByLabelText('materials.read'));

    const partialReadAction = actionGroup.getByRole('checkbox', { name: 'Consultation 1 sur 2' });
    expect(partialReadAction).toBePartiallyChecked();

    await user.click(partialReadAction);

    expect(dialog.getByLabelText('materials.read')).toBeChecked();
    expect(dialog.getByLabelText('maintenance.parts.read')).toBeChecked();

    await user.click(actionGroup.getByRole('checkbox', { name: 'Consultation 2 sur 2' }));

    expect(dialog.getByLabelText('materials.read')).not.toBeChecked();
    expect(dialog.getByLabelText('maintenance.parts.read')).not.toBeChecked();
  });

  it('highlights the permissions associated with a quick action', async () => {
    const user = userEvent.setup();
    mocks.referenceApis.permissions.list.mockResolvedValueOnce({
      data: {
        data: [
          { uuid: 'material-read', name: 'materials.read', description: '' },
          { uuid: 'part-read', name: 'maintenance.parts.read', description: '' },
          { uuid: 'material-create', name: 'materials.create', description: '' },
        ],
      },
    });
    render(<RolesPage />);

    await screen.findByText('Rôle 5');
    await user.click(screen.getByRole('button', { name: 'Créer un rôle' }));

    const dialog = within(screen.getByRole('dialog', { name: 'Créer un rôle' }));
    const actionGroup = within(dialog.getByRole('region', { name: 'Sélection rapide par action' }));
    const readAction = actionGroup.getByRole('checkbox', { name: 'Consultation 0 sur 2' });
    const readCard = readAction.closest('.permission-action-option');
    const materialRead = dialog.getByLabelText('materials.read').closest('.permission-option');
    const partRead = dialog.getByLabelText('maintenance.parts.read').closest('.permission-option');
    const materialCreate = dialog.getByLabelText('materials.create').closest('.permission-option');

    await user.hover(readCard);
    expect(materialRead).toHaveClass('permission-option-highlighted');
    expect(partRead).toHaveClass('permission-option-highlighted');
    expect(materialCreate).toHaveClass('permission-option-muted');

    await user.unhover(readCard);
    expect(materialRead).not.toHaveClass('permission-option-highlighted');
    expect(materialCreate).not.toHaveClass('permission-option-muted');

    fireEvent.focus(readAction);
    expect(partRead).toHaveClass('permission-option-highlighted');
    fireEvent.blur(readAction);
    expect(partRead).not.toHaveClass('permission-option-highlighted');

    const pinButton = actionGroup.getByRole('button', {
      name: 'Afficher les permissions du groupe « Consultation »',
    });
    await user.click(pinButton);
    await user.unhover(readCard);

    expect(
      actionGroup.getByRole('button', {
        name: 'Masquer les permissions du groupe « Consultation »',
      }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(materialRead).toHaveClass('permission-option-highlighted');
    expect(materialCreate).toHaveClass('permission-option-muted');
  });
});
