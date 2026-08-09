import { withTransaction } from '../transaction-context.js';

/** Gives repositories a shared managed-transaction entry point for service-level units of work. */
export default class TransactionalRepository {
  withTransaction(callback, options) {
    return withTransaction(callback, options);
  }
}
