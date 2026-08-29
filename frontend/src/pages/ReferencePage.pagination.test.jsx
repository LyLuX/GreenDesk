import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { api, createReferenceApi, hasPermission, notify } = vi.hoisted(() => ({
  api: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    restore: vi.fn(),
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
import { activityStatusFilter } from '../filters/filter-options.js';

describe('ReferencePage pagination', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hasPermission.mockReturnValue(true);
    createReferenceApi.mockReturnValue(api);
    api.update.mockResolvedValue({ data: { data: {} } });
    api.restore.mockResolvedValue({ data: { data: {} } });
  });

  afterEach(cleanup);

  it('shows five rows by default and can use the largest page size', async () => {
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
    expect(screen.getByRole('option', { name: '25' })).toBeInTheDocument();
    expect(screen.getByText('6 élément(s), page 1 sur 2')).toBeInTheDocument();
    expect(screen.queryByText(/résultat/)).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Nombre d’éléments par page'), '25');

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
        statusAction
        filters={[
          {
            name: 'active',
            ...activityStatusFilter,
            clientSide: true,
          },
        ]}
      />,
    );

    expect(await screen.findByText('Actif')).toBeVisible();
    expect(screen.getByLabelText('Filtrer par statut')).toHaveValue('true');
    expect(screen.queryByText('Inactif')).not.toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Filtrer par statut'), 'false');

    await waitFor(() => expect(screen.queryByText('Actif')).not.toBeInTheDocument());
    expect(screen.getByText('Inactif')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Activer Inactif' })).toHaveClass(
      'btn-outline-brand-blue',
    );
    expect(api.list).toHaveBeenLastCalledWith(
      expect.not.objectContaining({ active: 'false' }),
      expect.any(AbortSignal),
    );
  });

  it('restores a deleted record only through its dedicated permission action', async () => {
    api.list.mockResolvedValue({
      data: {
        data: [
          {
            uuid: 'deleted-company',
            name: 'Société supprimée',
            deletedAt: '2026-08-27T08:00:00.000Z',
          },
        ],
      },
    });
    const user = userEvent.setup();

    render(
      <ReferencePage
        title="Sociétés"
        resource="companies"
        createPermission="companies.create"
        updatePermission="companies.update"
        deletePermission="companies.delete"
        deletedUpdatePermission="companies.deleted.update"
        fields={[{ name: 'name', label: 'Nom' }]}
        columns={[{ key: 'name', label: 'Nom' }]}
      />,
    );

    await user.click(await screen.findByRole('button', { name: 'Restaurer Société supprimée' }));
    const dialog = within(screen.getByRole('dialog', { name: 'Restaurer société' }));
    expect(dialog.getByText(/statut précédent/)).toBeVisible();
    expect(dialog.getByRole('button', { name: 'Restaurer' })).toHaveClass('btn-outline-brand-blue');

    await user.click(dialog.getByRole('button', { name: 'Restaurer' }));

    expect(api.restore).toHaveBeenCalledWith('deleted-company');
    expect(notify).toHaveBeenCalledWith('success', 'Société restaurée.');
  });

  it('sends the default material status and purchase-date sort to the backend', async () => {
    api.list.mockResolvedValue({
      data: {
        data: {
          items: [],
          pagination: { page: 1, limit: 5, total: 0, totalPages: 1 },
        },
      },
    });

    render(
      <ReferencePage
        title="Matériels"
        resource="materials"
        createPermission="materials.create"
        updatePermission="materials.update"
        deletePermission="materials.delete"
        fields={[{ name: 'name', label: 'Nom' }]}
        columns={[{ key: 'name', label: 'Nom' }]}
        filters={[{ name: 'active', ...activityStatusFilter }]}
      />,
    );

    await waitFor(() =>
      expect(api.list).toHaveBeenCalledWith(
        expect.objectContaining({
          active: 'true',
          sort: 'purchaseDate',
          direction: 'DESC',
        }),
        expect.any(AbortSignal),
      ),
    );
    expect(screen.getByLabelText('Filtrer par statut')).toHaveValue('true');
    expect(screen.getByLabelText('Trier les matériels par')).toHaveValue('purchaseDate');
    expect(screen.getByLabelText('Choisir l’ordre de tri des matériels')).toHaveValue('DESC');
  });

  it('keeps the material form action visible outside its scrollable fields', async () => {
    api.list.mockResolvedValue({ data: { data: [] } });
    const user = userEvent.setup();

    render(
      <ReferencePage
        title="Matériels"
        resource="materials"
        createPermission="materials.create"
        updatePermission="materials.update"
        deletePermission="materials.delete"
        fields={[
          { name: 'name', label: 'Nom' },
          { name: 'model', label: 'Modèle' },
          { name: 'serialNumber', label: 'Numéro de série' },
          { name: 'purchaseDate', label: 'Date d’achat', type: 'date' },
          { name: 'notes', label: 'Notes', multiline: true },
        ]}
        columns={[{ key: 'name', label: 'Nom' }]}
      />,
    );

    await waitFor(() => expect(api.list).toHaveBeenCalled());
    await user.click(screen.getByRole('button', { name: 'Créer' }));

    const dialog = screen.getByRole('dialog', { name: 'Créer Matériels' });
    const saveButton = within(dialog).getByRole('button', { name: 'Enregistrer' });
    const scrollableFields = dialog.querySelector('.material-form-modal-scroll');

    expect(dialog).toHaveClass('material-form-modal');
    expect(scrollableFields).toBeVisible();
    expect(scrollableFields).not.toContainElement(saveButton);
    expect(saveButton.parentElement).toHaveClass(
      'material-form-modal-actions',
      'justify-content-end',
    );
  });

  it('uses the dedicated status permission and existing endpoint to change an active status', async () => {
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
        statusPermission="materials.status.update"
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
    expect(hasPermission).toHaveBeenCalledWith('materials.status.update');
    expect(notify).toHaveBeenCalledWith('success', 'Statut de « Tondeuse » mis à jour.');
  });
});
