import HTTP_STATUS from '../../../core/constants/http-status.js';
import { successResponse } from '../../../core/responses/api-response.js';
import CategoryService from '../service/category.service.js';
export default class CategoryController {
  constructor(service = new CategoryService()) {
    this.service = service;
  }
  async getAll(request, response) {
    response.json(successResponse(await this.service.getAll(request.query.search)));
  }
  async getByUuid(request, response) {
    response.json(successResponse(await this.service.getByUuid(request.params.uuid)));
  }
  async create(request, response) {
    response
      .status(HTTP_STATUS.CREATED)
      .json(successResponse(await this.service.create(request.body, request.user.userId)));
  }
  async update(request, response) {
    response.json(
      successResponse(
        await this.service.update(request.params.uuid, request.body, request.user.userId),
      ),
    );
  }
  async remove(request, response) {
    await this.service.remove(request.params.uuid, request.user.userId);
    response.status(HTTP_STATUS.NO_CONTENT).send();
  }
}
