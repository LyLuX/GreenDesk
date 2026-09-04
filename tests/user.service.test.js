import { jest } from '@jest/globals';

import UserService from '../src/modules/users/service/user.service.js';
import { runWithCompanyScope } from '../src/core/company/company-context.js';

const user = {
  id: 1,
  uuid: 'a5eaf09e-49b1-4fa3-a022-1a20854b06bd',
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@greendesk.local',
  authorizationVersion: 0,
  roles: [],
  companies: [],
  toJSON() {
    return { ...this, passwordHash: 'hidden' };
  },
};
const transaction = { id: 'transaction' };

describe('UserService', () => {
  const createService = () => {
    const userRepository = {
      findByEmail: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(user),
      findByUuid: jest.fn().mockResolvedValue(user),
      setRoles: jest.fn(),
      setCompanies: jest.fn(),
      findAll: jest.fn().mockResolvedValue({ count: 0, rows: [] }),
      update: jest.fn(),
      delete: jest.fn(),
      restore: jest.fn(),
      incrementAuthorizationVersion: jest.fn(),
      withTransaction: jest.fn((callback) => callback(transaction)),
    };
    const roleRepository = {
      findByName: jest.fn().mockResolvedValue({ id: 3, name: 'USER' }),
      findByUuid: jest
        .fn()
        .mockResolvedValue({ id: 3, uuid: 'a5eaf09e-49b1-4fa3-a022-1a20854b06bd' }),
    };
    const auditService = { record: jest.fn() };
    const companyRepository = {
      findFirstActive: jest.fn().mockResolvedValue({
        id: 1,
        uuid: 'a2b3c4d5-6e7f-4890-ab12-34567890cdef',
        name: 'EI BOURNAZEL Paul',
        active: true,
      }),
      findByUuid: jest.fn(),
      findByUuids: jest.fn(),
    };
    return {
      service: new UserService(userRepository, roleRepository, auditService, companyRepository),
      userRepository,
      auditService,
    };
  };

  it('creates a user with a hashed password', async () => {
    const { service, userRepository, auditService } = createService();
    const result = await service.create(
      {
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ADA@GREENDESK.LOCAL',
        password: 'SecurePass123!',
      },
      null,
      'USER',
    );
    expect(userRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'ada@greendesk.local', passwordHash: expect.any(String) }),
      { transaction },
    );
    expect(userRepository.create.mock.calls[0][0].passwordHash).not.toBe('SecurePass123!');
    expect(userRepository.setCompanies).toHaveBeenCalledWith(
      user,
      [expect.objectContaining({ name: 'EI BOURNAZEL Paul' })],
      { transaction },
    );
    expect(result.passwordHash).toBeUndefined();
    expect(service.publicUser(result).authorizationVersion).toBeUndefined();
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'USER_CREATED' }),
      { transaction },
    );
  });

  it('retrieves a user by UUID', async () => {
    const { service } = createService();
    await expect(service.getByUuid(user.uuid)).resolves.toBe(user);
  });

  it('limits user listings to role names granted by readable permissions', async () => {
    const { service, userRepository } = createService();

    await service.getAll({ page: 1, limit: 5 }, [
      'users.read',
      'users.roles.USER.read',
      'users.roles.MANAGER.read',
    ]);

    expect(userRepository.findAll).toHaveBeenCalledWith({
      page: 1,
      limit: 5,
      visibleRoleNames: ['USER', 'MANAGER'],
    });
  });

  it('does not apply a role scope when users.all.read is granted', async () => {
    const { service, userRepository } = createService();

    await service.getAll({}, ['users.read', 'users.all.read']);

    expect(userRepository.findAll).toHaveBeenCalledWith({ visibleRoleNames: undefined });
  });

  it('intersects user visibility with the active company', async () => {
    const { service, userRepository } = createService();

    await runWithCompanyScope(
      { companyId: 7, companyUuid: 'b5eaf09e-49b1-4fa3-a022-1a20854b06bd' },
      () => service.getAll({}, ['users.read', 'users.all.read']),
    );

    expect(userRepository.findAll).toHaveBeenCalledWith({
      visibleRoleNames: undefined,
      companyId: 7,
    });
  });

  it('removes only the company filter with companies.access.all', async () => {
    const { service, userRepository } = createService();

    await runWithCompanyScope(
      { companyId: 7, companyUuid: 'b5eaf09e-49b1-4fa3-a022-1a20854b06bd' },
      () => service.getAll({}, ['users.read', 'users.all.read', 'companies.access.all']),
    );

    expect(userRepository.findAll).toHaveBeenCalledWith({ visibleRoleNames: undefined });
  });

  it('applies the same readable role scope to user details', async () => {
    const { service, userRepository } = createService();

    await service.getByUuid(user.uuid, {
      visibilityPermissions: ['users.read', 'users.roles.USER.read'],
    });

    expect(userRepository.findByUuid).toHaveBeenCalledWith(user.uuid, {
      visibleRoleNames: ['USER'],
    });
  });

  it('updates user role assignments', async () => {
    const { service, userRepository } = createService();
    await service.update(user.uuid, { roleUuids: ['a5eaf09e-49b1-4fa3-a022-1a20854b06bd'] });
    expect(userRepository.setRoles).toHaveBeenCalledWith(
      user,
      [expect.objectContaining({ id: 3 })],
      { transaction },
    );
    expect(userRepository.incrementAuthorizationVersion).toHaveBeenCalledWith(user.id, {
      transaction,
    });
  });

  it('invalidates the acting administrator session when changing their own roles', async () => {
    const { service, userRepository } = createService();

    await service.update(
      user.uuid,
      { roleUuids: ['a5eaf09e-49b1-4fa3-a022-1a20854b06bd'] },
      user.id,
    );

    expect(userRepository.setRoles).toHaveBeenCalled();
    expect(userRepository.incrementAuthorizationVersion).toHaveBeenCalledWith(user.id, {
      transaction,
    });
  });

  it('allows an email normalization when the lookup returns the user being edited', async () => {
    const legacyUser = { ...user, email: 'ADA@GREENDESK.LOCAL' };
    const { service, userRepository } = createService();
    userRepository.findByUuid.mockResolvedValue(legacyUser);
    userRepository.findByEmail.mockResolvedValue(legacyUser);

    await expect(service.update(legacyUser.uuid, { email: 'ada@greendesk.local' })).resolves.toBe(
      legacyUser,
    );
    expect(userRepository.update).toHaveBeenCalledWith(
      legacyUser,
      expect.objectContaining({ email: 'ada@greendesk.local' }),
      { transaction },
    );
  });

  it('restores a soft-deleted user with a new password', async () => {
    const deletedUser = { ...user, deletedAt: new Date() };
    const { service, userRepository, auditService } = createService();
    userRepository.findByEmail.mockResolvedValue(deletedUser);
    userRepository.findByUuid.mockResolvedValue(deletedUser);

    await service.create(
      {
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ADA@GREENDESK.LOCAL',
        password: 'NewSecurePass123!',
      },
      2,
      'USER',
      { actorClaims: { permissions: ['users.deleted.update'] } },
    );

    expect(userRepository.restore).toHaveBeenCalledWith(deletedUser, { transaction });
    expect(userRepository.incrementAuthorizationVersion).toHaveBeenCalledWith(deletedUser.id, {
      transaction,
    });
    expect(userRepository.update).toHaveBeenCalledWith(
      deletedUser,
      expect.objectContaining({
        email: 'ada@greendesk.local',
        passwordHash: expect.any(String),
        isActive: true,
      }),
      { transaction },
    );
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'USER_RESTORED' }),
      { transaction },
    );
  });

  it('requires deleted-user update permission before recreating a deleted account', async () => {
    const deletedUser = { ...user, deletedAt: new Date() };
    const { service, userRepository } = createService();
    userRepository.findByEmail.mockResolvedValue(deletedUser);

    await expect(
      service.create(
        {
          firstName: 'Ada',
          lastName: 'Lovelace',
          email: 'ADA@GREENDESK.LOCAL',
          password: 'NewSecurePass123!',
        },
        2,
        'USER',
        { actorClaims: { permissions: ['users.create'] } },
      ),
    ).rejects.toMatchObject({ statusCode: 403 });

    expect(userRepository.restore).not.toHaveBeenCalled();
  });

  it('invalidates sessions when deleting a user', async () => {
    const { service, userRepository, auditService } = createService();

    await service.remove(user.uuid, 2);

    expect(userRepository.incrementAuthorizationVersion).toHaveBeenCalledWith(user.id, {
      transaction,
    });
    expect(userRepository.delete).toHaveBeenCalledWith(user, { transaction });
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'USER_DELETED', entityUuid: user.uuid }),
      { transaction },
    );
  });

  it('restores a deleted user without changing their account properties', async () => {
    const deletedUser = {
      ...user,
      isActive: false,
      emailVerifiedAt: null,
      deletedAt: new Date('2026-08-23T08:00:00.000Z'),
      roles: [{ uuid: 'role-1', name: 'USER' }],
    };
    const { service, userRepository, auditService } = createService();
    userRepository.findByUuid.mockResolvedValue(deletedUser);
    userRepository.restore.mockImplementation(async (restoredUser) => {
      restoredUser.deletedAt = null;
      return restoredUser;
    });

    await expect(service.restore(deletedUser.uuid, 2)).resolves.toBe(deletedUser);

    expect(userRepository.findByUuid).toHaveBeenCalledWith(deletedUser.uuid, {
      withDeleted: true,
      transaction,
    });
    expect(userRepository.restore).toHaveBeenCalledWith(deletedUser, { transaction });
    expect(userRepository.update).not.toHaveBeenCalled();
    expect(userRepository.setRoles).not.toHaveBeenCalled();
    expect(userRepository.incrementAuthorizationVersion).toHaveBeenCalledWith(deletedUser.id, {
      transaction,
    });
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'USER_RESTORED',
        entityUuid: deletedUser.uuid,
        oldValues: expect.objectContaining({
          isActive: false,
          emailVerifiedAt: null,
          deletedAt: expect.any(Date),
        }),
        newValues: expect.objectContaining({
          isActive: false,
          emailVerifiedAt: null,
          deletedAt: null,
        }),
      }),
      { transaction },
    );
  });

  it('rejects restoration when the user is not deleted', async () => {
    const { service, userRepository } = createService();
    userRepository.findByUuid.mockResolvedValue(user);

    await expect(service.restore(user.uuid, 2)).rejects.toMatchObject({ statusCode: 409 });

    expect(userRepository.restore).not.toHaveBeenCalled();
    expect(userRepository.incrementAuthorizationVersion).not.toHaveBeenCalled();
  });

  it('returns not found when the account to restore does not exist', async () => {
    const { service, userRepository } = createService();
    userRepository.findByUuid.mockResolvedValue(null);

    await expect(service.restore(user.uuid, 2)).rejects.toMatchObject({ statusCode: 404 });

    expect(userRepository.restore).not.toHaveBeenCalled();
  });

  it('exposes only the public company logo status in user payloads', () => {
    const { service } = createService();

    const publicUser = service.publicUser({
      ...user,
      companies: [
        {
          id: 3,
          uuid: 'company-uuid',
          name: 'Jardin Alpha',
          active: true,
          logoFileName: 'private-name.png',
          logoOriginalName: 'logo.png',
          logoMimeType: 'image/png',
        },
      ],
    });

    expect(publicUser.companies).toEqual([
      {
        uuid: 'company-uuid',
        name: 'Jardin Alpha',
        active: true,
        hasLogo: true,
      },
    ]);
  });
});
