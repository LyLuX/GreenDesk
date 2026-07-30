import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { api, createReferenceApi } = vi.hoisted(() => ({
  api: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    setStatus: vi.fn(),
  },
  createReferenceApi: vi.fn(),
}));

vi.mock('../api/reference.api.js', () => ({ createReferenceApi }));
vi.mock('../auth/useAuth.js', () => ({
  default: () => ({ hasPermission: () => true }),
}));
vi.mock('../notifications/useNotification.js', () => ({
  default: () => ({ notify: vi.fn() }),
}));
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

import ReferencePage from './ReferencePage.jsx';

describe('ReferencePage pagination', () => {
  afterEach(cleanup);

  it('shows five rows by default and can display the complete database list', async () => {
    const rows = Array.from({ length: 6 }, (_value, index) => ({
      uuid: `uuid-${index + 1}`,
      name: `Élément ${index + 1}`,
    }));
    api.list.mockResolvedValue({ data: { data: rows } });
    createReferenceApi.mockReturnValue(api);
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
    createReferenceApi.mockReturnValue(api);
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
});
