import { jest } from '@jest/globals';
import { companyTest as it } from './helpers/company-test.js';
import sequelize from '../src/config/database.js';
import MaintenanceHistoryDateRepository from '../src/modules/maintenance/repository/maintenance-history-date.repository.js';
import StockMovement from '../src/core/inventory/stock-movement.model.js';
import MaintenancePartPriceHistory from '../src/modules/maintenance/model/maintenance-part-price-history.model.js';
import AuditLog from '../src/modules/audit/model/audit-log.model.js';

const transaction = { LOCK: { UPDATE: 'UPDATE' } };
afterEach(() => jest.restoreAllMocks());
describe('maintenance date persistence', () => {
  it('restricts movement lookup to company, piece and stockable type', async () => {
    const find = jest.spyOn(StockMovement, 'findOne').mockResolvedValue(null);
    await new MaintenanceHistoryDateRepository().findEntry('stock', 51, 'entry', transaction, true);
    expect(find).toHaveBeenCalledWith({
      where: { companyId: 1, stockableId: 51, stockableType: 'maintenancePart', uuid: 'entry' },
      transaction,
      lock: 'UPDATE',
    });
  });
  it('restricts price lookup to company and piece', async () => {
    const find = jest.spyOn(MaintenancePartPriceHistory, 'findOne').mockResolvedValue(null);
    await new MaintenanceHistoryDateRepository().findEntry('price', 51, 'entry', transaction);
    expect(find).toHaveBeenCalledWith({
      where: { companyId: 1, maintenancePartId: 51, uuid: 'entry' },
      transaction,
      lock: undefined,
    });
  });
  it('updates related dates in the same transaction without writing stock or cost fields', async () => {
    const intervention = { id: 3, uuid: 'intervention', companyId: 1, update: jest.fn() };
    const query = jest.spyOn(sequelize, 'query').mockResolvedValue([[], {}]);
    const stock = jest.spyOn(StockMovement, 'update').mockResolvedValue([1]);
    const audit = jest.spyOn(AuditLog, 'update').mockResolvedValue([1]);
    await new MaintenanceHistoryDateRepository().correctIntervention(
      intervention,
      '2026-09-19',
      transaction,
    );
    expect(intervention.update).toHaveBeenCalledWith(
      { performedAt: '2026-09-19' },
      { transaction },
    );
    expect(stock).toHaveBeenCalledWith(
      { performedAt: '2026-09-19' },
      {
        where: { companyId: 1, sourceType: 'maintenanceIntervention', sourceUuid: 'intervention' },
        transaction,
      },
    );
    expect(audit.mock.calls[0][1]).toEqual({
      where: {
        companyId: 1,
        entity: 'MAINTENANCE_INTERVENTION',
        entityUuid: 'intervention',
        action: 'CREATE',
      },
      transaction,
    });
    expect(query.mock.calls[0][0]).toContain('SET performed_at = :performedAt');
    expect(query.mock.calls[0][1]).toEqual({
      replacements: { companyId: 1, interventionId: 3, performedAt: '2026-09-19' },
      transaction,
    });
    expect(query.mock.calls[1][0]).toContain('replay.company_id = :companyId');
    expect(query.mock.calls[1][1]).toEqual({
      replacements: { companyId: 1, uuid: 'intervention', performedAt: '2026-09-19' },
      transaction,
    });
  });
  it('rejects correction of an instance from another company', async () => {
    const intervention = { id: 3, uuid: 'intervention', companyId: 2, update: jest.fn() };
    await expect(
      new MaintenanceHistoryDateRepository().correctIntervention(
        intervention,
        '2026-09-19',
        transaction,
      ),
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(intervention.update).not.toHaveBeenCalled();
  });
});
