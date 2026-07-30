import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getOrderList: vi.fn(),
  listManufacturers: vi.fn(),
}));

vi.mock('../api/maintenance.api.js', () => ({
  getMaintenanceOrderList: mocks.getOrderList,
}));
vi.mock('../api/reference.api.js', () => ({
  createReferenceApi: () => ({ list: mocks.listManufacturers }),
}));
vi.mock('./ManufacturerLogo.jsx', () => ({
  default: ({ manufacturer }) => <img alt={`Logo ${manufacturer?.name ?? 'indisponible'}`} />,
}));

import MaintenanceOrderListModal, { formatOrderQuantity } from './MaintenanceOrderListModal.jsx';

describe('MaintenanceOrderListModal', () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    window.print = vi.fn();
    mocks.getOrderList.mockResolvedValue({
      data: {
        data: {
          items: [
            {
              uuid: 'part-uuid',
              name: 'Bougie',
              manufacturer: 'NGK',
              manufacturerUuid: 'manufacturer-uuid',
              supplier: 'Pièces Pro',
              supplierReference: 'FOU-42',
              reference: 'BPMR8Y',
              quantity: 2,
              unit: 'pièce',
              plans: [],
            },
          ],
        },
      },
    });
    mocks.listManufacturers.mockResolvedValue({
      data: {
        data: [
          {
            uuid: 'manufacturer-uuid',
            name: 'NGK',
            hasLogo: true,
          },
        ],
      },
    });
  });

  it('shows the manufacturer logo instead of its name', async () => {
    render(<MaintenanceOrderListModal open onClose={vi.fn()} />);

    expect(await screen.findByRole('img', { name: 'Logo NGK' })).toBeVisible();
    expect(screen.queryByText('NGK')).not.toBeInTheDocument();
  });

  it('pluralizes the default part unit according to the ordered quantity', () => {
    expect(formatOrderQuantity(1, 'pièce')).toBe('1 pièce');
    expect(formatOrderQuantity(2, 'pièce')).toBe('2 pièces');
  });

  it('prints the displayed order list from a shared GreenDesk button', async () => {
    const user = userEvent.setup();
    render(<MaintenanceOrderListModal open onClose={vi.fn()} />);

    expect(await screen.findByText('2 pièces')).toBeVisible();
    const printButton = screen.getByRole('button', { name: 'Imprimer la liste' });
    expect(printButton).toHaveClass('btn', 'btn-brand');
    expect(printButton.parentElement).toHaveClass('justify-content-end');
    expect(screen.getByRole('dialog')).toHaveClass('maintenance-order-list-modal');
    expect(screen.getByRole('table').closest('.maintenance-order-list-scroll')).not.toBeNull();

    await user.click(printButton);

    expect(window.print).toHaveBeenCalledOnce();
  });
});
