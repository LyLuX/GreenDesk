import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import RevokedAccessToken from '../src/modules/auth/model/revoked-access-token.model.js';

import app from '../src/app.js';
import Permission from '../src/modules/permissions/model/permission.model.js';
import { MAX_PERMISSION_OPTIONS } from '../src/modules/permissions/service/permission.service.js';
import env from '../src/config/env.js';
import Company from '../src/modules/companies/model/company.model.js';
import User from '../src/modules/users/model/user.model.js';

const uuid = 'f75ce638-18d2-4e29-9958-2afaa4ae5151';
const tokenFor = (permissions) =>
  jwt.sign(
    {
      sub: uuid,
      userId: 1,
      authorizationVersion: 0,
      jti: 'route-test-token',
      roles: [],
      permissions,
      companyAccess: [{ id: 1, uuid }],
    },
    env.jwt.secret,
    { expiresIn: '5m' },
  );
const authorization = (permissions) => `Bearer ${tokenFor(permissions)}`;

describe('granular administration route permissions', () => {
  beforeAll(() => {
    jest.spyOn(RevokedAccessToken, 'findOne').mockResolvedValue(null);
    jest.spyOn(User, 'findOne').mockResolvedValue({ id: 1 });
    jest.spyOn(Company, 'findOne').mockResolvedValue({ id: 1, uuid, active: true });
    jest.spyOn(Company, 'findAndCountAll').mockResolvedValue({ count: 0, rows: [] });
    jest.spyOn(User, 'findAndCountAll').mockResolvedValue({ count: 0, rows: [] });
  });

  afterAll(() => jest.restoreAllMocks());

  it('protects the permission catalogue with the existing read permission', async () => {
    await request(app).get('/api/v1/permissions/options').expect(401);
    await request(app)
      .get('/api/v1/permissions/options')
      .set('Authorization', authorization(['roles.read']))
      .expect(403);
  });

  it('returns a bounded catalogue of more than 25 permissions in one response', async () => {
    const options = Array.from({ length: 76 }, (_, index) => ({
      uuid,
      name: `catalogue.${index}.read`,
      description: null,
    }));
    const lookup = jest.spyOn(Permission, 'findAll').mockResolvedValueOnce(options);
    try {
      const result = await request(app)
        .get('/api/v1/permissions/options')
        .set('Authorization', authorization(['permissions.read']))
        .expect(200);
      expect(result.body.data).toEqual(options);
      expect(lookup).toHaveBeenCalledWith({
        attributes: ['uuid', 'name', 'description'],
        order: [['name', 'ASC']],
        limit: MAX_PERMISSION_OPTIONS + 1,
      });
    } finally {
      lookup.mockRestore();
    }
  });

  it('rejects an oversized permission catalogue instead of silently truncating it', async () => {
    const lookup = jest.spyOn(Permission, 'findAll').mockResolvedValueOnce(
      Array.from({ length: MAX_PERMISSION_OPTIONS + 1 }, () => ({
        uuid,
        name: 'read',
        description: null,
      })),
    );
    try {
      const result = await request(app)
        .get('/api/v1/permissions/options')
        .set('Authorization', authorization(['permissions.read']))
        .expect(409);
      expect(result.body.data).toBeUndefined();
    } finally {
      lookup.mockRestore();
    }
  });

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

  it.each([
    ['password', 'SecurePass123!', 'users.password.update'],
    ['isActive', false, 'users.status.update'],
    ['roleUuids', [], 'users.roles.update'],
    ['companyUuids', [], 'users.companies.update'],
  ])(
    'requires both permissions for mixed profile and %s bodies',
    async (field, value, permission) => {
      for (const permissions of [['users.update'], [permission]]) {
        await request(app)
          .put(`/api/v1/users/${uuid}`)
          .set('Authorization', authorization(permissions))
          .send({ firstName: 'Ada', [field]: value })
          .expect(403);
      }
    },
  );

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

  it('rejects renaming a role even with the role update permission', async () => {
    await request(app)
      .put(`/api/v1/roles/${uuid}`)
      .set('Authorization', authorization(['roles.update']))
      .send({ name: 'NOUVEAU_NOM' })
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

  it('requires dedicated permission before listing deleted users', async () => {
    await request(app)
      .get('/api/v1/users?deleted=true')
      .set('Authorization', authorization(['users.read']))
      .expect(403);
    await request(app)
      .get('/api/v1/users?deleted=true')
      .set('Authorization', authorization(['users.read', 'users.deleted.read']))
      .expect(200);
    await request(app)
      .get('/api/v1/users')
      .set('Authorization', authorization(['users.read']))
      .expect(200);
    await request(app)
      .get('/api/v1/users?includeDeleted=true')
      .set('Authorization', authorization(['users.read']))
      .expect(403);
    await request(app)
      .get('/api/v1/users?includeDeleted=true')
      .set('Authorization', authorization(['users.read', 'users.deleted.read']))
      .expect(200);
  });

  it('protects user restoration with its own permission', async () => {
    await request(app)
      .post('/api/v1/users/invalid/restore')
      .set('Authorization', authorization(['users.delete', 'users.deleted.read']))
      .expect(403);
    await request(app)
      .post('/api/v1/users/invalid/restore')
      .set('Authorization', authorization(['users.deleted.update']))
      .expect(400);
  });

  it('requires dedicated permissions for deleted company visibility and restoration', async () => {
    await request(app)
      .get('/api/v1/companies?deleted=true')
      .set('Authorization', authorization(['companies.read', 'companies.access.all']))
      .expect(403);
    await request(app)
      .get('/api/v1/companies?deleted=true')
      .set(
        'Authorization',
        authorization(['companies.read', 'companies.deleted.read', 'companies.access.all']),
      )
      .expect(200);
    expect(Company.findAndCountAll).toHaveBeenLastCalledWith(
      expect.objectContaining({ paranoid: false }),
    );
    await request(app)
      .get('/api/v1/companies?includeDeleted=true')
      .set('Authorization', authorization(['companies.read', 'companies.access.all']))
      .expect(403);
    await request(app)
      .get('/api/v1/companies?includeDeleted=true')
      .set(
        'Authorization',
        authorization(['companies.read', 'companies.deleted.read', 'companies.access.all']),
      )
      .expect(200);
    expect(Company.findAndCountAll).toHaveBeenLastCalledWith(
      expect.objectContaining({ paranoid: false }),
    );

    await request(app)
      .post('/api/v1/companies/invalid/restore')
      .set('Authorization', authorization(['companies.deleted.read']))
      .expect(403);
    await request(app)
      .post('/api/v1/companies/invalid/restore')
      .set('Authorization', authorization(['companies.deleted.update']))
      .expect(400);
  });

  it('protects company logo changes with their dedicated permission', async () => {
    await request(app)
      .get(`/api/v1/companies/${uuid}/logo`)
      .set('Authorization', authorization([]))
      .expect(404);
    await request(app)
      .post(`/api/v1/companies/${uuid}/logo`)
      .set('Authorization', authorization(['companies.update']))
      .expect(403);
    await request(app)
      .post('/api/v1/companies/invalid/logo')
      .set('Authorization', authorization(['companies.logo.update']))
      .expect(400);
    await request(app)
      .delete(`/api/v1/companies/${uuid}/logo`)
      .set('Authorization', authorization(['companies.update']))
      .expect(403);
    await request(app)
      .delete('/api/v1/companies/invalid/logo')
      .set('Authorization', authorization(['companies.logo.update']))
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
