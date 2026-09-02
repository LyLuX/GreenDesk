import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { listHistory } = vi.hoisted(() => ({ listHistory: vi.fn() }));
vi.mock('../api/history.api.js', () => ({ listHistory }));
vi.mock('../hooks/useDebouncedValue.js', () => ({ default: (value) => value }));

import HistoryPage from './HistoryPage.jsx';

describe('HistoryPage', () => {
  afterEach(cleanup);

  beforeEach(() => {
    listHistory.mockResolvedValue({
      data: {
        data: {
          items: [
            {
              uuid: 'event-1',
              occurredAt: '2026-08-22',
              recordedAt: '2026-08-22T08:15:00.000Z',
              type: 'stock_movement',
              action: 'RECEIVE',
              subject: { label: 'Filtre à huile (FH-01)' },
              user: { firstName: 'Ada', lastName: 'Lovelace' },
              details: {
                quantityOnHandChange: 2,
                quantityOnOrderChange: -2,
                quantityOnHandAfter: 4,
                quantityOnOrderAfter: 0,
              },
            },
          ],
          pagination: { page: 1, limit: 5, total: 1, totalPages: 1 },
        },
      },
    });
  });

  it('renders maintenance history and forwards interactive filters', async () => {
    const user = userEvent.setup();
    render(<HistoryPage section="maintenance" />);

    expect(await screen.findByText('Filtre à huile (FH-01)')).toBeInTheDocument();
    expect(screen.getByText('22/08/2026 10:15')).toBeVisible();
    expect(screen.getByText('Réception')).toHaveClass('history-action-success');
    expect(screen.getByText('1 événement(s), page 1 sur 1')).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Fiches de maintenance' })).toHaveValue(
      'maintenance_sheet_print',
    );

    await user.selectOptions(screen.getByLabelText('Type'), 'stock_movement');
    await waitFor(() =>
      expect(listHistory).toHaveBeenLastCalledWith(
        'maintenance',
        expect.objectContaining({ type: 'stock_movement' }),
        expect.any(AbortSignal),
      ),
    );
  });

  it('uses a semantic badge variant for every kind of history action', async () => {
    const actions = [
      ['UPDATE', 'Modification', 'info'],
      ['DELETE', 'Suppression', 'danger'],
      ['ORDER', 'Commande', 'warning'],
      ['EXECUTE', 'Entretien réalisé', 'maintenance'],
      ['EXECUTE_PARTIAL_PARTS', 'Remplacement partiel', 'warning'],
      ['LOGIN_SUCCESS', 'Connexion', 'access'],
      ['LOGOUT_SUCCESS', 'Déconnexion', 'neutral'],
      ['PRINT_MAINTENANCE_SHEETS', 'Impression des fiches de maintenance', 'info'],
    ];
    listHistory.mockResolvedValueOnce({
      data: {
        data: {
          items: actions.map(([action], index) => ({
            uuid: `event-${index}`,
            occurredAt: '2026-08-22',
            recordedAt: `2026-08-22T0${index}:00:00.000Z`,
            type: 'maintenance_plan',
            action,
            subject: { label: `Élément ${index}` },
            details: {},
          })),
          pagination: { page: 1, limit: 5, total: actions.length, totalPages: 2 },
        },
      },
    });

    render(<HistoryPage section="maintenance" />);

    await screen.findByText('Élément 0');
    for (const [, label, variant] of actions) {
      expect(screen.getByText(label)).toHaveClass(`history-action-${variant}`);
    }
  });

  it('does not report equivalent numeric values as audit changes', async () => {
    listHistory.mockResolvedValueOnce({
      data: {
        data: {
          items: [
            {
              uuid: 'material-update',
              occurredAt: '2026-08-28T18:00:00.000Z',
              recordedAt: '2026-08-28T18:00:00.000Z',
              type: 'material',
              action: 'UPDATE',
              subject: { label: 'RM 520-ES' },
              user: { firstName: 'Paul', lastName: 'Bournazel' },
              details: {
                oldValues: { purchasePrice: '950.00', serialNumber: 'RM-001' },
                newValues: { purchasePrice: 950, serialNumber: 'RM-002' },
              },
            },
          ],
          pagination: { page: 1, limit: 5, total: 1, totalPages: 1 },
        },
      },
    });

    render(<HistoryPage section="fleet" />);

    expect(await screen.findByText('RM 520-ES')).toBeVisible();
    expect(screen.getByText('serialNumber : RM-001 → RM-002')).toBeVisible();
    expect(screen.queryByText(/950\.00.*950/)).not.toBeInTheDocument();
  });

  it('resets every filter when the history section changes', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<HistoryPage section="maintenance" />);

    await screen.findByText('Filtre à huile (FH-01)');
    await user.type(screen.getByLabelText('Rechercher dans l’historique'), 'filtre');
    await user.selectOptions(screen.getByLabelText('Type'), 'stock_movement');
    fireEvent.change(screen.getByLabelText('Du'), { target: { value: '2026-08-01' } });
    fireEvent.change(screen.getByLabelText('Au'), { target: { value: '2026-08-22' } });

    await waitFor(() =>
      expect(listHistory).toHaveBeenLastCalledWith(
        'maintenance',
        expect.objectContaining({
          search: 'filtre',
          type: 'stock_movement',
          from: '2026-08-01',
          through: '2026-08-22',
        }),
        expect.any(AbortSignal),
      ),
    );

    rerender(<HistoryPage section="fleet" />);

    expect(screen.getByLabelText('Rechercher dans l’historique')).toHaveValue('');
    expect(screen.getByLabelText('Type')).toHaveValue('');
    expect(screen.getByLabelText('Du')).toHaveValue('');
    expect(screen.getByLabelText('Au')).toHaveValue('');
    await waitFor(() =>
      expect(listHistory).toHaveBeenLastCalledWith(
        'fleet',
        expect.objectContaining({ search: '', type: '', from: '', through: '', page: 1 }),
        expect.any(AbortSignal),
      ),
    );

    rerender(<HistoryPage section="maintenance" />);

    expect(screen.getByLabelText('Rechercher dans l’historique')).toHaveValue('');
    expect(screen.getByLabelText('Type')).toHaveValue('');
    expect(screen.getByLabelText('Du')).toHaveValue('');
    expect(screen.getByLabelText('Au')).toHaveValue('');
    await waitFor(() =>
      expect(listHistory).toHaveBeenLastCalledWith(
        'maintenance',
        expect.objectContaining({ search: '', type: '', from: '', through: '', page: 1 }),
        expect.any(AbortSignal),
      ),
    );
  });

  it('returns to the first page when the history section changes', async () => {
    const user = userEvent.setup();
    listHistory.mockImplementation((section, { page, limit }) =>
      Promise.resolve({
        data: {
          data: {
            items: [],
            pagination: { page, limit, total: 15, totalPages: 3 },
          },
        },
      }),
    );
    const { rerender } = render(<HistoryPage section="maintenance" />);

    await user.click(await screen.findByRole('button', { name: 'Aller à la page 2' }));
    await waitFor(() =>
      expect(listHistory).toHaveBeenLastCalledWith(
        'maintenance',
        expect.objectContaining({ page: 2 }),
        expect.any(AbortSignal),
      ),
    );

    rerender(<HistoryPage section="fleet" />);

    await waitFor(() =>
      expect(listHistory).toHaveBeenLastCalledWith(
        'fleet',
        expect.objectContaining({ page: 1 }),
        expect.any(AbortSignal),
      ),
    );

    rerender(<HistoryPage section="maintenance" />);

    await waitFor(() =>
      expect(listHistory).toHaveBeenLastCalledWith(
        'maintenance',
        expect.objectContaining({ page: 1 }),
        expect.any(AbortSignal),
      ),
    );
  });
});
