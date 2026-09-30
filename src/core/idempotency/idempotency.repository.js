import { requireCompanyInstance, companyValues, companyWhere } from '../company/company-context.js';
import CompanyScopedRepository from '../database/repositories/company-scoped.repository.js';
import IdempotencyKey from './idempotency-key.model.js';

/** Persists successful idempotent API responses in the same transaction as their side effects. */
export default class IdempotencyRepository extends CompanyScopedRepository {
  create(values, { transaction } = {}) {
    return IdempotencyKey.create(companyValues(values), { transaction });
  }

  findByUserAndKeyHash(userId, keyHash) {
    return IdempotencyKey.findOne({
      where: companyWhere({ userId, keyHash }),
    });
  }

  complete(record, values, { transaction } = {}) {
    requireCompanyInstance(record);
    return record.update(companyValues(values), { transaction });
  }
}
