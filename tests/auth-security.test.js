import express from 'express';
import request from 'supertest';
import { jest } from '@jest/globals';

import HTTP_STATUS from '../src/core/constants/http-status.js';
import AppError from '../src/core/errors/app-error.js';
import { errorHandler } from '../src/core/middlewares/error-handler.js';
import AuthController from '../src/modules/auth/controller/auth.controller.js';
import { createPublicRegistrationGuard } from '../src/modules/auth/middlewares/public-registration.middleware.js';

describe('public authentication security', () => {
  it('rejects public registration when the deployment disables it', async () => {
    const app = express();
    app.post('/register', createPublicRegistrationGuard(false), (_request, response) =>
      response.sendStatus(201),
    );
    app.use(errorHandler);

    const response = await request(app).post('/register');

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      success: false,
      error: { message: 'L’inscription publique est désactivée.' },
    });
  });

  it('allows public registration only when explicitly enabled', async () => {
    const app = express();
    app.post('/register', createPublicRegistrationGuard(true), (_request, response) =>
      response.sendStatus(201),
    );

    expect((await request(app).post('/register')).status).toBe(201);
  });

  it('exposes a safe Retry-After header for operational cooldown errors', async () => {
    const app = express();
    app.post('/resend', () => {
      throw new AppError('Cooldown active', HTTP_STATUS.TOO_MANY_REQUESTS, undefined, {
        retryAfterSeconds: 42,
      });
    });
    app.use(errorHandler);

    const response = await request(app).post('/resend');

    expect(response.status).toBe(429);
    expect(response.headers['retry-after']).toBe('42');
  });

  it('logs failed logins without the email or password', async () => {
    const securityLogger = { warn: jest.fn() };
    const controller = new AuthController(
      {
        login: jest
          .fn()
          .mockRejectedValue(new AppError('Invalid email or password', HTTP_STATUS.UNAUTHORIZED)),
      },
      securityLogger,
    );
    const requestData = {
      id: 'request-id',
      ip: '192.0.2.1',
      body: { email: 'sensitive@example.com', password: 'never-log-this-password' },
    };

    await expect(controller.login(requestData, {})).rejects.toMatchObject({ statusCode: 401 });

    expect(securityLogger.warn).toHaveBeenCalledWith(
      'Authentication failed',
      expect.objectContaining({
        event: 'security.login_failed',
        requestId: 'request-id',
        ip: '192.0.2.1',
        emailFingerprint: expect.stringMatching(/^[a-f0-9]{16}$/),
      }),
    );
    const serializedLog = JSON.stringify(securityLogger.warn.mock.calls[0]);
    expect(serializedLog).not.toContain('sensitive@example.com');
    expect(serializedLog).not.toContain('never-log-this-password');
  });
});
