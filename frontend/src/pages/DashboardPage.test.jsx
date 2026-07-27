import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { getDashboardSummary } = vi.hoisted(() => ({
  getDashboardSummary: vi.fn().mockResolvedValue({
    data: {
      data: {
        materials: { total: 8, active: 6, inactive: 2 },
        categories: { total: 3 },
        brands: { total: 2 },
        fleet: { totalPurchaseValue: 1600, averageCost: 200, averageAge: 3.5 },
        maintenance: {
          today: 1,
          overdue: 1,
          upcoming: 1,
          items: {
            today: [
              {
                uuid: 'maintenance-today',
                title: 'Vidange moteur',
                maintenanceType: 'preventive',
                priority: 'high',
                nextMaintenanceDate: '2026-07-27',
                material: { name: 'Tracteur 01' },
              },
            ],
            upcoming: [
              {
                uuid: 'maintenance-upcoming',
                title: 'Contrôle général',
                maintenanceType: 'inspection',
                priority: 'normal',
                nextMaintenanceDate: '2026-08-10',
                material: { name: 'Tracteur 02' },
              },
            ],
            overdue: [
              {
                uuid: 'maintenance-overdue',
                title: 'Bougie',
                maintenanceType: 'replacement',
                priority: 'normal',
                nextMaintenanceDate: '2025-09-29',
                material: { name: 'EP-534 THX' },
              },
            ],
          },
        },
      },
    },
  }),
}));

vi.mock('../api/dashboard.api.js', () => ({ getDashboardSummary }));

import DashboardPage from './DashboardPage.jsx';

describe('DashboardPage', () => {
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('distributes cards across the three requested dashboard rows', async () => {
    render(<DashboardPage />);

    const inventory = await screen.findByRole('region', {
      name: 'Matériels et catégories',
    });
    const fleet = screen.getByRole('region', { name: 'Valeur du parc' });
    const maintenance = screen.getByRole('region', { name: 'Entretien' });

    expect(within(inventory).getAllByRole('article')).toHaveLength(5);
    expect(within(fleet).getAllByRole('article')).toHaveLength(3);
    expect(within(maintenance).getAllByRole('article')).toHaveLength(3);
    expect(within(maintenance).getByText('Entretiens aujourd’hui').parentElement).toHaveClass(
      'maintenance-due-today',
    );
    expect(
      within(maintenance).getByText('Entretiens prévus sous 30 jours').parentElement,
    ).toHaveClass('maintenance-upcoming');
    expect(within(maintenance).getByText('Entretiens en retard').parentElement).toHaveClass(
      'maintenance-overdue',
      'maintenance-overdue-alert',
    );
    expect(screen.queryByText('Entretiens réalisés ce mois')).not.toBeInTheDocument();
  });

  it('does not animate the overdue border when no maintenance is overdue', async () => {
    getDashboardSummary.mockResolvedValueOnce({
      data: { data: { maintenance: { overdue: 0 } } },
    });

    render(<DashboardPage />);

    expect((await screen.findByText('Entretiens en retard')).parentElement).not.toHaveClass(
      'maintenance-overdue-alert',
    );
  });

  it.each([
    ['Entretiens aujourd’hui', 'Entretiens à faire aujourd’hui', 'Vidange moteur', 'Tracteur 01'],
    [
      'Entretiens prévus sous 30 jours',
      'Entretiens prévus sous 30 jours',
      'Contrôle général',
      'Tracteur 02',
    ],
    ['Entretiens en retard', 'Entretiens en retard', 'Bougie', 'EP-534 THX'],
  ])('opens the list matching the "%s" counter', async (label, title, task, material) => {
    const user = userEvent.setup();
    render(<DashboardPage />);

    await user.click(
      await screen.findByRole('button', {
        name: `Voir les entretiens concernés : ${label}`,
      }),
    );

    const dialog = await screen.findByRole('dialog', { name: title });
    expect(within(dialog).getByText(task)).toBeInTheDocument();
    expect(within(dialog).getByText(material)).toBeInTheDocument();
  });

  it('does not make an empty maintenance counter clickable', async () => {
    getDashboardSummary.mockResolvedValueOnce({
      data: { data: { maintenance: { today: 0, overdue: 0, upcoming: 0 } } },
    });

    render(<DashboardPage />);

    await screen.findByText('Entretiens aujourd’hui');
    expect(
      screen.queryByRole('button', {
        name: 'Voir les entretiens concernés : Entretiens aujourd’hui',
      }),
    ).not.toBeInTheDocument();
  });
});
