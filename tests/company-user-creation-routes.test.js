import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import app from '../src/app.js';
import env from '../src/config/env.js';
import User from '../src/modules/users/model/user.model.js';
import Company from '../src/modules/companies/model/company.model.js';
import RevokedAccessToken from '../src/modules/auth/model/revoked-access-token.model.js';
import UserService from '../src/modules/users/service/user.service.js';

const uuid = '11111111-1111-4111-8111-111111111111';
const authorization = (permissions) =>
  'Bearer ' +
  jwt.sign(
    {
      sub: uuid,
      userId: 1,
      authorizationVersion: 0,
      jti: 'scoped-test',
      roles: ['MANAGER'],
      permissions,
      companyAccess: [{ id: 1, uuid }],
    },
    env.jwt.secret,
    { expiresIn: '5m' },
  );
const payload = {
  firstName: 'Jean',
  lastName: 'Dupont',
  email: 'jean@example.test',
  password: 'SecurePass123!',
  companyUuids: [uuid],
};

beforeAll(() => {
  jest.spyOn(User, 'findOne').mockResolvedValue({ id: 1 });
  jest.spyOn(Company, 'findOne').mockResolvedValue({ id: 1, uuid, active: true });
  jest.spyOn(RevokedAccessToken, 'findOne').mockResolvedValue(null);
});
afterAll(() => jest.restoreAllMocks());

describe('specific scoped-creation API permission', () => {
  it('requires authentication and the dedicated permission for company choices', async () => {
    await request(app).get('/api/v1/users/creation-companies').expect(401);
    await request(app)
      .get('/api/v1/users/creation-companies')
      .set('Authorization', authorization(['users.read']))
      .expect(403);
    const lookup = jest
      .spyOn(UserService.prototype, 'getCreationCompanies')
      .mockResolvedValue([{ uuid, name: 'Societe A' }]);
    try {
      const response = await request(app)
        .get('/api/v1/users/creation-companies')
        .set('Authorization', authorization(['users.company.create']))
        .expect(200);
      expect(response.body.data).toEqual([{ uuid, name: 'Societe A' }]);
    } finally {
      lookup.mockRestore();
    }
  });

  it('allows account creation without granting company-edit or user-read rights', async () => {
    const create = jest
      .spyOn(UserService.prototype, 'create')
      .mockResolvedValue({ uuid, firstName: 'Jean' });
    try {
      await request(app)
        .post('/api/v1/users')
        .set('Authorization', authorization(['users.company.create']))
        .send(payload)
        .expect(201);
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({ companyUuids: [uuid] }),
        1,
        'USER',
        expect.objectContaining({
          actorClaims: expect.objectContaining({ permissions: ['users.company.create'] }),
        }),
      );
      await request(app)
        .get('/api/v1/users')
        .set('Authorization', authorization(['users.company.create']))
        .expect(403);
    } finally {
      create.mockRestore();
    }
  });

  it.each([[], [uuid]])(
    'forbids a client role list even with role-edit rights (%#)',
    async (...roleUuids) => {
      await request(app)
        .post('/api/v1/users')
        .set('Authorization', authorization(['users.company.create', 'users.roles.update']))
        .send({ ...payload, roleUuids })
        .expect(403);
    },
  );

  it('does not permit existing identity mutations with the creation permission', async () => {
    for (const [method, path] of [
      ['put', '/api/v1/users/' + uuid],
      ['delete', '/api/v1/users/' + uuid],
      ['post', '/api/v1/users/' + uuid + '/restore'],
    ]) {
      await request(app)
        [method](path)
        .set('Authorization', authorization(['users.company.create']))
        .send({ firstName: 'New' })
        .expect(403);
    }
    await request(app)
      .post('/api/v1/users')
      .set('Authorization', authorization(['users.read']))
      .send(payload)
      .expect(403);
  });
});
