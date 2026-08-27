import { jest } from '@jest/globals';

import CompanyService from '../src/modules/companies/service/company.service.js';

const transaction = { id: 'transaction' };
const deletedCompany = {
  id: 3,
  uuid: 'a2b3c4d5-6e7f-4890-ab12-34567890cdef',
  name: 'Société supprimée',
  active: false,
  deletedAt: new Date('2026-08-27T08:00:00.000Z'),
  toJSON() {
    return { ...this };
  },
};

const createService = () => {
  const repository = {
    findByUuid: jest.fn().mockResolvedValue(deletedCompany),
    findByName: jest.fn().mockResolvedValue(null),
    restore: jest.fn().mockImplementation(async (company) => {
      company.deletedAt = null;
      return company;
    }),
    withTransaction: jest.fn((callback) => callback(transaction)),
  };
  const auditService = { record: jest.fn() };
  return { service: new CompanyService(repository, auditService), repository, auditService };
};

describe('CompanyService deleted records', () => {
  it('restores a deleted company without changing its active status', async () => {
    const { service, repository, auditService } = createService();

    await expect(
      service.restore(deletedCompany.uuid, 2, {
        permissions: ['companies.access.all', 'companies.deleted.update'],
      }),
    ).resolves.toBe(deletedCompany);

    expect(repository.findByUuid).toHaveBeenCalledWith(deletedCompany.uuid, {
      withDeleted: true,
      transaction,
    });
    expect(repository.restore).toHaveBeenCalledWith(deletedCompany, { transaction });
    expect(deletedCompany.active).toBe(false);
    expect(auditService.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'RESTORE', entity: 'COMPANY' }),
      { transaction },
    );
  });

  it('requires deleted-company update permission before recreating a deleted company', async () => {
    const { service, repository } = createService();
    deletedCompany.deletedAt = new Date('2026-08-27T08:00:00.000Z');
    repository.findByName.mockResolvedValue(deletedCompany);

    await expect(
      service.create({ name: deletedCompany.name }, 2, { permissions: ['companies.create'] }),
    ).rejects.toMatchObject({ statusCode: 403 });

    expect(repository.restore).not.toHaveBeenCalled();
  });
});
