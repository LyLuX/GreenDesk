import { companyValues, companyWhere } from '../company/company-context.js';
import TransactionalRepository from '../database/repositories/transactional.repository.js';
import IdempotencyKey from './idempotency-key.model.js';

/** Persists successful idempotent API responses in the same transaction as their side effects. */
export default class IdempotencyRepository extends TransactionalRepository {
  create(values, { transaction } = {}) {
    return IdempotencyKey.create(companyValues(values), { transaction });
  }

  findByUserAndKeyHash(userId, keyHash) {
    return IdempotencyKey.findOne({
      where: companyWhere({ userId, keyHash }),
    });
  }

  complete(record, values, { transaction } = {}) {
    return record.update(values, { transaction });
  }
}
