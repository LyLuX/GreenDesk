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
    const visibilityPermission = {
      uuid: 'cb5dd38a-95ea-443f-a739-273191547629',
      name: 'users.roles.SUPERVISOR.read',
      description: 'Consulter les utilisateurs rattachés au rôle « SUPERVISOR ».',
    };
    const roleRepository = {
      findByName: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(role),
      setPermissions: jest.fn(),
      findByUuid: jest.fn().mockResolvedValue(role),
      withTransaction,
    };
    const permissionRepository = {
      findByUuid: jest.fn().mockResolvedValue(permission),
      findByName: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(visibilityPermission),
    };
    const service = new RoleService(
      roleRepository,
      permissionRepository,
      { incrementAuthorizationVersionsForRole: jest.fn() },
      auditService,
    );

    await service.create({ name: 'SUPERVISOR', permissionUuids: [permissionUuid] });

    expect(permissionRepository.create).toHaveBeenCalledWith(
      {
        name: 'users.roles.SUPERVISOR.read',
        description: 'Consulter les utilisateurs rattachés au rôle « SUPERVISOR ».',
      },
      { transaction },
    );
    expect(roleRepository.setPermissions).toHaveBeenCalledWith(
      role,
      [permission, visibilityPermission],
      { transaction },
    );
  });

  it('restores a soft-deleted role instead of creating a duplicate', async () => {
    const role = { id: 7, uuid: roleUuid, name: 'SUPERVISOR', deletedAt: new Date() };
    const visibilityPermission = {
      id: 8,
      name: 'users.roles.SUPERVISOR.read',
      deletedAt: new Date(),
    };
    const roleRepository = {
      findByName: jest.fn().mockResolvedValue(role),
      restore: jest.fn(),
      update: jest.fn(),
      setPermissions: jest.fn(),
      addPermission: jest.fn(),
      findByUuid: jest.fn().mockResolvedValue(role),
      withTransaction,
    };
    const userRepository = { incrementAuthorizationVersionsForRole: jest.fn() };
    const service = new RoleService(
      roleRepository,
      {
        findByUuid: jest.fn(),
        findByName: jest.fn().mockResolvedValue(visibilityPermission),
        restore: jest.fn(),
        update: jest.fn(),
      },
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
    expect(roleRepository.addPermission).toHaveBeenCalledWith(role, visibilityPermission, {
      transaction,
    });
    expect(userRepository.incrementAuthorizationVersionsForRole).toHaveBeenCalledWith(7, {
      transaction,
    });
  });

  it('invalidates every affected user including the administrator when permissions change', async () => {
    const oldPermission = { uuid: permissionUuid, name: 'materials.read' };
    const newPermission = {
      uuid: '9b1245ac-5d5a-4933-99b8-b86c4a026de4',
      name: 'materials.update',
    };
    const visibilityPermission = {
      uuid: 'cb5dd38a-95ea-443f-a739-273191547629',
      name: 'users.roles.SUPERVISOR.read',
      description: 'Consulter les utilisateurs rattachés au rôle « SUPERVISOR ».',
    };
    const role = { id: 7, uuid: roleUuid, name: 'SUPERVISOR', permissions: [oldPermission] };
    const roleRepository = {
      findByUuid: jest.fn().mockResolvedValue(role),
      update: jest.fn(),
      setPermissions: jest.fn(),
      withTransaction,
    };
    const permissionRepository = {
      findByUuid: jest.fn().mockResolvedValue(newPermission),
      findByName: jest.fn().mockResolvedValue(visibilityPermission),
    };
    const userRepository = { incrementAuthorizationVersionsForRole: jest.fn() };
    const service = new RoleService(
      roleRepository,
      permissionRepository,
      userRepository,
      auditService,
    );

    await service.update(roleUuid, { permissionUuids: [newPermission.uuid] }, 42);

    expect(userRepository.incrementAuthorizationVersionsForRole).toHaveBeenCalledWith(7, {
      transaction,
    });
  });

  it('does not invalidate sessions when the permission assignment is unchanged', async () => {
    const permission = { uuid: permissionUuid, name: 'materials.read' };
    const visibilityPermission = {
      uuid: 'cb5dd38a-95ea-443f-a739-273191547629',
      name: 'users.roles.SUPERVISOR.read',
      description: 'Consulter les utilisateurs rattachés au rôle « SUPERVISOR ».',
    };
    const role = {
      id: 7,
      uuid: roleUuid,
      name: 'SUPERVISOR',
      permissions: [permission, visibilityPermission],
    };
    const roleRepository = {
      findByUuid: jest.fn().mockResolvedValue(role),
      update: jest.fn(),
      setPermissions: jest.fn(),
      withTransaction,
    };
    const userRepository = { incrementAuthorizationVersionsForRole: jest.fn() };
    const service = new RoleService(
      roleRepository,
      {
        findByUuid: jest.fn().mockResolvedValue(permission),
        findByName: jest.fn().mockResolvedValue(visibilityPermission),
      },
      userRepository,
      auditService,
    );

    await service.update(roleUuid, { permissionUuids: [permissionUuid] }, 42);

    expect(userRepository.incrementAuthorizationVersionsForRole).not.toHaveBeenCalled();
    expect(roleRepository.setPermissions).toHaveBeenCalledWith(
      role,
      [permission, visibilityPermission],
      { transaction },
    );
  });

  it('keeps the automatic readable permission when assignments are replaced', async () => {
    const visibilityPermission = {
      uuid: 'cb5dd38a-95ea-443f-a739-273191547629',
      name: 'users.roles.SUPERVISOR.read',
      description: 'Consulter les utilisateurs rattachés au rôle « SUPERVISOR ».',
    };
    const role = {
      id: 7,
      uuid: roleUuid,
      name: 'SUPERVISOR',
      permissions: [visibilityPermission],
    };
    const roleRepository = {
      findByUuid: jest.fn().mockResolvedValue(role),
      update: jest.fn(),
      setPermissions: jest.fn(),
      withTransaction,
    };
    const service = new RoleService(
      roleRepository,
      {
        findByName: jest.fn().mockResolvedValue(visibilityPermission),
      },
      { incrementAuthorizationVersionsForRole: jest.fn() },
      auditService,
    );

    await service.update(roleUuid, { permissionUuids: [] }, 42);

    expect(roleRepository.setPermissions).toHaveBeenCalledWith(role, [visibilityPermission], {
      transaction,
    });
  });

  it('rejects any attempt to rename an existing role', async () => {
    const role = { id: 7, uuid: roleUuid, name: 'SUPERVISOR', permissions: [] };
    const roleRepository = { findByUuid: jest.fn().mockResolvedValue(role) };
    const service = new RoleService(roleRepository, {}, {}, auditService);

    await expect(service.update(roleUuid, { name: 'RENAMED' }, 42)).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it('deletes the readable role permission and invalidates every role that received it', async () => {
    const role = { id: 7, uuid: roleUuid, name: 'SUPERVISOR', permissions: [] };
    const otherRole = { id: 9, uuid: '1174fa5d-9f07-45fa-b51f-94b5f72c9e7f' };
    const visibilityPermission = { id: 8, name: 'users.roles.SUPERVISOR.read' };
    const roleRepository = {
      findByUuid: jest.fn().mockResolvedValue(role),
      findByPermissionId: jest.fn().mockResolvedValue([role, otherRole]),
      delete: jest.fn(),
      withTransaction,
    };
    const permissionRepository = {
      findByName: jest.fn().mockResolvedValue(visibilityPermission),
      delete: jest.fn(),
    };
    const userRepository = { incrementAuthorizationVersionsForRole: jest.fn() };
    const service = new RoleService(
      roleRepository,
      permissionRepository,
      userRepository,
      auditService,
    );

    await service.remove(roleUuid, 42);

    expect(userRepository.incrementAuthorizationVersionsForRole).toHaveBeenCalledTimes(2);
    expect(userRepository.incrementAuthorizationVersionsForRole).toHaveBeenNthCalledWith(1, 7, {
      transaction,
    });
    expect(userRepository.incrementAuthorizationVersionsForRole).toHaveBeenNthCalledWith(2, 9, {
      transaction,
    });
    expect(permissionRepository.delete).toHaveBeenCalledWith(visibilityPermission, {
      transaction,
    });
    expect(roleRepository.delete).toHaveBeenCalledWith(role, { transaction });
  });
});
