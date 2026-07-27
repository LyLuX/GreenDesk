import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  listMaintenance: vi.fn(),
  listMaterials: vi.fn(),
  executeMaintenance: vi.fn(),
  createMaintenance: vi.fn(),
  listMaintenanceTemplates: vi.fn(),
}));

vi.mock('../api/maintenance.api.js', () => ({
  createMaintenance: mocks.createMaintenance,
  deleteMaintenance: vi.fn(),
  executeMaintenance: mocks.executeMaintenance,
  listMaintenance: mocks.listMaintenance,
  maintenanceHistory: vi.fn(),
  setMaintenanceStatus: vi.fn(),
  updateMaintenance: vi.fn(),
}));
vi.mock('../api/reference.api.js', () => ({
  createReferenceApi: () => ({ list: mocks.listMaterials }),
}));
vi.mock('../api/maintenance-template.api.js', () => ({
  listMaintenanceTemplates: mocks.listMaintenanceTemplates,
}));
vi.mock('../auth/useAuth.js', () => ({
  default: () => ({ hasPermission: () => true }),
}));
vi.mock('../notifications/useNotification.js', () => ({
  default: () => ({ notify: vi.fn() }),
}));

import MaintenancePage from './MaintenancePage.jsx';

describe('MaintenancePage', () => {
  const renderPage = () =>
    render(
      <MemoryRouter>
        <MaintenancePage />
      </MemoryRouter>,
    );

  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listMaterials.mockResolvedValue({ data: { data: [] } });
    mocks.listMaintenanceTemplates.mockResolvedValue({ data: { data: [] } });
    mocks.executeMaintenance.mockResolvedValue({ data: { data: {} } });
    mocks.createMaintenance.mockResolvedValue({ data: { data: {} } });
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

  it('offers only templates compatible with the selected material', async () => {
    const user = userEvent.setup();
    mocks.listMaterials.mockResolvedValue({
      data: {
        data: [
          {
            uuid: 'material-echo',
            name: 'Tronçonneuse 1',
            model: 'CS-621SX',
            brand: { uuid: 'brand-echo', name: 'ECHO' },
          },
          {
            uuid: 'material-toro',
            name: 'Tracteur 1',
            model: 'MX 4275T',
            brand: { uuid: 'brand-toro', name: 'TORO' },
          },
        ],
      },
    });
    mocks.listMaintenanceTemplates.mockResolvedValue({
      data: {
        data: [
          {
            uuid: 'template-echo',
            title: 'Bougie ECHO',
            materialModel: 'CS-621SX',
            partReference: 'BPMR8Y',
            brand: { uuid: 'brand-echo', name: 'ECHO' },
          },
          {
            uuid: 'template-toro',
            title: 'Bougies TORO',
            materialModel: 'MX 4275T',
            partReference: 'RC12YC',
            brand: { uuid: 'brand-toro', name: 'TORO' },
          },
        ],
      },
    });
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Créer un plan' }));
    await user.selectOptions(screen.getByLabelText('Matériel'), 'material-echo');

    expect(screen.getByRole('option', { name: 'Bougie ECHO — réf. BPMR8Y' })).toBeInTheDocument();
    expect(
      screen.queryByRole('option', { name: 'Bougies TORO — réf. RC12YC' }),
    ).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Modèle d’entretien'), 'template-echo');
    await user.type(screen.getByLabelText('Dernier entretien'), '2026-07-01');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() =>
      expect(mocks.createMaintenance).toHaveBeenCalledWith({
        materialUuid: 'material-echo',
        templateUuid: 'template-echo',
        lastMaintenanceDate: '2026-07-01',
        notes: null,
      }),
    );
  });
});
