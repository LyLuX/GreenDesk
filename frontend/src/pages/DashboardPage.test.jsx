import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { getDashboardSummary, hasPermission } = vi.hoisted(() => ({
  getDashboardSummary: vi.fn().mockResolvedValue({
    data: {
      data: {
        materials: { total: 8, active: 6, inactive: 2 },
        categories: { total: 3 },
        manufacturers: { total: 2 },
        fleet: { totalPurchaseValue: 1600, averageCost: 200, averageAge: 3.5 },
        maintenance: {
          today: 1,
          overdue: 1,
          upcoming: 1,
          wearBased: 1,
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
            wearBased: [
              {
                uuid: 'maintenance-wear-based',
                title: 'Contrôle de lame',
                maintenanceType: 'inspection',
                priority: 'normal',
                status: 'wearBased',
                nextMaintenanceDate: null,
                material: { name: 'Tondeuse 03' },
              },
            ],
          },
        },
      },
    },
  }),
  hasPermission: vi.fn(),
}));

vi.mock('../api/dashboard.api.js', () => ({ getDashboardSummary }));
vi.mock('../auth/useAuth.js', () => ({
  default: () => ({ hasPermission }),
}));

import DashboardPage, { formatAverageAge } from './DashboardPage.jsx';

describe('DashboardPage', () => {
  beforeEach(() => {
    hasPermission.mockReturnValue(true);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const renderPage = () =>
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    );

  it('formats the average age in years and months with French plurals', () => {
    expect(formatAverageAge(1.6)).toBe('1 an et 7 mois');
    expect(formatAverageAge(2)).toBe('2 ans');
    expect(formatAverageAge(1 / 12)).toBe('1 mois');
    expect(formatAverageAge(0)).toBe('0 mois');
  });

  it('distributes cards across the three requested dashboard rows', async () => {
    renderPage();

    const inventory = await screen.findByRole('region', {
      name: 'Matériels et catégories',
    });
    const fleet = screen.getByRole('region', { name: 'Valeur du parc' });
    const maintenance = screen.getByRole('region', { name: 'Entretien' });

    expect(within(inventory).getAllByRole('article')).toHaveLength(5);
    expect(within(fleet).getAllByRole('article')).toHaveLength(3);
    expect(within(maintenance).getAllByRole('article')).toHaveLength(4);
    expect(within(maintenance).getByText('Entretiens aujourd’hui').parentElement).toHaveClass(
      'maintenance-due-today',
    );
    expect(within(maintenance).getByText('Entretiens sous 30 jours').parentElement).toHaveClass(
      'maintenance-upcoming',
    );
    expect(within(maintenance).getByText('Entretiens en retard').parentElement).toHaveClass(
      'maintenance-overdue',
      'maintenance-overdue-alert',
    );
    expect(within(maintenance).getByText('Entretien selon usure').parentElement).toHaveClass(
      'maintenance-wear-based',
    );
    expect(screen.queryByText('Entretiens réalisés ce mois')).not.toBeInTheDocument();
  });

  it('does not animate the overdue border when no maintenance is overdue', async () => {
    getDashboardSummary.mockResolvedValueOnce({
      data: { data: { maintenance: { overdue: 0 } } },
    });

    renderPage();

    expect((await screen.findByText('Entretiens en retard')).parentElement).not.toHaveClass(
      'maintenance-overdue-alert',
    );
  });

  it.each([
    [
      'Entretiens aujourd’hui',
      'Entretiens à faire aujourd’hui',
      'Vidange moteur',
      'Tracteur 01',
      'dueToday',
    ],
    [
      'Entretiens sous 30 jours',
      'Entretiens sous 30 jours',
      'Contrôle général',
      'Tracteur 02',
      'upcoming',
    ],
    ['Entretiens en retard', 'Entretiens en retard', 'Bougie', 'EP-534 THX', 'overdue'],
    [
      'Entretien selon usure',
      'Entretien selon usure',
      'Contrôle de lame',
      'Tondeuse 03',
      'wearBased',
    ],
  ])('opens the list matching the "%s" counter', async (label, title, task, material, status) => {
    const user = userEvent.setup();
    renderPage();

    await user.click(
      await screen.findByRole('button', {
        name: `Voir les entretiens concernés : ${label}`,
      }),
    );

    const dialog = await screen.findByRole('dialog', { name: title });
    expect(within(dialog).getByText(task)).toBeInTheDocument();
    expect(within(dialog).getByText(material)).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: 'Voir la maintenance' })).toHaveAttribute(
      'href',
      `/maintenance?status=${status}`,
    );
    expect(within(dialog).getByRole('link', { name: 'Voir la maintenance' })).toHaveClass(
      'btn',
      'btn-outline-brand',
    );
  });

  it('does not make an empty maintenance counter clickable', async () => {
    getDashboardSummary.mockResolvedValueOnce({
      data: {
        data: { maintenance: { today: 0, overdue: 0, upcoming: 0, wearBased: 0 } },
      },
    });

    renderPage();

    await screen.findByText('Entretiens aujourd’hui');
    expect(
      screen.queryByRole('button', {
        name: 'Voir les entretiens concernés : Entretiens aujourd’hui',
      }),
    ).not.toBeInTheDocument();
  });

  it('hides every maintenance indicator without maintenance read access', async () => {
    hasPermission.mockReturnValue(false);

    renderPage();

    expect(await screen.findByRole('region', { name: 'Matériels et catégories' })).toBeVisible();
    expect(screen.queryByRole('region', { name: 'Entretien' })).not.toBeInTheDocument();
    expect(hasPermission).toHaveBeenCalledWith('maintenance.read');
  });
});
