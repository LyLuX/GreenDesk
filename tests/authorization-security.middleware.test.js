import { jest } from '@jest/globals';
import express from 'express';
import request from 'supertest';

const recordDenial = jest.fn();
jest.unstable_mockModule('../src/core/logger/authorization-denial.logger.js', () => ({
  default: recordDenial,
}));
const { authorize, authorizeAll, authorizeBodyFields } =
  await import('../src/core/middlewares/authorization.middleware.js');

beforeEach(() => recordDenial.mockReset());

test.each([
  [() => authorize('read', 'write'), 'any', ['read', 'write']],
  [() => authorizeAll('read', 'write'), 'all', ['read', 'write']],
  [() => authorizeBodyFields('write', { active: 'status' }), 'all', ['write', 'status']],
])('records the denied policy without changing the 403 response', (build, mode, permissions) => {
  const req = { user: { permissions: ['read'] }, body: { name: 'A', active: false } };
  if (mode === 'any') req.user.permissions = [];
  const next = jest.fn();
  build()(req, {}, next);
  expect(recordDenial).toHaveBeenCalledTimes(1);
  expect(recordDenial).toHaveBeenCalledWith(req, { mode, permissions });
  expect(next).toHaveBeenCalledTimes(1);
  expect(next).toHaveBeenCalledWith(
    expect.objectContaining({ statusCode: 403, message: 'Insufficient permissions' }),
  );
});

test('does not record authorized requests', () => {
  const req = { user: { permissions: ['read', 'write', 'status'] }, body: { active: true } };
  const next = jest.fn();
  authorize('read', 'other')(req, {}, next);
  authorizeAll('read', 'write')(req, {}, next);
  authorizeBodyFields('write', { active: 'status' })(req, {}, next);
  expect(recordDenial).not.toHaveBeenCalled();
  expect(next.mock.calls).toEqual([[], [], []]);
});

test('keeps rejecting when the logger throws', () => {
  recordDenial.mockImplementation(() => {
    throw new Error('Logger unavailable');
  });
  const next = jest.fn();
  authorize('write')({ user: { permissions: [] } }, {}, next);
  expect(next).toHaveBeenCalledTimes(1);
  expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
});

test('receives the registered Express template and leaves the HTTP contract intact', async () => {
  const app = express();
  const router = express.Router();
  router.post('/:uuid/execute', authorize('maintenance.execute'), (_req, res) =>
    res.sendStatus(204),
  );
  app.use('/api/v1/maintenance', router);
  app.use((error, _req, res, _next) =>
    res.status(error.statusCode).json({
      success: false,
      error: { message: error.message },
    }),
  );
  let route;
  recordDenial.mockImplementation((req) => {
    route = `${req.baseUrl}${req.route.path}`;
  });
  const response = await request(app).post('/api/v1/maintenance/resource-id/execute?secret=hidden');
  expect(response.status).toBe(403);
  expect(response.body).toEqual({ success: false, error: { message: 'Insufficient permissions' } });
  expect(route).toBe('/api/v1/maintenance/:uuid/execute');
});
