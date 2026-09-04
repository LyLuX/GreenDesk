import { jest } from '@jest/globals';

import CompanyService from '../src/modules/companies/service/company.service.js';

describe('CompanyService authorization invalidation', () => {
  it('invalidates every affiliated session when a company status changes', async () => {
    const transaction = { id: 'transaction' };
    const company = {
      id: 3,
      uuid: 'a2b3c4d5-6e7f-4890-ab12-34567890cdef',
      name: 'Atelier Vert',
      active: true,
      toJSON() {
        return { id: this.id, uuid: this.uuid, name: this.name, active: this.active };
      },
    };
    const repository = {
      withTransaction: jest.fn((callback) => callback(transaction)),
      findByUuid: jest.fn().mockResolvedValue(company),
      update: jest.fn(async (item, values) => Object.assign(item, values)),
      invalidateUserSessions: jest.fn(),
    };
    const service = new CompanyService(repository, { record: jest.fn() });

    await service.update(company.uuid, { active: false }, 42, {
      permissions: ['companies.access.all'],
    });

    expect(repository.invalidateUserSessions).toHaveBeenCalledWith(3, { transaction });
  });
});
