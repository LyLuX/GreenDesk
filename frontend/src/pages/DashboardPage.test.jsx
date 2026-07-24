import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { getDashboardSummary } = vi.hoisted(() => ({
  getDashboardSummary: vi.fn().mockResolvedValue({
    data: {
      data: {
        materials: { total: 8, active: 6, inactive: 2 },
        categories: { total: 3 },
        brands: { total: 2 },
        fleet: { totalPurchaseValue: 1600, averageCost: 200, averageAge: 3.5 },
        maintenance: { today: 1, overdue: 2, upcoming: 3 },
      },
    },
  }),
}));

vi.mock('../api/dashboard.api.js', () => ({ getDashboardSummary }));

import DashboardPage from './DashboardPage.jsx';

describe('DashboardPage', () => {
  afterEach(cleanup);

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
    );
    expect(screen.queryByText('Entretiens réalisés ce mois')).not.toBeInTheDocument();
  });
});
