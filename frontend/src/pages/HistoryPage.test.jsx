import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { listHistory } = vi.hoisted(() => ({ listHistory: vi.fn() }));
vi.mock('../api/history.api.js', () => ({ listHistory }));
vi.mock('../hooks/useDebouncedValue.js', () => ({ default: (value) => value }));

import HistoryPage from './HistoryPage.jsx';

describe('HistoryPage', () => {
  beforeEach(() => {
    listHistory.mockResolvedValue({
      data: {
        data: {
          items: [
            {
              uuid: 'event-1',
              occurredAt: '2026-08-22',
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
    expect(screen.getByText('Réception')).toBeInTheDocument();
    expect(screen.getByText('1 événement(s), page 1 sur 1')).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Type'), 'stock_movement');
    await waitFor(() =>
      expect(listHistory).toHaveBeenLastCalledWith(
        'maintenance',
        expect.objectContaining({ type: 'stock_movement' }),
        expect.any(AbortSignal),
      ),
    );
  });
});
