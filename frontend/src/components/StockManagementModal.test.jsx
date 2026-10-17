import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  movements: vi.fn(),
  prices: vi.fn(),
  correct: vi.fn(),
  notify: vi.fn(),
  permission: vi.fn(),
}));
vi.mock('../api/maintenance.api.js', () => ({
  listMaintenancePartStockMovements: mocks.movements,
  listMaintenancePartPriceHistory: mocks.prices,
  correctMaintenancePartHistoryDate: mocks.correct,
  createMaintenanceIntervention: vi.fn(),
  updateMaintenancePartPrice: vi.fn(),
  updateMaintenancePartMinimumStock: vi.fn(),
  updateMaintenancePartStock: vi.fn(),
}));
vi.mock('../api/reference.api.js', () => ({ listMaterialOptions: vi.fn() }));
vi.mock('../auth/useAuth.js', () => ({ default: () => ({ hasPermission: mocks.permission }) }));
vi.mock('../notifications/useNotification.js', () => ({
  default: () => ({ notify: mocks.notify }),
}));
import StockManagementModal from './StockManagementModal.jsx';

const part = {
  uuid: 'part',
  name: 'Butée de siège',
  reference: '135-0505',
  unit: 'pièce(s)',
  quantityOnHand: 0,
  quantityOnOrder: 0,
  unitPrice: 5,
  totalMaintenanceCost: 10,
};
const movement = {
  uuid: 'movement',
  operation: 'consume',
  sourceType: 'maintenanceIntervention',
  sourceUuid: 'intervention',
  performedAt: '2026-10-13',
  createdAt: '2026-10-13T18:01:04Z',
  quantityOnHandChange: -2,
  quantityOnOrderChange: 0,
};
const response = (items) => ({ data: { data: { items } } });
afterEach(cleanup);
beforeEach(() => {
  vi.resetAllMocks();
  mocks.permission.mockReturnValue(true);
  mocks.movements.mockResolvedValue(response([movement]));
  mocks.prices.mockResolvedValue(response([]));
  mocks.correct.mockResolvedValue({ data: { data: {} } });
});

const startCorrection = async (user, kind = 'mouvement') => {
  await user.click(
    await screen.findByRole('button', { name: new RegExp(`Corriger la date du ${kind}`) }),
  );
  fireEvent.change(screen.getByLabelText('Date corrigée'), { target: { value: '2026-09-19' } });
  await user.click(screen.getByRole('button', { name: 'Enregistrer la date' }));
  return screen.getByRole('dialog', { name: 'Confirmer la correction de date' });
};

describe('piece history date correction', () => {
  it('confirms a whole-intervention correction, refreshes history and keeps the quantities', async () => {
    mocks.permission.mockImplementation((permission) =>
      ['maintenance.parts.read', 'maintenance.parts.history.date.update'].includes(permission),
    );
    const user = userEvent.setup();
    const updated = vi.fn();
    const close = vi.fn();
    render(<StockManagementModal part={part} onClose={close} onUpdated={updated} />);
    expect(
      await screen.findByRole('button', { name: /Corriger la date du mouvement/ }),
    ).toHaveClass('btn-outline-danger');
    const confirmation = await startCorrection(user);
    expect(screen.getByRole('button', { name: 'Enregistrer la date' })).toHaveClass('btn-danger');
    expect(within(confirmation).getByRole('button', { name: 'Corriger la date' })).toHaveClass(
      'btn-danger',
    );
    expect(within(confirmation).getByText(/Toutes les pièces de cette intervention/)).toBeVisible();
    expect(mocks.correct).not.toHaveBeenCalled();
    await user.keyboard('{Escape}');
    expect(close).not.toHaveBeenCalled();
    expect(
      screen.queryByRole('dialog', { name: 'Confirmer la correction de date' }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Enregistrer la date' }));
    await user.click(
      within(screen.getByRole('dialog', { name: 'Confirmer la correction de date' })).getByRole(
        'button',
        { name: 'Corriger la date' },
      ),
    );
    await waitFor(() =>
      expect(mocks.correct).toHaveBeenCalledWith('part', 'movement', {
        kind: 'stock',
        performedAt: '2026-09-19',
        previousPerformedAt: '2026-10-13',
      }),
    );
    await waitFor(() => expect(updated).toHaveBeenCalledWith(part));
    expect(mocks.movements).toHaveBeenCalledTimes(2);
    expect(mocks.notify).toHaveBeenCalledWith('success', 'Date de l’opération corrigée.');
  });

  it('keeps the editor and displays the API error when correction fails', async () => {
    mocks.correct.mockRejectedValue({
      response: { data: { error: { message: 'La date a déjà été modifiée.' } } },
    });
    const user = userEvent.setup();
    render(<StockManagementModal part={part} onClose={vi.fn()} />);
    const confirmation = await startCorrection(user);
    await user.click(within(confirmation).getByRole('button', { name: 'Corriger la date' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('La date a déjà été modifiée.');
    expect(screen.getByLabelText('Date corrigée')).toHaveValue('2026-09-19');
    expect(mocks.notify).not.toHaveBeenCalled();
  });

  it('corrects a price-history date with only its dedicated permission', async () => {
    mocks.permission.mockImplementation((permission) =>
      ['maintenance.parts.read', 'maintenance.parts.history.date.update'].includes(permission),
    );
    mocks.prices.mockResolvedValue(
      response([
        {
          uuid: 'price',
          performedAt: '2026-10-13',
          createdAt: movement.createdAt,
          previousUnitPrice: 4,
          unitPrice: 5,
        },
      ]),
    );
    const user = userEvent.setup();
    render(<StockManagementModal part={part} onClose={vi.fn()} />);
    const confirmation = await startCorrection(user, 'prix');
    await user.click(within(confirmation).getByRole('button', { name: 'Corriger la date' }));
    await waitFor(() =>
      expect(mocks.correct).toHaveBeenCalledWith('part', 'price', {
        kind: 'price',
        performedAt: '2026-09-19',
        previousPerformedAt: '2026-10-13',
      }),
    );
  });

  it('hides price date correction when only the price-update permission is granted', async () => {
    mocks.permission.mockImplementation(
      (permission) => permission === 'maintenance.parts.price.update',
    );
    mocks.prices.mockResolvedValue(
      response([
        {
          uuid: 'price',
          performedAt: '2026-10-13',
          createdAt: movement.createdAt,
          previousUnitPrice: 4,
          unitPrice: 5,
        },
      ]),
    );
    render(<StockManagementModal part={part} onClose={vi.fn()} />);
    await screen.findAllByText('13/10/2026');
    expect(
      screen.queryByRole('button', { name: /Corriger la date du prix/ }),
    ).not.toBeInTheDocument();
  });

  it.each([
    [{ ...movement, sourceType: 'maintenanceTask' }, ['maintenance.parts.history.date.update']],
    [movement, ['maintenance.parts.stock.order']],
    [movement, ['maintenance.parts.stock.consume']],
    [
      {
        ...movement,
        operation: 'adjust',
        sourceType: null,
        quantityOnHandChange: 1,
        quantityOnOrderChange: 1,
      },
      ['maintenance.parts.stock.adjust_on_hand'],
    ],
  ])(
    'hides date correction when the operation is unsupported or unauthorized',
    async (entry, permissions) => {
      mocks.movements.mockResolvedValue(response([entry]));
      mocks.permission.mockImplementation((permission) => permissions.includes(permission));
      render(<StockManagementModal part={part} onClose={vi.fn()} />);
      await screen.findByText('13/10/2026');
      expect(
        screen.queryByRole('button', { name: /Corriger la date du mouvement/ }),
      ).not.toBeInTheDocument();
    },
  );
});
