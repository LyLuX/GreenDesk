import { Op } from 'sequelize';

import TransactionalRepository from '../../../core/database/repositories/transactional.repository.js';
import EmailVerificationToken from '../model/email-verification-token.model.js';

/** Persistence operations for short-lived email-verification tokens. */
export default class EmailVerificationRepository extends TransactionalRepository {
  async create(values, { transaction } = {}) {
    return EmailVerificationToken.create(values, { transaction });
  }

  async findLatestForUser(userId, { transaction } = {}) {
    return EmailVerificationToken.findOne({
      where: { userId },
      order: [['createdAt', 'DESC']],
      transaction,
    });
  }

  async findValidByHash(tokenHash, now, { transaction, lock = false } = {}) {
    return EmailVerificationToken.findOne({
      where: { tokenHash, usedAt: null, expiresAt: { [Op.gt]: now } },
      transaction,
      ...(lock && transaction ? { lock: transaction.LOCK.UPDATE } : {}),
    });
  }

  async invalidateForUser(userId, usedAt, { transaction, exceptId = null } = {}) {
    return EmailVerificationToken.update(
      { usedAt },
      {
        where: {
          userId,
          usedAt: null,
          ...(exceptId ? { id: { [Op.ne]: exceptId } } : {}),
        },
        transaction,
      },
    );
  }

  async markUsed(token, usedAt, { transaction } = {}) {
    return token.update({ usedAt }, { transaction });
  }

  async delete(token, { transaction } = {}) {
    return token.destroy({ transaction });
  }

  async deleteExpired(now, { transaction } = {}) {
    return EmailVerificationToken.destroy({ where: { expiresAt: { [Op.lt]: now } }, transaction });
  }
}
