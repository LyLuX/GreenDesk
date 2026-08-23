import { createHash, randomBytes } from 'node:crypto';

import env from '../../../config/env.js';
import HTTP_STATUS from '../../../core/constants/http-status.js';
import AppError from '../../../core/errors/app-error.js';
import logger from '../../../core/logger/logger.js';
import { mailService as defaultMailService } from '../../../core/mail/mail.service.js';
import { emailVerificationTemplate } from '../../../core/mail/templates/email-verification.template.js';
import AuditService from '../../audit/service/audit.service.js';
import UserRepository from '../../users/repository/user.repository.js';
import EmailVerificationRepository from '../repository/email-verification.repository.js';

const GENERIC_RESEND_MESSAGE =
  'Si un compte non vérifié correspond à cette adresse, un nouvel email a été envoyé.';
const hashToken = (token) => createHash('sha256').update(token).digest('hex');

/** Coordinates token lifecycle and delivery without coupling SMTP to authentication logic. */
export default class EmailVerificationService {
  constructor(
    repository = new EmailVerificationRepository(),
    userRepository = new UserRepository(),
    mailService = defaultMailService,
    auditService = new AuditService(),
    configuration = env.emailVerification,
    applicationUrl = env.mail.applicationUrl,
    serviceLogger = logger,
  ) {
    this.repository = repository;
    this.userRepository = userRepository;
    this.mailService = mailService;
    this.auditService = auditService;
    this.configuration = configuration;
    this.applicationUrl = applicationUrl;
    this.logger = serviceLogger;
  }

  async issue(user, { actorUserId = null, force = false, suppressDeliveryErrors = false } = {}) {
    if (!user || user.emailVerifiedAt) return { sent: false };
    const now = new Date();
    if (!force) {
      const latest = await this.repository.findLatestForUser(user.id);
      if (
        latest &&
        now.getTime() - new Date(latest.createdAt).getTime() < this.configuration.cooldownMs
      ) {
        return { sent: false };
      }
    }

    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(now.getTime() + this.configuration.ttlMs);
    const verificationToken = await this.repository.withTransaction(async (transaction) => {
      await this.repository.deleteExpired(now, { transaction });
      return this.repository.create(
        { userId: user.id, tokenHash: hashToken(token), expiresAt },
        { transaction },
      );
    });

    const verificationUrl = new URL('verify-email', this.applicationUrl);
    verificationUrl.searchParams.set('token', token);
    try {
      await this.mailService.send({
        to: user.email,
        ...emailVerificationTemplate({
          firstName: user.firstName,
          verificationUrl: verificationUrl.toString(),
          expiresInHours: this.configuration.ttlHours,
        }),
      });
    } catch (error) {
      await this.repository.delete(verificationToken).catch((cleanupError) => {
        this.logger.error('Email verification token cleanup failed', {
          event: 'mail.email_verification_token_cleanup_failed',
          userUuid: user.uuid,
          errorName: cleanupError.name,
        });
      });
      this.logger.error('Email verification delivery failed', {
        event: 'mail.email_verification_failed',
        userUuid: user.uuid,
        statusCode: error.statusCode,
      });
      if (!suppressDeliveryErrors) throw error;
      return { sent: false };
    }

    await Promise.resolve(
      this.repository.invalidateForUser(user.id, new Date(), { exceptId: verificationToken.id }),
    ).catch((error) => {
      this.logger.error('Previous email verification tokens could not be invalidated', {
        event: 'mail.email_verification_invalidation_failed',
        userUuid: user.uuid,
        errorName: error.name,
      });
    });
    await Promise.resolve(
      this.auditService.record({
        userId: actorUserId,
        action: 'USER_EMAIL_VERIFICATION_SENT',
        entity: 'USER',
        entityUuid: user.uuid,
      }),
    ).catch((error) => {
      this.logger.error('Email verification delivery audit failed', {
        event: 'mail.email_verification_audit_failed',
        userUuid: user.uuid,
        errorName: error.name,
      });
    });
    return { sent: true };
  }

  async resend(email) {
    const user = await this.userRepository.findByEmail(email.toLowerCase());
    if (user && !user.emailVerifiedAt) {
      await this.issue(user);
    }
    return { message: GENERIC_RESEND_MESSAGE };
  }

  async resendByUserUuid(uuid, actorUserId) {
    const user = await this.userRepository.findByUuid(uuid);
    if (!user) throw new AppError('User not found', HTTP_STATUS.NOT_FOUND);
    if (user.emailVerifiedAt) {
      throw new AppError('Email is already verified', HTTP_STATUS.CONFLICT);
    }
    await this.issue(user, { actorUserId, force: true });
    return { message: 'Verification email sent' };
  }

  async verify(token) {
    const now = new Date();
    return this.repository.withTransaction(async (transaction) => {
      const verificationToken = await this.repository.findValidByHash(hashToken(token), now, {
        transaction,
        lock: true,
      });
      if (!verificationToken) {
        throw new AppError('Invalid or expired verification token', HTTP_STATUS.BAD_REQUEST);
      }
      const user = await this.userRepository.findById(verificationToken.userId, { transaction });
      if (!user) {
        throw new AppError('Invalid or expired verification token', HTTP_STATUS.BAD_REQUEST);
      }
      await this.repository.invalidateForUser(user.id, now, { transaction });
      if (!user.emailVerifiedAt) {
        await this.userRepository.update(user, { emailVerifiedAt: now }, { transaction });
        await this.auditService.record(
          {
            userId: user.id,
            action: 'USER_EMAIL_VERIFIED',
            entity: 'USER',
            entityUuid: user.uuid,
          },
          { transaction },
        );
      }
      return { message: 'Email verified successfully' };
    });
  }
}
