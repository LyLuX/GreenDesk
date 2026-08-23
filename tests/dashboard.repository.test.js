import { jest } from '@jest/globals';

import DashboardRepository from '../src/modules/dashboard/repository/dashboard.repository.js';
import Material from '../src/modules/materials/model/material.model.js';
import Category from '../src/modules/categories/model/category.model.js';
import PartManufacturer from '../src/modules/manufacturers/model/part-manufacturer.model.js';
import MaintenancePart from '../src/modules/maintenance/model/maintenance-part.model.js';

describe('DashboardRepository', () => {
  afterEach(() => jest.restoreAllMocks());

  it('aggregates both current maintenance stock values in one query', async () => {
    const findOne = jest
      .spyOn(MaintenancePart, 'findOne')
      .mockResolvedValue({ onHand: '450.75', onOrder: '120.50' });

    await expect(new DashboardRepository().getMaintenanceStockValues()).resolves.toEqual({
      onHand: '450.75',
      onOrder: '120.50',
    });

    expect(findOne).toHaveBeenCalledTimes(1);
    expect(findOne.mock.calls[0][0].attributes.map((attribute) => attribute[1])).toEqual([
      'onHand',
      'onOrder',
    ]);
    expect(findOne.mock.calls[0][0]).toEqual(expect.objectContaining({ raw: true }));
  });

  it('does not query or return financial aggregates without financial access', async () => {
    jest.spyOn(Material, 'count').mockResolvedValue(0);
    jest.spyOn(Category, 'count').mockResolvedValue(0);
    jest.spyOn(PartManufacturer, 'count').mockResolvedValue(0);
    const materialMetrics = jest
      .spyOn(Material, 'findOne')
      .mockResolvedValue({ averageAge: '3.5' });
    const repository = new DashboardRepository();
    const stockValues = jest.spyOn(repository, 'getMaintenanceStockValues');
    const maintenanceCosts = jest.spyOn(repository, 'getMaintenanceCosts');

    const counts = await repository.getCounts({
      includeMaintenance: false,
      includeLowStock: false,
      includeFinancial: false,
    });

    expect(materialMetrics.mock.calls[0][0].attributes.map((attribute) => attribute[1])).toEqual([
      'averageAge',
    ]);
    expect(stockValues).not.toHaveBeenCalled();
    expect(maintenanceCosts).not.toHaveBeenCalled();
    expect(counts).toEqual({
      materialsTotal: 0,
      materialsActive: 0,
      materialsInactive: 0,
      categoriesTotal: 0,
      manufacturersTotal: 0,
      averageAge: 3.5,
    });
  });

  it('counts active parts with zero or one unit available for maintenance dashboards', async () => {
    jest.spyOn(Material, 'count').mockResolvedValue(0);
    jest.spyOn(Category, 'count').mockResolvedValue(0);
    jest.spyOn(PartManufacturer, 'count').mockResolvedValue(0);
    jest.spyOn(Material, 'findOne').mockResolvedValue({ averageAge: '0' });
    const lowStockCount = jest.spyOn(MaintenancePart, 'count').mockResolvedValue(3);
    const maintenanceRepository = { findDashboard: jest.fn().mockResolvedValue([]) };

    const counts = await new DashboardRepository(maintenanceRepository).getCounts({
      includeMaintenance: true,
      includeLowStock: true,
      includeFinancial: false,
    });

    expect(lowStockCount).toHaveBeenCalledWith({
      where: { active: true, quantityOnHand: expect.any(Object) },
    });
    expect(counts.maintenanceLowStock).toBe(3);
  });
});
