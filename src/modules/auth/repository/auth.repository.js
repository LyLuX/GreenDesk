import UserRepository from '../../users/repository/user.repository.js';

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
}
