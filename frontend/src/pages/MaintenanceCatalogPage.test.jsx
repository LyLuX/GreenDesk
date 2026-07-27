import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  listOperations: vi.fn(),
  createOperation: vi.fn(),
  updateOperation: vi.fn(),
  deleteOperation: vi.fn(),
  listManufacturers: vi.fn(),
  createManufacturer: vi.fn(),
  updateManufacturer: vi.fn(),
  deleteManufacturer: vi.fn(),
  listSuppliers: vi.fn(),
  createSupplier: vi.fn(),
  updateSupplier: vi.fn(),
  deleteSupplier: vi.fn(),
  listParts: vi.fn(),
  createPart: vi.fn(),
  updatePart: vi.fn(),
  deletePart: vi.fn(),
  notify: vi.fn(),
}));

vi.mock('../api/maintenance.api.js', () => ({
  listMaintenanceOperations: mocks.listOperations,
  createMaintenanceOperation: mocks.createOperation,
  updateMaintenanceOperation: mocks.updateOperation,
  deleteMaintenanceOperation: mocks.deleteOperation,
  listMaintenanceManufacturers: mocks.listManufacturers,
  createMaintenanceManufacturer: mocks.createManufacturer,
  updateMaintenanceManufacturer: mocks.updateManufacturer,
  deleteMaintenanceManufacturer: mocks.deleteManufacturer,
  listMaintenanceSuppliers: mocks.listSuppliers,
  createMaintenanceSupplier: mocks.createSupplier,
  updateMaintenanceSupplier: mocks.updateSupplier,
  deleteMaintenanceSupplier: mocks.deleteSupplier,
  listMaintenanceParts: mocks.listParts,
  createMaintenancePart: mocks.createPart,
  updateMaintenancePart: mocks.updatePart,
  deleteMaintenancePart: mocks.deletePart,
}));
vi.mock('../auth/useAuth.js', () => ({
  default: () => ({ hasPermission: () => true }),
}));
vi.mock('../notifications/useNotification.js', () => ({
  default: () => ({ notify: mocks.notify }),
}));

import MaintenanceOperationsPage from './MaintenanceOperationsPage.jsx';
import MaintenanceManufacturersPage from './MaintenanceManufacturersPage.jsx';
import MaintenancePartsPage from './MaintenancePartsPage.jsx';
import MaintenanceSuppliersPage from './MaintenanceSuppliersPage.jsx';

describe('dedicated maintenance catalogue pages', () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
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
            active: true,
          },
        ],
      },
    });
    mocks.listManufacturers.mockResolvedValue({
      data: {
        data: [{ uuid: 'manufacturer-uuid', name: 'NGK', notes: null, active: true }],
      },
    });
    mocks.listSuppliers.mockResolvedValue({
      data: {
        data: [{ uuid: 'supplier-uuid', name: 'Pièces Pro', active: true }],
      },
    });
    mocks.createOperation.mockResolvedValue({ data: { data: {} } });
    mocks.createManufacturer.mockResolvedValue({ data: { data: {} } });
    mocks.createSupplier.mockResolvedValue({ data: { data: {} } });
    mocks.createPart.mockResolvedValue({ data: { data: {} } });
    mocks.updateOperation.mockResolvedValue({ data: { data: {} } });
  });

  it('creates and deactivates an operation from its dedicated page', async () => {
    const user = userEvent.setup();
    render(<MaintenanceOperationsPage />);

    expect(await screen.findByRole('heading', { name: 'Opérations de maintenance' })).toBeVisible();
    expect(screen.getByText('Vidange')).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Créer' }));
    await user.type(screen.getByLabelText('Intitulé réutilisable'), 'Graissage');
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
    expect(screen.getByText('BPMR8Y')).toBeVisible();

    await user.click(screen.getByRole('button', { name: 'Créer' }));
    await user.type(screen.getByLabelText('Désignation'), 'Filtre à huile');
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

  it('creates a manufacturer from its dedicated page', async () => {
    const user = userEvent.setup();
    render(<MaintenanceManufacturersPage />);

    expect(await screen.findByRole('heading', { name: 'Fabricants de pièces' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Créer' }));
    await user.type(screen.getByLabelText('Nom'), 'Bosch');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() =>
      expect(mocks.createManufacturer).toHaveBeenCalledWith({
        name: 'Bosch',
        notes: null,
      }),
    );
  });

  it('creates a supplier from its dedicated page', async () => {
    const user = userEvent.setup();
    render(<MaintenanceSuppliersPage />);

    expect(await screen.findByRole('heading', { name: 'Fournisseurs' })).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Créer' }));
    await user.type(screen.getByLabelText('Nom'), 'Atelier Distribution');
    await user.type(screen.getByLabelText('E-mail'), 'contact@example.com');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() =>
      expect(mocks.createSupplier).toHaveBeenCalledWith({
        name: 'Atelier Distribution',
        contactName: null,
        email: 'contact@example.com',
        phone: null,
        notes: null,
      }),
    );
  });
});
