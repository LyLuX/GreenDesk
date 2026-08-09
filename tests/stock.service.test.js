import { jest } from '@jest/globals';

import StockService from '../src/core/inventory/stock.service.js';

const stockItem = (overrides = {}) => ({
  id: 7,
  name: 'Filtre à huile',
  quantityOnHand: 2,
  quantityOnOrder: 3,
  update: jest.fn(function update(values) {
    Object.assign(this, values);
  }),
  ...overrides,
});

describe('StockService', () => {
  it('records an order without overwriting workshop stock', async () => {
    const movementRepository = { create: jest.fn() };
    const service = new StockService(movementRepository);
    const item = stockItem();

    await service.apply(
      item,
      { stockableType: 'maintenancePart', operation: 'order', quantity: 4, userId: 42 },
      { transaction: { id: 'transaction' } },
    );

    expect(item).toEqual(expect.objectContaining({ quantityOnHand: 2, quantityOnOrder: 7 }));
    expect(movementRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: 'order',
        quantityOnHandChange: 0,
        quantityOnOrderChange: 4,
        quantityOnHandAfter: 2,
        quantityOnOrderAfter: 7,
      }),
      { transaction: { id: 'transaction' } },
    );
  });

  it('moves received quantities from orders to workshop stock', async () => {
    const service = new StockService({ create: jest.fn() });
    const item = stockItem();

    await service.apply(item, {
      stockableType: 'maintenancePart',
      operation: 'receive',
      quantity: 2,
    });

    expect(item).toEqual(expect.objectContaining({ quantityOnHand: 4, quantityOnOrder: 1 }));
  });

  it('refuses reception beyond the outstanding order', async () => {
    const service = new StockService({ create: jest.fn() });

    await expect(
      service.apply(stockItem(), {
        stockableType: 'maintenancePart',
        operation: 'receive',
        quantity: 4,
      }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('consumes workshop stock and rejects an insufficient quantity', async () => {
    const service = new StockService({ create: jest.fn() });
    const item = stockItem();

    await service.apply(item, {
      stockableType: 'maintenancePart',
      operation: 'consume',
      quantity: 2,
    });
    expect(item.quantityOnHand).toBe(0);

    await expect(
      service.apply(item, {
        stockableType: 'maintenancePart',
        operation: 'consume',
        quantity: 1,
      }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('adjusts both counters in one journal entry', async () => {
    const movementRepository = { create: jest.fn() };
    const service = new StockService(movementRepository);
    const item = stockItem();

    await service.apply(item, {
      stockableType: 'maintenancePart',
      operation: 'adjust',
      quantityOnHand: 8,
      quantityOnOrder: 1,
    });

    expect(item).toEqual(expect.objectContaining({ quantityOnHand: 8, quantityOnOrder: 1 }));
    expect(movementRepository.create).toHaveBeenCalledTimes(1);
  });
});
