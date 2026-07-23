import { jest } from '@jest/globals';

import UserService from '../src/modules/users/service/user.service.js';

const user = {
  id: 1,
  uuid: 'a5eaf09e-49b1-4fa3-a022-1a20854b06bd',
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@greendesk.local',
  toJSON() {
    return { ...this, passwordHash: 'hidden' };
  },
};

describe('UserService', () => {
  const createService = () => {
    const userRepository = {
      findByEmail: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(user),
      findByUuid: jest.fn().mockResolvedValue(user),
      setRoles: jest.fn(),
      findAll: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    const roleRepository = { findByName: jest.fn().mockResolvedValue({ id: 3, name: 'USER' }) };
    const auditService = { record: jest.fn() };
    return {
      service: new UserService(userRepository, roleRepository, auditService),
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
    );
    expect(userRepository.create.mock.calls[0][0].passwordHash).not.toBe('SecurePass123!');
    expect(result.passwordHash).toBeUndefined();
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'USER_CREATED' }),
    );
  });

  it('retrieves a user by UUID', async () => {
    const { service } = createService();
    await expect(service.getByUuid(user.uuid)).resolves.toBe(user);
  });
});
