import { jest } from '@jest/globals';

import { authorizeBodyFields } from '../src/core/middlewares/authorization.middleware.js';

describe('body-field authorization middleware', () => {
  it('requires every permission mapped to the submitted fields', () => {
    const middleware = authorizeBodyFields('resource.update', {
      active: 'resource.status.update',
    });
    const next = jest.fn();

    middleware(
      {
        body: { name: 'Nouveau nom', active: false },
        user: { roles: [], permissions: ['resource.update'] },
      },
      {},
      next,
    );

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 403, message: 'Insufficient permissions' }),
    );
  });

  it('allows a request carrying every field permission', () => {
    const middleware = authorizeBodyFields('resource.update', {
      active: 'resource.status.update',
    });
    const next = jest.fn();

    middleware(
      {
        body: { name: 'Nouveau nom', active: false },
        user: {
          roles: [],
          permissions: ['resource.update', 'resource.status.update'],
        },
      },
      {},
      next,
    );

    expect(next).toHaveBeenCalledWith();
  });
});
