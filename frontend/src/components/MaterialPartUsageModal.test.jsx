import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
  notify: vi.fn(),
  permission: vi.fn(),
}));
vi.mock('../api/maintenance.api.js', () => ({
  listMaintenanceParts: mocks.list,
  createMaintenanceIntervention: mocks.create,
}));
vi.mock('../auth/useAuth.js', () => ({ default: () => ({ hasPermission: mocks.permission }) }));
vi.mock('../notifications/useNotification.js', () => ({
  default: () => ({ notify: mocks.notify }),
}));
import MaterialPartUsageModal from './MaterialPartUsageModal.jsx';
const material = { uuid: 'material', name: 'MX 4275T', active: true };
const stops = {
  uuid: 'stops',
  name: 'Butée de siège',
  reference: '135-0505',
  unit: 'pièce(s)',
  quantityOnHand: 2,
  unitPrice: 5,
};
const oil = {
  uuid: 'oil',
  name: 'Huile',
  reference: 'H-01',
  unit: 'litre',
  quantityOnHand: 0.6,
  unitPrice: 10,
};
const payload = (items) => ({ data: { data: { items } } });
afterEach(cleanup);
beforeEach(() => {
  vi.resetAllMocks();
  mocks.permission.mockReturnValue(true);
  mocks.list.mockResolvedValue(payload([stops, oil]));
  mocks.create.mockResolvedValue({ data: { data: { uuid: 'saved' } } });
});
const addPart = async (user, search, name) => {
  await user.type(
    screen.getByRole('combobox', { name: 'Rechercher une pièce par nom ou référence' }),
    search,
  );
  await user.click(await screen.findByRole('option', { name: new RegExp(name) }));
};

describe('material part consumption', () => {
  it('records multiple parts, custom date and priced quantities for the fixed material', async () => {
    const user = userEvent.setup();
    const saved = vi.fn();
    render(<MaterialPartUsageModal material={material} onClose={vi.fn()} onSaved={saved} />);
    await addPart(user, '135-0505', 'Butée');
    const quantity = screen.getByLabelText(/Quantité utilisée — Butée/);
    expect(quantity).toHaveAttribute('step', '1');
    expect(quantity).toHaveAttribute('max', '2');
    await user.clear(quantity);
    await user.type(quantity, '2');
    await addPart(user, 'Huile', 'Huile');
    const oilQuantity = screen.getByLabelText(/Quantité utilisée — Huile/);
    expect(oilQuantity).toHaveAttribute('step', '0.01');
    await user.clear(oilQuantity);
    await user.type(oilQuantity, '0.5');
    fireEvent.change(screen.getByLabelText('Date de l’intervention'), {
      target: { value: '2026-09-19' },
    });
    await user.type(
      screen.getByLabelText('Description de l’intervention'),
      'Remplacement des butées et appoint',
    );
    expect(screen.getByText('15,00 €')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Enregistrer l’utilisation' }));
    await waitFor(() =>
      expect(mocks.create).toHaveBeenCalledWith(
        {
          materialUuid: 'material',
          performedAt: '2026-09-19',
          description: 'Remplacement des butées et appoint',
          parts: [
            { partUuid: 'stops', quantity: 2 },
            { partUuid: 'oil', quantity: 0.5 },
          ],
        },
        expect.any(String),
      ),
    );
    expect(saved).toHaveBeenCalledWith({ uuid: 'saved' });
    expect(mocks.notify).toHaveBeenCalledWith('success', 'Intervention ponctuelle enregistrée.');
  });

  it('loads every matching catalogue page and excludes empty stocks and already selected parts', async () => {
    mocks.list.mockImplementation(async ({ page }) => ({
      data: {
        data: {
          items: page === 1 ? [{ ...stops, uuid: 'empty', quantityOnHand: 0 }] : [stops],
          pagination: { page, totalPages: 2 },
        },
      },
    }));
    const user = userEvent.setup();
    render(<MaterialPartUsageModal material={material} onClose={vi.fn()} onSaved={vi.fn()} />);
    await addPart(user, 'Butée', 'Butée');
    expect(mocks.list).toHaveBeenCalledWith(
      expect.objectContaining({ page: 2, active: true, search: 'Butée' }),
      expect.any(AbortSignal),
    );
    await user.type(screen.getByRole('combobox'), 'Butée');
    expect(screen.queryByRole('option', { name: /Butée/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Retirer Butée/ }));
    expect(screen.getByRole('button', { name: 'Enregistrer l’utilisation' })).toBeDisabled();
    await user.click(screen.getByRole('combobox'));
    expect(await screen.findByRole('option', { name: /Butée/ })).toBeVisible();
  });

  it('preserves the same idempotency key and entered values after a failed request', async () => {
    mocks.create.mockRejectedValueOnce({
      response: { data: { error: { message: 'Stock insuffisant.' } } },
    });
    const user = userEvent.setup();
    render(<MaterialPartUsageModal material={material} onClose={vi.fn()} onSaved={vi.fn()} />);
    await addPart(user, 'Butée', 'Butée');
    await user.type(screen.getByLabelText('Description de l’intervention'), 'Remplacement');
    await user.click(screen.getByRole('button', { name: 'Enregistrer l’utilisation' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Stock insuffisant.');
    expect(screen.getByLabelText('Description de l’intervention')).toHaveValue('Remplacement');
    await user.click(screen.getByRole('button', { name: 'Enregistrer l’utilisation' }));
    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(2));
    expect(mocks.create.mock.calls[1][1]).toBe(mocks.create.mock.calls[0][1]);
  });

  it.each([
    [[], true],
    [['maintenance.parts.stock.consume'], true],
    [['maintenance.parts.read', 'maintenance.parts.stock.consume'], false],
  ])(
    'does not open or query without the required permissions or an active material',
    (permissions, active) => {
      mocks.permission.mockImplementation((permission) => permissions.includes(permission));
      render(
        <MaterialPartUsageModal
          material={{ ...material, active }}
          onClose={vi.fn()}
          onSaved={vi.fn()}
        />,
      );
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(mocks.list).not.toHaveBeenCalled();
    },
  );
});
