import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

import env from '../../../config/env.js';
import HTTP_STATUS from '../../../core/constants/http-status.js';
import AppError from '../../../core/errors/app-error.js';
import AuditService from '../../audit/service/audit.service.js';
import UserService from '../../users/service/user.service.js';
import AuthRepository from '../repository/auth.repository.js';
import EmailVerificationService from './email-verification.service.js';

/** Registration and credential-based authentication. */
export default class AuthService {
  constructor(
    authRepository = new AuthRepository(),
    userService = new UserService(),
    auditService = new AuditService(),
    emailVerificationService = new EmailVerificationService(),
  ) {
    this.authRepository = authRepository;
    this.userService = userService;
    this.auditService = auditService;
    this.emailVerificationService = emailVerificationService;
  }

  async register(values) {
    const user = await this.userService.create(values, null, 'USER', {
      requireEmailVerification: true,
    });
    const delivery = await this.emailVerificationService.issue(user, {
      suppressDeliveryErrors: true,
    });
    return {
      user: this.userService.publicUser(user),
      verificationRequired: true,
      verificationEmailSent: delivery.sent,
    };
  }

  async login(email, password) {
    const user = await this.authRepository.findByEmailWithPassword(email.toLowerCase());
    if (!user || !user.isActive || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new AppError('Invalid email or password', HTTP_STATUS.UNAUTHORIZED);
    }
    if (!user.emailVerifiedAt) {
      throw new AppError('Email verification required', HTTP_STATUS.FORBIDDEN);
    }
    return this.authRepository.withTransaction(async (transaction) => {
      await this.authRepository.update(user, { lastLoginAt: new Date() }, { transaction });
      const session = this.createSession(user);
      await this.auditService.record(
        {
          userId: user.id,
          action: 'LOGIN_SUCCESS',
          entity: 'USER',
          entityUuid: user.uuid,
        },
        { transaction },
      );
      return session;
    });
  }

  async verifyEmail(token) {
    return this.emailVerificationService.verify(token);
  }

  async resendEmailVerification(email) {
    return this.emailVerificationService.resend(email);
  }

  /** Renews an active user's access token and revokes the token it replaces. */
  async refresh(claims) {
    if (!claims?.jti || !claims?.exp || !claims?.sub) {
      throw new AppError('Invalid or expired access token', HTTP_STATUS.UNAUTHORIZED);
    }
    const user = await this.userService.getByUuid(claims.sub);
    if (!user?.isActive) {
      throw new AppError('Invalid or expired access token', HTTP_STATUS.UNAUTHORIZED);
    }
    return this.authRepository.withTransaction(async (transaction) => {
      await this.authRepository.revokeAccessToken(claims.jti, new Date(claims.exp * 1000), {
        transaction,
      });
      return this.createSession(user);
    });
  }

  /** Creates the public session payload shared by login and active-session renewal. */
  createSession(user) {
    const roles = (user.roles ?? []).map((role) => role.name);
    const permissions = [
      ...new Set(
        (user.roles ?? []).flatMap((role) =>
          (role.permissions ?? []).map((permission) => permission.name),
        ),
      ),
    ];
    const accessToken = jwt.sign(
      {
        sub: user.uuid,
        userId: user.id,
        email: user.email,
        roles,
        permissions,
        authorizationVersion: Number(user.authorizationVersion ?? 0),
      },
      env.jwt.secret,
      {
        expiresIn: env.jwt.accessTokenTtl,
        jwtid: uuidv4(),
      },
    );
    const safeUser = this.userService.publicUser(user);
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
    await this.authRepository.withTransaction(async (transaction) => {
      await this.authRepository.revokeAccessToken(claims.jti, new Date(claims.exp * 1000), {
        transaction,
      });
      await this.auditService.record(
        {
          userId: claims.userId,
          action: 'LOGOUT_SUCCESS',
          entity: 'USER',
          entityUuid: claims.sub,
        },
        { transaction },
      );
    });
  }
}
