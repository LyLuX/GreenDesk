import { jest } from '@jest/globals';

import Company from '../src/modules/companies/model/company.model.js';
import CompanyRepository from '../src/modules/companies/repository/company.repository.js';

describe('CompanyRepository authorization invalidation', () => {
  afterEach(() => jest.restoreAllMocks());

  it('increments every company member without excluding the acting user', async () => {
    const transaction = { id: 'transaction' };
    const query = jest.spyOn(Company.sequelize, 'query').mockResolvedValue([[], undefined]);
    const repository = new CompanyRepository();

    await repository.invalidateUserSessions(3, { transaction });

    expect(query).toHaveBeenCalledWith(expect.not.stringContaining('u.id <>'), {
      bind: { companyId: 3 },
      transaction,
    });
  });
});
