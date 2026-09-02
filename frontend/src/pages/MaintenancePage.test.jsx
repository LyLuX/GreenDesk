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
  getSheets: vi.fn(),
  createMaintenance: vi.fn(),
  updateMaintenance: vi.fn(),
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
  updateMaintenance: mocks.updateMaintenance,
  createMaintenanceOperation: vi.fn(),
  updateMaintenanceOperation: vi.fn(),
  deleteMaintenanceOperation: vi.fn(),
  createMaintenancePart: vi.fn(),
  updateMaintenancePart: vi.fn(),
  deleteMaintenancePart: vi.fn(),
  getMaintenanceOrderList: mocks.getOrderList,
  getMaintenanceSheets: mocks.getSheets,
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
    mocks.getSheets.mockResolvedValue({
      data: {
        data: {
          horizonDays: 30,
          includeOverdue: true,
          includeWearBased: false,
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
            description: 'Description catalogue',
            maintenanceType: 'preventive',
          },
        ],
      },
    });
    mocks.listParts.mockResolvedValue({
      data: {
        data: {
          items: [
            {
              uuid: 'part-uuid',
              name: 'Bougie',
              reference: 'BPMR8Y',
              unit: 'pièce',
            },
          ],
          pagination: { page: 1, limit: 5, total: 1, totalPages: 1 },
        },
      },
    });
    mocks.createMaintenance.mockResolvedValue({ data: { data: {} } });
    mocks.updateMaintenance.mockResolvedValue({ data: { data: {} } });
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
  const usePlanParts = (parts) =>
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
              parts,
            },
          ],
          pagination: { page: 1, limit: 5, total: 1, totalPages: 1 },
        },
      },
    });

  it('shows only the date deadline and the remaining days', async () => {
    renderPage();

    expect(await screen.findByText('12 jours')).toBeInTheDocument();
    expect(mocks.listMaintenance).toHaveBeenCalledWith(
      { page: 1, limit: 5, active: 'true' },
      expect.any(AbortSignal),
    );
    expect(mocks.listMaterials).toHaveBeenCalledWith(
      { page: 1, limit: 25 },
      expect.any(AbortSignal),
    );
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
    expect(mocks.listParts).not.toHaveBeenCalled();
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
        {
          status: 'upcoming',
          horizonDays: 30,
          includeOverdue: false,
          includeWearBased: false,
          includeLowStock: false,
          lowStockOnly: false,
        },
        expect.any(AbortSignal),
      ),
    );

    await user.selectOptions(within(dialog).getByLabelText('Échéance'), '60');
    await waitFor(() =>
      expect(mocks.getOrderList).toHaveBeenLastCalledWith(
        {
          horizonDays: 60,
          includeOverdue: false,
          includeWearBased: false,
          includeLowStock: false,
          lowStockOnly: false,
        },
        expect.any(AbortSignal),
      ),
    );
  });

  it('shows maintenance sheets only with their dedicated permission', async () => {
    mocks.hasPermission.mockImplementation(
      (permission) => permission !== 'maintenance.sheets.read',
    );
    const firstRender = renderPage();

    await screen.findByText('12 jours');
    expect(screen.queryByRole('button', { name: 'Fiches de maintenance' })).not.toBeInTheDocument();
    firstRender.unmount();

    mocks.hasPermission.mockReturnValue(true);
    const user = userEvent.setup();
    renderPage('/maintenance?status=dueToday');
    await screen.findByText('12 jours');
    await user.click(screen.getByRole('button', { name: 'Fiches de maintenance' }));

    expect(screen.getByRole('dialog', { name: 'Fiches de maintenance' })).toBeInTheDocument();
    await waitFor(() =>
      expect(mocks.getSheets).toHaveBeenCalledWith(
        {
          status: 'dueToday',
          includeOverdue: false,
          includeWearBased: false,
        },
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
    expect(activateButton).toHaveClass('btn-outline-brand-blue');

    await user.click(activateButton);
    expect(within(screen.getByRole('dialog')).getByRole('button', { name: 'Activer' })).toHaveClass(
      'btn-outline-brand-blue',
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

  it('shows distinct supplier references when creating and editing a plan', async () => {
    const user = userEvent.setup();
    mocks.listParts.mockResolvedValue({
      data: {
        data: {
          items: [
            {
              uuid: 'part-uuid',
              name: 'Bougie',
              reference: 'BPMR8Y',
              supplierReference: 'FOU-BPMR8Y',
              unit: 'pièce',
            },
            {
              uuid: 'filter-uuid',
              name: 'Filtre',
              reference: 'FH-42',
              supplierReference: 'FH-42',
              unit: 'pièce',
            },
          ],
          pagination: { page: 1, limit: 5, total: 2, totalPages: 1 },
        },
      },
    });
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Créer un plan' }));
    const createDialog = screen.getByRole('dialog', { name: 'Créer un plan' });
    const createPart = await within(createDialog).findByRole('checkbox', {
      name: 'Bougie — BPMR8Y',
    });
    expect(createPart).toHaveAccessibleDescription('(Réf. fournisseur : FOU-BPMR8Y)');
    expect(within(createDialog).getByText(/Réf\. fournisseur : FOU-BPMR8Y/)).toBeVisible();
    expect(within(createDialog).queryByText(/Réf\. fournisseur : FH-42/)).toBeNull();

    await user.click(within(createDialog).getByRole('button', { name: 'Fermer' }));
    await user.click(await screen.findByRole('button', { name: 'Modifier Vidange annuelle' }));
    const editDialog = screen.getByRole('dialog', { name: 'Modifier le plan' });
    const editPart = await within(editDialog).findByRole('checkbox', {
      name: 'Bougie — BPMR8Y',
    });
    expect(editPart).toHaveAccessibleDescription('(Réf. fournisseur : FOU-BPMR8Y)');
    expect(within(editDialog).getByText(/Réf\. fournisseur : FOU-BPMR8Y/)).toBeVisible();
    expect(within(editDialog).queryByText(/Réf\. fournisseur : FH-42/)).toBeNull();
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

  it('paginates catalogue parts in the modal and preserves selections between pages', async () => {
    const user = userEvent.setup();
    mocks.listParts.mockImplementation(({ page, limit }) =>
      Promise.resolve({
        data: {
          data: {
            items: [
              {
                uuid: `part-${page}`,
                name: `Pièce ${page}`,
                reference: `REF-${page}`,
                unit: 'pièce',
              },
            ],
            pagination: { page, limit, total: 2, totalPages: 2 },
          },
        },
      }),
    );
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Créer un plan' }));
    const dialog = screen.getByRole('dialog', { name: 'Créer un plan' });
    const firstPart = await within(dialog).findByRole('checkbox', {
      name: 'Pièce 1 — REF-1',
    });
    expect(mocks.listParts).toHaveBeenCalledWith({ page: 1, limit: 5 }, expect.any(AbortSignal));
    expect(within(dialog).queryByRole('button', { name: 'Charger plus de pièces' })).toBeNull();

    await user.click(firstPart);
    const firstQuantity = within(dialog).getByLabelText('Quantité');
    await user.clear(firstQuantity);
    await user.type(firstQuantity, '3');
    await user.click(within(dialog).getByRole('button', { name: 'Suivant' }));
    expect(
      await within(dialog).findByRole('checkbox', { name: 'Pièce 2 — REF-2' }),
    ).toBeInTheDocument();
    expect(mocks.listParts).toHaveBeenLastCalledWith(
      { page: 2, limit: 5 },
      expect.any(AbortSignal),
    );

    await user.click(within(dialog).getByRole('button', { name: 'Précédent' }));
    expect(await within(dialog).findByRole('checkbox', { name: 'Pièce 1 — REF-1' })).toBeChecked();
    expect(within(dialog).getByLabelText('Quantité')).toHaveValue(3);
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
    const quantity = within(dialog).getByLabelText('Quantité');
    expect(quantity).toHaveAttribute('step', '0.01');
    await user.clear(quantity);
    await user.type(quantity, '0.6');
    await user.click(within(dialog).getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() =>
      expect(mocks.createMaintenance).toHaveBeenCalledWith(
        expect.objectContaining({
          materialUuid: 'material-uuid',
          operationUuid: 'operation-uuid',
          intervalDays: 365,
          lastMaintenanceDate: '2026-07-01',
          parts: [{ partUuid: 'part-uuid', quantity: 0.6 }],
        }),
      ),
    );
    expect(mocks.createMaintenance.mock.calls[0][0]).not.toHaveProperty('title');
    expect(mocks.createMaintenance.mock.calls[0][0]).not.toHaveProperty('description');
  });

  it('hides the operation description unless it is explicitly customized', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Créer un plan' }));
    const dialog = screen.getByRole('dialog', { name: 'Créer un plan' });
    const customizeDescription = within(dialog).getByRole('checkbox', {
      name: 'Personnaliser la description de l’opération',
    });
    expect(customizeDescription).not.toBeChecked();
    expect(within(dialog).queryByLabelText('Description spécifique')).not.toBeInTheDocument();
    expect(within(dialog).getByLabelText('Notes')).toBeVisible();
    expect(
      within(dialog).getByText('La description de l’opération sélectionnée sera utilisée.'),
    ).toBeVisible();

    await user.selectOptions(within(dialog).getByLabelText('Matériel'), 'material-uuid');
    await user.selectOptions(within(dialog).getByLabelText('Opération'), 'operation-uuid');
    await user.click(customizeDescription);
    const description = within(dialog).getByLabelText('Description spécifique');
    expect(description).toHaveValue('Description catalogue');
    await user.clear(description);
    await user.type(description, 'Description propre à ce matériel');
    await user.type(within(dialog).getByLabelText('Intervalle (jours)'), '365');
    await user.type(within(dialog).getByLabelText('Dernier entretien'), '2026-07-01');
    await user.click(within(dialog).getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() =>
      expect(mocks.createMaintenance).toHaveBeenCalledWith(
        expect.objectContaining({ description: 'Description propre à ce matériel' }),
      ),
    );
  });

  it('detects and resets an existing customized operation description', async () => {
    const user = userEvent.setup();
    mocks.listMaintenance.mockResolvedValue({
      data: {
        data: {
          items: [
            {
              uuid: 'maintenance-uuid',
              title: 'Vidange annuelle',
              description: 'Description propre à ce matériel',
              active: true,
              intervalDays: 365,
              lastMaintenanceDate: '2026-07-01',
              maintenanceType: 'preventive',
              priority: 'normal',
              status: 'upcoming',
              material: { uuid: 'material-uuid', name: 'Tronçonneuse' },
              operation: {
                uuid: 'operation-uuid',
                name: 'Vidange',
                description: 'Description catalogue',
                maintenanceType: 'preventive',
              },
              nextMaintenanceDate: '2027-07-01',
              remainingDays: 320,
              parts: [],
            },
          ],
          pagination: { page: 1, limit: 5, total: 1, totalPages: 1 },
        },
      },
    });
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Modifier Vidange annuelle' }));
    const dialog = screen.getByRole('dialog', { name: 'Modifier le plan' });
    const customizeDescription = within(dialog).getByRole('checkbox', {
      name: 'Personnaliser la description de l’opération',
    });
    expect(customizeDescription).toBeChecked();
    expect(within(dialog).getByLabelText('Description spécifique')).toHaveValue(
      'Description propre à ce matériel',
    );

    await user.click(customizeDescription);
    expect(within(dialog).queryByLabelText('Description spécifique')).not.toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() =>
      expect(mocks.updateMaintenance).toHaveBeenCalledWith(
        'maintenance-uuid',
        expect.objectContaining({ description: 'Description catalogue' }),
      ),
    );
  });

  it('creates a wear-based plan with a zero interval', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Créer un plan' }));
    const dialog = screen.getByRole('dialog', { name: 'Créer un plan' });
    const wearBased = within(dialog).getByRole('checkbox', {
      name: 'Intervalle de changement suivant l’usure',
    });
    const interval = within(dialog).getByLabelText('Intervalle (jours)');
    expect(wearBased).not.toBeChecked();
    expect(interval).toBeEnabled();

    await user.selectOptions(within(dialog).getByLabelText('Matériel'), 'material-uuid');
    await user.selectOptions(within(dialog).getByLabelText('Opération'), 'operation-uuid');
    await user.type(within(dialog).getByLabelText('Dernier entretien'), '2026-07-01');
    await user.click(wearBased);
    expect(interval).toBeDisabled();
    await user.click(within(dialog).getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() =>
      expect(mocks.createMaintenance).toHaveBeenCalledWith(
        expect.objectContaining({ intervalDays: 0, lastMaintenanceDate: '2026-07-01' }),
      ),
    );
  });

  it('displays wear-based plans without a calendar deadline', async () => {
    const user = userEvent.setup();
    mocks.listMaintenance.mockResolvedValue({
      data: {
        data: {
          items: [
            {
              uuid: 'wear-based-uuid',
              title: 'Contrôle de lame',
              active: true,
              intervalDays: 0,
              maintenanceType: 'inspection',
              priority: 'normal',
              status: 'wearBased',
              nextMaintenanceDate: null,
              remainingDays: null,
              material: { name: 'Tondeuse' },
            },
          ],
          pagination: { page: 1, limit: 5, total: 1, totalPages: 1 },
        },
      },
    });
    renderPage('/maintenance?status=wearBased');

    expect(await screen.findByText('Contrôle de lame')).toBeVisible();
    expect(screen.getByText('Selon l’usure', { selector: 'td' })).toBeVisible();
    expect(screen.getByText('Selon l’usure', { selector: 'span' })).toHaveClass(
      'maintenance-wear-based',
    );
    expect(screen.getByLabelText('Filtrer par échéance')).toHaveValue('wearBased');

    await user.click(screen.getByRole('button', { name: 'Modifier Contrôle de lame' }));
    expect(
      within(screen.getByRole('dialog', { name: 'Modifier le plan' })).getByRole('checkbox', {
        name: 'Intervalle de changement suivant l’usure',
      }),
    ).toBeChecked();
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
    expect(
      screen.getByRole('button', { name: 'Effectuer sans remplacement de pièce' }),
    ).toHaveClass('btn-outline-danger');
    await user.click(screen.getByRole('button', { name: 'Effectuer en remplaçant la pièce' }));

    await waitFor(() =>
      expect(mocks.executeMaintenance).toHaveBeenCalledWith('maintenance-uuid', {
        performedAt: new Date().toISOString().slice(0, 10),
        comment: '',
        partsAction: 'consume',
      }),
    );
  });

  it('executes a plan by consuming only the selected parts', async () => {
    usePlanParts([
      {
        uuid: 'filter-uuid',
        name: 'Filtre à huile',
        reference: 'FH-100',
        unit: 'pièce',
        quantity: 1,
      },
      {
        uuid: 'spark-plug-uuid',
        name: 'Bougie',
        reference: 'BPMR8Y',
        unit: 'pièce',
        quantity: 2,
      },
    ]);
    const user = userEvent.setup();
    renderPage();

    await user.click(
      await screen.findByRole('button', { name: 'Effectuer Vidange annuelle' }),
    );

    expect(
      screen.getByRole('button', { name: 'Effectuer en remplaçant les pièces' }),
    ).toBeVisible();
    const partialReplacementButton = screen.getByRole('button', {
      name: 'Effectuer un remplacement partiel',
    });
    expect(partialReplacementButton).toHaveClass('btn-outline-brand-blue');
    await user.click(partialReplacementButton);

    const partialDialog = screen.getByRole('dialog', {
      name: 'Effectuer un remplacement partiel',
    });
    expect(within(partialDialog).getByText(/quantités du plan seront retirées du stock/)).toBeVisible();
    await user.click(within(partialDialog).getByRole('checkbox', { name: /Filtre à huile/ }));
    await user.type(within(partialDialog).getByLabelText('Commentaire'), 'Bougie encore utilisable');
    await user.click(
      within(partialDialog).getByRole('button', {
        name: 'Effectuer avec les pièces sélectionnées',
      }),
    );

    await waitFor(() =>
      expect(mocks.executeMaintenance).toHaveBeenCalledWith('maintenance-uuid', {
        performedAt: new Date().toISOString().slice(0, 10),
        comment: 'Bougie encore utilisable',
        partsAction: 'partial',
        partUuids: ['filter-uuid'],
      }),
    );
  });

  it('hides partial replacement without the existing skip-parts permission', async () => {
    usePlanParts([
      { uuid: 'filter-uuid', name: 'Filtre', reference: 'FH-100', unit: 'pièce', quantity: 1 },
      { uuid: 'plug-uuid', name: 'Bougie', reference: 'BPMR8Y', unit: 'pièce', quantity: 1 },
    ]);
    mocks.hasPermission.mockImplementation(
      (permission) => permission !== 'maintenance.execute.skip_parts',
    );
    const user = userEvent.setup();
    renderPage();

    await user.click(
      await screen.findByRole('button', { name: 'Effectuer Vidange annuelle' }),
    );

    expect(
      screen.getByRole('button', { name: 'Effectuer en remplaçant les pièces' }),
    ).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Effectuer un remplacement partiel' }),
    ).not.toBeInTheDocument();
  });

  it('requires a justification and confirmation to execute without changing parts', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(
      await screen.findByRole('button', {
        name: 'Effectuer Vidange annuelle',
      }),
    );

    await user.click(screen.getByRole('button', { name: 'Effectuer sans remplacement de pièce' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Un commentaire est obligatoire sans remplacement de pièce.',
    );
    await user.type(screen.getByLabelText('Commentaire'), 'Bougie encore en bon état');
    await user.click(screen.getByRole('button', { name: 'Effectuer sans remplacement de pièce' }));

    const confirmation = screen.getByRole('dialog', {
      name: 'Effectuer sans remplacement de pièce',
    });
    expect(confirmation).toHaveTextContent('Bougie × 1');
    expect(confirmation).toHaveTextContent('ne seront pas retirées du stock');
    await user.click(
      within(confirmation).getByRole('button', { name: 'Confirmer sans remplacer les pièces' }),
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
      (permission) => permission !== 'maintenance.execute.skip_parts',
    );
    renderPage();

    await user.click(
      await screen.findByRole('button', {
        name: 'Effectuer Vidange annuelle',
      }),
    );

    expect(screen.getByRole('button', { name: 'Effectuer en remplaçant la pièce' })).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Effectuer sans remplacement de pièce' }),
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
              createdAt: '2026-08-15T08:15:00.000Z',
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
    expect(screen.getByText('15/08/2026 10:15')).toBeVisible();
    expect(badge).toHaveClass('status-badge', 'maintenance-history-exception');
    expect(badge.closest('li')).toHaveClass('maintenance-history-without-parts');
    expect(screen.getByText('Pièces non remplacées : Bougie × 1')).toBeVisible();
  });

  it('distinguishes replaced and retained parts for a partial execution in history', async () => {
    const user = userEvent.setup();
    mocks.maintenanceHistory.mockResolvedValue({
      data: {
        data: {
          items: [
            {
              uuid: 'partial-history-uuid',
              performedAt: '2026-08-16',
              createdAt: '2026-08-16T08:15:00.000Z',
              comment: 'Bougie conservée',
              executionType: 'partialPartReplacement',
              partsSnapshot: [
                { name: 'Filtre', quantity: 1, consumed: true },
                { name: 'Bougie', quantity: 1, consumed: false },
              ],
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

    expect(await screen.findByText('Remplacement partiel')).toHaveClass(
      'status-badge',
      'maintenance-history-partial',
    );
    expect(screen.getByText('Pièces remplacées : Filtre × 1')).toBeVisible();
    expect(screen.getByText('Pièces non remplacées : Bougie × 1')).toBeVisible();
  });
});
