import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  listMaintenance: vi.fn(),
  listOperations: vi.fn(),
  listParts: vi.fn(),
  listMaterials: vi.fn(),
  listManufacturers: vi.fn(),
  getOrderList: vi.fn(),
  createMaintenance: vi.fn(),
  executeMaintenance: vi.fn(),
  maintenanceHistory: vi.fn(),
  hasPermission: vi.fn(),
}));

vi.mock('../api/maintenance.api.js', () => ({
  createMaintenance: mocks.createMaintenance,
  deleteMaintenance: vi.fn(),
  executeMaintenance: mocks.executeMaintenance,
  listMaintenance: mocks.listMaintenance,
  listMaintenanceOperations: mocks.listOperations,
  listMaintenanceParts: mocks.listParts,
  maintenanceHistory: mocks.maintenanceHistory,
  setMaintenanceStatus: vi.fn(),
  updateMaintenance: vi.fn(),
  createMaintenanceOperation: vi.fn(),
  updateMaintenanceOperation: vi.fn(),
  deleteMaintenanceOperation: vi.fn(),
  createMaintenancePart: vi.fn(),
  updateMaintenancePart: vi.fn(),
  deleteMaintenancePart: vi.fn(),
  getMaintenanceOrderList: mocks.getOrderList,
}));
vi.mock('../api/reference.api.js', () => ({
  listMaterialOptions: mocks.listMaterials,
  createReferenceApi: (resource) => ({
    list: resource === 'manufacturers' ? mocks.listManufacturers : mocks.listMaterials,
  }),
}));
vi.mock('../auth/useAuth.js', () => ({
  default: () => ({ hasPermission: mocks.hasPermission }),
}));
vi.mock('../notifications/useNotification.js', () => ({
  default: () => ({ notify: vi.fn() }),
}));

import MaintenancePage from './MaintenancePage.jsx';

describe('MaintenancePage', () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.hasPermission.mockReturnValue(true);
    mocks.listMaterials.mockResolvedValue({
      data: {
        data: [{ uuid: 'material-uuid', name: 'Tronçonneuse', active: true }],
      },
    });
    mocks.listManufacturers.mockResolvedValue({ data: { data: [] } });
    mocks.getOrderList.mockResolvedValue({
      data: {
        data: {
          horizonDays: 30,
          includeOverdue: false,
          items: [],
        },
      },
    });
    mocks.listOperations.mockResolvedValue({
      data: {
        data: [
          {
            uuid: 'operation-uuid',
            name: 'Vidange',
            maintenanceType: 'preventive',
          },
        ],
      },
    });
    mocks.listParts.mockResolvedValue({
      data: {
        data: [
          {
            uuid: 'part-uuid',
            name: 'Bougie',
            reference: 'BPMR8Y',
            unit: 'pièce',
          },
        ],
      },
    });
    mocks.createMaintenance.mockResolvedValue({ data: { data: {} } });
    mocks.executeMaintenance.mockResolvedValue({ data: { data: {} } });
    mocks.maintenanceHistory.mockResolvedValue({
      data: { data: { items: [], pagination: { page: 1, limit: 5, total: 0, totalPages: 0 } } },
    });
    mocks.listMaintenance.mockResolvedValue({
      data: {
        data: {
          items: [
            {
              uuid: 'maintenance-uuid',
              title: 'Vidange annuelle',
              active: true,
              maintenanceType: 'preventive',
              priority: 'normal',
              status: 'upcoming',
              material: { name: 'Tondeuse' },
              nextMaintenanceDate: '2026-08-05',
              remainingDays: 12,
              parts: [
                {
                  uuid: 'part-uuid',
                  name: 'Bougie',
                  reference: 'BPMR8Y',
                  unit: 'pièce',
                  quantity: 1,
                },
              ],
            },
          ],
          pagination: { page: 1, limit: 5, total: 1, totalPages: 1 },
        },
      },
    });
  });

  const renderPage = (initialEntry = '/maintenance') =>
    render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <MaintenancePage />
      </MemoryRouter>,
    );

  it('shows only the date deadline and the remaining days', async () => {
    renderPage();

    expect(await screen.findByText('12 jours')).toBeInTheDocument();
    expect(mocks.listMaintenance).toHaveBeenCalledWith(
      { page: 1, limit: 5, active: 'true' },
      expect.any(AbortSignal),
    );
    expect(mocks.listMaterials).toHaveBeenCalledWith({ limit: 25 }, expect.any(AbortSignal));
    expect(screen.getByText('05/08/2026')).toBeInTheDocument();
    expect(screen.queryByText(/Compteur/)).not.toBeInTheDocument();
    expect(screen.getByText('Normale', { selector: 'span' })).toHaveClass(
      'status-badge',
      'priority-normal',
    );
    expect(screen.getByText('Sous 30 jours', { selector: 'span' })).toHaveClass(
      'status-badge',
      'maintenance-upcoming',
    );
  });

  it('uses the shared filter grid and searches across maintenance plans', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('12 jours');
    const searchInput = screen.getByLabelText('Rechercher un plan de maintenance');
    expect(searchInput.closest('.filter-panel')).toBeInTheDocument();
    expect(screen.getByLabelText('Filtrer par matériel').closest('label')).toHaveTextContent(
      /^Matériel/,
    );
    expect(screen.getByLabelText('Filtrer par statut').closest('label')).toHaveTextContent(
      /^Statut/,
    );
    expect(screen.getByLabelText('Filtrer par échéance').closest('label')).toHaveTextContent(
      /^Échéance/,
    );

    await user.type(searchInput, 'tondeuse');

    await waitFor(() =>
      expect(mocks.listMaintenance).toHaveBeenLastCalledWith(
        { page: 1, limit: 5, active: 'true', search: 'tondeuse' },
        expect.any(AbortSignal),
      ),
    );
    expect(mocks.listMaterials).toHaveBeenCalledTimes(1);
    expect(mocks.listOperations).toHaveBeenCalledTimes(1);
    expect(mocks.listParts).toHaveBeenCalledTimes(1);
  });

  it('loads all plans for the material provided by the detail page', async () => {
    renderPage('/maintenance?materialUuid=material-uuid&limit=all');

    await screen.findByText('12 jours');

    expect(screen.getByLabelText('Filtrer par matériel')).toHaveValue('material-uuid');
    expect(screen.getByLabelText('Nombre d’éléments par page')).toHaveValue('5');
    expect(mocks.listMaintenance).toHaveBeenCalledWith(
      { page: 1, limit: 5, active: 'true', materialUuid: 'material-uuid' },
      expect.any(AbortSignal),
    );
  });

  it('selects the deadline provided by the dashboard', async () => {
    renderPage('/maintenance?status=overdue');

    await screen.findByText('12 jours');

    expect(screen.getByLabelText('Filtrer par échéance')).toHaveValue('overdue');
    expect(mocks.listMaintenance).toHaveBeenCalledWith(
      { page: 1, limit: 5, active: 'true', status: 'overdue' },
      expect.any(AbortSignal),
    );
  });

  it('shows an informational banner when a deadline filter has no matching plan', async () => {
    mocks.listMaintenance.mockResolvedValue({
      data: {
        data: {
          items: [],
          pagination: { page: 1, limit: 5, total: 0, totalPages: 0 },
        },
      },
    });

    renderPage('/maintenance?status=overdue');

    const emptyMessage = await screen.findByText('Aucun plan d’entretien.');
    expect(emptyMessage.closest('[role="status"]')).toHaveClass(
      'alert',
      'alert-info',
      'text-center',
    );
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('opens the order list with the period matching the selected deadline', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText('12 jours');
    await user.selectOptions(screen.getByLabelText('Filtrer par échéance'), 'upcoming');
    await user.click(screen.getByRole('button', { name: 'Pièces à commander' }));

    const dialog = screen.getByRole('dialog', { name: 'Pièces à commander' });
    expect(within(dialog).getByLabelText('Échéance')).toHaveValue('30');
    expect(within(dialog).getByLabelText('Inclure les plans en retard')).not.toBeChecked();
    await waitFor(() =>
      expect(mocks.getOrderList).toHaveBeenCalledWith(
        { status: 'upcoming', horizonDays: 30, includeOverdue: false },
        expect.any(AbortSignal),
      ),
    );

    await user.selectOptions(within(dialog).getByLabelText('Échéance'), '60');
    await waitFor(() =>
      expect(mocks.getOrderList).toHaveBeenLastCalledWith(
        { horizonDays: 60, includeOverdue: false },
        expect.any(AbortSignal),
      ),
    );
  });

  it('uses compact outline buttons for table actions', async () => {
    renderPage();

    const editButton = await screen.findByRole('button', {
      name: 'Modifier Vidange annuelle',
    });
    const deleteButton = screen.getByRole('button', {
      name: 'Supprimer Vidange annuelle',
    });

    expect(editButton).toHaveClass('btn-sm', 'btn-outline-brand');
    expect(editButton).toHaveClass('flex-fill');
    expect(editButton).not.toHaveClass('btn-brand');
    expect(deleteButton).toHaveClass('btn-sm', 'btn-outline-danger');
    expect(screen.getByRole('button', { name: 'Désactiver Vidange annuelle' })).toHaveClass(
      'btn-outline-secondary',
    );
    expect(editButton.parentElement).toHaveClass(
      'd-flex',
      'h-100',
      'w-100',
      'flex-wrap',
      'align-items-center',
      'justify-content-center',
    );
  });

  it('uses blue buttons to activate an inactive maintenance plan', async () => {
    const user = userEvent.setup();
    mocks.listMaintenance.mockResolvedValue({
      data: {
        data: {
          items: [
            {
              uuid: 'maintenance-uuid',
              title: 'Vidange annuelle',
              active: false,
              maintenanceType: 'preventive',
              priority: 'normal',
              status: 'upcoming',
              material: { name: 'Tondeuse' },
              nextMaintenanceDate: '2026-08-05',
              remainingDays: 12,
            },
          ],
          pagination: { page: 1, limit: 5, total: 1, totalPages: 1 },
        },
      },
    });

    renderPage();

    const activateButton = await screen.findByRole('button', {
      name: 'Activer Vidange annuelle',
    });
    expect(activateButton).toHaveClass('btn-outline-activation');

    await user.click(activateButton);
    expect(within(screen.getByRole('dialog')).getByRole('button', { name: 'Activer' })).toHaveClass(
      'btn-outline-activation',
    );
  });

  it('does not duplicate catalogue-management links in the maintenance header', async () => {
    renderPage();

    await screen.findByText('12 jours');
    expect(screen.queryByRole('link', { name: 'Gérer les opérations' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Gérer les pièces' })).not.toBeInTheDocument();
  });

  it('replaces the manually entered title with a reusable operation', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Créer un plan' }));

    expect(screen.getByLabelText('Opération')).toBeRequired();
    expect(screen.getByRole('option', { name: 'Vidange — Préventif' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Intitulé')).not.toBeInTheDocument();
  });

  it('uses the content-sized plan modal and keeps each part on one line', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Créer un plan' }));

    expect(screen.getByRole('dialog', { name: 'Créer un plan' })).toHaveClass(
      'maintenance-plan-modal',
    );
    expect(screen.getByRole('checkbox', { name: 'Bougie — BPMR8Y' }).closest('div')).toHaveClass(
      'maintenance-plan-part-row',
      'flex-nowrap',
    );
  });

  it('keeps every catalogue part in a dedicated scrollable region', async () => {
    const user = userEvent.setup();
    const catalogueParts = Array.from({ length: 12 }, (_, index) => ({
      uuid: `part-${index}`,
      name: `Pièce ${index + 1}`,
      reference: `REF-${index + 1}`,
      unit: 'pièce',
    }));
    mocks.listParts.mockResolvedValue({ data: { data: catalogueParts } });
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Créer un plan' }));

    const partsRegion = screen.getByRole('region', { name: 'Pièces nécessaires' });
    expect(partsRegion).toHaveClass('maintenance-plan-parts');
    expect(within(partsRegion).getAllByRole('checkbox')).toHaveLength(catalogueParts.length);
  });

  it('creates a plan with its operation and exact part instead of a free title', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Créer un plan' }));
    const dialog = screen.getByRole('dialog', { name: 'Créer un plan' });
    await user.selectOptions(within(dialog).getByLabelText('Matériel'), 'material-uuid');
    await user.selectOptions(within(dialog).getByLabelText('Opération'), 'operation-uuid');
    await user.type(within(dialog).getByLabelText('Intervalle (jours)'), '365');
    await user.type(within(dialog).getByLabelText('Dernier entretien'), '2026-07-01');
    await user.click(within(dialog).getByRole('checkbox', { name: 'Bougie — BPMR8Y' }));
    await user.click(within(dialog).getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() =>
      expect(mocks.createMaintenance).toHaveBeenCalledWith(
        expect.objectContaining({
          materialUuid: 'material-uuid',
          operationUuid: 'operation-uuid',
          intervalDays: 365,
          lastMaintenanceDate: '2026-07-01',
          parts: [{ partUuid: 'part-uuid', quantity: 1 }],
        }),
      ),
    );
    expect(mocks.createMaintenance.mock.calls[0][0]).not.toHaveProperty('title');
  });

  it('executes maintenance with its parts from the existing table action', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(
      await screen.findByRole('button', {
        name: 'Effectuer Vidange annuelle',
      }),
    );

    expect(screen.queryByLabelText('Heures moteur')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Effectuer sans changement de pièce' })).toHaveClass(
      'btn-outline-danger',
    );
    await user.click(screen.getByRole('button', { name: 'Effectuer en changeant la pièce' }));

    await waitFor(() =>
      expect(mocks.executeMaintenance).toHaveBeenCalledWith('maintenance-uuid', {
        performedAt: new Date().toISOString().slice(0, 10),
        comment: '',
        partsAction: 'consume',
      }),
    );
  });

  it('requires a justification and confirmation to execute without changing parts', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(
      await screen.findByRole('button', {
        name: 'Effectuer Vidange annuelle',
      }),
    );

    await user.click(screen.getByRole('button', { name: 'Effectuer sans changement de pièce' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Un commentaire est obligatoire sans changement de pièce.',
    );
    await user.type(screen.getByLabelText('Commentaire'), 'Bougie encore en bon état');
    await user.click(screen.getByRole('button', { name: 'Effectuer sans changement de pièce' }));

    const confirmation = screen.getByRole('dialog', {
      name: 'Effectuer sans changement de pièce',
    });
    expect(confirmation).toHaveTextContent('Bougie × 1');
    expect(confirmation).toHaveTextContent('ne seront pas retirées du stock');
    await user.click(
      within(confirmation).getByRole('button', { name: 'Confirmer sans changer les pièces' }),
    );

    await waitFor(() =>
      expect(mocks.executeMaintenance).toHaveBeenCalledWith('maintenance-uuid', {
        performedAt: new Date().toISOString().slice(0, 10),
        comment: 'Bougie encore en bon état',
        partsAction: 'skip',
      }),
    );
  });

  it('hides execution without part replacement without its dedicated permission', async () => {
    const user = userEvent.setup();
    mocks.hasPermission.mockImplementation(
      (permission) => permission !== 'maintenance.execute_without_part_replacement',
    );
    renderPage();

    await user.click(
      await screen.findByRole('button', {
        name: 'Effectuer Vidange annuelle',
      }),
    );

    expect(screen.getByRole('button', { name: 'Effectuer en changeant la pièce' })).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Effectuer sans changement de pièce' }),
    ).not.toBeInTheDocument();
  });

  it('highlights maintenance performed without replacing parts in history', async () => {
    const user = userEvent.setup();
    mocks.maintenanceHistory.mockResolvedValue({
      data: {
        data: {
          items: [
            {
              uuid: 'history-uuid',
              performedAt: '2026-08-15',
              comment: 'Bougie contrôlée et conservée',
              executionType: 'withoutPartReplacement',
              partsSnapshot: [{ name: 'Bougie', quantity: 1 }],
              performedByUser: { firstName: 'Ada', lastName: 'Lovelace' },
            },
          ],
          pagination: { page: 1, limit: 5, total: 1, totalPages: 1 },
        },
      },
    });
    renderPage();

    await user.click(
      await screen.findByRole('button', { name: 'Voir l’historique de Vidange annuelle' }),
    );

    const badge = await screen.findByText('Pièces non remplacées');
    expect(badge).toHaveClass('status-badge', 'maintenance-history-exception');
    expect(badge.closest('li')).toHaveClass('maintenance-history-without-parts');
    expect(screen.getByText('Bougie × 1', { selector: 'small' })).toBeVisible();
  });
});
