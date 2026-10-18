import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  listUsers: vi.fn(),
  createUser: vi.fn(),
  choices: vi.fn(),
  referenceList: vi.fn(),
  permissions: ['users.company.create'],
  activeCompany: { uuid: 'company-a', name: 'Societe A' },
}));
vi.mock('../auth/useAuth.js', () => ({
  default: () => ({
    hasPermission: (permission) => mocks.permissions.includes(permission),
    activeCompany: mocks.activeCompany,
  }),
}));
vi.mock('../api/users.api.js', () => ({
  listUsers: mocks.listUsers,
  createUser: mocks.createUser,
  listUserCreationCompanies: mocks.choices,
  updateUser: vi.fn(),
  deleteUser: vi.fn(),
  restoreUser: vi.fn(),
  resendUserEmailVerification: vi.fn(),
}));
vi.mock('../api/reference.api.js', () => ({
  createReferenceApi: () => ({ list: mocks.referenceList }),
}));
vi.mock('../notifications/useNotification.js', () => ({ default: () => ({ notify: vi.fn() }) }));
import UsersPage from './UsersPage.jsx';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.permissions = ['users.company.create'];
  mocks.activeCompany = { uuid: 'company-a', name: 'Societe A' };
  mocks.choices.mockResolvedValue({
    data: {
      data: [
        { uuid: 'company-a', name: 'Societe A' },
        { uuid: 'company-b', name: 'Societe B' },
      ],
    },
  });
  mocks.createUser.mockResolvedValue({ data: { data: {} } });
});
afterEach(cleanup);

describe('company-scoped user creation', () => {
  it('creates an account in multiple own companies without requesting the user or company directories', async () => {
    const user = userEvent.setup();
    render(<UsersPage />);
    const open = screen.getByRole('button', { name: 'Créer un utilisateur' });
    await waitFor(() => expect(open).toBeEnabled());
    await user.click(open);
    const dialog = within(screen.getByRole('dialog', { name: 'Créer un utilisateur' }));
    expect(dialog.getByRole('checkbox', { name: 'Societe A' })).toBeChecked();
    await user.click(dialog.getByRole('checkbox', { name: 'Societe B' }));
    await user.type(dialog.getByLabelText('Prénom'), 'Jean');
    await user.type(dialog.getByLabelText('Nom', { exact: true }), 'Dupont');
    await user.type(dialog.getByLabelText('Email'), 'jean@example.test');
    await user.type(dialog.getByLabelText('Mot de passe', { selector: 'input' }), 'SecurePass123!');
    expect(dialog.queryByText('Rôles', { exact: true })).not.toBeInTheDocument();
    await user.click(dialog.getByRole('button', { name: 'Enregistrer' }));
    await waitFor(() =>
      expect(mocks.createUser).toHaveBeenCalledWith({
        firstName: 'Jean',
        lastName: 'Dupont',
        email: 'jean@example.test',
        password: 'SecurePass123!',
        companyUuids: ['company-a', 'company-b'],
      }),
    );
    expect(mocks.listUsers).not.toHaveBeenCalled();
    expect(mocks.referenceList).not.toHaveBeenCalled();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('prevents creation while an unrelated global company is active', async () => {
    mocks.activeCompany = { uuid: 'outside', name: 'Outside' };
    render(<UsersPage />);
    await screen.findByText(/Sélectionnez une société de rattachement active/);
    expect(screen.getByRole('button', { name: 'Créer un utilisateur' })).toBeDisabled();
    expect(mocks.createUser).not.toHaveBeenCalled();
  });

  it('disables creation and reports a failed scope lookup', async () => {
    mocks.choices.mockRejectedValue(new Error('Choix indisponibles'));
    render(<UsersPage />);
    expect(await screen.findByRole('alert')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Créer un utilisateur' })).toBeDisabled();
  });
});
