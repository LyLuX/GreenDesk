import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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

import MaintenanceOrderListModal from './MaintenanceOrderListModal.jsx';

describe('MaintenanceOrderListModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
