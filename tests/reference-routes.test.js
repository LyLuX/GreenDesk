import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';
import request from 'supertest';

import app from '../src/app.js';
import env from '../src/config/env.js';
import User from '../src/modules/users/model/user.model.js';

const tokenFor = (permissions) =>
  jwt.sign(
    { sub: 'f75ce638-18d2-4e29-9958-2afaa4ae5151', userId: 1, roles: [], permissions },
    env.jwt.secret,
  );

describe('reference routes authorization and validation', () => {
  beforeAll(() => {
    jest.spyOn(User, 'findOne').mockResolvedValue({ id: 1 });
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

  it('restricts user management to administrators', async () => {
    await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${tokenFor(['USER_READ'])}`)
      .expect(403);
  });

  it('restricts role and permission management to administrators', async () => {
    const token = tokenFor(['USER_READ']);
    await request(app).get('/api/v1/roles').set('Authorization', `Bearer ${token}`).expect(403);
    await request(app)
      .get('/api/v1/permissions')
      .set('Authorization', `Bearer ${token}`)
      .expect(403);
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
    ['materials', 'materials.read', 'materials.update'],
    ['categories', 'categories.read', 'categories.update'],
    ['manufacturers', 'manufacturers.read', 'manufacturers.update'],
    ['suppliers', 'suppliers.read', 'suppliers.update'],
  ])(
    'uses %s.update to change the active status',
    async (resource, readPermission, updatePermission) => {
      const uuid = 'f75ce638-18d2-4e29-9958-2afaa4ae5151';
      await request(app)
        .put(`/api/v1/${resource}/${uuid}`)
        .set('Authorization', `Bearer ${tokenFor([readPermission])}`)
        .send({ active: false })
        .expect(403);
      await request(app)
        .put(`/api/v1/${resource}/${uuid}`)
        .set('Authorization', `Bearer ${tokenFor([updatePermission])}`)
        .send({ active: 'invalid' })
        .expect(400);
    },
  );
});
