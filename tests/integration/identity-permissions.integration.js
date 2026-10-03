import { randomUUID } from 'node:crypto';
import bcrypt from 'bcrypt';
import express from 'express';
import jwt from 'jsonwebtoken';
import request from 'supertest';

import app from '../../src/app.js';
import env from '../../src/config/env.js';
import sequelize from '../../src/config/database.js';
import { initializeModels } from '../../src/core/database/models.js';
import logger from '../../src/core/logger/logger.js';
import { errorHandler } from '../../src/core/middlewares/error-handler.js';
import { validateRequest } from '../../src/core/middlewares/validate-request.js';
import { asyncHandler } from '../../src/core/utils/async-handler.js';
import { registerValidator } from '../../src/modules/auth/validator/auth.validator.js';
import { createPublicRegistrationGuard } from '../../src/modules/auth/middlewares/public-registration.middleware.js';
import AuthController from '../../src/modules/auth/controller/auth.controller.js';
import AuthService from '../../src/modules/auth/service/auth.service.js';
import AuthRepository from '../../src/modules/auth/repository/auth.repository.js';
import UserService from '../../src/modules/users/service/user.service.js';
import User from '../../src/modules/users/model/user.model.js';
import Company from '../../src/modules/companies/model/company.model.js';
import Role from '../../src/modules/roles/model/role.model.js';
import Permission from '../../src/modules/permissions/model/permission.model.js';
import AuditLog from '../../src/modules/audit/model/audit-log.model.js';

const password = 'R3-SecurePass123!';
const adminPermissions = [
  'users.update',
  'users.all.read',
  'users.password.update',
  'users.status.update',
  'users.roles.update',
  'users.companies.update',
  'roles.permissions.update',
  'roles.delete',
  'permissions.delete',
  'companies.status.update',
];

async function fixture(names = ['users.update', 'users.all.read', 'materials.read'], companies) {
  const company = companies?.[0] ?? (await Company.create({ name: `R3 ${randomUUID()}` }));
  const role = await Role.create({ name: `R3_${randomUUID()}` });
  // Base reconstruite par migrations : les permissions initiales du seeder ne sont pas présumées.
  const permissions = await Promise.all(
    names.map(async (name) => {
      const [permission] = await Permission.findOrCreate({ where: { name } });
      return permission;
    }),
  );
  await role.setPermissions(permissions);
  const user = await User.create({
    firstName: 'Test',
    lastName: 'R3',
    email: `${randomUUID()}@example.invalid`,
    passwordHash: await bcrypt.hash(password, 4),
    emailVerifiedAt: new Date(),
  });
  await user.addRole(role);
  await user.setCompanies(companies ?? [company]);
  return { company, user, role, permissions };
}

async function login(data) {
  const response = await request(app)
    .post('/api/v1/auth/login')
    .send({ email: data.user.email, password })
    .expect(200);
  return response.body.data.accessToken;
}
function api(data, token, company = data.company) {
  return {
    get: (path) =>
      request(app)
        .get(path)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Company-Uuid', company.uuid),
    put: (path, body) =>
      request(app)
        .put(path)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Company-Uuid', company.uuid)
        .send(body),
    post: (path) =>
      request(app)
        .post(path)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Company-Uuid', company.uuid),
    delete: (path) =>
      request(app)
        .delete(path)
        .set('Authorization', `Bearer ${token}`)
        .set('X-Company-Uuid', company.uuid),
  };
}
async function identitySnapshot(data) {
  return {
    user: await User.scope('withPassword').findByPk(data.user.id, { raw: true, paranoid: false }),
    audits: await AuditLog.count(),
  };
}
const wasSilent = logger.silent;
beforeAll(async () => {
  const marker = process.env.GREENDESK_INTEGRATION_TOKEN;
  if (
    !/^[a-f0-9]{24}$/.test(marker ?? '') ||
    env.database.name !== `greendesk_adversarial_${marker}`
  ) {
    throw new Error('Utilisez npm run test:integration : base temporaire isolée obligatoire.');
  }
  logger.silent = true;
  initializeModels();
  await sequelize.authenticate();
});
afterAll(async () => {
  logger.silent = wasSilent;
  await sequelize.close();
});

test('les champs internes et corps mixtes sont refusés sans écriture MySQL', async () => {
  const data = await fixture();
  const token = await login(data);
  const original = await identitySnapshot(data);
  for (const extra of [
    { passwordHash: await bcrypt.hash('AttackerPass123!', 4) },
    { authorizationVersion: 0 },
    { emailVerifiedAt: null },
    { id: Number(data.user.id) + 1 },
    { uuid: randomUUID() },
    { deletedAt: null },
    { lastLoginAt: '2026-01-01' },
    { createdAt: '2026-01-01' },
    { updatedAt: '2026-01-01' },
  ]) {
    await api(data, token)
      .put(`/api/v1/users/${data.user.uuid}`, { firstName: 'Changed', ...extra })
      .expect(400);
    expect(await identitySnapshot(data)).toEqual(original);
  }
  for (const extra of [
    { password: 'ChangedPass123!' },
    { isActive: false },
    { roleUuids: [] },
    { companyUuids: [] },
  ]) {
    await api(data, token)
      .put(`/api/v1/users/${data.user.uuid}`, { firstName: 'Changed', ...extra })
      .expect(403);
    expect(await identitySnapshot(data)).toEqual(original);
  }
  await api(data, token)
    .put(`/api/v1/users/${data.user.uuid}`, { firstName: 'Allowed' })
    .expect(200);
  expect((await User.findByPk(data.user.id)).firstName).toBe('Allowed');
});

test('le mot de passe explicite reste modifiable avec son droit dédié', async () => {
  const target = await fixture();
  const actor = await fixture(['users.password.update', 'users.all.read'], [target.company]);
  const token = await login(actor);
  await api(actor, token)
    .put(`/api/v1/users/${target.user.uuid}`, { password: 'AuthorizedPass123!' })
    .expect(200);
  const persisted = await User.scope('withPassword').findByPk(target.user.id);
  expect(await bcrypt.compare('AuthorizedPass123!', persisted.passwordHash)).toBe(true);
  expect(persisted.passwordHash).not.toBe('AuthorizedPass123!');
});

test('retirer un droit de rôle invalide le JWT et aucun retour de version client ne le réactive', async () => {
  const target = await fixture();
  const actor = await fixture(adminPermissions, [target.company]);
  const staleToken = await login(target);
  const adminToken = await login(actor);
  await api(target, staleToken).get('/api/v1/materials').expect(200);
  const remaining = target.permissions.filter(({ name }) => name !== 'materials.read');
  await api(actor, adminToken)
    .put(`/api/v1/roles/${target.role.uuid}`, {
      permissionUuids: remaining.map(({ uuid }) => uuid),
    })
    .expect(200);
  await api(target, staleToken).get('/api/v1/materials').expect(401);
  await api(target, staleToken).post('/api/v1/auth/refresh').expect(401);
  const freshToken = await login(target);
  const before = await identitySnapshot(target);
  await api(target, freshToken)
    .put(`/api/v1/users/${target.user.uuid}`, {
      authorizationVersion: jwt.decode(staleToken).authorizationVersion,
    })
    .expect(400);
  expect(await identitySnapshot(target)).toEqual(before);
  await api(target, staleToken).get('/api/v1/materials').expect(401);
  await api(target, freshToken).get('/api/v1/materials').expect(403);
});

test('le retrait d’une affiliation société invalide toutes les anciennes sessions', async () => {
  const other = await Company.create({ name: `R3 autre ${randomUUID()}` });
  const target = await fixture();
  await target.user.addCompany(other);
  const actor = await fixture(adminPermissions, [target.company, other]);
  const token = await login(target);
  const adminToken = await login(actor);
  await api(actor, adminToken)
    .put(`/api/v1/users/${target.user.uuid}`, { companyUuids: [other.uuid] })
    .expect(200);
  await api(target, token).get('/api/v1/materials').expect(401);
  const fresh = await login(target);
  await api(target, fresh).get('/api/v1/materials').expect(403);
  await api(target, fresh, other).get('/api/v1/materials').expect(200);
});

test('la suppression d’une permission invalide les sessions de tous ses titulaires', async () => {
  const target = await fixture();
  const marker = await Permission.create({ name: `r3.${randomUUID()}.read` });
  await target.role.addPermission(marker);
  const actor = await fixture(adminPermissions, [target.company]);
  const token = await login(target);
  const adminToken = await login(actor);
  await api(actor, adminToken).delete(`/api/v1/permissions/${marker.uuid}`).expect(204);
  await api(target, token).get('/api/v1/materials').expect(401);
  const fresh = await login(target);
  expect(jwt.decode(fresh).permissions).not.toContain(marker.name);
  await api(target, fresh).get('/api/v1/materials').expect(200);
});

test('comptes désactivés ou supprimés et sociétés désactivées refusent les sessions émises', async () => {
  for (const change of ['disabledUser', 'deletedUser', 'disabledCompany']) {
    const data = await fixture();
    const token = await login(data);
    if (change === 'disabledUser') await data.user.update({ isActive: false });
    if (change === 'deletedUser') await data.user.destroy();
    if (change === 'disabledCompany') await data.company.update({ active: false });
    const before = await identitySnapshot(data);
    await api(data, token)
      .get('/api/v1/materials')
      .expect(change === 'disabledCompany' ? 403 : 401);
    expect(await identitySnapshot(data)).toEqual(before);
  }
});

test('refresh et logout révoquent réellement les JWT remplacés dans MySQL', async () => {
  const data = await fixture();
  const token = await login(data);
  const refreshed = await api(data, token).post('/api/v1/auth/refresh').expect(200);
  await api(data, token).get('/api/v1/materials').expect(401);
  const renewed = refreshed.body.data.accessToken;
  await api(data, renewed).get('/api/v1/materials').expect(200);
  await api(data, renewed).post('/api/v1/auth/logout').expect(200);
  await api(data, renewed).get('/api/v1/materials').expect(401);
  await api(data, renewed).post('/api/v1/auth/refresh').expect(401);
});

test('les claims absents, la signature invalide et l’expiration refusent avant toute écriture', async () => {
  const data = await fixture();
  const token = await login(data);
  const claims = jwt.decode(token);
  const before = await identitySnapshot(data);
  const tokens = [
    jwt.sign(claims, 'different-integration-secret'),
    jwt.sign({ ...claims, exp: 1 }, env.jwt.secret),
  ];
  for (const field of ['sub', 'userId', 'jti', 'exp', 'authorizationVersion', 'permissions']) {
    const incomplete = { ...claims };
    delete incomplete[field];
    tokens.push(jwt.sign(incomplete, env.jwt.secret));
  }
  tokens.push(jwt.sign({ ...claims, sub: randomUUID() }, env.jwt.secret));
  const withoutCompanies = { ...claims };
  delete withoutCompanies.companyAccess;
  await api(data, jwt.sign(withoutCompanies, env.jwt.secret)).get('/api/v1/materials').expect(403);
  expect(await identitySnapshot(data)).toEqual(before);
  for (const invalid of tokens) {
    await api(data, invalid).get('/api/v1/materials').expect(401);
    expect(await identitySnapshot(data)).toEqual(before);
  }
});

test('l’inscription ouverte refuse les privilèges client et conserve USER et la vérification email', async () => {
  const target = await fixture(['users.roles.update']);
  await Role.findOrCreate({ where: { name: 'USER' } });
  const authService = new AuthService(new AuthRepository(), new UserService(), undefined, {
    issue: async () => ({ sent: false }),
  });
  const controller = new AuthController(authService);
  const registration = express();
  registration.use(express.json());
  registration.post(
    '/register',
    createPublicRegistrationGuard(true),
    registerValidator,
    validateRequest,
    asyncHandler(controller.register.bind(controller)),
  );
  registration.use(errorHandler);
  const profile = {
    firstName: 'Public',
    lastName: 'R3',
    email: `${randomUUID()}@example.invalid`,
    password,
  };
  const count = await User.count();
  const audits = await AuditLog.count();
  for (const extra of [
    { roleUuids: [target.role.uuid] },
    { companyUuids: [target.company.uuid] },
    { authorizationVersion: 0 },
    { emailVerifiedAt: '2026-01-01' },
  ]) {
    await request(registration)
      .post('/register')
      .send({ ...profile, ...extra })
      .expect(400);
    expect(await User.count()).toBe(count);
    expect(await AuditLog.count()).toBe(audits);
  }
  await request(registration).post('/register').send(profile).expect(201);
  const created = await User.findOne({
    where: { email: profile.email },
    include: [
      { model: Role, as: 'roles' },
      { model: Company, as: 'companies' },
    ],
  });
  expect(created.emailVerifiedAt).toBeNull();
  expect(created.roles.map(({ name }) => name)).toEqual(['USER']);
  expect(created.companies).toHaveLength(1);
  await request(app)
    .post('/api/v1/auth/login')
    .send({ email: profile.email, password })
    .expect(403);
});

describe('Role permission filtering', () => {
  it('paginates matching roles and retains their full permission lists', async () => {
    const data = await fixture(['roles.read']);
    const token = await login(data);
    const shared = await Permission.create({ name: `filter.${randomUUID()}` });
    const extra = await Permission.create({ name: `extra.${randomUUID()}` });
    const matching = await Promise.all(
      Array.from({ length: 6 }, (_, index) =>
        Role.create({ name: `FILTER_${shared.uuid}_${index}` }),
      ),
    );
    for (const role of matching) await role.setPermissions([shared, extra]);
    const first = await api(data, token)
      .get(`/api/v1/roles?permissionUuid=${shared.uuid}&page=1&limit=5`)
      .expect(200);
    expect(first.body.data.pagination.total).toBe(6);
    expect(first.body.data.items.map(({ uuid }) => uuid)).toEqual(
      matching.slice(0, 5).map(({ uuid }) => uuid),
    );
    for (const role of first.body.data.items) {
      expect(role.permissions.map(({ uuid }) => uuid).sort()).toEqual(
        [shared.uuid, extra.uuid].sort(),
      );
    }
    const second = await api(data, token)
      .get(`/api/v1/roles?permissionUuid=${shared.uuid}&page=2&limit=5`)
      .expect(200);
    expect(second.body.data.items.map(({ uuid }) => uuid)).toEqual([matching[5].uuid]);
  });
});

it('loads the permission selector catalogue without pagination or deleted entries', async () => {
  const data = await fixture(['permissions.read']);
  const token = await login(data);
  const prefix = `catalogue.${randomUUID()}`;
  const options = await Permission.bulkCreate(
    Array.from({ length: 31 }, (_, index) => ({
      name: `${prefix}.${String(index).padStart(2, '0')}`,
      description: null,
    })),
  );
  await options[30].destroy();
  const response = await api(data, token).get('/api/v1/permissions/options').expect(200);
  expect(Array.isArray(response.body.data)).toBe(true);
  const selected = response.body.data.filter(({ name }) => name.startsWith(prefix));
  expect(selected.map(({ uuid }) => uuid)).toEqual(options.slice(0, 30).map(({ uuid }) => uuid));
  for (const option of selected)
    expect(Object.keys(option).sort()).toEqual(['description', 'name', 'uuid']);
  expect(
    response.body.data.every(
      (item, index, items) => index === 0 || items[index - 1].name.localeCompare(item.name) <= 0,
    ),
  ).toBe(true);
});
