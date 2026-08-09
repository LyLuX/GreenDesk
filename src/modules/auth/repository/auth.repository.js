import { Op } from 'sequelize';

import UserRepository from '../../users/repository/user.repository.js';
import RevokedAccessToken from '../model/revoked-access-token.model.js';
import TransactionalRepository from '../../../core/database/repositories/transactional.repository.js';

/** Auth-specific access to credentials without exposing Sequelize to services. */
export default class AuthRepository extends TransactionalRepository {
  constructor(userRepository = new UserRepository()) {
    super();
    this.userRepository = userRepository;
  }
  async findByEmailWithPassword(email) {
    return this.userRepository.findByEmailWithPassword(email);
  }
  async update(user, values, options) {
    return this.userRepository.update(user, values, options);
  }
  async isActiveUser(userId, uuid) {
    return this.userRepository.isActiveByClaims(userId, uuid);
  }

  /** Persists a revoked access-token identifier until it naturally expires. */
  async revokeAccessToken(tokenId, expiresAt, { transaction } = {}) {
    await RevokedAccessToken.destroy({
      where: { expiresAt: { [Op.lt]: new Date() } },
      transaction,
    });
    return RevokedAccessToken.findOrCreate({
      where: { tokenId },
      defaults: { tokenId, expiresAt },
      transaction,
    });
  }

  /** Checks whether an otherwise valid access token has been revoked. */
  async isAccessTokenRevoked(tokenId) {
    if (!tokenId) return false;
    return Boolean(await RevokedAccessToken.findOne({ where: { tokenId } }));
  }
}
