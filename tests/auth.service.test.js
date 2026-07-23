import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { jest } from '@jest/globals';

import AuthService from '../src/modules/auth/service/auth.service.js';

const uuid = 'a5eaf09e-49b1-4fa3-a022-1a20854b06bd';
const makeUser = async () => ({
  id: 1,
  uuid,
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@greendesk.local',
  isActive: true,
  passwordHash: await bcrypt.hash('SecurePass123!', 4),
  roles: [{ name: 'USER' }],
  toJSON() {
    return {
      id: this.id,
      uuid: this.uuid,
      firstName: this.firstName,
      lastName: this.lastName,
      email: this.email,
      passwordHash: this.passwordHash,
      roles: this.roles,
    };
  },
});

describe('AuthService', () => {
  it('registers a user with the USER default role', async () => {
    const userService = { create: jest.fn().mockResolvedValue({ uuid }) };
    const service = new AuthService({}, userService, { record: jest.fn() });
    await service.register({ email: 'ada@greendesk.local', password: 'SecurePass123!' });
    expect(userService.create).toHaveBeenCalledWith(expect.any(Object), null, 'USER');
  });

  it('returns an access token for valid credentials', async () => {
    const user = await makeUser();
    const authRepository = {
      findByEmailWithPassword: jest.fn().mockResolvedValue(user),
      update: jest.fn(),
    };
    const service = new AuthService(
      authRepository,
      { publicUser: (value) => value.toJSON() },
      { record: jest.fn() },
    );
    const result = await service.login(user.email, 'SecurePass123!');
    expect(result.accessToken).toEqual(expect.any(String));
    expect(jwt.decode(result.accessToken).jti).toEqual(expect.any(String));
    expect(result.user).toMatchObject({ uuid, roles: ['USER'] });
    expect(authRepository.update).toHaveBeenCalledWith(
      user,
      expect.objectContaining({ lastLoginAt: expect.any(Date) }),
    );
  });

  it('rejects invalid credentials', async () => {
    const service = new AuthService(
      { findByEmailWithPassword: jest.fn().mockResolvedValue(null) },
      {},
      { record: jest.fn() },
    );
    await expect(service.login('ada@greendesk.local', 'wrong')).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  it('revokes the current token on logout', async () => {
    const authRepository = { revokeAccessToken: jest.fn() };
    const auditService = { record: jest.fn() };
    const service = new AuthService(authRepository, {}, auditService);
    const expiresAt = 1_800_000_000;

    await service.logout({ jti: uuid, exp: expiresAt, userId: 1, sub: uuid });

    expect(authRepository.revokeAccessToken).toHaveBeenCalledWith(uuid, new Date(expiresAt * 1000));
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'LOGOUT_SUCCESS', userId: 1 }),
    );
  });
});
