import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getOrderList: vi.fn(),
  updateStock: vi.fn(),
  listManufacturers: vi.fn(),
  hasPermission: vi.fn(),
  notify: vi.fn(),
}));

vi.mock('../api/maintenance.api.js', () => ({
  getMaintenanceOrderList: mocks.getOrderList,
  updateMaintenancePartStock: mocks.updateStock,
}));
vi.mock('../api/reference.api.js', () => ({
  createReferenceApi: () => ({ list: mocks.listManufacturers }),
}));
vi.mock('./ManufacturerLogo.jsx', () => ({
  default: ({ manufacturer }) => <img alt={`Logo ${manufacturer?.name ?? 'indisponible'}`} />,
}));
vi.mock('../auth/useAuth.js', () => ({
  default: () => ({ hasPermission: mocks.hasPermission }),
}));
vi.mock('../notifications/useNotification.js', () => ({
  default: () => ({ notify: mocks.notify }),
}));

import MaintenanceOrderListModal, {
  getOrderListFiltersForDeadline,
  groupOrderPartsBySupplier,
  paginateSupplierGroups,
} from './MaintenanceOrderListModal.jsx';

describe('MaintenanceOrderListModal', () => {
  afterEach(cleanup);

  beforeEach(() => {
    vi.clearAllMocks();
    window.print = vi.fn();
    mocks.hasPermission.mockReturnValue(true);
    mocks.updateStock.mockResolvedValue({ data: { data: {} } });
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
              plans: [
                {
                  maintenanceUuid: 'maintenance-uuid',
                  title: 'Remplacement des bougies',
                  material: { name: 'Tronçonneuse 1' },
                  quantity: 2,
                  wearBased: false,
                },
              ],
            },
          ],
        },
      },
    });
    mocks.listManufacturers.mockResolvedValue({
      data: {
        data: {
          items: [
            {
              uuid: 'manufacturer-uuid',
              name: 'NGK',
              hasLogo: true,
            },
          ],
          pagination: { page: 1, limit: 25, total: 1, totalPages: 1 },
        },
      },
    });
  });

  it('shows the manufacturer logo on screen and its name as secondary print information', async () => {
    render(<MaintenanceOrderListModal open onClose={vi.fn()} />);

    const dialog = screen.getByRole('dialog');
    const logo = await within(dialog).findByRole('img', { name: 'Logo NGK' });
    expect(mocks.listManufacturers).toHaveBeenCalledWith({ limit: 25 }, expect.any(AbortSignal));
    expect(logo).toBeVisible();
    expect(logo.parentElement).toHaveClass('maintenance-order-part-summary');
    expect(within(dialog).getByRole('table')).toHaveClass('maintenance-order-list-table');
    expect(within(dialog).getByText('2 pièce').closest('td')).not.toHaveClass('text-nowrap');
    expect(within(dialog).queryByText('NGK')).not.toBeInTheDocument();

    const printPage = document.querySelector('.maintenance-order-print-page');
    expect(printPage.querySelector('img[alt="Logo NGK"]')).toBeNull();
    expect(printPage.querySelector('.maintenance-order-print-manufacturer')).toHaveTextContent(
      'NGK',
    );
  });

  it('matches maintenance deadline filters with order-list periods', () => {
    expect(getOrderListFiltersForDeadline('overdue')).toEqual({
      status: 'overdue',
      horizonDays: 0,
      includeOverdue: true,
      includeWearBased: false,
    });
    expect(getOrderListFiltersForDeadline('dueToday')).toEqual({
      status: 'dueToday',
      horizonDays: 0,
      includeOverdue: false,
      includeWearBased: false,
    });
    expect(getOrderListFiltersForDeadline('upcoming')).toEqual({
      status: 'upcoming',
      horizonDays: 30,
      includeOverdue: false,
      includeWearBased: false,
    });
    expect(getOrderListFiltersForDeadline('upToDate')).toEqual({
      status: 'upToDate',
      horizonDays: 365,
      includeOverdue: false,
      includeWearBased: false,
    });
    expect(getOrderListFiltersForDeadline('wearBased')).toEqual({
      status: 'wearBased',
      horizonDays: 30,
      includeOverdue: false,
      includeWearBased: true,
    });
    expect(getOrderListFiltersForDeadline()).toEqual({
      horizonDays: 30,
      includeOverdue: true,
      includeWearBased: false,
    });
  });

  it('keeps wear-based plans included when the deadline and overdue filters change', async () => {
    const user = userEvent.setup();
    render(
      <MaintenanceOrderListModal
        open
        onClose={vi.fn()}
        initialFilters={getOrderListFiltersForDeadline('upcoming')}
      />,
    );

    const includeWearBased = await screen.findByRole('checkbox', {
      name: 'Inclure les plans selon usure',
    });
    expect(includeWearBased).not.toBeChecked();
    expect(screen.queryByRole('button', { name: 'Actualiser' })).not.toBeInTheDocument();
    expect(mocks.getOrderList).toHaveBeenCalledWith(
      {
        status: 'upcoming',
        horizonDays: 30,
        includeOverdue: false,
        includeWearBased: false,
      },
      expect.any(AbortSignal),
    );

    await user.click(includeWearBased);

    await waitFor(() =>
      expect(mocks.getOrderList).toHaveBeenLastCalledWith(
        { horizonDays: 30, includeOverdue: false, includeWearBased: true },
        expect.any(AbortSignal),
      ),
    );

    await user.click(screen.getByRole('checkbox', { name: 'Inclure les plans en retard' }));

    await waitFor(() =>
      expect(mocks.getOrderList).toHaveBeenLastCalledWith(
        { horizonDays: 30, includeOverdue: true, includeWearBased: true },
        expect.any(AbortSignal),
      ),
    );

    await user.selectOptions(screen.getByRole('combobox', { name: 'Échéance' }), '60');

    await waitFor(() =>
      expect(mocks.getOrderList).toHaveBeenLastCalledWith(
        { horizonDays: 60, includeOverdue: true, includeWearBased: true },
        expect.any(AbortSignal),
      ),
    );
  });

  it('restores wear-based parts after the inclusion filter is unchecked and checked again', async () => {
    const user = userEvent.setup();
    mocks.getOrderList.mockImplementation((filters) =>
      Promise.resolve({
        data: {
          data: {
            items: filters.includeWearBased
              ? [
                  {
                    uuid: 'wear-based-part',
                    name: 'Lame selon usure',
                    reference: 'LAME-USURE',
                    quantity: 1,
                    unit: 'pièce',
                    plans: [],
                  },
                ]
              : [],
          },
        },
      }),
    );

    render(<MaintenanceOrderListModal open onClose={vi.fn()} />);

    const dialog = screen.getByRole('dialog');
    const includeWearBased = screen.getByRole('checkbox', {
      name: 'Inclure les plans selon usure',
    });
    expect(
      await within(dialog).findByText('Aucune pièce à commander sur cette période.'),
    ).toBeVisible();

    await user.click(includeWearBased);
    expect(await within(dialog).findByText('Lame selon usure')).toBeVisible();

    await user.click(includeWearBased);
    expect(
      await within(dialog).findByText('Aucune pièce à commander sur cette période.'),
    ).toBeVisible();

    await user.click(includeWearBased);
    expect(await within(dialog).findByText('Lame selon usure')).toBeVisible();
    expect(mocks.getOrderList).toHaveBeenLastCalledWith(
      { horizonDays: 30, includeOverdue: true, includeWearBased: true },
      expect.any(AbortSignal),
    );
  });

  it('does not let an older calendar response replace wear-based results', async () => {
    const user = userEvent.setup();
    let resolveCalendarRequest;
    let resolveWearBasedRequest;
    mocks.getOrderList.mockImplementation(
      (filters) =>
        new Promise((resolve) => {
          if (filters.includeWearBased) resolveWearBasedRequest = resolve;
          else resolveCalendarRequest = resolve;
        }),
    );

    render(<MaintenanceOrderListModal open onClose={vi.fn()} />);

    await user.click(screen.getByRole('checkbox', { name: 'Inclure les plans selon usure' }));
    await waitFor(() => expect(resolveWearBasedRequest).toBeTypeOf('function'));
    resolveWearBasedRequest({
      data: {
        data: {
          items: [
            {
              uuid: 'wear-based-part',
              name: 'Lame selon usure',
              reference: 'LAME-USURE',
              quantity: 1,
              unit: 'pièce',
              plans: [],
            },
          ],
        },
      },
    });

    const dialog = screen.getByRole('dialog');
    expect(await within(dialog).findByText('Lame selon usure')).toBeVisible();

    resolveCalendarRequest({ data: { data: { items: [] } } });

    await waitFor(() => expect(within(dialog).getByText('Lame selon usure')).toBeVisible());
  });

  it('colors wear-based plan details without displaying a status badge', async () => {
    mocks.getOrderList.mockResolvedValue({
      data: {
        data: {
          items: [
            {
              uuid: 'part-uuid',
              name: 'Lame',
              reference: 'LAME-42',
              quantity: 1,
              unit: 'pièce',
              plans: [
                {
                  maintenanceUuid: 'maintenance-uuid',
                  material: { name: 'Tondeuse' },
                  quantity: 1,
                  wearBased: true,
                },
              ],
            },
          ],
        },
      },
    });

    render(<MaintenanceOrderListModal open onClose={vi.fn()} />);

    expect(await screen.findByText('Tondeuse — 1')).toHaveClass(
      'maintenance-order-plan-wear-based',
    );
    expect(screen.queryByText('Selon l’usure')).not.toBeInTheDocument();
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
    expect(await within(dialog).findByText('2 pièce')).toBeVisible();
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
    const printPage = document.querySelector('.maintenance-order-print-page');
    expect(printPage).toHaveTextContent('2 pièce');
    expect(printPage).not.toHaveTextContent('2 pièces');
    expect(
      [...printPage.querySelectorAll('th')].map((heading) => heading.textContent),
    ).toEqual(['Pièce', 'Référence fournisseur', 'Plan concerné', 'Quantité']);
    expect(printPage).toHaveTextContent('Remplacement des bougies — Tronçonneuse 1');
    expect(printPage).not.toHaveTextContent('Plans concernés');
    const printFooter = document.querySelector('.maintenance-order-print-footer .app-footer');
    expect(printFooter).toHaveTextContent('EI BOURNAZEL Paul');
    expect(printFooter).toHaveTextContent('GreenDesk · version');

    await user.click(printButton);

    expect(window.print).toHaveBeenCalledOnce();
  });

  it('marks the entered quantity as ordered and reloads the list', async () => {
    const user = userEvent.setup();
    mocks.getOrderList
      .mockResolvedValueOnce({
        data: {
          data: {
            items: [
              {
                uuid: 'part-uuid',
                name: 'Bougie',
                supplier: 'Pièces Pro',
                reference: 'BPMR8Y',
                quantity: 2,
                unit: 'pièce',
                plans: [],
              },
            ],
          },
        },
      })
      .mockResolvedValue({ data: { data: { items: [] } } });

    render(<MaintenanceOrderListModal open onClose={vi.fn()} />);

    const quantity = await screen.findByLabelText('Quantité commandée pour Bougie');
    await user.clear(quantity);
    await user.type(quantity, '3');
    expect(quantity).toHaveClass('maintenance-order-quantity');
    const orderButton = screen.getByRole('button', { name: 'Marquer Bougie commandée' });
    expect(orderButton).toHaveTextContent('Commander');
    expect(orderButton.parentElement).toHaveClass('maintenance-order-command-controls');
    await user.click(orderButton);
    expect(screen.getByText(/Quantité commandée : 3 pièce/)).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Marquer commandée' }));

    await waitFor(() =>
      expect(mocks.updateStock).toHaveBeenCalledWith('part-uuid', {
        operation: 'order',
        quantity: 3,
      }),
    );
    expect(await screen.findByText('Aucune pièce à commander sur cette période.')).toBeVisible();
    expect(mocks.notify).toHaveBeenCalledWith('success', 'Bougie marquée commandée (3 pièce).');
  });

  it('does not expose order actions through the general part-update permission', async () => {
    mocks.hasPermission.mockImplementation(
      (permission) => permission === 'maintenance.parts.update',
    );

    render(<MaintenanceOrderListModal open onClose={vi.fn()} />);

    expect(await within(screen.getByRole('dialog')).findByText('Bougie')).toBeVisible();
    expect(
      screen.queryByRole('button', { name: 'Marquer Bougie commandée' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Quantité commandée pour Bougie')).not.toBeInTheDocument();
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
