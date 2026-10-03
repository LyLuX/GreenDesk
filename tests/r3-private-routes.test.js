import { jest } from '@jest/globals';
import request from 'supertest';

import app from '../src/app.js';
import logger from '../src/core/logger/logger.js';
import { routeRegistry } from '../src/routes/route-registry.js';
import User from '../src/modules/users/model/user.model.js';

const uuid = 'f75ce638-18d2-4e29-9958-2afaa4ae5151';
const privateOperations = routeRegistry
  .filter(({ mountPath }) => !['/health', '/api/v1', '/api/v1/auth'].includes(mountPath))
  .flatMap(({ mountPath, router }) =>
    router.stack
      .filter(({ route }) => route)
      .flatMap(({ route }) =>
        Object.keys(route.methods).map((method) => [
          method,
          `${mountPath}${route.path === '/' ? '' : route.path}`.replace(/:[A-Za-z0-9_]+/g, uuid),
        ]),
      ),
  )
  .concat([
    ['post', '/api/v1/auth/refresh'],
    ['post', '/api/v1/auth/logout'],
  ]);

const wasSilent = logger.silent;
beforeAll(() => {
  logger.silent = true;
});
afterAll(() => {
  logger.silent = wasSilent;
  jest.restoreAllMocks();
});

test.each(privateOperations)(
  'refuses anonymous %s %s including compatibility aliases',
  async (method, path) => {
    const identityLookup = jest.spyOn(User, 'findOne');
    await request(app)[method](path).expect(401);
    expect(identityLookup).not.toHaveBeenCalled();
  },
);
