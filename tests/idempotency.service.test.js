import { jest } from '@jest/globals';

import IdempotencyService from '../src/core/idempotency/idempotency.service.js';

const duplicateError = () =>
  Object.assign(new Error('duplicate'), { name: 'SequelizeUniqueConstraintError' });

const createRepository = () => {
  let record = null;
  const repository = {
    withTransaction: jest.fn(async (callback) => {
      const snapshot = record ? { ...record } : null;
      try {
        return await callback({ id: 'idempotency-transaction' });
      } catch (error) {
        record = snapshot;
        throw error;
      }
    }),
    create: jest.fn(async (values) => {
      if (record) throw duplicateError();
      record = {
        ...values,
        responseStatus: null,
        responseBody: null,
        update: jest.fn(async (values) => Object.assign(record, values)),
      };
      return record;
    }),
    complete: jest.fn(async (stored, values) => stored.update(values)),
    findByUserAndKeyHash: jest.fn(async () => record),
  };
  return repository;
};

const requestOptions = (body = { quantity: 2 }) => ({
  key: 'retry-key',
  userId: 7,
  operation: 'maintenance.part.stock.update',
  request: { resourceUuid: 'part-uuid', body },
  statusCode: 200,
});

describe('IdempotencyService', () => {
  it('runs an identical critical write once and replays its committed response', async () => {
    const repository = createRepository();
    const service = new IdempotencyService(repository);
    const handler = jest.fn().mockResolvedValue({ success: true, data: { quantityOnOrder: 2 } });

    const first = await service.execute(
      requestOptions({ operation: 'order', quantity: 2 }),
      handler,
    );
    const replay = await service.execute(
      requestOptions({ quantity: 2, operation: 'order' }),
      handler,
    );

    expect(first).toEqual({
      statusCode: 200,
      body: { success: true, data: { quantityOnOrder: 2 } },
      replayed: false,
    });
    expect(replay).toEqual({ ...first, replayed: true });
    expect(handler).toHaveBeenCalledTimes(1);
    expect(repository.complete).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ responseStatus: 200 }),
      { transaction: { id: 'idempotency-transaction' } },
    );
  });

  it('rejects reuse of a key for another request without invoking the new handler', async () => {
    const repository = createRepository();
    const service = new IdempotencyService(repository);
    await service.execute(requestOptions({ operation: 'order', quantity: 2 }), async () => ({
      success: true,
    }));
    const changedHandler = jest.fn();

    await expect(
      service.execute(requestOptions({ operation: 'order', quantity: 3 }), changedHandler),
    ).rejects.toMatchObject({ statusCode: 409 });
    expect(changedHandler).not.toHaveBeenCalled();
  });

  it('rolls back the reservation when the business write fails so the same key can retry', async () => {
    const repository = createRepository();
    const service = new IdempotencyService(repository);
    const failure = new Error('stock unavailable');

    await expect(
      service.execute(requestOptions(), async () => Promise.reject(failure)),
    ).rejects.toBe(failure);
    await expect(
      service.execute(requestOptions(), async () => ({ success: true, data: { retried: true } })),
    ).resolves.toMatchObject({ body: { success: true, data: { retried: true } } });
    expect(repository.create).toHaveBeenCalledTimes(2);
  });

  it('does not reinterpret a business unique-constraint failure as an idempotent replay', async () => {
    const repository = createRepository();
    const service = new IdempotencyService(repository);
    const businessError = duplicateError();

    await expect(
      service.execute(requestOptions(), async () => Promise.reject(businessError)),
    ).rejects.toBe(businessError);
    expect(repository.findByUserAndKeyHash).not.toHaveBeenCalled();
  });
});
