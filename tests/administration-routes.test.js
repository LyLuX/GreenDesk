import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';
import request from 'supertest';

import app from '../src/app.js';
import env from '../src/config/env.js';
import User from '../src/modules/users/model/user.model.js';

const uuid = 'f75ce638-18d2-4e29-9958-2afaa4ae5151';
const tokenFor = (permissions) =>
  jwt.sign({ sub: uuid, userId: 1, roles: [], permissions }, env.jwt.secret);
const authorization = (permissions) => `Bearer ${tokenFor(permissions)}`;

describe('granular administration route permissions', () => {
  beforeAll(() => {
    jest.spyOn(User, 'findOne').mockResolvedValue({ id: 1 });
  });

  afterAll(() => jest.restoreAllMocks());

  it.each([
    ['isActive', 'invalid', 'users.update', 'users.status.update'],
    ['password', 'short', 'users.update', 'users.password.update'],
    ['roleUuids', ['invalid'], 'users.update', 'users.roles.update'],
  ])('isolates the user %s action', async (field, value, generalPermission, actionPermission) => {
    await request(app)
      .put(`/api/v1/users/${uuid}`)
      .set('Authorization', authorization([generalPermission]))
      .send({ [field]: value })
      .expect(403);
    await request(app)
      .put(`/api/v1/users/${uuid}`)
      .set('Authorization', authorization([actionPermission]))
      .send({ [field]: value })
      .expect(400);
  });

  it('requires both user creation and role-assignment permissions when roles are supplied', async () => {
    const payload = {
      firstName: '',
      lastName: '',
      email: 'invalid',
      password: 'short',
      roleUuids: [],
    };
    await request(app)
      .post('/api/v1/users')
      .set('Authorization', authorization(['users.create']))
      .send(payload)
      .expect(403);
    await request(app)
      .post('/api/v1/users')
      .set('Authorization', authorization(['users.create', 'users.roles.update']))
      .send(payload)
      .expect(400);
  });

  it('separates role details from permission assignment', async () => {
    await request(app)
      .put(`/api/v1/roles/${uuid}`)
      .set('Authorization', authorization(['roles.update']))
      .send({ permissionUuids: [] })
      .expect(403);
    await request(app)
      .put(`/api/v1/roles/${uuid}`)
      .set('Authorization', authorization(['roles.permissions.update']))
      .send({ name: '' })
      .expect(403);
    await request(app)
      .put(`/api/v1/roles/${uuid}`)
      .set('Authorization', authorization(['roles.update', 'roles.permissions.update']))
      .send({ name: '', permissionUuids: ['invalid'] })
      .expect(400);
  });

  it('protects administrative verification-email resends with their own permission', async () => {
    await request(app)
      .post('/api/v1/users/invalid/email-verification/resend')
      .set('Authorization', authorization(['users.update']))
      .expect(403);
    await request(app)
      .post('/api/v1/users/invalid/email-verification/resend')
      .set('Authorization', authorization(['users.email_verification.resend']))
      .expect(400);
  });

  it.each([
    ['/api/v1/permissions', 'post', 'permissions.create', { name: '' }],
    [`/api/v1/permissions/${uuid}`, 'put', 'permissions.update', { name: '' }],
  ])(
    'accepts the dedicated permission before validating %s',
    async (path, method, permission, body) => {
      await request(app)
        [method](path)
        .set('Authorization', authorization([permission]))
        .send(body)
        .expect(400);
    },
  );
});
