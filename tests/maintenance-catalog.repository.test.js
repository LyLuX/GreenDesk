import { companyTest as it } from './helpers/company-test.js';
import { jest } from '@jest/globals';
import { runWithCompanyScope } from '../src/core/company/company-context.js';

import MaintenancePart from '../src/modules/maintenance/model/maintenance-part.model.js';
import MaintenanceCatalogRepository from '../src/modules/maintenance/repository/maintenance-catalog.repository.js';

describe('MaintenanceCatalogRepository stock filters', () => {
  afterEach(() => jest.restoreAllMocks());

  it('selects distinct suggestion values for the current company without list filters or pagination', async () => {
    const findAll = jest
      .spyOn(MaintenancePart, 'findAll')
      .mockImplementation(async (query) =>
        query.attributes[0] === 'name' ? [{ name: 'Huile' }] : [{ unit: 'litre' }],
      );
    const result = await runWithCompanyScope({ companyId: 42 }, () =>
      new MaintenanceCatalogRepository().findPartSuggestions(),
    );
    expect(result).toEqual({ name: ['Huile'], unit: ['litre'] });
    for (const [query] of findAll.mock.calls) {
      expect(query.where).toEqual({ companyId: 42 });
      expect(query.group).toEqual(query.attributes);
      expect(query.limit).toBeUndefined();
      expect(query.paranoid).not.toBe(false);
    }
  });

  it('filters a linked part by exact UUID before pagination without excluding inactive parts', async () => {
    const findAndCountAll = jest
      .spyOn(MaintenancePart, 'findAndCountAll')
      .mockResolvedValue({ count: 0, rows: [] });
    const partUuid = 'fbc00c73-976e-4b18-940b-c09f7a14ac8b';
    await new MaintenanceCatalogRepository().findParts({
      partUuid,
      active: 'all',
      page: 1,
      limit: 5,
    });
    expect(findAndCountAll.mock.calls[0][0].where).toEqual({ uuid: partUuid, companyId: 1 });
    expect(findAndCountAll.mock.calls[0][0].limit).toBe(5);
  });

  it('loads manufacturer logo metadata with low-stock parts without catalogue pagination', async () => {
    const findAll = jest.spyOn(MaintenancePart, 'findAll').mockResolvedValue([]);
    await new MaintenanceCatalogRepository().findLowStockParts();
    const query = findAll.mock.calls[0][0];
    expect(query.include.find((item) => item.as === 'manufacturerDirectory').attributes).toEqual(
      expect.arrayContaining(['uuid', 'name', 'logoFileName']),
    );
    expect(query.limit).toBeUndefined();
  });

  it.each([
    ['inStock', ['`quantity_on_hand` > `minimum_stock_quantity`']],
    [
      'minimum',
      [
        '`quantity_on_hand` = `minimum_stock_quantity`',
        'NOT (minimum_stock_quantity = 0 AND quantity_on_hand = 0 AND quantity_on_order > 0)',
      ],
    ],
    [
      'ordered',
      [
        '`quantity_on_hand` < `minimum_stock_quantity`',
        'quantity_on_hand + quantity_on_order >= `minimum_stock_quantity`',
        'minimum_stock_quantity = 0 AND quantity_on_hand = 0 AND quantity_on_order > 0',
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
    const whereSql = MaintenancePart.sequelize
      .getQueryInterface()
      .queryGenerator.whereQuery(query.where);
    for (const fragment of sqlFragments) expect(whereSql).toContain(fragment);
    expect(query.limit).toBe(10);
    expect(query.offset).toBe(10);
  });
});
