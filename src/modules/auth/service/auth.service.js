import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

import env from '../../../config/env.js';
import HTTP_STATUS from '../../../core/constants/http-status.js';
import AppError from '../../../core/errors/app-error.js';
import AuditService from '../../audit/service/audit.service.js';
import UserService from '../../users/service/user.service.js';
import AuthRepository from '../repository/auth.repository.js';

/** Registration and credential-based authentication. */
export default class AuthService {
  constructor(
    authRepository = new AuthRepository(),
    userService = new UserService(),
    auditService = new AuditService(),
  ) {
    this.authRepository = authRepository;
    this.userService = userService;
    this.auditService = auditService;
  }

  async register(values) {
    return this.userService.create(values, null, 'USER');
  }

  async login(email, password) {
    const user = await this.authRepository.findByEmailWithPassword(email.toLowerCase());
    if (!user || !user.isActive || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new AppError('Invalid email or password', HTTP_STATUS.UNAUTHORIZED);
    }
    await this.authRepository.update(user, { lastLoginAt: new Date() });
    const roles = (user.roles ?? []).map((role) => role.name);
    const accessToken = jwt.sign(
      { sub: user.uuid, userId: user.id, email: user.email, roles },
      env.jwt.secret,
      {
        expiresIn: env.jwt.accessTokenTtl,
      },
    );
    const safeUser = this.userService.publicUser(user);
    await this.auditService.record({
      userId: user.id,
      action: 'LOGIN_SUCCESS',
      entity: 'USER',
      entityUuid: user.uuid,
    });
    return {
      accessToken,
      user: {
        uuid: safeUser.uuid,
        firstName: safeUser.firstName,
        lastName: safeUser.lastName,
        email: safeUser.email,
        roles,
      },
    };
  }
}
