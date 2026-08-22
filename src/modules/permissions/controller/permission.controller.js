import HTTP_STATUS from '../../../core/constants/http-status.js';
import { successResponse } from '../../../core/responses/api-response.js';
import PermissionService from '../service/permission.service.js';

/** Translates permission HTTP requests to PermissionService calls. */
export default class PermissionController {
  constructor(permissionService = new PermissionService()) {
    this.permissionService = permissionService;
  }
  async getAll(request, response) {
    response.json(successResponse(await this.permissionService.getAll(request.query)));
  }
  async create(request, response) {
    response
      .status(HTTP_STATUS.CREATED)
      .json(
        successResponse(await this.permissionService.create(request.body, request.user?.userId)),
      );
  }
  async update(request, response) {
    response.json(
      successResponse(
        await this.permissionService.update(
          request.params.uuid,
          request.body,
          request.user?.userId,
        ),
      ),
    );
  }
  async remove(request, response) {
    await this.permissionService.remove(request.params.uuid, request.user?.userId);
    response.status(HTTP_STATUS.NO_CONTENT).send();
  }
}
