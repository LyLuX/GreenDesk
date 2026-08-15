import { jest } from '@jest/globals';
import { Op } from 'sequelize';

import MaintenancePart from '../src/modules/maintenance/model/maintenance-part.model.js';
import MaintenanceCatalogRepository from '../src/modules/maintenance/repository/maintenance-catalog.repository.js';

describe('MaintenanceCatalogRepository stock filters', () => {
  afterEach(() => jest.restoreAllMocks());

  it.each([
    ['inStock', { [Op.gt]: 0 }, undefined],
    ['ordered', 0, { [Op.gt]: 0 }],
    ['toOrder', 0, 0],
  ])('filters %s parts before applying pagination', async (stockStatus, onHand, onOrder) => {
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
    expect(query.where.quantityOnHand).toEqual(onHand);
    expect(query.where.quantityOnOrder).toEqual(onOrder);
    expect(query.limit).toBe(10);
    expect(query.offset).toBe(10);
  });
});
