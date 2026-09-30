import { requireCompanyScope } from '../../company/company-context.js';
import TransactionalRepository from './transactional.repository.js';

/** Rejects missing business context before opening a database transaction. */
export default class CompanyScopedRepository extends TransactionalRepository {
  withTransaction(callback, options) {
    requireCompanyScope();
    return super.withTransaction(callback, options);
  }
}
