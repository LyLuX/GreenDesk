import HTTP_STATUS from '../../../core/constants/http-status.js';
import { successResponse } from '../../../core/responses/api-response.js';
import UserService from '../service/user.service.js';

/** Translates user HTTP requests to UserService calls. */
export default class UserController {
  constructor(userService = new UserService()) {
    this.userService = userService;
  }
  async getAll(_request, response) {
    response.json(successResponse(await this.userService.getAll()));
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
}
