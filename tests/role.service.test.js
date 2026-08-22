import { jest } from '@jest/globals';

import RoleService from '../src/modules/roles/service/role.service.js';

const roleUuid = 'c8e14800-3be4-4fab-b774-0e6235fce203';
const permissionUuid = 'd0fd8cdc-74d0-4f58-af27-6c181e05895d';
const transaction = { id: 'transaction' };
const withTransaction = jest.fn((callback) => callback(transaction));
const auditService = { record: jest.fn() };

describe('RoleService', () => {
  it('assigns resolved permissions when creating a role', async () => {
    const role = { uuid: roleUuid, name: 'SUPERVISOR' };
    const permission = { uuid: permissionUuid, name: 'materials.read' };
    const roleRepository = {
      findByName: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(role),
      setPermissions: jest.fn(),
      findByUuid: jest.fn().mockResolvedValue(role),
      withTransaction,
    };
    const permissionRepository = { findByUuid: jest.fn().mockResolvedValue(permission) };
    const service = new RoleService(
      roleRepository,
      permissionRepository,
      { incrementAuthorizationVersionsForRole: jest.fn() },
      auditService,
    );

    await service.create({ name: 'SUPERVISOR', permissionUuids: [permissionUuid] });

    expect(roleRepository.setPermissions).toHaveBeenCalledWith(role, [permission], { transaction });
  });

  it('restores a soft-deleted role instead of creating a duplicate', async () => {
    const role = { id: 7, uuid: roleUuid, name: 'SUPERVISOR', deletedAt: new Date() };
    const roleRepository = {
      findByName: jest.fn().mockResolvedValue(role),
      restore: jest.fn(),
      update: jest.fn(),
      setPermissions: jest.fn(),
      findByUuid: jest.fn().mockResolvedValue(role),
      withTransaction,
    };
    const userRepository = { incrementAuthorizationVersionsForRole: jest.fn() };
    const service = new RoleService(
      roleRepository,
      { findByUuid: jest.fn() },
      userRepository,
      auditService,
    );

    await service.create({ name: 'SUPERVISOR' }, 42);

    expect(roleRepository.restore).toHaveBeenCalledWith(role, { transaction });
    expect(roleRepository.update).toHaveBeenCalledWith(
      role,
      { name: 'SUPERVISOR' },
      { transaction },
    );
    expect(userRepository.incrementAuthorizationVersionsForRole).toHaveBeenCalledWith(7, {
      excludeUserId: 42,
      transaction,
    });
  });

  it('invalidates affected users except the administrator when permissions change', async () => {
    const oldPermission = { uuid: permissionUuid, name: 'materials.read' };
    const newPermission = {
      uuid: '9b1245ac-5d5a-4933-99b8-b86c4a026de4',
      name: 'materials.update',
    };
    const role = { id: 7, uuid: roleUuid, permissions: [oldPermission] };
    const roleRepository = {
      findByUuid: jest.fn().mockResolvedValue(role),
      update: jest.fn(),
      setPermissions: jest.fn(),
      withTransaction,
    };
    const permissionRepository = { findByUuid: jest.fn().mockResolvedValue(newPermission) };
    const userRepository = { incrementAuthorizationVersionsForRole: jest.fn() };
    const service = new RoleService(
      roleRepository,
      permissionRepository,
      userRepository,
      auditService,
    );

    await service.update(roleUuid, { permissionUuids: [newPermission.uuid] }, 42);

    expect(userRepository.incrementAuthorizationVersionsForRole).toHaveBeenCalledWith(7, {
      excludeUserId: 42,
      transaction,
    });
  });

  it('does not invalidate sessions when the permission assignment is unchanged', async () => {
    const permission = { uuid: permissionUuid, name: 'materials.read' };
    const role = { id: 7, uuid: roleUuid, permissions: [permission] };
    const roleRepository = {
      findByUuid: jest.fn().mockResolvedValue(role),
      update: jest.fn(),
      setPermissions: jest.fn(),
      withTransaction,
    };
    const userRepository = { incrementAuthorizationVersionsForRole: jest.fn() };
    const service = new RoleService(
      roleRepository,
      { findByUuid: jest.fn().mockResolvedValue(permission) },
      userRepository,
      auditService,
    );

    await service.update(roleUuid, { permissionUuids: [permissionUuid] }, 42);

    expect(userRepository.incrementAuthorizationVersionsForRole).not.toHaveBeenCalled();
  });
});
