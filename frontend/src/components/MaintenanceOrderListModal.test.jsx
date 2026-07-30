import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
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

import MaintenanceOrderListModal, {
  formatOrderQuantity,
  getOrderListFiltersForDeadline,
  groupOrderPartsBySupplier,
  paginateSupplierGroups,
} from './MaintenanceOrderListModal.jsx';

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

  it('shows the manufacturer logo on screen and its name as secondary print information', async () => {
    render(<MaintenanceOrderListModal open onClose={vi.fn()} />);

    const dialog = screen.getByRole('dialog');
    expect(await within(dialog).findByRole('img', { name: 'Logo NGK' })).toBeVisible();
    expect(within(dialog).queryByText('NGK')).not.toBeInTheDocument();

    const printPage = document.querySelector('.maintenance-order-print-page');
    expect(printPage.querySelector('img[alt="Logo NGK"]')).toBeNull();
    expect(printPage.querySelector('.maintenance-order-print-manufacturer')).toHaveTextContent(
      'NGK',
    );
  });

  it('pluralizes the default part unit according to the ordered quantity', () => {
    expect(formatOrderQuantity(1, 'pièce')).toBe('1 pièce');
    expect(formatOrderQuantity(2, 'pièce')).toBe('2 pièces');
  });

  it('matches maintenance deadline filters with order-list periods', () => {
    expect(getOrderListFiltersForDeadline('overdue')).toEqual({
      status: 'overdue',
      horizonDays: 0,
      includeOverdue: true,
    });
    expect(getOrderListFiltersForDeadline('dueToday')).toEqual({
      status: 'dueToday',
      horizonDays: 0,
      includeOverdue: false,
    });
    expect(getOrderListFiltersForDeadline('upcoming')).toEqual({
      status: 'upcoming',
      horizonDays: 30,
      includeOverdue: false,
    });
    expect(getOrderListFiltersForDeadline('upToDate')).toEqual({
      status: 'upToDate',
      horizonDays: 365,
      includeOverdue: false,
    });
    expect(getOrderListFiltersForDeadline()).toEqual({
      horizonDays: 30,
      includeOverdue: true,
    });
  });

  it('groups suppliers alphabetically and keeps missing suppliers together', () => {
    expect(
      groupOrderPartsBySupplier([
        { uuid: '2', supplier: 'Pièces Pro', supplierUuid: 'supplier-2' },
        { uuid: '1', supplier: 'Atelier Vert', supplierUuid: 'supplier-1' },
        { uuid: '3', supplier: null },
        { uuid: '4', supplier: null },
      ]),
    ).toEqual([
      expect.objectContaining({
        supplier: 'Atelier Vert',
        parts: [{ uuid: '1', supplier: 'Atelier Vert', supplierUuid: 'supplier-1' }],
      }),
      expect.objectContaining({
        supplier: 'Fournisseur non renseigné',
        parts: expect.arrayContaining([
          expect.objectContaining({ uuid: '3' }),
          expect.objectContaining({ uuid: '4' }),
        ]),
      }),
      expect.objectContaining({
        supplier: 'Pièces Pro',
        parts: [{ uuid: '2', supplier: 'Pièces Pro', supplierUuid: 'supplier-2' }],
      }),
    ]);
  });

  it('paginates a large supplier without losing or duplicating parts', () => {
    const parts = Array.from({ length: 23 }, (_, index) => ({
      uuid: `part-${index + 1}`,
      plans: [],
    }));
    const pages = paginateSupplierGroups([
      { key: 'supplier-1', supplier: 'Coché Motoculture', parts },
    ]);

    expect(pages).toHaveLength(2);
    expect(pages.map((page) => page.parts.length)).toEqual([13, 10]);
    expect(pages.map((page) => page.pageNumber)).toEqual([1, 2]);
    expect(pages.every((page) => page.pageCount === 2)).toBe(true);
    expect(pages.flatMap((page) => page.parts.map((part) => part.uuid))).toEqual(
      parts.map((part) => part.uuid),
    );
  });

  it('prints the displayed order list from a shared GreenDesk button', async () => {
    const user = userEvent.setup();
    render(<MaintenanceOrderListModal open onClose={vi.fn()} />);

    const dialog = screen.getByRole('dialog');
    expect(await within(dialog).findByText('2 pièces')).toBeVisible();
    const printButton = screen.getByRole('button', { name: 'Imprimer la liste' });
    expect(printButton).toHaveClass('btn', 'btn-brand');
    expect(printButton.parentElement).toHaveClass('justify-content-end');
    expect(dialog).toHaveClass('maintenance-order-list-modal');
    expect(
      within(dialog).getByRole('table').closest('.maintenance-order-list-scroll'),
    ).not.toBeNull();
    expect(within(dialog).getByRole('table').closest('.table-shell')).not.toBeNull();
    const printHeader = document.querySelector('.maintenance-order-print-header');
    expect(printHeader).toHaveTextContent('GreenDesk');
    expect(printHeader).toHaveTextContent('EI BOURNAZEL Paul');
    expect(printHeader).not.toHaveTextContent('Échéance');
    expect(document.querySelector('.maintenance-order-print-page')).not.toHaveTextContent(
      'Plans concernés',
    );
    const printFooter = document.querySelector('.maintenance-order-print-footer .app-footer');
    expect(printFooter).toHaveTextContent('EI BOURNAZEL Paul');
    expect(printFooter).toHaveTextContent('GreenDesk · version');

    await user.click(printButton);

    expect(window.print).toHaveBeenCalledOnce();
  });

  it('creates one independent print page per supplier', async () => {
    mocks.getOrderList.mockResolvedValue({
      data: {
        data: {
          items: [
            {
              uuid: 'part-uuid',
              name: 'Bougie',
              supplier: 'Pièces Pro',
              supplierUuid: 'supplier-2',
              supplierReference: 'FOU-42',
              quantity: 2,
              unit: 'pièce',
              plans: [],
            },
            {
              uuid: 'filter-uuid',
              name: 'Filtre',
              supplier: 'Atelier Vert',
              supplierUuid: 'supplier-1',
              supplierReference: 'AV-10',
              quantity: 1,
              unit: 'pièce',
              plans: [],
            },
          ],
        },
      },
    });
    render(<MaintenanceOrderListModal open onClose={vi.fn()} />);

    expect(await within(screen.getByRole('dialog')).findByText('Filtre')).toBeVisible();
    await waitFor(() =>
      expect(document.querySelectorAll('.maintenance-order-print-page')).toHaveLength(2),
    );
    const [atelierPage, piecesProPage] = document.querySelectorAll('.maintenance-order-print-page');
    expect(atelierPage).toHaveTextContent('Fournisseur : Atelier Vert');
    expect(atelierPage).toHaveTextContent('Filtre');
    expect(atelierPage).not.toHaveTextContent('Bougie');
    expect(piecesProPage).toHaveTextContent('Fournisseur : Pièces Pro');
    expect(piecesProPage).toHaveTextContent('Bougie');
    expect(piecesProPage).not.toHaveTextContent('Filtre');
    expect(atelierPage.querySelector('.maintenance-order-print-footer')).not.toBeNull();
    expect(piecesProPage.querySelector('.maintenance-order-print-footer')).not.toBeNull();
  });
});
