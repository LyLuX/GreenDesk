import { cleanup, render, screen, waitFor } from '@testing-library/react';
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
  listPartStockMovements: vi.fn(),
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
  listMaintenancePartStockMovements: mocks.listPartStockMovements,
  deleteMaintenancePart: mocks.deletePart,
}));
vi.mock('../api/reference.api.js', () => ({
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
            description: 'Remplacement de l’huile',
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
            active: true,
          },
        ],
      },
    });
    mocks.listManufacturers.mockResolvedValue({
      data: {
        data: [
          {
            uuid: 'manufacturer-uuid',
            name: 'NGK',
            notes: null,
            active: true,
            hasLogo: true,
          },
        ],
      },
    });
    mocks.listSuppliers.mockResolvedValue({
      data: {
        data: [{ uuid: 'supplier-uuid', name: 'Pièces Pro', active: true }],
      },
    });
    mocks.createOperation.mockResolvedValue({ data: { data: {} } });
    mocks.createPart.mockResolvedValue({ data: { data: {} } });
    mocks.updateOperation.mockResolvedValue({ data: { data: {} } });
    mocks.listPartStockMovements.mockResolvedValue({
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
          stockStatus: 'inStock',
        },
      },
    });
  });

  it('creates and deactivates an operation from its dedicated page', async () => {
    const user = userEvent.setup();
    render(<MaintenanceOperationsPage />);

    expect(await screen.findByRole('heading', { name: 'Opérations de maintenance' })).toBeVisible();
    expect(screen.getByText('Vidange')).toBeVisible();

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
    expect(await screen.findByText('BPMR8Y')).toBeVisible();
    expect(screen.getByRole('img', { name: 'Logo NGK' })).toBeVisible();
    expect(screen.queryByText('NGK')).not.toBeInTheDocument();
    expect(screen.getByText('À commander')).toHaveClass('stock-to-order');
    expect(screen.getByRole('columnheader', { name: 'Actions' })).toBeVisible();
    expect(
      screen.queryByRole('columnheader', { name: 'Référence fournisseur' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('FOU-42')).not.toBeInTheDocument();
    expect(screen.getByRole('table').parentElement).toHaveClass('table-responsive');

    await user.click(screen.getByRole('button', { name: 'Créer' }));
    expect(screen.queryByLabelText('État du stock')).not.toBeInTheDocument();
    const designation = screen.getByLabelText('Désignation');
    await user.type(designation, 'Bou');
    await user.click(screen.getByRole('option', { name: 'Bougie' }));
    expect(designation).toHaveValue('Bougie');
    await user.clear(designation);
    await user.type(designation, 'Filtre à huile');
    await user.selectOptions(screen.getByLabelText('Fabricant'), 'manufacturer-uuid');
    await user.type(screen.getByLabelText('Référence fabricant'), 'OF-123');
    await user.selectOptions(screen.getByLabelText('Fournisseur'), 'supplier-uuid');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() =>
      expect(mocks.createPart).toHaveBeenCalledWith({
        name: 'Filtre à huile',
        manufacturerUuid: 'manufacturer-uuid',
        reference: 'OF-123',
        supplierUuid: 'supplier-uuid',
        supplierReference: null,
        unit: 'pièce',
      }),
    );
  });

  it('manages workshop and ordered quantities from a dedicated reusable action', async () => {
    const user = userEvent.setup();
    render(<MaintenancePartsPage />);

    await user.click(await screen.findByRole('button', { name: 'Gérer le stock de Bougie' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Gérer le stock — Bougie');
    expect(screen.getByLabelText('Quantité en stock')).toHaveValue(0);
    expect(screen.getByLabelText('Quantité commandée')).toHaveValue(0);
    await user.clear(screen.getByLabelText('Quantité en stock'));
    await user.type(screen.getByLabelText('Quantité en stock'), '2');
    await user.clear(screen.getByLabelText('Quantité commandée'));
    await user.type(screen.getByLabelText('Quantité commandée'), '3');
    await user.click(screen.getByRole('button', { name: 'Enregistrer le mouvement' }));

    await waitFor(() =>
      expect(mocks.updatePartStock).toHaveBeenCalledWith('part-uuid', {
        operation: 'adjust',
        quantityOnHand: 2,
        quantityOnOrder: 3,
      }),
    );
    expect(mocks.notify).toHaveBeenCalledWith(
      'success',
      'Mouvement de stock enregistré : Ajustement.',
    );
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
    expect(mocks.hasPermission).toHaveBeenCalledWith('maintenance.operations.delete');
  });
});
