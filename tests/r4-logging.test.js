import { jest } from '@jest/globals';
import { Writable } from 'node:stream';
import winston from 'winston';
import logger from '../src/core/logger/logger.js';
import { httpLogLine } from '../src/core/logger/http-log.js';
import { redactLogRecord } from '../src/core/logger/redact-log.js';
import User from '../src/modules/users/model/user.model.js';
import UserService from '../src/modules/users/service/user.service.js';

const secret = 'R4_FAKE_SECRET';
describe('R4 actual log formatting and public projections', () => {
  it('redacts nested secrets, SQL and exceptions before the console JSON format', async () => {
    const output = [];
    const stream = new Writable({
      write(chunk, _encoding, callback) {
        output.push(String(chunk));
        callback();
      },
    });
    const transport = new winston.transports.Stream({ stream, format: winston.format.json() });
    const previous = logger.transports;
    logger.clear();
    logger.add(transport);
    try {
      logger.error('Fixed event', {
        password: secret,
        requestId: secret,
        refreshToken: secret,
        body: { arbitrary: secret },
        stack: secret,
        sql: secret,
        error: Object.assign(new Error(secret), { sql: secret }),
        nested: { clientSecret: secret },
        statusCode: 500,
      });
      await new Promise((resolve) => setImmediate(resolve));
      expect(output.join('')).not.toContain(secret);
      expect(output.join('')).toContain('Fixed event');
      expect(output.join('')).toContain('500');
    } finally {
      logger.clear();
      for (const item of previous) logger.add(item);
    }
    expect(redactLogRecord({ metadata: { authorization: secret } })).toEqual({
      metadata: { authorization: '[REDACTED]' },
    });
  });
  it('logs registered templates instead of path, query and parameter values', () => {
    const tokens = {
      status: jest.fn(() => 200),
      res: jest.fn(() => 10),
      'response-time': jest.fn(() => 1),
    };
    const line = httpLogLine(
      tokens,
      {
        method: 'GET',
        baseUrl: '/api/v1/materials',
        route: { path: '/:uuid' },
        path: `/${secret}`,
        originalUrl: `/${secret}?token=${secret}`,
      },
      {},
    );
    expect(line).toContain('/api/v1/materials/:uuid');
    expect(line).not.toContain(secret);
  });
  it('strips physical logo references but preserves logo presence in user reads and audits', () => {
    const user = User.build({
      firstName: 'Control',
      lastName: 'User',
      email: 'test@example.invalid',
    });
    user.setDataValue('companies', [
      {
        id: 1,
        uuid: 'company',
        logoFileName: secret,
        logoOriginalName: secret,
        logoMimeType: 'image/png',
      },
    ]);
    const publicValue = user.toJSON();
    const auditValue = new UserService().publicUser(user);
    for (const value of [publicValue, auditValue]) {
      expect(JSON.stringify(value)).not.toContain(secret);
      expect(value.companies[0]).toMatchObject({ uuid: 'company', hasLogo: true });
    }
  });
});
