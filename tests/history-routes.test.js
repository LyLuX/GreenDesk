import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';
import request from 'supertest';

import app from '../src/app.js';
import env from '../src/config/env.js';
import StockMovement from '../src/core/inventory/stock-movement.model.js';
import Company from '../src/modules/companies/model/company.model.js';
import AuditLog from '../src/modules/audit/model/audit-log.model.js';
import MaintenanceHistory from '../src/modules/maintenance/model/maintenance-history.model.js';
import MaintenanceIntervention from '../src/modules/maintenance/model/maintenance-intervention.model.js';
import MaintenancePart from '../src/modules/maintenance/model/maintenance-part.model.js';
import MaintenancePartPriceHistory from '../src/modules/maintenance/model/maintenance-part-price-history.model.js';
import User from '../src/modules/users/model/user.model.js';

const tokenFor = (permissions) =>
  jwt.sign(
    {
      sub: 'f75ce638-18d2-4e29-9958-2afaa4ae5151',
      userId: 1,
      roles: [],
      permissions,
      companyAccess: [{ id: 1, uuid: 'f75ce638-18d2-4e29-9958-2afaa4ae5151' }],
    },
    env.jwt.secret,
  );

describe('consolidated history routes', () => {
  beforeAll(() => {
    jest.spyOn(User, 'findOne').mockResolvedValue({ id: 1 });
    jest.spyOn(Company, 'findOne').mockResolvedValue({
      id: 1,
      uuid: 'f75ce638-18d2-4e29-9958-2afaa4ae5151',
      active: true,
    });
    for (const model of [
      AuditLog,
      MaintenanceHistory,
      MaintenanceIntervention,
      StockMovement,
      MaintenancePartPriceHistory,
    ]) {
      jest.spyOn(model, 'findAndCountAll').mockResolvedValue({ count: 0, rows: [] });
    }
    jest.spyOn(MaintenancePart, 'findAll').mockResolvedValue([]);
  });

  afterAll(() => jest.restoreAllMocks());

  it.each([
    ['fleet', 'history.fleet.read'],
    ['maintenance', 'history.maintenance.read'],
    ['administration', 'history.administration.read'],
  ])('requires the dedicated %s history permission', async (section, permission) => {
    await request(app)
      .get(`/api/v1/history/${section}`)
      .set('Authorization', `Bearer ${tokenFor([])}`)
      .expect(403);

    const response = await request(app)
      .get(`/api/v1/history/${section}`)
      .set('Authorization', `Bearer ${tokenFor([permission])}`)
      .expect(200);

    expect(response.body.data).toEqual({
      items: [],
      pagination: { page: 1, limit: 5, total: 0, totalPages: 1 },
    });
  });

  it('accepts maintenance sheet printing as a maintenance history type', async () => {
    await request(app)
      .get('/api/v1/history/maintenance?type=maintenance_sheet_print')
      .set('Authorization', `Bearer ${tokenFor(['history.maintenance.read'])}`)
      .expect(200);
  });

  it('accepts companies as an administration history type', async () => {
    await request(app)
      .get('/api/v1/history/administration?type=company')
      .set('Authorization', `Bearer ${tokenFor(['history.administration.read'])}`)
      .expect(200);
  });
});
