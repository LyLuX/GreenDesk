import { afterEach, describe, expect, it, jest } from '@jest/globals';

import { runWithCompanyScope } from '../src/core/company/company-context.js';
import { STOCKABLE_TYPES } from '../src/core/inventory/stock-operation.js';
import StockMovement from '../src/core/inventory/stock-movement.model.js';
import AuditLog from '../src/modules/audit/model/audit-log.model.js';
import RelationsRepository from '../src/modules/relations/repository/relations.repository.js';

describe('RelationsRepository', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('scopes user, stock and administration-history counts to the selected company', async () => {
    const userRepository = {
      findAll: jest.fn().mockResolvedValue({ count: 4, rows: [] }),
    };
    const stockCount = jest.spyOn(StockMovement, 'count').mockResolvedValue(7);
    const auditCount = jest.spyOn(AuditLog, 'count').mockResolvedValue(9);
    const repository = new RelationsRepository(userRepository);

    const counts = await runWithCompanyScope(
      { companyId: 42, companyUuid: 'company-uuid', accessAll: false },
      () =>
        repository.getCounts(['users', 'stockMovements', 'administrationAudit'], {
          visibleRoleNames: ['MANAGER'],
        }),
    );

    expect(counts).toEqual({ users: 4, stockMovements: 7, administrationAudit: 9 });
    expect(userRepository.findAll).toHaveBeenCalledWith({
      companyId: 42,
      visibleRoleNames: ['MANAGER'],
      page: 1,
      limit: 1,
    });
    expect(stockCount).toHaveBeenCalledWith({
      where: { companyId: 42, stockableType: STOCKABLE_TYPES.MAINTENANCE_PART },
    });
    expect(auditCount).toHaveBeenCalledWith({
      where: expect.objectContaining({ companyId: 42 }),
    });
  });
});
