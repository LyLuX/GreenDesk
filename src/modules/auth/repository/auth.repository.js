import { Op } from 'sequelize';

import UserRepository from '../../users/repository/user.repository.js';
import RevokedAccessToken from '../model/revoked-access-token.model.js';

/** Auth-specific access to credentials without exposing Sequelize to services. */
export default class AuthRepository {
  constructor(userRepository = new UserRepository()) {
    this.userRepository = userRepository;
  }
  async findByEmailWithPassword(email) {
    return this.userRepository.findByEmailWithPassword(email);
  }
  async update(user, values) {
    return this.userRepository.update(user, values);
  }

  /** Persists a revoked access-token identifier until it naturally expires. */
  async revokeAccessToken(tokenId, expiresAt) {
    await RevokedAccessToken.destroy({ where: { expiresAt: { [Op.lt]: new Date() } } });
    return RevokedAccessToken.findOrCreate({
      where: { tokenId },
      defaults: { tokenId, expiresAt },
    });
  }

  /** Checks whether an otherwise valid access token has been revoked. */
  async isAccessTokenRevoked(tokenId) {
    if (!tokenId) return false;
    return Boolean(await RevokedAccessToken.findOne({ where: { tokenId } }));
  }
}
