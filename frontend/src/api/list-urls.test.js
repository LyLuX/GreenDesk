import { afterEach, describe, expect, it, vi } from 'vitest';
import client from './client.js';
import { createReferenceApi, listMaterialOptions } from './reference.api.js';
import { listUsers } from './users.api.js';
import {
  listMaintenance,
  listMaintenanceOperations,
  listMaintenanceParts,
  maintenanceHistory,
  listMaintenanceInterventions,
  listMaintenancePartStockMovements,
  listMaintenancePartPriceHistory,
  getMaintenanceOrderList,
  getMaintenanceSheets,
} from './maintenance.api.js';
import { listHistory } from './history.api.js';
import { getRelationsGraph } from './relations.api.js';

const activeLists = [
  ...['companies', 'categories', 'manufacturers', 'suppliers', 'materials'].map((resource) => [
    `/v1/${resource}`,
    createReferenceApi(resource).list,
  ]),
  ['/v1/users', listUsers],
  ['/v1/materials/options', listMaterialOptions],
  ['/v1/maintenance', listMaintenance],
  ['/v1/maintenance/operations', listMaintenanceOperations],
  ['/v1/maintenance/parts', listMaintenanceParts],
];

function captureUrls() {
  vi.spyOn(client, 'get').mockImplementation((url, config) =>
    Promise.resolve(client.getUri({ url, ...config })),
  );
}

describe('canonical API list URLs', () => {
  afterEach(() => vi.restoreAllMocks());

  it.each(activeLists)(
    '%s omits the active default and orders pagination first',
    async (path, list) => {
      captureUrls();
      expect(await list({ active: 'true', limit: 5, page: 1 })).toBe(`/api${path}?page=1&limit=5`);
      expect(await list({ search: 'tondeuse', active: false, limit: 10, page: 2 })).toBe(
        `/api${path}?page=2&limit=10&active=false&search=tondeuse`,
      );
      expect(await list({ active: '', limit: 5, page: 1 })).toBe(
        `/api${path}?page=1&limit=5&active=all`,
      );
    },
  );

  it('omits each reference list default sort while retaining explicit material sorting', async () => {
    captureUrls();
    for (const resource of [
      'companies',
      'categories',
      'manufacturers',
      'suppliers',
      'roles',
      'permissions',
    ]) {
      expect(
        await createReferenceApi(resource).list({
          active: undefined,
          sort: 'name',
          direction: 'ASC',
          page: 1,
          limit: 5,
        }),
      ).toBe(`/api/v1/${resource}?page=1&limit=5`);
    }
    const list = createReferenceApi('materials').list;
    expect(await list({ sort: 'purchaseDate', direction: 'DESC', page: 1, limit: 5 })).toBe(
      '/api/v1/materials?page=1&limit=5',
    );
    expect(await list({ sort: 'name', direction: 'ASC', page: 1, limit: 5 })).toBe(
      '/api/v1/materials?page=1&limit=5&direction=ASC&sort=name',
    );
  });

  it('preserves explicit active filtering of deleted collections', async () => {
    captureUrls();
    const list = createReferenceApi('companies').list;
    expect(await list({ active: true, deleted: true, page: 1, limit: 5 })).toBe(
      '/api/v1/companies?page=1&limit=5&active=true&deleted=true',
    );
    expect(await list({ active: 'all', includeDeleted: true, page: 1, limit: 5 })).toBe(
      '/api/v1/companies?page=1&limit=5&includeDeleted=true',
    );
  });

  it.each([
    ['/v1/roles', createReferenceApi('roles').list],
    ['/v1/permissions', createReferenceApi('permissions').list],
    ['/v1/history/maintenance', (params) => listHistory('maintenance', params)],
    ['/v1/maintenance/interventions', listMaintenanceInterventions],
    ['/v1/maintenance/plan/history', (params) => maintenanceHistory('plan', params)],
    [
      '/v1/maintenance/parts/part/stock-movements',
      (params) => listMaintenancePartStockMovements('part', params),
    ],
    [
      '/v1/maintenance/parts/part/price-history',
      (params) => listMaintenancePartPriceHistory('part', params),
    ],
  ])('%s orders other collections consistently', async (path, list) => {
    captureUrls();
    expect(await list({ search: 'huile', limit: 5, page: 1 })).toBe(
      `/api${path}?page=1&limit=5&search=huile`,
    );
  });

  it('uses the correct defaults for reports and graph scope', async () => {
    captureUrls();
    expect(
      await getMaintenanceOrderList({
        horizonDays: 30,
        includeOverdue: true,
        includeWearBased: false,
        includeLowStock: false,
        lowStockOnly: false,
      }),
    ).toBe('/api/v1/maintenance/order-list');
    expect(await getMaintenanceOrderList({ horizonDays: 0, includeOverdue: false })).toBe(
      '/api/v1/maintenance/order-list?horizonDays=0&includeOverdue=false',
    );
    expect(await getMaintenanceSheets({ includeOverdue: false, includeWearBased: false })).toBe(
      '/api/v1/maintenance/sheets',
    );
    expect(await getMaintenanceSheets({ includeOverdue: true })).toBe(
      '/api/v1/maintenance/sheets?includeOverdue=true',
    );
    expect(await getRelationsGraph()).toBe('/api/v1/relations?scope=records');
    expect(await getRelationsGraph('complete', 'records')).toBe(
      '/api/v1/relations?mode=complete&scope=records',
    );
  });
});
