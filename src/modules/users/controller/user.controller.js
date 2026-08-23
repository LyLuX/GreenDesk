import HTTP_STATUS from '../../../core/constants/http-status.js';
import { successResponse } from '../../../core/responses/api-response.js';
import UserService from '../service/user.service.js';
import EmailVerificationService from '../../auth/service/email-verification.service.js';

/** Translates user HTTP requests to UserService calls. */
export default class UserController {
  constructor(
    userService = new UserService(),
    emailVerificationService = new EmailVerificationService(),
  ) {
    this.userService = userService;
    this.emailVerificationService = emailVerificationService;
  }
  async getAll(request, response) {
    response.json(successResponse(await this.userService.getAll(request.query)));
  }
  async getByUuid(request, response) {
    response.json(successResponse(await this.userService.getByUuid(request.params.uuid)));
  }
  async create(request, response) {
    response
      .status(HTTP_STATUS.CREATED)
      .json(
        successResponse(await this.userService.create(request.body, request.user?.userId, 'USER')),
      );
  }
  async update(request, response) {
    response.json(
      successResponse(
        await this.userService.update(request.params.uuid, request.body, request.user?.userId),
      ),
    );
  }
  async remove(request, response) {
    await this.userService.remove(request.params.uuid, request.user?.userId);
    response.status(HTTP_STATUS.NO_CONTENT).send();
  }
  async restore(request, response) {
    response.json(
      successResponse(await this.userService.restore(request.params.uuid, request.user?.userId)),
    );
  }
  async resendEmailVerification(request, response) {
    response.json(
      successResponse(
        await this.emailVerificationService.resendByUserUuid(
          request.params.uuid,
          request.user?.userId,
        ),
      ),
    );
  }
}
