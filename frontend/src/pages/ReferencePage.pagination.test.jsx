import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { api, createReferenceApi, hasPermission, notify } = vi.hoisted(() => ({
  api: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
  createReferenceApi: vi.fn(),
  hasPermission: vi.fn(),
  notify: vi.fn(),
}));

vi.mock('../api/reference.api.js', () => ({ createReferenceApi }));
vi.mock('../auth/useAuth.js', () => ({
  default: () => ({ hasPermission }),
}));
vi.mock('../notifications/useNotification.js', () => ({
  default: () => ({ notify }),
}));
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

import ReferencePage from './ReferencePage.jsx';

describe('ReferencePage pagination', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hasPermission.mockReturnValue(true);
    createReferenceApi.mockReturnValue(api);
    api.update.mockResolvedValue({ data: { data: {} } });
  });

  afterEach(cleanup);

  it('shows five rows by default and can display the complete database list', async () => {
    const rows = Array.from({ length: 6 }, (_value, index) => ({
      uuid: `uuid-${index + 1}`,
      name: `Élément ${index + 1}`,
    }));
    api.list.mockResolvedValue({ data: { data: rows } });
    const user = userEvent.setup();

    render(
      <ReferencePage
        title="Éléments"
        resource="elements"
        createPermission="elements.create"
        updatePermission="elements.update"
        deletePermission="elements.delete"
        fields={[{ name: 'name', label: 'Nom' }]}
        columns={[{ key: 'name', label: 'Nom' }]}
      />,
    );

    expect(await screen.findByText('Élément 5')).toBeInTheDocument();
    expect(screen.queryByText('Élément 6')).not.toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Tous (6)' })).toBeInTheDocument();
    expect(screen.getByText('6 élément(s), page 1 sur 2')).toBeInTheDocument();
    expect(screen.queryByText(/résultat/)).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Nombre d’éléments par page'), 'all');

    await waitFor(() => expect(screen.getByText('Élément 6')).toBeInTheDocument());
  });

  it('applies a client-side status filter inside the shared panel', async () => {
    api.list.mockResolvedValue({
      data: {
        data: [
          { uuid: 'active', name: 'Actif', active: true },
          { uuid: 'inactive', name: 'Inactif', active: false },
        ],
      },
    });
    const user = userEvent.setup();

    render(
      <ReferencePage
        title="Éléments"
        resource="elements"
        createPermission="elements.create"
        updatePermission="elements.update"
        deletePermission="elements.delete"
        fields={[{ name: 'name', label: 'Nom' }]}
        columns={[{ key: 'name', label: 'Nom' }]}
        filters={[
          {
            name: 'active',
            label: 'Statut',
            emptyLabel: 'Tous les statuts',
            options: [
              { value: 'true', label: 'Actifs' },
              { value: 'false', label: 'Inactifs' },
            ],
            clientSide: true,
          },
        ]}
      />,
    );

    expect(await screen.findByText('Actif')).toBeVisible();
    expect(screen.getByText('Inactif')).toBeVisible();
    await user.selectOptions(screen.getByLabelText('Filtrer par statut'), 'false');

    await waitFor(() => expect(screen.queryByText('Actif')).not.toBeInTheDocument());
    expect(screen.getByText('Inactif')).toBeVisible();
    expect(api.list).toHaveBeenLastCalledWith(
      expect.not.objectContaining({ active: 'false' }),
      expect.any(AbortSignal),
    );
  });

  it('uses the update permission and endpoint to change an active status', async () => {
    api.list.mockResolvedValue({
      data: { data: [{ uuid: 'material-uuid', name: 'Tondeuse', active: true }] },
    });
    const user = userEvent.setup();

    render(
      <ReferencePage
        title="Matériels"
        resource="materials"
        createPermission="materials.create"
        updatePermission="materials.update"
        deletePermission="materials.delete"
        statusAction
        fields={[{ name: 'name', label: 'Nom' }]}
        columns={[{ key: 'name', label: 'Nom' }]}
      />,
    );

    await user.click(await screen.findByRole('button', { name: 'Désactiver Tondeuse' }));
    await user.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: 'Désactiver' }),
    );

    await waitFor(() =>
      expect(api.update).toHaveBeenCalledWith('material-uuid', { active: false }),
    );
    expect(hasPermission).toHaveBeenCalledWith('materials.update');
    expect(notify).toHaveBeenCalledWith('success', 'Statut de « Tondeuse » mis à jour.');
  });
});
