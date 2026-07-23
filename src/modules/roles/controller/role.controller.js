import HTTP_STATUS from '../../../core/constants/http-status.js';
import { successResponse } from '../../../core/responses/api-response.js';
import RoleService from '../service/role.service.js';

/** Translates role HTTP requests to RoleService calls. */
export default class RoleController {
  constructor(roleService = new RoleService()) {
    this.roleService = roleService;
  }
  async getAll(_request, response) {
    response.json(successResponse(await this.roleService.getAll()));
  }
  async create(request, response) {
    response
      .status(HTTP_STATUS.CREATED)
      .json(successResponse(await this.roleService.create(request.body)));
  }
  async update(request, response) {
    response.json(
      successResponse(await this.roleService.update(request.params.uuid, request.body)),
    );
  }
  async remove(request, response) {
    await this.roleService.remove(request.params.uuid);
    response.status(HTTP_STATUS.NO_CONTENT).send();
  }
}
