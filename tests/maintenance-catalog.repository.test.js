import { jest } from '@jest/globals';
import { Op } from 'sequelize';

import MaintenancePart from '../src/modules/maintenance/model/maintenance-part.model.js';
import MaintenanceCatalogRepository from '../src/modules/maintenance/repository/maintenance-catalog.repository.js';

describe('MaintenanceCatalogRepository stock filters', () => {
  afterEach(() => jest.restoreAllMocks());

  it.each([
    ['inStock', ['`quantity_on_hand` >= `minimum_stock_quantity`']],
    [
      'ordered',
      [
        '`quantity_on_hand` < `minimum_stock_quantity`',
        'quantity_on_hand + quantity_on_order >= `minimum_stock_quantity`',
      ],
    ],
    ['toOrder', ['quantity_on_hand + quantity_on_order < `minimum_stock_quantity`']],
  ])('filters %s parts against their own minimum stock', async (stockStatus, sqlFragments) => {
    const findAndCountAll = jest
      .spyOn(MaintenancePart, 'findAndCountAll')
      .mockResolvedValue({ count: 0, rows: [] });

    await new MaintenanceCatalogRepository().findParts({
      active: true,
      stockStatus,
      page: 2,
      limit: 10,
    });

    const query = findAndCountAll.mock.calls[0][0];
    expect(query.where.active).toBe(true);
    expect(query.where[Op.and]).toHaveLength(sqlFragments.length);
    const whereSql = MaintenancePart.sequelize
      .getQueryInterface()
      .queryGenerator.whereQuery(query.where);
    for (const fragment of sqlFragments) expect(whereSql).toContain(fragment);
    expect(query.limit).toBe(10);
    expect(query.offset).toBe(10);
  });
});
