import { companyTest as it } from './helpers/company-test.js';
import { jest } from '@jest/globals';
import { Op } from 'sequelize';

import sequelize from '../src/config/database.js';
import AuditLog from '../src/modules/audit/model/audit-log.model.js';
import HistoryRepository from '../src/modules/audit/repository/history.repository.js';

import MaintenanceHistory from '../src/modules/maintenance/model/maintenance-history.model.js';

describe('HistoryRepository', () => {
  afterEach(() => jest.restoreAllMocks());

  it.each(['maintenance_plan', 'planned_execution'])(
    'includes executions regardless of plan periodicity for the %s filter',
    async (type) => {
      const rows = [{ uuid: 'wear-execution' }, { uuid: 'periodic-execution' }];
      const find = jest
        .spyOn(MaintenanceHistory, 'findAndCountAll')
        .mockResolvedValue({ count: 2, rows });
      const result = await new HistoryRepository().findPlannedExecutions({ type }, 5);
      expect(result).toEqual({ count: 2, rows });
      const options = find.mock.calls[0][0];
      expect(options.where).toEqual({ companyId: 1 });
      expect(options.include.find(({ as }) => as === 'task').where).toEqual({ companyId: 1 });
      expect(options.limit).toBe(5);
    },
  );

  it('excludes execution audits from the plan filter to avoid duplicate events', async () => {
    const find = jest.spyOn(AuditLog, 'findAndCountAll').mockResolvedValue({ count: 0, rows: [] });
    await new HistoryRepository().findAuditEvents('maintenance', { type: 'maintenance_plan' }, 5);
    expect(find.mock.calls[0][0].where).toMatchObject({
      entity: { [Op.in]: ['MAINTENANCE_TASK'] },
      action: {
        [Op.notIn]: expect.arrayContaining([
          'EXECUTE',
          'EXECUTE_PARTIAL_PARTS',
          'EXECUTE_WITHOUT_PARTS',
        ]),
      },
    });
  });

  it('excludes plan executions when filtering for interventions outside plans', async () => {
    const find = jest.spyOn(MaintenanceHistory, 'findAndCountAll');
    expect(
      await new HistoryRepository().findPlannedExecutions({ type: 'unplanned_intervention' }, 5),
    ).toEqual({ count: 0, rows: [] });
    expect(find).not.toHaveBeenCalled();
  });

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
    expect(query.mock.calls[0][1]).toEqual({
      bind: { auditUuid0: 'audit-1', companyId: 1, accessAll: 0 },
    });
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
