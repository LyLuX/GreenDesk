import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { listMaterialMaintenanceHistory } from '../api/maintenance.api.js';
import MaterialMaintenanceHistory from './MaterialMaintenanceHistory.jsx';

vi.mock('../api/maintenance.api.js', () => ({ listMaterialMaintenanceHistory: vi.fn() }));
afterEach(cleanup);
beforeEach(() => vi.resetAllMocks());

const pageResult = (items, page = 1) => ({
  data: {
    data: {
      items,
      pagination: { page, limit: 5, total: 6, totalPages: 2 },
    },
  },
});

it('shows the plan history details, shared colors and subsequent pages', async () => {
  listMaterialMaintenanceHistory.mockImplementation(({ page }) =>
    Promise.resolve(
      pageResult(
        page === 1
          ? [
              {
                uuid: 'partial',
                task: { title: 'Vidange annuelle' },
                performedAt: '2026-09-01',
                createdAt: '2026-09-01T10:30:00Z',
                comment: 'Filtre conservé',
                executionType: 'partialPartReplacement',
                performedByUser: { firstName: 'Jean', lastName: 'Dupont' },
                partsSnapshot: [
                  { name: 'Huile', quantity: 2, consumed: true },
                  { name: 'Filtre', quantity: 1, consumed: false },
                ],
              },
              {
                uuid: 'skipped',
                task: { title: 'Contrôle' },
                performedAt: '2026-08-01',
                executionType: 'withoutPartReplacement',
                partsSnapshot: [{ name: 'Courroie', quantity: 2, consumed: false }],
              },
              {
                uuid: 'normal',
                task: { title: 'Graissage' },
                performedAt: '2026-07-01',
                executionType: 'standard',
                partsSnapshot: [{ name: 'Graisse', quantity: 0.5, consumed: true }],
              },
            ]
          : [{ uuid: 'older', task: { title: 'Ancien entretien' }, performedAt: '2025-01-01' }],
        page,
      ),
    ),
  );
  const user = userEvent.setup();
  render(<MaterialMaintenanceHistory materialUuid="material-uuid" />);
  const partial = (await screen.findByText('Vidange annuelle')).closest('tr');
  expect(partial).toHaveClass('maintenance-history-partial-parts');
  expect(within(partial).getByText('Remplacement partiel')).toHaveClass(
    'maintenance-history-partial',
  );
  expect(within(partial).getByText('Filtre conservé')).toBeVisible();
  expect(within(partial).getByText('Jean Dupont')).toBeVisible();
  expect(within(partial).getByText('Huile x 2')).toBeVisible();
  expect(within(partial).getByText('Filtre x 0')).toBeVisible();
  expect(within(partial).queryByText(/Pièces (non )?remplacées :/)).not.toBeInTheDocument();
  const skipped = screen.getByText('Contrôle').closest('tr');
  expect(skipped).toHaveClass('maintenance-history-without-parts');
  expect(within(skipped).getByText('Courroie x 0')).toBeVisible();
  expect(screen.getByText('Graisse x 0.5')).toBeVisible();
  expect(within(skipped).getByText('Pièces non remplacées')).toHaveClass(
    'maintenance-history-exception',
  );
  expect(within(skipped).getByText('Sans commentaire')).toBeVisible();
  expect(within(skipped).getByText('Utilisateur supprimé')).toBeVisible();
  expect(screen.getByText('Graissage').closest('tr')).not.toHaveClass(
    'maintenance-history-without-parts',
  );
  await user.click(screen.getByRole('button', { name: 'Suivant' }));
  expect(await screen.findByText('Ancien entretien')).toBeVisible();
  expect(listMaterialMaintenanceHistory).toHaveBeenLastCalledWith(
    { materialUuid: 'material-uuid', page: 2, limit: 5 },
    expect.any(AbortSignal),
  );
  expect(screen.queryByText('Vidange annuelle')).not.toBeInTheDocument();
});

it('distinguishes loading, failure and empty history, and allows retrying', async () => {
  let reject;
  listMaterialMaintenanceHistory.mockReturnValueOnce(
    new Promise((_resolve, rejectRequest) => {
      reject = rejectRequest;
    }),
  );
  const user = userEvent.setup();
  render(<MaterialMaintenanceHistory materialUuid="material-uuid" />);
  expect(screen.getByText('Chargement de l’historique des plans de maintenance')).toBeVisible();
  expect(screen.queryByText('Aucun entretien enregistré.')).not.toBeInTheDocument();
  reject(new Error('Chargement impossible'));
  expect(await screen.findByRole('alert')).toBeVisible();
  listMaterialMaintenanceHistory.mockResolvedValue(pageResult([]));
  await user.click(screen.getByRole('button', { name: 'Réessayer' }));
  expect(await screen.findByText('Aucun entretien enregistré.')).toBeVisible();
  await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
});
