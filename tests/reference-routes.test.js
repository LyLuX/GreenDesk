import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';
import request from 'supertest';

import app from '../src/app.js';
import env from '../src/config/env.js';
import sequelize from '../src/config/database.js';
import User from '../src/modules/users/model/user.model.js';
import Company from '../src/modules/companies/model/company.model.js';
import Material from '../src/modules/materials/model/material.model.js';
import PartManufacturer from '../src/modules/manufacturers/model/part-manufacturer.model.js';

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

describe('reference routes authorization and validation', () => {
  beforeAll(() => {
    jest
      .spyOn(sequelize, 'transaction')
      .mockImplementation(async (...args) => args.at(-1)({ id: 'route-test-transaction' }));
    jest.spyOn(User, 'findOne').mockResolvedValue({ id: 1 });
    jest.spyOn(Company, 'findOne').mockResolvedValue({
      id: 1,
      uuid: 'f75ce638-18d2-4e29-9958-2afaa4ae5151',
      active: true,
    });
    jest.spyOn(PartManufacturer, 'findOne').mockResolvedValue(null);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('rejects an unauthenticated categories request', async () => {
    await request(app).get('/api/categories').expect(401);
  });

  it('rejects a user without the required permission', async () => {
    await request(app)
      .get('/api/categories')
      .set('Authorization', `Bearer ${tokenFor([])}`)
      .expect(403);
  });

  it('requires the manufacturer read permission to list manufacturers', async () => {
    await request(app)
      .get('/api/v1/manufacturers')
      .set('Authorization', `Bearer ${tokenFor(['materials.read'])}`)
      .expect(403);
  });

  it('requires the supplier read permission to list suppliers', async () => {
    await request(app)
      .get('/api/v1/suppliers')
      .set('Authorization', `Bearer ${tokenFor(['maintenance.read'])}`)
      .expect(403);
  });

  it('protects lightweight material options and allows maintenance readers', async () => {
    await request(app)
      .get('/api/v1/materials/options')
      .set('Authorization', `Bearer ${tokenFor([])}`)
      .expect(403);

    const findAll = jest
      .spyOn(Material, 'findAndCountAll')
      .mockResolvedValue({ count: 0, rows: [] });
    await request(app)
      .get('/api/v1/materials/options')
      .set('Authorization', `Bearer ${tokenFor(['maintenance.read'])}`)
      .expect(200);
    await request(app)
      .get('/api/v1/materials/options')
      .set('Authorization', `Bearer ${tokenFor(['maintenance.parts.stock.consume'])}`)
      .expect(200);
    findAll.mockRestore();
  });

  it('protects manufacturer logos with the manufacturer permissions', async () => {
    const uuid = 'f75ce638-18d2-4e29-9958-2afaa4ae5151';
    await request(app)
      .get(`/api/v1/manufacturers/${uuid}/logo`)
      .set('Authorization', `Bearer ${tokenFor([])}`)
      .expect(403);
    await request(app)
      .post(`/api/v1/manufacturers/${uuid}/logo`)
      .set('Authorization', `Bearer ${tokenFor(['manufacturers.read'])}`)
      .expect(403);
    await request(app)
      .post(`/api/v1/manufacturers/${uuid}/logo`)
      .set('Authorization', `Bearer ${tokenFor(['manufacturers.create'])}`)
      .expect(403);
  });

  it('allows material readers to request the logo used by the material list', async () => {
    await request(app)
      .get('/api/v1/manufacturers/f75ce638-18d2-4e29-9958-2afaa4ae5151/logo')
      .set('Authorization', `Bearer ${tokenFor(['materials.read'])}`)
      .expect(404);
  });

  it('allows maintenance readers to request manufacturer logos used by maintenance views', async () => {
    const logoPath = '/api/v1/manufacturers/f75ce638-18d2-4e29-9958-2afaa4ae5151/logo';
    await request(app)
      .get(logoPath)
      .set('Authorization', `Bearer ${tokenFor(['maintenance.read'])}`)
      .expect(404);
    await request(app)
      .get(logoPath)
      .set('Authorization', `Bearer ${tokenFor(['maintenance.parts.read'])}`)
      .expect(404);
  });

  it('uses the dedicated user read permission instead of the legacy permission', async () => {
    await request(app)
      .get('/api/v1/users?active=invalid')
      .set('Authorization', `Bearer ${tokenFor(['USER_READ'])}`)
      .expect(403);
    await request(app)
      .get('/api/v1/users?active=invalid')
      .set('Authorization', `Bearer ${tokenFor(['users.read'])}`)
      .expect(400);
  });

  it('uses dedicated permissions for every material file action', async () => {
    const uuid = 'f75ce638-18d2-4e29-9958-2afaa4ae5151';
    await request(app)
      .post(`/api/v1/materials/${uuid}/photos`)
      .set('Authorization', `Bearer ${tokenFor(['materials.update'])}`)
      .attach('file', Buffer.from('invalid image'), {
        filename: 'photo.jpg',
        contentType: 'image/jpeg',
      })
      .expect(403);
    await request(app)
      .post(`/api/v1/materials/${uuid}/photos`)
      .set('Authorization', `Bearer ${tokenFor(['materials.photos.create'])}`)
      .attach('file', Buffer.from('invalid image'), {
        filename: 'photo.jpg',
        contentType: 'image/jpeg',
      })
      .expect(400);
    await request(app)
      .patch(`/api/v1/materials/files/${uuid}/primary`)
      .set('Authorization', `Bearer ${tokenFor(['materials.update'])}`)
      .expect(403);
    await request(app)
      .delete(`/api/v1/materials/files/${uuid}`)
      .set('Authorization', `Bearer ${tokenFor(['materials.update'])}`)
      .expect(403);
  });

  it('uses dedicated role and permission read permissions', async () => {
    await request(app)
      .get('/api/v1/roles?permissionUuid=invalid')
      .set('Authorization', `Bearer ${tokenFor(['roles.read'])}`)
      .expect(400);
    await request(app)
      .get('/api/v1/permissions?page=0')
      .set('Authorization', `Bearer ${tokenFor(['permissions.read'])}`)
      .expect(400);
  });

  it('validates category creation before accessing persistence', async () => {
    const response = await request(app)
      .post('/api/categories')
      .set('Authorization', `Bearer ${tokenFor(['categories.create'])}`)
      .send({ description: 'Missing name' });
    expect(response.status).toBe(400);
    expect(response.body.error.message).toBe('Le champ « name » contient une valeur invalide.');
    expect(response.body.error.details).toEqual([
      expect.objectContaining({ path: 'name', location: 'body' }),
    ]);
  });

  it('requires the material delete permission before deleting a material', async () => {
    await request(app)
      .delete('/api/v1/materials/f75ce638-18d2-4e29-9958-2afaa4ae5151')
      .set('Authorization', `Bearer ${tokenFor(['materials.update'])}`)
      .expect(403);
  });

  it.each([
    ['materials', 'materials.update', 'materials.status.update'],
    ['categories', 'categories.update', 'categories.status.update'],
    ['manufacturers', 'manufacturers.update', 'manufacturers.status.update'],
    ['suppliers', 'suppliers.update', 'suppliers.status.update'],
  ])(
    'uses a dedicated permission to change the %s status',
    async (resource, updatePermission, statusPermission) => {
      const uuid = 'f75ce638-18d2-4e29-9958-2afaa4ae5151';
      await request(app)
        .put(`/api/v1/${resource}/${uuid}`)
        .set('Authorization', `Bearer ${tokenFor([updatePermission])}`)
        .send({ active: false })
        .expect(403);
      await request(app)
        .put(`/api/v1/${resource}/${uuid}`)
        .set('Authorization', `Bearer ${tokenFor([statusPermission])}`)
        .send({ active: 'invalid' })
        .expect(400);
    },
  );
});
