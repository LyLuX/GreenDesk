import { jest } from '@jest/globals';

import sequelize from '../src/config/database.js';
import {
  getCurrentTransaction,
  transactionNamespace,
  withTransaction,
} from '../src/core/database/transaction-context.js';

describe('transaction context', () => {
  afterEach(() => jest.restoreAllMocks());

  it('reuses the transaction propagated through the current async context', async () => {
    const transaction = { id: 'outer-service-transaction' };
    const callback = jest.fn().mockResolvedValue('done');
    const createTransaction = jest.spyOn(sequelize, 'transaction');

    await transactionNamespace.run(async () => {
      transactionNamespace.set('transaction', transaction);
      await Promise.resolve();

      await expect(withTransaction(callback)).resolves.toBe('done');
      expect(getCurrentTransaction()).toBe(transaction);
    });

    expect(callback).toHaveBeenCalledWith(transaction);
    expect(createTransaction).not.toHaveBeenCalled();
  });

  it('creates a managed transaction outside an existing context', async () => {
    const transaction = { id: 'standalone-transaction' };
    const callback = jest.fn().mockResolvedValue('done');
    const createTransaction = jest
      .spyOn(sequelize, 'transaction')
      .mockImplementation(async (_options, managedCallback) => managedCallback(transaction));

    await expect(withTransaction(callback)).resolves.toBe('done');

    expect(createTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ isolationLevel: 'READ COMMITTED' }),
      callback,
    );
    expect(callback).toHaveBeenCalledWith(transaction);
  });
});
