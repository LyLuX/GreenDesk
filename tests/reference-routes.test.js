import jwt from 'jsonwebtoken';
import request from 'supertest';

import app from '../src/app.js';
import env from '../src/config/env.js';

const tokenFor = (permissions) =>
  jwt.sign(
    { sub: 'f75ce638-18d2-4e29-9958-2afaa4ae5151', userId: 1, roles: [], permissions },
    env.jwt.secret,
  );

describe('reference routes authorization and validation', () => {
  it('rejects an unauthenticated categories request', async () => {
    await request(app).get('/api/categories').expect(401);
  });

  it('rejects a user without the required permission', async () => {
    await request(app)
      .get('/api/categories')
      .set('Authorization', `Bearer ${tokenFor([])}`)
      .expect(403);
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
    expect(response.body.error.message).toBe('Validation failed');
  });

  it('requires the material delete permission before deleting a material', async () => {
    await request(app)
      .delete('/api/v1/materials/f75ce638-18d2-4e29-9958-2afaa4ae5151')
      .set('Authorization', `Bearer ${tokenFor(['materials.update'])}`)
      .expect(403);
  });
});
