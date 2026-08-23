import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { jest } from '@jest/globals';

import AuthService from '../src/modules/auth/service/auth.service.js';

const uuid = 'a5eaf09e-49b1-4fa3-a022-1a20854b06bd';
const transaction = { id: 'transaction' };
const transactional = (repository) => ({
  ...repository,
  withTransaction: jest.fn((callback) => callback(transaction)),
});
const makeUser = async () => ({
  id: 1,
  uuid,
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@greendesk.local',
  isActive: true,
  emailVerifiedAt: new Date('2026-08-23T08:00:00.000Z'),
  passwordHash: await bcrypt.hash('SecurePass123!', 4),
  authorizationVersion: 3,
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
    const registeredUser = { id: 1, uuid, emailVerifiedAt: null };
    const userService = {
      create: jest.fn().mockResolvedValue(registeredUser),
      publicUser: jest.fn((user) => user),
    };
    const emailVerificationService = { issue: jest.fn() };
    const service = new AuthService(
      {},
      userService,
      { record: jest.fn() },
      emailVerificationService,
    );
    await service.register({ email: 'ada@greendesk.local', password: 'SecurePass123!' });
    expect(userService.create).toHaveBeenCalledWith(expect.any(Object), null, 'USER', {
      requireEmailVerification: true,
    });
    expect(emailVerificationService.issue).toHaveBeenCalledWith(registeredUser, {
      suppressDeliveryErrors: true,
    });
  });

  it('returns an access token for valid credentials', async () => {
    const user = await makeUser();
    const authRepository = transactional({
      findByEmailWithPassword: jest.fn().mockResolvedValue(user),
      update: jest.fn(),
    });
    const service = new AuthService(
      authRepository,
      { publicUser: (value) => value.toJSON() },
      { record: jest.fn() },
    );
    const result = await service.login(user.email, 'SecurePass123!');
    expect(result.accessToken).toEqual(expect.any(String));
    expect(jwt.decode(result.accessToken).jti).toEqual(expect.any(String));
    expect(jwt.decode(result.accessToken).authorizationVersion).toBe(3);
    expect(result.user).toMatchObject({ uuid, roles: ['USER'] });
    expect(authRepository.update).toHaveBeenCalledWith(
      user,
      expect.objectContaining({ lastLoginAt: expect.any(Date) }),
      { transaction },
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

  it('rejects a correct password until the email address is verified', async () => {
    const user = { ...(await makeUser()), emailVerifiedAt: null };
    const service = new AuthService(
      { findByEmailWithPassword: jest.fn().mockResolvedValue(user) },
      {},
      { record: jest.fn() },
    );
    await expect(service.login(user.email, 'SecurePass123!')).rejects.toMatchObject({
      statusCode: 403,
      message: 'Email verification required',
    });
  });

  it('renews an active session and revokes the previous token', async () => {
    const user = await makeUser();
    const authRepository = transactional({ revokeAccessToken: jest.fn() });
    const service = new AuthService(
      authRepository,
      {
        getByUuid: jest.fn().mockResolvedValue(user),
        publicUser: (value) => value.toJSON(),
      },
      { record: jest.fn() },
    );
    const expiresAt = 1_800_000_000;

    const result = await service.refresh({
      jti: uuid,
      exp: expiresAt,
      sub: user.uuid,
      userId: user.id,
    });

    expect(authRepository.revokeAccessToken).toHaveBeenCalledWith(
      uuid,
      new Date(expiresAt * 1000),
      { transaction },
    );
    expect(jwt.decode(result.accessToken).jti).not.toBe(uuid);
    expect(result.user).toMatchObject({ uuid, roles: ['USER'] });
  });

  it('revokes the current token on logout', async () => {
    const authRepository = transactional({ revokeAccessToken: jest.fn() });
    const auditService = { record: jest.fn() };
    const service = new AuthService(authRepository, {}, auditService);
    const expiresAt = 1_800_000_000;

    await service.logout({ jti: uuid, exp: expiresAt, userId: 1, sub: uuid });

    expect(authRepository.revokeAccessToken).toHaveBeenCalledWith(
      uuid,
      new Date(expiresAt * 1000),
      { transaction },
    );
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'LOGOUT_SUCCESS', userId: 1 }),
      { transaction },
    );
  });
});
