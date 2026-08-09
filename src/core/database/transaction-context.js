import { AsyncLocalStorage } from 'node:async_hooks';
import { Sequelize, Transaction } from 'sequelize';

import sequelize from '../../config/database.js';

const transactionStorage = new AsyncLocalStorage();

const namespace = {
  run(callback) {
    const context = new Map(transactionStorage.getStore() ?? []);
    return transactionStorage.run(context, () => callback(context));
  },
  bind(callback, context = transactionStorage.getStore()) {
    if (!context) return callback;
    return (...args) => transactionStorage.run(context, () => callback(...args));
  },
  get(key) {
    return transactionStorage.getStore()?.get(key);
  },
  set(key, value) {
    const context = transactionStorage.getStore();
    if (!context) throw new Error('No transaction context is active');
    context.set(key, value);
    return value;
  },
};

Sequelize.useCLS(namespace);

/** Returns the transaction propagated through the current asynchronous call chain. */
export function getCurrentTransaction() {
  return namespace.get('transaction') ?? null;
}

/**
 * Runs a unit of work atomically, reusing the current service transaction when one is active.
 * Reusing it keeps nested writes and audits in one commit without opening savepoints.
 */
export function withTransaction(callback, options) {
  const currentTransaction = getCurrentTransaction();
  if (currentTransaction) return callback(currentTransaction);
  return sequelize.transaction(
    options ?? { isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED },
    callback,
  );
}

export { namespace as transactionNamespace };
