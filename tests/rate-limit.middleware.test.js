import express from 'express';
import request from 'supertest';
import { jest } from '@jest/globals';

import { createRateLimiters } from '../src/core/middlewares/rate-limit.middleware.js';

const configuration = (overrides = {}) => ({
  enabled: true,
  api: { windowMs: 60_000, limit: 1 },
  login: { windowMs: 60_000, limit: 1 },
  register: { windowMs: 60_000, limit: 1 },
  refresh: { windowMs: 60_000, limit: 1 },
  emailVerification: { windowMs: 60_000, limit: 1 },
  ...overrides,
});

describe('HTTP rate limiting', () => {
  it('returns the standard GreenDesk 429 response and quota headers', async () => {
    const securityLogger = { warn: jest.fn() };
    const { apiRateLimiter } = createRateLimiters(configuration(), securityLogger);
    const app = express();
    app.get('/limited', apiRateLimiter, (_request, response) => response.json({ ok: true }));

    expect((await request(app).get('/limited')).status).toBe(200);
    const blocked = await request(app).get('/limited?token=never-log-this-query');

    expect(blocked.status).toBe(429);
    expect(blocked.body).toEqual({
      success: false,
      error: { message: 'Trop de requêtes. Réessayez plus tard.' },
    });
    expect(blocked.headers).toEqual(
      expect.objectContaining({
        ratelimit: expect.any(String),
        'ratelimit-policy': expect.any(String),
        'retry-after': expect.any(String),
      }),
    );
    expect(securityLogger.warn).toHaveBeenCalledWith(
      'Rate limit exceeded',
      expect.objectContaining({ policy: 'api', method: 'GET', path: '/limited' }),
    );
    expect(JSON.stringify(securityLogger.warn.mock.calls[0])).not.toContain('never-log-this-query');
  });

  it('counts failed logins while releasing successful requests', async () => {
    const successfulApp = express();
    successfulApp.get(
      '/login',
      createRateLimiters(configuration(), { warn: jest.fn() }).loginRateLimiter,
      (_request, response) => response.sendStatus(204),
    );

    expect((await request(successfulApp).get('/login')).status).toBe(204);
    expect((await request(successfulApp).get('/login')).status).toBe(204);

    const failedApp = express();
    failedApp.get(
      '/login',
      createRateLimiters(configuration(), { warn: jest.fn() }).loginRateLimiter,
      (_request, response) => response.sendStatus(401),
    );

    expect((await request(failedApp).get('/login')).status).toBe(401);
    expect((await request(failedApp).get('/login')).status).toBe(429);
  });

  it('can be disabled explicitly without adding a quota', async () => {
    const { apiRateLimiter } = createRateLimiters(configuration({ enabled: false }), {
      warn: jest.fn(),
    });
    const app = express();
    app.get('/unlimited', apiRateLimiter, (_request, response) => response.sendStatus(204));

    expect((await request(app).get('/unlimited')).status).toBe(204);
    expect((await request(app).get('/unlimited')).status).toBe(204);
  });
});
