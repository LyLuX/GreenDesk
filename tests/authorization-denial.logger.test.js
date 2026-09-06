import { jest } from '@jest/globals';

import { runWithCompanyScope } from '../src/core/company/company-context.js';
import { createAuthorizationDenialLogger } from '../src/core/logger/authorization-denial.logger.js';

const policy = { mode: 'any', permissions: ['maintenance.execute'] };
const deniedRequest = (overrides = {}) => ({
  user: { sub: 'user-a', userId: 1, permissions: [] },
  id: 'request-a',
  ip: '127.0.0.1',
  method: 'POST',
  baseUrl: '/api/v1/maintenance',
  route: { path: '/:uuid/execute' },
  ...overrides,
});
const setup = (options = {}) => {
  let time = 0;
  const securityLogger = { warn: jest.fn() };
  return {
    record: createAuthorizationDenialLogger({
      threshold: 3,
      windowMs: 60000,
      securityLogger,
      now: () => time,
      ...options,
    }),
    warn: securityLogger.warn,
    setTime: (value) => {
      time = value;
    },
  };
};

describe('repeated authorization denial events', () => {
  it('emits once at the threshold, not for isolated denials or subsequent flooding', () => {
    const { record, warn } = setup();
    record(deniedRequest(), policy);
    record(deniedRequest(), policy);
    expect(warn).not.toHaveBeenCalled();
    record(deniedRequest(), policy);
    for (let i = 0; i < 100; i += 1) record(deniedRequest(), policy);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith('Repeated authorization denials', {
      event: 'security.authorization_denied_repeated',
      requestId: 'request-a',
      userUuid: 'user-a',
      userId: '1',
      companyUuid: null,
      ip: '127.0.0.1',
      method: 'POST',
      route: '/api/v1/maintenance/:uuid/execute',
      statusCode: 403,
      authorizationMode: 'any',
      requiredPermissions: ['maintenance.execute'],
      denialCount: 3,
      threshold: 3,
      windowMs: 60000,
      firstDeniedAt: '1970-01-01T00:00:00.000Z',
    });
  });

  it('resets at the fixed window boundary and can emit again', () => {
    const { record, warn, setTime } = setup({ threshold: 2 });
    record(deniedRequest(), policy);
    setTime(59999);
    record(deniedRequest(), policy);
    expect(warn).toHaveBeenCalledTimes(1);
    setTime(60000);
    record(deniedRequest(), policy);
    expect(warn).toHaveBeenCalledTimes(1);
    record(deniedRequest(), policy);
    expect(warn).toHaveBeenCalledTimes(2);
    expect(warn.mock.calls[1][1].firstDeniedAt).toBe('1970-01-01T00:01:00.000Z');
  });

  it.each([
    { user: { sub: 'user-b', userId: 2 } },
    { method: 'DELETE' },
    { route: { path: '/:uuid/stock' } },
    { baseUrl: '/api/v1/materials' },
  ])('isolates actors, methods and registered routes: %j', (overrides) => {
    const { record, warn } = setup({ threshold: 2 });
    record(deniedRequest(), policy);
    record(deniedRequest(overrides), policy);
    expect(warn).not.toHaveBeenCalled();
    record(deniedRequest(), policy);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('uses the resolved company scope, not the untrusted selection header', () => {
    const { record, warn } = setup({ threshold: 2 });
    const req = deniedRequest({ headers: { 'x-company-uuid': 'spoofed-company' } });
    runWithCompanyScope({ companyUuid: 'company-a' }, () => record(req, policy));
    runWithCompanyScope({ companyUuid: 'company-b' }, () => record(req, policy));
    expect(warn).not.toHaveBeenCalled();
    runWithCompanyScope({ companyUuid: 'company-a' }, () => record(req, policy));
    expect(warn.mock.calls[0][1].companyUuid).toBe('company-a');
    expect(JSON.stringify(warn.mock.calls)).not.toContain('spoofed-company');
  });

  it('groups different resource UUIDs and omits bodies, query strings, headers and granted permissions', () => {
    const { record, warn } = setup({ threshold: 2 });
    for (const secret of ['secret-one', 'secret-two']) {
      record(
        deniedRequest({
          path: `/${secret}/execute`,
          originalUrl: `/${secret}/execute?token=${secret}`,
          params: { uuid: secret },
          query: { token: secret },
          body: { password: secret },
          headers: { authorization: `Bearer ${secret}`, cookie: secret },
          user: { sub: 'user-a', permissions: [secret] },
        }),
        policy,
      );
    }
    expect(warn).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(warn.mock.calls)).not.toMatch(/secret-one|secret-two/);
  });

  it('sanitizes and bounds externally supplied correlation metadata', () => {
    const { record, warn } = setup({ threshold: 1 });
    record(deniedRequest({ id: `req\n\r\u001b${'x'.repeat(500)}` }), policy);
    const { requestId } = warn.mock.calls[0][1];
    expect(requestId).toHaveLength(128);
    expect(requestId).not.toMatch(/[\r\n\u001b]/);
  });

  it('evicts the oldest group at capacity without resetting retained counters', () => {
    const { record, warn } = setup({ threshold: 2, maxGroups: 2 });
    const actor = (sub) => deniedRequest({ user: { sub } });
    record(actor('a'), policy);
    record(actor('b'), policy);
    record(actor('c'), policy);
    record(actor('b'), policy);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][1].userUuid).toBe('b');
    record(actor('a'), policy);
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
