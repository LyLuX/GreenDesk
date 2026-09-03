import { jest } from '@jest/globals';
import { Op } from 'sequelize';

import sequelize from '../src/config/database.js';
import AuditLog from '../src/modules/audit/model/audit-log.model.js';
import HistoryRepository from '../src/modules/audit/repository/history.repository.js';

describe('HistoryRepository', () => {
  afterEach(() => jest.restoreAllMocks());

  it('joins audit entities to expose a user-facing subject label', async () => {
    jest.spyOn(AuditLog, 'findAndCountAll').mockResolvedValue({
      count: 1,
      rows: [
        {
          uuid: 'audit-1',
          toJSON: () => ({
            uuid: 'audit-1',
            entity: 'MAINTENANCE_PART',
            entityUuid: 'part-1',
          }),
        },
      ],
    });
    const query = jest
      .spyOn(sequelize, 'query')
      .mockResolvedValue([[{ auditUuid: 'audit-1', subjectLabel: 'Filtre (FH-01)' }], {}]);

    const result = await new HistoryRepository().findAuditEvents('maintenance', {}, 5);

    expect(query.mock.calls[0][0]).toContain('LEFT JOIN materials');
    expect(query.mock.calls[0][0]).toContain('LEFT JOIN maintenance_parts');
    expect(query.mock.calls[0][0]).toContain('LEFT JOIN companies');
    expect(query.mock.calls[0][0]).toContain('LEFT JOIN permissions');
    expect(query.mock.calls[0][1]).toEqual({ bind: { auditUuid0: 'audit-1' } });
    expect(result.rows[0]).toEqual(expect.objectContaining({ subjectLabel: 'Filtre (FH-01)' }));
  });

  it('includes company audit events in administration history', async () => {
    const findAuditEvents = jest.spyOn(AuditLog, 'findAndCountAll').mockResolvedValue({
      count: 1,
      rows: [
        {
          uuid: 'audit-company',
          toJSON: () => ({
            uuid: 'audit-company',
            entity: 'COMPANY',
            entityUuid: 'company-1',
          }),
        },
      ],
    });
    jest
      .spyOn(sequelize, 'query')
      .mockResolvedValue([[{ auditUuid: 'audit-company', subjectLabel: 'GreenDesk' }], {}]);

    const result = await new HistoryRepository().findAuditEvents(
      'administration',
      { type: 'company' },
      5,
    );

    expect(findAuditEvents).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ entity: { [Op.in]: ['COMPANY'] } }),
      }),
    );
    expect(result.rows[0]).toEqual(
      expect.objectContaining({ entity: 'COMPANY', subjectLabel: 'GreenDesk' }),
    );
  });
});
