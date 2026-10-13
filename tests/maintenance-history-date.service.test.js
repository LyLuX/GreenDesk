import { jest } from '@jest/globals';
import MaintenanceHistoryDateService from '../src/modules/maintenance/service/maintenance-history-date.service.js';

const makeService = (overrides = {}) => {
  const entry = {
    uuid: 'entry',
    performedAt: '2026-10-13',
    operation: 'consume',
    sourceType: 'maintenanceIntervention',
    sourceUuid: 'intervention',
  };
  const repository = {
    withTransaction: jest.fn((callback) => callback('transaction')),
    findPart: jest.fn().mockResolvedValue({ id: 51 }),
    findEntry: jest.fn().mockResolvedValue(entry),
    findIntervention: jest
      .fn()
      .mockResolvedValue({ id: 3, uuid: 'intervention', performedAt: '2026-10-13' }),
    correctIntervention: jest.fn(),
    correctEntry: jest.fn(),
    ...overrides,
  };
  const audit = { record: jest.fn() };
  return { service: new MaintenanceHistoryDateService(repository, audit), repository, audit };
};
const values = { kind: 'stock', performedAt: '2026-09-19', previousPerformedAt: '2026-10-13' };
const user = { userId: 2, permissions: ['maintenance.parts.history.date.update'] };

describe('maintenance history date corrections', () => {
  it('corrects the whole intervention and records both dates atomically', async () => {
    const { service, repository, audit } = makeService();
    expect(await service.correct('part', 'entry', values, user)).toEqual({
      uuid: 'entry',
      kind: 'stock',
      performedAt: '2026-09-19',
    });
    expect(repository.correctIntervention).toHaveBeenCalledWith(
      expect.objectContaining({ id: 3 }),
      '2026-09-19',
      'transaction',
    );
    expect(repository.correctEntry).not.toHaveBeenCalled();
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 2,
        action: 'DATE_CORRECTION',
        oldValues: expect.objectContaining({ performedAt: '2026-10-13' }),
        newValues: expect.objectContaining({ performedAt: '2026-09-19' }),
      }),
      { transaction: 'transaction' },
    );
  });

  it.each(['2099-01-01', '2026-02-30', 'bad'])(
    'rejects invalid or future date %s',
    async (performedAt) => {
      const { service, repository } = makeService();
      await expect(
        service.correct('part', 'entry', { ...values, performedAt }, user),
      ).rejects.toMatchObject({ statusCode: 400 });
      expect(repository.withTransaction).not.toHaveBeenCalled();
    },
  );

  it.each([
    [{ findPart: jest.fn().mockResolvedValue(null) }, 404],
    [{ findEntry: jest.fn().mockResolvedValue(null) }, 404],
    [{ findIntervention: jest.fn().mockResolvedValue(null) }, 409],
    [
      {
        findEntry: jest.fn().mockResolvedValue({
          performedAt: '2026-09-20',
          operation: 'consume',
          sourceType: 'maintenanceIntervention',
        }),
      },
      409,
    ],
    [
      {
        findEntry: jest.fn().mockResolvedValue({
          performedAt: '2026-10-13',
          operation: 'consume',
          sourceType: 'maintenanceTask',
        }),
      },
      409,
    ],
  ])(
    'rejects missing, stale or unsupported records without writing',
    async (overrides, statusCode) => {
      const { service, repository, audit } = makeService(overrides);
      await expect(service.correct('part', 'entry', values, user)).rejects.toMatchObject({
        statusCode,
      });
      expect(repository.correctIntervention).not.toHaveBeenCalled();
      expect(repository.correctEntry).not.toHaveBeenCalled();
      expect(audit.record).not.toHaveBeenCalled();
    },
  );

  it('requires the dedicated date permission even with stock operation permissions', async () => {
    const { service, repository } = makeService();
    await expect(
      service.correct('part', 'entry', values, {
        userId: 2,
        permissions: ['maintenance.parts.stock.order'],
      }),
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(repository.correctIntervention).not.toHaveBeenCalled();
  });

  it('allows date correction with its dedicated permission without adjustment permissions', async () => {
    const { service, repository } = makeService({
      findEntry: jest.fn().mockResolvedValue({
        performedAt: '2026-10-13',
        operation: 'adjust',
        quantityOnHandChange: 1,
        quantityOnOrderChange: -1,
      }),
    });
    await service.correct('part', 'entry', values, user);
    expect(repository.correctEntry).toHaveBeenCalled();
  });

  it.each([
    ['stock', { operation: 'order' }],
    ['stock', { operation: 'receive' }],
    ['stock', { operation: 'adjust', quantityOnHandChange: 1, quantityOnOrderChange: 0 }],
    ['price', {}],
  ])('corrects standalone %s events using only the dedicated permission', async (kind, extra) => {
    const { service, repository } = makeService({
      findEntry: jest.fn().mockResolvedValue({ performedAt: '2026-10-13', ...extra }),
    });
    await service.correct('part', 'entry', { ...values, kind }, user);
    expect(repository.correctEntry).toHaveBeenCalledWith(
      expect.any(Object),
      '2026-09-19',
      'transaction',
    );
    expect(repository.correctIntervention).not.toHaveBeenCalled();
  });

  it('does not write or audit an unchanged date', async () => {
    const { service, repository, audit } = makeService();
    await service.correct(
      'part',
      'entry',
      { ...values, performedAt: values.previousPerformedAt },
      user,
    );
    expect(repository.correctIntervention).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });
});
