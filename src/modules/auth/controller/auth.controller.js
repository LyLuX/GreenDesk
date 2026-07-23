import HTTP_STATUS from '../../../core/constants/http-status.js';
import { successResponse } from '../../../core/responses/api-response.js';
import AuthService from '../service/auth.service.js';

/** Translates authentication HTTP requests to AuthService calls. */
export default class AuthController {
  constructor(authService = new AuthService()) {
    this.authService = authService;
  }
  async register(request, response) {
    response
      .status(HTTP_STATUS.CREATED)
      .json(successResponse(await this.authService.register(request.body)));
  }
  async login(request, response) {
    response.json(
      successResponse(await this.authService.login(request.body.email, request.body.password)),
    );
  }
}
