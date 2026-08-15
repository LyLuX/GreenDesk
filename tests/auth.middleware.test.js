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
      ...claims,
    },
    env.jwt.secret,
    { jwtid: 'test-token' },
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
