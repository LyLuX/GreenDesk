import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

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
    const permissions = [
      ...new Set(
        (user.roles ?? []).flatMap((role) =>
          (role.permissions ?? []).map((permission) => permission.name),
        ),
      ),
    ];
    const accessToken = jwt.sign(
      { sub: user.uuid, userId: user.id, email: user.email, roles, permissions },
      env.jwt.secret,
      {
        expiresIn: env.jwt.accessTokenTtl,
        jwtid: uuidv4(),
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
        permissions,
      },
    };
  }

  /** Revokes the current JWT so it cannot be reused before its expiration. */
  async logout(claims) {
    if (!claims?.jti || !claims?.exp) {
      throw new AppError('Invalid or expired access token', HTTP_STATUS.UNAUTHORIZED);
    }
    await this.authRepository.revokeAccessToken(claims.jti, new Date(claims.exp * 1000));
    await this.auditService.record({
      userId: claims.userId,
      action: 'LOGOUT_SUCCESS',
      entity: 'USER',
      entityUuid: claims.sub,
    });
  }
}
