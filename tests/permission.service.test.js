import { jest } from '@jest/globals';

import PermissionService from '../src/modules/permissions/service/permission.service.js';

describe('PermissionService audit', () => {
  it('records permission updates in the same transaction', async () => {
    const transaction = { id: 'transaction' };
    const permission = {
      uuid: 'd0fd8cdc-74d0-4f58-af27-6c181e05895d',
      name: 'history.fleet.read',
      description: 'Avant',
      toJSON() {
        return { uuid: this.uuid, name: this.name, description: this.description };
      },
    };
    const repository = {
      findByUuid: jest.fn().mockResolvedValue(permission),
      update: jest.fn(async (item, values) => Object.assign(item, values)),
      withTransaction: jest.fn((callback) => callback(transaction)),
    };
    const auditService = { record: jest.fn() };
    const userRepository = { incrementAuthorizationVersionsForPermission: jest.fn() };
    const service = new PermissionService(repository, auditService, userRepository);

    await service.update(permission.uuid, { description: 'Après' }, 42);

    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 42,
        action: 'UPDATE',
        entity: 'PERMISSION',
        oldValues: expect.objectContaining({ description: 'Avant' }),
        newValues: expect.objectContaining({ description: 'Après' }),
      }),
      { transaction },
    );
    expect(userRepository.incrementAuthorizationVersionsForPermission).not.toHaveBeenCalled();
  });

  it('invalidates every affected session when a permission is renamed', async () => {
    const transaction = { id: 'transaction' };
    const permission = {
      id: 11,
      uuid: 'd0fd8cdc-74d0-4f58-af27-6c181e05895d',
      name: 'materials.read',
      toJSON() {
        return { id: this.id, uuid: this.uuid, name: this.name };
      },
    };
    const repository = {
      findByUuid: jest.fn().mockResolvedValue(permission),
      update: jest.fn(async (item, values) => Object.assign(item, values)),
      withTransaction: jest.fn((callback) => callback(transaction)),
    };
    const userRepository = { incrementAuthorizationVersionsForPermission: jest.fn() };
    const service = new PermissionService(repository, { record: jest.fn() }, userRepository);

    await service.update(permission.uuid, { name: 'materials.catalog.read' }, 42);

    expect(userRepository.incrementAuthorizationVersionsForPermission).toHaveBeenCalledWith(11, {
      transaction,
    });
  });

  it('invalidates affected sessions in the same transaction before deleting a permission', async () => {
    const transaction = { id: 'transaction' };
    const permission = {
      id: 11,
      uuid: 'd0fd8cdc-74d0-4f58-af27-6c181e05895d',
      name: 'materials.read',
    };
    const repository = {
      findByUuid: jest.fn().mockResolvedValue(permission),
      delete: jest.fn(),
      withTransaction: jest.fn((callback) => callback(transaction)),
    };
    const userRepository = { incrementAuthorizationVersionsForPermission: jest.fn() };
    const service = new PermissionService(repository, { record: jest.fn() }, userRepository);

    await service.remove(permission.uuid, 42);

    expect(userRepository.incrementAuthorizationVersionsForPermission).toHaveBeenCalledWith(11, {
      transaction,
    });
    expect(repository.delete).toHaveBeenCalledWith(permission, { transaction });
  });

  it('invalidates retained role grants when restoring a deleted permission', async () => {
    const transaction = { id: 'transaction' };
    const permission = {
      id: 11,
      uuid: 'd0fd8cdc-74d0-4f58-af27-6c181e05895d',
      name: 'materials.read',
      deletedAt: new Date(),
      toJSON() {
        return { id: this.id, uuid: this.uuid, name: this.name, deletedAt: this.deletedAt };
      },
    };
    const repository = {
      findByName: jest.fn().mockResolvedValue(permission),
      restore: jest.fn(async () => {
        permission.deletedAt = null;
      }),
      update: jest.fn().mockResolvedValue(permission),
      withTransaction: jest.fn((callback) => callback(transaction)),
    };
    const userRepository = { incrementAuthorizationVersionsForPermission: jest.fn() };
    const service = new PermissionService(repository, { record: jest.fn() }, userRepository);

    await service.create({ name: 'materials.read', description: 'Consulter les matériels.' }, 42);

    expect(userRepository.incrementAuthorizationVersionsForPermission).toHaveBeenCalledWith(11, {
      transaction,
    });
  });

  it('rejects manual creation in the role visibility namespace', async () => {
    const repository = { withTransaction: jest.fn() };
    const service = new PermissionService(repository, { record: jest.fn() });

    await expect(
      service.create({ name: 'users.roles.TECHNICIEN.read', description: 'Interdite' }),
    ).rejects.toMatchObject({ statusCode: 400 });
    expect(repository.withTransaction).not.toHaveBeenCalled();
  });

  it('rejects renaming an ordinary permission into the role visibility namespace', async () => {
    const permission = {
      uuid: 'd0fd8cdc-74d0-4f58-af27-6c181e05895d',
      name: 'materials.read',
    };
    const repository = {
      findByUuid: jest.fn().mockResolvedValue(permission),
      withTransaction: jest.fn(),
    };
    const service = new PermissionService(repository, { record: jest.fn() });

    await expect(
      service.update(permission.uuid, { name: 'users.roles.TECHNICIEN.read' }),
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(repository.withTransaction).not.toHaveBeenCalled();
  });

  it.each(['update', 'remove'])(
    'rejects direct %s of an automatically managed role permission',
    async (operation) => {
      const permission = {
        uuid: 'd0fd8cdc-74d0-4f58-af27-6c181e05895d',
        name: 'users.roles.TECHNICIEN.read',
      };
      const repository = {
        findByUuid: jest.fn().mockResolvedValue(permission),
        withTransaction: jest.fn(),
      };
      const service = new PermissionService(repository, { record: jest.fn() });

      const promise =
        operation === 'update'
          ? service.update(permission.uuid, { description: 'Modifiée' })
          : service.remove(permission.uuid);

      await expect(promise).rejects.toMatchObject({ statusCode: 409 });
      expect(repository.withTransaction).not.toHaveBeenCalled();
    },
  );
});
