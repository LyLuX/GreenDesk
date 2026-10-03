import { jest } from '@jest/globals';
import express from 'express';
import request from 'supertest';
import { body } from 'express-validator';
import logger from '../src/core/logger/logger.js';
import AppError from '../src/core/errors/app-error.js';
import { errorHandler, notFoundHandler } from '../src/core/middlewares/error-handler.js';
import { updateValidator as materialUpdateValidator } from '../src/modules/materials/validator/material.validator.js';
import { createValidator } from '../src/modules/maintenance/validator/maintenance.validator.js';
import { updateValidator as categoryUpdateValidator } from '../src/modules/categories/validator/category.validator.js';
import { updateRoleValidator as roleUpdateValidator } from '../src/modules/roles/validator/role.validator.js';
import { updatePermissionValidator as permissionUpdateValidator } from '../src/modules/permissions/validator/permission.validator.js';
import { updateValidator as maintenanceUpdateValidator } from '../src/modules/maintenance/validator/maintenance.validator.js';
import { validateRequest } from '../src/core/middlewares/validate-request.js';

const secret = 'R4_FAKE_SECRET';
describe('R4 confidential error boundaries', () => {
  let log;
  beforeEach(() => {
    log = jest.spyOn(logger, 'error').mockImplementation(() => {});
  });
  afterEach(() => jest.restoreAllMocks());
  it('normalizes native malformed JSON without logging its excerpt', async () => {
    const app = express();
    app.use(express.json());
    app.post('/', (_req, res) => res.json({}));
    app.use(errorHandler);
    const response = await request(app)
      .post('/')
      .set('Content-Type', 'application/json')
      .send(secret);
    expect(response.status).toBe(400);
    expect(JSON.stringify(response.body)).not.toContain(secret);
    expect(JSON.stringify(log.mock.calls)).not.toContain(secret);
  });
  it('removes field and whole-body values from validation details', async () => {
    const app = express();
    app.use(express.json());
    app.post(
      '/',
      body('password').isLength({ min: 100 }),
      body().custom(() => false),
      validateRequest,
      (_req, res) => res.json({}),
    );
    app.use(errorHandler);
    const response = await request(app).post('/').send({ password: secret, token: secret });
    expect(response.status).toBe(400);
    expect(JSON.stringify(response.body)).not.toContain(secret);
    expect(response.body.error.details).toEqual(
      expect.arrayContaining([expect.objectContaining({ path: 'password', location: 'body' })]),
    );
    expect(JSON.stringify(log.mock.calls)).not.toContain(secret);
  });
  it('does not return or log unexpected diagnostics and details', async () => {
    const app = express();
    app.get('/', (_req, _res, next) =>
      next(Object.assign(new Error(secret), { details: { token: secret }, sql: secret })),
    );
    app.use(errorHandler);
    const response = await request(app).get('/');
    expect(response.status).toBe(500);
    expect(JSON.stringify(response.body)).not.toContain(secret);
    expect(JSON.stringify(log.mock.calls)).not.toContain(secret);
  });
  it('does not reflect arbitrary object keys through wildcard validation paths', async () => {
    const app = express();
    app.use(express.json());
    app.post('/', createValidator, validateRequest, (_req, res) => res.json({}));
    app.use(errorHandler);
    const response = await request(app)
      .post('/')
      .send({
        materialUuid: 'f75ce638-18d2-4e29-9958-2afaa4ae5151',
        title: 'Control',
        maintenanceType: 'preventive',
        parts: { [secret]: { partUuid: 'invalid', quantity: -1 } },
      });
    expect(response.status).toBe(400);
    expect(JSON.stringify(response.body)).not.toContain(secret);
  });
  it.each([
    { purchasePrice: [1, 2] },
    { active: [true] },
    { manufacturerUuid: ['f75ce638-18d2-4e29-9958-2afaa4ae5151'] },
  ])('rejects array representations of scalar fields: %p', async (values) => {
    const app = express();
    app.use(express.json());
    app.put('/:uuid', materialUpdateValidator, validateRequest, (_req, res) => res.json({}));
    app.use(errorHandler);
    expect(
      (await request(app).put('/f75ce638-18d2-4e29-9958-2afaa4ae5151').send(values)).status,
    ).toBe(400);
  });
  it('keeps operational messages and Retry-After', async () => {
    const app = express();
    app.get('/', (_req, _res, next) =>
      next(new AppError('Réessayez plus tard.', 429, undefined, { retryAfterSeconds: 1.1 })),
    );
    app.use(errorHandler);
    const response = await request(app).get('/');
    expect(response.status).toBe(429);
    expect(response.headers['retry-after']).toBe('2');
    expect(response.body.error.message).toBe('Réessayez plus tard.');
  });
  it('does not echo unknown URLs or query values', async () => {
    const app = express();
    app.use(notFoundHandler);
    const response = await request(app).get(`/${secret}?token=${secret}`);
    expect(response.status).toBe(404);
    expect(JSON.stringify(response.body)).not.toContain(secret);
  });
});

describe('R4 optional text compatibility', () => {
  it.each([
    ['category', categoryUpdateValidator, { description: null }],
    ['role', roleUpdateValidator, { description: null }],
    ['permission', permissionUpdateValidator, { description: null }],
    ['maintenance', maintenanceUpdateValidator, { notes: null }],
  ])('accepts cleared optional text for %s', async (_name, validators, values) => {
    const app = express();
    app.use(express.json());
    app.put('/:uuid', validators, validateRequest, (req, res) => res.json(req.body));
    app.use(errorHandler);
    const response = await request(app).put('/f75ce638-18d2-4e29-9958-2afaa4ae5151').send(values);
    expect(response.status).toBe(200);
    expect(response.body).toEqual(values);
  });
});
