import { createHash } from 'node:crypto';

import HTTP_STATUS from '../../../core/constants/http-status.js';
import logger from '../../../core/logger/logger.js';
import { successResponse } from '../../../core/responses/api-response.js';
import AuthService from '../service/auth.service.js';

/** Translates authentication HTTP requests to AuthService calls. */
export default class AuthController {
  constructor(authService = new AuthService(), securityLogger = logger) {
    this.authService = authService;
    this.securityLogger = securityLogger;
  }
  async register(request, response) {
    response
      .status(HTTP_STATUS.CREATED)
      .json(successResponse(await this.authService.register(request.body)));
  }
  async login(request, response) {
    try {
      response.json(
        successResponse(await this.authService.login(request.body.email, request.body.password)),
      );
    } catch (error) {
      if (error.statusCode === HTTP_STATUS.UNAUTHORIZED) {
        const emailFingerprint = createHash('sha256')
          .update(
            String(request.body.email ?? '')
              .trim()
              .toLowerCase(),
          )
          .digest('hex')
          .slice(0, 16);
        this.securityLogger.warn('Authentication failed', {
          event: 'security.login_failed',
          requestId: request.id,
          ip: request.ip,
          emailFingerprint,
        });
      }
      throw error;
    }
  }
  async verifyEmail(request, response) {
    response.json(successResponse(await this.authService.verifyEmail(request.body.token)));
  }
  async resendVerification(request, response) {
    response.json(
      successResponse(await this.authService.resendEmailVerification(request.body.email)),
    );
  }
  async refresh(request, response) {
    response.json(successResponse(await this.authService.refresh(request.user)));
  }
  async logout(request, response) {
    await this.authService.logout(request.user);
    response.json(successResponse({ message: 'Logged out successfully' }));
  }
}
