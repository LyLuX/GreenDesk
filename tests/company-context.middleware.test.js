import { jest } from '@jest/globals';

import { getCompanyScope } from '../src/core/company/company-context.js';
import { createResolveCompanyContext } from '../src/core/middlewares/company-context.middleware.js';

const first = { id: 1, uuid: 'a5eaf09e-49b1-4fa3-a022-1a20854b06bd' };
const second = { id: 2, uuid: 'b5eaf09e-49b1-4fa3-a022-1a20854b06bd', active: true };

describe('company context middleware', () => {
  it('uses the explicitly selected assigned company', async () => {
    const next = jest.fn(() => {
      expect(getCompanyScope()).toEqual({
        companyId: 2,
        companyUuid: second.uuid,
        accessAll: false,
      });
    });
    const repository = { findByUuid: jest.fn().mockResolvedValue(second) };
    const middleware = createResolveCompanyContext(repository);

    await middleware(
      {
        headers: { 'x-company-uuid': second.uuid },
        user: { permissions: [], companyAccess: [first, second] },
      },
      {},
      next,
    );

    expect(repository.findByUuid).toHaveBeenCalledWith(second.uuid);
    expect(next).toHaveBeenCalledWith();
  });

  it('rejects a company disabled after the access token was issued', async () => {
    const repository = {
      findByUuid: jest.fn().mockResolvedValue({ ...first, active: false }),
    };
    const next = jest.fn();

    await createResolveCompanyContext(repository)(
      { headers: {}, user: { permissions: [], companyAccess: [first] } },
      {},
      next,
    );

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });

  it('does not grant company access from the ADMIN role name', async () => {
    const next = jest.fn();
    const middleware = createResolveCompanyContext({ findFirstActive: jest.fn() });

    await middleware(
      { headers: {}, user: { roles: ['ADMIN'], permissions: [], companyAccess: [] } },
      {},
      next,
    );

    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });

  it('allows an unassigned company only with companies.access.all', async () => {
    const repository = { findByUuid: jest.fn().mockResolvedValue(second) };
    const next = jest.fn(() => {
      expect(getCompanyScope()).toEqual({
        companyId: 2,
        companyUuid: second.uuid,
        accessAll: true,
      });
    });

    await createResolveCompanyContext(repository)(
      {
        headers: { 'x-company-uuid': second.uuid },
        user: { roles: [], permissions: ['companies.access.all'], companyAccess: [] },
      },
      {},
      next,
    );

    expect(repository.findByUuid).toHaveBeenCalledWith(second.uuid);
    expect(next).toHaveBeenCalledWith();
  });
});
