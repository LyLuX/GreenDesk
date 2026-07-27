import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  listMaintenance: vi.fn(),
  listOperations: vi.fn(),
  listParts: vi.fn(),
  listMaterials: vi.fn(),
  createMaintenance: vi.fn(),
  executeMaintenance: vi.fn(),
}));

vi.mock('../api/maintenance.api.js', () => ({
  createMaintenance: mocks.createMaintenance,
  deleteMaintenance: vi.fn(),
  executeMaintenance: mocks.executeMaintenance,
  listMaintenance: mocks.listMaintenance,
  listMaintenanceOperations: mocks.listOperations,
  listMaintenanceParts: mocks.listParts,
  maintenanceHistory: vi.fn(),
  setMaintenanceStatus: vi.fn(),
  updateMaintenance: vi.fn(),
  createMaintenanceOperation: vi.fn(),
  updateMaintenanceOperation: vi.fn(),
  deleteMaintenanceOperation: vi.fn(),
  createMaintenancePart: vi.fn(),
  updateMaintenancePart: vi.fn(),
  deleteMaintenancePart: vi.fn(),
  getMaintenanceOrderList: vi.fn(),
}));
vi.mock('../api/reference.api.js', () => ({
  createReferenceApi: () => ({ list: mocks.listMaterials }),
}));
vi.mock('../auth/useAuth.js', () => ({
  default: () => ({ hasPermission: () => true }),
}));
vi.mock('../notifications/useNotification.js', () => ({
  default: () => ({ notify: vi.fn() }),
}));

import MaintenancePage from './MaintenancePage.jsx';

describe('MaintenancePage', () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listMaterials.mockResolvedValue({
      data: {
        data: {
          items: [{ uuid: 'material-uuid', name: 'Tronçonneuse' }],
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
            },
          ],
          pagination: null,
        },
      },
    });
  });

  const renderPage = () =>
    render(
      <MemoryRouter>
        <MaintenancePage />
      </MemoryRouter>,
    );

  it('shows only the date deadline and the remaining days', async () => {
    renderPage();

    expect(await screen.findByText('12 jours')).toBeInTheDocument();
    expect(mocks.listMaintenance).toHaveBeenCalledWith(
      { page: 1, limit: 5 },
      expect.any(AbortSignal),
    );
    expect(mocks.listMaterials).toHaveBeenCalledWith({ limit: 'all' }, expect.any(AbortSignal));
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
    expect(editButton.parentElement).toHaveClass(
      'd-flex',
      'h-100',
      'w-100',
      'flex-wrap',
      'align-items-center',
      'justify-content-center',
    );
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
    await user.selectOptions(screen.getByLabelText('Matériel'), 'material-uuid');
    await user.selectOptions(screen.getByLabelText('Opération'), 'operation-uuid');
    await user.type(screen.getByLabelText('Intervalle (jours)'), '365');
    await user.type(screen.getByLabelText('Dernier entretien'), '2026-07-01');
    await user.click(screen.getByRole('checkbox', { name: 'Bougie — BPMR8Y' }));
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

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

  it('executes maintenance without requesting or sending engine hours', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(
      await screen.findByRole('button', {
        name: 'Effectuer Vidange annuelle',
      }),
    );

    expect(screen.queryByLabelText('Heures moteur')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Valider' }));

    await waitFor(() =>
      expect(mocks.executeMaintenance).toHaveBeenCalledWith('maintenance-uuid', {
        performedAt: new Date().toISOString().slice(0, 10),
        comment: '',
      }),
    );
  });
});
