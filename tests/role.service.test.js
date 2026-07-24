import { jest } from '@jest/globals';

import RoleService from '../src/modules/roles/service/role.service.js';

const roleUuid = 'c8e14800-3be4-4fab-b774-0e6235fce203';
const permissionUuid = 'd0fd8cdc-74d0-4f58-af27-6c181e05895d';

describe('RoleService', () => {
  it('assigns resolved permissions when creating a role', async () => {
    const role = { uuid: roleUuid, name: 'SUPERVISOR' };
    const permission = { uuid: permissionUuid, name: 'materials.read' };
    const roleRepository = {
      findByName: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(role),
      setPermissions: jest.fn(),
      findByUuid: jest.fn().mockResolvedValue(role),
    };
    const permissionRepository = { findByUuid: jest.fn().mockResolvedValue(permission) };
    const service = new RoleService(roleRepository, permissionRepository);

    await service.create({ name: 'SUPERVISOR', permissionUuids: [permissionUuid] });

    expect(roleRepository.setPermissions).toHaveBeenCalledWith(role, [permission]);
  });

  it('restores a soft-deleted role instead of creating a duplicate', async () => {
    const role = { uuid: roleUuid, name: 'SUPERVISOR', deletedAt: new Date() };
    const roleRepository = {
      findByName: jest.fn().mockResolvedValue(role),
      restore: jest.fn(),
      update: jest.fn(),
      setPermissions: jest.fn(),
      findByUuid: jest.fn().mockResolvedValue(role),
    };
    const service = new RoleService(roleRepository, { findByUuid: jest.fn() });

    await service.create({ name: 'SUPERVISOR' });

    expect(roleRepository.restore).toHaveBeenCalledWith(role);
    expect(roleRepository.update).toHaveBeenCalledWith(role, { name: 'SUPERVISOR' });
  });
});
