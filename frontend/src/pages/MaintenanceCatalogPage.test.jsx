import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  listOperations: vi.fn(),
  createOperation: vi.fn(),
  updateOperation: vi.fn(),
  deleteOperation: vi.fn(),
  listManufacturers: vi.fn(),
  listSuppliers: vi.fn(),
  listParts: vi.fn(),
  createPart: vi.fn(),
  updatePart: vi.fn(),
  updatePartStock: vi.fn(),
  updatePartPrice: vi.fn(),
  listPartStockMovements: vi.fn(),
  listPartPriceHistory: vi.fn(),
  createIntervention: vi.fn(),
  listMaterials: vi.fn(),
  deletePart: vi.fn(),
  notify: vi.fn(),
  hasPermission: vi.fn(),
}));

vi.mock('../api/maintenance.api.js', () => ({
  listMaintenanceOperations: mocks.listOperations,
  createMaintenanceOperation: mocks.createOperation,
  updateMaintenanceOperation: mocks.updateOperation,
  deleteMaintenanceOperation: mocks.deleteOperation,
  listMaintenanceParts: mocks.listParts,
  createMaintenancePart: mocks.createPart,
  updateMaintenancePart: mocks.updatePart,
  updateMaintenancePartStock: mocks.updatePartStock,
  updateMaintenancePartPrice: mocks.updatePartPrice,
  listMaintenancePartStockMovements: mocks.listPartStockMovements,
  listMaintenancePartPriceHistory: mocks.listPartPriceHistory,
  createMaintenanceIntervention: mocks.createIntervention,
  deleteMaintenancePart: mocks.deletePart,
}));
vi.mock('../api/reference.api.js', () => ({
  listMaterialOptions: mocks.listMaterials,
  createReferenceApi: (resource) => ({
    list: resource === 'manufacturers' ? mocks.listManufacturers : mocks.listSuppliers,
  }),
}));
vi.mock('../auth/useAuth.js', () => ({
  default: () => ({ hasPermission: mocks.hasPermission }),
}));
vi.mock('../notifications/useNotification.js', () => ({
  default: () => ({ notify: mocks.notify }),
}));
vi.mock('../components/ManufacturerLogo.jsx', () => ({
  default: ({ manufacturer }) => <img alt={`Logo ${manufacturer?.name ?? 'indisponible'}`} />,
}));

import MaintenanceOperationsPage from './MaintenanceOperationsPage.jsx';
import MaintenancePartsPage from './MaintenancePartsPage.jsx';

describe('dedicated maintenance catalogue pages', () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.hasPermission.mockReturnValue(true);
    mocks.listOperations.mockResolvedValue({
      data: {
        data: [
          {
            uuid: 'operation-uuid',
            name: 'Vidange',
            maintenanceType: 'preventive',
            description: 'Remplacement de l’huile\n- Contrôler la tension\n- Vérifier l’usure',
            active: true,
          },
          {
            uuid: 'inactive-operation-uuid',
            name: 'Contrôle',
            maintenanceType: 'inspection',
            description: 'Contrôle visuel',
            active: false,
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
            manufacturer: 'NGK',
            manufacturerUuid: 'manufacturer-uuid',
            reference: 'BPMR8Y',
            supplier: 'Pièces Pro',
            supplierUuid: 'supplier-uuid',
            supplierReference: 'FOU-42',
            unit: 'pièce',
            stockStatus: 'toOrder',
            stockQuantity: 0,
            quantityOnHand: 0,
            quantityOnOrder: 0,
            unitPrice: 10,
            totalMaintenanceCost: 25,
            active: true,
          },
        ],
      },
    });
    mocks.listManufacturers.mockResolvedValue({
      data: {
        data: {
          items: [
            {
              uuid: 'manufacturer-uuid',
              name: 'NGK',
              notes: null,
              active: true,
              hasLogo: true,
            },
          ],
          pagination: { page: 1, limit: 25, total: 1, totalPages: 1 },
        },
      },
    });
    mocks.listSuppliers.mockResolvedValue({
      data: {
        data: {
          items: [{ uuid: 'supplier-uuid', name: 'Pièces Pro', active: true }],
          pagination: { page: 1, limit: 25, total: 1, totalPages: 1 },
        },
      },
    });
    mocks.createOperation.mockResolvedValue({ data: { data: {} } });
    mocks.createPart.mockResolvedValue({ data: { data: {} } });
    mocks.updateOperation.mockResolvedValue({ data: { data: {} } });
    mocks.listPartStockMovements.mockResolvedValue({
      data: { data: { items: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 1 } } },
    });
    mocks.listPartPriceHistory.mockResolvedValue({
      data: { data: { items: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 1 } } },
    });
    mocks.updatePartStock.mockResolvedValue({
      data: {
        data: {
          uuid: 'part-uuid',
          name: 'Bougie',
          unit: 'pièce',
          quantityOnHand: 2,
          quantityOnOrder: 3,
          unitPrice: 10,
          totalMaintenanceCost: 25,
          stockStatus: 'inStock',
        },
      },
    });
    mocks.updatePartPrice.mockResolvedValue({
      data: {
        data: {
          uuid: 'part-uuid',
          name: 'Bougie',
          unit: 'pièce',
          quantityOnHand: 0,
          quantityOnOrder: 0,
          unitPrice: 12.5,
          totalMaintenanceCost: 25,
          stockStatus: 'toOrder',
        },
      },
    });
    mocks.createIntervention.mockResolvedValue({ data: { data: { uuid: 'intervention-uuid' } } });
    mocks.listMaterials.mockResolvedValue({
      data: {
        data: {
          items: [{ uuid: 'material-uuid', name: 'Tondeuse', active: true }],
          pagination: { page: 1, limit: 25, total: 1, totalPages: 1 },
        },
      },
    });
  });

  it('creates and deactivates an operation from its dedicated page', async () => {
    const user = userEvent.setup();
    render(<MaintenanceOperationsPage />);

    expect(await screen.findByRole('heading', { name: 'Opérations de maintenance' })).toBeVisible();
    expect(screen.getByText('Vidange')).toBeVisible();
    const description = screen.getByText(
      (_content, element) =>
        element.classList.contains('multiline-text') &&
        element.textContent.startsWith('Remplacement de l’huile'),
    );
    expect(description.textContent).toBe(
      'Remplacement de l’huile\n- Contrôler la tension\n- Vérifier l’usure',
    );

    await user.click(screen.getByRole('button', { name: 'Créer' }));
    const designation = screen.getByLabelText('Désignation');
    await user.type(designation, 'Vid');
    expect(screen.getByRole('listbox')).toHaveClass('autocomplete-options');
    expect(screen.getByRole('option', { name: 'Vidange' })).toHaveClass('autocomplete-option');
    await user.clear(designation);
    await user.type(designation, 'Graissage');
    expect(screen.getByRole('status')).toHaveClass('autocomplete-empty');
    expect(screen.getByRole('status')).toHaveTextContent('Aucune proposition');
    await user.selectOptions(screen.getByLabelText('Type'), 'lubrication');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() =>
      expect(mocks.createOperation).toHaveBeenCalledWith({
        name: 'Graissage',
        maintenanceType: 'lubrication',
        description: null,
      }),
    );

    await user.click(screen.getByRole('button', { name: 'Désactiver Vidange' }));
    await user.click(screen.getByRole('button', { name: 'Désactiver' }));

    await waitFor(() =>
      expect(mocks.updateOperation).toHaveBeenCalledWith('operation-uuid', { active: false }),
    );
  });

  it('creates an exact part from its dedicated page', async () => {
    const user = userEvent.setup();
    render(<MaintenancePartsPage />);

    expect(await screen.findByRole('heading', { name: 'Pièces de maintenance' })).toBeVisible();
    expect(mocks.listManufacturers).toHaveBeenCalledWith({ limit: 25 }, expect.any(AbortSignal));
    expect(mocks.listSuppliers).toHaveBeenCalledWith({ limit: 25 }, expect.any(AbortSignal));
    expect(await screen.findByText('BPMR8Y')).toBeVisible();
    expect(screen.getByRole('img', { name: 'Logo NGK' })).toBeVisible();
    expect(screen.queryByText('NGK')).not.toBeInTheDocument();
    expect(screen.getByText('À commander', { selector: 'span' })).toHaveClass('stock-to-order');
    expect(screen.getByRole('columnheader', { name: 'Actions' })).toBeVisible();
    expect(screen.queryByRole('columnheader', { name: 'Fournisseur' })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: 'Commandée' })).not.toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Prix unitaire' })).toBeVisible();
    expect(screen.getByText(/10,00/)).toBeVisible();
    expect(screen.queryByRole('columnheader', { name: 'Catalogue' })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('columnheader', { name: 'Référence fournisseur' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('FOU-42')).not.toBeInTheDocument();
    expect(screen.getByRole('table').parentElement).toHaveClass('table-responsive');

    await user.click(screen.getByRole('button', { name: 'Créer' }));
    expect(
      within(screen.getByRole('dialog')).queryByLabelText('État du stock'),
    ).not.toBeInTheDocument();
    const designation = screen.getByLabelText('Désignation');
    await user.type(designation, 'Bou');
    await user.click(screen.getByRole('option', { name: 'Bougie' }));
    expect(designation).toHaveValue('Bougie');
    await user.clear(designation);
    await user.type(designation, 'Filtre à huile');
    const unit = screen.getByLabelText('Unité');
    await user.clear(unit);
    await user.type(unit, 'iè');
    await user.click(screen.getByRole('option', { name: 'pièce' }));
    expect(unit).toHaveValue('pièce');
    await user.selectOptions(screen.getByLabelText('Fabricant'), 'manufacturer-uuid');
    await user.type(screen.getByLabelText('Référence fabricant'), 'OF-123');
    await user.selectOptions(screen.getByLabelText('Fournisseur'), 'supplier-uuid');
    await user.clear(screen.getByLabelText('Prix unitaire (€)'));
    await user.type(screen.getByLabelText('Prix unitaire (€)'), '12.50');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() =>
      expect(mocks.createPart).toHaveBeenCalledWith({
        name: 'Filtre à huile',
        manufacturerUuid: 'manufacturer-uuid',
        reference: 'OF-123',
        supplierUuid: 'supplier-uuid',
        supplierReference: null,
        unit: 'pièce',
        unitPrice: 12.5,
      }),
    );
  });

  it('keeps tracked price changes out of the general part edit form', async () => {
    const user = userEvent.setup();
    render(<MaintenancePartsPage />);

    await user.click(await screen.findByRole('button', { name: 'Modifier Bougie' }));

    expect(screen.getByRole('dialog')).toBeVisible();
    expect(screen.queryByLabelText('Prix unitaire (€)')).not.toBeInTheDocument();
    const unit = screen.getByLabelText('Unité');
    await user.clear(unit);
    await user.type(unit, 'iè');
    await user.click(screen.getByRole('option', { name: 'pièce' }));
    expect(unit).toHaveValue('pièce');
  });

  it('manages workshop and ordered quantities from a dedicated reusable action', async () => {
    const user = userEvent.setup();
    render(<MaintenancePartsPage />);

    await user.click(await screen.findByRole('button', { name: 'Gérer le stock de Bougie' }));
    const stockDialog = screen.getByRole('dialog');
    const stockTitle = within(stockDialog).getByRole('heading', {
      name: 'Gérer le stock — Bougie',
    });
    const partReference = within(stockDialog).getByText('BPMR8Y', { selector: 'small' });
    expect(stockTitle.nextElementSibling).toBe(partReference);
    expect(partReference).toHaveClass('d-block', 'text-body-secondary');
    const quantityOnHand = screen.getByLabelText('Quantité en stock');
    const quantityOnOrder = screen.getByLabelText('Quantité commandée');
    const operationDate = screen.getByLabelText('Date de l’opération');
    expect(operationDate.value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(operationDate).toHaveAttribute('max', operationDate.value);
    expect(quantityOnHand).toHaveValue(0);
    expect(quantityOnOrder).toHaveValue(0);
    expect(quantityOnHand.closest('.col-sm-5')?.parentElement).toHaveClass(
      'justify-content-around',
      'text-center',
    );
    expect(quantityOnOrder.closest('.col-sm-5')).toBeVisible();
    await user.clear(screen.getByLabelText('Quantité en stock'));
    await user.type(screen.getByLabelText('Quantité en stock'), '2');
    await user.clear(screen.getByLabelText('Quantité commandée'));
    await user.type(screen.getByLabelText('Quantité commandée'), '3');
    await user.clear(operationDate);
    await user.type(operationDate, '2026-08-20');
    await user.click(screen.getByRole('button', { name: 'Enregistrer le mouvement' }));

    await waitFor(() =>
      expect(mocks.updatePartStock).toHaveBeenCalledWith('part-uuid', {
        operation: 'adjust',
        performedAt: '2026-08-20',
        quantityOnHand: 2,
        quantityOnOrder: 3,
      }),
    );
    expect(mocks.notify).toHaveBeenCalledWith(
      'success',
      'Mouvement de stock enregistré : Ajustement.',
    );
  });

  it('submits only the stock quantity covered by the user permission', async () => {
    const user = userEvent.setup();
    mocks.hasPermission.mockImplementation(
      (permission) => permission === 'maintenance.parts.stock.adjust_on_hand',
    );
    render(<MaintenancePartsPage />);

    await user.click(await screen.findByRole('button', { name: 'Gérer le stock de Bougie' }));
    expect(screen.getByRole('option', { name: 'Corriger les quantités' })).toBeVisible();
    expect(
      screen.queryByRole('option', { name: 'Enregistrer une commande' }),
    ).not.toBeInTheDocument();
    const quantityOnHand = screen.getByLabelText('Quantité en stock');
    expect(screen.queryByLabelText('Quantité commandée')).not.toBeInTheDocument();

    await user.clear(quantityOnHand);
    await user.type(quantityOnHand, '4');
    await user.click(screen.getByRole('button', { name: 'Enregistrer le mouvement' }));

    await waitFor(() =>
      expect(mocks.updatePartStock).toHaveBeenCalledWith('part-uuid', {
        operation: 'adjust',
        performedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        quantityOnHand: 4,
      }),
    );
  });

  it('records an unplanned maintenance intervention from the stock dialog', async () => {
    const user = userEvent.setup();
    mocks.listParts.mockResolvedValue({
      data: {
        data: [
          {
            uuid: 'part-uuid',
            name: 'Bougie',
            reference: 'BPMR8Y',
            unit: 'pièce',
            quantityOnHand: 2,
            quantityOnOrder: 0,
            unitPrice: 10,
            totalMaintenanceCost: 25,
            active: true,
          },
        ],
      },
    });
    render(<MaintenancePartsPage />);

    await user.click(await screen.findByRole('button', { name: 'Gérer le stock de Bougie' }));
    await user.selectOptions(screen.getByLabelText(/^Opération/), 'consume');
    const materialSearch = screen.getByRole('combobox', { name: 'Rechercher un matériel' });
    await user.type(materialSearch, 'Ton');
    await screen.findByRole('option', { name: 'Tondeuse' });
    expect(mocks.listMaterials).toHaveBeenCalledWith(
      { active: true, search: 'Ton', page: 1, limit: 25 },
      expect.any(AbortSignal),
    );
    await user.click(screen.getByRole('option', { name: 'Tondeuse' }));
    expect(materialSearch).toHaveValue('Tondeuse');
    expect(screen.queryByLabelText('Matériel concerné')).not.toBeInTheDocument();
    await user.clear(screen.getByLabelText('Quantité utilisée'));
    await user.type(screen.getByLabelText('Quantité utilisée'), '2');
    await user.type(screen.getByLabelText('Description de l’intervention'), 'Grille cassée');
    await user.click(screen.getByRole('button', { name: 'Enregistrer l’intervention' }));

    await waitFor(() =>
      expect(mocks.createIntervention).toHaveBeenCalledWith({
        materialUuid: 'material-uuid',
        description: 'Grille cassée',
        performedAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        parts: [{ partUuid: 'part-uuid', quantity: 2 }],
      }),
    );
    expect(mocks.notify).toHaveBeenCalledWith('success', 'Intervention ponctuelle enregistrée.');
  });

  it('does not expose stock actions through the general part-update permission', async () => {
    mocks.hasPermission.mockImplementation(
      (permission) => permission === 'maintenance.parts.update',
    );
    render(<MaintenancePartsPage />);

    expect(await screen.findByRole('button', { name: 'Modifier Bougie' })).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Gérer le stock de Bougie' }),
    ).not.toBeInTheDocument();
  });

  it('shows separate cost cards and changes the unit price without an operation label', async () => {
    const user = userEvent.setup();
    render(<MaintenancePartsPage />);

    await user.click(await screen.findByRole('button', { name: 'Gérer le stock de Bougie' }));
    const stockDialog = screen.getByRole('dialog');
    const cards = stockDialog.querySelectorAll('.stock-summary-card');
    expect(cards).toHaveLength(4);
    expect(
      within(stockDialog).getByText('Coût cumulé utilisé').nextElementSibling,
    ).toHaveTextContent('25,00 €');
    expect(
      within(stockDialog).getByText('Valeur du stock actuel').nextElementSibling,
    ).toHaveTextContent('0,00 €');

    await user.selectOptions(screen.getByLabelText(/^Opération/), 'price');
    expect(screen.getByLabelText('Nouveau prix unitaire (€)')).toHaveValue(10);
    const operationDate = screen.getByLabelText('Date de l’opération');
    await user.clear(operationDate);
    await user.type(operationDate, '2026-08-19');
    expect(screen.queryByLabelText('Libellé de l’opération')).not.toBeInTheDocument();
    await user.clear(screen.getByLabelText('Nouveau prix unitaire (€)'));
    await user.type(screen.getByLabelText('Nouveau prix unitaire (€)'), '12.5');
    await user.click(screen.getByRole('button', { name: 'Enregistrer le prix' }));

    await waitFor(() =>
      expect(mocks.updatePartPrice).toHaveBeenCalledWith('part-uuid', {
        unitPrice: 12.5,
        performedAt: '2026-08-19',
      }),
    );
    expect(mocks.notify).toHaveBeenCalledWith('success', 'Prix unitaire mis à jour.');
  });

  it('reports that no designation is proposed when the database is empty', async () => {
    const user = userEvent.setup();
    mocks.listOperations.mockResolvedValue({ data: { data: [] } });
    render(<MaintenanceOperationsPage />);

    expect(await screen.findByText('Aucun élément ne correspond aux filtres.')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Créer' }));
    await user.type(screen.getByLabelText('Désignation'), 'Gra');

    expect(screen.getByText('Aucune proposition')).toBeVisible();
  });

  it('uses the shared panel to filter a maintenance catalogue by status', async () => {
    const user = userEvent.setup();
    render(<MaintenanceOperationsPage />);

    expect(await screen.findByText('Vidange')).toBeVisible();
    expect(screen.queryByText('Contrôle')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Rechercher dans opérations de maintenance')).toHaveValue('');
    expect(screen.getByLabelText('Filtrer par statut')).toHaveValue('true');

    await user.selectOptions(screen.getByLabelText('Filtrer par statut'), 'false');

    expect(screen.getByText('Contrôle')).toBeVisible();
    expect(screen.queryByText('Vidange')).not.toBeInTheDocument();
    const activateButton = screen.getByRole('button', { name: 'Activer Contrôle' });
    expect(activateButton).toHaveClass('btn-outline-activation');

    await user.click(activateButton);
    expect(screen.getByRole('button', { name: 'Réactiver' })).toHaveClass('btn-outline-activation');
  });

  it('filters maintenance parts by stock status while keeping the existing filters', async () => {
    const user = userEvent.setup();
    render(<MaintenancePartsPage />);

    const search = await screen.findByLabelText('Rechercher dans pièces de maintenance');
    const active = screen.getByLabelText('Filtrer par statut');
    const stockStatus = screen.getByLabelText('Filtrer par état du stock');

    expect(active).toHaveValue('true');
    expect(stockStatus).toHaveValue('');
    await user.type(search, 'Bou');
    await user.selectOptions(stockStatus, 'ordered');

    await waitFor(() =>
      expect(mocks.listParts).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'Bou',
          active: 'true',
          stockStatus: 'ordered',
          page: 1,
          limit: 5,
        }),
        expect.any(AbortSignal),
      ),
    );
    expect(search).toHaveValue('Bou');
    expect(active).toHaveValue('true');
    expect(stockStatus).toHaveValue('ordered');
  });

  it('uses the shared pagination controls for maintenance catalogues', async () => {
    const user = userEvent.setup();
    mocks.listOperations.mockResolvedValue({
      data: {
        data: Array.from({ length: 6 }, (_value, index) => ({
          uuid: `operation-${index + 1}`,
          name: `Opération ${index + 1}`,
          maintenanceType: 'preventive',
          description: null,
          active: true,
        })),
      },
    });

    render(<MaintenanceOperationsPage />);

    expect(await screen.findByText('Opération 5')).toBeVisible();
    expect(screen.queryByText('Opération 6')).not.toBeInTheDocument();
    expect(screen.getByText('6 opération(s), page 1 sur 2')).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Suivant' }));

    expect(screen.getByText('Opération 6')).toBeVisible();
    expect(screen.queryByText('Opération 1')).not.toBeInTheDocument();
  });

  it('filters operation actions with operation-specific permissions', async () => {
    mocks.hasPermission.mockImplementation(
      (permission) => permission === 'maintenance.operations.read',
    );

    render(<MaintenanceOperationsPage />);

    expect(await screen.findByText('Vidange')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Créer' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Modifier Vidange' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Désactiver Vidange' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Supprimer Vidange' })).not.toBeInTheDocument();
    expect(mocks.hasPermission).toHaveBeenCalledWith('maintenance.operations.create');
    expect(mocks.hasPermission).toHaveBeenCalledWith('maintenance.operations.update');
    expect(mocks.hasPermission).toHaveBeenCalledWith('maintenance.operations.status.update');
    expect(mocks.hasPermission).toHaveBeenCalledWith('maintenance.operations.delete');
  });
});
