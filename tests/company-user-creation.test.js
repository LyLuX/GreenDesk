import { jest } from '@jest/globals';
import bcrypt from 'bcrypt';
import UserService from '../src/modules/users/service/user.service.js';
import { runWithCompanyScope } from '../src/core/company/company-context.js';

const a = { id: 1, uuid: '11111111-1111-4111-8111-111111111111', name: 'Societe A', active: true };
const b = { id: 2, uuid: '22222222-2222-4222-8222-222222222222', name: 'Societe B', active: true };
const outside = {
  id: 3,
  uuid: '33333333-3333-4333-8333-333333333333',
  name: 'Societe C',
  active: true,
};
const input = {
  firstName: 'Jean',
  lastName: 'Dupont',
  email: 'jean@example.test',
  password: 'SecurePass123!',
};
const claims = { userId: 9, permissions: ['users.company.create'], companyAccess: [a, b, outside] };
const scope = (action, company = a) =>
  runWithCompanyScope({ companyId: company.id, companyUuid: company.uuid }, action);
const fixture = () => {
  const user = { id: 10, uuid: 'new-user', roles: [], companies: [] };
  const repository = {
    findById: jest.fn().mockResolvedValue({ companies: [a, b, { ...outside, active: false }] }),
    findByEmail: jest.fn().mockResolvedValue(null),
    findByUuid: jest.fn().mockResolvedValue(user),
    create: jest.fn().mockResolvedValue(user),
    restore: jest.fn(),
    update: jest.fn(),
    incrementAuthorizationVersion: jest.fn(),
    setRoles: jest.fn(),
    setCompanies: jest.fn(),
    withTransaction: jest.fn((callback) => callback({ id: 'transaction' })),
  };
  const role = { id: 4, name: 'USER' };
  const roles = { findByName: jest.fn().mockResolvedValue(role), findByUuid: jest.fn() };
  const companies = {
    findByUuid: jest.fn().mockResolvedValue(a),
    findByUuids: jest.fn(async (uuids) =>
      [a, b, outside].filter(({ uuid }) => uuids.includes(uuid)),
    ),
  };
  return {
    service: new UserService(repository, roles, { record: jest.fn() }, companies),
    repository,
    roles,
    role,
  };
};

beforeAll(() => jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed-password'));
afterAll(() => jest.restoreAllMocks());

describe('scoped user creation', () => {
  it.each([undefined, [a.uuid], [a.uuid, b.uuid]].map((companyUuids) => ({ companyUuids })))(
    'creates a USER only in own active companies (%#)',
    async ({ companyUuids }) => {
      const { service, repository, roles, role } = fixture();
      await scope(() =>
        service.create({ ...input, ...(companyUuids ? { companyUuids } : {}) }, 9, 'ADMIN', {
          actorClaims: claims,
        }),
      );
      expect(roles.findByName).toHaveBeenCalledWith('USER', expect.any(Object));
      expect(repository.setRoles).toHaveBeenCalledWith(
        expect.any(Object),
        [role],
        expect.any(Object),
      );
      expect(repository.setCompanies).toHaveBeenCalledWith(
        expect.any(Object),
        companyUuids?.length === 2 ? [a, b] : [a],
        expect.any(Object),
      );
    },
  );

  it.each([[outside.uuid], [a.uuid, outside.uuid]].map((companyUuids) => ({ companyUuids })))(
    'rejects foreign or inactive memberships even with global company access (%#)',
    async ({ companyUuids }) => {
      const { service, repository } = fixture();
      await expect(
        scope(() =>
          service.create({ ...input, companyUuids }, 9, 'USER', {
            actorClaims: {
              ...claims,
              permissions: [
                ...claims.permissions,
                'companies.access.all',
                'users.companies.update',
              ],
            },
          }),
        ),
      ).rejects.toMatchObject({ statusCode: 403 });
      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.setCompanies).not.toHaveBeenCalled();
    },
  );

  it('rejects a context outside own affiliations even with explicit allowed assignments', async () => {
    const { service, repository } = fixture();
    await expect(
      scope(
        () =>
          service.create({ ...input, companyUuids: [a.uuid] }, 9, 'USER', { actorClaims: claims }),
        outside,
      ),
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(repository.create).not.toHaveBeenCalled();
  });

  it.each([[], ['admin-role']].map((roleUuids) => ({ roleUuids })))(
    'rejects any client role assignment, including with role-update permission (%#)',
    async ({ roleUuids }) => {
      const { service, repository } = fixture();
      await expect(
        scope(() =>
          service.create({ ...input, roleUuids }, 9, 'USER', {
            actorClaims: { ...claims, permissions: [...claims.permissions, 'users.roles.update'] },
          }),
        ),
      ).rejects.toMatchObject({ statusCode: 403 });
      expect(repository.create).not.toHaveBeenCalled();
    },
  );

  it('requires at least one company', async () => {
    const { service, repository } = fixture();
    await expect(
      scope(() =>
        service.create({ ...input, companyUuids: [] }, 9, 'USER', { actorClaims: claims }),
      ),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(repository.create).not.toHaveBeenCalled();
  });

  it.each([false, true])('never repurposes an existing identity (deleted=%s)', async (deleted) => {
    const { service, repository } = fixture();
    repository.findByEmail.mockResolvedValue({
      id: 99,
      uuid: 'existing',
      deletedAt: deleted ? new Date() : null,
    });
    await expect(
      scope(() =>
        service.create(input, 9, 'USER', {
          actorClaims: { ...claims, permissions: [...claims.permissions, 'users.deleted.update'] },
        }),
      ),
    ).rejects.toMatchObject({ statusCode: deleted ? 403 : 409 });
    expect(repository.restore).not.toHaveBeenCalled();
    expect(repository.update).not.toHaveBeenCalled();
    expect(repository.setCompanies).not.toHaveBeenCalled();
  });

  it('returns only own active company UUIDs and names for the selection list', async () => {
    const { service } = fixture();
    await expect(service.getCreationCompanies(claims)).resolves.toEqual([
      { uuid: a.uuid, name: a.name },
      { uuid: b.uuid, name: b.name },
    ]);
  });

  it('does not restrict the separate general creation permission', async () => {
    const { service, repository } = fixture();
    await scope(() =>
      service.create({ ...input, companyUuids: [outside.uuid] }, 9, 'USER', {
        actorClaims: {
          ...claims,
          permissions: [...claims.permissions, 'users.create', 'companies.access.all'],
        },
      }),
    );
    expect(repository.setCompanies).toHaveBeenCalledWith(
      expect.any(Object),
      [outside],
      expect.any(Object),
    );
    expect(repository.findById).not.toHaveBeenCalled();
  });
});
