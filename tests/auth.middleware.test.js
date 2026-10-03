import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';

import env from '../src/config/env.js';
import { createAuthenticate } from '../src/core/middlewares/auth.middleware.js';

const tokenFor = (claims = {}) =>
  jwt.sign(
    {
      sub: 'f75ce638-18d2-4e29-9958-2afaa4ae5151',
      userId: 1,
      roles: [],
      permissions: [],
      authorizationVersion: 0,
      ...claims,
    },
    env.jwt.secret,
    { jwtid: 'test-token', expiresIn: '5m' },
  );

describe('authentication middleware', () => {
  it('accepts an active, non-revoked user', async () => {
    const repository = {
      isAccessTokenRevoked: jest.fn().mockResolvedValue(false),
      isActiveUser: jest.fn().mockResolvedValue(true),
    };
    const authenticate = createAuthenticate(repository);
    const request = { headers: { authorization: `Bearer ${tokenFor()}` } };
    const next = jest.fn();

    await authenticate(request, {}, next);

    expect(next).toHaveBeenCalledWith();
    expect(request.user).toMatchObject({
      sub: 'f75ce638-18d2-4e29-9958-2afaa4ae5151',
      userId: 1,
    });
    expect(repository.isActiveUser).toHaveBeenCalledWith(
      1,
      'f75ce638-18d2-4e29-9958-2afaa4ae5151',
      0,
    );
  });

  it.each(['1', '9007199254740993', '18446744073709551615'])(
    'preserves MySQL BIGINT claim %s without rounding',
    async (userId) => {
      const repository = {
        isAccessTokenRevoked: jest.fn().mockResolvedValue(false),
        isActiveUser: jest.fn().mockResolvedValue(true),
      };
      const request = { headers: { authorization: `Bearer ${tokenFor({ userId })}` } };
      const next = jest.fn();
      await createAuthenticate(repository)(request, {}, next);
      expect(next).toHaveBeenCalledWith();
      expect(request.user.userId).toBe(userId);
      expect(repository.isActiveUser).toHaveBeenCalledWith(userId, expect.any(String), 0);
    },
  );

  it.each(['sub', 'userId', 'jti', 'exp', 'authorizationVersion', 'permissions'])(
    'rejects a signed token missing %s before any database lookup',
    async (field) => {
      const claims = jwt.decode(tokenFor());
      delete claims[field];
      const repository = {
        isAccessTokenRevoked: jest.fn().mockResolvedValue(false),
        isActiveUser: jest.fn().mockResolvedValue(true),
      };
      const request = { headers: { authorization: `Bearer ${jwt.sign(claims, env.jwt.secret)}` } };
      const next = jest.fn();
      await createAuthenticate(repository)(request, {}, next);
      expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
      expect(request.user).toBeUndefined();
      expect(repository.isAccessTokenRevoked).not.toHaveBeenCalled();
      expect(repository.isActiveUser).not.toHaveBeenCalled();
    },
  );

  it.each([
    { userId: 0 },
    { userId: -1 },
    { userId: '01' },
    { userId: '0' },
    { userId: '18446744073709551616' },
    { userId: '999999999999999999999' },
    { sub: '' },
    { jti: '' },
    { authorizationVersion: -1 },
    { authorizationVersion: '0' },
    { authorizationVersion: 0.5 },
    { permissions: 'users.update' },
    { permissions: [null] },
  ])('rejects malformed signed security claims %j', async (invalid) => {
    const claims = { ...jwt.decode(tokenFor()), ...invalid };
    const repository = {
      isAccessTokenRevoked: jest.fn().mockResolvedValue(false),
      isActiveUser: jest.fn().mockResolvedValue(true),
    };
    const next = jest.fn();
    await createAuthenticate(repository)(
      { headers: { authorization: `Bearer ${jwt.sign(claims, env.jwt.secret)}` } },
      {},
      next,
    );
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
    expect(repository.isActiveUser).not.toHaveBeenCalled();
  });

  it.each([
    undefined,
    '',
    'Basic token',
    'Bearer invalid',
    `Bearer ${jwt.sign({ sub: 'user' }, 'different-test-secret')}`,
    `Bearer ${jwt.sign({ sub: 'user' }, env.jwt.secret, { expiresIn: -1 })}`,
    `Bearer ${jwt.sign({ sub: 'user' }, env.jwt.secret, { notBefore: '1h' })}`,
  ])('rejects absent, invalid, expired or premature credentials (%s)', async (authorization) => {
    const repository = { isAccessTokenRevoked: jest.fn(), isActiveUser: jest.fn() };
    const next = jest.fn();
    await createAuthenticate(repository)({ headers: { authorization } }, {}, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
    expect(repository.isAccessTokenRevoked).not.toHaveBeenCalled();
  });

  it('rejects a revoked token before checking the user', async () => {
    const repository = {
      isAccessTokenRevoked: jest.fn().mockResolvedValue(true),
      isActiveUser: jest.fn(),
    };
    const next = jest.fn();
    await createAuthenticate(repository)(
      { headers: { authorization: `Bearer ${tokenFor()}` } },
      {},
      next,
    );
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
    expect(repository.isActiveUser).not.toHaveBeenCalled();
  });

  it('immediately rejects a token belonging to an inactive or deleted user', async () => {
    const repository = {
      isAccessTokenRevoked: jest.fn().mockResolvedValue(false),
      isActiveUser: jest.fn().mockResolvedValue(false),
    };
    const authenticate = createAuthenticate(repository);
    const next = jest.fn();

    await authenticate({ headers: { authorization: `Bearer ${tokenFor()}` } }, {}, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 401, message: 'Invalid or expired access token' }),
    );
  });

  it('immediately rejects a token carrying an obsolete authorization version', async () => {
    const repository = {
      isAccessTokenRevoked: jest.fn().mockResolvedValue(false),
      isActiveUser: jest.fn().mockResolvedValue(false),
    };
    const authenticate = createAuthenticate(repository);
    const next = jest.fn();

    await authenticate(
      { headers: { authorization: `Bearer ${tokenFor({ authorizationVersion: 3 })}` } },
      {},
      next,
    );

    expect(repository.isActiveUser).toHaveBeenCalledWith(
      1,
      'f75ce638-18d2-4e29-9958-2afaa4ae5151',
      3,
    );
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });
});
