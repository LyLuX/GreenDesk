import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ getSheets: vi.fn() }));

vi.mock('../api/maintenance.api.js', () => ({
  getMaintenanceSheets: mocks.getSheets,
}));
vi.mock('../auth/useAuth.js', () => ({
  default: () => ({ activeCompany: { uuid: 'company-uuid', name: 'Jardin Alpha' } }),
}));

import MaintenanceSheetsModal from './MaintenanceSheetsModal.jsx';

const sheet = {
  uuid: '11111111-1111-4111-8111-111111111111',
  title: 'Vidange annuelle',
  description: 'Remplacer l’huile moteur.',
  maintenanceType: 'preventive',
  priority: 'normal',
  intervalDays: 365,
  lastMaintenanceDate: '2025-09-01',
  nextMaintenanceDate: '2026-09-01',
  notes: 'Contrôler le filtre.',
  status: 'upcoming',
  material: {
    uuid: '22222222-2222-4222-8222-222222222222',
    name: 'Tondeuse principale',
    model: 'LM-42',
    serialNumber: 'SN-2026',
  },
  parts: [
    {
      uuid: '33333333-3333-4333-8333-333333333333',
      name: 'Huile moteur',
      reference: '5W30',
      supplierReference: 'HUILE-5W30-FR',
      quantity: 0.6,
      unit: 'litre',
    },
    {
      uuid: '44444444-4444-4444-8444-444444444444',
      name: 'Filtre à huile',
      reference: 'FH-42',
      supplierReference: 'FH-42',
      quantity: 1,
      unit: 'pièce',
    },
  ],
};

describe('MaintenanceSheetsModal', () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    window.print = vi.fn();
    mocks.getSheets.mockResolvedValue({
      data: {
        data: {
          status: null,
          includeOverdue: false,
          includeWearBased: false,
          items: [sheet],
        },
      },
    });
  });

  it('displays real plan details and prepares one printable sheet', async () => {
    const user = userEvent.setup();
    render(<MaintenanceSheetsModal open onClose={vi.fn()} />);

    const dialog = screen.getByRole('dialog', { name: 'Fiches de maintenance' });
    expect(await within(dialog).findByText('Vidange annuelle')).toBeInTheDocument();
    expect(within(dialog).getByText('Tondeuse principale')).toBeInTheDocument();
    expect(within(dialog).getByText('LM-42')).toBeInTheDocument();
    expect(within(dialog).getByText('SN-2026')).toBeInTheDocument();
    expect(within(dialog).getByText('0,6 litre')).toBeInTheDocument();
    expect(within(dialog).getByText('Réf. fournisseur : HUILE-5W30-FR')).toBeInTheDocument();
    expect(within(dialog).queryByText('Réf. fournisseur : FH-42')).not.toBeInTheDocument();
    expect(document.querySelectorAll('.maintenance-sheet-print-page')).toHaveLength(1);
    expect(document.querySelector('.maintenance-sheets-printable')).toHaveTextContent(
      'Jardin Alpha',
    );
    expect(document.querySelector('.maintenance-sheets-printable')).toHaveTextContent(
      'Réf. fournisseur : HUILE-5W30-FR',
    );
    expect(document.querySelector('.maintenance-sheets-printable')).not.toHaveTextContent(
      'Réf. fournisseur : FH-42',
    );

    await user.click(within(dialog).getByRole('button', { name: 'Imprimer les fiches' }));
    expect(window.print).toHaveBeenCalledOnce();
  });

  it('uses the same deadline controls as maintenance filtering', async () => {
    const user = userEvent.setup();
    render(
      <MaintenanceSheetsModal
        open
        onClose={vi.fn()}
        initialFilters={{
          status: 'upcoming',
          includeOverdue: false,
          includeWearBased: false,
        }}
      />,
    );

    await waitFor(() =>
      expect(mocks.getSheets).toHaveBeenCalledWith(
        {
          status: 'upcoming',
          includeOverdue: false,
          includeWearBased: false,
        },
        expect.any(AbortSignal),
      ),
    );

    const dialog = screen.getByRole('dialog', { name: 'Fiches de maintenance' });
    expect(within(dialog).getByLabelText('Échéance')).toHaveValue('upcoming');
    expect(within(dialog).getByRole('option', { name: 'À faire aujourd’hui' })).toHaveValue(
      'dueToday',
    );
    expect(within(dialog).getByRole('option', { name: 'À jour' })).toHaveValue('upToDate');
    await user.selectOptions(within(dialog).getByLabelText('Échéance'), 'dueToday');
    await user.click(within(dialog).getByLabelText('Inclure les plans selon usure'));

    await waitFor(() =>
      expect(mocks.getSheets).toHaveBeenLastCalledWith(
        {
          status: 'dueToday',
          includeOverdue: false,
          includeWearBased: true,
        },
        expect.any(AbortSignal),
      ),
    );
  });
});
