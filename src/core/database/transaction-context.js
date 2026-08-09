import { AsyncLocalStorage } from 'node:async_hooks';
import { Sequelize } from 'sequelize';

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
 * Runs a unit of work atomically, reusing the request transaction when one is active.
 * Reusing it keeps audits, relationship changes, and the business write in one commit.
 */
export function withTransaction(callback, options) {
  const currentTransaction = getCurrentTransaction();
  if (currentTransaction) return callback(currentTransaction);
  return options
    ? sequelize.transaction(options, callback)
    : sequelize.transaction(callback);
}

export { namespace as transactionNamespace };
